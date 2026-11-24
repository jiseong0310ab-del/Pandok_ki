# SAYNUE design system

All interface styling lives in `assets/site.css`, built on CSS custom properties.
Secondary pages keep a small inline `<style>` block that only uses these tokens.

## Themes
- Charcoal and lavender, with three soft accent families for the home tiles: lavender (analysis), peach (reply coaching), sage (relationship advice).
- Light is the default on every device, including ones set to dark mode. Dark is opt-in.
- MY → 화면 모드 offers 라이트 (default) · 다크 · 시스템 설정. `assets/theme.js` stores only `"dark"` or `"system"` under `saynue:theme:v1` in this browser (light stores nothing) and sets `data-theme` on `<html>` before the first paint, along with the `theme-color` and `color-scheme` meta tags. 시스템 설정 follows the device and switches live. Learn pages and the data notice allow no scripts, so they are always light.
- Every colour must come from a token. A new token has to be added to the light `:root` set and both dark sets (`[data-theme="dark"]` and the `[data-theme="system"]` media query); `tests/design-system.test.mjs` checks they stay in sync.

## Typography by language
| Language | Face | Notes |
|---|---|---|
| Korean (`ko`) | Pretendard Variable, self-hosted | `word-break: keep-all`, tight headings |
| English (`en`) | Pretendard Variable (Inter-based Latin) | balanced headings |
| Japanese (`ja`) | Hiragino Sans on Apple, Noto Sans CJK JP on Android, Yu Gothic on Windows | `line-break: strict`, `palt` on headings, phrase-aware breaks where supported |
| Simplified Chinese (`zh-CN`) | PingFang SC, Noto Sans CJK SC, Microsoft YaHei | strict line breaking |
| Traditional Chinese (`zh-TW`) | PingFang TC, Noto Sans CJK TC, Microsoft JhengHei | strict line breaking |

- Pretendard ships Korean-style Hanja and kana, so it must never appear in the Japanese or Chinese stacks. Japanese and Chinese use the platform's own CJK faces instead of a download: Hiragino and PingFang on iPhone are the best available, and Android's system face already is Noto Sans CJK.
- Pretendard 1.3.9 (SIL OFL 1.1) is served from `assets/fonts/pretendard-1.3.9/` as 92 unicode-range subsets; browsers fetch only the subsets a page actually uses. The folder is versioned so it can be cached as immutable.
- Fonts follow the `lang` attribute, not the page. A reply generated in Japanese inside a Korean report carries `lang="ja"` and switches face and rhythm. Model-written report text keeps the language it was generated in, so a later page-language change does not break its line wrapping.
- Sizes: body 15–17px, captions 13–14px, nothing below 11px (bottom navigation labels only). Form fields are 16px so iOS Safari does not zoom on focus.

## Copy rules
- No decorative glyphs in labels or buttons (→, ↗, ✦, ●), no English uppercase eyebrow labels on non-English pages, and no trailing period on headlines, titles, buttons or one-line captions.
- Keep Korean in polite 해요체 across the product.

## Motion
- Screens fade in, results rise in, buttons scale slightly on press. The analysis wait shows three steps in sequence; they describe what the AI does and never show a fake percentage.
- `prefers-reduced-motion: reduce` turns all animation and transitions off.
