/**
 * Results table component — renders a dynamic data table.
 */

export class ResultsTable {
  /**
   * @param {Array<{key: string, label: string, render?: Function}>} columns
   */
  constructor(columns) {
    this.columns = columns;
    this.rows = [];
    this.el = this._build();
  }

  _build() {
    const wrapper = document.createElement('div');
    wrapper.style.overflowX = 'auto';

    const table = document.createElement('table');
    table.className = 'data-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    this.columns.forEach(col => {
      const th = document.createElement('th');
      th.textContent = col.label;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    this.tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(this.tbody);
    wrapper.appendChild(table);
    return wrapper;
  }

  /**
   * Set all rows at once.
   * @param {Array<Object>} rows
   */
  setRows(rows) {
    this.rows = rows;
    this.tbody.innerHTML = '';
    rows.forEach(row => this._appendRow(row));
  }

  /**
   * Append a single row.
   * @param {Object} row
   */
  addRow(row) {
    this.rows.push(row);
    this._appendRow(row);
  }

  _appendRow(row) {
    const tr = document.createElement('tr');
    this.columns.forEach(col => {
      const td = document.createElement('td');
      if (col.render) {
        const content = col.render(row[col.key], row);
        if (typeof content === 'string') {
          td.innerHTML = content;
        } else if (content instanceof Node) {
          td.appendChild(content);
        }
      } else {
        td.textContent = row[col.key] ?? '—';
      }
      tr.appendChild(td);
    });
    this.tbody.appendChild(tr);
  }

  clear() {
    this.rows = [];
    this.tbody.innerHTML = '';
  }
}
