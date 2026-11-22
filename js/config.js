/* Public site address. The GitHub repo and the Netlify project stay named yardgrid. */
(function () {
  var APEX = "https://bloomandbedgarden.com";
  function isAuthHash(s) {
    return /(?:confirmation_token|invite_token|recovery_token|access_token|email_change_token)=/.test(s || "");
  }
  function recoverFromPath(path) {
    var raw = path || "";
    if (raw.indexOf("%23") === -1 && raw.indexOf("confirmation_token") === -1 && raw.indexOf("invite_token") === -1) return "";
    raw = raw.replace(/^\/+/, "");
    try { raw = decodeURIComponent(raw); } catch (e) {}
    if (raw.charAt(0) !== "#") raw = "#" + raw.replace(/^#/, "");
    return isAuthHash(raw) ? raw : "";
  }
  var hash = location.hash || "";
  var fromPath = recoverFromPath(location.pathname || "");
  if (!isAuthHash(hash) && fromPath) hash = fromPath;
  if (isAuthHash(hash)) {
    try { sessionStorage.setItem("yardgrid-identity-hash", hash); } catch (e) {}
  }
  var host = location.hostname;
  var onPlus = /(?:^|\/)plus\.html$/.test(location.pathname || "");
  var wantPlus = isAuthHash(hash) && !onPlus;
  if (host === "yardgrid.netlify.app" || host === "www.bloomandbedgarden.com" || wantPlus) {
    var path = wantPlus ? "/plus.html" : (location.pathname || "/");
    location.replace(APEX + path + (location.search || "") + hash);
  }
})();

window.SITE_URL = "https://bloomandbedgarden.com";
window.yardMeta = function (path) {
  var url = window.SITE_URL + path;
  /* Pages carry a canonical link in their HTML. Add one only if a page is missing it. */
  if (!document.querySelector('link[rel="canonical"]')) {
    var link = document.createElement("link");
    link.rel = "canonical";
    link.href = url;
    document.head.appendChild(link);
  }
  function meta(attr, key, content) {
    var el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.content = content;
    document.head.appendChild(el);
  }
  var image = window.SITE_URL + "/images/home-garden.webp";
  var described = document.querySelector('meta[name="description"]');
  meta("property", "og:type", "website");
  meta("property", "og:site_name", "Bloom & Bed Garden");
  meta("property", "og:url", url);
  meta("property", "og:title", document.title);
  if (described && described.content) meta("property", "og:description", described.content);
  meta("property", "og:image", image);
  meta("name", "twitter:card", "summary_large_image");
  meta("name", "twitter:title", document.title);
  meta("name", "twitter:url", url);
  meta("name", "twitter:image", image);
};
