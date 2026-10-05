// ========================================================================
// Salary Calendar - Settings page (Admin)
// ========================================================================

(function (global) {
  'use strict';

  function render(root) {
    Components.Layout.setPageTitle('Settings');
    var sess = Store.getSession();
    if (sess.role !== 'admin') { App.router.navigate('dashboard'); return; }
    var s = Store.getSettings();

    root.innerHTML = '';
    root.appendChild(Utils.el(
      '<div class="card" style="margin-bottom:16px;">' +
        '<div class="section-head"><h2>Global Settings</h2><span class="muted" style="font-size:12px;">Applied to salary calculations &amp; calendar defaults.</span></div>' +
        '<form id="settings-form">' +
          '<div class="form-row">' +
            '<div class="form-group">' +
              '<label>Week Starts On</label>' +
              '<select class="form-control" name="weekStartsOn">' +
                '<option value="1"' + (s.weekStartsOn === 1 ? ' selected' : '') + '>Monday</option>' +
                '<option value="0"' + (s.weekStartsOn === 0 ? ' selected' : '') + '>Sunday</option>' +
              '</select>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Default Working Days / Month</label>' +
              '<input class="form-control" name="defaultWorkingDays" type="number" min="1" max="31" value="' + s.defaultWorkingDays + '">' +
              '<div class="hint">Used for per-day rate in fixed salary mode and regular-hours cap for hourly.</div>' +
            '</div>' +
            '<div class="form-group">' +
              '<label>Currency Symbol</label>' +
              '<input class="form-control" name="currency" maxlength="3" value="' + (s.currency || '₹') + '">' +
            '</div>' +
          '</div>' +
          '<div class="form-row">' +
            '<div class="form-group" style="flex:2;min-width:240px;">' +
              '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">' +
                '<label style="margin:0;">Enable Overtime Pay (hourly mode)</label>' +
                '<label class="switch"><input type="checkbox" name="otEnabled" ' + (s.otEnabled ? 'checked' : '') + '> <span style="font-weight:400;font-size:13px;">Active</span></label>' +
              '</div>' +
              '<input class="form-control" type="number" name="otMultiplier" step="0.1" min="1" max="5" value="' + s.otMultiplier + '">' +
              '<div class="hint">Overtime multiplier (e.g., 1.5 = 150% of hourly rate).</div>' +
            '</div>' +
          '</div>' +
          '<div style="margin-top:8px;"><button class="btn btn-primary" type="submit">Save Settings</button></div>' +
        '</form>' +
      '</div>'
    ));

    root.querySelector('#settings-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var fd = Components.Forms.readFormData(e.target);
      var patch = {
        weekStartsOn: +fd.weekStartsOn === 0 ? 0 : 1,
        defaultWorkingDays: Math.min(31, Math.max(1, +fd.defaultWorkingDays || 22)),
        currency: (fd.currency || '₹').toString().slice(0, 4),
        otEnabled: !!fd.otEnabled,
        otMultiplier: Math.min(5, Math.max(1, +fd.otMultiplier || 1.5))
      };
      Store.updateSettings(patch);
      Utils.toast('Settings saved.');
      render(root);
    });

    // Holidays section
    var holidaysCard = Utils.el(
      '<div class="card">' +
        '<div class="section-head"><h2>Public Holidays</h2><button class="btn btn-primary btn-sm" id="add-holiday">+ Add Holiday</button></div>' +
        '<div id="hol-list"></div>' +
      '</div>'
    );
    root.appendChild(holidaysCard);

    function renderHolidays() {
      var wrap = holidaysCard.querySelector('#hol-list');
      Utils.empty(wrap);
      var list = (Store.getSettings().holidays || []).slice().sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      if (list.length === 0) {
        wrap.appendChild(Utils.el('<div class="empty-state"><span class="emoji">&#127881;</span>No public holidays. Add days like national holidays to mark them on the calendar.</div>'));
        return;
      }
      var tbl = Utils.el(
        '<table class="data-table"><thead><tr><th>Date</th><th>Name</th><th style="text-align:right;">Actions</th></tr></thead><tbody></tbody></table>'
      );
      list.forEach(function (h) {
        var tr = document.createElement('tr');
        var d = Utils.parseDate(h.date);
        tr.innerHTML =
          '<td><strong>' + h.date + '</strong><div class="muted" style="font-size:12px;">' +
            (d ? d.toLocaleDateString(undefined, { weekday: 'long' }) : '') + '</div></td>' +
          '<td>' + h.name + '</td>' +
          '<td style="text-align:right;"><button class="btn btn-sm btn-outline-danger" data-del="' + h.date + '">Remove</button></td>';
        tr.querySelector('[data-del]').addEventListener('click', function () {
          var cur = Store.getSettings();
          var next = cur.holidays.filter(function (hh) { return hh.date !== h.date; });
          Store.updateSettings({ holidays: next });
          Utils.toast('Holiday removed.');
          renderHolidays();
        });
        tbl.querySelector('tbody').appendChild(tr);
      });
      wrap.appendChild(tbl);
    }
    renderHolidays();

    holidaysCard.querySelector('#add-holiday').addEventListener('click', function () {
      var todayD = new Date();
      var iso = todayD.getFullYear() + '-' + Utils.pad(todayD.getMonth() + 1) + '-' + Utils.pad(todayD.getDate());
      var modal = Utils.openModal(
        'Add Public Holiday',
        '<form id="hol-form">' +
          '<div class="form-group"><label>Date *</label><input type="date" class="form-control" name="date" required value="' + iso + '"></div>' +
          '<div class="form-group"><label>Holiday Name *</label><input type="text" class="form-control" name="name" required placeholder="e.g. Diwali, New Year"></div>' +
        '</form>',
        '<button class="btn" data-close>Cancel</button><button class="btn btn-primary" data-submit>Add Holiday</button>'
      );
      modal.footer.querySelector('[data-submit]').addEventListener('click', function () {
        var form = modal.body.querySelector('#hol-form');
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var fd = Components.Forms.readFormData(form);
        var cur = Store.getSettings();
        if (cur.holidays.some(function (hh) { return hh.date === fd.date; })) {
          Utils.toast('Holiday already exists for that date.', 'error');
          return;
        }
        var next = cur.holidays.concat([{ date: fd.date, name: fd.name }]);
        Store.updateSettings({ holidays: next });
        Utils.toast('Holiday added.');
        modal.close();
        renderHolidays();
      });
    });

    // Danger zone: clear all
    var danger = Utils.el(
      '<div class="card" style="margin-top:16px;border-color:#fecaca;background:#fff5f5;">' +
        '<div class="section-head"><h2 style="color:#991b1b;">Danger Zone</h2></div>' +
        '<p class="muted" style="margin-bottom:12px;">Resetting will erase all employees, attendance, leaves, and settings. This action cannot be undone.</p>' +
        '<button class="btn btn-outline-danger" id="reset-all">Reset All Application Data</button>' +
      '</div>'
    );
    root.appendChild(danger);
    danger.querySelector('#reset-all').addEventListener('click', function () {
      Utils.confirmDialog('Permanently delete ALL app data? This will log you out and return to onboarding.',
        function () {
          Store.clearAll();
          App.router.navigate('login');
        }, 'Reset App Data?');
    });
  }

  global.Pages = global.Pages || {};
  global.Pages.Settings = { render: render };
})(window);
