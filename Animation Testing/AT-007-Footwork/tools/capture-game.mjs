/**
 * Captures stills of the game running with the experimental ?footwork flag.
 * Needs the game running: npm run dev -- --port 5173 --strictPort
 * Run: node "Animation Testing/AT-007-Footwork/tools/capture-game.mjs"
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('../evidence/', import.meta.url));
const args = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
const browser = await chromium.launch({ channel: 'chrome', args }).catch(() => chromium.launch({ args }));
const page = await browser.newPage({ viewport: { width: 1280, height: 760 } });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
const state = () => page.evaluate(() => window.__prototype);
const until = async (test, timeout = 20000) => { const end = Date.now() + timeout; while (Date.now() < end) { const s = await state(); if (test(s)) return s; await page.waitForTimeout(15); } throw new Error('timed out: ' + test); };
const brief = s => JSON.stringify({ footwork: s.footwork && { ...s.footwork, feet: undefined }, attack: s.attack && { name: s.attack.name, phase: s.attack.phase }, blocking: s.defense.blocking, speed: +s.actualSpeed.toFixed(2) });

await page.goto('http://127.0.0.1:5173/?footwork&debug&quality=low');
await page.getByRole('button', { name: 'Begin', exact: true }).click();
await page.getByRole('button', { name: 'Start defense drill', exact: true }).click();
let s = await until(v => v.footwork?.weight > 0.98);
console.log('engaged', brief(s));
await page.screenshot({ path: `${out}game-engaged-guard.png` });

await page.keyboard.down('KeyD');
s = await until(v => v.footwork.move && /Step/.test(v.footwork.move) && v.actualSpeed > 0.5);
console.log('strafing', brief(s));
await page.waitForTimeout(350);
await page.screenshot({ path: `${out}game-engaged-step.png` });
await page.keyboard.up('KeyD');
await until(v => v.actualSpeed < 0.05 && !v.footwork.move);

await page.keyboard.press('KeyJ');
s = await until(v => v.attack?.phase === 'swing');
console.log('attack swing', brief(s));
await page.screenshot({ path: `${out}game-attack-lunge.png` });
await page.keyboard.down('KeyE');
s = await until(v => v.defense.blocking && v.footwork.stance === 'low');
console.log('guard pressed mid-swing', brief(s));
await page.waitForTimeout(200);
s = await state(); console.log('200 ms later', brief(s));
await page.screenshot({ path: `${out}game-guard-interrupt.png` });
await page.keyboard.up('KeyE');
await page.waitForTimeout(500);
s = await state(); console.log('released', brief(s));
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
await browser.close();
