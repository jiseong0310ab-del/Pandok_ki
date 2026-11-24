import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../assets/screenshot-editor.js",import.meta.url),"utf8");
function node(tag="div"){
  const events={};
  const classes=new Set();
  return {
    tag,events,children:[],textContent:"",disabled:false,value:"",
    classList:{
      add(c){classes.add(c)},
      remove(c){classes.delete(c)},
      contains(c){return classes.has(c)}
    },
    setAttribute(){},
    addEventListener(type,fn){events[type]=fn},
    appendChild(c){this.children.push(c)},
    replaceChildren(...items){this.children=items},
    getBoundingClientRect(){return {left:0,top:0,width:350,height:600}},
    setPointerCapture(){},
    click(){if(events.click)events.click()}
  };
}
function harness(){
  const ids=["chatImage","shotList","shotCanvas","shotEditor","shotCount","shotStatus","shotEditorName","shotConfirm","shotUndo","shotBrushSmall","shotBrushBig","fileLabel"];
  const nodes=Object.fromEntries(ids.map(id=>[id,node()]));
  const context={strokeStyle:"",fillStyle:"",lineWidth:1,beginPath(){},moveTo(){},lineTo(){},stroke(){},arc(){},fill(){},drawImage(){},fillRect(){}};
  function makeCanvas(){
    return {...node("canvas"),width:800,height:1200,
      getContext(){return context},
      toDataURL(){return "data:image/jpeg;base64,/9j/"+"A".repeat(240)}
    };
  }
  nodes.shotCanvas=makeCanvas();
  const document={getElementById(id){if(!nodes[id])throw Error("missing mock "+id);return nodes[id]},createElement(tag){return tag==="canvas"?makeCanvas():node(tag)}};
  const url={createObjectURL(){return "blob:screenshot-local"},revokeObjectURL(){}};
  class ImageStub{
    naturalWidth=800;naturalHeight=1200;
    set src(value){this._src=value;queueMicrotask(()=>this.onload?.())}
    get src(){return this._src}
  }
  const window={};
  vm.runInNewContext(source,{window,document,URL:url,Image:ImageStub});
  const editor=window.SaynueScreenshotEditor({t:key=>key,onError:()=>{throw Error("invalid image")}});
  return {editor,nodes};
}

test("screenshot editor never offers unreviewed or partially reviewed images to the API",async()=>{
  const {editor,nodes}=harness();
  assert.equal(editor.isReady(),false);
  const file=(name)=>({size:1200000,type:"image/jpeg",name});
  await nodes.chatImage.events.change({target:{files:[file("first.jpg"),file("second.jpg")],value:""}});
  assert.equal(editor.hasImages(),true);
  assert.equal(editor.isReady(),false);
  assert.equal(editor.getImages().length,0);
  // Last selected image is second; approve it.
  nodes.shotConfirm.events.click();
  assert.equal(editor.isReady(),false);
  assert.equal(editor.getImages().length,0);
  // Select and approve the first screenshot.
  nodes.shotList.children[0].children[0].events.click();
  nodes.shotConfirm.events.click();
  assert.equal(editor.isReady(),true);
  assert.equal(editor.getImages().length,2);
  assert.equal(editor.getImages().every(x=>x.mimeType==="image/jpeg"&&x.base64.startsWith("/9j/")),true);
});

test("privacy brush invalidates previously approved images until reconfirmation",async()=>{
  const {editor,nodes}=harness();
  await nodes.chatImage.events.change({target:{files:[{size:100,type:"image/jpeg",name:"sample.jpg"}],value:""}});
  nodes.shotConfirm.events.click();
  assert.equal(editor.isReady(),true);
  const event={pointerType:"touch",pointerId:1,clientX:40,clientY:50,preventDefault(){}};
  nodes.shotCanvas.events.pointerdown(event);
  nodes.shotCanvas.events.pointermove({...event,clientX:90,clientY:50});
  nodes.shotCanvas.events.pointerup(event);
  assert.equal(editor.isReady(),false);
  assert.deepEqual(Array.from(editor.getImages()),[]);
  nodes.shotConfirm.events.click();
  assert.equal(editor.isReady(),true);
  nodes.shotUndo.events.click();
  assert.equal(editor.isReady(),false);
});

test("screenshot list is capped at three and supports per-image removal",async()=>{
  const {editor,nodes}=harness();
  const file=i=>({size:100,type:"image/png",name:"shot"+i+".png"});
  await nodes.chatImage.events.change({target:{files:[file(1),file(2),file(3),file(4)],value:""}});
  assert.equal(nodes.shotList.children.length,3);
  assert.equal(editor.isReady(),false);
  // Last button is remove, not a remote upload.
  nodes.shotList.children[1].children[1].children[2].events.click();
  assert.equal(nodes.shotList.children.length,2);
  assert.equal(editor.getImages().length,0);
});

test("reset during asynchronous decode discards old screenshots and permits fresh uploads",async()=>{
 const {editor,nodes}=harness();const file=name=>({size:100,type:"image/jpeg",name});
 const old=nodes.chatImage.events.change({target:{files:[file("old-private.jpg")],value:""}});
 assert.equal(editor.isBusy(),true);assert.equal(editor.clear(),true);
 const fresh=nodes.chatImage.events.change({target:{files:[file("fresh.jpg")],value:""}});
 await Promise.all([old,fresh]);assert.equal(editor.isBusy(),false);assert.equal(nodes.shotList.children.length,1);
 assert.match(nodes.shotList.children[0].children[0].textContent,/fresh\.jpg/);assert.equal(editor.isReady(),false);
 nodes.shotConfirm.events.click();assert.equal(editor.getImages().length,1);editor.clear();assert.equal(editor.getImages().length,0);assert.equal(nodes.shotCanvas.width,1);
});
