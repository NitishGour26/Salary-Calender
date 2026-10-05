// ========================================================================
// Salary Calendar - LocalStorage Store
// ========================================================================

(function (global) {
  'use strict';

  var NS = 'salaryCalendar:';
  var KEYS = {
    employees: NS + 'employees',
    attendance: NS + 'attendance',
    leaves: NS + 'leaves',
    settings: NS + 'settings',
    session: NS + 'session',
    bootstrapped: NS + 'bootstrapped'
  };

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function safeParse(str, fallback) {
    if (!str) return fallback;
    try { return JSON.parse(str); } catch (e) { return fallback; }
  }

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return safeParse(raw, fallback);
    } catch (e) {
      console.warn('Store read error:', key, e);
      return fallback;
    }
  }

  function write(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
      return true;
    } catch (e) {
      console.warn('Store write error:', key, e);
      toast('Storage error: ' + e.message, 'error');
      return false;
    }
  }

  // --------------------- Schema defaults ---------------------
  function defaultSettings() {
    return {
      weekStartsOn: 1,
      defaultWorkingDays: 22,
      otMultiplier: 1.5,
      otEnabled: true,
      holidays: [],
      currency: '₹'
    };
  }

  function defaultSession() {
    return { employeeId: null, role: null, loggedInAt: null };
  }

  function validateEmployee(e) {
    if (!e || typeof e !== 'object') return null;
    return {
      id: e.id || uuid(),
      name: String(e.name || 'Unnamed'),
      email: e.email ? String(e.email) : '',
      phone: e.phone ? String(e.phone) : '',
      employeeId: String(e.employeeId || ('EMP-' + Math.floor(Math.random() * 9000 + 1000))),
      designation: e.designation ? String(e.designation) : '',
      department: e.department ? String(e.department) : '',
      joiningDate: e.joiningDate ? String(e.joiningDate) : new Date().toISOString().slice(0, 10),
      role: e.role === 'admin' ? 'admin' : 'employee',
      salaryMode: e.salaryMode === 'hourly' ? 'hourly' : 'fixed',
      fixedSalary: isFinite(+e.fixedSalary) ? +e.fixedSalary : 0,
      hourlyRate: isFinite(+e.hourlyRate) ? +e.hourlyRate : 0,
      workStart: /^\d{2}:\d{2}$/.test(e.workStart) ? e.workStart : '09:00',
      workEnd: /^\d{2}:\d{2}$/.test(e.workEnd) ? e.workEnd : '18:00',
      salaryDay: Math.min(31, Math.max(1, +e.salaryDay || 25)),
      createdAt: e.createdAt || new Date().toISOString()
    };
  }

  function validateAttendance(a) {
    if (!a || typeof a !== 'object') return null;
    return {
      id: a.id || uuid(),
      employeeId: String(a.employeeId || ''),
      date: String(a.date || ''),
      clockIn: a.clockIn || null,
      clockOut: a.clockOut || null,
      totalHours: isFinite(+a.totalHours) ? +a.totalHours : 0
    };
  }

  function validateLeave(l) {
    if (!l || typeof l !== 'object') return null;
    var dur = ['full', 'half'].indexOf(l.duration) >= 0 ? l.duration : 'full';
    var types = ['casual', 'sick', 'personal', 'others'];
    var typ = types.indexOf(l.type) >= 0 ? l.type : 'casual';
    return {
      id: l.id || uuid(),
      employeeId: String(l.employeeId || ''),
      date: String(l.date || ''),
      type: typ,
      duration: dur,
      note: l.note ? String(l.note) : '',
      createdAt: l.createdAt || new Date().toISOString()
    };
  }

  // --------------------- Store API ---------------------
  var Store = {
    KEYS: KEYS,
    uuid: uuid,

    // ----- settings -----
    getSettings: function () {
      var s = read(KEYS.settings, null);
      if (!s) { s = defaultSettings(); write(KEYS.settings, s); }
      var d = defaultSettings();
      return Object.assign({}, d, s, {
        holidays: Array.isArray(s.holidays) ? s.holidays : []
      });
    },
    updateSettings: function (patch) {
      var cur = Store.getSettings();
      var next = Object.assign({}, cur, patch);
      if (patch.holidays) next.holidays = patch.holidays;
      write(KEYS.settings, next);
      Store._emit('settingsChanged');
      return next;
    },

    // ----- employees -----
    getEmployees: function () {
      var list = read(KEYS.employees, []);
      if (!Array.isArray(list)) list = [];
      return list.map(validateEmployee).filter(Boolean);
    },
    getEmployeeById: function (id) {
      return Store.getEmployees().find(function (e) { return e.id === id; }) || null;
    },
    addEmployee: function (data) {
      var emp = validateEmployee(data);
      var list = Store.getEmployees();
      list.push(emp);
      write(KEYS.employees, list);
      Store._emit('employeesChanged');
      return emp;
    },
    updateEmployee: function (id, patch) {
      var list = Store.getEmployees();
      var idx = list.findIndex(function (e) { return e.id === id; });
      if (idx < 0) return null;
      var updated = validateEmployee(Object.assign({}, list[idx], patch, { id: id }));
      list[idx] = updated;
      write(KEYS.employees, list);
      Store._emit('employeesChanged');
      return updated;
    },
    deleteEmployee: function (id) {
      var list = Store.getEmployees().filter(function (e) { return e.id !== id; });
      write(KEYS.employees, list);
      // Also clean attendance & leaves
      var att = Store.getAllAttendance().filter(function (a) { return a.employeeId !== id; });
      write(KEYS.attendance, att);
      var lvs = Store.getAllLeaves().filter(function (l) { return l.employeeId !== id; });
      write(KEYS.leaves, lvs);
      Store._emit('employeesChanged');
      Store._emit('attendanceChanged');
      Store._emit('leavesChanged');
      return true;
    },

    // ----- attendance -----
    getAllAttendance: function () {
      var list = read(KEYS.attendance, []);
      if (!Array.isArray(list)) list = [];
      return list.map(validateAttendance).filter(Boolean);
    },
    getAttendance: function (employeeId) {
      return Store.getAllAttendance().filter(function (a) { return a.employeeId === employeeId; });
    },
    getAttendanceByDate: function (employeeId, dateStr) {
      return Store.getAllAttendance().find(function (a) {
        return a.employeeId === employeeId && a.date === dateStr;
      }) || null;
    },
    upsertAttendance: function (record) {
      var list = Store.getAllAttendance();
      var rec = validateAttendance(record);
      // uniq by employeeId + date
      var idx = list.findIndex(function (a) { return a.employeeId === rec.employeeId && a.date === rec.date; });
      if (idx >= 0) {
        list[idx] = Object.assign({}, list[idx], rec, { id: list[idx].id });
      } else {
        if (!rec.id) rec.id = uuid();
        list.push(rec);
      }
      write(KEYS.attendance, list);
      Store._emit('attendanceChanged');
      return rec;
    },
    deleteAttendance: function (id) {
      var list = Store.getAllAttendance().filter(function (a) { return a.id !== id; });
      write(KEYS.attendance, list);
      Store._emit('attendanceChanged');
    },

    // ----- leaves -----
    getAllLeaves: function () {
      var list = read(KEYS.leaves, []);
      if (!Array.isArray(list)) list = [];
      return list.map(validateLeave).filter(Boolean);
    },
    getLeaves: function (employeeId) {
      return Store.getAllLeaves().filter(function (l) { return l.employeeId === employeeId; });
    },
    addLeave: function (data) {
      var list = Store.getAllLeaves();
      var lv = validateLeave(data);
      if (!lv.employeeId || !lv.date) return null;
      list.push(lv);
      write(KEYS.leaves, list);
      Store._emit('leavesChanged');
      return lv;
    },
    deleteLeave: function (id) {
      var list = Store.getAllLeaves().filter(function (l) { return l.id !== id; });
      write(KEYS.leaves, list);
      Store._emit('leavesChanged');
    },

    // ----- session -----
    getSession: function () {
      var s = read(KEYS.session, null);
      if (!s) { s = defaultSession(); write(KEYS.session, s); }
      return Object.assign({}, defaultSession(), s);
    },
    setSession: function (patch) {
      var cur = Store.getSession();
      var next = Object.assign({}, cur, patch);
      write(KEYS.session, next);
      Store._emit('sessionChanged');
      return next;
    },
    clearSession: function () {
      write(KEYS.session, defaultSession());
      Store._emit('sessionChanged');
    },

    isFirstRun: function () {
      return Store.getEmployees().length === 0;
    },
    clearAll: function () {
      Object.keys(KEYS).forEach(function (k) { localStorage.removeItem(KEYS[k]); });
    },

    // ----- pub/sub (simple) -----
    _listeners: {},
    on: function (evt, cb) {
      (Store._listeners[evt] = Store._listeners[evt] || []).push(cb);
    },
    off: function (evt, cb) {
      if (!Store._listeners[evt]) return;
      Store._listeners[evt] = Store._listeners[evt].filter(function (f) { return f !== cb; });
    },
    _emit: function (evt) {
      (Store._listeners[evt] || []).forEach(function (f) { try { f(); } catch (e) { console.error(e); } });
    }
  };

  global.Store = Store;
})(window);
