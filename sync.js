/* eLectura · sincronización entre aparatos: mezcla pura (sin red). Expone window.Sync.
   Documento en Drive (uno por perfil):
   { v, profile, updatedAt,
     devices:  { idAparato: { name, reading: { día: { sec, pages, goal } }, at } },  ← cada aparato escribe solo lo suyo
     settings: { value, at },                                                     ← gana el más reciente
     progress: { claveLibro: { cfi, percent, page, title, at } },                  ← gana el más reciente
     quotes:   { id: cita | { deleted: true, at } },                               ← gana el más reciente (borrados incluidos)
     vocab:    { id: palabra | { deleted: true, at } } } */
(function () {
  'use strict';

  function deviceId() {
    var id = null;
    try { id = localStorage.getItem('electura-device'); } catch (e) {}
    if (!id) {
      id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      try { localStorage.setItem('electura-device', id); } catch (e) {}
    }
    return id;
  }
  function deviceName() {
    var ua = navigator.userAgent || '';
    if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return 'iPad';
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/Android/.test(ua)) return /Mobile/.test(ua) ? 'Cel Android' : 'Tablet Android';
    return 'Computadora';
  }

  // Suma de registros diarios de varios aparatos (la meta del día: la del primero que la tenga).
  function sumLogs(logs) {
    var out = {};
    (logs || []).forEach(function (log) {
      Object.keys(log || {}).forEach(function (k) {
        var e = log[k], cur = out[k] || { sec: 0, pages: 0 };
        out[k] = { sec: cur.sec + (e.sec || 0), pages: cur.pages + (e.pages || 0), goal: cur.goal || e.goal };
      });
    });
    return out;
  }

  var LOCAL_ONLY = { syncEnabled: 1, syncAuto: 1, _ts: 1, _at: 1 };
  function stamp(x) { return (x && (x.updatedAt || x.at || x.date && Date.parse(x.date))) || 0; }

  // Mezcla de colecciones con borrados: cada elemento gana por fecha de cambio.
  function mergeItems(localArr, localDeleted, remoteMap) {
    var out = {};
    Object.keys(remoteMap || {}).forEach(function (id) { out[id] = remoteMap[id]; });
    (localArr || []).forEach(function (it) {
      var r = out[it.id];
      if (!r || stamp(it) >= stamp(r)) out[it.id] = it;
    });
    Object.keys(localDeleted || {}).forEach(function (id) {
      var at = localDeleted[id], r = out[id];
      if (!r || at >= stamp(r)) out[id] = { deleted: true, at: at };
    });
    var items = [], deleted = {};
    Object.keys(out).forEach(function (id) {
      var v = out[id];
      if (v.deleted) deleted[id] = v.at; else items.push(v);
    });
    items.sort(function (a, b) { return stamp(b) - stamp(a); });
    return { map: out, items: items, deleted: deleted };
  }

  /* local: { deviceId, deviceName, profile, reading, settings: { value, at }, quotes, quotesDeleted,
              vocab, vocabDeleted, progress: { clave: { cfi, percent, page, title, at } } }
     remote: documento de Drive o null. Devuelve { doc, apply }. */
  function merge(local, remote, now) {
    now = now || Date.now();
    remote = remote && remote.v === 1 ? remote : { v: 1, devices: {}, progress: {}, quotes: {}, vocab: {} };
    var devices = Object.assign({}, remote.devices || {});
    devices[local.deviceId] = { name: local.deviceName, reading: local.reading || {}, at: now };

    // Ajustes: cada campo gana por separado (cambiar la meta en un aparato no se pierde si en otro cambiaste el color).
    var rs = remote.settings || { value: {}, ts: {} }, ls = local.settings || { value: {}, ts: {} };
    var sv = {}, sts = {}, changed = false;
    Object.keys(Object.assign({}, rs.value, ls.value)).forEach(function (k) {
      if (LOCAL_ONLY[k]) return;
      var lt = (ls.ts || {})[k] || 0, rt = (rs.ts || {})[k] || (k in (rs.value || {}) ? (rs.at || 1) : 0);
      if (rt > lt && k in (rs.value || {})) { sv[k] = rs.value[k]; sts[k] = rt; if (JSON.stringify(rs.value[k]) !== JSON.stringify((ls.value || {})[k])) changed = true; }
      else if (k in (ls.value || {})) { sv[k] = ls.value[k]; sts[k] = lt; }
    });
    var settings = { value: sv, ts: sts };

    var progress = Object.assign({}, remote.progress || {});
    Object.keys(local.progress || {}).forEach(function (k) {
      var l = local.progress[k], r = progress[k];
      if (!r || (l.at || 0) > (r.at || 0)) progress[k] = l;
    });

    var q = mergeItems(local.quotes, local.quotesDeleted, remote.quotes);
    var w = mergeItems(local.vocab, local.vocabDeleted, remote.vocab);

    var doc = { v: 1, profile: local.profile, updatedAt: now, devices: devices, settings: settings, progress: progress, quotes: q.map, vocab: w.map };
    var others = {};
    Object.keys(devices).forEach(function (id) { if (id !== local.deviceId) others[id] = devices[id]; });
    return {
      doc: doc,
      apply: {
        others: others,
        settings: changed ? settings : null,
        progress: progress,
        quotes: q.items, quotesDeleted: q.deleted,
        vocab: w.items, vocabDeleted: w.deleted
      }
    };
  }

  window.Sync = { deviceId: deviceId, deviceName: deviceName, sumLogs: sumLogs, merge: merge, mergeItems: mergeItems };
})();
