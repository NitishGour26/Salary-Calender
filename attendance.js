// ========================================================================
// Salary Calendar - Attendance page
// ========================================================================

(function (global) {
  'use strict';

  function render(root, params) {
    Components.Layout.setPageTitle('Attendance');
    var sess = Store.getSession();
    var isAdmin = sess.role === 'admin';
    var selectedEmpId = sess.employeeId;
    var state = { empId: selectedEmpId };

    root.innerHTML = '';

    // Quick clock-in bar
    var emp = Store.getEmployeeById(state.empId);
    var todayStr = Utils.todayStr();
    var todayAtt = Store.getAttendanceByDate(state.empId, todayStr);
    var clockedIn = !!(todayAtt && todayAtt.clockIn && !todayAtt.clockOut);

    var header = Utils.el(
      '<div class="card" style="margin-bottom:16px;">' +
        '<div class="row" style="align-items:center;">' +
          (isAdmin ?
            '<div class="form-group" style="flex:1;min-width:220px;margin:0;">' +
              '<label>View Employee</label>' +
              '<select class="form-control" id="emp-sel">' +
                Store.getEmployees().map(function (e) {
                  return '<option value="' + e.id + '"' + (e.id === state.empId ? ' selected' : '') + '>' + e.name + ' (' + e.employeeId + ')</option>';
                }).join('') +
              '</select></div>' : '') +
          '<div style="flex:2;min-width:260px;">' +
            '<div style="font-weight:600;">Today: ' + new Date().toLocaleDateString() + '</div>' +
            '<div class="muted" style="font-size:13px;">' +
              (clockedIn ? 'Clocked in since ' + Utils.fmtTime(todayAtt.clockIn) :
               (todayAtt && todayAtt.clockIn && todayAtt.clockOut ? 'Session complete: ' + Utils.fmtHours(todayAtt.totalHours) : 'Not clocked in')) +
            '</div>' +
          '</div>' +
          '<div style="display:flex;gap:8px;">' +
            (clockedIn ?
              '<button class="btn btn-danger" id="co-btn">Clock Out</button>' :
              '<button class="btn btn-success" id="ci-btn">Clock In</button>') +
          '</div>' +
        '</div>' +
      '</div>'
    );
    root.appendChild(header);

    header.querySelector('#ci-btn') && header.querySelector('#ci-btn').addEventListener('click', doClockIn.bind(null, state));
    header.querySelector('#co-btn') && header.querySelector('#co-btn').addEventListener('click', doClockOut.bind(null, state));
    if (isAdmin) {
      header.querySelector('#emp-sel').addEventListener('change', function (e) {
        state.empId = e.target.value;
        renderTable();
      });
    }

    // Month filter + table card
    var card = Utils.el(
      '<div class="card">' +
        '<div class="table-toolbar">' +
          '<h2>Attendance Logs</h2>' +
          '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
            '<input class="form-control" id="month-sel" type="month" style="width:auto;">' +
            '<button class="btn" id="export-btn">Export CSV</button>' +
          '</div>' +
        '</div>' +
        '<div id="att-wrap"></div>' +
      '</div>'
    );
    var now = new Date();
    card.querySelector('#month-sel').value = now.getFullYear() + '-' + Utils.pad(now.getMonth() + 1);
    card.querySelector('#month-sel').addEventListener('change', renderTable);
    card.querySelector('#export-btn').addEventListener('click', exportCsv);
    root.appendChild(card);

    // Handle auto-action from params (Dashboard -> Attendance with action)
    if (params && params.action === 'clockin') doClockIn(state);
    else if (params && params.action === 'clockout') doClockOut(state);

    renderTable();

    function renderTable() {
      var wrap = card.querySelector('#att-wrap');
      Utils.empty(wrap);
      var [year, month1] = (card.querySelector('#month-sel').value || '').split('-').map(Number);
      var yearN = year || now.getFullYear();
      var mN = month1 ? (month1 - 1) : now.getMonth();

      var list = Store.getAttendance(state.empId)
        .filter(function (a) {
          var d = Utils.parseDate(a.date);
          return d && d.getFullYear() === yearN && d.getMonth() === mN;
        })
        .sort(function (a, b) { return a.date < b.date ? 1 : -1; });

      var totalHours = list.reduce(function (s, a) { return s + (+a.totalHours || 0); }, 0);
      var daysPresent = list.filter(function (a) { return a.clockIn && a.clockOut; }).length;

      var summary = Utils.el(
        '<div class="row" style="margin-bottom:14px;">' +
          '<div class="stat-card" style="flex:1;min-width:200px;"><div class="stat-label">Days Present</div><div class="stat-value">' + daysPresent + '</div></div>' +
          '<div class="stat-card" style="flex:1;min-width:200px;"><div class="stat-label">Total Hours</div><div class="stat-value">' + Utils.fmtHours(totalHours) + '</div></div>' +
          '<div class="stat-card" style="flex:1;min-width:200px;"><div class="stat-label">Avg / Day</div><div class="stat-value">' +
            (daysPresent ? Utils.fmtHours(totalHours / daysPresent) : '0h 00m') + '</div></div>' +
        '</div>'
      );
      wrap.appendChild(summary);

      if (list.length === 0) {
        wrap.appendChild(Utils.el('<div class="empty-state"><span class="emoji">&#9200;</span>No attendance records in this month.</div>'));
        return;
      }

      var tbl = Utils.el(
        '<table class="data-table">' +
          '<thead><tr>' +
            '<th>Date</th><th>Day</th><th>Clock In</th><th>Clock Out</th><th>Hours</th><th>Status</th><th></th>' +
          '</tr></thead><tbody></tbody></table>'
      );
      var tbody = tbl.querySelector('tbody');
      list.forEach(function (a) {
        var d = Utils.parseDate(a.date);
        var dayName = d ? d.toLocaleDateString(undefined, { weekday: 'short' }) : '';
        var status =
          (a.clockIn && !a.clockOut) ? '<span class="badge badge-success">In progress</span>' :
          (a.clockIn && a.clockOut ? '<span class="badge badge-info">Complete</span>' : '<span class="badge badge-warning">Invalid</span>');
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + a.date + '</td>' +
          '<td>' + dayName + '</td>' +
          '<td>' + (a.clockIn ? Utils.fmtTime(a.clockIn) : '--') + '</td>' +
          '<td>' + (a.clockOut ? Utils.fmtTime(a.clockOut) : '--') + '</td>' +
          '<td>' + (a.totalHours ? Utils.fmtHours(a.totalHours) : '0h 00m') + '</td>' +
          '<td>' + status + '</td>' +
          '<td style="text-align:right;"><button class="btn btn-sm btn-outline-danger" data-del="' + a.id + '">Delete</button></td>';
        tr.querySelector('[data-del]').addEventListener('click', function () {
          Utils.confirmDialog('Delete this attendance record?', function () {
            Store.deleteAttendance(a.id); Utils.toast('Deleted'); renderTable();
          });
        });
        tbody.appendChild(tr);
      });
      wrap.appendChild(tbl);
    }

    function exportCsv() {
      var [year, month1] = (card.querySelector('#month-sel').value || '').split('-').map(Number);
      var yearN = year || now.getFullYear();
      var mN = month1 ? (month1 - 1) : now.getMonth();
      var list = Store.getAttendance(state.empId)
        .filter(function (a) {
          var d = Utils.parseDate(a.date);
          return d && d.getFullYear() === yearN && d.getMonth() === mN;
        });
      var lines = ['Date,Day,Clock In,Clock Out,Hours'];
      list.forEach(function (a) {
        var d = Utils.parseDate(a.date);
        lines.push([a.date, d ? d.toLocaleDateString(undefined, { weekday: 'short' }) : '',
          a.clockIn ? Utils.fmtTime(a.clockIn) : '', a.clockOut ? Utils.fmtTime(a.clockOut) : '',
          (a.totalHours || 0).toFixed(2)
        ].map(function (s) { return '"' + String(s).replace(/"/g, '""') + '"'; }).join(','));
      });
      var csv = lines.join('\n');
      var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var empName = (Store.getEmployeeById(state.empId) || {}).name || 'employee';
      a.href = url; a.download = 'attendance-' + empName + '-' + yearN + '-' + Utils.pad(mN + 1) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      Utils.toast('Exported CSV');
    }
  }

  function doClockIn(state) {
    var ds = Utils.todayStr();
    var cur = Store.getAttendanceByDate(state.empId, ds);
    if (cur && cur.clockIn && !cur.clockOut) {
      Utils.toast('Already clocked in.'); App.router.navigate('attendance'); return;
    }
    var rec = cur || { id: null, employeeId: state.empId, date: ds };
    rec.clockIn = new Date().toISOString();
    rec.clockOut = null;
    rec.totalHours = 0;
    Store.upsertAttendance(rec);
    Utils.toast('Clocked in at ' + Utils.fmtTime(new Date()));
    setTimeout(function () { App.router.navigate('attendance'); }, 50);
  }
  function doClockOut(state) {
    var ds = Utils.todayStr();
    var rec = Store.getAttendanceByDate(state.empId, ds);
    if (!rec || !rec.clockIn) { Utils.toast('No active session. Clock in first.', 'error'); return; }
    rec.clockOut = new Date().toISOString();
    rec.totalHours = Utils.computeHours(rec.clockIn, rec.clockOut);
    Store.upsertAttendance(rec);
    Utils.toast('Clocked out. ' + Utils.fmtHours(rec.totalHours) + ' logged.');
    setTimeout(function () { App.router.navigate('attendance'); }, 50);
  }

  global.Pages = global.Pages || {};
  global.Pages.Attendance = { render: render };
})(window);
