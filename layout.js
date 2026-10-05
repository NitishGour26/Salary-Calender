// ========================================================================
// Salary Calendar - Layout components (app shell, sidebar, header, avatar)
// ========================================================================

(function (global) {
  'use strict';

  function avatarEl(emp, size) {
    size = size || '';
    var bg = Utils.avatarColor(emp.id || emp.name || 'user');
    var text = Utils.initials(emp.name || 'U');
    var classes = 'avatar' + (size === 'lg' ? ' avatar-lg' : '');
    return '<span class="' + classes + '" style="background:' + bg + '">' + text + '</span>';
  }

  // Build the app shell with sidebar + header, return the page content node
  function renderShell(pageTitle) {
    var sess = Store.getSession();
    var emp = sess.employeeId ? Store.getEmployeeById(sess.employeeId) : null;
    var bodyClassRole = sess.role === 'admin' ? 'admin' : 'employee';
    if (document.body.getAttribute('data-role') !== bodyClassRole) {
      document.body.setAttribute('data-role', bodyClassRole);
    }

    var app = document.getElementById('app');
    Utils.empty(app);
    app.className = '';
    app.innerHTML =
      '<div class="app-shell">' +
        (global.Components ? '' : '') +
        '<aside class="app-sidebar" id="sidebar">' +
          '<div class="sidebar-logo">' +
            '<span class="brand"><span class="brand-icon">SC</span> Salary Calendar</span>' +
          '</div>' +
          '<ul class="nav-list" id="nav-list"></ul>' +
        '</aside>' +
        '<div class="app-main">' +
          '<header class="app-header">' +
            '<button class="mobile-toggle" id="mobile-toggle" aria-label="Toggle menu">&#9776;</button>' +
            '<div class="header-title">' + (pageTitle || 'Dashboard') + '</div>' +
            '<div class="header-right">' +
              '<div class="user-chip">' +
                (emp ? avatarEl(emp) : '') +
                '<div>' +
                  '<div style="font-weight:600;font-size:13px;">' + (emp ? emp.name : 'Guest') + '</div>' +
                  '<div class="muted" style="font-size:11px;text-transform:capitalize;">' + (sess.role || '') + '</div>' +
                '</div>' +
              '</div>' +
              '<button class="btn btn-sm" id="logout-btn">Log out</button>' +
            '</div>' +
          '</header>' +
          '<div class="backdrop app-sidebar-backdrop" id="sidebar-backdrop"></div>' +
          '<main class="container" id="page-content"></main>' +
        '</div>' +
      '</div>';

    renderNavItems();

    document.getElementById('logout-btn').addEventListener('click', function () {
      Store.clearSession();
      App.router.navigate('login');
    });

    var toggle = document.getElementById('mobile-toggle');
    var sidebar = document.getElementById('sidebar');
    var backdrop = document.getElementById('sidebar-backdrop');
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('open');
      backdrop.classList.toggle('show');
    });
    backdrop.addEventListener('click', function () {
      sidebar.classList.remove('open');
      backdrop.classList.remove('show');
    });

    return document.getElementById('page-content');
  }

  function renderNavItems() {
    var list = document.getElementById('nav-list');
    if (!list) return;
    var sess = Store.getSession();
    var isAdmin = sess.role === 'admin';
    var current = App.router ? App.router.currentRoute : 'dashboard';

    var primary = [
      { id: 'dashboard', label: 'Dashboard', icon: '&#128202;' },
      { id: 'calendar', label: 'Calendar', icon: '&#128197;' },
      { id: 'attendance', label: 'Attendance', icon: '&#9200;' },
      { id: 'leaves', label: 'Leaves', icon: '&#127968;' },
      { id: 'salary', label: 'Salary', icon: '&#128176;' },
      { id: 'profile', label: 'Profile', icon: '&#128100;' }
    ];
    var adminOnly = [
      { id: 'employees', label: 'Employees', icon: '&#128101;' },
      { id: 'settings', label: 'Settings', icon: '&#9881;' }
    ];

    var html = '<li class="nav-section">Workplace</li>';
    primary.forEach(function (it) {
      html += navItem(it, current);
    });
    if (isAdmin) {
      html += '<li class="nav-section admin-only">Admin</li>';
      adminOnly.forEach(function (it) {
        html += '<li class="nav-item admin-only">' + navLinkHtml(it, current) + '</li>';
      });
    } else {
      html += '<li class="nav-section admin-only">Admin</li>';
      adminOnly.forEach(function (it) {
        html += '<li class="nav-item admin-only">' + navLinkHtml(it, current) + '</li>';
      });
    }
    list.innerHTML = html;

    list.querySelectorAll('.nav-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var route = a.getAttribute('data-route');
        App.router.navigate(route);
        // close mobile nav
        var sb = document.getElementById('sidebar');
        var bd = document.getElementById('sidebar-backdrop');
        if (sb) sb.classList.remove('open');
        if (bd) bd.classList.remove('show');
      });
    });
  }

  function navItem(it, current) {
    return '<li class="nav-item">' + navLinkHtml(it, current) + '</li>';
  }
  function navLinkHtml(it, current) {
    return '<a class="nav-link' + (current === it.id ? ' active' : '') + '" data-route="' + it.id + '">' +
      '<span aria-hidden="true">' + it.icon + '</span><span>' + it.label + '</span></a>';
  }

  function updateHeaderTitle(t) {
    var el = document.querySelector('.header-title');
    if (el) el.textContent = t;
  }
  function updateNavActive(id) {
    document.querySelectorAll('.nav-link').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-route') === id);
    });
  }

  function setPageTitle(t) {
    document.title = t + ' - Salary Calendar';
    updateHeaderTitle(t);
  }

  global.Components = global.Components || {};
  global.Components.Layout = {
    renderShell: renderShell,
    renderNavItems: renderNavItems,
    avatarEl: avatarEl,
    setPageTitle: setPageTitle,
    updateNavActive: updateNavActive
  };
})(window);
