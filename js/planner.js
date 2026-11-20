/* Yardgrid planner.
   Scene Board idea, rewritten for a static page: stage.js draws a photo under the pieces,
   and upload.js shrinks images on a canvas in the browser. Nothing is sent to a server.
   The original Scene Board folder is not modified. */
(function () {
  const Plants = window.YardPlants;
  const Logic = window.YardLogic;
  const byId = Plants.byId;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const state = {
    id: uid(),
    name: 'My garden',
    frost: '',
    ppm: 42,
    panX: 24,
    panY: 24,
    grid: true,
    opacity: 0.62,
    photo: null,
    beds: [],
    plants: [],
    tool: 'pan',
    armed: null,
    selectedBed: null,
    selectedPlant: null,
    mode: 'grid',
    pieces: [],
    stamps: [],
    selectedPiece: null,
    demo: false
  };
  let photoUrl = null;
  let drag = null;
  const stampUrls = {};
  const stampBlobs = new Map();
  const pointers = new Map();

  function uid() { return Math.random().toString(36).slice(2, 10); }

  function blank() {
    return {
      id: uid(), name: 'My garden', frost: '', ppm: 42, panX: 24, panY: 24,
      grid: true, opacity: 0.62, photo: null, beds: [], plants: [],
      tool: 'pan', armed: null, selectedBed: null, selectedPlant: null,
      mode: 'grid', pieces: [], stamps: [], selectedPiece: null, demo: false
    };
  }

  function idb() {
    return new Promise(function (resolve, reject) {
      const req = indexedDB.open('yardgrid', 1);
      req.onupgradeneeded = function () { req.result.createObjectStore('photos'); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }
  function idbPut(id, blob) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('photos', 'readwrite');
        tx.objectStore('photos').put(blob, id);
        tx.oncomplete = function () { resolve(); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }
  function idbGet(id) {
    return idb().then(function (db) {
      return new Promise(function (resolve, reject) {
        const tx = db.transaction('photos', 'readonly');
        const req = tx.objectStore('photos').get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  async function shrinkFile(file) {
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch (e) { throw new Error('This browser could not read that picture. Use a JPG or PNG.'); }
    const lim = 1600;
    const k = Math.min(1, lim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise(function (res) { c.toBlob(res, 'image/jpeg', 0.72); });
    if (!blob) throw new Error('Could not shrink that picture.');
    return { blob: blob, w: w, h: h };
  }

  function setPhotoFromBlob(blob, w, h, meta) {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = URL.createObjectURL(blob);
    const prev = state.photo;
    state.photo = {
      x: meta && meta.x != null ? meta.x : 0,
      y: meta && meta.y != null ? meta.y : 0,
      wFt: meta && meta.wFt ? meta.wFt : 18,
      hFt: meta && meta.hFt ? meta.hFt : 18 * (h / w),
      natW: w,
      natH: h
    };
    if (prev && meta == null) {
      state.photo.x = prev.x;
      state.photo.y = prev.y;
    }
    return idbPut(state.id, blob).catch(function () {
      setHint('The photo is on the board, but this browser would not store it. Export the garden if you want a copy.');
    });
  }

  function rememberStamp(id, blob) {
    if (stampUrls[id]) URL.revokeObjectURL(stampUrls[id]);
    stampBlobs.set(id, blob);
    stampUrls[id] = URL.createObjectURL(blob);
  }
  function loadStampBlobs() {
    return Promise.all(state.stamps.map(function (s) {
      return idbGet('stamp:' + s.id).then(function (blob) {
        if (blob && blob.size) rememberStamp(s.id, blob);
      }).catch(function () {});
    }));
  }
  function storeStamps() {
    state.stamps.forEach(function (s) {
      const blob = stampBlobs.get(s.id);
      if (blob) idbPut('stamp:' + s.id, blob).catch(function () {});
    });
  }

  async function shrinkStamp(file) {
    let bmp;
    try { bmp = await createImageBitmap(file); }
    catch (e) { throw new Error('This browser could not read that picture. Use a JPG or PNG.'); }
    const lim = 800;
    const k = Math.min(1, lim / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const png = file.type === 'image/png';
    const blob = await new Promise(function (res) { c.toBlob(res, png ? 'image/png' : 'image/jpeg', 0.8); });
    if (!blob) throw new Error('Could not shrink that picture.');
    return { blob: blob, w: w, h: h };
  }

  function persist() {
    if (state.demo) return;
    const data = JSON.parse(JSON.stringify(state));
    delete data.demo;
    try { localStorage.setItem('yardgrid-current', JSON.stringify(data)); }
    catch (e) { setHint('Could not save in this browser. Use Export.'); }
    storeStamps();
  }

  function loadCurrent() {
    try {
      const raw = localStorage.getItem('yardgrid-current');
      if (!raw) return false;
      const data = JSON.parse(raw);
      Object.assign(state, blank(), data, { tool: 'pan', armed: null, selectedBed: null, selectedPlant: null, demo: false });
      return true;
    } catch (e) { return false; }
  }

  function zoneRecord() {
    try { return JSON.parse(localStorage.getItem('yardgrid-zone') || 'null'); }
    catch (e) { return null; }
  }
  function zoneBlurb() {
    const rec = zoneRecord();
    const link = '<a href="charts/planting-calendar.html">Planting calendar by zone</a>';
    if (!rec || !rec.zone) return '<p class="muted">' + link + '</p>';
    return '<p class="muted">Zone ' + esc(rec.zone) + (rec.zip ? ', ZIP ' + esc(rec.zip) : '') + '. ' + link + '</p>';
  }
  function applyChartQuery() {
    const q = new URLSearchParams(location.search);
    const frost = q.get('frost') || '';
    const zone = q.get('zone') || '';
    const plant = q.get('plant') || '';
    let changed = false;
    if (/^\d{4}-\d{2}-\d{2}$/.test(frost)) { state.frost = frost; changed = true; }
    else if (!state.frost) {
      const rec = zoneRecord();
      if (rec && /^\d{4}-\d{2}-\d{2}$/.test(rec.frost || '')) { state.frost = rec.frost; changed = true; }
    }
    if (plant && byId[plant]) { state.armed = plant; changed = true; }
    if (zone || frost) {
      const rec = zoneRecord() || {};
      if (zone) rec.zone = zone;
      if (frost) rec.frost = frost;
      try { localStorage.setItem('yardgrid-zone', JSON.stringify(rec)); } catch (e) {}
    }
    return changed;
  }
  function namedSaves() {
    try { return JSON.parse(localStorage.getItem('yardgrid-saves') || '[]'); }
    catch (e) { return []; }
  }
  function writeSaves(list) {
    localStorage.setItem('yardgrid-saves', JSON.stringify(list));
  }

  function feetFromEvent(e) {
    const r = $('viewport').getBoundingClientRect();
    return {
      x: (e.clientX - r.left - state.panX) / state.ppm,
      y: (e.clientY - r.top - state.panY) / state.ppm
    };
  }

  function setHint(text) { $('hint').textContent = text; }

  function bedById(id) {
    for (let i = 0; i < state.beds.length; i++) if (state.beds[i].id === id) return state.beds[i];
    return null;
  }

  function pieceById(id) {
    for (let i = 0; i < state.pieces.length; i++) if (state.pieces[i].id === id) return state.pieces[i];
    return null;
  }
  function nextZ() {
    let z = 1;
    state.pieces.forEach(function (p) { if (p.z >= z) z = p.z + 1; });
    return z;
  }
  function libraryItem(id) {
    const items = window.YardPhotos && YardPhotos.items;
    if (!items) return null;
    for (let i = 0; i < items.length; i++) if (items[i].id === id) return items[i];
    return null;
  }
  let libCat = 'all';
  let libBuilt = false;
  function renderPhotoGrid() {
    const grid = $('libGrid');
    if (!grid) return;
    const items = (window.YardPhotos && YardPhotos.items) || [];
    const q = (($('libSearch') && $('libSearch').value) || '').trim().toLowerCase();
    const shown = items.filter(function (item) {
      if (libCat !== 'all' && item.category !== libCat) return false;
      if (!q) return true;
      return item.name.toLowerCase().indexOf(q) !== -1 || (item.tag || '').toLowerCase().indexOf(q) !== -1;
    });
    grid.innerHTML = shown.map(function (item) {
      return '<button type="button" class="lib-card" data-lib="' + esc(item.id) + '"><img alt="" loading="lazy" src="' + esc(item.thumb) + '"><span><strong>' + esc(item.name) + '</strong><span>' + esc(item.tag) + '</span></span></button>';
    }).join('') || '<p class="muted">No photos match.</p>';
  }
  function syncPhotoLibrary() {
    const box = $('photoLibrary');
    if (!box) return;
    const show = state.mode === 'place';
    box.hidden = !show;
    if (!show || libBuilt) return;
    libBuilt = true;
    renderPhotoGrid();
    $('libSearch').addEventListener('input', renderPhotoGrid);
    $('libFilters').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-cat]');
      if (!btn) return;
      libCat = btn.getAttribute('data-cat');
      const buttons = $('libFilters').querySelectorAll('button');
      for (let i = 0; i < buttons.length; i++) buttons[i].classList.toggle('on', buttons[i] === btn);
      renderPhotoGrid();
    });
    $('libGrid').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-lib]');
      if (!btn) return;
      const item = libraryItem(btn.getAttribute('data-lib'));
      if (!item) return;
      const ft = viewCenter();
      const aspect = item.w ? item.h / item.w : 1;
      const wFt = item.category === 'pots' ? 1.5 : (item.category === 'flowers' ? 1.7 : 2.6);
      addPiece({ kind: 'library', libraryId: item.id, x: ft.x, y: ft.y, wFt: wFt, hFt: Math.max(0.4, wFt * aspect) });
      setHint(item.name + ' placed. Drag it, or pinch with two fingers.');
    });
  }
  function viewCenter() {
    const vp = $('viewport');
    return {
      x: ((vp.clientWidth || 300) / 2 - state.panX) / state.ppm,
      y: ((vp.clientHeight || 300) / 2 - state.panY) / state.ppm
    };
  }
  function addPiece(fields) {
    const piece = {
      id: uid(), kind: fields.kind, stampId: fields.stampId || null, plantId: fields.plantId || null,
      libraryId: fields.libraryId || null,
      x: fields.x, y: fields.y, wFt: fields.wFt, hFt: fields.hFt,
      rot: fields.rot || 0, flip: !!fields.flip, z: nextZ()
    };
    state.pieces.push(piece);
    state.selectedPiece = piece.id;
    state.demo = false;
    persist();
    render();
    return piece;
  }
  function selectedPiece() {
    return pieceById(state.selectedPiece);
  }
  function renderStamps() {
    const tray = $('stampTray');
    if (!tray) return;
    if (state.mode !== 'place') { tray.hidden = true; tray.innerHTML = ''; return; }
    tray.hidden = false;
    let html = '<p class="muted">My pictures</p>';
    if (!state.stamps.length) html += '<p class="muted">Use Add pictures above the board, or tap a garden icon below.</p>';
    state.stamps.forEach(function (s) {
      html += '<button type="button" class="stamp-btn" data-stamp="' + s.id + '"><img alt="" src="' + (stampUrls[s.id] || '') + '"><span>' + esc(s.name || 'Picture') + '</span></button>';
    });
    html += '<p class="muted">Garden icons</p>';
    tray.innerHTML = html;
  }

  function renderLibrary() {
    renderStamps();
    const q = ($('filter').value || '').trim().toLowerCase();
    $('plantList').innerHTML = Plants.list.filter(function (p) {
      return !q || p.name.toLowerCase().indexOf(q) !== -1 || p.group.toLowerCase().indexOf(q) !== -1;
    }).map(function (p) {
      const count = p.spanC * p.spanR > 1 ? ('1 on ' + (p.spanC * p.spanR) + ' sq') : (p.perSq + ' / sq');
      return '<button type="button" class="plant-btn' + (state.armed === p.id ? ' armed' : '') + '" data-plant="' + p.id + '"><span class="emoji">' + p.emoji + '</span><span><strong>' + esc(p.name) + '</strong><span>' + esc(p.group) + ' · ' + count + '</span></span></button>';
    }).join('');
  }

  function renderBoard() {
    const vp = $('viewport');
    vp.classList.toggle('grid-on', state.grid);
    vp.style.backgroundSize = state.ppm + 'px ' + state.ppm + 'px';
    vp.style.backgroundPosition = state.panX + 'px ' + state.panY + 'px';
    let html = '';
    if (state.photo && photoUrl) {
      const x = state.panX + state.photo.x * state.ppm;
      const y = state.panY + state.photo.y * state.ppm;
      const w = state.photo.wFt * state.ppm;
      const h = state.photo.hFt * state.ppm;
      html += '<div class="photo-layer" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px;opacity:' + state.opacity + '"><img alt="Yard photo" src="' + photoUrl + '"></div>';
    }
    if (state.mode === 'place') {
      const ordered = state.pieces.slice().sort(function (a, b) { return a.z - b.z; });
      ordered.forEach(function (p) {
        const left = state.panX + (p.x - p.wFt / 2) * state.ppm;
        const top = state.panY + (p.y - p.hFt / 2) * state.ppm;
        const pw = p.wFt * state.ppm;
        const ph = p.hFt * state.ppm;
        const flip = p.flip ? ' scaleX(-1)' : '';
        const sel = state.selectedPiece === p.id;
        html += '<div class="piece' + (sel ? ' selected' : '') + '" data-piece="' + p.id + '" style="left:' + left + 'px;top:' + top + 'px;width:' + pw + 'px;height:' + ph + 'px;z-index:' + (10 + p.z) + ';transform:rotate(' + (p.rot || 0) + 'deg)' + flip + '">';
        if (p.kind === 'icon' && byId[p.plantId]) {
          html += '<div class="icon-face" style="font-size:' + Math.max(16, Math.round(ph * 0.62)) + 'px">' + byId[p.plantId].emoji + '</div>';
        } else if (p.kind === 'library' && libraryItem(p.libraryId)) {
          html += '<img alt="" src="' + esc(libraryItem(p.libraryId).full) + '">';
        } else if (stampUrls[p.stampId]) {
          html += '<img alt="" src="' + stampUrls[p.stampId] + '">';
        }
        if (sel) {
          html += '<button type="button" class="piece-handle rot" data-handle="rot" aria-label="Rotate"></button>';
          html += '<button type="button" class="piece-handle se" data-handle="se" aria-label="Resize"></button>';
        }
        html += '</div>';
      });
    }
    if (state.mode !== 'place') state.beds.forEach(function (bed) {
      const x = state.panX + bed.x * state.ppm;
      const y = state.panY + bed.y * state.ppm;
      const w = bed.w * state.ppm;
      const h = bed.h * state.ppm;
      html += '<div class="bed' + (state.selectedBed === bed.id ? ' selected' : '') + '" data-bed="' + bed.id + '" style="left:' + x + 'px;top:' + y + 'px;width:' + w + 'px;height:' + h + 'px">';
      html += '<div class="bed-bar" data-move="' + bed.id + '"><span>' + esc(bed.name) + ' · ' + bed.w + '×' + bed.h + ' ft</span></div>';
      html += '<div class="bed-grid">';
      const cellW = state.ppm;
      const cellH = state.ppm;
      const drawn = {};
      for (let r = 0; r < bed.h; r++) {
        for (let c = 0; c < bed.w; c++) {
          const planting = Logic.findAt(state.plants, byId, bed.id, c, r);
          if (planting) {
            if (drawn[planting.id]) continue;
            drawn[planting.id] = 1;
            const plant = byId[planting.plantId];
            const label = plant.spanC * plant.spanR > 1 ? ('1 ' + plant.name.toLowerCase()) : (plant.perSq + ' ' + plant.name.toLowerCase());
            html += '<button type="button" class="cell filled' + (state.selectedPlant === planting.id ? ' selected' : '') + '" data-plant-id="' + planting.id + '" style="left:' + (planting.c * cellW) + 'px;top:' + (planting.r * cellH) + 'px;width:' + (plant.spanC * cellW) + 'px;height:' + (plant.spanR * cellH) + 'px"><span class="emoji">' + plant.emoji + '</span>' + esc(label) + '</button>';
          } else {
            html += '<button type="button" class="cell" data-cell="' + bed.id + ':' + c + ':' + r + '" style="left:' + (c * cellW) + 'px;top:' + (r * cellH) + 'px;width:' + cellW + 'px;height:' + cellH + 'px"></button>';
          }
        }
      }
      html += '</div></div>';
    });
    if (drag && drag.kind === 'scale' && drag.a && drag.b) {
      const x1 = state.panX + drag.a.x * state.ppm, y1 = state.panY + drag.a.y * state.ppm;
      const x2 = state.panX + drag.b.x * state.ppm, y2 = state.panY + drag.b.y * state.ppm;
      html += '<svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="#1e4634" stroke-width="3"/></svg>';
    }
    vp.innerHTML = html;
  }

  function renderSide() {
    if (state.mode === 'place') {
      const piece = selectedPiece();
      let detail = '<p>Drag a picture on the yard. On a phone, select it, then pinch and twist with two fingers. On a wide screen, drag the handles.</p>';
      if (piece) detail += '<p class="muted">Selected picture. Duplicate, flip, layer, or delete it from the row above the board.</p>';
      $('detail').innerHTML = detail;
      $('calendar').innerHTML = '<p class="muted">Dates stay with the grid plan.</p>';
      $('shop').innerHTML = '<p class="muted">The shopping list follows the grid plan.</p>';
      $('notes').innerHTML = '';
      const saves = namedSaves();
      $('saveList').innerHTML = saves.map(function (s, i) {
        return '<option value="' + i + '">' + esc(s.name) + '</option>';
      }).join('');
      renderPrint();
      return;
    }
    const plant = state.selectedPlant && state.plants.filter(function (p) { return p.id === state.selectedPlant; })[0];
    const info = plant ? byId[plant.plantId] : (state.armed ? byId[state.armed] : null);
    let detail = '';
    if (info) {
      const one = Logic.calendarRows([{ plantId: info.id }], byId, state.frost)[0];
      let when = '';
      if (one && state.frost) {
        if (one.indoor) when += '<p><strong>Start indoors:</strong> ' + esc(one.indoor) + '</p>';
        if (one.transplant) when += '<p><strong>Set out:</strong> ' + esc(one.transplant) + '</p>';
        if (one.direct) when += '<p><strong>Direct sow:</strong> ' + esc(one.direct) + '</p>';
      }
      detail = '<div class="card"><strong>' + info.emoji + ' ' + esc(info.name) + '</strong><p>' + esc(info.method) + '</p><p>' + esc(info.gridNote) + '</p><p>Days: ' + esc(info.days) + '. ' + esc(info.daysNote) + '</p><p>' + esc(info.sun) + '</p>' + when + '</div>';
    }
    $('detail').innerHTML = detail;

    const rows = Logic.calendarRows(state.plants, byId, state.frost);
    const zoneLine = zoneBlurb();
    if (!state.frost) {
      $('calendar').innerHTML = zoneLine + '<p class="muted">Enter your average last spring frost date. The calendar uses that day. It is an average, not a promise. Soil temperature is a better signal when you have it. <a href="https://www.almanac.com/gardening/frostdates" target="_blank" rel="noopener">Look up a frost date</a>.</p>';
    } else if (!rows.length) {
      $('calendar').innerHTML = zoneLine + '<p class="muted">Add plants to the beds to see dates.</p>';
    } else {
      $('calendar').innerHTML = zoneLine + rows.map(function (row) {
        const bits = [];
        if (row.indoor) bits.push('<div><strong>Start indoors:</strong> ' + esc(row.indoor) + '<br><span class="muted">' + esc(row.indoorNote) + '</span></div>');
        if (row.transplant) bits.push('<div><strong>Set out:</strong> ' + esc(row.transplant) + '<br><span class="muted">' + esc(row.transplantNote) + '</span></div>');
        if (row.direct) bits.push('<div><strong>Direct sow:</strong> ' + esc(row.direct) + '<br><span class="muted">' + esc(row.directNote) + '</span></div>');
        if (row.timingNote) bits.push('<div class="muted">' + esc(row.timingNote) + '</div>');
        return '<h3>' + esc(row.name) + '</h3>' + bits.join('');
      }).join('');
    }

    const shop = Logic.shopping(state.plants, byId);
    if (!shop.length) $('shop').innerHTML = '<p class="muted">The list fills in as you place plants.</p>';
    else {
      $('shop').innerHTML = '<table><thead><tr><th>Plant</th><th>Plants</th><th></th></tr></thead><tbody>' + shop.map(function (item) {
        return '<tr><td>' + esc(item.name) + '<br><span class="muted">' + item.squares + ' sq</span></td><td>' + item.plants + '</td><td><a href="#affiliate-placeholder">Buy seeds</a><!-- A real affiliate link goes here later. --></td></tr>';
      }).join('') + '</tbody></table><p class="muted">Packet seed counts are not in the extension charts used here, so this list counts plants, not packets.</p>';
    }

    const notes = [];
    state.beds.forEach(function (bed) {
      Logic.neighborNotes(bed.id, state.plants, byId).forEach(function (n) {
        const names = n.plants.map(function (id) { return byId[id].name; }).join(' and ');
        notes.push('<div class="note ' + n.kind + '"><strong>' + esc(bed.name) + ' · ' + esc(names) + '</strong><br>' + esc(n.text) + '</div>');
      });
    });
    $('notes').innerHTML = notes.join('') || '<p class="muted">Neighbor notes show up only for pairs with a source. Most old companion charts are not used here.</p>';

    const saves = namedSaves();
    $('saveList').innerHTML = saves.map(function (s, i) {
      return '<option value="' + i + '">' + esc(s.name) + '</option>';
    }).join('');
    renderPrint();
  }

  function renderPrint() {
    let photo = '';
    if (state.photo && photoUrl) {
      const beds = state.beds.map(function (bed) {
        const left = ((bed.x - state.photo.x) / state.photo.wFt) * 100;
        const top = ((bed.y - state.photo.y) / state.photo.hFt) * 100;
        const w = (bed.w / state.photo.wFt) * 100;
        const h = (bed.h / state.photo.hFt) * 100;
        return '<div class="print-bed" style="left:' + left + '%;top:' + top + '%;width:' + w + '%;height:' + h + '%">' + esc(bed.name) + '</div>';
      }).join('');
      const pieces = state.pieces.slice().sort(function (a, b) { return a.z - b.z; }).map(function (p) {
        const left = ((p.x - p.wFt / 2 - state.photo.x) / state.photo.wFt) * 100;
        const top = ((p.y - p.hFt / 2 - state.photo.y) / state.photo.hFt) * 100;
        const w = (p.wFt / state.photo.wFt) * 100;
        const h = (p.hFt / state.photo.hFt) * 100;
        const flip = p.flip ? ' scaleX(-1)' : '';
        const style = 'left:' + left + '%;top:' + top + '%;width:' + w + '%;height:' + h + '%;transform:rotate(' + (p.rot || 0) + 'deg)' + flip;
        if (p.kind === 'icon' && byId[p.plantId]) {
          return '<div class="print-piece" style="' + style + ';font-size:24px;display:flex;align-items:center;justify-content:center">' + byId[p.plantId].emoji + '</div>';
        }
        if (p.kind === 'library' && libraryItem(p.libraryId)) {
          return '<div class="print-piece" style="' + style + '"><img alt="" src="' + esc(libraryItem(p.libraryId).full) + '"></div>';
        }
        if (!stampUrls[p.stampId]) return '';
        return '<div class="print-piece" style="' + style + '"><img alt="" src="' + stampUrls[p.stampId] + '"></div>';
      }).join('');
      photo = '<div class="print-photo"><img alt="Yard photo" src="' + photoUrl + '" style="opacity:' + Math.max(state.opacity, 0.85) + '">' + beds + pieces + '</div>';
    }
    const tables = state.beds.map(function (bed) {
      let body = '';
      for (let r = 0; r < bed.h; r++) {
        body += '<tr>';
        for (let c = 0; c < bed.w; c++) {
          const p = Logic.findAt(state.plants, byId, bed.id, c, r);
          if (!p) body += '<td></td>';
          else {
            const plant = byId[p.plantId];
            const head = (p.c === c && p.r === r);
            body += '<td>' + (head ? (plant.emoji + ' ' + esc(plant.name)) : '') + '</td>';
          }
        }
        body += '</tr>';
      }
      return '<h2>' + esc(bed.name) + ' (' + bed.w + '×' + bed.h + ' ft)</h2><table>' + body + '</table>';
    }).join('');
    $('printSheet').innerHTML = '<h1>' + esc(state.name) + '</h1><p>Last spring frost: ' + esc(state.frost || 'not set') + '</p>' + photo + tables;
  }

  function render() {
    $('gardenName').value = state.name;
    $('frost').value = state.frost || '';
    $('opacity').value = state.opacity;
    $('photoSize').value = state.photo ? state.photo.wFt : 18;
    $('gridOn').checked = state.grid;
    syncPhotoLibrary();
    $('modeGrid').classList.toggle('on', state.mode !== 'place');
    $('modePlace').classList.toggle('on', state.mode === 'place');
    $('placeBar').hidden = state.mode !== 'place';
    document.querySelector('.plan-app').classList.toggle('placing', state.mode === 'place');
    syncHow();
    const head = document.querySelector('.library-head h2');
    if (head) head.textContent = state.mode === 'place' ? 'Pictures' : 'Plants';
    const plantsBtn = $('plantsToggle');
    if (plantsBtn) plantsBtn.textContent = state.mode === 'place' ? 'Pictures' : 'Plants';
    $('toolPhoto').classList.toggle('on', state.tool === 'photo');
    $('toolScale').classList.toggle('on', state.tool === 'scale');
    $('toolPan').classList.toggle('on', state.tool === 'pan');
    renderLibrary();
    renderBoard();
    renderSide();
  }

  function place(bed, c, r, plantId) {
    if (!Logic.canPlace(bed, state.plants, byId, plantId, c, r, null)) {
      setHint('That plant does not fit there. Big plants need open squares.');
      return;
    }
    state.plants.push({ id: uid(), bedId: bed.id, plantId: plantId, c: c, r: r });
    state.selectedBed = bed.id;
    state.selectedPlant = state.plants[state.plants.length - 1].id;
    persist();
    render();
  }

  function addBed() {
    const w = Math.round(Number($('bedW').value));
    const h = Math.round(Number($('bedH').value));
    if (!(w >= 1 && w <= 20 && h >= 1 && h <= 20)) {
      setHint('Use a width and length from 1 to 20 feet.');
      return;
    }
    let x = 1, y = 1;
    if (state.beds.length) {
      const last = state.beds[state.beds.length - 1];
      x = last.x + last.w + 1;
      y = last.y;
    }
    const bed = { id: uid(), name: 'Bed ' + (state.beds.length + 1), x: x, y: y, w: w, h: h };
    state.beds.push(bed);
    state.selectedBed = bed.id;
    persist();
    render();
    setHint('Drag the brown bar to move the bed. Tap a plant, then tap a square.');
  }

  function onLibraryPointerDown(e) {
    const btn = e.target.closest('[data-plant]');
    if (!btn) return;
    e.preventDefault();
    const id = btn.getAttribute('data-plant');
    drag = { kind: 'lib', id: id, x: e.clientX, y: e.clientY, moved: false, pointer: e.pointerId };
    btn.setPointerCapture(e.pointerId);
  }
  function onLibraryPointerMove(e) {
    if (!drag || drag.kind !== 'lib' || drag.pointer !== e.pointerId) return;
    if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) drag.moved = true;
  }
  function onLibraryPointerUp(e) {
    if (!drag || drag.kind !== 'lib') return;
    const id = drag.id;
    const moved = drag.moved;
    drag = null;
    if (state.mode === 'place') {
      const center = viewCenter();
      let x = center.x, y = center.y;
      if (moved) {
        const vp = $('viewport').getBoundingClientRect();
        if (e.clientX >= vp.left && e.clientX <= vp.right && e.clientY >= vp.top && e.clientY <= vp.bottom) {
          x = (e.clientX - vp.left - state.panX) / state.ppm;
          y = (e.clientY - vp.top - state.panY) / state.ppm;
        }
      }
      addPiece({ kind: 'icon', plantId: id, x: x, y: y, wFt: 1.6, hFt: 1.6 });
      setHint('Icon placed. Drag it, or pinch with two fingers.');
      return;
    }
    if (!moved) {
      state.armed = state.armed === id ? null : id;
      state.tool = 'pan';
      render();
      setHint(state.armed ? 'Tap an empty square to place ' + byId[id].name + '.' : 'Select a plant.');
      return;
    }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el && el.closest('[data-cell]');
    if (!cell) { setHint('Drop the plant on an empty square.'); return; }
    const parts = cell.getAttribute('data-cell').split(':');
    const bed = bedById(parts[0]);
    place(bed, Number(parts[1]), Number(parts[2]), id);
  }

  function onBoardPointerDown(e) {
    if (e.target.closest('.library')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Logic.lineLength(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      const piece = state.mode === 'place' ? selectedPiece() : null;
      if (piece) {
        drag = {
          kind: 'pinchPiece', id: piece.id, dist: dist,
          ang: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
          w: piece.wFt, h: piece.hFt, rot: piece.rot || 0
        };
      } else {
        drag = { kind: 'pinch', dist: dist, ppm: state.ppm };
      }
      return;
    }
    if (state.mode === 'place' && state.tool !== 'scale' && state.tool !== 'photo') {
      const handle = e.target.closest('[data-handle]');
      const pieceEl = e.target.closest('[data-piece]');
      if (handle && pieceEl) {
        const piece = pieceById(pieceEl.getAttribute('data-piece'));
        state.selectedPiece = piece.id;
        drag = { kind: handle.getAttribute('data-handle') === 'rot' ? 'prot' : 'psize', pointer: e.pointerId, id: piece.id };
        $('viewport').setPointerCapture(e.pointerId);
        render();
        return;
      }
      if (pieceEl) {
        const piece = pieceById(pieceEl.getAttribute('data-piece'));
        state.selectedPiece = piece.id;
        drag = { kind: 'pmove', pointer: e.pointerId, id: piece.id, x: e.clientX, y: e.clientY, ox: piece.x, oy: piece.y };
        $('viewport').setPointerCapture(e.pointerId);
        render();
        return;
      }
      state.selectedPiece = null;
    }
    const move = e.target.closest('[data-move]');
    const plantingEl = e.target.closest('[data-plant-id]');
    const cell = e.target.closest('[data-cell]');
    const ft = feetFromEvent(e);
    if (state.tool === 'scale') {
      drag = { kind: 'scale', a: ft, b: ft, pointer: e.pointerId };
      $('viewport').setPointerCapture(e.pointerId);
      return;
    }
    if (state.tool === 'photo' && state.photo) {
      drag = { kind: 'photo', pointer: e.pointerId, x: e.clientX, y: e.clientY, ox: state.photo.x, oy: state.photo.y };
      $('viewport').setPointerCapture(e.pointerId);
      return;
    }
    if (move) {
      const bed = bedById(move.getAttribute('data-move'));
      state.selectedBed = bed.id;
      drag = { kind: 'bed', pointer: e.pointerId, id: bed.id, x: e.clientX, y: e.clientY, ox: bed.x, oy: bed.y };
      $('viewport').setPointerCapture(e.pointerId);
      return;
    }
    if (plantingEl) {
      const planting = state.plants.filter(function (p) { return p.id === plantingEl.getAttribute('data-plant-id'); })[0];
      state.selectedPlant = planting.id;
      state.selectedBed = planting.bedId;
      drag = { kind: 'plant', pointer: e.pointerId, id: planting.id, x: e.clientX, y: e.clientY, moved: false };
      $('viewport').setPointerCapture(e.pointerId);
      render();
      return;
    }
    if (cell && state.armed) {
      const parts = cell.getAttribute('data-cell').split(':');
      place(bedById(parts[0]), Number(parts[1]), Number(parts[2]), state.armed);
      return;
    }
    drag = { kind: 'pan', pointer: e.pointerId, x: e.clientX, y: e.clientY, ox: state.panX, oy: state.panY };
    $('viewport').setPointerCapture(e.pointerId);
  }

  function onBoardPointerMove(e) {
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (drag && (drag.kind === 'pinch' || drag.kind === 'pinchPiece') && pointers.size >= 2) {
      const pts = Array.from(pointers.values());
      const dist = Logic.lineLength(pts[0].x, pts[0].y, pts[1].x, pts[1].y);
      if (drag.kind === 'pinchPiece' && drag.dist > 0) {
        const piece = pieceById(drag.id);
        if (piece) {
          const scale = Math.max(0.2, Math.min(8, dist / drag.dist));
          piece.wFt = Math.max(0.3, Math.min(40, drag.w * scale));
          piece.hFt = Math.max(0.3, Math.min(40, drag.h * scale));
          const ang = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
          piece.rot = drag.rot + (ang - drag.ang) * 180 / Math.PI;
          renderBoard();
        }
      } else if (drag.dist > 0) {
        state.ppm = Math.max(18, Math.min(90, drag.ppm * (dist / drag.dist)));
        renderBoard();
      }
      return;
    }
    if (!drag || drag.pointer !== e.pointerId) return;
    if (drag.kind === 'photo') {
      state.photo.x = drag.ox + (e.clientX - drag.x) / state.ppm;
      state.photo.y = drag.oy + (e.clientY - drag.y) / state.ppm;
      renderBoard();
    } else if (drag.kind === 'bed') {
      const bed = bedById(drag.id);
      bed.x = Math.round(drag.ox + (e.clientX - drag.x) / state.ppm);
      bed.y = Math.round(drag.oy + (e.clientY - drag.y) / state.ppm);
      renderBoard();
    } else if (drag.kind === 'pan') {
      state.panX = drag.ox + (e.clientX - drag.x);
      state.panY = drag.oy + (e.clientY - drag.y);
      renderBoard();
    } else if (drag.kind === 'scale') {
      drag.b = feetFromEvent(e);
      renderBoard();
    } else if (drag.kind === 'plant') {
      if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 8) drag.moved = true;
    } else if (drag.kind === 'pmove') {
      const piece = pieceById(drag.id);
      if (piece) {
        piece.x = drag.ox + (e.clientX - drag.x) / state.ppm;
        piece.y = drag.oy + (e.clientY - drag.y) / state.ppm;
        renderBoard();
      }
    } else if (drag.kind === 'psize' || drag.kind === 'prot') {
      const piece = pieceById(drag.id);
      if (piece) {
        const ft = feetFromEvent(e);
        const dx = ft.x - piece.x;
        const dy = ft.y - piece.y;
        if (drag.kind === 'prot') {
          piece.rot = Math.atan2(dy, dx) * 180 / Math.PI + 90;
        } else {
          const rad = -(piece.rot || 0) * Math.PI / 180;
          const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
          const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
          piece.wFt = Math.max(0.3, Math.min(40, Math.abs(lx) * 2));
          piece.hFt = Math.max(0.3, Math.min(40, Math.abs(ly) * 2));
        }
        renderBoard();
      }
    }
  }

  function onBoardPointerUp(e) {
    pointers.delete(e.pointerId);
    if (drag && (drag.kind === 'pinch' || drag.kind === 'pinchPiece')) { drag = null; if (!state.demo) persist(); render(); return; }
    if (!drag || drag.pointer !== e.pointerId) return;
    const finished = drag;
    drag = null;
    if (finished.kind === 'scale') {
      const len = Logic.lineLength(finished.a.x, finished.a.y, finished.b.x, finished.b.y);
      if (len < 0.2) { setHint('Drag a longer line across something you can measure.'); render(); return; }
      $('scaleFeet').value = '';
      $('scaleBox').hidden = false;
      $('scaleBox').dataset.measured = String(len);
      $('scaleBox').dataset.ax = String(finished.a.x);
      $('scaleBox').dataset.ay = String(finished.a.y);
      setHint('The line is ' + len.toFixed(1) + ' ft on the grid. Type the real length.');
      render();
      return;
    }
    if (finished.kind === 'plant' && finished.moved) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const cell = el && el.closest('[data-cell]');
      const planting = state.plants.filter(function (p) { return p.id === finished.id; })[0];
      if (cell && planting) {
        const parts = cell.getAttribute('data-cell').split(':');
        const bed = bedById(parts[0]);
        const c = Number(parts[1]), r = Number(parts[2]);
        if (bed.id === planting.bedId && Logic.canPlace(bed, state.plants, byId, planting.plantId, c, r, planting.id)) {
          planting.c = c; planting.r = r;
        } else setHint('That spot is taken or too small.');
      }
    }
    persist();
    render();
  }

  function applyScale() {
    const box = $('scaleBox');
    const measured = Number(box.dataset.measured);
    const real = Number($('scaleFeet').value);
    const factor = Logic.scaleFactor(measured, real);
    if (!state.photo || !factor) { setHint('Type the real length in feet.'); return; }
    const ax = Number(box.dataset.ax);
    const ay = Number(box.dataset.ay);
    const fracX = (ax - state.photo.x) / state.photo.wFt;
    const fracY = (ay - state.photo.y) / state.photo.hFt;
    state.photo.wFt *= factor;
    state.photo.hFt *= factor;
    if (isFinite(fracX)) state.photo.x = ax - fracX * state.photo.wFt;
    if (isFinite(fracY)) state.photo.y = ay - fracY * state.photo.hFt;
    box.hidden = true;
    state.tool = 'pan';
    state.demo = false;
    persist();
    render();
    setHint('Photo scale updated. A grid square is now meant to match one foot on the photo.');
  }

  function deletePiece() {
    const piece = selectedPiece();
    if (!piece) { setHint('Select a picture on the yard first.'); return; }
    state.pieces = state.pieces.filter(function (item) { return item.id !== piece.id; });
    state.selectedPiece = null;
    state.demo = false;
    persist();
    render();
  }
  function withPiece(fn) {
    const piece = selectedPiece();
    if (!piece) { setHint('Select a picture on the yard first.'); return; }
    fn(piece);
    state.demo = false;
    persist();
    render();
  }
  async function addStampFiles(list) {
    if (!list || !list.length) return;
    try {
      for (let i = 0; i < list.length; i++) {
        const shrunk = await shrinkStamp(list[i]);
        const id = uid();
        rememberStamp(id, shrunk.blob);
        state.stamps.push({ id: id, name: list[i].name || 'Picture', w: shrunk.w, h: shrunk.h });
        const ft = viewCenter();
        const aspect = shrunk.h / shrunk.w;
        state.pieces.push({
          id: uid(), kind: 'stamp', stampId: id, plantId: null,
          x: ft.x + i * 0.7, y: ft.y, wFt: 2.4, hFt: 2.4 * aspect, rot: 0, flip: false, z: nextZ()
        });
        state.selectedPiece = state.pieces[state.pieces.length - 1].id;
      }
      state.demo = false;
      persist();
      render();
      setHint('Pictures stay in this browser. A PNG keeps a clear background.');
    } catch (err) {
      setHint(err.message || 'Could not add that picture.');
    }
  }
  function loadImg(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('image')); };
      img.src = src;
    });
  }
  async function saveMockup() {
    const photo = state.photo;
    const pieces = state.pieces.slice().sort(function (a, b) { return a.z - b.z; });
    let minX = photo ? photo.x : 0;
    let minY = photo ? photo.y : 0;
    let maxX = photo ? photo.x + photo.wFt : 12;
    let maxY = photo ? photo.y + photo.hFt : 8;
    pieces.forEach(function (p) {
      const pad = Math.hypot(p.wFt, p.hFt) / 2;
      minX = Math.min(minX, p.x - pad);
      minY = Math.min(minY, p.y - pad);
      maxX = Math.max(maxX, p.x + pad);
      maxY = Math.max(maxY, p.y + pad);
    });
    const ftW = Math.max(0.5, maxX - minX);
    const ftH = Math.max(0.5, maxY - minY);
    const scale = Math.min(1400 / ftW, 1000 / ftH);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(ftW * scale));
    c.height = Math.max(1, Math.round(ftH * scale));
    const g = c.getContext('2d');
    g.fillStyle = '#e7f0df';
    g.fillRect(0, 0, c.width, c.height);
    if (photo && photoUrl) {
      try {
        const img = await loadImg(photoUrl);
        g.globalAlpha = Math.max(state.opacity, 0.85);
        g.drawImage(img, (photo.x - minX) * scale, (photo.y - minY) * scale, photo.wFt * scale, photo.hFt * scale);
        g.globalAlpha = 1;
      } catch (e) { /* the yard photo is skipped if it cannot be drawn */ }
    }
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      g.save();
      g.translate((p.x - minX) * scale, (p.y - minY) * scale);
      g.rotate((p.rot || 0) * Math.PI / 180);
      if (p.flip) g.scale(-1, 1);
      const w = p.wFt * scale;
      const h = p.hFt * scale;
      const src = p.kind === 'stamp' ? stampUrls[p.stampId] : (p.kind === 'library' && libraryItem(p.libraryId) ? libraryItem(p.libraryId).full : '');
      if (src) {
        try {
          const img = await loadImg(src);
          g.drawImage(img, -w / 2, -h / 2, w, h);
        } catch (e) { /* skip a picture that failed to load */ }
      } else if (p.kind === 'icon' && byId[p.plantId]) {
        g.font = Math.round(h * 0.7) + 'px Segoe UI, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(byId[p.plantId].emoji, 0, 0);
      }
      g.restore();
    }
    const blob = await new Promise(function (res) { c.toBlob(res, 'image/png'); });
    if (!blob) { setHint('Could not save the image.'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (state.name || 'yard').replace(/[^\w\-]+/g, '-') + '-mockup.png';
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
  }

  function removeSelected() {
    if (state.mode === 'place') { deletePiece(); return; }
    if (!state.selectedPlant) { setHint('Select a plant on the bed first.'); return; }
    state.plants = state.plants.filter(function (p) { return p.id !== state.selectedPlant; });
    state.selectedPlant = null;
    persist();
    render();
  }
  function clearBed() {
    const id = state.selectedBed || (state.beds[0] && state.beds[0].id);
    if (!id) return;
    state.plants = state.plants.filter(function (p) { return p.bedId !== id; });
    state.selectedPlant = null;
    persist();
    render();
  }

  async function onPhotoFile(file) {
    if (!file) return;
    try {
      const shrunk = await shrinkFile(file);
      await setPhotoFromBlob(shrunk.blob, shrunk.w, shrunk.h, null);
      state.tool = 'photo';
      state.demo = false;
      persist();
      render();
      setHint('Drag the photo to line it up. Use Photo size, or Set scale if you know a real length.');
    } catch (err) {
      setHint(err.message || 'Could not use that picture.');
    }
  }

  function exportGarden() {
    const payload = {
      format: 'yardgrid-garden',
      version: 1,
      garden: {
        name: state.name, frost: state.frost, grid: state.grid, opacity: state.opacity,
        photo: state.photo, beds: state.beds, plants: state.plants, ppm: state.ppm, panX: state.panX, panY: state.panY,
        mode: state.mode, pieces: state.pieces, stamps: state.stamps
      },
      photo: null,
      stamps: []
    };
    const finish = function (dataUrl) {
      payload.photo = dataUrl;
      const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      var rawName = (state.name || '').trim();
      var fileStem = (!rawName || rawName === 'My garden') ? 'bloom-and-bed-garden-plan' : rawName.replace(/[^\w\-]+/g, '-').replace(/^-+|-+$/g, '');
      a.download = (fileStem || 'bloom-and-bed-garden-plan') + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1500);
    };
    const stampJobs = state.stamps.map(function (s) {
      const blob = stampBlobs.get(s.id);
      if (!blob) return Promise.resolve(null);
      return new Promise(function (resolve) {
        const reader = new FileReader();
        reader.onload = function () { resolve({ id: s.id, data: reader.result }); };
        reader.onerror = function () { resolve(null); };
        reader.readAsDataURL(blob);
      });
    });
    Promise.all(stampJobs).then(function (rows) {
      payload.stamps = rows.filter(Boolean);
      if (!state.photo) { finish(null); return; }
      idbGet(state.id).then(function (stored) {
        if (!stored || !stored.size) { finish(null); return; }
        const reader = new FileReader();
        reader.onload = function () { finish(reader.result); };
        reader.readAsDataURL(stored);
      }).catch(function () { finish(null); });
    }).catch(function () { finish(null); });
  }

  function importGarden(file) {
    const reader = new FileReader();
    reader.onload = function () {
      let data;
      try { data = JSON.parse(reader.result); }
      catch (e) { setHint('That file is not a Bloom & Bed Garden plan.'); return; }
      if (!data || data.format !== 'yardgrid-garden' || !data.garden) { setHint('That file is not a Bloom & Bed Garden plan.'); return; }
      const g = data.garden;
      Object.assign(state, blank(), {
        id: uid(), name: g.name || 'Imported garden', frost: g.frost || '', grid: g.grid !== false,
        opacity: typeof g.opacity === 'number' ? g.opacity : 0.62,
        photo: g.photo || null, beds: g.beds || [], plants: g.plants || [],
        ppm: g.ppm || 42, panX: g.panX || 24, panY: g.panY || 24,
        mode: g.mode === 'place' ? 'place' : 'grid',
        pieces: g.pieces || [], stamps: g.stamps || [], selectedPiece: null, demo: false
      });
      const after = function () { persist(); render(); setHint('Garden imported. It stays in this browser.'); };
      const stampLoads = (data.stamps || []).map(function (row) {
        if (!row || !row.id || typeof row.data !== 'string') return Promise.resolve();
        return fetch(row.data).then(function (r) { return r.blob(); }).then(function (blob) {
          rememberStamp(row.id, blob);
        }).catch(function () {});
      });
      Promise.all(stampLoads).then(function () {
      if (data.photo && typeof data.photo === 'string') {
        fetch(data.photo).then(function (r) { return r.blob(); }).then(function (blob) {
          return setPhotoFromBlob(blob, state.photo.natW || 1, state.photo.natH || 1, state.photo);
        }).then(after).catch(function () { state.photo = null; after(); });
      } else after();
      });
    };
    reader.readAsText(file);
  }

  function saveNamed() {
    state.demo = false;
    const list = namedSaves();
    list.unshift({ name: state.name || 'Garden', saved: new Date().toISOString(), data: JSON.parse(JSON.stringify(state)) });
    writeSaves(list.slice(0, 20));
    persist();
    render();
    setHint('Saved in this browser.');
  }
  function loadNamed() {
    const list = namedSaves();
    const item = list[Number($('saveList').value)];
    if (!item) return;
    Object.assign(state, blank(), item.data, { tool: 'pan', armed: null, demo: false });
    if (!state.pieces) state.pieces = [];
    if (!state.stamps) state.stamps = [];
    Promise.all([idbGet(state.id), loadStampBlobs()]).then(function (rows) {
      const blob = rows[0];
      if (blob && state.photo) {
        if (photoUrl) URL.revokeObjectURL(photoUrl);
        photoUrl = URL.createObjectURL(blob);
      }
      persist();
      render();
    }).catch(function () { persist(); render(); });
  }

  function drawSample(cb) {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 600;
    const g = c.getContext('2d');
    g.fillStyle = '#7ea86a';
    g.fillRect(0, 0, 900, 600);
    g.fillStyle = '#cbbba6';
    g.fillRect(36, 36, 260, 180);
    g.strokeStyle = '#6b4a32';
    g.lineWidth = 14;
    g.beginPath();
    g.moveTo(120, 470);
    g.lineTo(480, 470);
    g.stroke();
    g.fillStyle = '#3d2918';
    g.font = '28px Segoe UI, sans-serif';
    g.fillText('Sample yard drawing', 36, 560);
    g.font = '20px Segoe UI, sans-serif';
    g.fillText('The brown line is 6 ft in this demo', 36, 520);
    c.toBlob(function (blob) { cb(blob); }, 'image/jpeg', 0.8);
  }

  function paintStamp(draw) {
    const c = document.createElement('canvas');
    c.width = 360;
    c.height = 360;
    draw(c.getContext('2d'), 360, 360);
    return new Promise(function (res) { c.toBlob(res, 'image/png'); });
  }
  function drawFlower(g, w, h) {
    g.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    g.strokeStyle = '#2f6b4f';
    g.lineWidth = 12;
    g.beginPath();
    g.moveTo(cx, cy + 30);
    g.lineTo(cx, h - 20);
    g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      g.fillStyle = i % 2 ? '#e36b8a' : '#f4a3b5';
      g.beginPath();
      g.ellipse(cx + Math.cos(a) * 72, cy + Math.sin(a) * 72, 46, 26, a, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#f2c14e';
    g.beginPath();
    g.arc(cx, cy, 34, 0, Math.PI * 2);
    g.fill();
  }
  function drawShrub(g, w, h) {
    g.clearRect(0, 0, w, h);
    [[130, 210, 88, '#3e7a45'], [200, 170, 108, '#2f6b4f'], [260, 214, 78, '#4e8d55']].forEach(function (b) {
      g.fillStyle = b[3];
      g.beginPath();
      g.arc(b[0], b[1], b[2], 0, Math.PI * 2);
      g.fill();
    });
  }
  function drawPot(g, w, h) {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#2f6b4f';
    g.beginPath();
    g.ellipse(180, 140, 64, 32, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c46a3a';
    g.beginPath();
    g.moveTo(112, 160);
    g.lineTo(248, 160);
    g.lineTo(228, 300);
    g.lineTo(132, 300);
    g.closePath();
    g.fill();
    g.fillStyle = '#a8562e';
    g.fillRect(108, 150, 144, 18);
  }
  function addSamplePieces() {
    Promise.all([paintStamp(drawFlower), paintStamp(drawShrub), paintStamp(drawPot)]).then(function (blobs) {
      const specs = [
        { name: 'Sample flower', blob: blobs[0], x: 3.2, y: 2.6, w: 2.4 },
        { name: 'Sample shrub', blob: blobs[1], x: 8.4, y: 3.4, w: 3.2 },
        { name: 'Sample pot', blob: blobs[2], x: 6.1, y: 6.2, w: 1.7 }
      ];
      specs.forEach(function (s, i) {
        if (!s.blob) return;
        const id = uid();
        rememberStamp(id, s.blob);
        state.stamps.push({ id: id, name: s.name, w: 360, h: 360 });
        state.pieces.push({
          id: uid(), kind: 'stamp', stampId: id, plantId: null,
          x: s.x, y: s.y, wFt: s.w, hFt: s.w, rot: 0, flip: false, z: i + 1
        });
      });
      placeLibraryArrangement();
      if (state.pieces.length) state.selectedPiece = state.pieces[state.pieces.length - 1].id;
      render();
      setHint('Placement demo. The plant photos are generated for this site. The yard drawing is not a photograph.');
    });
  }

  function placeLibraryArrangement() {
    const items = window.YardPhotos && YardPhotos.items;
    if (!items || !items.length) return;
    const byName = {};
    items.forEach(function (item) { byName[item.name] = item; });
    const spots = [
      ['Glass vase', 2.0, 2.2, 1.3],
      ['Rose', 1.3, 1.4, 1.5],
      ['Tulip', 2.8, 1.4, 1.3],
      ['Hydrangea', 3.5, 2.3, 1.6],
      ['Daisy', 2.0, 3.0, 1.1],
      ['Lavender', 8.4, 3.8, 2.1],
      ['Boxwood', 11.5, 3.2, 3.0],
      ['Daylily', 7.2, 6.2, 2.0],
      ['Coneflower', 9.6, 6.5, 2.0]
    ];
    spots.forEach(function (spot, i) {
      const item = byName[spot[0]];
      if (!item) return;
      const aspect = item.w ? item.h / item.w : 1.2;
      state.pieces.push({
        id: uid(), kind: 'library', libraryId: item.id, stampId: null, plantId: null,
        x: spot[1], y: spot[2], wFt: spot[3], hFt: spot[3] * aspect,
        rot: 0, flip: false, z: 30 + i
      });
    });
  }

  function loadDemo() {
    state.demo = true;
    state.name = 'Demo garden';
    state.frost = '2026-05-15';
    const placement = /(?:\?|&)placement=1(?:&|$)/.test(location.search);
    if (placement) {
      state.mode = 'place';
      state.grid = false;
      state.opacity = 0.95;
    }
    state.beds = [{ id: 'bed1', name: 'Bed 1', x: 4, y: 1, w: 4, h: 8 }];
    state.plants = [
      { id: 'p1', bedId: 'bed1', plantId: 'carrot', c: 0, r: 0 },
      { id: 'p2', bedId: 'bed1', plantId: 'lettuce', c: 1, r: 0 },
      { id: 'p3', bedId: 'bed1', plantId: 'tomato', c: 2, r: 1 },
      { id: 'p4', bedId: 'bed1', plantId: 'basil', c: 0, r: 2 },
      { id: 'p5', bedId: 'bed1', plantId: 'marigold', c: 2, r: 0 },
      { id: 'p6', bedId: 'bed1', plantId: 'bean', c: 1, r: 3 }
    ];
    state.selectedBed = 'bed1';
    render();
    requestAnimationFrame(frameDemoBed);
    drawSample(function (blob) {
      const wFt = 15;
      state.photo = { x: 0, y: 0, wFt: wFt, hFt: wFt * (600 / 900), natW: 900, natH: 600 };
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = URL.createObjectURL(blob);
      render();
      frameDemoBed();
      if (placement) addSamplePieces();
      else setHint('Demo only. The yard is a drawing, and the fence line is 6 ft. Save will store a copy.');
    });
  }

  function frameDemoBed() {
    if (window.innerWidth > 980 || !state.demo) return;
    const vp = $('viewport');
    if (!vp || !vp.clientWidth) return;
    if (state.mode === 'place' && state.photo) {
      const margin = 8;
      const fit = (vp.clientWidth - margin * 2) / state.photo.wFt;
      state.ppm = Math.max(18, Math.min(42, fit));
      state.panX = margin - state.photo.x * state.ppm;
      state.panY = margin - state.photo.y * state.ppm;
      renderBoard();
      return;
    }
    if (!state.beds.length) return;
    const bed = state.beds[0];
    const margin = 8;
    let pan = state.panX;
    const right = pan + (bed.x + bed.w) * state.ppm;
    if (right > vp.clientWidth - margin) pan -= right - (vp.clientWidth - margin);
    const left = pan + bed.x * state.ppm;
    if (left < margin) pan += margin - left;
    if (pan === state.panX) return;
    state.panX = pan;
    renderBoard();
  }

  function howPrefs() {
    try { return JSON.parse(localStorage.getItem('yardgrid-hide-how') || '{}') || {}; }
    catch (e) { return {}; }
  }
  function syncHow() {
    const hide = howPrefs();
    const grid = $('howGrid');
    const place = $('howPlace');
    if (!grid || !place) return;
    grid.hidden = state.mode === 'place';
    place.hidden = state.mode !== 'place';
    grid.classList.toggle('collapsed', !!hide.grid);
    place.classList.toggle('collapsed', !!hide.place);
    $('howGridToggle').textContent = hide.grid ? 'Show video' : 'Hide video';
    $('howPlaceToggle').textContent = hide.place ? 'Show video' : 'Hide video';
  }
  function toggleHow(which) {
    const hide = howPrefs();
    hide[which] = !hide[which];
    try { localStorage.setItem('yardgrid-hide-how', JSON.stringify(hide)); } catch (e) { /* the choice is optional */ }
    syncHow();
  }
  function setPlantsOpen(open) {
    $('library').classList.toggle('open', open);
    $('plantsToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function wire() {
    $('photoToggle').addEventListener('click', function () {
      const open = $('photoPanel').classList.toggle('open');
      $('photoToggle').setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    if (location.hash === '#photo') {
      $('photoPanel').classList.add('open');
      $('photoToggle').setAttribute('aria-expanded', 'true');
    }
    function setMode(mode) {
      state.mode = mode === 'place' ? 'place' : 'grid';
      if (state.mode !== 'place') state.selectedPiece = null;
      if (!state.demo) persist();
      render();
      setHint(state.mode === 'place'
        ? 'Add pictures, then drag them on the yard. Select one and pinch with two fingers to resize and turn it.'
        : 'Grid plan. Beds and spacing are back.');
    }
    $('howGridToggle').addEventListener('click', function () { toggleHow('grid'); });
    $('howPlaceToggle').addEventListener('click', function () { toggleHow('place'); });
    $('modeGrid').addEventListener('click', function () { setMode('grid'); });
    $('modePlace').addEventListener('click', function () { setMode('place'); });
    $('stampFile').addEventListener('change', function (e) { addStampFiles(e.target.files); e.target.value = ''; });
    $('stampTray').addEventListener('click', function (e) {
      const btn = e.target.closest('[data-stamp]');
      if (!btn) return;
      const stamp = state.stamps.filter(function (s) { return s.id === btn.getAttribute('data-stamp'); })[0];
      if (!stamp) return;
      const ft = viewCenter();
      const aspect = stamp.w ? stamp.h / stamp.w : 1;
      addPiece({ kind: 'stamp', stampId: stamp.id, x: ft.x, y: ft.y, wFt: 2.4, hFt: 2.4 * aspect });
    });
    $('pieceDup').addEventListener('click', function () {
      withPiece(function (piece) {
        state.pieces.push({
          id: uid(), kind: piece.kind, stampId: piece.stampId, plantId: piece.plantId, libraryId: piece.libraryId,
          x: piece.x + 0.6, y: piece.y + 0.6, wFt: piece.wFt, hFt: piece.hFt,
          rot: piece.rot, flip: piece.flip, z: nextZ()
        });
        state.selectedPiece = state.pieces[state.pieces.length - 1].id;
      });
    });
    $('pieceFlip').addEventListener('click', function () { withPiece(function (piece) { piece.flip = !piece.flip; }); });
    $('pieceForward').addEventListener('click', function () { withPiece(function (piece) { piece.z = nextZ(); }); });
    $('pieceBack').addEventListener('click', function () {
      withPiece(function (piece) {
        let z = piece.z;
        state.pieces.forEach(function (item) { if (item.z <= z) z = item.z - 1; });
        piece.z = z;
      });
    });
    $('pieceDelete').addEventListener('click', deletePiece);
    $('saveImage').addEventListener('click', function () { saveMockup(); });
    $('plantsToggle').addEventListener('click', function () { setPlantsOpen(!$('library').classList.contains('open')); });
    $('plantsClose').addEventListener('click', function () { setPlantsOpen(false); });
    $('filter').addEventListener('input', renderLibrary);
    $('plantList').addEventListener('pointerdown', onLibraryPointerDown);
    $('plantList').addEventListener('pointermove', onLibraryPointerMove);
    $('plantList').addEventListener('pointerup', onLibraryPointerUp);
    $('viewport').addEventListener('pointerdown', onBoardPointerDown);
    $('viewport').addEventListener('pointermove', onBoardPointerMove);
    $('viewport').addEventListener('pointerup', onBoardPointerUp);
    $('viewport').addEventListener('pointercancel', onBoardPointerUp);
    $('addBed').addEventListener('click', addBed);
    $('gardenName').addEventListener('change', function () { state.name = $('gardenName').value; state.demo = false; persist(); renderPrint(); });
    $('frost').addEventListener('change', function () { state.frost = $('frost').value; state.demo = false; persist(); renderSide(); });
    $('opacity').addEventListener('input', function () { state.opacity = Number($('opacity').value); renderBoard(); renderPrint(); });
    $('opacity').addEventListener('change', function () { state.demo = false; persist(); });
    $('gridOn').addEventListener('change', function () { state.grid = $('gridOn').checked; state.demo = false; persist(); renderBoard(); });
    $('photoSize').addEventListener('input', function () {
      if (!state.photo) return;
      const next = Number($('photoSize').value);
      const ratio = state.photo.hFt / state.photo.wFt;
      state.photo.wFt = next;
      state.photo.hFt = next * ratio;
      renderBoard();
    });
    $('photoSize').addEventListener('change', function () { state.demo = false; persist(); });
    $('toolPan').addEventListener('click', function () { state.tool = 'pan'; render(); setHint('Drag empty board to move the view. Drag a plant to another empty square.'); });
    $('toolPhoto').addEventListener('click', function () {
      if (!state.photo) { setHint('Add a photo first.'); return; }
      state.tool = 'photo'; render(); setHint('Drag to move the photo. The grid stays put.');
    });
    $('toolScale').addEventListener('click', function () {
      if (!state.photo) { setHint('Add a photo first.'); return; }
      state.tool = 'scale'; render(); setHint('Drag a line across something you know, like a fence section, then type its length in feet.');
    });
    $('scaleApply').addEventListener('click', applyScale);
    $('scaleCancel').addEventListener('click', function () { $('scaleBox').hidden = true; state.tool = 'pan'; render(); });
    $('photoFile').addEventListener('change', function (e) { onPhotoFile(e.target.files[0]); e.target.value = ''; });
    $('cameraFile').addEventListener('change', function (e) { onPhotoFile(e.target.files[0]); e.target.value = ''; });
    $('removePhoto').addEventListener('click', function () {
      state.photo = null;
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      photoUrl = null;
      idbPut(state.id, new Blob([])).catch(function () {});
      state.tool = 'pan';
      state.demo = false;
      persist();
      render();
    });
    $('removePlant').addEventListener('click', removeSelected);
    $('clearBed').addEventListener('click', clearBed);
    $('saveBtn').addEventListener('click', saveNamed);
    $('loadBtn').addEventListener('click', loadNamed);
    $('exportBtn').addEventListener('click', exportGarden);
    $('importFile').addEventListener('change', function (e) { if (e.target.files[0]) importGarden(e.target.files[0]); e.target.value = ''; });
    $('printBtn').addEventListener('click', function () { renderPrint(); window.print(); });
    document.querySelectorAll('.tabs button').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.tabs button').forEach(function (b) { b.classList.toggle('on', b === btn); });
        document.querySelectorAll('.panel').forEach(function (p) { p.classList.toggle('on', p.id === btn.getAttribute('data-tab')); });
      });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { state.armed = null; state.tool = 'pan'; render(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (e.target.matches('input, textarea')) return;
        if (state.mode === 'place') deletePiece();
        else removeSelected();
      }
    });
    $('viewport').addEventListener('wheel', function (e) {
      e.preventDefault();
      const next = state.ppm * (e.deltaY < 0 ? 1.08 : 0.92);
      state.ppm = Math.max(18, Math.min(90, next));
      renderBoard();
      persist();
    }, { passive: false });
  }

  function start() {
    wire();
    const demo = /(?:\?|&)demo=1(?:&|$)/.test(location.search);
    if (demo) { loadDemo(); return; }
    const had = loadCurrent();
    const chartTouch = applyChartQuery();
    const jobs = [];
    if (had && state.photo) {
      jobs.push(idbGet(state.id).then(function (blob) {
        if (blob && blob.size) photoUrl = URL.createObjectURL(blob);
        else state.photo = null;
      }).catch(function () { state.photo = null; }));
    }
    if (had) jobs.push(loadStampBlobs());
    Promise.all(jobs).then(function () {
      render();
      if (chartTouch) persist();
      if (!state.beds.length && state.mode !== 'place') setHint('Add a bed, then tap a plant and tap a square. On a phone you can also drag the plant.');
    });
  }

  start();
})();
