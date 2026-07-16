/* ============================================================
   SiteTrack — Project Manager view
   งานรออนุมัติ · ปัญหาที่ต้องตอบ · มอบหมายงาน · งานทั้งหมด
   ============================================================ */
(function () {
  UI.initTheme();
  var SEV = { high: { cls: "s-prob", th: "ด่วน" }, medium: { cls: "s-late", th: "รอแก้" }, low: { cls: "s-prog", th: "ทั่วไป" } };
  var D = null;

  function esc(s) { return String(s == null ? "" : s); }

  var ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>',
    people: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>'
  };

  // KPI filter -> drawer (with drill-down)
  function listPanel(title, items, rowFn, detailFn) {
    Drawer.open(title, items.length + " รายการ",
      items.length ? items.map(rowFn).join("") : '<div class="empty">ไม่มีข้อมูล</div>',
      function (db) { DR.wireList(db, items, function (it) { Drawer.push(esc(it.title || it.name), "", detailFn(it)); }); });
  }
  // รายละเอียดผู้รับเหมา (งานในมือ + เจาะเข้าแต่ละงานได้)
  function contractorPanel(c, usePush) {
    var tasks = D.tasks.filter(function (t) { return String(t.contractorId) === String(c.id); });
    var body = tasks.length ? tasks.map(DR.taskRow).join("") : '<div class="empty">ยังไม่มีงาน</div>';
    var fn = usePush ? Drawer.push : Drawer.open;
    fn(c.name, esc(c.skill) + " · " + tasks.length + " งาน", body,
      function (db) { DR.wireList(db, tasks, function (t) { Drawer.push(esc(t.title), "", DR.taskDetail(t)); }); });
  }
  function openContractors() {
    var cs = D.contractors;
    Drawer.open("ผู้รับเหมา", cs.length + " คน", cs.map(DR.contractorRow).join(""), function (db) {
      DR.wireList(db, cs, function (c) { contractorPanel(c, true); });
    });
  }
  // ทำให้แถวในหน้า (นอก drawer) จิ้มได้ — ข้ามคลิกที่โดนปุ่มในแถว
  function wireRows(box, items, onPick) {
    [].forEach.call(box.querySelectorAll("[data-idx]"), function (row) {
      row.addEventListener("click", function (e) {
        if (e.target.closest(".btn")) return;
        onPick(items[+row.getAttribute("data-idx")]);
      });
    });
  }
  function openFilter(f) {
    if (f === "pending") listPanel("งานรออนุมัติ", D.pending, DR.taskRow, DR.taskDetail);
    else if (f === "issues") listPanel("ปัญหาที่ต้องตอบ", D.openIssues, DR.issueRow, DR.issueDetail);
    else if (f === "tasks") listPanel("งานทั้งหมด", D.tasks, DR.taskRow, DR.taskDetail);
    else if (f === "contractors") openContractors();
  }

  function load() {
    API.getPMData().then(function (d) {
      D = d;
      document.getElementById("subline").textContent =
        "ผู้จัดการโครงการ · " + d.contractors.length + " ผู้รับเหมา" + (API.isMock() ? " · ข้อมูลจำลอง" : "");
      renderKpis(); renderPending(); renderIssues(); renderAllTasks(); renderContractors(); renderAssignForm();
    });
  }

  function renderKpis() {
    var kp = [
      { lab: "งานรออนุมัติ", val: D.pending.length, cls: "k-late", ic: ICONS.check, f: "pending" },
      { lab: "ปัญหาที่ต้องตอบ", val: D.openIssues.length, cls: "k-prob", ic: ICONS.alert, f: "issues" },
      { lab: "ผู้รับเหมา", val: D.contractors.length, cls: "k-prog", ic: ICONS.people, f: "contractors" },
      { lab: "งานทั้งหมด", val: D.tasks.length, cls: "k-accent", ic: ICONS.list, f: "tasks" }
    ];
    document.getElementById("kpis").innerHTML = kp.map(function (x) {
      return '<div class="kpi rich dr-trigger ' + x.cls + '" data-filter="' + x.f + '" role="button" tabindex="0">' +
        '<div class="kicon">' + x.ic + '</div><div class="lab">' + x.lab + '</div>' +
        '<div class="val tabular">' + x.val + '</div><span class="kfilter">แตะเพื่อดู →</span></div>';
    }).join("");
    [].forEach.call(document.querySelectorAll("#kpis .kpi"), function (card) {
      var f = card.getAttribute("data-filter");
      card.addEventListener("click", function () { openFilter(f); });
      card.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFilter(f); } });
    });
  }

  function renderPending() {
    document.getElementById("pendingCount").textContent = D.pending.length + " รายการ";
    var box = document.getElementById("pending");
    if (!D.pending.length) { box.innerHTML = '<div class="empty">ไม่มีงานรออนุมัติ</div>'; return; }
    box.innerHTML = D.pending.map(function (t, i) {
      return '<div class="act-row tap dr-trigger" data-idx="' + i + '"><div class="top"><div><b>' + esc(t.title) + '</b>' +
        '<div class="sub">📍 ' + esc(t.project) + ' · ' + esc(t.location) + ' · ' + esc(t.assignee) + '</div></div>' +
        '<span class="status s-done"><span class="d"></span>เสร็จ 100%</span></div>' +
        '<div class="acts"><button class="btn btn-primary" onclick="PM.approve(\'' + t.id + '\')">✓ อนุมัติ</button>' +
        '<button class="btn btn-ghost" onclick="PM.reject(\'' + t.id + '\')">ตีกลับแก้</button></div></div>';
    }).join("");
    wireRows(box, D.pending, function (t) { Drawer.open(esc(t.title), "งานรออนุมัติ", DR.taskDetail(t)); });
  }

  function renderIssues() {
    document.getElementById("issueCount").textContent = D.openIssues.length + " รายการ";
    var box = document.getElementById("issueList");
    if (!D.openIssues.length) { box.innerHTML = '<div class="empty">ไม่มีปัญหาค้าง 🎉</div>'; return; }
    box.innerHTML = D.openIssues.map(function (s, i) {
      var sv = SEV[s.severity] || SEV.low;
      return '<div class="act-row tap dr-trigger" data-idx="' + i + '"><div class="top"><div><b>' + esc(s.title) + '</b>' +
        '<div class="sub">📍 ' + esc(s.project) + ' · แจ้งโดย ' + esc(s.reporter) + ' · ' + fmtTime(s.createdAt) + '</div></div>' +
        '<span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span></div>' +
        (s.detail ? '<div class="detail">' + esc(s.detail) + '</div>' : '') +
        '<div class="acts"><button class="btn btn-primary" onclick="PM.openResolve(\'' + s.id + '\')">ตอบ / ปิดเรื่อง</button></div></div>';
    }).join("");
    wireRows(box, D.openIssues, function (s) { Drawer.open(esc(s.title), esc(s.project), DR.issueDetail(s)); });
  }

  function renderAllTasks() {
    var rows = D.tasks.map(function (t, i) {
      var s = STATUS[t.status] || STATUS.in_progress;
      var col = PROGRESS_COLOR(t.progress, t.status);
      return '<tr class="tap dr-trigger" data-idx="' + i + '"><td><b>' + esc(t.title) + '</b><div class="muted" style="font-size:11px">' + esc(t.project) + '</div></td>' +
        '<td>' + esc(t.assignee) + '</td>' +
        '<td style="min-width:90px"><div class="bar" style="margin-bottom:3px"><i style="width:' + t.progress + '%;background:' + col + '"></i></div>' +
        '<span class="tabular muted" style="font-size:11px">' + t.progress + '%</span></td>' +
        '<td><span class="status ' + s.cls + '"><span class="d"></span>' + s.th + '</span></td></tr>';
    }).join("");
    var box = document.getElementById("allTasks");
    box.innerHTML =
      '<table class="table"><thead><tr><th>งาน</th><th>ผู้รับเหมา</th><th>คืบหน้า</th><th>สถานะ</th></tr></thead><tbody>' +
      rows + '</tbody></table>';
    wireRows(box, D.tasks, function (t) { Drawer.open(esc(t.title), esc(t.project), DR.taskDetail(t)); });
  }

  function renderContractors() {
    var box = document.getElementById("contractorList");
    box.innerHTML = D.contractors.map(function (c, i) {
      return '<div class="act-row tap dr-trigger" data-idx="' + i + '" style="margin-bottom:8px;padding:11px 13px"><div class="top">' +
        '<div style="display:flex;align-items:center;gap:10px"><span class="avatar" style="background:var(--accent);width:32px;height:32px">' + esc(c.initials) + '</span>' +
        '<div><b>' + esc(c.name) + '</b><div class="sub">' + esc(c.skill) + '</div></div></div>' +
        '<span class="muted tabular" style="font-size:12px">' + c.openTasks + ' งาน ›</span></div></div>';
    }).join("");
    wireRows(box, D.contractors, function (c) { contractorPanel(c, false); });
  }

  function renderAssignForm() {
    var projOpts = D.projects.map(function (p) { return '<option value="' + p.id + '">' + esc(p.name) + '</option>'; }).join("");
    var conOpts = D.contractors.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + ' — ' + esc(c.skill) + '</option>'; }).join("");
    document.getElementById("assignForm").innerHTML =
      '<div class="field"><label class="fl">โครงการ</label><select id="aProject">' + projOpts + '</select></div>' +
      '<div class="field"><label class="fl">ผู้รับเหมา</label><select id="aContractor">' + conOpts + '</select></div>' +
      '<div class="field"><label class="fl">ชื่องาน</label><input id="aTitle" placeholder="เช่น ติดตั้งฝ้าเพดานชั้น 6" /></div>' +
      '<div class="field"><label class="fl">ตำแหน่ง</label><input id="aLoc" placeholder="เช่น ชั้น 6" /></div>' +
      '<div class="field"><label class="fl">กำหนดส่ง</label><input id="aDue" type="date" /></div>' +
      '<button class="btn btn-primary btn-block" onclick="PM.assign()">มอบหมายงาน</button>';
  }

  /* ---------- actions ---------- */
  function approve(id) {
    API.approveTask(id).then(function () { UI.toast("อนุมัติงานแล้ว", "ok"); load(); });
  }
  function reject(id) {
    API.rejectTask(id, "").then(function () { UI.toast("ตีกลับให้แก้ไข · แจ้ง LINE ผู้รับเหมาแล้ว", "warn"); load(); });
  }
  function assign() {
    var title = document.getElementById("aTitle").value.trim();
    if (!title) { UI.toast("กรุณากรอกชื่องาน", "warn"); return; }
    API.assignTask({
      projectId: document.getElementById("aProject").value,
      contractorId: document.getElementById("aContractor").value,
      title: title, location: document.getElementById("aLoc").value.trim(),
      due: document.getElementById("aDue").value
    }).then(function () { UI.toast("มอบหมายงานแล้ว · แจ้ง LINE ผู้รับเหมาแล้ว", "ok"); load(); });
  }

  function openResolve(id) {
    var issue = D.openIssues.find(function (x) { return x.id === id; });
    if (!issue) return;
    document.getElementById("modalRoot").innerHTML =
      '<div class="modal-bg" onclick="if(event.target===this)PM.closeModal()"><div class="modal">' +
      '<h3>ตอบกลับปัญหา</h3><div class="msub">' + esc(issue.title) + ' · ' + esc(issue.project) + '</div>' +
      '<div class="field"><label class="fl">ข้อความถึงผู้รับเหมา</label>' +
      '<textarea id="mReply" placeholder="เช่น สั่งวัสดุใหม่แล้ว จะถึงหน้างานพรุ่งนี้เช้า"></textarea></div>' +
      '<div class="mfoot"><button class="btn btn-primary btn-block" onclick="PM.submitResolve(\'' + id + '\',true)">ตอบ + ปิดเรื่อง</button>' +
      '<button class="btn btn-ghost btn-block" onclick="PM.submitResolve(\'' + id + '\',false)">ตอบอย่างเดียว</button></div>' +
      '<button class="btn btn-ghost btn-block" style="margin-top:10px" onclick="PM.closeModal()">ยกเลิก</button>' +
      '</div></div>';
  }
  function submitResolve(id, close) {
    var reply = document.getElementById("mReply").value.trim();
    API.resolveIssue(id, reply, close).then(function () {
      closeModal();
      UI.toast(close ? "ปิดเรื่องแล้ว · แจ้ง LINE ผู้แจ้งแล้ว" : "ส่งคำตอบแล้ว", "ok");
      load();
    });
  }
  function closeModal() { document.getElementById("modalRoot").innerHTML = ""; }

  load();
  window.PM = { approve: approve, reject: reject, assign: assign,
    openResolve: openResolve, submitResolve: submitResolve, closeModal: closeModal };
})();
