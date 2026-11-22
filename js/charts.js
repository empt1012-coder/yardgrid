/* Zone and ZIP planting dates. Frost numbers come from data/charts/lookup.js. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YardCharts = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  var DIMS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function zoneRank(zone) {
    var m = /^(\d+)([ab])$/.exec(String(zone || ''));
    if (!m) return null;
    return Number(m[1]) * 2 + (m[2] === 'b' ? 1 : 0);
  }

  function zoneIn(zone, min, max) {
    var z = zoneRank(zone), a = zoneRank(min), b = zoneRank(max);
    if (z == null || a == null || b == null) return false;
    return z >= a && z <= b;
  }

  function zones(lookup) {
    var seen = {};
    Object.keys(lookup.stations || {}).forEach(function (id) {
      var z = lookup.stations[id][3];
      if (z) seen[z] = 1;
    });
    Object.keys(lookup.zips || {}).forEach(function (zip) {
      var z = lookup.zips[zip][0];
      if (z) seen[z] = 1;
    });
    return Object.keys(seen).sort(function (a, b) { return zoneRank(a) - zoneRank(b); });
  }

  function doy(mmdd) {
    var m = Number(mmdd.slice(0, 2));
    var d = Number(mmdd.slice(2));
    if (m < 1 || m > 12 || d < 1 || d > DIMS[m - 1]) return null;
    var n = d;
    for (var i = 0; i < m - 1; i++) n += DIMS[i];
    return n;
  }

  function fromDoy(n) {
    var m = 0;
    var left = n;
    while (m < 12 && left > DIMS[m]) {
      left -= DIMS[m];
      m++;
    }
    if (m > 11) return null;
    var mm = String(m + 1).padStart(2, '0');
    var dd = String(left).padStart(2, '0');
    return mm + dd;
  }

  function medianMmdd(list) {
    var days = list.map(doy).filter(function (n) { return n; }).sort(function (a, b) { return a - b; });
    if (!days.length) return null;
    var mid = Math.floor(days.length / 2);
    var n = days.length % 2 ? days[mid] : Math.round((days[mid - 1] + days[mid]) / 2);
    return fromDoy(n);
  }

  /* Zone medians use stations in the 48 contiguous states and DC, the same set the
     zone pages use (scripts/build-pages.mjs). Alaska, Hawaii, and territory stations are left
     out because they sit in very different climates from the rest of their zone. */
  var OUTSIDE = { AK: 1, HI: 1, PR: 1, VI: 1, GU: 1, AS: 1, MP: 1 };
  function contiguousStation(name) {
    var m = /, ([A-Z]{2}) US$/.exec(String(name || ''));
    return !!m && !OUTSIDE[m[1]];
  }

  /* Last-frost dates in Aug–Dec belong to the winter before; first-frost dates in Jan–Jun
     belong to the winter after. Shifting them keeps a zone 9b–10b median from breaking at New Year. */
  function lastDay(mmdd) { var n = doy(mmdd); return n == null ? null : (n > 212 ? n - 365 : n); }
  function firstDay(mmdd) { var n = doy(mmdd); return n == null ? null : (n < 182 ? n + 365 : n); }
  function middle(sorted) {
    var mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  function wrapDay(n) {
    if (n < 1) return { mmdd: fromDoy(n + 365), tag: 'the winter before' };
    if (n > 365) return { mmdd: fromDoy(n - 365), tag: 'the next winter' };
    return { mmdd: fromDoy(n), tag: '' };
  }

  function zoneMedian(lookup, zone) {
    var lasts = [];
    var firsts = [];
    Object.keys(lookup.stations || {}).forEach(function (id) {
      var row = lookup.stations[id];
      if (row[3] !== zone || !contiguousStation(row[0])) return;
      var a = lastDay(row[1]);
      var b = firstDay(row[2]);
      if (a == null || b == null) return;
      lasts.push(a);
      firsts.push(b);
    });
    if (!lasts.length) return null;
    lasts.sort(function (x, y) { return x - y; });
    firsts.sort(function (x, y) { return x - y; });
    var last = wrapDay(middle(lasts));
    var first = wrapDay(middle(firsts));
    return {
      zone: zone, last: last.mmdd, first: first.mmdd, lastTag: last.tag, firstTag: first.tag,
      n: lasts.length, basis: 'zone-median'
    };
  }

  function zipPlace(lookup, zip) {
    var row = lookup.zips && lookup.zips[zip];
    if (!row) return null;
    var place = { zone: row[0], zip: zip, basis: 'zip' };
    if (row.length < 5) return place;
    var station = lookup.stations[row[3]];
    place.last = row[1];
    place.first = row[2];
    place.station = row[3];
    place.km = row[4];
    place.stationName = station ? station[0] : row[3];
    return place;
  }

  function iso(mmdd, year) {
    if (!mmdd || !doy(mmdd)) return '';
    return year + '-' + mmdd.slice(0, 2) + '-' + mmdd.slice(2, 4);
  }

  /* The spring the dates are for. From August on, the next spring is the one to plan. */
  function planYear(now) {
    var d = now || new Date();
    return d.getMonth() >= 7 ? d.getFullYear() + 1 : d.getFullYear();
  }

  function pretty(mmdd) {
    var n = doy(mmdd);
    if (!n) return '';
    var d = new Date(2021, 0, n);
    return MONTHS[d.getMonth()] + ' ' + d.getDate();
  }

  function placeText(place) {
    if (!place) return 'That ZIP is not in the 2023 USDA ZIP listing used here.';
    var zone = '2023 USDA zone ' + place.zone + '.';
    if (place.basis === 'zip' && place.last) {
      return zone + ' Frost dates are the 1991–2020 NOAA 50% dates at ' + place.stationName + ' (' + place.station + '), ' + place.km + ' km from this ZIP’s Census point. Last 32°F ' + pretty(place.last) + '. First 32°F ' + pretty(place.first) + '. These are averages, not a forecast.';
    }
    if (place.basis === 'zip') {
      return zone + ' No NOAA station with both 32°F dates was within 80 km of this ZIP’s Census point, so no frost date is shown.';
    }
    if (place.last) {
      return zone + ' The frost dates are the median of the 50% NOAA dates at ' + place.n + ' contiguous-US ' + (place.n === 1 ? 'station' : 'stations') + ' matched to this zone. A zone is not one climate. A ZIP uses one nearby station instead. Last 32°F ' + pretty(place.last) + (place.lastTag ? ' (' + place.lastTag + ')' : '') + '. First 32°F ' + pretty(place.first) + (place.firstTag ? ' (' + place.firstTag + ')' : '') + '.';
    }
    return zone + ' No contiguous-US NOAA stations were matched to this zone, so no zone-wide frost date is shown. A ZIP code in this zone may still have a nearby station.';
  }

  function pct(day) { return ((day - 1) / 365) * 100; }

  function barStyle(a, b, color) {
    var start = doy(String(a.getMonth() + 1).padStart(2, '0') + String(a.getDate()).padStart(2, '0'));
    var end = doy(String(b.getMonth() + 1).padStart(2, '0') + String(b.getDate()).padStart(2, '0'));
    if (!start || !end) return '';
    if (end < start) {
      return '<i class="bar" style="left:0;width:' + pct(end + 1) + '%;background:' + color + '"></i>' +
        '<i class="bar" style="left:' + pct(start) + '%;width:' + (100 - pct(start)) + '%;background:' + color + '"></i>';
    }
    var width = Math.max(0.8, pct(end) - pct(start) + (100 / 365));
    return '<i class="bar" style="left:' + pct(start) + '%;width:' + width + '%;background:' + color + '"></i>';
  }

  function plantingHtml(plants, logic, frostIso, firstMmdd) {
    var heads = MONTHS.map(function (m) { return '<span>' + m + '</span>'; }).join('');
    var marker = '';
    if (firstMmdd && doy(firstMmdd)) marker = '<i class="frost-line" style="left:' + pct(doy(firstMmdd)) + '%" title="First 32°F"></i>';
    var rows = plants.map(function (plant) {
      var bits = [];
      function add(pair, color, label) {
        if (!pair || !frostIso) return;
        var a = logic.addDays(frostIso, pair[0]);
        var b = logic.addDays(frostIso, pair[1]);
        if (!a || !b) return;
        bits.push(barStyle(a, b, color));
      }
      add(plant.indoor, '#2f6b4f');
      add(plant.transplant, '#6b4a32');
      add(plant.direct, '#c4a484');
      var words = logic.calendarRows([{ plantId: plant.id }], { [plant.id]: plant }, frostIso)[0];
      var text = [];
      if (words.indoor) text.push('Indoors ' + words.indoor);
      if (words.transplant) text.push('Set out ' + words.transplant);
      if (words.direct) text.push('Direct sow ' + words.direct);
      if (words.timingNote) text.push(words.timingNote);
      var href = '../plan.html?plant=' + encodeURIComponent(plant.id) + (frostIso ? '&frost=' + encodeURIComponent(frostIso) : '');
      return '<article class="chart-row"><div class="chart-name"><a href="' + esc(href) + '">' + esc(plant.name) + '</a></div>' +
        '<div class="track-scroll"><div class="track">' + marker + bits.join('') + '</div></div>' +
        '<p class="muted">' + esc(text.join(' · ') || 'No frost-offset date in the sources used here.') + '</p></article>';
    }).join('');
    return '<div class="mgrid">' + heads + '</div>' +
      '<p class="legend"><i style="background:#2f6b4f"></i> Start indoors <i style="background:#6b4a32"></i> Set out <i style="background:#c4a484"></i> Direct sow <i class="line"></i> First 32°F</p>' +
      rows;
  }

  return {
    esc: esc,
    zoneRank: zoneRank,
    zoneIn: zoneIn,
    zones: zones,
    doy: doy,
    medianMmdd: medianMmdd,
    contiguousStation: contiguousStation,
    zoneMedian: zoneMedian,
    zipPlace: zipPlace,
    iso: iso,
    planYear: planYear,
    pretty: pretty,
    placeText: placeText,
    plantingHtml: plantingHtml
  };
});
