/**
 * Terminal output component — renders streaming lines with auto-scroll.
 */

export class TerminalOutput {
  constructor(options = {}) {
    this.maxLines = options.maxLines || 500;
    this.lines = [];
    this.el = this._build();
  }

  _build() {
    const el = document.createElement('div');
    el.className = 'terminal';
    el.setAttribute('aria-live', 'polite');
    return el;
  }

  /**
   * Append a line.
   * @param {string} text
   * @param {'default'|'error'|'success'|'warning'|'muted'} type
   */
  append(text, type = 'default') {
    const line = document.createElement('div');
    line.className = `terminal-line${type !== 'default' ? ` ${type}` : ''}`;
    line.textContent = text;
    this.el.appendChild(line);
    this.lines.push(line);

    if (this.lines.length > this.maxLines) {
      const removed = this.lines.splice(0, this.lines.length - this.maxLines);
      removed.forEach(l => l.remove());
    }

    this.el.scrollTop = this.el.scrollHeight;
  }

  clear() {
    this.el.innerHTML = '';
    this.lines = [];
  }

  getText() {
    return this.lines.map(l => l.textContent).join('\n');
  }
}
