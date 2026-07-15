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

  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  API.getDashboard().then(function (d) {
    // subline
    var active = d.projects.length;
    document.getElementById("subline").textContent =
      "ข้อมูล ณ 15 ก.ค. 2569 · " + active + " โครงการที่กำลังดำเนินการ" +
      (API.isMock() ? " · ข้อมูลจำลอง" : "");

    // KPIs
    var k = d.kpi;
    var kpis = [
      { lab: "โครงการทั้งหมด", val: k.projects, unit: "", color: "", trend: "▲ 2 เริ่มใหม่เดือนนี้", tc: "up" },
      { lab: "คืบหน้าเฉลี่ย", val: k.avgProgress, unit: "%", color: "", trend: "▲ 5% จากสัปดาห์ก่อน", tc: "up" },
      { lab: "งานล่าช้า", val: k.late, unit: "", color: "var(--st-late)", trend: "ต้องติดตาม", tc: "down" },
      { lab: "ปัญหาค้าง", val: k.openIssues, unit: "", color: "var(--st-prob)", trend: "2 ระดับสูง", tc: "down" }
    ];
    document.getElementById("kpis").innerHTML = kpis.map(function (x) {
      return '<div class="kpi"><div class="lab">' + x.lab + '</div>' +
        '<div class="val tabular"' + (x.color ? ' style="color:' + x.color + '"' : '') + '>' +
        x.val + (x.unit ? '<small>' + x.unit + '</small>' : '') + '</div>' +
        '<div class="trend ' + x.tc + '">' + x.trend + '</div></div>';
    }).join("");

    // projects (คลิกเพื่อดูรายละเอียด)
    document.getElementById("projects").innerHTML = d.projects.map(function (p) {
      var col = PROGRESS_COLOR(p.progress, p.status);
      return '<a class="prow" href="project.html?id=' + p.id + '" style="display:block;text-decoration:none;cursor:pointer">' +
        '<div class="l"><b>' + p.name + ' ›</b><span class="tabular">' + p.progress + '%</span></div>' +
        '<div class="bar"><i style="width:' + p.progress + '%;background:' + col + '"></i></div></a>';
    }).join("");

    // chart
    var maxTotal = Math.max.apply(null, d.weekly.map(function (w) { return w[0] + w[1]; }));
    document.getElementById("chart").innerHTML = d.weekly.map(function (w, i) {
      var total = w[0] + w[1];
      var h = Math.round((total / maxTotal) * 100);
      var donePct = Math.round((w[0] / total) * 100);
      return '<div class="col"><div class="stk" style="height:' + h + '%">' +
        '<span style="height:' + donePct + '%;background:var(--st-done);display:block"></span>' +
        '<span style="height:' + (100 - donePct) + '%;background:var(--st-prog);display:block"></span>' +
        '</div><small>' + d.weekLabels[i] + '</small></div>';
    }).join("");

    // issues
    document.getElementById("issues").innerHTML = d.issues.map(function (s) {
      var sv = SEV[s.severity] || SEV.low;
      return '<div class="issue-row"><div class="t"><b>' + s.title + '</b>' +
        '<small>' + s.project + ' · ' + s.reporter + '</small></div>' +
        '<span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span></div>';
    }).join("");

    // feed
    document.getElementById("feed").innerHTML = d.activity.map(function (a) {
      return '<div class="fi"><span class="ava" style="background:' + a.color + '">' + a.initials + '</span>' +
        '<div><div class="tx"><b>' + a.who + '</b> ' + a.text + '</div>' +
        '<div class="tm">' + a.time + '</div></div></div>';
    }).join("");
  });
})();
