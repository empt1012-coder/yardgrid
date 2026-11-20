/* Gallery page. Plant links go to the planner. Grid plants arm that plant. Photo-library plants open Placement. */
(function () {
  var GRID = {
    carrot: "Carrot", radish: "Radish", scallion: "Green onion", beet: "Beet", bean: "Bush bean",
    spinach: "Spinach", garlic: "Garlic", lettuce: "Leaf lettuce", chard: "Swiss chard", basil: "Basil",
    broccoli: "Broccoli", cabbage: "Cabbage", pepper: "Pepper", eggplant: "Eggplant", tomato: "Tomato",
    cucumber: "Cucumber", squash: "Summer squash", pea: "Pea", kale: "Kale", potato: "Potato",
    onion: "Bulbing onion", leek: "Leek", turnip: "Turnip", kohlrabi: "Kohlrabi", mustard: "Mustard",
    parsnip: "Parsnip", wintersquash: "Winter squash", cantaloupe: "Cantaloupe", watermelon: "Watermelon",
    marigold: "Marigold"
  };
  var PHOTO = {};
  var photos = (window.YardPhotos && YardPhotos.items) || [];
  photos.forEach(function (item) { PHOTO[item.id] = item.name; });
  var STYLES = [
    ["", "All styles"],
    ["vegetable", "Vegetable bed"],
    ["raised", "Raised beds"],
    ["container", "Containers"],
    ["border", "Flower border"],
    ["cottage", "Cottage"],
    ["pollinator", "Pollinator"],
    ["cut-flower", "Cut flowers"],
    ["herb", "Herbs"],
    ["shade", "Shade"],
    ["drought", "Drought"],
    ["potager", "Potager"]
  ];
  var SUNS = [["", "Any sun"], ["full", "Full sun"], ["part", "Part sun"], ["shade", "Shade"]];
  var SEASONS = [["", "Any season"], ["spring", "Spring"], ["summer", "Summer"], ["fall", "Fall"]];
  var SUN_LABEL = { full: "Full sun", part: "Part sun", shade: "Shade" };
  var SEASON_LABEL = { spring: "Spring", summer: "Summer", fall: "Fall" };
  var filters = { style: "", sun: "", season: "" };
  var items = (window.YardGallery && YardGallery.items) || [];

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function plantName(id) {
    return GRID[id] || PHOTO[id] || id;
  }
  function plantHref(id) {
    if (GRID[id]) return "plan.html?plant=" + encodeURIComponent(id);
    return "plan.html?mode=place&photo=" + encodeURIComponent(id);
  }
  function buttons(list, key) {
    return list.map(function (pair) {
      var on = filters[key] === pair[0] ? " on" : "";
      return '<button type="button" class="gallery-chip' + on + '" data-key="' + key + '" data-value="' + esc(pair[0]) + '">' + esc(pair[1]) + "</button>";
    }).join("");
  }
  function matches(item) {
    if (filters.style && item.style !== filters.style) return false;
    if (filters.sun && item.sun !== filters.sun) return false;
    if (filters.season && item.season !== filters.season) return false;
    return true;
  }
  function card(item) {
    var links = item.plants.map(function (id) {
      return '<a href="' + plantHref(id) + '">' + esc(plantName(id)) + "</a>";
    }).join(", ");
    return '<article class="gallery-card">' +
      '<button type="button" class="gallery-shot" data-id="' + esc(item.id) + '">' +
      '<img src="images/gallery/thumb/' + esc(item.id) + '.webp" alt="' + esc(item.alt) + '" width="600" height="400" loading="lazy">' +
      "</button>" +
      '<div class="gallery-body">' +
      "<h2>" + esc(item.title) + "</h2>" +
      "<p>" + esc(item.text) + "</p>" +
      '<p class="muted">Plants: ' + links + "</p>" +
      '<p class="muted">' + esc(item.size) + " · " + esc(SUN_LABEL[item.sun] || item.sun) + " · " + esc(SEASON_LABEL[item.season] || item.season) + "</p>" +
      '<p class="cap">Example garden (generated image)</p>' +
      '<a class="btn" href="' + esc(item.plan) + '">Plan something like this</a>' +
      "</div></article>";
  }
  function render() {
    var shown = items.filter(matches);
    document.getElementById("galleryFilters").innerHTML =
      '<div class="gallery-row">' + buttons(STYLES, "style") + "</div>" +
      '<div class="gallery-row">' + buttons(SUNS, "sun") + "</div>" +
      '<div class="gallery-row">' + buttons(SEASONS, "season") + "</div>";
    document.getElementById("galleryCount").textContent = shown.length + (shown.length === 1 ? " example garden" : " example gardens");
    document.getElementById("galleryGrid").innerHTML = shown.length
      ? shown.map(card).join("")
      : '<p class="muted">No example gardens match those filters.</p>';
  }
  function openLight(id) {
    var item = null;
    for (var i = 0; i < items.length; i++) if (items[i].id === id) item = items[i];
    if (!item) return;
    var img = document.getElementById("lightImg");
    img.src = "images/gallery/" + item.id + ".webp";
    img.alt = item.alt;
    document.getElementById("lightTitle").textContent = item.title;
    document.getElementById("light").showModal();
  }
  document.getElementById("galleryFilters").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-key]");
    if (!btn) return;
    filters[btn.getAttribute("data-key")] = btn.getAttribute("data-value");
    render();
  });
  document.getElementById("galleryGrid").addEventListener("click", function (e) {
    var btn = e.target.closest("[data-id]");
    if (!btn) return;
    openLight(btn.getAttribute("data-id"));
  });
  document.getElementById("lightClose").addEventListener("click", function () {
    document.getElementById("light").close();
  });
  render();
})();
