/* ============================================================
   SiteTrack — shared UI helpers (theme + toast)
   ============================================================ */
window.UI = (function () {
  // ---- theme ----
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("sitetrack-theme", t); } catch (e) {}
    var btn = document.getElementById("themeBtn");
    if (btn) btn.textContent = t === "dark" ? "☀" : "☾";
  }
  function initTheme() {
    var saved;
    try { saved = localStorage.getItem("sitetrack-theme"); } catch (e) {}
    if (!saved) saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    applyTheme(saved);
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute("data-theme") || "light";
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  // ---- toast ----
  function toast(msg, kind) {
    var wrap = document.querySelector(".toast-wrap");
    if (!wrap) { wrap = document.createElement("div"); wrap.className = "toast-wrap"; document.body.appendChild(wrap); }
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    wrap.appendChild(el);
    setTimeout(function () { el.style.transition = "opacity .3s"; el.style.opacity = "0";
      setTimeout(function () { el.remove(); }, 320); }, 2600);
  }

  return { initTheme: initTheme, toggleTheme: toggleTheme, toast: toast };
})();
