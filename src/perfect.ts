/** Cinematic duration uses real time; the follow-up window uses game time. */
export class PerfectDefense {
  slowLeft = 0;
  windowLeft = 0;
  source: string | null = null;
  kind: 'parry' | 'dodge' | null = null;
  count = 0;
  private cancelled = false;
  get slow() { return this.slowLeft > 0; }
  get ready() { return !this.slow && this.windowLeft > 0 && this.source !== null; }
  get timeScale() { return this.slow ? 0.35 : 1; }
  trigger(source: string, kind: 'parry' | 'dodge'): boolean {
    if (this.slow) return false;
    this.source = source; this.kind = kind; this.slowLeft = 0.5; this.windowLeft = 0; this.cancelled = false; this.count++;
    return true;
  }
  advanceReal(dt: number) {
    if (!this.slow) return;
    this.slowLeft = Math.max(0, this.slowLeft - dt);
    if (!this.slow) {
      this.windowLeft = this.cancelled ? 0 : 0.95;
      if (this.cancelled) { this.source = null; this.kind = null; }
    }
  }
  advanceGame(dt: number) {
    if (this.slow) return;
    this.windowLeft = Math.max(0, this.windowLeft - dt);
    if (!this.windowLeft) { this.source = null; this.kind = null; }
  }
  consume(): string | null {
    if (!this.ready) return null;
    const source = this.source; this.clearWindow(); return source;
  }
  clearWindow() { this.windowLeft = 0; this.cancelled = true; if (!this.slow) { this.source = null; this.kind = null; } }
  reset() { this.slowLeft = 0; this.windowLeft = 0; this.source = null; this.kind = null; this.count = 0; this.cancelled = false; }
}
