/* ============================================================
   SiteTrack — Dashboard (executive)
   ============================================================ */
(function () {
  UI.initTheme();

  var SEV = {
    high:   { cls: "s-prob", th: "ด่วน" },
    medium: { cls: "s-late", th: "รอแก้" },
    low:    { cls: "s-prog", th: "ทั่วไป" }
  };

  var ICONS = {
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V6l7-3 7 3v15"/><path d="M2 21h20"/><path d="M9 9h.01M14 9h.01M9 13h.01M14 13h.01M9 17h.01M14 17h.01"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };
  function GRAD(p, status) {
    if (status === "problem") return "var(--grad-prob)";
    if (status === "late") return "var(--grad-late)";
    if (p >= 100) return "var(--grad-done)";
    return "var(--grad-prog)";
  }
  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  API.getDashboard().then(function (d) {
    // subline
    var active = d.projects.length;
    document.getElementById("subline").textContent =
      "ข้อมูล ณ 15 ก.ค. 2569 · " + active + " โครงการที่กำลังดำเนินการ" +
      (API.isMock() ? " · ข้อมูลจำลอง" : "");

    var k = d.kpi;
    var onTrack = d.projects.filter(function (p) { return p.status === "on_track"; }).length;
    var lateP = d.projects.filter(function (p) { return p.status === "late"; }).length;
    var probP = d.projects.filter(function (p) { return p.status === "problem"; }).length;
    var highIssues = (d.issues || []).filter(function (i) { return i.severity === "high"; }).length;

    // ---- hero: progress ring ----
    var CIRC = 326.726, off = CIRC * (1 - k.avgProgress / 100);
    document.getElementById("hero").innerHTML =
      '<div class="hero"><div class="ring"><svg viewBox="0 0 120 120">' +
        '<defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#c2410c"/></linearGradient></defs>' +
        '<circle cx="60" cy="60" r="52" fill="none" stroke="var(--surface-2)" stroke-width="13"/>' +
        '<circle cx="60" cy="60" r="52" fill="none" stroke="url(#rg)" stroke-width="13" stroke-linecap="round" stroke-dasharray="' + CIRC + '" stroke-dashoffset="' + off + '"/>' +
        '</svg><div class="rlabel"><div><b>' + k.avgProgress + '%</b><small>เฉลี่ยรวม</small></div></div></div>' +
      '<div class="hstat"><h3>ความคืบหน้าภาพรวม</h3>' +
        '<p>' + d.projects.length + ' โครงการที่กำลังดำเนินการ · คืบหน้าเฉลี่ย ' + k.avgProgress + '% ของงานทั้งหมด</p>' +
        '<div class="chips">' +
          '<span class="chip2"><span class="dot" style="background:var(--st-done)"></span>ตามแผน ' + onTrack + '</span>' +
          '<span class="chip2"><span class="dot" style="background:var(--st-late)"></span>ล่าช้า ' + lateP + '</span>' +
          '<span class="chip2"><span class="dot" style="background:var(--st-prob)"></span>มีปัญหา ' + probP + '</span>' +
        '</div></div></div>';

    // ---- KPIs (icon badges + gradients) ----
    var kpis = [
      { lab: "โครงการทั้งหมด", val: k.projects, unit: "", cls: "k-accent", ic: ICONS.building, trend: "▲ 2 เริ่มใหม่เดือนนี้", tc: "up" },
      { lab: "คืบหน้าเฉลี่ย", val: k.avgProgress, unit: "%", cls: "k-prog", ic: ICONS.trend, trend: "▲ 5% จากสัปดาห์ก่อน", tc: "up" },
      { lab: "งานล่าช้า", val: k.late, unit: "", cls: "k-late", ic: ICONS.clock, trend: "ต้องติดตาม", tc: "down" },
      { lab: "ปัญหาค้าง", val: k.openIssues, unit: "", cls: "k-prob", ic: ICONS.alert, trend: (highIssues ? highIssues + " ระดับสูง" : "อยู่ในเกณฑ์"), tc: "down" }
    ];
    document.getElementById("kpis").innerHTML = kpis.map(function (x) {
      return '<div class="kpi rich ' + x.cls + '"><div class="kicon">' + x.ic + '</div>' +
        '<div class="lab">' + x.lab + '</div>' +
        '<div class="val tabular">' + x.val + (x.unit ? '<small>' + x.unit + '</small>' : '') + '</div>' +
        '<div class="trend ' + x.tc + '">' + x.trend + '</div></div>';
    }).join("");

    // projects (คลิกเพื่อดูรายละเอียด) — icon badge + gradient bar
    document.getElementById("projects").innerHTML = d.projects.map(function (p) {
      var g = GRAD(p.progress, p.status);
      return '<a class="prow rich" href="project.html?id=' + p.id + '" style="--pbar-grad:' + g + ';text-decoration:none;color:inherit">' +
        '<span class="picon" style="background:' + g + '">' + ICONS.building + '</span>' +
        '<div><div class="l"><b>' + p.name + ' ›</b><span class="tabular">' + p.progress + '%</span></div>' +
        '<div class="bar"><i style="width:' + p.progress + '%"></i></div></div></a>';
    }).join("");

    // chart (กันกรณี backend ไม่ส่ง weekly / ไม่มีข้อมูล)
    var weekly = d.weekly || [], labels = d.weekLabels || [];
    var hasWeek = weekly.length && weekly.some(function (w) { return (w[0] + w[1]) > 0; });
    if (hasWeek) {
      var maxTotal = Math.max.apply(null, weekly.map(function (w) { return w[0] + w[1]; })) || 1;
      var grid = '<div class="grid"><i></i><i></i><i></i><i></i></div>';
      document.getElementById("chart").innerHTML = grid + weekly.map(function (w, i) {
        var total = w[0] + w[1];
        var h = Math.round((total / maxTotal) * 100);
        var donePct = total ? Math.round((w[0] / total) * 100) : 0;
        return '<div class="col"><div class="stk" style="height:' + h + '%">' +
          '<span class="seg-done" style="height:' + donePct + '%;display:block"></span>' +
          '<span class="seg-prog" style="height:' + (100 - donePct) + '%;display:block"></span>' +
          '</div><small>' + (labels[i] || "") + '</small></div>';
      }).join("");
    } else {
      document.getElementById("chart").innerHTML = '<div class="empty">ยังไม่มีข้อมูลสัปดาห์นี้</div>';
    }

    // issues
    document.getElementById("issues").innerHTML = (d.issues || []).length
      ? d.issues.map(function (s) {
          var sv = SEV[s.severity] || SEV.low;
          return '<div class="issue-row"><div class="t"><b>' + s.title + '</b>' +
            '<small>' + s.project + ' · ' + s.reporter + '</small></div>' +
            '<span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span></div>';
        }).join("")
      : '<div class="empty">ไม่มีปัญหาค้าง 🎉</div>';

    // feed
    document.getElementById("feed").innerHTML = (d.activity || []).length
      ? d.activity.map(function (a) {
          return '<div class="fi"><span class="ava" style="background:' + (a.color || 'var(--st-prog)') + '">' + a.initials + '</span>' +
            '<div><div class="tx"><b>' + a.who + '</b> ' + a.text + '</div>' +
            '<div class="tm">' + a.time + '</div></div></div>';
        }).join("")
      : '<div class="empty">ยังไม่มีกิจกรรม</div>';
  });
})();
