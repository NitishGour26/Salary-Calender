// ========================================================================
// Salary Calendar - Form helpers (employee form, leave form, etc.)
// ========================================================================

(function (global) {
  'use strict';

  function employeeFormHtml(emp, mode) {
    emp = emp || {};
    var readOnlyPersonal = (mode === 'employee-self');
    var readOnlySalary = (mode !== 'admin-edit' && mode !== 'admin-create');
    var readOnlyRole = readOnlySalary;
    var disabled = function (cond) { return cond ? 'disabled' : ''; };
    var val = function (v, d) { return v != null ? v : (d != null ? d : ''); };
    var checked = function (cond) { return cond ? 'checked' : ''; };
    var selected = function (cond) { return cond ? 'selected' : ''; };

    return (
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Full Name *</label>' +
          '<input class="form-control" name="name" required value="' + val(emp.name) + '" ' + disabled(readOnlyPersonal) + '>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Employee ID</label>' +
          '<input class="form-control" name="employeeId" value="' + val(emp.employeeId) + '" placeholder="EMP-0001" ' + disabled(readOnlyPersonal) + '>' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Email</label>' +
          '<input class="form-control" name="email" type="email" value="' + val(emp.email) + '" ' + disabled(readOnlyPersonal) + '>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Phone</label>' +
          '<input class="form-control" name="phone" value="' + val(emp.phone) + '" ' + disabled(readOnlyPersonal) + '>' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Designation</label>' +
          '<input class="form-control" name="designation" value="' + val(emp.designation) + '" ' + disabled(readOnlyPersonal) + '>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Department</label>' +
          '<input class="form-control" name="department" value="' + val(emp.department) + '" ' + disabled(readOnlyPersonal) + '>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Joining Date</label>' +
          '<input class="form-control" name="joiningDate" type="date" value="' + val(emp.joiningDate) + '" ' + disabled(readOnlyPersonal) + '>' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Role</label>' +
          '<select class="form-control" name="role" ' + disabled(readOnlyRole) + '>' +
            '<option value="employee" ' + selected(emp.role !== 'admin') + '>Employee</option>' +
            '<option value="admin" ' + selected(emp.role === 'admin') + '>Admin</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Salary Day (1-31)</label>' +
          '<input class="form-control" name="salaryDay" type="number" min="1" max="28" value="' + val(emp.salaryDay, 25) + '" ' + disabled(readOnlySalary) + '>' +
          '<div class="hint">Day of month salary is paid (capped at 28)</div>' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Salary Mode</label>' +
          '<select class="form-control" name="salaryMode" ' + disabled(readOnlySalary) + '>' +
            '<option value="fixed" ' + selected(emp.salaryMode !== 'hourly') + '>Fixed Monthly</option>' +
            '<option value="hourly" ' + selected(emp.salaryMode === 'hourly') + '>Hourly Rate</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-group" data-mode="fixed">' +
          '<label>Fixed Monthly Salary</label>' +
          '<input class="form-control" name="fixedSalary" type="number" min="0" step="0.01" value="' + val(emp.fixedSalary, 0) + '" ' + disabled(readOnlySalary) + '>' +
        '</div>' +
        '<div class="form-group" data-mode="hourly">' +
          '<label>Hourly Rate</label>' +
          '<input class="form-control" name="hourlyRate" type="number" min="0" step="0.01" value="' + val(emp.hourlyRate, 0) + '" ' + disabled(readOnlySalary) + '>' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Work Start</label>' +
          '<input class="form-control" name="workStart" type="time" value="' + val(emp.workStart, '09:00') + '" ' + disabled(readOnlySalary) + '>' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Work End</label>' +
          '<input class="form-control" name="workEnd" type="time" value="' + val(emp.workEnd, '18:00') + '" ' + disabled(readOnlySalary) + '>' +
        '</div>' +
      '</div>'
    );
  }

  // Bind interactive mode switching (fixed/hourly) show/hide of fixedSalary and hourlyRate groups
  function bindSalaryMode(root) {
    function update() {
      var sel = root.querySelector('select[name="salaryMode"]');
      if (!sel) return;
      var mode = sel.value;
      var fx = root.querySelector('[data-mode="fixed"]');
      var hr = root.querySelector('[data-mode="hourly"]');
      if (!fx || !hr) return;
      fx.style.display = mode === 'fixed' ? '' : 'none';
      hr.style.display = mode === 'hourly' ? '' : 'none';
    }
    var sel = root.querySelector('select[name="salaryMode"]');
    if (sel) sel.addEventListener('change', update);
    update();
  }

  function readFormData(formEl) {
    var fd = new FormData(formEl);
    var obj = {};
    fd.forEach(function (v, k) { obj[k] = v; });
    // Also capture number inputs manually for consistency
    Array.from(formEl.querySelectorAll('input,select,textarea')).forEach(function (el) {
      if (!el.name) return;
      if (el.type === 'checkbox') obj[el.name] = el.checked;
      else obj[el.name] = el.value;
    });
    return obj;
  }

  // Leave form
  function leaveFormHtml(defaults, options) {
    defaults = defaults || {};
    options = options || {};
    var showEmpSelect = options.showEmployeeSelect;
    var employees = options.employees || [];
    var empSelect = '';
    if (showEmpSelect) {
      empSelect =
        '<div class="form-group">' +
          '<label>Employee *</label>' +
          '<select class="form-control" name="employeeId" required>' +
            employees.map(function (e) {
              return '<option value="' + e.id + '">' + e.name + ' (' + e.employeeId + ')</option>';
            }).join('') +
          '</select>' +
        '</div>';
    }
    var d = new Date();
    var today = d.getFullYear() + '-' + Utils.pad(d.getMonth() + 1) + '-' + Utils.pad(d.getDate());
    return (
      empSelect +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Leave Date *</label>' +
          '<input class="form-control" type="date" name="date" required value="' + (defaults.date || today) + '">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>Duration *</label>' +
          '<select class="form-control" name="duration" required>' +
            '<option value="full">Full Day</option>' +
            '<option value="half">Half Day</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>Leave Type</label>' +
          '<select class="form-control" name="type">' +
            '<option value="casual">Casual</option>' +
            '<option value="sick">Sick</option>' +
            '<option value="personal">Personal</option>' +
            '<option value="others">Others</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="form-group">' +
        '<label>Note (optional)</label>' +
        '<textarea class="form-control" name="note" rows="2" placeholder="Reason, context..."></textarea>' +
      '</div>'
    );
  }

  global.Components = global.Components || {};
  global.Components.Forms = {
    employeeFormHtml: employeeFormHtml,
    bindSalaryMode: bindSalaryMode,
    leaveFormHtml: leaveFormHtml,
    readFormData: readFormData
  };
})(window);
