// ========================================================================
// Salary Calendar - Profile page (self edit)
// ========================================================================

(function (global) {
  'use strict';

  function render(root) {
    Components.Layout.setPageTitle('My Profile');
    var sess = Store.getSession();
    var emp = Store.getEmployeeById(sess.employeeId);
    if (!emp) { App.router.navigate('login'); return; }
    var isAdmin = sess.role === 'admin';
    var mode = isAdmin ? 'admin-edit' : 'employee-self';

    root.innerHTML = '';
    var headCard = Utils.el(
      '<div class="card" style="margin-bottom:16px;">' +
        '<div class="row" style="align-items:center;">' +
          '<div id="avatar-wrap" style="display:flex;align-items:center;gap:16px;"></div>' +
          '<div style="flex:1;">' +
            '<h2 style="font-size:22px;" id="emp-name">' + emp.name + '</h2>' +
            '<div class="muted" style="margin:4px 0;">' + emp.designation + (emp.department ? ' &middot; ' + emp.department : '') + '</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">' +
              '<span class="badge badge-info">ID: ' + emp.employeeId + '</span>' +
              '<span class="badge ' + (emp.role === 'admin' ? 'badge-warning' : 'badge-success') + '" style="text-transform:capitalize;">' + emp.role + '</span>' +
              '<span class="badge badge-purple">' + (emp.salaryMode === 'hourly' ? ('Hourly @ ' + Utils.fmtCurrency(emp.hourlyRate) + '/hr') : ('Fixed ' + Utils.fmtCurrency(emp.fixedSalary))) + '</span>' +
              '<span class="badge badge-success">Salary day: ' + emp.salaryDay + '</span>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
    var ava = headCard.querySelector('#avatar-wrap');
    ava.innerHTML = Components.Layout.avatarEl(emp, 'lg') + '';
    // Use innerHTML won't add real element when string; reinject as element
    ava.innerHTML = '';
    var tmp = document.createElement('div');
    tmp.innerHTML = Components.Layout.avatarEl(emp, 'lg');
    while (tmp.firstChild) ava.appendChild(tmp.firstChild);

    var info = document.createElement('div');
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.innerHTML =
      (emp.email ? '<div class="muted" style="font-size:12px;">Email</div><div>' + emp.email + '</div>' : '') +
      (emp.phone ? '<div class="muted" style="font-size:12px;margin-top:6px;">Phone</div><div>' + emp.phone + '</div>' : '') +
      (emp.joiningDate ? '<div class="muted" style="font-size:12px;margin-top:6px;">Joined</div><div>' + Utils.fmtDate(Utils.parseDate(emp.joiningDate)) + '</div>' : '');
    ava.appendChild(info);

    root.appendChild(headCard);

    var formCard = Utils.el(
      '<div class="card">' +
        '<div class="section-head"><h2>Edit Profile</h2><div id="save-slot"></div></div>' +
        '<form id="profile-form">' + Components.Forms.employeeFormHtml(emp, mode) + '</form>' +
      '</div>'
    );
    var saveSlot = formCard.querySelector('#save-slot');
    saveSlot.innerHTML = '<button class="btn btn-primary" form="profile-form">Save Changes</button>';
    root.appendChild(formCard);

    Components.Forms.bindSalaryMode(formCard);

    formCard.querySelector('#profile-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var data = Components.Forms.readFormData(e.target);
      // Don't allow employees to overwrite role/salary via tampering
      if (mode === 'employee-self') {
        data.role = emp.role;
        data.salaryMode = emp.salaryMode;
        data.fixedSalary = emp.fixedSalary;
        data.hourlyRate = emp.hourlyRate;
        data.salaryDay = emp.salaryDay;
        data.workStart = emp.workStart;
        data.workEnd = emp.workEnd;
        data.employeeId = emp.employeeId;
      }
      // Name required
      if (!data.name || !data.name.trim()) { Utils.toast('Name is required', 'error'); return; }
      var updated = Store.updateEmployee(emp.id, data);
      if (updated) {
        Utils.toast('Profile saved.');
        render(root);
      }
    });
  }

  global.Pages = global.Pages || {};
  global.Pages.Profile = { render: render };
})(window);
