// ========================================================================
// Salary Calendar - Salary page (calculator + breakdown + history)
// ========================================================================

(function (global) {
  'use strict';

  function render(root) {
    Components.Layout.setPageTitle('Salary');
    var sess = Store.getSession();
    var isAdmin = sess.role === 'admin';
    var now = new Date();
    var state = {
      empId: sess.employeeId,
      year: now.getFullYear(),
      month0: now.getMonth()
    };

    root.innerHTML = '';

    var toolbar = Utils.el(
      '<div class="card" style="margin-bottom:16px;">' +
        '<div class="row" style="align-items:flex-end;gap:14px;">' +
          (isAdmin ?
            '<div class="form-group" style="flex:1;min-width:240px;margin:0;">' +
              '<label>Employee</label>' +
              '<select class="form-control" id="emp-sel">' +
                Store.getEmployees().map(function (e) {
                  return '<option value="' + e.id + '"' + (e.id === state.empId ? ' selected' : '') + '>' +
                    e.name + ' (' + e.employeeId + ' &middot; ' + e.salaryMode + ')</option>';
                }).join('') +
              '</select>' +
            '</div>' : '') +
          '<div class="form-group" style="flex:1;min-width:200px;margin:0;">' +
            '<label>Month</label>' +
            '<input type="month" class="form-control" id="month-sel" value="' + now.getFullYear() + '-' + Utils.pad(now.getMonth() + 1) + '">' +
          '</div>' +
          '<div style="flex:1;min-width:200px;">' +
            '<div style="font-weight:600;">Mode</div>' +
            '<span class="muted" id="emp-mode">-</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    root.appendChild(toolbar);

    toolbar.querySelector('#emp-sel') && toolbar.querySelector('#emp-sel').addEventListener('change', function (e) {
      state.empId = e.target.value; renderResult();
    });
    toolbar.querySelector('#month-sel').addEventListener('change', function (e) {
      var [y, m1] = e.target.value.split('-').map(Number);
      state.year = y; state.month0 = m1 - 1; renderResult();
    });

    var wrap = Utils.el('<div id="salary-wrap"></div>');
    root.appendChild(wrap);

    function renderResult() {
      Utils.empty(wrap);
      var emp = Store.getEmployeeById(state.empId);
      if (!emp) return;
      var modeEl = toolbar.querySelector('#emp-mode');
      modeEl.textContent = emp.salaryMode === 'hourly'
        ? ('Hourly @ ' + Utils.fmtCurrency(emp.hourlyRate) + '/hr, ' + Utils.workDayHours(emp).toFixed(1) + 'h/day')
        : ('Fixed monthly ' + Utils.fmtCurrency(emp.fixedSalary) + ', salary day ' + emp.salaryDay);

      var settings = Store.getSettings();
      var attendance = Store.getAttendance(emp.id);
      var leaves = Store.getLeaves(emp.id);
      var breakdown = Utils.computeSalary(emp, attendance, leaves, state.year, state.month0, settings);
      var nextPay = Utils.nextSalaryDate(emp);

      var grid = Utils.el('<div class="salary-grid" style="margin-bottom:16px;"></div>');
      var netCard = Utils.el(
        '<div class="salary-net-card">' +
          '<div class="label">Net Salary Payable &mdash; ' + Utils.monthName(state.month0) + ' ' + state.year + '</div>' +
          '<div class="amount">' + Utils.fmtCurrency(breakdown.net) + '</div>' +
          '<div class="muted" style="opacity:.9;">Pay day: ' + state.year + '-' + Utils.pad(state.month0 + 1) + '-' + Utils.pad(Math.min(28, emp.salaryDay)) +
            ' (next: ' + Utils.fmtDate(nextPay) + ')</div>' +
        '</div>'
      );
      var breakdownCard = Utils.el('<div class="card"></div>');
      breakdownCard.innerHTML =
        '<h3 style="margin-bottom:10px;">Breakdown</h3>' +
        (emp.salaryMode === 'fixed' ?
          '<ul class="breakdown-list">' +
            line('Base Salary', Utils.fmtCurrency(breakdown.base)) +
            line('Per-day rate (' + breakdown.workingDays + ' working days)', Utils.fmtCurrency(breakdown.perDayRate), true) +
            line('Full leaves (' + breakdown.fullLeaves + ')', '- ' + Utils.fmtCurrency(breakdown.perDayRate * breakdown.fullLeaves), false, true) +
            line('Half leaves (' + breakdown.halfLeaves + ')', '- ' + Utils.fmtCurrency(breakdown.perDayRate * 0.5 * breakdown.halfLeaves), false, true) +
            line('Total Leave Deduction', '- ' + Utils.fmtCurrency(breakdown.leaveDeduction), false, true) +
            lineTotal('Net Payable', Utils.fmtCurrency(breakdown.net)) +
          '</ul>' :
          '<ul class="breakdown-list">' +
            line('Hourly rate', Utils.fmtCurrency(emp.hourlyRate) + ' / hour', true) +
            line('Working days cap', breakdown.workingDays + ' days x ' + Utils.workDayHours(emp).toFixed(1) + 'h = ' + (breakdown.workingDays * Utils.workDayHours(emp)).toFixed(1) + 'h regular cap', true) +
            line('Regular hours (' + breakdown.regularHours.toFixed(1) + ')', Utils.fmtCurrency(breakdown.regularPay)) +
            line('Overtime hours (' + breakdown.overtimeHours.toFixed(1) + ' x ' + settings.otMultiplier + 'x)', Utils.fmtCurrency(breakdown.overtimePay)) +
            line('Total hours worked', breakdown.totalHours.toFixed(1) + ' hours', true) +
            lineTotal('Net Payable', Utils.fmtCurrency(breakdown.net)) +
          '</ul>'
        );
      grid.appendChild(netCard);
      grid.appendChild(breakdownCard);
      wrap.appendChild(grid);

      // Mini calendar + history
      var layout = Utils.el(
        '<div class="row">' +
          '<div class="col" style="flex:2;min-width:320px;"><div class="card"><h3 style="margin-bottom:10px;">Month Calendar</h3><div id="sal-mini-cal"></div></div></div>' +
          '<div class="col" style="flex:1;min-width:280px;"><div class="card"><h3 style="margin-bottom:10px;">Recent Payslips</h3><div id="sal-history"></div></div></div>' +
        '</div>'
      );
      wrap.appendChild(layout);

      // Mini calendar for salary month
      var miniCal = layout.querySelector('#sal-mini-cal');
      Components.Calendar.render(miniCal, {
        month: new Date(state.year, state.month0, 1),
        onMonthChange: function (nm) {
          state.year = nm.getFullYear();
          state.month0 = nm.getMonth();
          var ms = toolbar.querySelector('#month-sel');
          ms.value = state.year + '-' + Utils.pad(state.month0 + 1);
          renderResult();
        },
        renderBadges: Pages.Dashboard.dayBadgeRenderer(emp.id),
        cellClass: function (d) {
          var cls = '';
          if (d.getMonth() !== state.month0) return cls;
          if (d.getDate() === +emp.salaryDay) cls += ' salary-day';
          var ds = Utils.fmtDate(d);
          var hol = settings.holidays.find(function (h) { return h.date === ds; });
          if (hol) cls += ' holiday';
          return cls;
        },
        showSalaryAmount: function (d) {
          if (d.getMonth() !== state.month0) return null;
          if (d.getDate() !== +emp.salaryDay) return null;
          return Utils.fmtCurrency(breakdown.net);
        },
        compact: true
      });

      // History (computed) — for months that actually have any attendance or leaves, show quick breakdown
      var historyBox = layout.querySelector('#sal-history');
      var rows = [];
      var baseY = state.year;
      for (var i = 0; i < 6; i++) {
        var d0 = new Date(baseY, state.month0 - i, 1);
        var y = d0.getFullYear(), m = d0.getMonth();
        var attY = Store.getAttendance(emp.id);
        var lvY = Store.getLeaves(emp.id);
        var any = attY.some(function (a) { var dt = Utils.parseDate(a.date); return dt && dt.getFullYear() === y && dt.getMonth() === m; })
          || lvY.some(function (l) { var dt = Utils.parseDate(l.date); return dt && dt.getFullYear() === y && dt.getMonth() === m; });
        var br = Utils.computeSalary(emp, attY, lvY, y, m, settings);
        if (!any && br.net === 0 && i > 0) continue;
        rows.push({ y: y, m: m, br: br });
      }
      if (rows.length === 0) {
        historyBox.innerHTML = '<div class="muted" style="font-size:13px;">No history yet.</div>';
      } else {
        historyBox.innerHTML = rows.map(function (r, i) {
          return '<div style="padding:10px 0;border-bottom:' + (i === rows.length - 1 ? 'none' : '1px solid var(--border)') + ';display:flex;justify-content:space-between;">' +
            '<div><div style="font-weight:600;">' + Utils.monthName(r.m) + ' ' + r.y + '</div>' +
            '<div class="muted" style="font-size:12px;">' +
              (emp.salaryMode === 'fixed' ? ('Leaves: ' + (r.br.fullLeaves + 0.5 * r.br.halfLeaves).toFixed(1) + 'd') :
               ('Hours: ' + r.br.totalHours.toFixed(1) + 'h')) +
            '</div></div>' +
            '<div style="font-weight:700;">' + Utils.fmtCurrency(r.br.net) + '</div>' +
          '</div>';
        }).join('');
      }
    }

    function line(label, val, muted, deduct) {
      return '<li><span class="bd-label' + (muted ? ' muted' : '') + '">' + label + '</span><span class="bd-val' + (deduct ? ' deduct' : '') + '">' + val + '</span></li>';
    }
    function lineTotal(label, val) {
      return '<li class="total-row"><span class="bd-label"><strong>' + label + '</strong></span><span class="bd-val"><strong>' + val + '</strong></span></li>';
    }

    renderResult();
  }

  global.Pages = global.Pages || {};
  global.Pages.Salary = { render: render };
})(window);
