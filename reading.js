/* eLectura · medidor de lectura: cálculos puros (sin interfaz). Expone window.Reading.
   El registro por perfil es { 'AAAA-MM-DD': { sec: segundos leídos, pages: páginas avanzadas } }. */
(function () {
  'use strict';
  var DAY = 86400000;

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fromKey(k) { var p = k.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  // Lunes como inicio de semana.
  function weekStart(d) { var w = (d.getDay() + 6) % 7; return addDays(d, -w); }
  function weekKey(d) { return dayKey(weekStart(d)); }

  // Cada día guarda la meta vigente ese día: cambiar la meta después no altera días pasados ni la racha.
  function add(log, now, sec, pages, goalSec) {
    var k = dayKey(now);
    var cur = log[k] || { sec: 0, pages: 0 };
    var next = Object.assign({}, log);
    next[k] = { sec: cur.sec + (sec || 0), pages: cur.pages + (pages || 0), goal: goalSec || cur.goal };
    return next;
  }
  function setGoal(log, now, goalSec) {
    var k = dayKey(now);
    if (!log[k]) return log;
    var next = Object.assign({}, log); next[k] = Object.assign({}, log[k], { goal: goalSec }); return next;
  }
  function goalOf(log, d, goalSec) { var e = log[dayKey(d)]; return e && e.goal ? e.goal : goalSec; }
  function secOf(log, d) { var e = log[dayKey(d)]; return e ? e.sec : 0; }
  function pagesOf(log, d) { var e = log[dayKey(d)]; return e ? e.pages : 0; }
  function met(log, d, goalSec) { return secOf(log, d) >= goalOf(log, d, goalSec); }
  function firstDay(log) {
    var ks = Object.keys(log).filter(function (k) { return log[k].sec > 0; }).sort();
    return ks.length ? fromKey(ks[0]) : null;
  }

  /* Racha: días con meta cumplida seguidos; se permite 1 día sin cumplir por semana (lunes a domingo).
     Si hoy aún no se cumple la meta, la racha no se rompe: se cuenta desde ayer. */
  function streak(log, goalSec, today) {
    today = today || new Date();
    var first = firstDay(log);
    if (!first) return { days: 0, restAvailable: true };
    var d = met(log, today, goalSec) ? today : addDays(today, -1);
    var used = {}, count = 0;
    while (d >= first) {
      if (met(log, d, goalSec)) count++;
      else {
        var wk = weekKey(d);
        if (used[wk]) break;
        used[wk] = true;
      }
      d = addDays(d, -1);
    }
    // Descanso disponible: ningún día anterior a hoy en esta semana quedó sin cumplir.
    var ws = weekStart(today), rest = true;
    for (var x = ws; x < today && dayKey(x) !== dayKey(today); x = addDays(x, 1)) {
      if (x >= first && !met(log, x, goalSec)) { rest = false; break; }
    }
    return { days: count, restAvailable: rest };
  }

  function bestStreak(log, goalSec, today) {
    today = today || new Date();
    var first = firstDay(log);
    if (!first) return 0;
    var best = 0, cur = 0, used = {};
    for (var d = first; d <= today; d = addDays(d, 1)) {
      if (met(log, d, goalSec)) { cur++; if (cur > best) best = cur; }
      else if (dayKey(d) !== dayKey(today)) {
        var wk = weekKey(d);
        if (used[wk]) { cur = 0; used = {}; } else used[wk] = true;
      }
    }
    return best;
  }

  // Semana actual: estado de cada día (lunes a domingo).
  function weekView(log, goalSec, today) {
    today = today || new Date();
    var ws = weekStart(today), tk = dayKey(today), out = [], first = firstDay(log);
    var labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    for (var i = 0; i < 7; i++) {
      var d = addDays(ws, i), k = dayKey(d), s = secOf(log, d);
      var state = s >= goalOf(log, d, goalSec) ? 'met' : (k === tk ? 'today' : (d > today ? 'future' : (!first || d < first ? 'none' : (s > 0 ? 'partial' : 'missed'))));
      out.push({ label: labels[i], key: k, sec: s, state: state, isToday: k === tk });
    }
    return out;
  }

  function sumRange(log, from, to) {
    var sec = 0, pages = 0, metDays = 0, days = 0;
    return function (goalSec) {
      for (var d = from; d <= to; d = addDays(d, 1)) {
        sec += secOf(log, d); pages += pagesOf(log, d); days++;
        if (secOf(log, d) >= goalOf(log, d, goalSec)) metDays++;
      }
      return { sec: sec, pages: pages, metDays: metDays, days: days };
    };
  }

  // Series para las gráficas: semana (por día), mes (por semana), año (por mes). Valores en minutos.
  function series(log, period, today) {
    today = today || new Date();
    var out = [];
    if (period === 'semana') {
      var ws = weekStart(today);
      for (var i = 0; i < 7; i++) { var d = addDays(ws, i); out.push({ label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i], min: secOf(log, d) / 60, future: d > today }); }
      return { bars: out, from: ws, to: addDays(ws, 6) };
    }
    if (period === 'mes') {
      var m0 = new Date(today.getFullYear(), today.getMonth(), 1), m1 = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      var start = m0, n = 1;
      while (start <= m1) {
        var end = addDays(weekStart(start), 6); if (end > m1) end = m1;
        var s = 0; for (var x = start; x <= end; x = addDays(x, 1)) s += secOf(log, x);
        out.push({ label: 'S' + n, min: s / 60, future: start > today, days: Math.round((end - start) / DAY) + 1 });
        start = addDays(end, 1); n++;
      }
      return { bars: out, from: m0, to: m1 };
    }
    var y = today.getFullYear(), names = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    for (var mo = 0; mo < 12; mo++) {
      var a = new Date(y, mo, 1), b = new Date(y, mo + 1, 0), t = 0;
      for (var z = a; z <= b; z = addDays(z, 1)) t += secOf(log, z);
      out.push({ label: names[mo], min: t / 60, future: a > today, days: b.getDate() });
    }
    return { bars: out, from: new Date(y, 0, 1), to: new Date(y, 11, 31) };
  }

  function totals(log, from, to, goalSec, today) {
    var end = to > today ? today : to;
    return sumRange(log, from, end)(goalSec);
  }

  /* Proyección de libros al año: minutos diarios promedio (últimos 28 días desde que empezó)
     × páginas por minuto ÷ páginas promedio de un libro. */
  function projection(log, today, avgBookPages) {
    today = today || new Date();
    var first = firstDay(log);
    if (!first) return null;
    var from = addDays(today, -27); if (first > from) from = first;
    var t = sumRange(log, from, today)(Infinity);
    var activeDays = Object.keys(log).filter(function (k) { return log[k].sec > 0; }).length;
    if (activeDays < 3 || t.sec < 300) return null;
    var minPerDay = t.sec / 60 / t.days;
    var pagesPerMin = t.pages > 0 ? t.pages / (t.sec / 60) : 1;
    var books = minPerDay * 365 * pagesPerMin / (avgBookPages || 400);
    return { booksPerYear: books, minPerDay: minPerDay };
  }

  window.Reading = {
    dayKey: dayKey, fromKey: fromKey, addDays: addDays, weekStart: weekStart,
    add: add, setGoal: setGoal, goalOf: goalOf, secOf: secOf, streak: streak, bestStreak: bestStreak, weekView: weekView,
    series: series, totals: totals, projection: projection
  };
})();
