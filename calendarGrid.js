// ========================================================================
// Salary Calendar - Calendar grid reusable component (pure DOM)
// ========================================================================

(function (global) {
  'use strict';

  /**
   * Renders month calendar grid into `container`.
   * Options:
   *  - month: Date
   *  - weekStartsOn: 0 (Sun) | 1 (Mon)
   *  - onDayClick(dayDate, cellEl)
   *  - onMonthChange(newMonthDate)
   *  - renderBadges(dayDate) -> string of HTML badges
   *  - cellClass(dayDate) -> string extra class
   *  - showSalaryAmount(dayDate) -> string (optional amount overlay)
   *  - compact: bool (smaller cells)
   */
  function renderCalendar(container, options) {
    options = options || {};
    Utils.empty(container);
    var settings = Store.getSettings();
    var weekStartsOn = options.weekStartsOn != null ? options.weekStartsOn : settings.weekStartsOn;
    var currentMonth = options.month || new Date();
    var today = new Date();

    var header = Utils.el(
      '<div class="cal-header">' +
        '<div class="cal-title">' + Utils.monthYear(currentMonth) + '</div>' +
        '<div class="cal-nav">' +
          '<button class="btn btn-sm" data-nav="prev" title="Previous">&larr;</button>' +
          '<button class="btn btn-sm" data-nav="today">Today</button>' +
          '<button class="btn btn-sm" data-nav="next" title="Next">&rarr;</button>' +
        '</div>' +
      '</div>'
    );
    var gridWrap = Utils.el('<div class="cal-grid"></div>');
    var legend = Utils.el(
      '<div class="cal-legend">' +
        '<span><span class="legend-dot" style="background:var(--attendance)"></span>Attended</span>' +
        '<span><span class="legend-dot" style="background:var(--leave)"></span>Full Leave</span>' +
        '<span><span class="legend-dot" style="background:var(--leave-half)"></span>Half Leave</span>' +
        '<span><span class="legend-dot" style="background:var(--salary)"></span>Salary Day</span>' +
        '<span><span class="legend-dot" style="background:var(--holiday)"></span>Holiday</span>' +
      '</div>'
    );

    // Weekday headers
    var labels = Utils.weekdayLabels(weekStartsOn);
    labels.forEach(function (l) {
      gridWrap.appendChild(Utils.el('<div class="cal-weekday">' + l + '</div>'));
    });

    var weeks = Utils.buildMonthGrid(currentMonth, weekStartsOn);
    var popEl = null;
    weeks.forEach(function (week) {
      week.forEach(function (day) {
        var isOther = day.getMonth() !== currentMonth.getMonth();
        var cls = 'cal-cell' + (isOther ? ' other-month' : '');
        if (Utils.sameDay(day, today)) cls += ' today';
        if (typeof options.cellClass === 'function') {
          var extra = options.cellClass(day) || '';
          if (extra) cls += ' ' + extra;
        }
        var cell = Utils.el('<div class="' + cls + '" data-date="' + Utils.fmtDate(day) + '"></div>');
        var badges = typeof options.renderBadges === 'function' ? (options.renderBadges(day) || '') : '';
        var salaryAmount = '';
        if (typeof options.showSalaryAmount === 'function') {
          var a = options.showSalaryAmount(day);
          if (a) salaryAmount = '<div class="day-salary-amt">' + a + '</div>';
        }
        cell.innerHTML =
          '<div class="day-num">' + day.getDate() + '</div>' +
          (isOther ? '' : '<div class="cal-badges">' + badges + '</div>' + salaryAmount);

        cell.addEventListener('click', function () {
          if (isOther && !options.allowOtherMonth) return;
          if (typeof options.onDayClick === 'function') {
            options.onDayClick(day, cell);
          }
        });
        gridWrap.appendChild(cell);
      });
    });

    container.appendChild(header);
    container.appendChild(gridWrap);
    if (!options.hideLegend) container.appendChild(legend);

    header.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-nav]');
      if (!btn) return;
      var act = btn.getAttribute('data-nav');
      var next;
      if (act === 'prev') next = Utils.addMonths(currentMonth, -1);
      else if (act === 'next') next = Utils.addMonths(currentMonth, 1);
      else next = new Date();
      options.currentMonth = next;
      if (typeof options.onMonthChange === 'function') options.onMonthChange(next);
    });
  }

  global.Components = global.Components || {};
  global.Components.Calendar = { render: renderCalendar };
})(window);
