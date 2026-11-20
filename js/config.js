/* Public site address. The GitHub repo and the Netlify project stay named yardgrid. */
window.SITE_URL = "https://bloomandbedgarden.com";
window.yardMeta = function (path) {
  var url = window.SITE_URL + path;
  var link = document.createElement("link");
  link.rel = "canonical";
  link.href = url;
  document.head.appendChild(link);
  function meta(attr, key, content) {
    var el = document.createElement("meta");
    el.setAttribute(attr, key);
    el.content = content;
    document.head.appendChild(el);
  }
  meta("property", "og:url", url);
  meta("property", "og:title", document.title);
  meta("name", "twitter:card", "summary");
  meta("name", "twitter:title", document.title);
  meta("name", "twitter:url", url);
};
