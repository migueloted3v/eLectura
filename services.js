/* eLectura · servicios sin interfaz: almacenamiento, formatos, búsquedas y nube.
   JavaScript clásico (sin JSX). Expone window.Svc. */
(function () {
  'use strict';
  var CFG = window.ELECTURA_CONFIG || {};

  /* ---------- IndexedDB ---------- */
  var DB_NAME = 'electura';
  var dbPromise = null;
  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
        if (!db.objectStoreNames.contains('books')) db.createObjectStore('books', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function tx(store, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var s = t.objectStore(store);
        var out = fn(s);
        t.oncomplete = function () { resolve(out && out.result !== undefined ? out.result : out); };
        t.onerror = function () { reject(t.error); };
        t.onabort = function () { reject(t.error); };
      });
    });
  }
  var db = {
    get: function (store, key) { return tx(store, 'readonly', function (s) { return s.get(key); }); },
    put: function (store, val, key) { return tx(store, 'readwrite', function (s) { return key === undefined ? s.put(val) : s.put(val, key); }); },
    del: function (store, key) { return tx(store, 'readwrite', function (s) { return s.delete(key); }); },
    all: function (store) { return tx(store, 'readonly', function (s) { return s.getAll(); }); }
  };
  var kv = {
    get: function (k, fallback) { return db.get('kv', k).then(function (v) { return v === undefined ? fallback : v; }); },
    set: function (k, v) { return db.put('kv', v, k); }
  };

  /* ---------- Utilidades ---------- */
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function formatOf(name, type) {
    var n = (name || '').toLowerCase();
    if (n.endsWith('.epub') || type === 'application/epub+zip') return 'epub';
    if (n.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
    return null;
  }
  function cleanName(name) { return (name || 'Libro').replace(/\.(epub|pdf)$/i, '').replace(/[_]+/g, ' ').trim(); }
  function langCode(l) { l = (l || '').toLowerCase(); if (l.indexOf('en') === 0) return 'en'; if (l.indexOf('es') === 0 || l === 'spa') return 'es'; if (l === 'eng') return 'en'; return l ? l.slice(0, 2) : ''; }
  function mb(bytes) { return (bytes / 1048576).toFixed(bytes < 10485760 ? 1 : 0) + ' MB'; }
  function withTimeout(p, ms) {
    return Promise.race([p, new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, ms); })]);
  }

  /* ---------- Lectura de metadatos ---------- */
  function readEpubMeta(buf) {
    var book = window.ePub(buf);
    return withTimeout(book.loaded.metadata, 15000).then(function (m) {
      return withTimeout(book.coverUrl(), 8000).catch(function () { return null; }).then(function (url) {
        var coverP = url ? fetch(url).then(function (r) { return r.blob(); }).catch(function () { return null; }) : Promise.resolve(null);
        return coverP.then(function (cover) {
          try { book.destroy(); } catch (e) {}
          return { title: m.title, author: m.creator, lang: langCode(m.language), cover: cover };
        });
      });
    });
  }
  function readPdfMeta(buf) {
    var task = window.pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) });
    return withTimeout(task.promise, 20000).then(function (pdf) {
      return pdf.getMetadata().catch(function () { return {}; }).then(function (md) {
        var info = (md && md.info) || {};
        var pages = pdf.numPages;
        pdf.destroy();
        return { title: info.Title, author: info.Author, lang: langCode(info.Language), pages: pages };
      });
    });
  }

  /* ---------- Libros ---------- */
  function listBooks(profileId) {
    return db.all('books').then(function (all) {
      return all.filter(function (b) { return b.profileId === profileId; })
        .sort(function (a, b) { return (b.openedAt || b.addedAt) - (a.openedAt || a.addedAt); });
    });
  }
  function saveBookFromBlob(blob, fileName, profileId, hint) {
    hint = hint || {};
    var format = formatOf(fileName, blob.type);
    if (!format) return Promise.reject(new Error('Solo se pueden guardar archivos EPUB o PDF.'));
    var fingerprint = fingerprintOf(fileName, blob.size);
    return blob.arrayBuffer().then(function (buf) {
      var metaP = format === 'epub' ? readEpubMeta(buf) : readPdfMeta(buf);
      return metaP.catch(function () { return {}; }).then(function (m) {
        return listBooks(profileId).then(function (books) {
          var existing = books.filter(function (b) { return b.fingerprint === fingerprint; })[0];
          var id = existing ? existing.id : uid();
          var meta = Object.assign({}, existing || {}, {
            id: id, profileId: profileId, format: format, fingerprint: fingerprint,
            title: (m.title || hint.title || cleanName(fileName)).trim(),
            author: (m.author || hint.author || '').trim(),
            lang: m.lang || hint.lang || (existing && existing.lang) || '',
            size: blob.size, pages: m.pages || (existing && existing.pages) || null,
            hasFile: true, addedAt: existing ? existing.addedAt : Date.now(),
            source: hint.source || (existing && existing.source) || 'archivo',
            hasCover: !!m.cover
          });
          var writes = [db.put('files', blob, id), db.put('books', meta)];
          if (m.cover) writes.push(db.put('files', m.cover, 'cover:' + id));
          return Promise.all(writes).then(function () { return { meta: meta, reattached: !!existing }; });
        });
      });
    });
  }
  function updateBook(meta) { return db.put('books', meta); }
  function getFile(id) { return db.get('files', id); }
  function getCover(id) { return db.get('files', 'cover:' + id); }
  function freeBook(meta) {
    return db.del('files', meta.id).then(function () {
      return db.put('books', Object.assign({}, meta, { hasFile: false }));
    });
  }
  function deleteBook(meta) {
    return Promise.all([db.del('files', meta.id), db.del('files', 'cover:' + meta.id), db.del('books', meta.id)]);
  }

  /* ---------- Almacenamiento del navegador ---------- */
  function storageInfo() {
    if (!navigator.storage || !navigator.storage.estimate) return Promise.resolve(null);
    return navigator.storage.estimate().then(function (e) {
      var persistedP = navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false);
      return persistedP.then(function (p) { return { usage: e.usage || 0, quota: e.quota || 0, persisted: p }; });
    });
  }
  function requestPersist() {
    if (!navigator.storage || !navigator.storage.persist) return Promise.resolve(false);
    return navigator.storage.persist().catch(function () { return false; });
  }

  /* ---------- Descargas ---------- */
  function downloadBlob(url) {
    return fetch(url, { mode: 'cors' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.blob();
    });
  }

  /* ---------- Fuentes de libros ---------- */
  var DEFAULT_SOURCES = [
    { id: 'gutenberg', name: 'Project Gutenberg', type: 'gutendex', url: 'https://www.gutenberg.org', builtIn: true },
    { id: 'openlibrary', name: 'Open Library', type: 'openlibrary', url: 'https://openlibrary.org', builtIn: true },
    { id: 'standard', name: 'Standard Ebooks', type: 'link', url: 'https://standardebooks.org/ebooks', builtIn: true }
  ];

  function searchGutenberg(q, lang) {
    var url = 'https://gutendex.com/books/?search=' + encodeURIComponent(q) + (lang ? '&languages=' + lang : '');
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) {
      return (d.results || []).map(function (b) {
        var f = b.formats || {};
        var epub = f['application/epub+zip'];
        return {
          key: 'g' + b.id, title: b.title, author: (b.authors || []).map(function (a) { return a.name; }).join(', '),
          lang: langCode((b.languages || [])[0]), format: 'epub', download: epub || null,
          page: 'https://www.gutenberg.org/ebooks/' + b.id, canDownload: !!epub,
          cover: f['image/jpeg'] || null
        };
      }).filter(function (b) { return b.canDownload; });
    });
  }

  function searchOpenLibrary(q, lang) {
    var fields = 'key,title,author_name,ia,ebook_access,language,cover_i';
    var url = 'https://openlibrary.org/search.json?q=' + encodeURIComponent(q) + '&has_fulltext=true&limit=20&fields=' + fields +
      (lang ? '&language=' + (lang === 'en' ? 'eng' : lang === 'es' ? 'spa' : lang) : '');
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) {
      return (d.docs || []).map(function (b) {
        var ia = (b.ia || [])[0];
        var isPublic = b.ebook_access === 'public' && !!ia;
        return {
          key: 'ol' + b.key, title: b.title, author: (b.author_name || []).slice(0, 2).join(', '),
          lang: lang || '', format: 'epub',
          download: isPublic ? 'https://archive.org/download/' + ia + '/' + ia + '.epub' : null,
          page: ia ? 'https://archive.org/details/' + ia : 'https://openlibrary.org' + b.key,
          canDownload: isPublic, lendOnly: !isPublic,
          cover: b.cover_i ? 'https://covers.openlibrary.org/b/id/' + b.cover_i + '-S.jpg' : null
        };
      });
    });
  }

  function searchOpds(source, q) {
    return fetch(source.url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (xml) {
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var entries = Array.prototype.slice.call(doc.getElementsByTagName('entry'));
      var needle = (q || '').toLowerCase();
      return entries.map(function (e, i) {
        var t = e.getElementsByTagName('title')[0];
        var a = e.getElementsByTagName('name')[0];
        var links = Array.prototype.slice.call(e.getElementsByTagName('link'));
        var acq = links.filter(function (l) {
          var rel = l.getAttribute('rel') || '', type = l.getAttribute('type') || '';
          return rel.indexOf('acquisition') >= 0 && (type.indexOf('epub') >= 0 || type.indexOf('pdf') >= 0);
        })[0];
        var href = acq ? new URL(acq.getAttribute('href'), source.url).href : null;
        return {
          key: source.id + i, title: t ? t.textContent : 'Sin título', author: a ? a.textContent : '',
          lang: '', format: acq && (acq.getAttribute('type') || '').indexOf('pdf') >= 0 ? 'pdf' : 'epub',
          download: href, page: href || source.url, canDownload: !!href
        };
      }).filter(function (b) {
        return !needle || (b.title + ' ' + b.author).toLowerCase().indexOf(needle) >= 0;
      });
    });
  }

  /* ---------- Diccionario y traducción ---------- */
  function define(word) {
    return fetch('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(word.toLowerCase()))
      .then(function (r) {
        if (r.status === 404) return null;
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (d) {
        if (!d || !d.length) return null;
        var e = d[0];
        var phonetic = e.phonetic || ((e.phonetics || []).filter(function (p) { return p.text; })[0] || {}).text || '';
        var meanings = (e.meanings || []).slice(0, 3).map(function (m) {
          return { pos: m.partOfSpeech, defs: (m.definitions || []).slice(0, 2).map(function (x) { return { text: x.definition, example: x.example || '' }; }) };
        });
        return { word: e.word, phonetic: phonetic, meanings: meanings };
      });
  }
  function translate(text, from, to) {
    var pair = (from || 'en') + '|' + (to || CFG.TRANSLATE_TO || 'es-MX');
    var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) + '&langpair=' + encodeURIComponent(pair) +
      (CFG.MYMEMORY_EMAIL ? '&de=' + encodeURIComponent(CFG.MYMEMORY_EMAIL) : '');
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }).then(function (d) {
      var main = d && d.responseData ? d.responseData.translatedText : '';
      var seen = {};
      var alts = ((d && d.matches) || []).map(function (m) { return (m.translation || '').trim(); })
        .filter(function (t) { var k = t.toLowerCase(); if (!t || seen[k] || k === (main || '').toLowerCase()) return false; seen[k] = 1; return t.length < 40; })
        .slice(0, 3);
      return { main: main, alts: alts };
    });
  }

  /* ---------- Google Drive ---------- */
  var driveToken = null, driveTokenExp = 0, tokenClient = null;
  function driveConfigured() { return !!CFG.GOOGLE_CLIENT_ID; }
  function driveConnect() {
    return new Promise(function (resolve, reject) {
      if (!driveConfigured()) return reject(new Error('Falta el Client ID de Google en config.js.'));
      if (!window.google || !google.accounts || !google.accounts.oauth2) return reject(new Error('No cargó el servicio de Google. Revisa tu conexión.'));
      if (driveToken && Date.now() < driveTokenExp) return resolve(driveToken);
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CFG.GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: function (resp) {
          if (resp.error) return reject(new Error(resp.error));
          driveToken = resp.access_token;
          driveTokenExp = Date.now() + (resp.expires_in - 60) * 1000;
          resolve(driveToken);
        }
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  }
  function driveFetch(path) {
    return fetch('https://www.googleapis.com/drive/v3/' + path, { headers: { Authorization: 'Bearer ' + driveToken } })
      .then(function (r) { if (r.status === 401) { driveToken = null; throw new Error('La sesión de Google expiró. Conecta de nuevo.'); } if (!r.ok) throw new Error('HTTP ' + r.status); return r; });
  }
  function driveList(q) {
    var folder = (CFG.DRIVE_FOLDER || 'Libros').replace(/'/g, "\\'");
    var fq = "mimeType='application/vnd.google-apps.folder' and name='" + folder + "' and trashed=false";
    return driveFetch('files?fields=files(id,name)&q=' + encodeURIComponent(fq)).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.files || !d.files.length) throw new Error('No encontré la carpeta "' + (CFG.DRIVE_FOLDER || 'Libros') + '" en tu Google Drive.');
      var parents = d.files.map(function (f) { return "'" + f.id + "' in parents"; }).join(' or ');
      var query = '(' + parents + ") and trashed=false and (mimeType='application/epub+zip' or mimeType='application/pdf' or name contains '.epub' or name contains '.pdf')";
      if (q) query += " and name contains '" + q.replace(/'/g, "\\'") + "'";
      return driveFetch('files?pageSize=100&orderBy=name&fields=files(id,name,size,mimeType)&q=' + encodeURIComponent(query));
    }).then(function (r) { return r.json(); }).then(function (d) { return d.files || []; });
  }
  function driveDownload(file) {
    return driveFetch('files/' + file.id + '?alt=media').then(function (r) { return r.blob(); });
  }

  /* ---------- Respaldo ---------- */
  function exportBackup() {
    return Promise.all([db.all('books'), openDB().then(function (d) {
      return new Promise(function (resolve) {
        var out = {}; var t = d.transaction('kv'); var s = t.objectStore('kv');
        var req = s.openCursor();
        req.onsuccess = function () { var c = req.result; if (c) { out[c.key] = c.value; c.continue(); } else resolve(out); };
      });
    })]).then(function (res) {
      var books = res[0].map(function (b) { return Object.assign({}, b, { hasFile: false }); });
      return { app: 'electura', version: 1, exportedAt: new Date().toISOString(), kv: res[1], books: books };
    });
  }
  function importBackup(data) {
    if (!data || data.app !== 'electura') return Promise.reject(new Error('Ese archivo no es un respaldo de eLectura.'));
    return db.all('books').then(function (current) {
      var byId = {}; current.forEach(function (b) { byId[b.id] = b; });
      var writes = Object.keys(data.kv || {}).map(function (k) { return kv.set(k, data.kv[k]); });
      (data.books || []).forEach(function (b) {
        var cur = byId[b.id];
        writes.push(db.put('books', Object.assign({}, b, { hasFile: cur ? cur.hasFile : false })));
      });
      return Promise.all(writes);
    });
  }

  function fingerprintOf(name, size) { return cleanName(name).toLowerCase() + '|' + size; }

  window.Svc = {
    kv: kv, fingerprintOf: fingerprintOf, cleanName: cleanName, uid: uid, mb: mb, formatOf: formatOf, langCode: langCode,
    listBooks: listBooks, saveBookFromBlob: saveBookFromBlob, updateBook: updateBook,
    getFile: getFile, getCover: getCover, freeBook: freeBook, deleteBook: deleteBook,
    storageInfo: storageInfo, requestPersist: requestPersist, downloadBlob: downloadBlob,
    DEFAULT_SOURCES: DEFAULT_SOURCES, searchGutenberg: searchGutenberg, searchOpenLibrary: searchOpenLibrary, searchOpds: searchOpds,
    define: define, translate: translate,
    driveConfigured: driveConfigured, driveConnect: driveConnect, driveList: driveList, driveDownload: driveDownload,
    exportBackup: exportBackup, importBackup: importBackup
  };
})();
