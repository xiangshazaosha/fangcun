/* C18/C36: isolated-origin browser QA. Screenshots still need human review. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const deck = path.resolve(option('--deck', 'decks/my-topic'));
const out = path.resolve(option('--out', '.qa/' + path.basename(deck)));
fs.mkdirSync(out, { recursive: true });

async function server() {
  const child = spawn(process.env.PYTHON || 'python', [path.join(deck, 'serve.py'), '--no-open'], { windowsHide: true });
  child.stderr.on('data', () => {});
  const url = await new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => { child.kill(); reject(new Error('Server timeout')); }, 15000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('Server exited ' + code)); });
    child.stdout.on('data', chunk => {
      text += chunk;
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+\/index\.html/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  return { child, url };
}

(async () => {
  const { child, url } = await server();
  let browser;
  const report = { deck: path.basename(deck), errors: [], screenshots: [], checks: {}, passed: false };
  try {
    browser = await chromium.launch({ headless: true,
      ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}),
      args: ['--use-angle=swiftshader'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); });
    const origin = new URL(url).origin;
    await page.route('**/*', route => {
      const requested = route.request().url();
      if (requested.startsWith(origin + '/') || requested.startsWith('data:')) return route.continue();
      report.errors.push('External dependency ' + requested);
      return route.abort();
    });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.YanDeck);
    await page.evaluate(() => document.fonts.ready);
    const count = await page.locator('.slide').count();
    assert(count > 0);
    assert(!await page.locator('body').innerText().then(s => /CSSC|中国船舶集团/.test(s)));
    async function screenshot(name) {
      await page.screenshot({ path: path.join(out, name) });
      report.screenshots.push(name);
    }
    for (let i = 0; i < count; i++) {
      await page.evaluate(index => YanDeck.goTo(index, true), i);
      await page.waitForTimeout(450);
      assert.equal(await page.locator('.slide.active').count(), 1);
      await screenshot(`page-${i}-720.png`);
    }
    const prologue = await page.locator('.slide.prologue').count();
    if (prologue) {
      await page.evaluate(() => YanDeck.goTo(0));
      await page.waitForFunction(() => document.querySelector('.particle-frame').contentWindow.YanDeckParticles?.state().phase === 'ready', null, { timeout: 120000 });
      const frame = page.frames().find(f => f.url().includes('/media/particles/'));
      assert(frame);
      const config = JSON.parse(fs.readFileSync(path.join(deck, 'deck.json'), 'utf8'));
      assert.equal(await frame.evaluate(() => YanDeckParticles.state().text), config.particleText);
      assert.equal(await page.evaluate(() => YanDeck.state().page), 0); // initial assembly must not advance
      await screenshot('particle-ready.png');
      await frame.locator('canvas').click();
      await page.waitForFunction(() => YanDeck.state().page === 1, null, { timeout: 120000 });
      report.checks.particleHandoff = true;
      await page.evaluate(() => YanDeck.goTo(0));
      await page.locator('[data-skip]').click();
      assert.equal(await page.evaluate(() => YanDeck.state().page), 1);
      report.checks.skip = true;
    }
    const contentIndex = await page.evaluate(() => [...document.querySelectorAll('.slide')].findIndex(s => s.querySelector('[data-build]')));
    if (contentIndex >= 0) {
      await page.evaluate(index => YanDeck.goTo(index), contentIndex);
      await page.mouse.click(1170, 80);
      assert.equal(await page.evaluate(() => YanDeck.state().step), 1);
      await page.keyboard.press('Space');
      assert.equal(await page.evaluate(() => YanDeck.state().step), 2);
      const before = await page.evaluate(() => YanDeck.state());
      await page.evaluate(() => {
        const button = document.createElement('button');
        button.id = 'qaControl'; button.textContent = '测试控件';
        button.style.cssText = 'position:absolute;left:10px;top:120px;z-index:99';
        document.querySelector('.slide.active').append(button);
      });
      await page.locator('#qaControl').click();
      assert.deepEqual(await page.evaluate(() => YanDeck.state()), before);
      await page.locator('#qaControl').evaluate(e => e.remove());
      report.checks.stepAndControlIsolation = true;
      await page.evaluate(index => YanDeck.goTo(index, true), contentIndex);
      for (const [width, height] of [[1920, 1080], [1280, 720], [390, 844]]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        const rect = await page.locator('#deckStage').boundingBox();
        assert(Math.abs(rect.width / rect.height - 16 / 9) < .001);
        await screenshot(`stage-${width}x${height}.png`);
      }
    }
    if (await page.locator('#globalOcean').count()) {
      const oceanIndex = await page.evaluate(() => [...document.querySelectorAll('.slide')].findIndex(s => s.dataset.background === 'ocean'));
      await page.evaluate(index => YanDeck.goTo(index), oceanIndex);
      await page.waitForFunction(() => globalOcean.contentWindow.OceanBackground?.state().length === 3, null, { timeout: 120000 });
      report.checks.threeFish = true;
    }
    if (await page.locator('.global-video').count()) {
      const videoIndex = await page.evaluate(() => [...document.querySelectorAll('.slide')].findIndex(s => s.dataset.background === 'video'));
      await page.evaluate(index => YanDeck.goTo(index), videoIndex);
      await page.waitForFunction(() => document.querySelector('.global-video').readyState >= 2 && document.querySelector('.global-video').videoWidth > 0);
      report.checks.localVideoDecoded = true;
    }
    if (await page.locator('.carrier-stage').count()) {
      const modelIndex = await page.evaluate(() => [...document.querySelectorAll('.slide')].findIndex(s => s.classList.contains('carrier-slide')));
      await page.evaluate(index => YanDeck.goTo(index), modelIndex);
      await page.waitForFunction(() => document.querySelector('.slide.active .carrier-stage.ready'), null, { timeout: 60000 });
      assert.equal(await page.locator('.slide.active .carrier-stage').evaluate(e => getComputedStyle(e).translate), 'none');
      await screenshot('private-carrier.png');
      report.checks.carrierLoadedNoLift = true;
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.YanDeck);
    await page.keyboard.press('End');
    assert.equal(await page.evaluate(() => YanDeck.state().page), count - 1);
    await screenshot('reduced-motion.png');
    report.checks.reducedKeyboard = true;
    report.checks.pageCount = count;
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } finally {
    if (browser) await browser.close();
    child.kill();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  }
  console.log(JSON.stringify(report, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
