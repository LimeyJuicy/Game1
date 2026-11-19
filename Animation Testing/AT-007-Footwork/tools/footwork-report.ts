/**
 * Prints what each footwork move actually does when simulated at 60 Hz:
 * travel, peak body speed, how straight the legs get, how far the knees point
 * from the toes, and whether a planted boot ever moves.
 *
 * Run: node --experimental-strip-types "Animation Testing/AT-007-Footwork/tools/footwork-report.ts"
 */
import { createFootwork } from '../../../src/footwork/controller.ts';
import type { Footwork } from '../../../src/footwork/controller.ts';
import { DT, run } from '../../../tests/footwork-trace.ts';
import type { Trace } from '../../../tests/footwork-trace.ts';
import { STANCES, TUNING } from '../../../src/footwork/stances.ts';

TUNING.breath = 0;

const row = (name: string, t: Trace) => console.log(
  `${name.padEnd(30)} ${(t.ticks * DT).toFixed(2)}s  travel ${t.travelled.toFixed(3)}  peak ${t.peakSpeed.toFixed(2)} m/s  ext ${(t.maxExtension * 100).toFixed(0)}%  knee/toes ${t.maxKneeOff.toFixed(0)}°  hip≥${t.minHip.toFixed(2)}  miss ${t.maxMiss.toFixed(4)}  shift ${t.maxShift.toFixed(3)}  drift ${t.plantedDrift.toFixed(5)}  2air ${t.bothAirborne}  jointStep ${t.maxJointStep.toFixed(3)}`);

{
  for (const stance of STANCES) {
    console.log(`\n== ${stance.name} ==`);
    const once = (name: string, act: (fw: Footwork) => void) => {
      const fw = createFootwork({ stance: stance.id }); act(fw);
      row(name, run(fw, () => !fw.busy));
      return fw;
    };
    once('advance', fw => fw.step(0, -1)); once('retreat', fw => fw.step(0, 1)); once('step right', fw => fw.step(1, 0)); once('step left', fw => fw.step(-1, 0));
    once('pass forward', fw => fw.pass(true));
    for (const depth of [1, 0.5, 0]) {
      const fw = once(`lunge ${depth}`, f => f.lunge(depth));
      const copy = createFootwork(); copy.restore(fw.snapshot());
      fw.recover(true); row(`  recover forward`, run(fw, () => !fw.busy));
      copy.recover(false); row(`  recover back`, run(copy, () => !copy.busy));
    }
    const chain = createFootwork({ stance: stance.id }); chain.setIntent({ x: 0, z: -1 });
    const chained = run(chain, tick => tick >= 180);
    console.log(`chained advance 3 s: ${chained.travelled.toFixed(2)} m, mean ${(chained.travelled / 3).toFixed(2)} m/s, peak ${chained.peakSpeed.toFixed(2)} m/s, 2air ${chained.bothAirborne}`);
  }
}
