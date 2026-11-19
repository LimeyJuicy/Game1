import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';

/** Synthetic triangle/two-joint fixture, never presented as the user's rig. */
function fixture() {
  const pieces: Buffer[] = [], views: object[] = []; let length = 0;
  const add = (values: number[]) => {
    const data = Buffer.from(new Float32Array(values).buffer);
    views.push({ buffer: 0, byteOffset: length, byteLength: data.length }); pieces.push(data); length += data.length;
    return views.length - 1;
  };
  const pos = add([-.25, 0, 0, .25, 0, 0, 0, 1, 0]);
  const norm = add([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  const weights = add([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]);
  const jointData = Buffer.from(new Uint16Array([0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0]).buffer);
  const joints = views.length; views.push({ buffer: 0, byteOffset: length, byteLength: jointData.length }); pieces.push(jointData); length += jointData.length;
  const bind = add([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, -.5, 0, 1]);
  const time = add([0, .5, 1]), translation = add([0, .5, 0, .12, .65, 0, 0, .5, 0]);
  return Buffer.from(JSON.stringify({ asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0, 1] }],
    nodes: [{ mesh: 0, skin: 0 }, { name: 'Test hip', children: [2] }, { name: 'Test knee', translation: [0, .5, 0] }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0, NORMAL: 1, WEIGHTS_0: 2, JOINTS_0: 3 } }] }],
    skins: [{ inverseBindMatrices: 4, joints: [1, 2], skeleton: 1 }],
    animations: [{ name: 'Synthetic step', samplers: [{ input: 5, output: 6 }], channels: [{ sampler: 0, target: { node: 2, path: 'translation' } }] }],
    buffers: [{ byteLength: length, uri: `data:application/octet-stream;base64,${Buffer.concat(pieces).toString('base64')}` }], bufferViews: views,
    accessors: [{ bufferView: pos, componentType: 5126, count: 3, type: 'VEC3', min: [-.25, 0, 0], max: [.25, 1, 0] },
      { bufferView: norm, componentType: 5126, count: 3, type: 'VEC3' }, { bufferView: weights, componentType: 5126, count: 3, type: 'VEC4' },
      { bufferView: joints, componentType: 5123, count: 3, type: 'VEC4' }, { bufferView: bind, componentType: 5126, count: 2, type: 'MAT4' },
      { bufferView: time, componentType: 5126, count: 3, type: 'SCALAR', min: [0], max: [1] }, { bufferView: translation, componentType: 5126, count: 3, type: 'VEC3' }],
  }));
}
test('reference humanoid loads and animates without Blender; manual rig controls still work', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/?reference=soldier');
  await expect(page.getByRole('heading', { name: 'Rig Workbench' })).toBeVisible();
  await expect(page.locator('#source-status')).toContainText('Mixamo');
  await expect(page.locator('#stats')).toContainText('4 clips');
  await expect(page.locator('#clip')).toHaveValue('legs');
  await expect.poll(() => page.evaluate(() => (window as any).__rigWorkbench.playing)).toBe(true);
  await expect.poll(() => page.evaluate(() => (window as any).__rigWorkbench.time)).toBeGreaterThan(.05);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.locator('#timeline').fill('0.5');
  await expect.poll(() => page.evaluate(() => (window as any).__rigWorkbench.study.maximumReachError)).toBeLessThan(.003);
  await page.screenshot({ path: fileURLToPath(new URL('../reports/workbench-reference.png', import.meta.url)) });
  for (const value of ['0', '1', '2', '3']) {
    await page.selectOption('#clip', value);
    await expect(page.locator('#play')).toBeEnabled();
    await page.locator('#timeline').fill('0.01');
  }
  await page.locator('#file').setInputFiles({ name: 'synthetic-viewer-check.gltf', mimeType: 'model/gltf+json', buffer: fixture() });
  await expect(page.locator('#stats')).toContainText('2 bones · 1 clips');
  await page.selectOption('#clip', '0'); await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#play').click();
  await expect.poll(() => page.evaluate(() => (window as any).__rigWorkbench.time)).toBeGreaterThan(.05);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.locator('#timeline').fill('0.5');
  await expect.poll(() => page.evaluate(() => (window as any).__rigWorkbench.time)).toBeCloseTo(.5);
  await page.selectOption('#speed', '0.25');
  await page.getByRole('button', { name: 'Side', exact: true }).click();
  await page.locator('#wireframe').check(); await page.locator('#skeleton').uncheck();
  await page.getByRole('button', { name: 'Front', exact: true }).click();
  await page.screenshot({ path: fileURLToPath(new URL('../reports/workbench-fixture.png', import.meta.url)) });
  await page.selectOption('#clip', '-1'); await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#file').setInputFiles({ name: 'not-an-export.blend', mimeType: 'application/octet-stream', buffer: Buffer.from('BLENDER_v276') });
  await expect(page.locator('#status')).toContainText('exported through Blender');
  expect(errors).toEqual([]);
});
