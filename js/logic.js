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

  return {
    parseISO: parseISO,
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
