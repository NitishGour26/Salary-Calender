// ========================================================================
// Salary Calendar - Dashboard page
// ========================================================================

(function (global) {
  'use strict';

  function render(root) {
    Components.Layout.setPageTitle('Dashboard');
    var sess = Store.getSession();
    var emp = Store.getEmployeeById(sess.employeeId);
    if (!emp) { Store.clearSession(); App.router.navigate('login'); return; }

    var empId = Utils.visibleEmployeeId(sess, sess.employeeId);
    var today = new Date();
    var attendance = Store.getAttendance(empId);
    var leaves = Store.getLeaves(empId);
    var settings = Store.getSettings();

    // Today state
    var todayStr = Utils.todayStr();
    var todayAtt = Store.getAttendanceByDate(empId, todayStr);
    var clockedIn = !!(todayAtt && todayAtt.clockIn && !todayAtt.clockOut);
    var todayDone = !!(todayAtt && todayAtt.clockIn && todayAtt.clockOut);

    // Month summaries
    var y = today.getFullYear(), m = today.getMonth();
    var monthAtt = attendance.filter(function (a) {
      var d = Utils.parseDate(a.date);
      return d && d.getFullYear() === y && d.getMonth() === m && a.clockIn && a.clockOut;
    });
    var counts = Utils.countLeavesInMonth(leaves, y, m);
    var breakdown = Utils.computeSalary(emp, attendance, leaves, y, m, settings);
    var workedHours = Utils.totalHoursInMonth(attendance, y, m);
    var nextPay = Utils.nextSalaryDate(emp);

    root.innerHTML = '';

    // Stat cards
    var statsHtml =
      '<div class="grid-4">' +
        statCard('icon-indigo', 'Attendance This Month', monthAtt.length + ' days',
          Utils.fmtHours(workedHours) + ' logged') +
        statCard('icon-rose', 'Leaves This Month', counts.daysEquiv.toFixed(1) + ' days',
          counts.full + ' full, ' + counts.half + ' half') +
        statCard('icon-green', 'Net Salary Est.', Utils.fmtCurrency(breakdown.net),
          emp.salaryMode === 'hourly' ? ('Hours: ' + breakdown.totalHours.toFixed(1)) :
          ('Base: ' + Utils.fmtCurrency(breakdown.base))) +
        statCard('icon-amber', 'Next Salary Day',
          Utils.fmtDate(nextPay),
          nextPay.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })) +
      '</div>';
    root.innerHTML = statsHtml;

    var grid = Utils.el('<div class="dash-main"></div>');
    // Left: Calendar (mini)
    var calCard = Utils.el('<div class="card"><div class="section-head"><h2>Current Month</h2>' +
      '<a class="btn btn-sm" data-go-cal>View Full Calendar &rarr;</a></div>' +
      '<div id="dash-cal"></div></div>');
    grid.appendChild(calCard);

    // Right: Quick actions + today status + recent
    var rightCol = document.createElement('div');
    rightCol.style.display = 'flex';
    rightCol.style.flexDirection = 'column';
    rightCol.style.gap = '16px';

    var statusCard = Utils.el(
      '<div class="card">' +
        '<div class="section-head"><h2>Today</h2>' +
          '<span class="badge ' + (clockedIn ? 'badge-success' : (todayDone ? 'badge-info' : 'badge-warning')) + '">' +
            (clockedIn ? 'Clocked In' : (todayDone ? 'Completed' : 'Not Started')) + '</span>' +
        '</div>' +
        '<div style="margin-bottom:12px;">' +
          '<div><span class="muted">Date:</span> ' + today.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + '</div>' +
          (todayAtt ? '<div><span class="muted">Clock In:</span> ' + Utils.fmtTime(todayAtt.clockIn) + '</div>' : '') +
          (todayAtt && todayAtt.clockOut ? '<div><span class="muted">Clock Out:</span> ' + Utils.fmtTime(todayAtt.clockOut) + '</div>' : '') +
          (todayAtt && todayAtt.totalHours ? '<div><span class="muted">Total:</span> ' + Utils.fmtHours(todayAtt.totalHours) + '</div>' : '') +
        '</div>' +
        '<div class="row" style="gap:8px;">' +
          (clockedIn ?
            '<button class="btn btn-danger" id="clock-out-btn" style="flex:1;">Clock Out</button>' :
            '<button class="btn btn-success" id="clock-in-btn" style="flex:1;">' + (todayAtt ? 'Resume Session' : 'Clock In Now') + '</button>'
          ) +
          '<button class="btn" id="leave-btn">Apply Leave</button>' +
        '</div>' +
      '</div>'
    );
    rightCol.appendChild(statusCard);

    // Salary breakdown summary
    var salCard = Utils.el(
      '<div class="card">' +
        '<div class="section-head"><h2>Salary Snapshot (' + Utils.monthName(m) + ')</h2>' +
        '<a class="btn btn-sm" data-go-sal>Details &rarr;</a></div>' +
        (emp.salaryMode === 'fixed' ?
          '<ul class="breakdown-list">' +
            '<li><span class="bd-label">Base Salary</span><span class="bd-val">' + Utils.fmtCurrency(breakdown.base) + '</span></li>' +
            '<li><span class="bd-label">Per-day Rate</span><span class="bd-val">' + Utils.fmtCurrency(breakdown.perDayRate) + '</span></li>' +
            '<li><span class="bd-label deduct">Leave Deduction</span><span class="bd-val deduct">- ' + Utils.fmtCurrency(breakdown.leaveDeduction) + '</span></li>' +
            '<li class="total-row"><span class="bd-label"><strong>Net Payable</strong></span><span class="bd-val"><strong>' + Utils.fmtCurrency(breakdown.net) + '</strong></span></li>' +
          '</ul>' :
          '<ul class="breakdown-list">' +
            '<li><span class="bd-label">Regular Hours (' + breakdown.regularHours.toFixed(1) + ')</span><span class="bd-val">' + Utils.fmtCurrency(breakdown.regularPay) + '</span></li>' +
            '<li><span class="bd-label">Overtime (' + breakdown.overtimeHours.toFixed(1) + ' x ' + settings.otMultiplier + 'x)</span><span class="bd-val">' + Utils.fmtCurrency(breakdown.overtimePay) + '</span></li>' +
            '<li class="total-row"><span class="bd-label"><strong>Net Payable</strong></span><span class="bd-val"><strong>' + Utils.fmtCurrency(breakdown.net) + '</strong></span></li>' +
          '</ul>'
        ) +
      '</div>'
    );
    rightCol.appendChild(salCard);

    // Recent leaves
    var leavesThisMonth = leaves.filter(function (l) {
      var d = Utils.parseDate(l.date);
      return d && d.getFullYear() === y && d.getMonth() === m;
    }).sort(function (a, b) { return a.date < b.date ? 1 : -1; }).slice(0, 5);

    var lvCard = Utils.el(
      '<div class="card">' +
        '<div class="section-head"><h2>Recent Leaves</h2>' +
        '<a class="btn btn-sm" data-go-leaves>Manage &rarr;</a></div>' +
        (leavesThisMonth.length === 0 ?
          '<div class="muted" style="padding:10px 0;">No leaves in this month yet.</div>' :
          leavesThisMonth.map(function (lv) {
            return '<div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:10px;">' +
              '<div><div style="font-weight:500;">' + lv.type.charAt(0).toUpperCase() + lv.type.slice(1) +
              ' <span class="badge ' + (lv.duration === 'full' ? 'badge-danger' : 'badge-warning') + '">' + lv.duration + '</span></div>' +
              '<div class="muted" style="font-size:12px;">' + lv.date + (lv.note ? ' &middot; ' + lv.note : '') + '</div></div>' +
              '<div>' + Utils.fmtDate(Utils.parseDate(lv.date)) + '</div>' +
            '</div>';
          }).join('')
        ) +
      '</div>'
    );
    rightCol.appendChild(lvCard);

    grid.appendChild(rightCol);
    root.appendChild(grid);

    // Render calendar
    var calOpts = {
      month: today,
      onMonthChange: function (nm) { calOpts.month = nm; App.router.navigate('calendar', { month: nm.toISOString() }); },
      renderBadges: dayBadgeRenderer(empId),
      cellClass: dayCellClass(emp, empId, y, m, breakdown),
      showSalaryAmount: function (d) { return null; }, // no salary amount on mini cal, keep clean
      hideLegend: true,
      compact: true
    };
    Components.Calendar.render(calCard.querySelector('#dash-cal'), calOpts);

    // Bind quick actions
    calCard.querySelector('[data-go-cal]').addEventListener('click', function () { App.router.navigate('calendar'); });
    salCard.querySelector('[data-go-sal]').addEventListener('click', function () { App.router.navigate('salary'); });
    lvCard.querySelector('[data-go-leaves]').addEventListener('click', function () { App.router.navigate('leaves'); });

    var ci = statusCard.querySelector('#clock-in-btn');
    if (ci) ci.addEventListener('click', function () { App.router.navigate('attendance', { action: 'clockin' }); });
    var co = statusCard.querySelector('#clock-out-btn');
    if (co) co.addEventListener('click', function () { App.router.navigate('attendance', { action: 'clockout' }); });
    statusCard.querySelector('#leave-btn').addEventListener('click', function () { App.router.navigate('leaves', { action: 'apply' }); });
  }

  function statCard(iconClass, label, value, sub) {
    return '<div class="stat-card">' +
      '<div class="stat-icon ' + iconClass + '">&#9679;</div>' +
      '<div class="stat-label">' + label + '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="muted" style="font-size:12px;">' + (sub || '') + '</div>' +
    '</div>';
  }

  // Shared badge renderer for Dashboard + Calendar page
  function dayBadgeRenderer(empId) {
    return function (day) {
      var ds = Utils.fmtDate(day);
      var att = Store.getAttendanceByDate(empId, ds);
      var lv = Store.getAllLeaves().filter(function (l) { return l.employeeId === empId && l.date === ds; });
      var settings = Store.getSettings();
      var hol = settings.holidays.find(function (h) { return h.date === ds; });
      var badges = [];
      if (hol) badges.push('<span class="cal-badge holiday" title="Holiday: ' + hol.name + '">' + hol.name + '</span>');
      if (att && att.clockIn && att.clockOut) badges.push('<span class="cal-badge attendance" title="Present: ' + Utils.fmtHours(att.totalHours) + '">&#10003; Present</span>');
      else if (att && att.clockIn) badges.push('<span class="cal-badge attendance" style="opacity:.7" title="Clocked in">&#9679; In progress</span>');
      lv.forEach(function (l) {
        if (l.duration === 'half') badges.push('<span class="cal-badge leave-half" title="' + l.type + ' Half Leave">Half Leave</span>');
        else badges.push('<span class="cal-badge leave-full" title="' + l.type + ' Full Leave">Full Leave</span>');
      });
      return badges.join('');
    };
  }

  function dayCellClass(emp, empId, y, m, breakdown) {
    return function (day) {
      var cls = '';
      var ds = Utils.fmtDate(day);
      var empEffective = emp || Store.getEmployeeById(empId);
      if (empEffective && day.getDate() === +empEffective.salaryDay && day.getMonth() === m) {
        cls += ' salary-day';
      }
      var settings = Store.getSettings();
      var hol = settings.holidays.find(function (h) { return h.date === ds; });
      if (hol) cls += ' holiday';
      return cls;
    };
  }

  global.Pages = global.Pages || {};
  global.Pages.Dashboard = {
    render: render,
    dayBadgeRenderer: dayBadgeRenderer,
    dayCellClass: dayCellClass
  };
})(window);
