// Testes de layout e interação do site do Posidonio.
// Roda com: npm test  (usa o Chromium do Playwright; defina CHROMIUM_PATH para
// apontar um binário específico, ex.: /opt/pw-browsers/chromium)
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.json': 'application/json',
};

let server, base, browser;

before(async () => {
  server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}/`;

  const executablePath = process.env.CHROMIUM_PATH
    || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
  browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
});

after(async () => {
  await browser?.close();
  server?.close();
});

const VIEWPORTS = [
  { name: 'iphone-se', width: 320, height: 568, mobile: true },
  { name: 'android-sm', width: 360, height: 800, mobile: true },
  { name: 'iphone-14', width: 390, height: 844, mobile: true },
  { name: 'iphone-pro-max', width: 430, height: 932, mobile: true },
  { name: 'phone-landscape', width: 844, height: 390, mobile: true },
  { name: 'ipad-portrait', width: 768, height: 1024, mobile: true },
  { name: 'ipad-air', width: 820, height: 1180, mobile: true },
  { name: 'ipad-landscape', width: 1024, height: 768, mobile: true },
  { name: 'desktop', width: 1366, height: 768, mobile: false },
  { name: 'desktop-xl', width: 1920, height: 1080, mobile: false },
];
// espelham as media queries do ritual no site
const isShort = v => v.height <= 520;
const isTabletL = v => !isShort(v) && v.width > 760 && v.width <= 1200 && v.width > v.height;
const isNarrow = v => !isShort(v) && (v.width <= 760 || (v.width <= 900 && v.height > v.width));
const isSequential = v => isShort(v) || isTabletL(v); // estouro só depois de os passos saírem

async function open(vp, url = '') {
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: vp.mobile ? 2 : 1,
    isMobile: vp.mobile, hasTouch: vp.mobile,
  });
  const page = await ctx.newPage();
  const problems = [];
  page.on('console', m => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('pageerror', e => problems.push(`pageerror: ${e}`));
  page.on('response', r => { if (r.status() >= 400) problems.push(`${r.status()} em ${r.url()}`); });
  await page.goto(base + url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2400); // cortina de entrada + fontes
  return { ctx, page, problems };
}

const scrollTo = async (page, y) => {
  await page.evaluate(v => window.scrollTo({ top: v, behavior: 'instant' }), y);
  await page.waitForTimeout(700); // transições de .5s assentam
};

// progresso p (0..1) do scrollytelling do ritual -> posição de scroll
const ritualScroll = (page, p) => page.evaluate(pp => {
  const s = document.querySelector('#ritual');
  return s.offsetTop + pp * (s.offsetHeight - innerHeight);
}, p);

const box = (page, sel) => page.evaluate(s => {
  const el = document.querySelector(s);
  if (!el) return null;
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, opacity: +cs.opacity, display: cs.display };
}, sel);

const visible = b => b && b.display !== 'none' && b.opacity > 0.15;
const overlap = (a, b, tol = 2) =>
  a.left < b.right - tol && b.left < a.right - tol && a.top < b.bottom - tol && b.top < a.bottom - tol;

for (const vp of VIEWPORTS) {
  test(`[${vp.name}] sem overflow horizontal, sem erros, sem 404`, async () => {
    const { ctx, page, problems } = await open(vp);
    const check = async where => {
      const { sw, iw } = await page.evaluate(() => ({ sw: document.scrollingElement.scrollWidth, iw: innerWidth }));
      assert.ok(sw <= iw, `overflow horizontal ${where}: scrollWidth ${sw} > innerWidth ${iw}`);
    };
    await check('no topo');
    const max = await page.evaluate(() => document.scrollingElement.scrollHeight - innerHeight);
    for (const f of [0.25, 0.5, 0.75, 1]) { await scrollTo(page, max * f); await check(`a ${f * 100}% do scroll`); }
    assert.deepEqual(problems, []);
    await ctx.close();
  });
}

// ---- ritual: primeira descida no estreito (celular/tablet em pé) ----
for (const vp of VIEWPORTS.filter(isNarrow)) {
  test(`[${vp.name}] ritual mobile: coreografia e ausência de sobreposição`, async () => {
    const { ctx, page } = await open(vp);

    // primeira descida: o estouro não pode vir antes dos passos
    await scrollTo(page, await ritualScroll(page, 0.15));
    assert.ok(visible(await box(page, '.st1')), 'passo 1 deveria estar visível em p=0.15');
    assert.ok(!visible(await box(page, '.st2')), 'passo 2 não deveria aparecer em p=0.15');
    assert.ok(!(await page.$('#ritual.smashed')), 'ΟΠΑ! não pode disparar antes dos passos no mobile');

    await scrollTo(page, await ritualScroll(page, 0.42));
    assert.ok(visible(await box(page, '.st2')), 'passo 2 deveria estar visível em p=0.42');
    assert.ok(!visible(await box(page, '.st1')), 'passo 1 já deveria ter saído em p=0.42');

    await scrollTo(page, await ritualScroll(page, 0.7));
    assert.ok(visible(await box(page, '.st3')), 'passo 3 deveria estar visível em p=0.7');
    assert.ok(await page.$('#ritual.smashed'), 'ΟΠΑ! deveria ter disparado no clímax (p=0.7)');

    // em nenhum ponto da seção os blocos de texto podem se sobrepor
    for (const p of [0.05, 0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85, 0.95]) {
      await scrollTo(page, await ritualScroll(page, p));
      const head = await box(page, '.ritual-head');
      const opa = await box(page, '.smash-reveal .opa-big');
      const sub = await box(page, '.smash-sub');
      const opaOn = await page.$('#ritual.smashed') ? opa : null;
      const subOn = await page.$('#ritual.smashed') ? sub : null;
      for (const sel of ['.st1', '.st2', '.st3']) {
        const st = await box(page, sel);
        if (!visible(st)) continue;
        assert.ok(!overlap(head, st), `p=${p}: título sobrepõe ${sel}`);
        if (opaOn) assert.ok(!overlap(st, opaOn), `p=${p}: ${sel} sobrepõe o ΟΠΑ!`);
        if (subOn && visible(subOn)) assert.ok(!overlap(st, subOn), `p=${p}: ${sel} sobrepõe a legenda`);
      }
      if (opaOn) {
        assert.ok(!overlap(head, opaOn), `p=${p}: título sobrepõe o ΟΠΑ!`);
        if (visible(sub)) assert.ok(!overlap(opaOn, sub), `p=${p}: ΟΠΑ! sobrepõe a legenda`);
      }
    }
    await ctx.close();
  });
}

// ---- ritual: celular deitado e tablet deitado — estouro só depois dos passos ----
for (const vp of VIEWPORTS.filter(isSequential)) {
  test(`[${vp.name}] ritual sequencial: passos e ΟΠΑ! nunca coexistem`, async () => {
    const { ctx, page } = await open(vp);
    await scrollTo(page, await ritualScroll(page, 0.7));
    assert.ok(visible(await box(page, '.st3')), 'passo 3 deveria estar visível em p=0.7');
    assert.ok(!(await page.$('#ritual.smashed')), 'em tela baixa o ΟΠΑ! espera os passos saírem');
    await scrollTo(page, await ritualScroll(page, 0.92));
    assert.ok(await page.$('#ritual.smashed'), 'ΟΠΑ! deveria disparar no fim (p=0.92)');
    assert.ok(!visible(await box(page, '.st3')), 'passo 3 já deveria ter saído junto do ΟΠΑ!');
    for (const p of [0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95]) {
      await scrollTo(page, await ritualScroll(page, p));
      const head = await box(page, '.ritual-head');
      const opa = await box(page, '.smash-reveal .opa-big');
      const sub = await box(page, '.smash-sub');
      const smashed = !!(await page.$('#ritual.smashed'));
      for (const sel of ['.st1', '.st2', '.st3']) {
        const st = await box(page, sel);
        if (!visible(st)) continue;
        assert.ok(!overlap(head, st), `p=${p}: título sobrepõe ${sel}`);
        if (smashed) assert.ok(!overlap(st, opa), `p=${p}: ${sel} sobrepõe o ΟΠΑ!`);
      }
      if (smashed) {
        assert.ok(!overlap(head, opa), `p=${p}: título sobrepõe o ΟΠΑ!`);
        if (visible(sub)) assert.ok(!overlap(opa, sub), `p=${p}: ΟΠΑ! sobrepõe a legenda`);
      }
    }
    await ctx.close();
  });
}

// ---- ritual: desktop preserva o desenho original ----
for (const name of ['desktop', 'desktop-xl']) {
  test(`[${name}] ritual: título nunca sobrepõe os passos`, async () => {
    const vp = VIEWPORTS.find(v => v.name === name);
    const { ctx, page } = await open(vp);
    for (const p of [0.1, 0.2, 0.35, 0.5, 0.65, 0.8]) {
      await scrollTo(page, await ritualScroll(page, p));
      const head = await box(page, '.ritual-head');
      for (const sel of ['.st1', '.st2', '.st3']) {
        const st = await box(page, sel);
        if (visible(st)) assert.ok(!overlap(head, st), `p=${p}: título sobrepõe ${sel}`);
      }
    }
    assert.ok(await page.$('#ritual.smashed'), 'no desenho desktop o estouro dispara cedo');
    await ctx.close();
  });
}

// ---- interações principais ----
test('[iphone-14] quebrar prato incrementa o contador; toggle de som responde', async () => {
  const vp = VIEWPORTS.find(v => v.name === 'iphone-14');
  const { ctx, page } = await open(vp);
  await page.evaluate(() => document.querySelector('#heroPlate').scrollIntoView({ block: 'center', behavior: 'instant' }));
  await page.waitForTimeout(400);
  assert.equal(await page.textContent('#opaCount'), '0');
  await page.click('#heroPlate', { position: { x: 150, y: 200 } });
  await page.waitForFunction(() => document.querySelector('#opaCount').textContent === '1', null, { timeout: 4000 });
  const label0 = await page.textContent('#sndToggle');
  await page.click('#sndToggle');
  const label1 = await page.textContent('#sndToggle');
  assert.notEqual(label0, label1, 'o botão de som deveria alternar on/off');
  assert.equal(await page.textContent('#opaCount'), '1', 'clicar no som não pode quebrar prato');
  await ctx.close();
});

test('[iphone-14] âncora do header leva à seção de reservas', async () => {
  const vp = VIEWPORTS.find(v => v.name === 'iphone-14');
  const { ctx, page } = await open(vp);
  await page.click('nav .cta');
  await page.waitForTimeout(1600); // scroll suave
  const { y, target } = await page.evaluate(() => ({ y: scrollY, target: document.querySelector('#visite').offsetTop }));
  assert.ok(Math.abs(y - (target - 72)) < 220, `âncora deveria parar perto de #visite (y=${y}, alvo=${target - 72})`);
  await ctx.close();
});

test('modo QA (?shot=1) segue funcionando', async () => {
  const vp = VIEWPORTS.find(v => v.name === 'desktop');
  const { ctx, page, problems } = await open(vp, '?shot=1&goto=ritual');
  assert.ok(await page.$('body.ready'), 'body.ready deveria estar aplicado no modo QA');
  assert.deepEqual(problems.filter(p => p.startsWith('pageerror')), []);
  await ctx.close();
});
