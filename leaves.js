// ========================================================================
// Salary Calendar - Leaves page
// ========================================================================

(function (global) {
  'use strict';

  function render(root, params) {
    Components.Layout.setPageTitle('Leaves');
    var sess = Store.getSession();
    var isAdmin = sess.role === 'admin';
    var state = { empId: sess.employeeId };

    var employees = Store.getEmployees();
    root.innerHTML = '';

    // Top action card
    var toolCard = Utils.el(
      '<div class="card" style="margin-bottom:16px;">' +
        '<div class="row" style="align-items:flex-end;gap:14px;">' +
          (isAdmin ?
            '<div class="form-group" style="flex:1;min-width:220px;margin:0;">' +
              '<label>Employee</label>' +
              '<select class="form-control" id="emp-sel">' +
                employees.map(function (e) {
                  return '<option value="' + e.id + '"' + (e.id === state.empId ? ' selected' : '') + '>' +
                    e.name + ' (' + e.employeeId + ')</option>';
                }).join('') +
              '</select>' +
            '</div>' :
            '<div style="flex:1;"></div>') +
          '<div style="flex:1;min-width:220px;">' +
            (function () {
              var now = new Date();
              var y = now.getFullYear(), m = now.getMonth();
              var lv = Store.getLeaves(state.empId);
              var counts = Utils.countLeavesInMonth(lv, y, m);
              return '<div class="row" style="gap:10px;">' +
                '<div><div class="muted" style="font-size:12px;">This Month</div><div style="font-weight:700;font-size:18px;">' + counts.daysEquiv.toFixed(1) + ' days</div></div>' +
                '<div class="muted">Full: ' + counts.full + '  |  Half: ' + counts.half + '</div>' +
              '</div>';
            })() +
          '</div>' +
          '<button class="btn btn-primary" id="apply-btn">+ Apply Leave</button>' +
        '</div>' +
      '</div>'
    );
    root.appendChild(toolCard);
    if (isAdmin) {
      toolCard.querySelector('#emp-sel').addEventListener('change', function (e) {
        state.empId = e.target.value; renderList();
      });
    }
    toolCard.querySelector('#apply-btn').addEventListener('click', function () {
      openApplyModal(state.empId);
    });

    var listCard = Utils.el(
      '<div class="card"><div class="table-toolbar"><h2>Leave Records</h2><div><input class="form-control" id="month-sel" type="month" style="width:auto;"></div></div><div id="list-wrap"></div></div>'
    );
    var now = new Date();
    listCard.querySelector('#month-sel').value = now.getFullYear() + '-' + Utils.pad(now.getMonth() + 1);
    listCard.querySelector('#month-sel').addEventListener('change', renderList);
    root.appendChild(listCard);

    function renderList() {
      var wrap = listCard.querySelector('#list-wrap');
      Utils.empty(wrap);
      var [yr, m1] = (listCard.querySelector('#month-sel').value || '').split('-').map(Number);
      var year = yr || now.getFullYear();
      var m0 = m1 ? (m1 - 1) : now.getMonth();
      var leaves = Store.getAllLeaves()
        .filter(function (l) {
          if (!isAdmin) return l.employeeId === state.empId;
          if (!isAdmin) return l.employeeId === state.empId;
          // admin: filter by selected emp
          return l.employeeId === state.empId;
        })
        .filter(function (l) {
          var d = Utils.parseDate(l.date);
          return d && d.getFullYear() === year && d.getMonth() === m0;
        })
        .sort(function (a, b) { return a.date < b.date ? 1 : -1; });

      if (leaves.length === 0) {
        wrap.appendChild(Utils.el('<div class="empty-state"><span class="emoji">&#127968;</span>No leaves in this month.</div>'));
        return;
      }

      var tbl = Utils.el('<table class="data-table"><thead><tr>' +
        '<th>Date</th><th>Employee</th><th>Type</th><th>Duration</th><th>Note</th><th>Applied On</th><th></th></tr></thead><tbody></tbody></table>');
      leaves.forEach(function (l) {
        var emp = Store.getEmployeeById(l.employeeId);
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td>' + l.date + '</td>' +
          '<td>' + (emp ? (Components.Layout.avatarEl(emp) + ' ' + emp.name) : '-') + '</td>' +
          '<td>' + l.type.charAt(0).toUpperCase() + l.type.slice(1) + '</td>' +
          '<td><span class="badge ' + (l.duration === 'full' ? 'badge-danger' : 'badge-warning') + '">' + l.duration + ' day</span></td>' +
          '<td>' + (l.note || '-') + '</td>' +
          '<td>' + Utils.fmtDate(Utils.parseDate(l.createdAt)) + '</td>' +
          '<td style="text-align:right;"><button class="btn btn-sm btn-outline-danger" data-del="' + l.id + '">Delete</button></td>';
        // Avatar spans HTML injected, convert to string workaround - render avatar later
        var firstTd = tr.children[1];
        if (emp) {
          Utils.empty(firstTd);
          firstTd.style.display = 'flex';
          firstTd.style.alignItems = 'center';
          firstTd.style.gap = '8px';
          firstTd.innerHTML = Components.Layout.avatarEl(emp) + ' <span>' + emp.name + '</span>';
        }
        tr.querySelector('[data-del]').addEventListener('click', function () {
          Utils.confirmDialog('Delete this leave record?', function () { Store.deleteLeave(l.id); Utils.toast('Deleted.'); renderList(); });
        });
        tbl.querySelector('tbody').appendChild(tr);
      });
      wrap.appendChild(tbl);
    }

    function openApplyModal(empId) {
      var showEmp = isAdmin;
      var modal = Utils.openModal(
        'Apply for Leave',
        '<form id="lv-form">' + Components.Forms.leaveFormHtml({}, {
          showEmployeeSelect: showEmp,
          employees: employees
        }) + '</form>',
        '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-submit>Apply</button>'
      );
      var sel = modal.body.querySelector('select[name="employeeId"]');
      if (sel) {
        Array.from(sel.options).forEach(function (o) { if (o.value === empId) o.selected = true; });
      }
      modal.footer.querySelector('[data-submit]').addEventListener('click', function () {
        var form = modal.body.querySelector('#lv-form');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var fd = Components.Forms.readFormData(form);
        fd.employeeId = fd.employeeId || empId;
        if (!isAdmin && fd.employeeId !== sess.employeeId) { Utils.toast('Not authorized', 'error'); return; }
        Store.addLeave(fd);
        Utils.toast('Leave applied.');
        modal.close();
        renderList();
      });
    }

    renderList();

    if (params && params.action === 'apply') setTimeout(function () { openApplyModal(state.empId); }, 80);
  }

  global.Pages = global.Pages || {};
  global.Pages.Leaves = { render: render };
})(window);
