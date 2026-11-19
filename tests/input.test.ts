import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/input.ts';

test('riposte suppression preserves fresh released-key input and blocks held/locked keys until release', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const events = new EventTarget(), canvas = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: canvas } });
  const dispatch = (type: string, code = 'KeyE') => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, 'code', { value: code }); events.dispatchEvent(event);
  };
  try {
    const input = new Input(canvas as HTMLCanvasElement); input.enabled = true;
    dispatch('keydown'); dispatch('keyup'); assert.equal(input.consumePress('KeyE'), true);
    input.suppressUntilRelease('KeyE');
    dispatch('keydown'); assert.equal(input.consumePress('KeyE'), true, 'released parry key must work after riposte');
    input.suppressUntilRelease('KeyE');
    dispatch('keydown'); assert.equal(input.consumePress('KeyE'), false, 'held guard must remain suppressed');
    dispatch('keyup'); dispatch('keydown'); assert.equal(input.consumePress('KeyE'), true);
    input.setLocked(true); input.suppressUntilRelease('KeyE'); input.setLocked(false);
    dispatch('keydown'); assert.equal(input.consumePress('KeyE'), false, 'lock-cleared held key still requires release');
    dispatch('keyup'); dispatch('keydown'); assert.equal(input.consumePress('KeyE'), true);
    dispatch('keyup'); input.setLocked(true); dispatch('keydown', 'KeyF'); input.setLocked(false);
    dispatch('keydown', 'KeyF'); assert.equal(input.consumePress('KeyF'), false, 'input during finisher cannot queue another action');
    dispatch('keyup', 'KeyF'); dispatch('keydown', 'KeyF'); assert.equal(input.consumePress('KeyF'), true);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow); else Reflect.deleteProperty(globalThis, 'window');
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument); else Reflect.deleteProperty(globalThis, 'document');
  }
});
