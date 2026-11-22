/* What to plant this week: frost-relative windows for the current week and the next few.
   Spring indoor, set-out, and direct-sow dates count from the last 32°F date.
   Fall clove planting counts from the first 32°F date. No DOM. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YardWeek = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var SPRING_KINDS = [
    { key: 'indoor', label: 'Start indoors' },
    { key: 'transplant', label: 'Set out' },
    { key: 'direct', label: 'Direct sow' }
  ];
  var GROUPS = SPRING_KINDS.concat([{ key: 'fallDirect', label: 'Plant cloves' }]);

  function dateOnly(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function addDaysDate(d, n) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
  }

  function startOfWeek(now) {
    var d = dateOnly(now);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }

  function endOfWeek(start) {
    return addDaysDate(start, 6);
  }

  function lastFrostIso(charts, mmdd, now) {
    return mmdd ? charts.iso(mmdd, charts.planYear(now)) : '';
  }

  /* First-frost dates in January–June belong to the winter after summer, so
     November uses next year’s January date. Offer nearby years and let the
     week filter pick the relevant window. */
  function firstFrostIsos(charts, mmdd, now) {
    if (!mmdd || !charts.doy(mmdd)) return [];
    var y = now.getFullYear();
    return [y - 1, y, y + 1, y + 2].map(function (year) { return charts.iso(mmdd, year); }).filter(Boolean);
  }

  function displayFirstIso(charts, mmdd, now) {
    if (!mmdd || !charts.doy(mmdd)) return '';
    var y = now.getFullYear();
    var month = now.getMonth();
    var mm = Number(mmdd.slice(0, 2));
    if (mm >= 7) {
      return charts.iso(mmdd, month >= 6 ? y : y - 1);
    }
    return charts.iso(mmdd, month >= 6 ? y + 1 : y);
  }

  function rangeOf(logic, iso, pair) {
    if (!iso || !pair) return null;
    var a = logic.addDays(iso, pair[0]);
    var b = logic.addDays(iso, pair[1]);
    if (!a || !b) return null;
    if (b < a) { var t = a; a = b; b = t; }
    return { start: dateOnly(a), end: dateOnly(b) };
  }

  function windowsFor(plant, logic, charts, lastIso, firstMmdd, now) {
    var out = [];
    SPRING_KINDS.forEach(function (k) {
      var r = rangeOf(logic, lastIso, plant[k.key]);
      if (!r) return;
      out.push({
        id: plant.id,
        name: plant.name,
        kind: k.key,
        label: k.label,
        start: r.start,
        end: r.end,
        note: plant[k.key + 'Note'] || plant.timingNote || ''
      });
    });
    if (plant.fallDirect && firstMmdd) {
      firstFrostIsos(charts, firstMmdd, now).forEach(function (iso) {
        var r = rangeOf(logic, iso, plant.fallDirect);
        if (!r) return;
        out.push({
          id: plant.id,
          name: plant.name,
          kind: 'fallDirect',
          label: 'Plant cloves',
          start: r.start,
          end: r.end,
          note: plant.fallDirectNote || plant.timingNote || ''
        });
      });
    }
    return out;
  }

  function overlaps(win, start, end) {
    return win.start <= end && win.end >= start;
  }

  function kindKey(win) {
    return win.id + ':' + win.kind + ':' + win.start.getFullYear();
  }

  function sortWins(list) {
    return list.slice().sort(function (a, b) {
      var c = a.start - b.start;
      if (c) return c;
      if (a.name !== b.name) return a.name < b.name ? -1 : 1;
      return a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : 0;
    });
  }

  function earliestByKind(list) {
    var seen = {};
    var out = [];
    sortWins(list).forEach(function (w) {
      var k = w.id + ':' + w.kind;
      if (seen[k]) return;
      seen[k] = 1;
      out.push(w);
    });
    return out;
  }

  function countWins(groups) {
    return GROUPS.reduce(function (n, g) { return n + (groups[g.key] || []).length; }, 0);
  }

  function emptyGroups() {
    var g = {};
    GROUPS.forEach(function (k) { g[k.key] = []; });
    return g;
  }

  function report(plants, logic, charts, place, now) {
    now = now ? dateOnly(now) : dateOnly(new Date());
    var weekStart = startOfWeek(now);
    var weekEnd = endOfWeek(weekStart);
    var comingStart = addDaysDate(weekStart, 7);
    var comingEnd = addDaysDate(weekStart, 27);
    var lastIso = place && place.last ? lastFrostIso(charts, place.last, now) : '';
    var firstMmdd = place && place.first ? place.first : '';
    var firstIso = firstMmdd ? displayFirstIso(charts, firstMmdd, now) : '';
    var thisWeek = emptyGroups();
    var coming = emptyGroups();
    var laterPool = [];
    var seenThis = {};
    var seenComing = {};

    (plants || []).forEach(function (plant) {
      windowsFor(plant, logic, charts, lastIso, firstMmdd, now).forEach(function (w) {
        if (overlaps(w, weekStart, weekEnd)) {
          if (seenThis[kindKey(w)]) return;
          seenThis[kindKey(w)] = 1;
          thisWeek[w.kind].push(w);
        } else if (overlaps(w, comingStart, comingEnd)) {
          if (seenComing[kindKey(w)]) return;
          seenComing[kindKey(w)] = 1;
          coming[w.kind].push(w);
        } else if (w.start > comingEnd) {
          laterPool.push(w);
        }
      });
    });

    GROUPS.forEach(function (g) {
      thisWeek[g.key] = sortWins(thisWeek[g.key]);
      coming[g.key] = sortWins(coming[g.key]);
    });

    var later = earliestByKind(laterPool);
    var wave = [];
    if (later.length) {
      var waveEnd = addDaysDate(later[0].start, 41);
      later.forEach(function (w) {
        if (w.start <= waveEnd) wave.push(w);
      });
    }

    var thisCount = countWins(thisWeek);
    var comingCount = countWins(coming);
    var springThis = thisWeek.indoor.length + thisWeek.transplant.length + thisWeek.direct.length;

    return {
      now: now,
      weekStart: weekStart,
      weekEnd: weekEnd,
      comingStart: comingStart,
      comingEnd: comingEnd,
      lastIso: lastIso,
      firstIso: firstIso,
      hasFrost: !!(lastIso || firstIso),
      thisWeek: thisWeek,
      coming: coming,
      later: wave,
      thisCount: thisCount,
      comingCount: comingCount,
      springThis: springThis,
      offSeason: thisCount === 0,
      planning: springThis === 0
    };
  }

  function fmtRange(logic, win) {
    var a = logic.fmt(win.start);
    var b = logic.fmt(win.end);
    return a === b ? a : a + ' – ' + b;
  }

  function fmtSpan(logic, start, end) {
    var a = logic.fmt(start);
    var b = logic.fmt(end);
    return a === b ? a : a + ' – ' + b;
  }

  function esc(charts, s) {
    return charts.esc(s);
  }

  function tableHtml(charts, logic, list, plantBase) {
    if (!list.length) return '';
    var rows = list.map(function (w) {
      var href = plantBase + w.id + '.html';
      var note = w.kind === 'fallDirect' && w.note ? '<tr><td></td><td colspan="2" class="muted">' + esc(charts, w.note) + '</td></tr>' : '';
      return '<tr><td><a href="' + esc(charts, href) + '">' + esc(charts, w.name) + '</a></td><td>' +
        esc(charts, w.label) + '</td><td>' + esc(charts, fmtRange(logic, w)) + '</td></tr>' + note;
    }).join('');
    return '<table><thead><tr><th>Plant</th><th>Task</th><th>Window</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function sectionHtml(charts, logic, title, id, groupsOrList, plantBase) {
    var list;
    if (Array.isArray(groupsOrList)) list = groupsOrList;
    else {
      list = [];
      GROUPS.forEach(function (g) { list = list.concat(groupsOrList[g.key] || []); });
    }
    if (!list.length) return '';
    return '<section class="week-block" id="' + esc(charts, id) + '"><h2>' + esc(charts, title) + '</h2>' +
      tableHtml(charts, logic, list, plantBase) + '</section>';
  }

  function render(rep, logic, charts, opts) {
    opts = opts || {};
    var plantBase = opts.plantBase || '../plants/';
    var plannerHref = opts.plannerHref || '../plan.html';
    if (!rep.hasFrost) {
      return '<p class="note">No frost date for this choice, so weekly dates cannot be counted from a 32°F day. A ZIP code in this zone may still have a nearby station.</p>';
    }
    if (rep.lastIso) {
      var q = [];
      if (opts.zone) q.push('zone=' + encodeURIComponent(opts.zone));
      q.push('frost=' + encodeURIComponent(rep.lastIso));
      plannerHref += (plannerHref.indexOf('?') >= 0 ? '&' : '?') + q.join('&');
    }
    var bits = [];
    if (rep.offSeason) {
      bits.push('<p class="note">Nothing in the plant list falls in this week’s planting windows. Here is what comes next, and a couple of quiet-season tasks.</p>');
    }
    bits.push(sectionHtml(charts, logic, 'This week (' + fmtSpan(logic, rep.weekStart, rep.weekEnd) + ')', 'this-week', rep.thisWeek, plantBase));
    if (rep.comingCount) {
      bits.push(sectionHtml(charts, logic, 'Coming up (' + fmtSpan(logic, rep.comingStart, rep.comingEnd) + ')', 'coming-up', rep.coming, plantBase));
    }
    if (rep.later.length) {
      bits.push(sectionHtml(charts, logic, 'Looking ahead', 'looking-ahead', rep.later, plantBase));
    }
    if (rep.planning) {
      bits.push('<p>This is a good week to sketch next season’s beds in the <a href="' + esc(charts, plannerHref) + '">planner</a> and order seed, so it is on hand before indoor start dates.</p>');
    }
    bits.push('<p><a class="btn" href="' + esc(charts, plannerHref) + '">Use these dates in the planner</a></p>');
    return bits.join('');
  }

  return {
    startOfWeek: startOfWeek,
    endOfWeek: endOfWeek,
    lastFrostIso: lastFrostIso,
    firstFrostIsos: firstFrostIsos,
    displayFirstIso: displayFirstIso,
    windowsFor: windowsFor,
    report: report,
    reportHtml: render,
    groups: GROUPS,
    fmtRange: fmtRange,
    fmtSpan: fmtSpan
  };
});
