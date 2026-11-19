const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyJ', 'KeyK', 'KeyE', 'KeyF', 'Space']);

export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private suppressed = new Set<string>();
  private locked = false;
  enabled = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener('keydown', event => {
      if (!this.enabled || document.activeElement !== canvas || !GAME_KEYS.has(event.code)) return;
      event.preventDefault();
      if (this.locked) { this.suppressed.add(event.code); return; }
      if (this.suppressed.has(event.code)) return;
      if (!event.repeat && !this.held.has(event.code)) this.pressed.add(event.code);
      this.held.add(event.code);
    });
    window.addEventListener('keyup', event => { this.held.delete(event.code); this.suppressed.delete(event.code); });
    canvas.addEventListener('blur', () => this.clear());
    window.addEventListener('blur', () => this.clear());
  }

  down(code: string) { return this.held.has(code); }
  consumePress(code: string) { const value = this.pressed.has(code); this.pressed.delete(code); return value; }
  endStep() { this.pressed.clear(); }
  suppressUntilRelease(code: string) {
    // A released key must not swallow its next fresh press. Already suppressed
    // keys may still be physically held after an input lock, so retain those.
    if (this.held.has(code)) this.suppressed.add(code);
    this.held.delete(code); this.pressed.delete(code);
  }
  setLocked(value: boolean) {
    if (value && !this.locked) this.clear();
    this.locked = value;
  }
  clear() { for (const code of this.held) this.suppressed.add(code); this.held.clear(); this.pressed.clear(); }
}
