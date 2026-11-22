/* Pure garden math: dates, occupancy, neighbors, scale, shopping. No DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YardLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
    return d;
  }

  function addDays(iso, days) {
    const d = parseISO(iso);
    if (!d || !isFinite(days)) return null;
    d.setDate(d.getDate() + days);
    return d;
  }

  function fmt(d) {
    if (!d) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function rangeText(iso, pair) {
    if (!pair) return '';
    const a = addDays(iso, pair[0]);
    const b = addDays(iso, pair[1]);
    if (!a || !b) return '';
    const fa = fmt(a), fb = fmt(b);
    return fa === fb ? fa : fa + ' – ' + fb;
  }

  function calendarRows(plantings, byId, frost) {
    const ids = [];
    plantings.forEach(function (p) { if (ids.indexOf(p.plantId) === -1) ids.push(p.plantId); });
    return ids.map(function (id) {
      const plant = byId[id];
      if (!plant) return null;
      return {
        id: id,
        name: plant.name,
        indoor: frost ? rangeText(frost, plant.indoor) : '',
        indoorNote: plant.indoorNote || '',
        transplant: frost ? rangeText(frost, plant.transplant) : '',
        transplantNote: plant.transplantNote || '',
        direct: frost ? rangeText(frost, plant.direct) : '',
        directNote: plant.directNote || '',
        timingNote: plant.timingNote || ''
      };
    }).filter(Boolean);
  }

  function cellKey(c, r) { return c + ',' + r; }

  function footprint(planting, byId) {
    const plant = byId[planting.plantId];
    const cells = [];
    if (!plant) return cells;
    for (let r = 0; r < plant.spanR; r++) {
      for (let c = 0; c < plant.spanC; c++) cells.push({ c: planting.c + c, r: planting.r + r });
    }
    return cells;
  }

  function occupied(bedId, plantings, byId, ignoreId) {
    const map = new Map();
    plantings.forEach(function (p) {
      if (p.bedId !== bedId || p.id === ignoreId) return;
      footprint(p, byId).forEach(function (cell) { map.set(cellKey(cell.c, cell.r), p.id); });
    });
    return map;
  }

  function canPlace(bed, plantings, byId, plantId, c, r, ignoreId) {
    const plant = byId[plantId];
    if (!plant || !bed) return false;
    if (c < 0 || r < 0 || c + plant.spanC > bed.w || r + plant.spanR > bed.h) return false;
    const map = occupied(bed.id, plantings, byId, ignoreId);
    for (let y = r; y < r + plant.spanR; y++) {
      for (let x = c; x < c + plant.spanC; x++) {
        if (map.has(cellKey(x, y))) return false;
      }
    }
    return true;
  }

  function covers(planting, byId, c, r) {
    const plant = byId[planting.plantId];
    if (!plant) return false;
    return c >= planting.c && r >= planting.r && c < planting.c + plant.spanC && r < planting.r + plant.spanR;
  }

  function findAt(plantings, byId, bedId, c, r) {
    for (let i = 0; i < plantings.length; i++) {
      const p = plantings[i];
      if (p.bedId === bedId && covers(p, byId, c, r)) return p;
    }
    return null;
  }

  function rectsTouch(a, b) {
    const aRight = a.c + a.spanC - 1, aBot = a.r + a.spanR - 1;
    const bRight = b.c + b.spanC - 1, bBot = b.r + b.spanR - 1;
    const overlapC = a.c <= bRight && b.c <= aRight;
    const overlapR = a.r <= bBot && b.r <= aBot;
    if (overlapC && overlapR) return false;
    const gapC = aRight < b.c ? b.c - aRight : a.c - bRight;
    const gapR = aBot < b.r ? b.r - aBot : a.r - bBot;
    if (overlapC && gapR === 1) return true;
    if (overlapR && gapC === 1) return true;
    return false;
  }

  const NEMATODE = {
    tomato: 1, pepper: 1, eggplant: 1, potato: 1, bean: 1, cucumber: 1,
    squash: 1, wintersquash: 1, cantaloupe: 1, watermelon: 1, onion: 1, scallion: 1, garlic: 1
  };
  const FIXER = { bean: 1, pea: 1 };

  function pairNote(a, b) {
    const ids = [a, b];
    if (ids.indexOf('marigold') !== -1) {
      const other = a === 'marigold' ? b : a;
      if (NEMATODE[other]) {
        return {
          kind: 'caution',
          plants: [a, b],
          text: 'A marigold beside this crop is not a proven pest fix. SDSU calls the tomato–marigold nematode story anecdotal. Clemson and LSU say French or African marigolds can lower root-knot nematodes only as a solid cover crop, grown at least two months and then turned under, before a susceptible crop. A few flowers next to the vegetable do not do that.'
        };
      }
    }
    if ((FIXER[a] && !FIXER[b]) || (FIXER[b] && !FIXER[a])) {
      return {
        kind: 'note',
        plants: [a, b],
        text: 'Beans and peas fix nitrogen. SDSU says most of that nitrogen becomes available at the end of the season, not as a live boost to the plant next door.'
      };
    }
    return null;
  }

  function neighborNotes(bedId, plantings, byId) {
    const mine = plantings.filter(function (p) { return p.bedId === bedId; }).map(function (p) {
      const plant = byId[p.plantId];
      return plant ? { id: p.plantId, c: p.c, r: p.r, spanC: plant.spanC, spanR: plant.spanR } : null;
    }).filter(Boolean);
    const out = [];
    const seen = {};
    for (let i = 0; i < mine.length; i++) {
      for (let j = i + 1; j < mine.length; j++) {
        if (!rectsTouch(mine[i], mine[j])) continue;
        const key = [mine[i].id, mine[j].id].sort().join('|');
        if (seen[key]) continue;
        const note = pairNote(mine[i].id, mine[j].id);
        if (note) { seen[key] = 1; out.push(note); }
      }
    }
    return out;
  }

  function shopping(plantings, byId) {
    const tally = {};
    plantings.forEach(function (p) {
      const plant = byId[p.plantId];
      if (!plant) return;
      if (!tally[p.plantId]) tally[p.plantId] = { id: p.plantId, name: plant.name, plants: 0, squares: 0 };
      tally[p.plantId].plants += plant.perSq;
      tally[p.plantId].squares += plant.spanC * plant.spanR;
    });
    return Object.keys(tally).map(function (k) { return tally[k]; });
  }

  /* The line measures `measuredFt` on the current grid, but the user says it is `realFt`.
     Multiply the photo's foot-width by this factor so that feature spans `realFt`. */
  function scaleFactor(measuredFt, realFt) {
    if (!(measuredFt > 0) || !(realFt > 0)) return null;
    return realFt / measuredFt;
  }

  function lineLength(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /* A garden can arrive from a share link, an imported file, or browser storage. The planner
     writes its fields into HTML, so keep only the fields it uses, with ids and numbers in a safe shape.
     plantIds and libraryIds are lookups of known ids ({ id: true }). */
  const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;
  function safeId(v) { return typeof v === 'string' && SAFE_ID.test(v) ? v : null; }
  function num(v, lo, hi, fallback) {
    const n = Number(v);
    if (typeof v === 'boolean' || v === null || v === '' || !isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  }
  function int(v, lo, hi, fallback) {
    const n = num(v, lo, hi, null);
    return n == null ? fallback : Math.round(n);
  }
  function text(v, max, fallback) {
    return typeof v === 'string' ? v.slice(0, max) : fallback;
  }
  function list(v, max) { return Array.isArray(v) ? v.slice(0, max) : []; }
  function cleanGarden(g, plantIds, libraryIds) {
    g = g && typeof g === 'object' ? g : {};
    plantIds = plantIds || {};
    libraryIds = libraryIds || {};
    const BIG = 100000;
    const out = {
      name: text(g.name, 80, 'My garden'),
      frost: parseISO(g.frost) ? g.frost : '',
      ppm: num(g.ppm, 6, 200, 42),
      panX: num(g.panX, -BIG, BIG, 24),
      panY: num(g.panY, -BIG, BIG, 24),
      grid: g.grid !== false,
      opacity: num(g.opacity, 0, 1, 0.62),
      mode: g.mode === 'place' ? 'place' : 'grid',
      photo: null,
      beds: [], plants: [], pieces: [], stamps: []
    };
    if (safeId(g.id)) out.id = g.id;
    if (g.photo && typeof g.photo === 'object') {
      out.photo = {
        x: num(g.photo.x, -BIG, BIG, 0), y: num(g.photo.y, -BIG, BIG, 0),
        wFt: num(g.photo.wFt, 0.1, 1000, 18), hFt: num(g.photo.hFt, 0.1, 1000, 18),
        natW: int(g.photo.natW, 1, 20000, 1), natH: int(g.photo.natH, 1, 20000, 1)
      };
    }
    const bedIds = {};
    list(g.beds, 200).forEach(function (b) {
      if (!b || !safeId(b.id) || bedIds[b.id]) return;
      bedIds[b.id] = true;
      out.beds.push({
        id: b.id, name: text(b.name, 80, 'Bed'),
        x: num(b.x, -BIG, BIG, 0), y: num(b.y, -BIG, BIG, 0),
        w: int(b.w, 1, 50, 4), h: int(b.h, 1, 50, 8)
      });
    });
    list(g.plants, 5000).forEach(function (p) {
      if (!p || !safeId(p.id) || !bedIds[p.bedId] || !plantIds[p.plantId]) return;
      out.plants.push({ id: p.id, bedId: p.bedId, plantId: p.plantId, c: int(p.c, 0, 49, 0), r: int(p.r, 0, 49, 0) });
    });
    const stampIds = {};
    list(g.stamps, 500).forEach(function (s) {
      if (!s || !safeId(s.id) || stampIds[s.id]) return;
      stampIds[s.id] = true;
      out.stamps.push({ id: s.id, name: text(s.name, 80, 'Picture'), w: int(s.w, 1, 20000, 360), h: int(s.h, 1, 20000, 360) });
    });
    list(g.pieces, 2000).forEach(function (p) {
      if (!p || !safeId(p.id)) return;
      const kind = p.kind === 'icon' || p.kind === 'library' ? p.kind : 'stamp';
      out.pieces.push({
        id: p.id, kind: kind,
        stampId: kind === 'stamp' && stampIds[p.stampId] ? p.stampId : null,
        plantId: kind === 'icon' && plantIds[p.plantId] ? p.plantId : null,
        libraryId: kind === 'library' && libraryIds[p.libraryId] ? p.libraryId : null,
        x: num(p.x, -BIG, BIG, 0), y: num(p.y, -BIG, BIG, 0),
        wFt: num(p.wFt, 0.05, 1000, 1), hFt: num(p.hFt, 0.05, 1000, 1),
        rot: num(p.rot, -36000, 36000, 0), flip: p.flip === true, z: int(p.z, -BIG, BIG, 0)
      });
    });
    return out;
  }

  return {
    parseISO: parseISO,
    cleanGarden: cleanGarden,
    addDays: addDays,
    fmt: fmt,
    rangeText: rangeText,
    calendarRows: calendarRows,
    footprint: footprint,
    occupied: occupied,
    canPlace: canPlace,
    findAt: findAt,
    neighborNotes: neighborNotes,
    pairNote: pairNote,
    shopping: shopping,
    scaleFactor: scaleFactor,
    lineLength: lineLength
  };
});
