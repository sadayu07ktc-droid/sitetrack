/* ============================================================
   SiteTrack — Dashboard (executive)
   ============================================================ */
(function () {
  UI.initTheme();

  // SEV/GRAD มาจาก mock-data.js, esc/fmtTime/Drawer/DR มาจาก drawer.js (โหลดก่อนไฟล์นี้)
  var ICONS = {
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V6l7-3 7 3v15"/><path d="M2 21h20"/><path d="M9 9h.01M14 9h.01M9 13h.01M14 13h.01M9 17h.01M14 17h.01"/></svg>',
    trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M17 7h4v4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>'
  };
  // ---- chart tooltip ----
  var DAYNAMES = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
  var tipEl;
  function ensureTip() { if (!tipEl) { tipEl = document.createElement("div"); tipEl.className = "chart-tip"; document.body.appendChild(tipEl); } return tipEl; }
  function showTip(e, i, w) {
    var t = ensureTip();
    var total = w[0] + w[1];
    var dp = total ? Math.round(w[0] / total * 100) : 0;
    t.innerHTML = '<b>' + DAYNAMES[i] + ' · ' + total + ' งาน</b>' +
      '<div class="row"><span class="sw" style="background:var(--st-done)"></span>เสร็จ ' + w[0] + ' งาน (' + dp + '%)</div>' +
      '<div class="row"><span class="sw" style="background:var(--st-prog)"></span>กำลังทำ ' + w[1] + ' งาน (' + (100 - dp) + '%)</div>';
    t.style.left = e.clientX + "px"; t.style.top = e.clientY + "px"; t.classList.add("show");
  }
  function moveTip(e) { if (tipEl) { tipEl.style.left = e.clientX + "px"; tipEl.style.top = e.clientY + "px"; } }
  function hideTip() { if (tipEl) tipEl.classList.remove("show"); }

  // ---- weekly day drawer (ใช้ Drawer กลางจาก drawer.js) ----
  function openDayDrawer(i, w, items) {
    var list = (items || []).slice().reverse();
    var body = list.length ? list.map(function (u) {
      var col = u.progress >= 100 ? "var(--st-done)" : "var(--st-prog)";
      return '<div class="di"><div class="dtop"><b>' + esc(u.taskTitle) + '</b>' +
        '<span class="pct" style="color:' + col + '">' + u.progress + '%</span></div>' +
        '<div class="dmeta">👷 ' + esc(u.userName) + ' · 🕒 ' + fmtTime(u.time) + '</div>' +
        '<div class="bar" style="margin-bottom:' + (u.note ? '8px' : '0') + '"><i style="width:' + u.progress + '%;background:' + col + '"></i></div>' +
        (u.note ? '<div class="dnote">' + esc(u.note) + '</div>' : '') + '</div>';
    }).join("") : '<div class="empty">ไม่มีงานอัพเดทในวันนี้</div>';
    var sub = '<span><span class="sw" style="background:var(--st-done)"></span>เสร็จ ' + w[0] + '</span>' +
              '<span><span class="sw" style="background:var(--st-prog)"></span>กำลังทำ ' + w[1] + '</span>';
    Drawer.open("งาน" + DAYNAMES[i], sub, body);
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

    // ---- KPIs (icon badges + gradients, clickable filters) ----
    var kpis = [
      { lab: "โครงการทั้งหมด", val: k.projects, unit: "", cls: "k-accent", ic: ICONS.building, filter: "projects", trend: "▲ 2 เริ่มใหม่เดือนนี้", tc: "up" },
      { lab: "คืบหน้าเฉลี่ย", val: k.avgProgress, unit: "%", cls: "k-prog", ic: ICONS.trend, filter: "progress", trend: "▲ 5% จากสัปดาห์ก่อน", tc: "up" },
      { lab: "งานล่าช้า", val: k.late, unit: "", cls: "k-late", ic: ICONS.clock, filter: "late", trend: "ต้องติดตาม", tc: "down" },
      { lab: "ปัญหาค้าง", val: k.openIssues, unit: "", cls: "k-prob", ic: ICONS.alert, filter: "issues", trend: (highIssues ? highIssues + " ระดับสูง" : "อยู่ในเกณฑ์"), tc: "down" }
    ];
    document.getElementById("kpis").innerHTML = kpis.map(function (x) {
      return '<div class="kpi rich dr-trigger ' + x.cls + '" data-filter="' + x.filter + '" role="button" tabindex="0">' +
        '<div class="kicon">' + x.ic + '</div><div class="lab">' + x.lab + '</div>' +
        '<div class="val tabular">' + x.val + (x.unit ? '<small>' + x.unit + '</small>' : '') + '</div>' +
        '<div class="trend ' + x.tc + '">' + x.trend + '</div><span class="kfilter">แตะเพื่อดู →</span></div>';
    }).join("");
    // KPI click → filter panel (คลิกรายการใน drawer เพื่อดูรายละเอียดต่ออีกชั้น)
    function openList(title, sub, items, rowFn, onPick) {
      Drawer.open(title, sub,
        items.length ? items.map(rowFn).join("") : '<div class="empty">ไม่มีข้อมูล 🎉</div>',
        function (db) { DR.wireList(db, items, onPick); });
    }
    function pickProject(p) { DR.openProject(p, true, false); }   // ผู้บริหาร = ดูอย่างเดียว
    function runFilter(f) {
      if (f === "projects") openList("ทุกโครงการ", d.projects.length + " โครงการ", d.projects, DR.projRow, pickProject);
      else if (f === "progress") openList("เรียงตามความคืบหน้า", "เฉลี่ย " + k.avgProgress + "%",
        d.projects.slice().sort(function (a, b) { return b.progress - a.progress; }), DR.projRow, pickProject);
      else if (f === "late") openList("งานล่าช้า", (d.lateTasks || []).length + " งาน", d.lateTasks || [], DR.taskRow,
        function (t) { DR.openTask(t, true); });
      else if (f === "issues") openList("ปัญหาค้าง", (d.issues || []).length + " รายการ", d.issues || [], DR.issueRow,
        function (s) { DR.openIssue(s, true, function () { location.reload(); }); });
    }
    [].forEach.call(document.querySelectorAll("#kpis .kpi"), function (card) {
      var f = card.getAttribute("data-filter");
      card.addEventListener("click", function () { runFilter(f); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); runFilter(f); } });
    });

    // projects — จิ้มเปิด drawer รายละเอียด (มีปุ่มลิงก์ไปหน้าเต็มข้างใน)
    document.getElementById("projects").innerHTML = d.projects.map(function (p, i) {
      var g = GRAD(p.progress, p.status);
      return '<div class="prow rich tap dr-trigger" data-idx="' + i + '" role="button" tabindex="0" style="--pbar-grad:' + g + '">' +
        '<span class="picon" style="background:' + g + '">' + ICONS.building + '</span>' +
        '<div><div class="l"><b>' + p.name + ' ›</b><span class="tabular">' + p.progress + '%</span></div>' +
        '<div class="bar"><i style="width:' + p.progress + '%"></i></div></div></div>';
    }).join("");
    [].forEach.call(document.querySelectorAll("#projects .prow"), function (row) {
      row.addEventListener("click", function () {
        DR.openProject(d.projects[+row.getAttribute("data-idx")], false, false);
      });
    });

    // chart (กันกรณี backend ไม่ส่ง weekly / ไม่มีข้อมูล) + interactive
    var weekly = d.weekly || [], labels = d.weekLabels || [], weeklyItems = d.weeklyItems || [];
    var hasWeek = weekly.length && weekly.some(function (w) { return (w[0] + w[1]) > 0; });
    if (hasWeek) {
      var maxTotal = Math.max.apply(null, weekly.map(function (w) { return w[0] + w[1]; })) || 1;
      var grid = '<div class="grid"><i></i><i></i><i></i><i></i></div>';
      document.getElementById("chart").innerHTML = grid + weekly.map(function (w, i) {
        var total = w[0] + w[1];
        var h = Math.round((total / maxTotal) * 100);
        var donePct = total ? Math.round((w[0] / total) * 100) : 0;
        return '<div class="col dr-trigger" data-day="' + i + '"><div class="stk" style="height:' + h + '%">' +
          '<span class="seg-done" style="height:' + donePct + '%;display:block"></span>' +
          '<span class="seg-prog" style="height:' + (100 - donePct) + '%;display:block"></span>' +
          '</div><small>' + (labels[i] || "") + '</small></div>';
      }).join("");
      // hover tooltip + click drawer
      var cols = document.querySelectorAll("#chart .col");
      [].forEach.call(cols, function (colEl) {
        var i = +colEl.getAttribute("data-day");
        colEl.addEventListener("mouseenter", function (e) { showTip(e, i, weekly[i]); });
        colEl.addEventListener("mousemove", moveTip);
        colEl.addEventListener("mouseleave", hideTip);
        colEl.addEventListener("click", function () {
          [].forEach.call(cols, function (c) { c.classList.remove("active"); });
          colEl.classList.add("active"); hideTip();
          openDayDrawer(i, weekly[i], weeklyItems[i] || []);
        });
      });
    } else {
      document.getElementById("chart").innerHTML = '<div class="empty">ยังไม่มีข้อมูลสัปดาห์นี้</div>';
    }

    // issues — จิ้มดูรายละเอียด
    document.getElementById("issues").innerHTML = (d.issues || []).length
      ? d.issues.map(function (s, i) {
          var sv = SEV[s.severity] || SEV.low;
          return '<div class="issue-row tap dr-trigger" data-idx="' + i + '" role="button" tabindex="0"><div class="t"><b>' + esc(s.title) + '</b>' +
            '<small>' + esc(s.project) + ' · ' + esc(s.reporter) + '</small></div>' +
            '<span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span></div>';
        }).join("")
      : '<div class="empty">ไม่มีปัญหาค้าง 🎉</div>';
    [].forEach.call(document.querySelectorAll("#issues .issue-row"), function (row) {
      row.addEventListener("click", function () {
        var s = d.issues[+row.getAttribute("data-idx")];
        DR.openIssue(s, false, function () { location.reload(); });
      });
    });

    // feed — จิ้มดูรายละเอียดกิจกรรม
    document.getElementById("feed").innerHTML = (d.activity || []).length
      ? d.activity.map(function (a, i) {
          return '<div class="fi tap dr-trigger" data-idx="' + i + '" role="button" tabindex="0"><span class="ava" style="background:' + (a.color || 'var(--st-prog)') + '">' + a.initials + '</span>' +
            '<div><div class="tx"><b>' + esc(a.who) + '</b> ' + esc(a.text) + '</div>' +
            '<div class="tm">' + fmtTime(a.time) + '</div></div></div>';
        }).join("")
      : '<div class="empty">ยังไม่มีกิจกรรม</div>';
    [].forEach.call(document.querySelectorAll("#feed .fi"), function (row) {
      row.addEventListener("click", function () {
        var a = d.activity[+row.getAttribute("data-idx")];
        Drawer.open("กิจกรรม", esc(a.who),
          '<div class="dcard"><div class="drow"><span>โดย</span><b>' + esc(a.who) + '</b></div>' +
          '<div class="drow"><span>รายการ</span><b style="text-align:right">' + esc(a.text) + '</b></div>' +
          '<div class="drow"><span>เวลา</span><b>' + fmtTime(a.time) + '</b></div></div>');
      });
    });
  });
})();
