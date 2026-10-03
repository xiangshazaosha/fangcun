# 方寸代码参考

本文件集中保存 `SKILL.md` 和其他文档引用的通用实现。代码从当前成品中抽象而来，删除 CSSC 与具体业务耦合。正式项目应把必要代码内联进最终 HTML，或由生成脚本写入最终 HTML。

## C01｜固定 1920×1080 舞台

**验证来源：** `references/viewport-base.css`、`presentation/build_deck.py`。

```css
html,body{width:100%;height:100%;margin:0;overflow:hidden;background:var(--stage-bg,#000)}
.deck-viewport{position:fixed;inset:0;overflow:hidden}
.deck-stage{position:absolute;left:0;top:0;width:1920px;height:1080px;overflow:hidden;transform-origin:0 0}
.slide{position:absolute;inset:0;width:1920px;height:1080px;overflow:hidden}
```

```js
const stage = document.querySelector('.deck-stage');
function fitStage(){
  const scale = Math.min(innerWidth / 1920, innerHeight / 1080);
  const x = (innerWidth - 1920 * scale) / 2;
  const y = (innerHeight - 1080 * scale) / 2;
  stage.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
}
addEventListener('resize', fitStage);
fitStage();
```

必须复制 `references/viewport-base.css` 的完整版本，不用本节缩略代码替代正式基础样式。

## C02｜页面可见状态

**验证来源：** `viewport-base.css` 与当前成品 `showSlide()`。

```css
.slide{visibility:hidden;opacity:0;pointer-events:none}
.slide.active,.slide.visible{visibility:visible;opacity:1;pointer-events:auto;z-index:1}
```

```js
function showSlide(index){
  current = Math.max(0, Math.min(slides.length - 1, index));
  slides.forEach((slide, i) => {
    const on = i === current;
    slide.classList.toggle('active', on);
    slide.classList.toggle('visible', on);
  });
}
```

## C03｜翻页、滚轮锁与推进优先级

**验证来源：** `design-system/navigation.js` 与当前成品 `goForward()`。

```js
function goForward(){
  if (!advanceBuild()) showSlide(current + 1);
}

document.addEventListener('keydown', e => {
  if (e.target.closest('input,textarea,select,button,[contenteditable="true"],[data-interactive]')) return;
  if (['PageDown',' '].includes(e.key)) { e.preventDefault(); goForward(); }
  else if (['ArrowRight','ArrowDown'].includes(e.key)) showSlide(current + 1);
  else if (['ArrowLeft','ArrowUp','PageUp'].includes(e.key)) showSlide(current - 1);
  else if (e.key === 'Home') showSlide(0);
  else if (e.key === 'End') showSlide(slides.length - 1);
});

let wheelTotal = 0, wheelLocked = false, wheelReset = 0;
document.addEventListener('wheel', e => {
  if (e.ctrlKey || e.target.closest('[data-interactive],input,textarea,select')) return;
  e.preventDefault();
  if (wheelLocked) return;
  wheelTotal += Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  clearTimeout(wheelReset);
  wheelReset = setTimeout(() => wheelTotal = 0, 180);
  if (Math.abs(wheelTotal) < 46) return;
  Math.sign(wheelTotal) > 0 ? goForward() : showSlide(current - 1);
  wheelTotal = 0;
  wheelLocked = true;
  setTimeout(() => wheelLocked = false, 520);
},{passive:false});
```

## C04｜动态背景与后备图

**可选私有素材：** 仓库根 `.private-assets/waves/background.mp4` 与 `poster.png`，Git 排除；启动器显式选择后复制到独立稿件。缺失时清楚报错，不从旧工作区取资源。

```html
<video class="ambient-bg" muted autoplay loop playsinline preload="auto"
       poster="assets/media/background-poster.webp">
  <source src="assets/media/background.mp4" type="video/mp4">
</video>
<div class="ambient-scrim" aria-hidden="true"></div>
```

```css
.ambient-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ambient-scrim{position:absolute;inset:0;background:linear-gradient(90deg,rgba(247,251,252,.96),rgba(247,251,252,.35) 58%,rgba(8,40,52,.12))}
```

## C05｜可选 Logo，不造品牌

Logo 项明确询问保留/更换/不放。更换可用用户准确文字，由制作 agent 设计本地 SVG 或 HTML 字标，图片并非必需。只维护一份品牌源，序章/封面/正文引用相同字样与资产；没给文字时记 pending，不猜品牌名、不假称已替换。检查字形、留白、对比度与不同视口显示。

**验证来源：** 当前成品的左上品牌位；通用化后不保留 CSSC 文件或文字。

```html
<!-- 用户自有 Logo 优先；否则使用方寸默认 Logo；明确无 Logo 才省略节点 -->
<div class="brand-mark">
  <img src="assets/logo/brand.svg" alt="品牌 Logo">
  <span>用户提供的品牌名称</span>
</div>
```

```css
.brand-mark{position:absolute;left:76px;top:54px;display:flex;align-items:center;gap:18px;z-index:30}
.brand-mark img{display:block;max-width:210px;max-height:58px;object-fit:contain}
```

## C06｜本地字体与媒体边界

```css
@font-face{
  font-family:"Deck Sans";
  src:url("assets/fonts/deck-sans.woff2") format("woff2");
  font-style:normal;font-weight:100 900;font-display:swap;
}
img,video,canvas,svg{max-width:100%;max-height:100%}
```

离线演示不得使用 `https://` 字体、图片或脚本。字体子集可参考当前 `assets/fonts/NotoSansSC-Deck.woff2`，但新文案需重新核对字形覆盖。

## C07｜动态主体：视频、帧序列或精灵图

**验证来源：** `presentation/build_deck.py` 的航母帧加载、Canvas 绘制和指针映射。通用化后主体不限于航母。

普通视频可直接循环：

```html
<video class="hero-model" muted autoplay loop playsinline poster="assets/media/model-poster.webp">
  <source src="assets/media/model.webm" type="video/webm">
  <source src="assets/media/model.mp4" type="video/mp4">
</video>
```

需要鼠标控制时，将水平位置映射到帧号或视频时间：

```js
const scrub = document.querySelector('[data-model-scrub]');
const video = scrub.querySelector('video');
scrub.addEventListener('pointermove', e => {
  if (!Number.isFinite(video.duration)) return;
  const r = scrub.getBoundingClientRect();
  const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  video.currentTime = t * Math.max(0, video.duration - 0.04);
});
```

透明视频兼容性不足或逐帧拖动不稳时，预处理为 WebP 帧或精灵图，并按需加载相邻帧。可选资源在仓库根 `.private-assets/carrier/`，公开再分发权未确认，Git 排除；只有用户主动选择时复制。

高质量逐帧主体应继续复用当前成品的三项工程优化：

1. **相邻精灵图预取**：当前帧所在 sheet 的前一张、当前张和后一张进入缓存，避免一次加载全部大图。
2. **透明区域命中**：生成时从每帧 Alpha 通道得到包围框；运行时先测包围框，再少量采样 Canvas Alpha。只有鼠标真正进入主体才启用拖动，不让透明空白抢走翻页操作。
3. **惯性收敛**：指针只更新目标帧，`requestAnimationFrame` 让当前帧逐步逼近目标帧，减少抖动。

```python
from PIL import Image
boxes=[]
for frame in sorted(frame_dir.glob('frame-*.webp')):
    with Image.open(frame).convert('RGBA') as image:
        boxes.append(image.getchannel('A').getbbox() or (0,0,0,0))
```

```js
function maintain(frame){
  const sheet = Math.floor(frame / FRAMES_PER_SHEET);
  [sheet-1,sheet,sheet+1].filter(i => i >= 0 && i < SHEET_COUNT).forEach(loadSheet);
}
function renderModel(){
  const d = targetFrame - currentFrame;
  currentFrame = Math.abs(d) > .02 ? currentFrame + Math.sign(d) * Math.min(1,Math.abs(d)) : targetFrame;
  drawFrame(Math.round(currentFrame));
  requestAnimationFrame(renderModel);
}
```

## C08｜逐项呈现与当前项高亮

**验证来源：** 当前成品 `prepareBuilds()`、`setBuildStep()` 与动态描边。

```css
.build-item{opacity:0;transform:translateY(18px) scale(.985);pointer-events:none;transition:.42s var(--ease)}
.build-item.build-shown{opacity:1;transform:none;pointer-events:auto}
.build-item.build-current{box-shadow:0 0 0 2px color-mix(in srgb,var(--brand-1) 35%,transparent),0 22px 54px color-mix(in srgb,var(--brand-1) 18%,transparent)}
```

```js
function setBuildStep(slide, step){
  const items = [...slide.querySelectorAll('[data-build-step]')];
  const max = Math.max(0, ...items.map(x => Number(x.dataset.buildStep)));
  step = Math.max(0, Math.min(max, step));
  slide.dataset.buildCurrent = step;
  items.forEach(item => {
    const n = Number(item.dataset.buildStep);
    item.classList.toggle('build-shown', n <= step);
    item.classList.toggle('build-current', n === step);
  });
}
```

## C09｜交互事件隔离、清理与重置

**验证来源：** 当前成品的 `[data-interactive]`、`pageCleanups` 和每页 reset 函数。

```js
const pageCleanups = [];

function registerInteractive(root, setup){
  root.dataset.interactive = '';
  root.addEventListener('click', e => e.stopPropagation());
  const cleanup = setup(root) || (() => {});
  pageCleanups.push(cleanup);
}

function leaveCurrentSlide(){
  pageCleanups.splice(0).forEach(fn => fn());
}
```

交互必须同时提供状态文字、重置函数和边界限制；循环动画和计时器必须在切页时取消。

## C10｜关系映射

```js
function renderRelation(key){
  const active = new Set(mapping[key] ?? []);
  nodes.forEach(n => n.classList.toggle('active', active.has(n.dataset.node)));
  edges.forEach(e => {
    const ends = e.dataset.edge.split(',');
    e.classList.toggle('active', ends.every(x => active.has(x)));
  });
  explanation.textContent = copy[key] ?? copy.overview;
}
```

卡片支持 `pointerenter`、`focus` 和 `click` 锁定；Escape 或空白点击恢复总览。

## C11｜流程推进器

```js
function setProgress(p){
  p = Math.max(0, Math.min(1, p));
  token.style.left = `${p * 100}%`;
  progress.style.width = `${p * 100}%`;
  const index = Math.round(p * (stages.length - 1));
  nodes.forEach((n,i) => n.classList.toggle('active', i === index));
  status.textContent = stages[index].status;
  result.textContent = stages[index].result;
}
```

使用 Pointer Events 实现拖动，`pointerup` 时吸附到最近阶段；节点本身也可以点击。

## C12｜变量探索器

```js
function calculate(state){
  // 这里替换为本主题已经确认的业务公式。
  return deriveResults(state);
}
function render(){
  const result = calculate(state);
  outputs.forEach(out => out.textContent = format(result[out.dataset.value]));
  drawing.setAttribute('transform', `translate(${state.x} ${state.y})`);
}
```

拖动坐标必须从浏览器像素换算到 SVG `viewBox` 坐标，并将状态限制在业务允许范围内。不得把示例公式复制到新主题。

## C13｜有限状态机与过程模拟

```js
const transitions = {
  idle:   { start:'running' },
  running:{ success:'done', fail:'error', cancel:'idle' },
  error:  { retry:'running', reset:'idle' },
  done:   { reset:'idle' }
};
let state = 'idle';
function dispatch(event){
  state = transitions[state]?.[event] ?? state;
  root.dataset.state = state;
  stateLabel.textContent = labels[state];
  log.prepend(Object.assign(document.createElement('span'), {textContent: eventCopy[event]}));
}
```

检查纠错、模式切换、操作回退和日志演示都可以用同一状态机骨架，区别只是状态、事件和反馈内容。

## C14｜中性主题变量与组件

**验证来源：** `design-system/tokens.css`、`components.css` 和当前成品视觉规范。变量已去 CSSC 化。

```css
:root{
  --stage-bg:#061a21;
  --slide-bg:#f7fbfc;
  --ink-1:#103e4b;
  --ink-2:#4f6e78;
  --brand-1:#08a8c1;
  --brand-1-soft:#7adceb;
  --brand-2:#25c8a0;
  --brand-2-soft:#9ae8c9;
  --surface-glass:rgba(255,255,255,.08);
  --surface-border:rgba(255,255,255,.48);
  --surface-shadow:0 20px 44px rgba(12,62,76,.13);
  --radius-card:40px;
  --radius-pill:999px;
  --ease:cubic-bezier(.22,1,.36,1);
}
.glass{
  border:1px solid var(--surface-border);
  background:var(--surface-glass);
  backdrop-filter:blur(8px) saturate(135%);
  box-shadow:var(--surface-shadow);
  border-radius:var(--radius-card);
}
.accent-pill{background:linear-gradient(135deg,var(--brand-1),var(--brand-1-soft));border-radius:var(--radius-pill)}
```

## C15｜本地 HTTP 启动与离线包

```bat
@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PYTHON_CMD="
where python >nul 2>nul && set "PYTHON_CMD=python"
if not defined PYTHON_CMD where py >nul 2>nul && set "PYTHON_CMD=py -3"
if not defined PYTHON_CMD echo 未检测到 Python 3。& pause & exit /b 1
start "" "http://127.0.0.1:4173/index.html"
%PYTHON_CMD% -m http.server 4173 --bind 127.0.0.1
```

含视频、Canvas、字体或 `fetch()` 时不要让用户直接双击 `index.html`。

## C16｜减弱动效与无障碍

```css
@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;transition-duration:.2s!important}
}
:focus-visible{outline:3px solid var(--brand-1);outline-offset:4px}
```

可拖动对象使用 `role="slider"`、`tabindex="0"`、`aria-valuemin/max/now`；状态文本使用 `aria-live="polite"`。

## C17｜生成脚本是唯一源文件

**验证来源：** `presentation/build_deck.py` 生成 `presentation/index.html`。

```python
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "index.html"

def slide(page, classes, aria, body):
    return f'<section class="slide {classes}" data-slide="{page}" aria-label="{aria}">{body}</section>'

html = TEMPLATE.replace("__SLIDES__", "\n".join(slides))
OUT.write_text(html, encoding="utf-8")
```

生成后检查页数并测试生成结果；不要在 `index.html` 中做无法回写到脚本的长期修改。

## C18｜结构与截图检查

用本地 HTTP 服务加载演示，至少检查以下 DOM 条件：

```js
const report = await page.evaluate(() => ({
  slides: document.querySelectorAll('.slide').length,
  active: document.querySelectorAll('.slide.active').length,
  overflow: [...document.querySelectorAll('.slide')]
    .filter(s => s.scrollWidth > 1920 || s.scrollHeight > 1080)
    .map(s => s.dataset.slide),
  missingMedia: [...document.images].filter(i => !i.complete || !i.naturalWidth).map(i => i.src)
}));
```

DOM 检查不能代替截图。至少在 `1920×1080`、`1280×720` 和一个手机视口截图检查封面、最密集页、最复杂交互页和结束页。

## C19｜可编辑封面信息与本地记忆

**验证来源：** 当前成品的月份、日期下拉框与 `localStorage`。

```js
function bindSavedField(control, storageKey){
  const saved = localStorage.getItem(storageKey);
  if (saved !== null) control.value = saved;
  control.addEventListener('change', () => localStorage.setItem(storageKey, control.value));
}
```

日期、讲者、场次或版本号需要现场修改时可使用；不要让可编辑控件触发翻页。[代码 C03]

## C20｜指针跟随的局部材质高光

**验证来源：** 当前成品目标卡片的 `--gx/--gy` 聚光效果。

```css
.material-card::before{
  content:"";position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;
  background:radial-gradient(260px circle at var(--gx,50%) var(--gy,50%),rgba(255,255,255,.62),rgba(122,220,235,.18) 32%,transparent 68%);
  opacity:0;transition:opacity .28s ease;
}
.material-card:hover::before,.material-card:focus-visible::before{opacity:.72}
```

```js
grid.addEventListener('pointermove', e => {
  const card = e.target.closest('.material-card');
  if (!card) return;
  const r = card.getBoundingClientRect();
  card.style.setProperty('--gx', `${(e.clientX-r.left)/r.width*100}%`);
  card.style.setProperty('--gy', `${(e.clientY-r.top)/r.height*100}%`);
});
```

这只是轻反馈，不能取代主要交互；触屏和减弱动效环境没有它也必须完整可用。[代码 C16]

## C21｜页码深链

**验证来源：** 当前成品的 `?page=` 启动参数。

```js
const requested = Number(new URLSearchParams(location.search).get('page')) || 1;
showSlide(Math.max(0, Math.min(slides.length - 1, requested - 1)));
```

需要分享具体页时，可在切页后使用 `history.replaceState` 同步页码；离线演示不强制修改地址栏。

## C22｜打印与 PDF 静态状态

**验证来源：** `viewport-base.css` 的 `@media print`。

```css
@media print{
  html,body{width:1920px;height:auto;overflow:visible;background:#fff}
  .deck-viewport,.deck-stage{position:static;overflow:visible;transform:none!important}
  .deck-stage{width:auto;height:auto}
  .slide{position:relative;display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;width:1920px;height:1080px;break-after:page}
  .slide:last-child{break-after:auto}
  .deck-controls{display:none!important}
}
```

导出前把逐项内容切到最终状态，交互动画停在最能表达结论的静态状态；PDF 不承诺保留交互。

## C23｜双色风主题状态与颜色纪律

**权威来源：** 用户提供的 Remotion 双色类风格归档与六张 `1920×1080` 实拍画面。

```css
:root{
  --duo-warm:#EEEAE1;
  --duo-black:#050505;
  --duo-ink:#171813;
  --duo-muted:#6F7069;
  --duo-yellow:#D8C94B;
  --duo-card:#E5E0D6;
  --duo-dark-ink:#EEEAE1;
  --duo-dark-muted:#85867F;
}
.slide.duo{
  --duo-bg:var(--duo-warm);
  --duo-fg:var(--duo-ink);
  --duo-subtle:var(--duo-muted);
  --duo-surface:var(--duo-card);
  --duo-border:rgba(23,24,19,.16);
  background:var(--duo-bg);color:var(--duo-fg);
}
.slide.duo.duo-dark{
  --duo-bg:var(--duo-black);
  --duo-fg:var(--duo-dark-ink);
  --duo-subtle:var(--duo-dark-muted);
  --duo-surface:#0B0B0A;
  --duo-border:rgba(238,234,225,.18);
}
.duo-card{background:var(--duo-surface);border:1px solid var(--duo-border);box-shadow:none}
.duo-accent{color:var(--duo-yellow)}
```

软件身份色只设置在对应节点自身，不能写进全局主题变量：

```css
.identity-node[data-app="excel"]{--identity:#107C41}
.identity-node[data-app="word"]{--identity:#185ABD}
.identity-node{border-color:var(--identity,var(--duo-border));color:var(--identity,var(--duo-fg))}
```

## C24｜单一几何真源的动态连线

路径、移动点和箭头共享同一个 SVG `<path>` 和同一个 `progress`，避免三套公式逐帧分离。

```html
<svg class="semantic-route" viewBox="0 0 900 420" aria-hidden="true">
  <path id="routePath" d="M 40 210 C 250 210 350 90 520 90 S 720 210 850 210"/>
  <circle id="routeDot" r="7"/>
  <path id="routeArrow" d="M -12 -7 L 0 0 L -12 7"/>
</svg>
```

```js
const path = document.querySelector('#routePath');
const dot = document.querySelector('#routeDot');
const arrow = document.querySelector('#routeArrow');
const length = path.getTotalLength();
path.style.strokeDasharray = length;

function renderRoute(progress){
  const p = Math.max(0, Math.min(1, progress));
  const at = path.getPointAtLength(length * p);
  const before = path.getPointAtLength(Math.max(0, length * p - 1));
  const angle = Math.atan2(at.y-before.y, at.x-before.x) * 180 / Math.PI;
  path.style.strokeDashoffset = length * (1-p);
  dot.setAttribute('transform', `translate(${at.x} ${at.y})`);
  arrow.setAttribute('transform', `translate(${at.x} ${at.y}) rotate(${angle})`);
}
```

```css
.semantic-route path:first-child{fill:none;stroke:var(--duo-yellow);stroke-width:3}
.semantic-route circle,.semantic-route #routeArrow{fill:none;stroke:var(--duo-yellow);stroke-width:3}
```

SVG 的起点和终点必须在布局阶段计算或人工放到节点边界，而不是中心。内容发生变化时重算路径，不允许删字避线。

## C25｜头像与字幕安全层

```css
.duo-slide{
  --caption-safe:128px;
  --avatar-size:240px;
}
.duo-avatar{
  position:absolute;left:56px;bottom:72px;
  width:var(--avatar-size);height:var(--avatar-size);
  border:3px solid var(--duo-yellow);border-radius:50%;
  overflow:hidden;background:var(--duo-bg);box-shadow:none;z-index:20;
}
.duo-avatar video,.duo-avatar img{width:100%;height:100%;object-fit:cover}
.duo-caption-layer{
  position:absolute;left:360px;right:170px;bottom:22px;
  min-height:84px;display:grid;place-items:center;
  color:var(--duo-fg);font-size:34px;font-weight:850;
  text-align:center;z-index:30;pointer-events:none;
}
.duo-main.has-captions{bottom:var(--caption-safe)}
```

```js
function setAvatarVisible(visible){
  avatar.animate(
    visible
      ? [{opacity:0,transform:'translateY(48px)'},{opacity:1,transform:'translateY(0)'}]
      : [{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(48px)'}],
    {duration:420,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'}
  );
}
```

没有头像或字幕需求时不要生成对应 DOM；不能用默认人物替代用户素材。

## C26｜双色风确定性动效

将 Remotion 的 8–16 帧节奏转为网页中的约 `280–540ms`。进入只执行一次，不循环躁动。

```css
.duo-enter{
  opacity:0;
  clip-path:inset(0 100% 0 0);
  transform:translateX(32px) skewX(-.8deg);
  transition:
    opacity .34s ease,
    clip-path .48s cubic-bezier(.22,1,.36,1),
    transform .48s cubic-bezier(.22,1,.36,1);
}
.slide.active .duo-enter.is-visible{
  opacity:1;clip-path:inset(0 0 0 0);transform:none;
}
.duo-card-enter{transform:perspective(1000px) translateX(38px) rotateY(-2deg) rotate(-.8deg)}
.duo-card-enter.is-visible{transform:none}
```

语义顺序用数据控制，不用随机延迟：

```js
const sequence = [nodes, routes, conclusion];
sequence.forEach((group, step) => {
  group.forEach((el, i) => setTimeout(() => el.classList.add('is-visible'), step*320 + i*80));
});
```

粒子只用于传递/汇聚等明确语义，并在结束后移除。禁止随机白点背景、连续弹跳和无限缩放。

## C27｜双色风整帧明暗切换

暖白与近黑使用同一 DOM 与布局变量，只切模式类；禁止半透明暖白层长期压住黑底。

```js
function setDuoMode(slide, mode){
  const dark = mode === 'dark';
  slide.classList.toggle('duo-dark', dark);
  slide.dataset.colorMode = dark ? 'dark' : 'warm';
  slide.querySelectorAll('[data-mode-copy]').forEach(el => {
    el.textContent = el.dataset[dark ? 'darkCopy' : 'warmCopy'] || el.textContent;
  });
}
```

```css
.slide.duo{transition:background-color .01s linear,color .01s linear}
.duo-rule,.duo-progress i{background:var(--duo-border)}
.duo-progress i.done{background:var(--duo-yellow)}
```

模式切换应发生在操作完成、结果出现或段落收束等语义完成点。

## C28｜双色风 1920×1080 构图骨架

```css
.duo-chapter-mark{
  position:absolute;left:70px;top:48px;display:flex;align-items:center;gap:24px;
  font-size:25px;font-weight:900;letter-spacing:.04em;
}
.duo-chapter-mark::after{content:"";width:210px;height:2px;background:var(--duo-yellow)}
.duo-progress{position:absolute;right:72px;top:64px;display:flex;gap:10px}
.duo-progress i{display:block;width:30px;height:3px;background:var(--duo-border)}
.duo-progress i.done{background:var(--duo-yellow)}
.duo-main{
  position:absolute;left:370px;right:170px;top:165px;bottom:110px;
  display:grid;grid-template-columns:560px minmax(0,1fr);gap:120px;
}
.duo-eyebrow{font-size:22px;letter-spacing:.24em;color:var(--duo-subtle);font-weight:760}
.duo-title{margin:24px 0 0;font-size:64px;line-height:1.08;letter-spacing:-.045em;font-weight:950}
.duo-judgement{margin-top:26px;font-size:32px;line-height:1.3;color:var(--duo-yellow);font-weight:880}
.duo-evidence{align-self:center;min-width:0}
```

有字幕时 `.duo-main` 的底部不得低于字幕安全区；无头像和字幕时也应保持大留白，而不是自动填满。

## C29｜海洋风令牌、页面语法与数据生成

唯一可执行源：`assets/styles/ocean/theme.css`、`template.html`、`build_deck.py`、`deck.json`（路径相对 YanDeck 技能目录）。文档只登记接口，不重复维护模块源码。固定 1920×1080；六种类型 prologue/cover/chapter/cards/process/closing；文字、Logo、背景、模型和粒子词从数据读入，HTML 文本统一转义。本实现不继承工程主题内容。

## C30｜实时海洋、稳定玻璃与局部收束场景

唯一可执行源：`assets/styles/ocean/media/ocean/main.js`、`media/ocean/index.html`、`media/ocean/style.css`、`theme.css`。

接口：同源父页面发 `{type:'ocean-background', action:'pause'|'resume'|'hover'|'ripple', x, y}`；x/y 为 iframe 内 0–1 坐标，hover 的 null 表示离开。只接收同源 parent。`OceanBackground.state()/rippleState()` 提供只读核验。3 鱼、24 波纹槽、岸线判断、轻悬停/重点击保留。隐藏 scene 停止绘制，宿主按需加载 iframe；卡片不动画 backdrop-filter；背景的本地海岸图是静态后备。

封面海洋 iframe 是独立文档，父演示页的 cursor CSS 不会继承进去。其画布与文档须单独声明同款指针；通用海洋风使用 `brand/pointer.svg` 相对路径，旧 CSSC 成品使用同图形的内联 SVG 数据 URI，不依赖站点根路径。

## C31｜海洋与正文事件分工

唯一可执行源：`assets/styles/ocean/deck.js`。顺序：控件优先 → 判断裸露水域并投递波纹 → 普通页推进步骤/翻页。水域分支不得提前 return 截断普通翻页。封面例外使用进入按钮，粒子例外等完成握手。背景 iframe pointer-events:none，保持宿主键盘/滚轮。标题、正文、卡片、SVG 和交互区域不穿透。斜线收束框使用对应坐标与裁切命中，不能向被左侧遮住的水面投波。

## C32｜可注入的章节船模浏览

唯一可执行源：`assets/styles/ocean/modules/carrier.js`。`installCarrier(slides,getSlide)` 返回 activate/state；宿主切页调用 activate。150 帧、15 张 5×2 精灵图、1120×630 帧尺寸、alpha 真正命中、邻近图预取与逐帧缓动；本地 poster 在加载失败时仍可见。章节 right=145/top=250/scale=1.28。没有 hover 抬起、整体漂浮或新点击动作。

## C33｜参数化粒子与成型瞬间交接

唯一可执行源：`assets/styles/ocean/media/particles/index.html`。`?text=FANGCUN&logo=0&embed=1`；文字 1–12 字符，按测量结果适配字宽。父协议 type 为 yandeck-particle，action reset/pause/resume/disperse；子在完整组装画面被提交后才发 reassembled，宿主同时验证 origin/source/当前页。普通 intro 成型不自动翻页，点击完整散开后重组才切。保留真实透视连续弯曲与独立弹道，不使用整字同比缩放。`YanDeckParticles.state()` 用于验证。

## C34｜源证据与提炼重放

方法真源：`references/style-extraction.md`。本项目来源与迁移指纹：`references/provenance.json`；不携带旧单位成品归档或依赖旧 D 盘抽取脚本。新风格保存自己的输入/变换记录，不在创建新稿时重跑历史抽取。保留双色等既有主题，新增唯一 id。

## C35｜注册表驱动的开箱启动器

唯一实现：`scripts/new_deck.py`，注册表 `references/styles/registry.json`。根据 style 找 runtime，复制为独立目录，写 deck.json 并运行本地 build_deck.py；已有目录一律拒绝覆盖。默认 background=none/model=none，显式选择后启用；默认方寸 Logo，空 logo 为无标志。只含文档的风格仍可按其规范制作，CLI 清楚提示没有预制启动包，不假装可运行。新 runtime 须提供 deck.json/build_deck.py，并将所有依赖相对化。

## C36｜成品冻结、独立服务和验证

独立服务真源：`scripts/serve.py`（复制进稿件，默认绑定本机/空闲端口）。项目校验：仓库根 `scripts/check_project.py`；实际浏览器核验：`scripts/qa_deck.cjs`。冻结确认后的稿件时复制其生成源和完整依赖到 `成品/<演示名称>/<版本>/`，不覆盖、不移动工作区；建立 SHA-256 清单。只复制本次稿件，不使用旧单位专用 include 配置。其它 origin 阻断后验证本地 HTTP、全部页和截图；hash 不能代替行为 QA。

## C37｜自然减密的双层常态粒子场

唯一可执行源仍是 `assets/styles/ocean/media/particles/index.html`，不另存重复着色器。对应确认源修订 `gentle-fringe-v20`，本快照来源指纹见 `references/provenance.json`。

字形采样阶段保存边缘强度和向外法线；着色阶段将主体磁流与外围漂移分开。主体维持连续细微流动，边缘粒子按距离、低频空间场和确定性随机值逐渐外扩、减小、降透明并稀疏化，使密度从正文自然过渡到不规则缺失的最外缘。外围只在原锚点附近缓慢独立微移，幅度不高于主体，禁止固定轮廓、全字同步呼吸、闪烁跳变和长距离沿边奔跑。爆炸、聚拢、鼠标透视弯曲和 `reassembled` 交接沿用 C33。

## C38｜首页三态与需求落地

实现真源：`assets/styles/ocean/build_deck.py`、`deck.js` 和 `scripts/new_deck.py`。`homepage=particles/cover/none` 分别保留全部页面、过滤 prologue、过滤 prologue+cover；不自动补造不存在的页面，过滤后至少一页。完整标题与 1–12 字符粒子词分开。序章右下 `data-skip` 按钮能键盘/触控跳过；选择非粒子形式不生成 iframe。用户需求与待确认建议按 intake.md 记录。

## C39｜本地 Git 与资源发布边界

规则真源：仓库根 `.gitignore`、`docs/assets-and-rights.md`、`docs/github-ready.md`。检查真源：`scripts/check_project.py`。用户稿件、成品、私有海浪/船模、凭据、QA 与依赖缓存不进入 Git。准备上传不是实际发布授权；确认归属、名字、可见性后才创建/推送。开源许可证不自动授予。

## C40｜背景独立资源交付

唯一导出器：`scripts/export_background.py`。游鱼场景真源仍是 C30 的 media/ocean，避免维护两份代码。输出只含背景所需场景、纹理、库、指针、许可证及入口/启动器/说明/hash 清单，没有演示封面、正文、逐项呈现或翻页。文档真源：`references/backgrounds.md`。目标存在即拒绝覆盖；锦鲤场景不假称有钓鱼玩法；默认海浪仍是私有可选资源。

## C41｜内容判断挑战游戏

唯一通用模块：`assets/modules/judgement-game.js`。接口 `FangcunJudgementGame.create({root, questions, roundCount, randomize})`。每题包含 id/topic/prompt/options（三项）/answer（零起点）/explanation；只用 textContent 写数据。root 内 `data-game` 指定 status/topic/prompt/feedback-title/feedback/next/reset，三个按钮 `data-choice` 各含 `data-choice-text`。

返回 choose/next/reset/getState/destroy。状态 question→answered→下一题或finished；每题只计一次，未作答禁止下一关，结果解释错因，重玩重新抽题并清空分数。无模型/API 调用、后台计时或伪能力评分。具体题库维护在用户稿件生成源，不将用户内容放进模块。

## C42｜可见控制栏与固定舞台分区

播放和风格选择使用有显式文字标签的常驻栏，选择器有对应 label，控件不误翻页。控制栏占据独立视口空间：将其实际高度从可用舞台高度减去，在剩余区域均匀缩放 1920×1080；不要用巨大底部浮层遮正文。截图捕获如隐藏控制栏，必须同时还原完整可用视口。舞台仍保持 16:9，不做手机内容重排。界面布局可因用户成品需求调整，但必须实际核验内嵌浏览器和手机视口中的可见性。

## C43｜非商业许可的可移植交付

许可及范围维护源为仓库根 LICENSE/NOTICE，skill 中两文件为逐字相同的发行副本，由 scripts/check_project.py 检查一致性。new_deck.py 与 export_background.py 复制两文件进导出包并在 README 标明条件；背景 manifest 包含两者指纹。自有受保护部分采用统一许可 2.0，对外分发/联网提供须保留同许可并公开匹配版本的对应源码，提供期间及结束后三年可获取；私下改版不强制公开。客户独立内容、秘密和日志排除。字体 OFL、Three.js MIT、frontend-slides 原有 MIT 继续独立保留，旧版有效授权不撤回。商用需另行书面授权；不声称思想、独立实现或 AI 图片均具有独占版权。
