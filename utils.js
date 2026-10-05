// ========================================================================
// Salary Calendar - Utilities: dates, salary calc, helpers, toast
// ========================================================================

(function (global) {
  'use strict';

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  /** Format Date -> yyyy-mm-dd (local time) */
  function fmtDate(d) {
    if (!d) return '';
    if (typeof d === 'string') d = new Date(d);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  function todayStr() { return fmtDate(new Date()); }

  /** Parse yyyy-mm-dd or ISO string as local Date */
  function parseDate(str) {
    if (!str) return null;
    if (str.length === 10) {
      var parts = str.split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }
    return new Date(str);
  }

  function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
  function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
  function addMonths(d, n) { return new Date(d.getFullYear(), d.getMonth() + n, 1); }
  function sameDay(a, b) {
    return a && b &&
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }
  function daysInMonth(year, month0) {
    return new Date(year, month0 + 1, 0).getDate();
  }

  /** Generate grid rows for month calendar (Date).
   *  Returns array of week-arrays, each containing 7 Date objects. Includes leading/trailing of adjacent months.
   */
  function buildMonthGrid(baseDate, weekStartsOn) {
    var start = weekStartsOn === 1 ? 1 : 0;
    var first = startOfMonth(baseDate);
    var firstDow = (first.getDay() - start + 7) % 7;
    var gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - firstDow);
    var weeks = [];
    var cursor = new Date(gridStart);
    for (var w = 0; w < 6; w++) {
      var week = [];
      for (var i = 0; i < 7; i++) {
        week.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
      // If we already passed the month end and this row is entirely next month -> stop
      if (w >= 4 && week[0].getMonth() !== first.getMonth()) break;
    }
    return weeks;
  }

  function weekdayLabels(weekStartsOn) {
    var sun = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var start = weekStartsOn === 1 ? 1 : 0;
    var out = [];
    for (var i = 0; i < 7; i++) out.push(sun[(start + i) % 7]);
    return out;
  }

  function monthName(month0) {
    return ['January','February','March','April','May','June',
            'July','August','September','October','November','December'][month0];
  }
  function monthYear(d) { return monthName(d.getMonth()) + ' ' + d.getFullYear(); }

  // Format hours as "Xh Ym"
  function fmtHours(totalHours) {
    totalHours = +totalHours || 0;
    var h = Math.floor(totalHours);
    var m = Math.round((totalHours - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    return h + 'h ' + pad(m) + 'm';
  }
  function fmtTime(isoOrDate) {
    if (!isoOrDate) return '--:--';
    var d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fmtDateTime(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return fmtDate(d) + ' ' + fmtTime(d);
  }

  // Currency formatter
  function fmtCurrency(amount) {
    var s = Store.getSettings().currency || '₹';
    return s + (+amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }

  // Compute worked hours from clockIn/clockOut
  function computeHours(clockInIso, clockOutIso) {
    if (!clockInIso || !clockOutIso) return 0;
    var diff = (new Date(clockOutIso) - new Date(clockInIso));
    if (diff <= 0) return 0;
    return Math.round((diff / 3600000) * 100) / 100;
  }

  // Daily working hours (decimal) computed from HH:MM strings
  function workDayHours(emp) {
    function toMin(hhmm) {
      var p = hhmm.split(':').map(Number);
      return (p[0] || 0) * 60 + (p[1] || 0);
    }
    var mins = toMin(emp.workEnd) - toMin(emp.workStart);
    return Math.max(0, mins / 60);
  }

  // Count leaves in month
  function countLeavesInMonth(leaves, year, month0) {
    var full = 0, half = 0;
    leaves.forEach(function (l) {
      var d = parseDate(l.date);
      if (!d) return;
      if (d.getFullYear() === year && d.getMonth() === month0) {
        if (l.duration === 'half') half += 1; else full += 1;
      }
    });
    return { full: full, half: half, daysEquiv: full + 0.5 * half };
  }

  // Total attendance hours in month
  function totalHoursInMonth(attendance, year, month0) {
    var total = 0;
    attendance.forEach(function (a) {
      var d = parseDate(a.date);
      if (!d) return;
      if (d.getFullYear() === year && d.getMonth() === month0) {
        total += +a.totalHours || 0;
      }
    });
    return total;
  }

  /** Salary calculator */
  function computeSalary(emp, attendance, leaves, year, month0, settings) {
    settings = settings || Store.getSettings();
    var workingDays = +settings.defaultWorkingDays || 22;
    var breakdown = {
      mode: emp.salaryMode,
      base: 0,
      leaveDeduction: 0,
      regularPay: 0,
      overtimePay: 0,
      overtimeHours: 0,
      regularHours: 0,
      totalHours: totalHoursInMonth(attendance, year, month0),
      net: 0,
      perDayRate: 0,
      workingDays: workingDays,
      fullLeaves: 0,
      halfLeaves: 0
    };

    var counts = countLeavesInMonth(leaves, year, month0);
    breakdown.fullLeaves = counts.full;
    breakdown.halfLeaves = counts.half;

    if (emp.salaryMode === 'fixed') {
      var base = +emp.fixedSalary || 0;
      breakdown.base = base;
      var perDay = workingDays > 0 ? base / workingDays : 0;
      breakdown.perDayRate = Math.round(perDay * 100) / 100;
      var deduction = perDay * counts.full + (perDay * 0.5) * counts.half;
      breakdown.leaveDeduction = Math.round(deduction * 100) / 100;
      breakdown.net = Math.max(0, Math.round((base - deduction) * 100) / 100);
    } else {
      // hourly
      var rate = +emp.hourlyRate || 0;
      var dayHours = workDayHours(emp) || 8;
      var regularCap = dayHours * workingDays;
      var worked = breakdown.totalHours;
      var regular = Math.min(regularCap, worked);
      var ot = settings.otEnabled ? Math.max(0, worked - regularCap) : 0;
      breakdown.regularHours = Math.round(regular * 100) / 100;
      breakdown.overtimeHours = Math.round(ot * 100) / 100;
      breakdown.regularPay = Math.round(regular * rate * 100) / 100;
      breakdown.overtimePay = Math.round(ot * rate * (settings.otMultiplier || 1.5) * 100) / 100;
      breakdown.base = breakdown.regularPay;
      breakdown.net = Math.round((breakdown.regularPay + breakdown.overtimePay) * 100) / 100;
    }
    return breakdown;
  }

  function nextSalaryDate(emp) {
    var today = new Date();
    var day = Math.min(28, Math.max(1, +emp.salaryDay || 25));
    var d = new Date(today.getFullYear(), today.getMonth(), day);
    if (d < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      d = new Date(today.getFullYear(), today.getMonth() + 1, day);
    }
    return d;
  }

  function initials(name) {
    var parts = (name || 'U').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  function avatarColor(seedStr) {
    var palette = ['#4f46e5','#06b6d4','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#0ea5e9','#f97316'];
    var h = 0;
    for (var i = 0; i < (seedStr || '').length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  }

  // Toast notifications
  var toastRoot = function () { return document.getElementById('toast-root'); };
  function toast(msg, kind) {
    var root = toastRoot();
    if (!root) { console.log('[toast]', msg); return; }
    var el = document.createElement('div');
    el.className = 'toast' + (kind === 'error' ? ' error' : '');
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(function () { el.style.opacity = 0; el.style.transition = 'opacity .25s'; }, 2400);
    setTimeout(function () { el.remove(); }, 2900);
  }

  function el(htmlStr) {
    var wrap = document.createElement('div');
    wrap.innerHTML = htmlStr.trim();
    if (wrap.children.length === 1) return wrap.firstElementChild;
    var frag = document.createDocumentFragment();
    while (wrap.firstChild) frag.appendChild(wrap.firstChild);
    return frag;
  }
  function empty(node) { while (node.firstChild) node.removeChild(node.firstChild); }

  // Confirmation dialog (async-ish via callback)
  function confirmDialog(message, onYes, title) {
    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    var body =
      '<div class="modal">' +
        '<div class="modal-head"><h3>' + (title || 'Confirm') + '</h3><button class="close-btn" data-close>&times;</button></div>' +
        '<div class="modal-body"><p>' + message + '</p></div>' +
        '<div class="modal-foot"><button class="btn" data-close>Cancel</button><button class="btn btn-danger" data-yes>Yes</button></div>' +
      '</div>';
    back.innerHTML = body;
    document.body.appendChild(back);
    function close() { back.remove(); }
    back.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-close') || e.target === back) close();
      if (e.target.hasAttribute('data-yes')) { close(); if (onYes) onYes(); }
    });
  }

  function openModal(titleHtml, bodyHtml, footerHtml) {
    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML =
      '<div class="modal">' +
        '<div class="modal-head"><h3>' + titleHtml + '</h3><button class="close-btn" data-close>&times;</button></div>' +
        '<div class="modal-body"></div>' +
        '<div class="modal-foot"></div>' +
      '</div>';
    var body = back.querySelector('.modal-body');
    var foot = back.querySelector('.modal-foot');
    body.appendChild(typeof bodyHtml === 'string' ? el(bodyHtml) : bodyHtml);
    if (footerHtml) foot.appendChild(typeof footerHtml === 'string' ? el(footerHtml) : footerHtml);
    document.body.appendChild(back);
    function close() { back.remove(); }
    back.addEventListener('click', function (e) {
      if (e.target === back || e.target.hasAttribute('data-close')) close();
    });
    return { wrapper: back, body: body, footer: foot, close: close };
  }

  // Scope helper: admin sees everything, employee only their own
  function visibleEmployeeId(session, desiredEmployeeId) {
    if (session.role === 'admin') return desiredEmployeeId || session.employeeId;
    return session.employeeId;
  }

  global.Utils = {
    pad: pad,
    fmtDate: fmtDate,
    parseDate: parseDate,
    startOfMonth: startOfMonth,
    endOfMonth: endOfMonth,
    addMonths: addMonths,
    sameDay: sameDay,
    daysInMonth: daysInMonth,
    buildMonthGrid: buildMonthGrid,
    weekdayLabels: weekdayLabels,
    monthName: monthName,
    monthYear: monthYear,
    todayStr: todayStr,
    fmtHours: fmtHours,
    fmtTime: fmtTime,
    fmtDateTime: fmtDateTime,
    fmtCurrency: fmtCurrency,
    computeHours: computeHours,
    workDayHours: workDayHours,
    countLeavesInMonth: countLeavesInMonth,
    totalHoursInMonth: totalHoursInMonth,
    computeSalary: computeSalary,
    nextSalaryDate: nextSalaryDate,
    initials: initials,
    avatarColor: avatarColor,
    toast: toast,
    el: el,
    empty: empty,
    confirmDialog: confirmDialog,
    openModal: openModal,
    visibleEmployeeId: visibleEmployeeId
  };
})(window);
