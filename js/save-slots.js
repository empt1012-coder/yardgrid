/* Free browser saves: one garden plan and one arrangement.
   Older saves that have no kind are kept so nothing already stored is removed. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaveSlots = api;
})(typeof self !== 'undefined' ? self : this, function () {
  function applySave(list, item) {
    var next = Array.isArray(list) ? list.slice() : [];
    var kept = [];
    var replaced = false;
    for (var i = 0; i < next.length; i++) {
      var row = next[i];
      if (row && row.kind === item.kind) {
        if (!replaced) {
          kept.push(item);
          replaced = true;
        }
        continue;
      }
      kept.push(row);
    }
    if (!replaced) kept.unshift(item);
    return kept;
  }
  function label(row) {
    if (!row) return 'Save';
    var kind = row.kind === 'arrangement' ? 'Arrangement' : (row.kind === 'plan' ? 'Garden plan' : 'Earlier save');
    return kind + ': ' + (row.name || 'Untitled');
  }
  function plantCount(state) {
    if (!state) return 0;
    var n = 0;
    if (Array.isArray(state.plants)) n += state.plants.length;
    if (Array.isArray(state.pieces)) n += state.pieces.length;
    return n;
  }
  /* Show the save/share reminder after a few plants are placed, or after a short stretch of editing. */
  function shouldShowKeepPanel(opts) {
    opts = opts || {};
    if (opts.viewOnly || opts.demo) return false;
    return (opts.plantCount || 0) >= 3 || (opts.editMs || 0) >= 45000;
  }
  function shouldShowOpenSaved(opts) {
    opts = opts || {};
    return (opts.savedCount || 0) > 0;
  }
  return { applySave: applySave, label: label, plantCount: plantCount, shouldShowKeepPanel: shouldShowKeepPanel, shouldShowOpenSaved: shouldShowOpenSaved };
});
