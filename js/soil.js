/* Pure raised-bed soil volume math. No DOM. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.YardSoil = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const BAG_SIZES = [1, 1.5, 2, 2.5];
  const MIX = { topsoil: 0.6, compost: 0.3, aeration: 0.1 };
  const CU_FT_PER_YARD = 27;
  const MAX_CU_FT = 1e9;

  function toFeet(value, unit) {
    const n = Number(value);
    if (!isFinite(n)) return null;
    if (unit === 'in' || unit === 'inch' || unit === 'inches') return n / 12;
    if (unit === 'ft' || unit === 'foot' || unit === 'feet' || unit == null || unit === '') return n;
    return null;
  }

  function cubicFeetForBed(bed) {
    if (!bed) return null;
    const depthFt = toFeet(bed.depth, bed.depthUnit);
    const count = Number(bed.count == null ? 1 : bed.count);
    if (!(depthFt > 0) || !(count > 0) || !isFinite(count)) return null;
    let one;
    if (bed.shape === 'round') {
      const diameterFt = toFeet(bed.diameter, bed.diameterUnit || bed.lengthUnit);
      if (!(diameterFt > 0)) return null;
      one = Math.PI * Math.pow(diameterFt / 2, 2) * depthFt;
    } else {
      const lengthFt = toFeet(bed.length, bed.lengthUnit);
      const widthFt = toFeet(bed.width, bed.widthUnit || bed.lengthUnit);
      if (!(lengthFt > 0) || !(widthFt > 0)) return null;
      one = lengthFt * widthFt * depthFt;
    }
    const total = one * count;
    if (!isFinite(total) || total > MAX_CU_FT) return null;
    return total;
  }

  function bagsNeeded(cubicFeet, bagSize) {
    const vol = Number(cubicFeet);
    const size = Number(bagSize);
    if (!(vol > 0) || !(size > 0) || !isFinite(vol) || !isFinite(size)) return null;
    return Math.ceil(vol / size);
  }

  function formatVolume(n, digits) {
    if (digits == null) digits = 2;
    const x = Number(n);
    if (!isFinite(x)) return '';
    const f = Math.pow(10, digits);
    const r = Math.round(x * f) / f;
    const shown = Object.is(r, -0) ? 0 : r;
    if (Number.isInteger(shown)) return String(shown);
    return shown.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '');
  }

  function splitMix(cubicFeet) {
    const vol = Number(cubicFeet);
    if (!(vol > 0) || !isFinite(vol)) return null;
    return {
      topsoil: vol * MIX.topsoil,
      compost: vol * MIX.compost,
      aeration: vol * MIX.aeration
    };
  }

  function resultFromCubicFeet(cubicFeet) {
    if (!(cubicFeet > 0) || !isFinite(cubicFeet)) return null;
    const bags = {};
    BAG_SIZES.forEach(function (size) {
      bags[String(size)] = bagsNeeded(cubicFeet, size);
    });
    const mix = splitMix(cubicFeet);
    return {
      cubicFeet: cubicFeet,
      cubicYards: cubicFeet / CU_FT_PER_YARD,
      bags: bags,
      mix: mix
    };
  }

  function calculate(beds) {
    const list = Array.isArray(beds) ? beds : [beds];
    let total = 0;
    for (let i = 0; i < list.length; i++) {
      const part = cubicFeetForBed(list[i]);
      if (part == null) return null;
      total += part;
    }
    return resultFromCubicFeet(total);
  }

  return {
    BAG_SIZES: BAG_SIZES,
    MIX: MIX,
    CU_FT_PER_YARD: CU_FT_PER_YARD,
    toFeet: toFeet,
    cubicFeetForBed: cubicFeetForBed,
    bagsNeeded: bagsNeeded,
    formatVolume: formatVolume,
    splitMix: splitMix,
    calculate: calculate
  };
});
