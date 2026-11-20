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
  return { applySave: applySave, label: label };
});
