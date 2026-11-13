/* eLectura · conversión de Word (.docx) y PDF a EPUB, dentro del cel y sin internet.
   JavaScript clásico (sin JSX). Expone window.Conv.
   Usa JSZip y pdf.js (ya cargados) y mammoth.js (se carga solo al convertir un Word). */
(function () {
  'use strict';
  var MAMMOTH_URL = 'https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js';

  /* ---------- Utilidades ---------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function baseName(name) { return String(name || 'Documento').replace(/\.(docx|pdf)$/i, '').replace(/[_]+/g, ' ').trim() || 'Documento'; }
  function kindOf(name, type) {
    var n = String(name || '').toLowerCase();
    if (n.endsWith('.docx') || type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'docx';
    if (n.endsWith('.doc') || type === 'application/msword') return 'doc';
    if (n.endsWith('.pdf') || type === 'application/pdf') return 'pdf';
    if (n.endsWith('.epub') || type === 'application/epub+zip') return 'epub';
    return null;
  }
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve;
      s.onerror = function () { reject(new Error('No pude cargar el convertidor de Word. Conéctate a internet una vez y vuelve a intentar.')); };
      document.head.appendChild(s);
    });
  }
  function ensureMammoth() { return window.mammoth ? Promise.resolve(window.mammoth) : loadScript(MAMMOTH_URL).then(function () { return window.mammoth; }); }

  // Adivina el idioma con palabras frecuentes (sirve para la consulta de palabras).
  function guessLang(text) {
    var words = String(text || '').toLowerCase().slice(0, 20000).split(/[^a-záéíóúñü]+/);
    var en = { the: 1, and: 1, of: 1, to: 1, is: 1, that: 1, it: 1, was: 1, with: 1, for: 1, you: 1, he: 1, she: 1 };
    var es = { el: 1, la: 1, de: 1, que: 1, y: 1, los: 1, las: 1, por: 1, con: 1, una: 1, para: 1, del: 1, se: 1 };
    var e = 0, s = 0;
    words.forEach(function (w) { if (en[w]) e++; if (es[w]) s++; });
    if (e + s < 20) return '';
    return e > s ? 'en' : 'es';
  }

  /* ---------- Armado del EPUB ---------- */
  function chapterXhtml(title, body, lang) {
    return '<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html>\n' +
      '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="' + esc(lang) + '" xml:lang="' + esc(lang) + '">\n' +
      '<head><meta charset="utf-8"/><title>' + esc(title) + '</title><link rel="stylesheet" type="text/css" href="style.css"/></head>\n' +
      '<body>\n' + body + '\n</body>\n</html>\n';
  }
  var CSS = 'body{margin:0 4%;line-height:1.6}h1,h2,h3{line-height:1.25;margin:1.2em 0 .6em}p{margin:0 0 .8em;text-align:left}' +
    'img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:4px}';

  function buildEpub(book) {
    var lang = book.lang || 'es';
    var id = 'urn:uuid:' + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    var zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
    zip.file('META-INF/container.xml', '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">' +
      '<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
    zip.file('OEBPS/style.css', CSS);

    var manifest = ['<item id="css" href="style.css" media-type="text/css"/>',
      '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
      '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>'];
    var spine = [];
    var navItems = [], ncxPoints = [];
    book.chapters.forEach(function (c, i) {
      var file = 'c' + String(i + 1).padStart(3, '0') + '.xhtml';
      zip.file('OEBPS/' + file, chapterXhtml(c.title, c.html, lang));
      manifest.push('<item id="c' + (i + 1) + '" href="' + file + '" media-type="application/xhtml+xml"/>');
      spine.push('<itemref idref="c' + (i + 1) + '"/>');
      navItems.push('<li><a href="' + file + '">' + esc(c.title) + '</a></li>');
      ncxPoints.push('<navPoint id="n' + (i + 1) + '" playOrder="' + (i + 1) + '"><navLabel><text>' + esc(c.title) + '</text></navLabel><content src="' + file + '"/></navPoint>');
    });
    (book.images || []).forEach(function (img, i) {
      zip.file('OEBPS/' + img.href, img.data, { base64: typeof img.data === 'string' });
      manifest.push('<item id="img' + (i + 1) + '" href="' + img.href + '" media-type="' + img.type + '"/>');
    });

    var modified = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    zip.file('OEBPS/content.opf', '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="' + esc(lang) + '">\n' +
      '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">' +
      '<dc:identifier id="bookid">' + id + '</dc:identifier>' +
      '<dc:title>' + esc(book.title) + '</dc:title>' +
      (book.author ? '<dc:creator>' + esc(book.author) + '</dc:creator>' : '') +
      '<dc:language>' + esc(lang) + '</dc:language>' +
      '<meta property="dcterms:modified">' + modified + '</meta>' +
      '<meta name="generator" content="eLectura"/></metadata>\n' +
      '<manifest>' + manifest.join('') + '</manifest>\n' +
      '<spine toc="ncx">' + spine.join('') + '</spine>\n</package>\n');
    zip.file('OEBPS/nav.xhtml', chapterXhtml('Contenido', '<nav epub:type="toc" id="toc"><h1>Contenido</h1><ol>' + navItems.join('') + '</ol></nav>', lang));
    zip.file('OEBPS/toc.ncx', '<?xml version="1.0" encoding="utf-8"?>\n' +
      '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="' + id + '"/></head>' +
      '<docTitle><text>' + esc(book.title) + '</text></docTitle><navMap>' + ncxPoints.join('') + '</navMap></ncx>');

    return zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' });
  }

  /* ---------- Word (.docx) ---------- */
  function docxMeta(buf) {
    return JSZip.loadAsync(buf).then(function (z) {
      var f = z.file('docProps/core.xml');
      return f ? f.async('string') : '';
    }).then(function (xml) {
      if (!xml) return {};
      var doc = new DOMParser().parseFromString(xml, 'application/xml');
      var pick = function (tag) { var n = doc.getElementsByTagName(tag)[0]; return n ? n.textContent.trim() : ''; };
      return { title: pick('dc:title'), author: pick('dc:creator') };
    }).catch(function () { return {}; });
  }

  function splitChapters(bodyEl, fallbackTitle) {
    var ser = new XMLSerializer();
    var nodes = Array.prototype.slice.call(bodyEl.childNodes);
    var level = bodyEl.querySelector('h1') ? 'H1' : bodyEl.querySelector('h2') ? 'H2' : null;
    var chapters = [], cur = null;
    nodes.forEach(function (n) {
      if (n.nodeType === 3 && !n.textContent.trim()) return;
      if (level && n.nodeName === level) {
        cur = { title: n.textContent.trim() || fallbackTitle, parts: [] };
        chapters.push(cur);
      }
      if (!cur) { cur = { title: fallbackTitle, parts: [] }; chapters.push(cur); }
      cur.parts.push(n.nodeType === 1 ? ser.serializeToString(n) : esc(n.textContent));
    });
    if (!chapters.length) chapters.push({ title: fallbackTitle, parts: ['<p></p>'] });
    return chapters.map(function (c) { return { title: c.title.slice(0, 120), html: c.parts.join('\n') }; });
  }

  function docxToEpub(blob, fileName, onProgress) {
    var progress = onProgress || function () {};
    var images = [];
    progress('Leyendo el documento de Word');
    return Promise.all([blob.arrayBuffer(), ensureMammoth()]).then(function (r) {
      var buf = r[0], mammoth = r[1];
      return Promise.all([docxMeta(buf.slice(0)), mammoth.convertToHtml({ arrayBuffer: buf }, {
        convertImage: mammoth.images.imgElement(function (image) {
          return image.read('base64').then(function (b64) {
            var type = image.contentType || 'image/png';
            var ext = (type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg');
            var href = 'images/img' + (images.length + 1) + '.' + ext;
            images.push({ href: href, type: type, data: b64 });
            return { src: href };
          });
        })
      })]);
    }).then(function (r) {
      var meta = r[0], html = r[1].value || '';
      progress('Armando capítulos a partir de los títulos del documento');
      var doc = new DOMParser().parseFromString('<!DOCTYPE html><html><body>' + html + '</body></html>', 'text/html');
      var text = doc.body.textContent || '';
      if (!text.trim() && !images.length) throw new Error('El documento de Word está vacío.');
      var firstH1 = doc.body.querySelector('h1');
      var title = meta.title || (firstH1 && firstH1.textContent.trim()) || baseName(fileName);
      var chapters = splitChapters(doc.body, title);
      var book = { title: title, author: meta.author || '', lang: guessLang(text), chapters: chapters, images: images };
      progress('Empaquetando el EPUB');
      return buildEpub(book).then(function (epub) {
        return { blob: epub, title: book.title, author: book.author, lang: book.lang, chapters: chapters.length, images: images.length };
      });
    });
  }

  /* ---------- PDF ---------- */
  var END_PUNCT = /[.!?…:;"”»)\]]$/;
  var HEADING_WORDS = /^(cap[ií]tulo|chapter|parte|part|libro|book|pr[oó]logo|prologue|ep[ií]logo|epilogue|introducci[oó]n|introduction)\b/i;
  function isPageNumber(t) { return /^[-–—\s]*(p[áa]g(ina)?\.?\s*)?\d{1,4}([\s/]+(de\s+)?\d{1,4})?[-–—\s]*$/i.test(t) || /^[ivxlcdm]{1,6}$/i.test(t); }
  function median(a) { if (!a.length) return 0; var s = a.slice().sort(function (x, y) { return x - y; }); return s[Math.floor(s.length / 2)]; }

  function pageLines(content) {
    var items = content.items.filter(function (it) { return it.str !== undefined; }).map(function (it) {
      return { s: it.str, x: it.transform[4], y: it.transform[5], h: Math.abs(it.transform[3]) || it.height || 10, w: it.width || 0, eol: it.hasEOL };
    }).filter(function (it) { return it.s.length; });
    items.sort(function (a, b) { return Math.abs(b.y - a.y) > Math.min(a.h, b.h) * 0.5 ? b.y - a.y : a.x - b.x; });
    var lines = [], cur = null;
    items.forEach(function (it) {
      if (!cur || Math.abs(it.y - cur.y) > Math.min(it.h, cur.h) * 0.5) {
        cur = { text: '', y: it.y, h: it.h, x: it.x, right: it.x, sizes: [] };
        lines.push(cur);
      }
      var gap = it.x - cur.right;
      if (cur.text && !/\s$/.test(cur.text) && !/^\s/.test(it.s) && gap > it.h * 0.15) cur.text += ' ';
      cur.text += it.s;
      cur.right = Math.max(cur.right, it.x + it.w);
      if (it.s.trim()) cur.sizes.push(it.h);
      cur.h = Math.max(cur.h, it.h);
    });
    return lines.map(function (l) { return { text: l.text.replace(/\s+/g, ' ').trim(), y: l.y, x: l.x, right: l.right, size: median(l.sizes) || l.h }; })
      .filter(function (l) { return l.text; });
  }

  function pdfToEpub(blob, fileName, onProgress) {
    var progress = onProgress || function () {};
    var pdf = null;
    return blob.arrayBuffer().then(function (buf) {
      return pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    }).then(function (doc) {
      pdf = doc;
      var pages = [];
      var chain = Promise.resolve();
      for (var i = 1; i <= pdf.numPages; i++) {
        (function (n) {
          chain = chain.then(function () {
            if (n === 1 || n % 5 === 0 || n === pdf.numPages) progress('Leyendo página ' + n + ' de ' + pdf.numPages);
            return pdf.getPage(n).then(function (p) { return p.getTextContent(); }).then(function (c) { pages.push(pageLines(c)); });
          });
        })(i);
      }
      return chain.then(function () { return Promise.all([pages, pdf.getMetadata().catch(function () { return {}; })]); });
    }).then(function (r) {
      var pages = r[0], info = (r[1] && r[1].info) || {};
      var numPages = pages.length;
      var totalChars = pages.reduce(function (a, ls) { return a + ls.reduce(function (b, l) { return b + l.text.length; }, 0); }, 0);
      if (totalChars < numPages * 40) {
        var e = new Error('Este PDF parece escaneado (son imágenes, no texto), así que no se puede convertir. Ábrelo como PDF.');
        e.code = 'scanned'; throw e;
      }
      progress('Armando párrafos');

      // Encabezados y pies que se repiten en muchas páginas.
      var norm = function (t) { return t.replace(/\d+/g, '#').toLowerCase(); };
      var freq = {};
      pages.forEach(function (ls) {
        if (!ls.length) return;
        var top = 't|' + norm(ls[0].text), bottom = 'b|' + norm(ls[ls.length - 1].text);
        freq[top] = (freq[top] || 0) + 1;
        if (bottom !== top) freq[bottom] = (freq[bottom] || 0) + 1;
      });
      var repeated = function (t, pos) {
        return numPages >= 4 && t.length <= 70 && (freq[pos + '|' + norm(t)] || 0) >= Math.max(3, numPages * 0.3);
      };

      var allSizes = [], gaps = [], rights = [];
      pages.forEach(function (ls) {
        ls.forEach(function (l, i) {
          allSizes.push(l.size); rights.push(l.right);
          if (i > 0) { var g = ls[i - 1].y - l.y; if (g > 0) gaps.push(g); }
        });
      });
      var bodySize = median(allSizes) || 10;
      var lineGap = median(gaps) || bodySize * 1.2;
      var maxRight = median(rights.filter(function (x) { return x > median(rights) * 0.9; })) || median(rights);

      // Bloques: { type: 'h' | 'p', text }
      var blocks = [], para = null, prevLine = null;
      var flush = function () { if (para && para.text.trim()) blocks.push(para); para = null; };
      pages.forEach(function (ls, pi) {
        ls.forEach(function (l, li) {
          var t = l.text;
          var edge = li < 2 || li >= ls.length - 2;
          if (edge && isPageNumber(t)) return;
          if ((li === 0 && repeated(t, 't')) || (li === ls.length - 1 && repeated(t, 'b'))) return;
          var isHeading = t.length <= 90 && !/[,;]$/.test(t) &&
            (l.size >= bodySize * 1.3 || (HEADING_WORDS.test(t) && t.length <= 60 && !/[.!?]$/.test(t)));
          if (isHeading) { flush(); blocks.push({ type: 'h', text: t }); prevLine = null; return; }
          var newPara = !para;
          if (para && prevLine) {
            var samePage = prevLine.page === pi;
            var gap = samePage ? prevLine.y - l.y : 0;
            var shortPrev = prevLine.right < maxRight * 0.85;
            var endsSentence = END_PUNCT.test(para.text);
            if (samePage && gap > lineGap * 1.45) newPara = true;
            else if (endsSentence && shortPrev) newPara = true;
            else if (!samePage && endsSentence && shortPrev) newPara = true;
            else if (samePage && endsSentence && l.x > prevLine.x + bodySize * 0.8) newPara = true;
          }
          if (newPara) { flush(); para = { type: 'p', text: t }; }
          else if (/[a-záéíóúñü]-$/i.test(para.text) && /^[a-záéíóúñü]/.test(t)) para.text = para.text.slice(0, -1) + t;
          else para.text += ' ' + t;
          prevLine = { y: l.y, x: l.x, right: l.right, page: pi };
        });
      });
      flush();

      var fallbackTitle = (info.Title && String(info.Title).trim()) || baseName(fileName);
      var chapters = [], cur = null;
      var headCount = blocks.filter(function (b) { return b.type === 'h'; }).length;
      var useHeadings = headCount >= 2 && headCount <= blocks.length / 3;
      blocks.forEach(function (b) {
        if (b.type === 'h' && useHeadings) {
          if (cur && cur.parts.length === 0) { cur.title += ' · ' + b.text; return; }
          cur = { title: b.text, parts: [] }; chapters.push(cur); return;
        }
        if (!cur) { cur = { title: fallbackTitle, parts: [] }; chapters.push(cur); }
        cur.parts.push(b.type === 'h' ? '<h2>' + esc(b.text) + '</h2>' : '<p>' + esc(b.text) + '</p>');
      });
      // Sin capítulos claros: secciones de unos 40 párrafos para que el lector cargue rápido.
      if (chapters.length === 1 && chapters[0].parts.length > 60) {
        var all = chapters[0].parts; chapters = [];
        for (var i = 0; i < all.length; i += 40) chapters.push({ title: 'Parte ' + (chapters.length + 1), parts: all.slice(i, i + 40) });
      }
      var text = blocks.map(function (b) { return b.text; }).join(' ');
      var book = {
        title: fallbackTitle, author: (info.Author && String(info.Author).trim()) || '', lang: guessLang(text),
        chapters: chapters.map(function (c) { return { title: c.title.slice(0, 120), html: '<h1>' + esc(c.title) + '</h1>\n' + c.parts.join('\n') }; })
      };
      progress('Empaquetando el EPUB');
      return buildEpub(book).then(function (epub) {
        return { blob: epub, title: book.title, author: book.author, lang: book.lang, chapters: book.chapters.length, images: 0 };
      });
    }).finally(function () { if (pdf) try { pdf.destroy(); } catch (e) {} });
  }

  function toEpub(blob, fileName, onProgress) {
    var k = kindOf(fileName, blob.type);
    if (k === 'docx') return docxToEpub(blob, fileName, onProgress);
    if (k === 'pdf') return pdfToEpub(blob, fileName, onProgress);
    if (k === 'doc') return Promise.reject(new Error('Los .doc antiguos no se pueden convertir. Ábrelo en Word y guárdalo como .docx.'));
    return Promise.reject(new Error('Solo se pueden convertir archivos Word (.docx) o PDF.'));
  }

  // Descargar o compartir: en iPhone abre el menú para "Guardar en Archivos" (iCloud) o Drive.
  function saveToDevice(blob, fileName) {
    var name = fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim();
    var file = null;
    try { file = new File([blob], name, { type: 'application/epub+zip' }); } catch (e) {}
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({ files: [file], title: name }).then(function () { return 'shared'; })
        .catch(function (e) { if (e && e.name === 'AbortError') return 'cancelled'; throw e; });
    }
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
    return Promise.resolve('downloaded');
  }

  /* ---------- Escribir correcciones dentro de un EPUB ----------
     Título, autor, saga (formato Calibre), portada e identidad de eLectura (electura:id). */
  var OPF_NS = 'http://www.idpf.org/2007/opf', DC_NS = 'http://purl.org/dc/elements/1.1/';
  function rewriteEpub(blob, info) {
    return blob.arrayBuffer().then(function (buf) { return JSZip.loadAsync(buf); }).then(function (zip) {
      var cont = zip.file('META-INF/container.xml');
      if (!cont) throw new Error('EPUB sin container.xml');
      return cont.async('string').then(function (xml) {
        var m = xml.match(/full-path\s*=\s*["']([^"']+)["']/);
        var opfPath = m ? decodeURIComponent(m[1]) : null;
        var f = opfPath && zip.file(opfPath);
        if (!f) throw new Error('EPUB sin OPF');
        return f.async('string').then(function (opf) { return { zip: zip, opfPath: opfPath, opf: opf }; });
      });
    }).then(function (x) {
      var doc = new DOMParser().parseFromString(x.opf, 'application/xml');
      if (doc.getElementsByTagName('parsererror').length) throw new Error('OPF no válido');
      var pkg = doc.documentElement;
      var md = doc.getElementsByTagNameNS(OPF_NS, 'metadata')[0] || doc.getElementsByTagName('metadata')[0];
      var man = doc.getElementsByTagNameNS(OPF_NS, 'manifest')[0] || doc.getElementsByTagName('manifest')[0];
      var dc = function (tag) { return Array.prototype.slice.call(md.getElementsByTagNameNS(DC_NS, tag)); };
      var setDc = function (tag, value) {
        var els = dc(tag);
        if (!value) return;
        if (els.length) { els[0].textContent = value; return; }
        var el = doc.createElementNS(DC_NS, 'dc:' + tag); el.textContent = value; md.appendChild(el);
      };
      setDc('title', info.title);
      if (info.author) {
        var cr = dc('creator');
        cr.slice(1).forEach(function (e) { e.parentNode.removeChild(e); });
        setDc('creator', info.author);
        if (cr[0]) ['opf:file-as', 'file-as'].forEach(function (a) { cr[0].removeAttribute(a); });
      }
      var metas = function () { return Array.prototype.slice.call(md.getElementsByTagName('meta')); };
      var addMeta = function (name, content) { var e = doc.createElementNS(OPF_NS, 'meta'); e.setAttribute('name', name); e.setAttribute('content', content); md.appendChild(e); };
      metas().forEach(function (e) {
        var n = e.getAttribute('name');
        if (n === 'calibre:series' || n === 'calibre:series_index' || n === 'electura:id') e.parentNode.removeChild(e);
      });
      if (info.series) {
        addMeta('calibre:series', info.series);
        if (info.seriesIndex) addMeta('calibre:series_index', String(info.seriesIndex));
        // EPUB 3: la colección dice lo mismo que Calibre para que no haya dos sagas distintas.
        metas().forEach(function (e) {
          if (e.getAttribute('property') !== 'belongs-to-collection') return;
          var id = e.getAttribute('id');
          metas().forEach(function (r) { if (id && r.getAttribute('refines') === '#' + id) r.parentNode.removeChild(r); });
          e.parentNode.removeChild(e);
        });
      }
      if (info.eid) addMeta('electura:id', info.eid);

      var coverP = Promise.resolve();
      if (info.cover) {
        var ext = /png/.test(info.cover.type) ? 'png' : 'jpg', type = ext === 'png' ? 'image/png' : 'image/jpeg';
        var dir = x.opfPath.indexOf('/') >= 0 ? x.opfPath.slice(0, x.opfPath.lastIndexOf('/') + 1) : '';
        var href = 'electura-cover.' + ext;
        Array.prototype.slice.call(man.getElementsByTagName('item')).forEach(function (it) {
          var props = (it.getAttribute('properties') || '').split(/\s+/).filter(function (p) { return p && p !== 'cover-image'; });
          if (props.length) it.setAttribute('properties', props.join(' ')); else it.removeAttribute('properties');
          if (it.getAttribute('id') === 'electura-cover') it.parentNode.removeChild(it);
        });
        metas().forEach(function (e) { if (e.getAttribute('name') === 'cover') e.parentNode.removeChild(e); });
        var item = doc.createElementNS(OPF_NS, 'item');
        item.setAttribute('id', 'electura-cover'); item.setAttribute('href', href); item.setAttribute('media-type', type);
        if ((pkg.getAttribute('version') || '').charAt(0) === '3') item.setAttribute('properties', 'cover-image');
        man.appendChild(item);
        addMeta('cover', 'electura-cover');
        coverP = info.cover.arrayBuffer().then(function (b) { x.zip.file(dir + href, b); });
      }
      return coverP.then(function () {
        x.zip.file(x.opfPath, new XMLSerializer().serializeToString(doc));
        // Se rearma el zip con "mimetype" primero y sin comprimir, como pide el estándar.
        var out = new JSZip();
        out.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
        var names = Object.keys(x.zip.files).filter(function (n) { return n !== 'mimetype' && !x.zip.files[n].dir; });
        return Promise.all(names.map(function (n) { return x.zip.file(n).async('uint8array').then(function (d) { out.file(n, d); }); }))
          .then(function () { return out.generateAsync({ type: 'blob', mimeType: 'application/epub+zip', compression: 'DEFLATE' }); });
      });
    });
  }

  window.Conv = { kindOf: kindOf, toEpub: toEpub, docxToEpub: docxToEpub, pdfToEpub: pdfToEpub, buildEpub: buildEpub, saveToDevice: saveToDevice, guessLang: guessLang, rewriteEpub: rewriteEpub, MAMMOTH_URL: MAMMOTH_URL };
})();
