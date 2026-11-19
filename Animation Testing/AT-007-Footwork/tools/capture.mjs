/**
 * Captures still frames from the footwork bench for the experiment record.
 * Needs the bench running: npm run footwork:dev
 * Run: node "Animation Testing/AT-007-Footwork/tools/capture.mjs" [shot-name ...]
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../evidence/', import.meta.url));
const only = process.argv.slice(2);
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ channel: 'chrome', args }).catch(() => chromium.launch({ args }));
const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://127.0.0.1:5175/');
await page.waitForFunction(() => window.__footwork && window.__footwork.info.bones > 0);
await page.evaluate(() => { const b = window.__footwork; b.setPaused(true); b.toggle('follow', false); });

/** Each shot: reset, pick a view, run a little script against the bench, save a frame. */
const shots = {
  'guard-engarde-side': b => { b.setView('side'); b.act('Digit1'); b.run(30); },
  'guard-low-side': b => { b.setView('side'); b.act('Digit2'); b.run(30); },
  'guard-high-side': b => { b.setView('side'); b.act('Digit3'); b.run(30); },
  'guard-engarde-front': b => { b.setView('front'); b.act('Digit1'); b.run(30); },
  'guard-engarde-top': b => { b.setView('top'); b.act('Digit1'); b.run(30); },
  'guard-low-quarter': b => { b.setView('quarter'); b.act('Digit2'); b.run(30); },
  'advance-lead-foot-in-air': b => { b.setView('side'); b.fw.step(0, -1); b.run(7); },
  'advance-heel-landing': b => { b.setView('side'); b.fw.step(0, -1); b.run(12); },
  'advance-rear-foot-following': b => { b.setView('side'); b.fw.step(0, -1); b.run(19); },
  'retreat-mid': b => { b.setView('side'); b.fw.step(0, 1); b.run(8); },
  'side-step-front': b => { b.setView('front'); b.fw.step(1, 0); b.run(7); },
  'lunge-foot-thrown': b => { b.setView('side'); b.fw.lunge(1); b.run(14); },
  'lunge-full-side': b => { b.setView('side'); b.fw.lunge(1); b.run(45); },
  'lunge-full-quarter': b => { b.setView('quarter'); b.fw.lunge(1); b.run(45); },
  'lunge-half-side': b => { b.setView('side'); b.fw.lunge(0.5); b.run(45); },
  'lunge-legs-only': b => { b.setView('side'); b.toggle('legs', true); b.toggle('skeleton', true); b.fw.lunge(1); b.run(45); },
  'recover-forward-mid': b => { b.setView('side'); b.fw.lunge(1); b.run(40); b.fw.recover(true); b.run(13); },
  'pass-mid': b => { b.setView('side'); b.act('Digit3'); b.run(20); b.fw.pass(true); b.run(11); },
  'wall-shortened-step': b => { b.held.add('KeyW'); b.run(109); b.focus('side'); },
  'wall-stopped': b => { b.held.add('KeyW'); b.run(330); b.focus('quarter'); },
  'guard-interrupt-0': b => { b.setView('side'); b.fw.lunge(1); b.run(18); },
  'guard-interrupt-1': b => { b.setView('side'); b.fw.lunge(1); b.run(18); b.act('Digit2'); b.run(3); },
  'guard-interrupt-2': b => { b.setView('side'); b.fw.lunge(1); b.run(18); b.act('Digit2'); b.run(6); },
  'guard-interrupt-3': b => { b.setView('side'); b.fw.lunge(1); b.run(18); b.act('Digit2'); b.run(9); },
};

for (const [name, setup] of Object.entries(shots)) {
  if (only.length && !only.some(pattern => name.includes(pattern))) continue;
  await page.evaluate(() => { const b = window.__footwork; b.reset(); b.act('Digit1'); b.run(40); b.reset(); for (const key of ['legs', 'skeleton']) b.toggle(key, false); b.focus('quarter'); });
  await page.evaluate(`(${setup})(window.__footwork); window.__footwork.frame();`);
  await page.waitForTimeout(150);
  await page.evaluate(() => window.__footwork.frame());
  await page.locator('main').screenshot({ path: `${out}${name}.png` });
  console.log(name, JSON.stringify(await page.evaluate(() => ({ ...window.__footwork.info, last: window.__footwork.fw.state.last }))));
}
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close();
