// ========================================================================
// Salary Calendar - Employees page (Admin CRUD)
// ========================================================================

(function (global) {
  'use strict';

  function render(root) {
    Components.Layout.setPageTitle('Employees');
    var sess = Store.getSession();
    if (sess.role !== 'admin') {
      App.router.navigate('dashboard');
      return;
    }

    root.innerHTML = '';
    var card = Utils.el(
      '<div class="card">' +
        '<div class="table-toolbar">' +
          '<h2>All Employees</h2>' +
          '<button class="btn btn-primary" id="add-btn">+ Add Employee</button>' +
        '</div>' +
        '<div id="emp-list"></div>' +
      '</div>'
    );
    root.appendChild(card);
    card.querySelector('#add-btn').addEventListener('click', function () { openEmployeeEditor(null); });

    renderList();

    function renderList() {
      var wrap = card.querySelector('#emp-list');
      Utils.empty(wrap);
      var employees = Store.getEmployees();
      if (employees.length === 0) {
        wrap.appendChild(Utils.el('<div class="empty-state"><span class="emoji">&#128101;</span>No employees yet. Add your first one.</div>'));
        return;
      }
      var tbl = Utils.el(
        '<table class="data-table"><thead><tr>' +
          '<th>Employee</th><th>ID</th><th>Role</th><th>Salary Mode</th><th>Compensation</th><th>Joined</th><th></th></tr></thead><tbody></tbody></table>'
      );
      employees.forEach(function (e) {
        var comp = e.salaryMode === 'hourly'
          ? (Utils.fmtCurrency(e.hourlyRate) + '/hr')
          : (Utils.fmtCurrency(e.fixedSalary) + '/mo');
        var tr = document.createElement('tr');
        tr.innerHTML =
          '<td><div class="employee-row"><span id="ava-' + e.id + '"></span> <div><div style="font-weight:600;">' + e.name + '</div>' +
          '<div class="muted" style="font-size:12px;">' + (e.designation || '-') + (e.department ? ' &middot; ' + e.department : '') + '</div></div></div></td>' +
          '<td>' + e.employeeId + '</td>' +
          '<td><span class="badge ' + (e.role === 'admin' ? 'badge-warning' : 'badge-success') + '" style="text-transform:capitalize;">' + e.role + '</span></td>' +
          '<td><span class="badge badge-info" style="text-transform:capitalize;">' + e.salaryMode + '</span></td>' +
          '<td style="font-weight:600;">' + comp + '<div class="muted" style="font-size:12px;">Pay day ' + e.salaryDay + '</div></td>' +
          '<td>' + Utils.fmtDate(Utils.parseDate(e.joiningDate)) + '</td>' +
          '<td style="text-align:right;white-space:nowrap;">' +
            '<button class="btn btn-sm" data-edit="' + e.id + '">Edit</button> ' +
            '<button class="btn btn-sm btn-outline-danger" data-del="' + e.id + '">Delete</button>' +
          '</td>';
        tbl.querySelector('tbody').appendChild(tr);
        var avaSlot = tr.querySelector('#ava-' + e.id);
        if (avaSlot) {
          var tmp = document.createElement('div');
          tmp.innerHTML = Components.Layout.avatarEl(e);
          while (tmp.firstChild) avaSlot.appendChild(tmp.firstChild);
        }
        tr.querySelector('[data-edit]').addEventListener('click', function () { openEmployeeEditor(e); });
        tr.querySelector('[data-del]').addEventListener('click', function () {
          if (e.id === sess.employeeId) {
            Utils.toast('Cannot delete your own account.', 'error');
            return;
          }
          Utils.confirmDialog('Delete employee <strong>' + e.name + '</strong> and all their attendance/leaves?',
            function () {
              Store.deleteEmployee(e.id);
              Utils.toast('Employee deleted.');
              renderList();
            }, 'Delete Employee?'
          );
        });
      });
      wrap.appendChild(tbl);
    }

    function openEmployeeEditor(emp) {
      var isCreate = !emp;
      var modal = Utils.openModal(
        isCreate ? 'Add Employee' : 'Edit Employee &mdash; ' + emp.name,
        '<form id="emp-form">' + Components.Forms.employeeFormHtml(emp || {}, 'admin-create') + '</form>',
        '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-submit>' + (isCreate ? 'Create' : 'Save') + '</button>'
      );
      Components.Forms.bindSalaryMode(modal.body);

      modal.footer.querySelector('[data-submit]').addEventListener('click', function () {
        var form = modal.body.querySelector('#emp-form');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var fd = Components.Forms.readFormData(form);
        if (!fd.name || !fd.name.trim()) { Utils.toast('Name required', 'error'); return; }
        if (isCreate) {
          Store.addEmployee(fd);
          Utils.toast('Employee created.');
        } else {
          Store.updateEmployee(emp.id, fd);
          Utils.toast('Employee updated.');
        }
        modal.close();
        renderList();
      });
    }
  }

  global.Pages = global.Pages || {};
  global.Pages.Employees = { render: render };
})(window);
