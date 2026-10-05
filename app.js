// ========================================================================
// Salary Calendar - App entry, router
// ========================================================================

(function (global) {
  'use strict';

  var routes = {
    login: { auth: false, title: 'Sign In', render: Pages.Login.render, rootEl: document.getElementById('app') },
    dashboard: { auth: true, title: 'Dashboard', render: Pages.Dashboard.render },
    calendar: { auth: true, title: 'Calendar', render: Pages.Calendar.render },
    attendance: { auth: true, title: 'Attendance', render: Pages.Attendance.render },
    leaves: { auth: true, title: 'Leaves', render: Pages.Leaves.render },
    salary: { auth: true, title: 'Salary', render: Pages.Salary.render },
    profile: { auth: true, title: 'My Profile', render: Pages.Profile.render },
    employees: { auth: true, adminOnly: true, title: 'Employees', render: Pages.Employees.render },
    settings: { auth: true, adminOnly: true, title: 'Settings', render: Pages.Settings.render }
  };

  var currentRoute = null;
  var currentParams = {};

  function currentRootEl() {
    var route = routes[currentRoute];
    if (route && route.rootEl) return route.rootEl;
    return Components.Layout.renderShell(route ? route.title : '');
  }

  function navigate(route, params) {
    if (!route) route = 'login';
    if (!routes[route]) route = 'dashboard';
    var cfg = routes[route];
    currentParams = params || {};

    if (cfg.auth) {
      var sess = Store.getSession();
      if (!sess.employeeId || !sess.role) {
        return navigate('login');
      }
      if (cfg.adminOnly && sess.role !== 'admin') {
        Utils.toast('Admin access required', 'error');
        return navigate('dashboard');
      }
    }

    currentRoute = route;
    document.body.className = '';
    var root;
    if (route === 'login') {
      root = document.getElementById('app');
    } else {
      root = Components.Layout.renderShell(cfg.title);
    }
    Components.Layout.setPageTitle(cfg.title);
    Components.Layout.updateNavActive(route);
    try {
      cfg.render(root, currentParams);
    } catch (e) {
      console.error('Render error for route', route, e);
      Utils.toast('Render error: ' + e.message, 'error');
    }
    // scroll top
    window.scrollTo(0, 0);
  }

  function boot() {
    // Ensure toast root
    if (!document.getElementById('toast-root')) {
      var tr = document.createElement('div');
      tr.id = 'toast-root';
      document.body.appendChild(tr);
    }

    var sess = Store.getSession();
    var hasAuth = !!(sess.employeeId && sess.role);
    if (Store.isFirstRun()) {
      navigate('login');
    } else if (!hasAuth) {
      navigate('login');
    } else {
      navigate('dashboard');
    }
  }

  global.App = {
    router: {
      navigate: navigate,
      get currentRoute() { return currentRoute; },
      get currentParams() { return currentParams; }
    },
    routes: routes,
    boot: boot
  };

  document.addEventListener('DOMContentLoaded', App.boot);
})(window);
