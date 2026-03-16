/**
 * Progress bar component.
 */

export class ProgressBar {
  constructor() {
    this.el = this._build();
    this._fill = this.el.querySelector('.progress-fill');
    this._label = this.el.querySelector('.progress-label');
  }

  _build() {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span class="progress-label" style="font-size:0.75rem;color:var(--text-secondary);font-family:var(--font-mono);"></span>
        <span class="progress-pct" style="font-size:0.75rem;color:var(--text-accent);font-family:var(--font-mono);">0%</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill shimmer" style="width:0%"></div>
      </div>
    `;
    this._pct = wrapper.querySelector('.progress-pct');
    return wrapper;
  }

  /**
   * @param {number} pct - 0 to 100
   * @param {string} [label]
   */
  set(pct, label) {
    const clamped = Math.max(0, Math.min(100, pct));
    this._fill.style.width = `${clamped}%`;
    this._pct.textContent = `${clamped}%`;
    if (label !== undefined) this._label.textContent = label;
    if (clamped >= 100) {
      this._fill.classList.remove('shimmer');
    } else {
      this._fill.classList.add('shimmer');
    }
  }

  reset() {
    this.set(0, '');
  }
}
