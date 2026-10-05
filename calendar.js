// ========================================================================
// Salary Calendar - Full Calendar page
// ========================================================================

(function (global) {
  'use strict';

  function render(root, params) {
    Components.Layout.setPageTitle('Calendar');
    var sess = Store.getSession();
    var empId = sess.employeeId;
    var emp = Store.getEmployeeById(empId);
    if (!emp) return App.router.navigate('login');

    var y = new Date().getFullYear(), m = new Date().getMonth();
    var settings = Store.getSettings();
    var baseBreakdown = Utils.computeSalary(emp, Store.getAttendance(empId), Store.getLeaves(empId), y, m, settings);

    var month = params && params.month ? new Date(params.month) : new Date();
    var options = { month: month };

    var layout = Utils.el(
      '<div class="row">' +
        '<div class="col" style="flex:3;min-width:320px;">' +
          '<div class="card"><div id="cal-container"></div></div>' +
        '</div>' +
        '<div class="col" style="flex:2;min-width:280px;">' +
          '<div class="card"><div id="day-detail"><div class="empty-state"><span class="emoji">&#128197;</span>Click a day to view details and quick actions.</div></div></div>' +
        '</div>' +
      '</div>'
    );
    root.appendChild(layout);

    function recomputeBreakdownForMonth(curMonth) {
      var yr = curMonth.getFullYear(), mh = curMonth.getMonth();
      return Utils.computeSalary(emp, Store.getAttendance(empId), Store.getLeaves(empId), yr, mh, Store.getSettings());
    }

    function calOpts() {
      return {
        month: options.month,
        onMonthChange: function (nm) {
          options.month = nm;
          Components.Calendar.render(document.getElementById('cal-container'), calOpts());
        },
        renderBadges: Pages.Dashboard.dayBadgeRenderer(empId),
        cellClass: function (d) {
          var cls = '';
          var nm = options.month;
          if (d.getMonth() !== nm.getMonth()) return cls;
          if (d.getDate() === +emp.salaryDay) cls += ' salary-day';
          var ds = Utils.fmtDate(d);
          var hol = Store.getSettings().holidays.find(function (h) { return h.date === ds; });
          if (hol) cls += ' holiday';
          return cls;
        },
        showSalaryAmount: function (d) {
          var nm = options.month;
          if (d.getMonth() !== nm.getMonth()) return null;
          if (d.getDate() !== +emp.salaryDay) return null;
          var bd = recomputeBreakdownForMonth(nm);
          return Utils.fmtCurrency(bd.net) + ' net';
        },
        onDayClick: function (d, cellEl) {
          renderDayDetail(document.getElementById('day-detail'), d, empId, emp);
        }
      };
    }

    Components.Calendar.render(document.getElementById('cal-container'), calOpts());

    // Re-render calendar on store changes
    var onChange = function () {
      Components.Calendar.render(document.getElementById('cal-container'), calOpts());
    };
    Store.on('attendanceChanged', onChange);
    Store.on('leavesChanged', onChange);
    Store.on('settingsChanged', onChange);
    // cleanup once when navigating away (we'll overwrite simple listener on fresh render)
  }

  function renderDayDetail(container, day, empId, emp) {
    Utils.empty(container);
    var ds = Utils.fmtDate(day);
    var att = Store.getAttendanceByDate(empId, ds);
    var lv = Store.getAllLeaves().filter(function (l) { return l.employeeId === empId && l.date === ds; });
    var hol = Store.getSettings().holidays.find(function (h) { return h.date === ds; });
    var settings = Store.getSettings();
    var isToday = Utils.sameDay(day, new Date());

    var isFutureOrToday = ds >= Utils.todayStr();
    var clockedIn = !!(att && att.clockIn && !att.clockOut);

    var clockState;
    if (!att) clockState = 'Not clocked in yet';
    else if (clockedIn) clockState = '<span class="badge badge-success">Clocked in</span> since ' + Utils.fmtTime(att.clockIn);
    else clockState = '<span class="badge badge-info">Completed</span> (' + Utils.fmtHours(att.totalHours) + ')';

    var salaryBadge = day.getDate() === +emp.salaryDay
      ? '<div style="margin-top:8px;"><span class="badge badge-warning">&#128176; Salary Day</span></div>'
      : '';

    container.appendChild(Utils.el(
      '<div>' +
        '<h3 style="margin-bottom:4px;">' + day.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + (isToday ? ' <span class="badge badge-info">Today</span>' : '') + '</h3>' +
        '<div class="muted" style="margin-bottom:14px;">' + ds + '</div>' +
        (hol ? '<div style="margin-bottom:8px;"><span class="badge badge-purple">&#127881; ' + hol.name + ' (Holiday)</span></div>' : '') +
        salaryBadge +

        '<div style="margin-top:14px;padding:12px;background:var(--surface-2);border-radius:8px;">' +
          '<div style="font-weight:600;margin-bottom:4px;">Attendance</div>' +
          clockState +
          (att ? '<div class="muted" style="margin-top:6px;font-size:12px;">' +
            (att.clockIn ? 'In: ' + Utils.fmtTime(att.clockIn) + '  |  ' : '') +
            (att.clockOut ? 'Out: ' + Utils.fmtTime(att.clockOut) : '') +
          '</div>' : '') +
          '<div class="day-pop-actions" style="margin-top:10px;">' +
            (clockedIn ?
              '<button class="btn btn-danger btn-sm" data-action="clockout">Clock Out</button>' :
              '<button class="btn btn-success btn-sm" data-action="clockin" ' + (!isToday ? 'disabled title="Only today can be clocked"' : '') + '>Clock In</button>') +
            (att && !clockedIn ? '<button class="btn btn-sm" data-action="clear-att">Clear</button>' : '') +
          '</div>' +
        '</div>' +

        '<div style="margin-top:14px;padding:12px;background:var(--surface-2);border-radius:8px;">' +
          '<div style="font-weight:600;margin-bottom:8px;">Leaves (' + lv.length + ')</div>' +
          (lv.length === 0 ? '<div class="muted" style="font-size:13px;">No leaves on this day.</div>' :
            lv.map(function (l) {
              return '<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;">' +
                '<span><span class="badge ' + (l.duration === 'full' ? 'badge-danger' : 'badge-warning') + '">' + l.duration + '</span> ' +
                l.type.charAt(0).toUpperCase() + l.type.slice(1) +
                (l.note ? ' <span class="muted">&middot; ' + l.note + '</span>' : '') + '</span>' +
                '<button class="btn btn-sm btn-outline-danger" data-action="del-leave" data-id="' + l.id + '">Remove</button>' +
              '</div>';
            }).join('')
          ) +
          '<div class="day-pop-actions" style="margin-top:10px;">' +
            '<button class="btn btn-primary btn-sm" data-action="apply-leave">Apply Leave</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    ));

    container.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      if (action === 'clockin') clockIn(empId, ds);
      else if (action === 'clockout') clockOut(empId, ds);
      else if (action === 'clear-att') clearAtt(empId, ds);
      else if (action === 'del-leave') delLeave(btn.getAttribute('data-id'));
      else if (action === 'apply-leave') openApplyLeaveModal(empId, ds);
      renderDayDetail(container, day, empId, emp);
    });
  }

  function clockIn(empId, ds) {
    if (ds !== Utils.todayStr()) {
      Utils.toast('You can only clock in for today.', 'error');
      return;
    }
    var cur = Store.getAttendanceByDate(empId, ds);
    if (cur && cur.clockIn && !cur.clockOut) {
      Utils.toast('Already clocked in.');
      return;
    }
    var rec = cur || { id: null, employeeId: empId, date: ds };
    rec.clockIn = new Date().toISOString();
    rec.clockOut = null;
    rec.totalHours = 0;
    Store.upsertAttendance(rec);
    Utils.toast('Clocked in at ' + Utils.fmtTime(new Date()));
  }
  function clockOut(empId, ds) {
    var rec = Store.getAttendanceByDate(empId, ds);
    if (!rec || !rec.clockIn) { Utils.toast('No active clock-in session.', 'error'); return; }
    if (ds !== Utils.todayStr() && !rec.clockOut) {
      // allow admin-ish: still permit (useful for backfill) but warn via toast
    }
    var now = new Date().toISOString();
    rec.clockOut = now;
    rec.totalHours = Utils.computeHours(rec.clockIn, rec.clockOut);
    Store.upsertAttendance(rec);
    Utils.toast('Clocked out. ' + Utils.fmtHours(rec.totalHours) + ' logged.');
  }
  function clearAtt(empId, ds) {
    var rec = Store.getAttendanceByDate(empId, ds);
    if (!rec) return;
    Utils.confirmDialog('Delete attendance record for ' + ds + '?', function () {
      Store.deleteAttendance(rec.id);
      Utils.toast('Attendance cleared.');
    });
  }
  function delLeave(id) {
    Utils.confirmDialog('Remove this leave record?', function () {
      Store.deleteLeave(id);
      Utils.toast('Leave removed.');
    });
  }
  function openApplyLeaveModal(empId, ds) {
    var sess = Store.getSession();
    var showEmp = sess.role === 'admin';
    var emps = showEmp ? Store.getEmployees() : [];
    var modal = Utils.openModal(
      'Apply Leave',
      '<form id="lv-form">' + Components.Forms.leaveFormHtml({ date: ds }, {
        showEmployeeSelect: showEmp,
        employees: emps
      }) + '</form>',
      '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-submit>Submit</button>'
    );
    Components.Forms.bindSalaryMode ? null : null;
    // Default employee id
    var sel = modal.body.querySelector('select[name="employeeId"]');
    if (sel && sel.options.length) {
      // default selected = current emp
      Array.from(sel.options).forEach(function (o) { if (o.value === empId) o.selected = true; });
    }
    modal.footer.querySelector('[data-submit]').addEventListener('click', function () {
      var form = modal.body.querySelector('#lv-form');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      var fd = Components.Forms.readFormData(form);
      fd.employeeId = fd.employeeId || empId;
      Store.addLeave(fd);
      Utils.toast('Leave added.');
      modal.close();
    });
  }

  global.Pages = global.Pages || {};
  global.Pages.Calendar = { render: render };
})(window);
