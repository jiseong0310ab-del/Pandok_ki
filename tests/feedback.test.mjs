import test from "node:test";
import assert from "node:assert/strict";
import feedback from "../api/feedback.mjs";

function req(body,ip="192.0.2.200",extra={}){
  return new Request("https://saynue.test/api/feedback",{
    method:extra.method||"POST",
    headers:{"content-type":"application/json","origin":"https://saynue.test","x-vercel-forwarded-for":ip,...extra.headers},
    body:(extra.method||"POST")==="POST"?(typeof body==="string"?body:JSON.stringify(body)):undefined
  });
}
const choice={rating:"helpful",goal:"reply",locale:"ja"};

test("feedback rejects unsupported methods, cross origins and non-JSON inputs",async()=>{
  assert.equal((await feedback.fetch(req(choice,"192.0.2.201",{method:"GET"}))).status,405);
  assert.equal((await feedback.fetch(req(choice,"192.0.2.202",{headers:{origin:"https://unrelated.example"}}))).status,403);
  assert.equal((await feedback.fetch(req(choice,"192.0.2.203",{headers:{"content-type":"text/plain"}}))).status,415);
  assert.equal((await feedback.fetch(req("not-json","192.0.2.204"))).status,400);
});

test("feedback refuses user content and unknown metadata; never logs rejected data",async()=>{
  const original=console.info;const logs=[];console.info=(...s)=>logs.push(s.join(" "));
  try{
    const attacks=[
      {...choice,chatText:"PRIVATE CONVERSATION SHOULD NOT BE SAVED"},
      {...choice,replyDraft:"a sensitive generated draft"},
      {...choice,locale:"invalid"},
      {...choice,rating:"money"},
      {...choice,goal:"impersonate"},
      {rating:"helpful",locale:"en"}
    ];
    for(let i=0;i<attacks.length;i++){
      const res=await feedback.fetch(req(attacks[i],"192.0.2."+(210+i)));
      assert.equal(res.status,400,i+"");
    }
    assert.equal(logs.length,0);
  }finally{console.info=original}
});

test("voluntary positive feedback logs ONLY categorical values and returns no-store",async()=>{
  const orig=console.info,logs=[];console.info=(...v)=>logs.push(v.join(" "));
  try{
    const res=await feedback.fetch(req(choice,"192.0.2.220"));
    assert.equal(res.status,200);
    assert.deepEqual(await res.json(),{ok:true});
    assert.match(res.headers.get("cache-control"),/no-store/);
    assert.equal(logs.length,1);
    assert.match(logs[0],/rating=helpful goal=reply locale=ja/);
    assert.doesNotMatch(logs[0],/192\.0\.2\.|API KEY|PRIVATE CONVERSATION/);
  }finally{console.info=orig}
});

test("per-instance feedback guard limits repeated votes",async()=>{
  const orig=console.info;console.info=()=>{};
  try{
    for(let n=0;n<5;n++)assert.equal((await feedback.fetch(req({rating:"not_helpful",goal:"understand",locale:"en"},"192.0.2.224"))).status,200);
    assert.equal((await feedback.fetch(req(choice,"192.0.2.224"))).status,429);
  }finally{console.info=orig}
});

test("when Redis is enabled feedback increments categorical counters, not logs",async()=>{
  const oldUrl=process.env.UPSTASH_REDIS_REST_URL,oldToken=process.env.UPSTASH_REDIS_REST_TOKEN;
  const oldFetch=global.fetch,oldLog=console.info;const logs=[];
  process.env.UPSTASH_REDIS_REST_URL="https://mock-redis.example";
  process.env.UPSTASH_REDIS_REST_TOKEN="not-a-real-secret";
  console.info=(...x)=>logs.push(x);
  global.fetch=async(url,opts)=>{
    assert.equal(url,"https://mock-redis.example/pipeline");
    const cmds=JSON.parse(opts.body);
    assert.match(cmds[0][1],/^saynue:feedback:\d{4}-\d{2}-\d{2}:helpful:repair:ko$/);
    assert.equal(cmds[0][0],"INCR");
    assert.equal(cmds[1][0],"EXPIRE");
    return new Response(JSON.stringify([{result:1},{result:1}]),{status:200});
  };
  try{
    const res=await feedback.fetch(req({rating:"helpful",goal:"repair",locale:"ko"},"192.0.2.226"));
    assert.equal(res.status,200);
    assert.equal(logs.length,0);
  }finally{
    global.fetch=oldFetch;console.info=oldLog;
    if(oldUrl===undefined)delete process.env.UPSTASH_REDIS_REST_URL;else process.env.UPSTASH_REDIS_REST_URL=oldUrl;
    if(oldToken===undefined)delete process.env.UPSTASH_REDIS_REST_TOKEN;else process.env.UPSTASH_REDIS_REST_TOKEN=oldToken;
  }
});
