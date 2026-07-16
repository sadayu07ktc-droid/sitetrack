/* ============================================================
   SiteTrack — Project detail (executive drill-down)
   ============================================================ */
(function () {
  UI.initTheme();
  var SEV = { high: { cls: "s-prob", th: "ด่วน" }, medium: { cls: "s-late", th: "รอแก้" }, low: { cls: "s-prog", th: "ทั่วไป" } };

  // esc/fmtDate/fmtTime มาจาก drawer.js (global) — รองรับทั้ง "2026-10-30" และ ISO string จากชีต
  function param(k) { return new URLSearchParams(location.search).get(k); }

  var id = param("id") || "p1";
  API.getProject(id).then(function (d) {
    if (!d) { document.getElementById("pname").textContent = "ไม่พบโครงการ"; return; }
    var p = d.project;
    document.getElementById("pname").textContent = p.name;
    document.getElementById("owner").textContent = "เจ้าของโครงการ: " + p.owner + " · กำหนดส่ง " + fmtDate(p.due);

    var st = STATUS[p.status] || STATUS.on_track;
    var col = PROGRESS_COLOR(p.progress, p.status);
    var done = d.tasks.filter(function (t) { return t.status === "done" || t.status === "approved"; }).length;
    var openIssues = d.issues.filter(function (i) { return i.status === "open"; }).length;

    var html =
      '<div class="panel"><div class="detail-head">' +
        '<div><div class="muted" style="font-size:12px">ความคืบหน้ารวม</div>' +
        '<div class="big" style="color:' + col + '">' + p.progress + '%</div>' +
        '<span class="status ' + st.cls + '"><span class="d"></span>' + st.th + '</span></div>' +
        '<div style="flex:1;min-width:200px;align-self:center">' +
        '<div class="bar" style="height:12px"><i style="width:' + p.progress + '%;background:' + col + '"></i></div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:12px" class="muted">' +
        '<span>งานเสร็จ ' + done + '/' + d.tasks.length + '</span><span>ปัญหาค้าง ' + openIssues + '</span></div></div>' +
      '</div></div>';

    // KPI mini
    html += '<div class="kpis">' +
      kpi("งานทั้งหมด", d.tasks.length, "") +
      kpi("เสร็จแล้ว", done, "var(--st-done)") +
      kpi("กำลังทำ", d.tasks.filter(function (t) { return t.status === "in_progress"; }).length, "var(--st-prog)") +
      kpi("ปัญหาค้าง", openIssues, "var(--st-prob)") + '</div>';

    // two columns: tasks + issues
    html += '<div class="grid-2"><div class="panel"><div class="ph"><b>งานในโครงการ</b></div><div class="tw" style="overflow-x:auto">' + taskTable(d.tasks) + '</div></div>' +
      '<div class="panel"><div class="ph"><b>ปัญหาในโครงการ</b></div>' + issueList(d.issues) + '</div></div>';

    document.getElementById("content").innerHTML = html;

    // จิ้มแถวงาน / ปัญหา เพื่อดูรายละเอียดใน drawer
    [].forEach.call(document.querySelectorAll("#content table tbody tr[data-idx]"), function (row) {
      row.addEventListener("click", function () {
        var t = d.tasks[+row.getAttribute("data-idx")];
        Drawer.open(esc(t.title), esc(t.project || p.name), DR.taskDetail(t));
      });
    });
    [].forEach.call(document.querySelectorAll("#content .act-row[data-idx]"), function (row) {
      row.addEventListener("click", function () {
        var s = d.issues[+row.getAttribute("data-idx")];
        DR.openIssue(s, false, function () { location.reload(); });
      });
    });
  });

  function kpi(lab, val, color) {
    return '<div class="kpi"><div class="lab">' + lab + '</div><div class="val tabular"' +
      (color ? ' style="color:' + color + '"' : '') + '>' + val + '</div></div>';
  }
  function taskTable(tasks) {
    if (!tasks.length) return '<div class="empty">ยังไม่มีงาน</div>';
    var rows = tasks.map(function (t, i) {
      var s = STATUS[t.status] || STATUS.in_progress, col = PROGRESS_COLOR(t.progress, t.status);
      return '<tr class="tap dr-trigger" data-idx="' + i + '"><td><b>' + esc(t.title) + '</b><div class="muted" style="font-size:11px">📍 ' + esc(t.location) + '</div></td>' +
        '<td>' + esc(t.assignee) + '</td>' +
        '<td style="min-width:90px"><div class="bar" style="margin-bottom:3px"><i style="width:' + t.progress + '%;background:' + col + '"></i></div>' +
        '<span class="tabular muted" style="font-size:11px">' + t.progress + '%</span></td>' +
        '<td><span class="status ' + s.cls + '"><span class="d"></span>' + s.th + '</span></td></tr>';
    }).join("");
    return '<table class="table"><thead><tr><th>งาน</th><th>ผู้รับเหมา</th><th>คืบหน้า</th><th>สถานะ</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }
  function issueList(issues) {
    if (!issues.length) return '<div class="empty">ไม่มีปัญหาในโครงการนี้ 🎉</div>';
    return issues.map(function (s, i) {
      var sv = SEV[s.severity] || SEV.low;
      var closed = s.status === "closed";
      return '<div class="act-row tap dr-trigger" data-idx="' + i + '"><div class="top"><div><b>' + esc(s.title) + '</b>' +
        '<div class="sub">แจ้งโดย ' + esc(s.reporter) + ' · ' + fmtTime(s.createdAt) + '</div></div>' +
        (closed ? '<span class="status s-done"><span class="d"></span>ปิดแล้ว</span>'
                : '<span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span>') + '</div>' +
        (s.detail ? '<div class="detail">' + esc(s.detail) + '</div>' : '') +
        (s.reply ? '<div class="detail" style="border-left:3px solid var(--st-prog)">↩ PM: ' + esc(s.reply) + '</div>' : '') +
        '</div>';
    }).join("");
  }
})();
