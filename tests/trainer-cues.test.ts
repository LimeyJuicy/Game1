import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createTrainer } from '../src/trainer.ts';
import type { DefenseResult, StrikeKind } from '../src/defense.ts';

function fixture(kind: StrikeKind) {
  const scene = new THREE.Scene(), trainer = createTrainer(scene);
  const player = new THREE.Vector3(), camera = new THREE.PerspectiveCamera();
  trainer.configure(true, kind, 0, player);
  let time = 0;
  const step = (strike: () => DefenseResult | false = () => false) => {
    time += 1 / 120; trainer.update(1 / 120, time, player, camera, [], strike);
  };
  const untilCue = () => {
    for (let i = 0; i < 600 && !trainer.cueVisible; i++) step();
    assert.equal(trainer.cueVisible, true, 'the next attack must show its warning');
    assert.equal(trainer.stage, 'windup');
  };
  return { scene, trainer, step, untilCue };
}

for (const kind of ['normal', 'heavy', 'unblockable'] as const) {
  test(`${kind} warning returns after an interrupted strike and the next swing resolves once`, () => {
    const { scene, trainer, step, untilCue } = fixture(kind);
    untilCue(); trainer.damage(18, false);
    assert.equal(trainer.cueVisible, false);
    untilCue();
    const cue = scene.children.find(object => object instanceof THREE.Mesh && object.geometry instanceof THREE.ShapeGeometry) as THREE.Mesh;
    assert.equal((cue.material as THREE.MeshBasicMaterial).color.getHexString(), kind === 'unblockable' ? 'ff443d' : 'ffffff');
    let contacts = 0;
    for (let i = 0; i < 100; i++) step(() => { contacts++; return 'block'; });
    assert.equal(contacts, 1); assert.equal(trainer.cueVisible, false);
  });
}

for (const interrupt of ['stagger', 'guard-break', 'parry', 'perfect-parry'] as const) {
  test(`warning rearms after ${interrupt} without displaying during the interruption`, () => {
    const { trainer, step, untilCue } = fixture('normal');
    untilCue();
    if (interrupt === 'stagger') trainer.damage(38, true);
    else if (interrupt === 'guard-break') trainer.breakGuard();
    else {
      for (let i = 0; i < 100 && trainer.reaction === 'free'; i++) step(() => interrupt);
    }
    assert.notEqual(trainer.reaction, 'free');
    assert.equal(trainer.cueVisible, false);
    step(); assert.equal(trainer.cueVisible, false);
    untilCue();
  });
}
