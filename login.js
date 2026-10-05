// ========================================================================
// Salary Calendar - Login / Onboarding page
// ========================================================================

(function (global) {
  'use strict';

  function render(root) {
    Utils.empty(root);
    document.body.removeAttribute('data-role');

    var isFirst = Store.isFirstRun();

    if (isFirst) {
      renderOnboarding(root);
    } else {
      renderLogin(root);
    }
  }

  function renderOnboarding(root) {
    root.className = 'auth-page';
    var card = Utils.el(
      '<div class="auth-card">' +
        '<h1>Welcome to Salary Calendar</h1>' +
        '<p class="sub">Set up your admin account to get started. This will be the primary admin profile.</p>' +
        '<form id="onboard-form" autocomplete="off">' +
          Components.Forms.employeeFormHtml({
            role: 'admin',
            salaryMode: 'fixed',
            salaryDay: 25,
            fixedSalary: 50000,
            hourlyRate: 300,
            workStart: '09:00',
            workEnd: '18:00',
            designation: 'Administrator',
            department: 'Administration',
            joiningDate: Utils.todayStr()
          }, 'admin-create') +
          '<div class="auth-actions">' +
            '<button type="submit" class="btn btn-primary">Create Admin &amp; Continue</button>' +
          '</div>' +
        '</form>' +
      '</div>'
    );
    root.appendChild(card);
    Components.Forms.bindSalaryMode(card);
    card.querySelector('#onboard-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Components.Forms.readFormData(e.target);
      if (!data.name || !data.name.trim()) {
        Utils.toast('Please enter your full name', 'error');
        return;
      }
      data.role = 'admin';
      var emp = Store.addEmployee(data);
      Store.setSession({ employeeId: emp.id, role: 'admin', loggedInAt: new Date().toISOString() });
      Utils.toast('Admin account created. Welcome, ' + emp.name + '!');
      App.router.navigate('dashboard');
    });
  }

  function renderLogin(root) {
    root.className = 'auth-page';
    var employees = Store.getEmployees();
    var options = employees.map(function (e) {
      var roles = [e.role];
      return '<option value="' + e.id + '">' + e.name + ' &mdash; ' + e.employeeId + (e.role === 'admin' ? ' (Admin)' : '') + '</option>';
    }).join('');

    var card = Utils.el(
      '<div class="auth-card">' +
        '<h1>Sign in to Salary Calendar</h1>' +
        '<p class="sub">Select a profile to continue.</p>' +
        '<form id="login-form" autocomplete="off">' +
          '<div class="form-group">' +
            '<label>Profile</label>' +
            '<select class="form-control" name="employeeId" required>' +
              (employees.length ? options : '') +
            '</select>' +
          '</div>' +
          '<div class="form-group">' +
            '<label>Login as</label>' +
            '<select class="form-control" name="role" id="login-role">' +
              '<option value="employee">Employee</option>' +
              '<option value="admin">Admin</option>' +
            '</select>' +
            '<div class="hint">Admin option is allowed only for users that have Admin role.</div>' +
          '</div>' +
          '<div class="auth-actions">' +
            '<button type="button" class="btn" id="reset-btn" title="Reset everything (dev)">Reset App Data</button>' +
            '<button type="submit" class="btn btn-primary">Continue</button>' +
          '</div>' +
        '</form>' +
      '</div>'
    );
    root.appendChild(card);

    function updateRoleOptions() {
      var sel = card.querySelector('select[name="employeeId"]');
      var roleSel = card.querySelector('#login-role');
      var empId = sel.value;
      var emp = Store.getEmployeeById(empId);
      if (!emp) return;
      // If emp is not admin, disable admin option
      Array.from(roleSel.options).forEach(function (o) {
        if (o.value === 'admin' && emp.role !== 'admin') o.disabled = true;
        if (o.value === 'admin' && emp.role === 'admin') o.disabled = false;
      });
      if (emp.role === 'admin') roleSel.value = 'admin';
      else roleSel.value = 'employee';
    }
    card.querySelector('select[name="employeeId"]').addEventListener('change', updateRoleOptions);
    updateRoleOptions();

    card.querySelector('#login-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = Components.Forms.readFormData(e.target);
      var emp = Store.getEmployeeById(fd.employeeId);
      if (!emp) { Utils.toast('Profile not found', 'error'); return; }
      var role = fd.role;
      if (role === 'admin' && emp.role !== 'admin') {
        Utils.toast(emp.name + ' is not an admin.', 'error');
        return;
      }
      Store.setSession({ employeeId: emp.id, role: role, loggedInAt: new Date().toISOString() });
      Utils.toast('Welcome back, ' + emp.name);
      App.router.navigate('dashboard');
    });

    card.querySelector('#reset-btn').addEventListener('click', function () {
      Utils.confirmDialog(
        'Delete ALL saved data (employees, attendance, leaves, settings) and start over? This cannot be undone.',
        function () {
          Store.clearAll();
          Utils.toast('App data reset.');
          App.router.navigate('login');
        },
        'Reset App Data?'
      );
    });
  }

  global.Pages = global.Pages || {};
  global.Pages.Login = { render: render };
})(window);
