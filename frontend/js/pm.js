/* ============================================================
   SiteTrack — Project Manager view
   งานรออนุมัติ · ปัญหาที่ต้องตอบ · มอบหมายงาน · งานทั้งหมด
   ============================================================ */
(function () {
  UI.initTheme();
  var SEV = { high: { cls: "s-prob", th: "ด่วน" }, medium: { cls: "s-late", th: "รอแก้" }, low: { cls: "s-prog", th: "ทั่วไป" } };
  var D = null;

  function esc(s) { return String(s == null ? "" : s); }

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
      { lab: "งานรออนุมัติ", val: D.pending.length, color: "var(--st-late)" },
      { lab: "ปัญหาที่ต้องตอบ", val: D.openIssues.length, color: "var(--st-prob)" },
      { lab: "ผู้รับเหมา", val: D.contractors.length, color: "" },
      { lab: "งานทั้งหมด", val: D.tasks.length, color: "" }
    ];
    document.getElementById("kpis").innerHTML = kp.map(function (x) {
      return '<div class="kpi"><div class="lab">' + x.lab + '</div>' +
        '<div class="val tabular"' + (x.color ? ' style="color:' + x.color + '"' : '') + '>' + x.val + '</div></div>';
    }).join("");
  }

  function renderPending() {
    document.getElementById("pendingCount").textContent = D.pending.length + " รายการ";
    var box = document.getElementById("pending");
    if (!D.pending.length) { box.innerHTML = '<div class="empty">ไม่มีงานรออนุมัติ</div>'; return; }
    box.innerHTML = D.pending.map(function (t) {
      return '<div class="act-row"><div class="top"><div><b>' + esc(t.title) + '</b>' +
        '<div class="sub">📍 ' + esc(t.project) + ' · ' + esc(t.location) + ' · ' + esc(t.assignee) + '</div></div>' +
        '<span class="status s-done"><span class="d"></span>เสร็จ 100%</span></div>' +
        '<div class="acts"><button class="btn btn-primary" onclick="PM.approve(\'' + t.id + '\')">✓ อนุมัติ</button>' +
        '<button class="btn btn-ghost" onclick="PM.reject(\'' + t.id + '\')">ตีกลับแก้</button></div></div>';
    }).join("");
  }

  function renderIssues() {
    document.getElementById("issueCount").textContent = D.openIssues.length + " รายการ";
    var box = document.getElementById("issueList");
    if (!D.openIssues.length) { box.innerHTML = '<div class="empty">ไม่มีปัญหาค้าง 🎉</div>'; return; }
    box.innerHTML = D.openIssues.map(function (s) {
      var sv = SEV[s.severity] || SEV.low;
      return '<div class="act-row"><div class="top"><div><b>' + esc(s.title) + '</b>' +
        '<div class="sub">📍 ' + esc(s.project) + ' · แจ้งโดย ' + esc(s.reporter) + ' · ' + esc(s.createdAt) + '</div></div>' +
        '<span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span></div>' +
        (s.detail ? '<div class="detail">' + esc(s.detail) + '</div>' : '') +
        '<div class="acts"><button class="btn btn-primary" onclick="PM.openResolve(\'' + s.id + '\')">ตอบ / ปิดเรื่อง</button></div></div>';
    }).join("");
  }

  function renderAllTasks() {
    var rows = D.tasks.map(function (t) {
      var s = STATUS[t.status] || STATUS.in_progress;
      var col = PROGRESS_COLOR(t.progress, t.status);
      return '<tr><td><b>' + esc(t.title) + '</b><div class="muted" style="font-size:11px">' + esc(t.project) + '</div></td>' +
        '<td>' + esc(t.assignee) + '</td>' +
        '<td style="min-width:90px"><div class="bar" style="margin-bottom:3px"><i style="width:' + t.progress + '%;background:' + col + '"></i></div>' +
        '<span class="tabular muted" style="font-size:11px">' + t.progress + '%</span></td>' +
        '<td><span class="status ' + s.cls + '"><span class="d"></span>' + s.th + '</span></td></tr>';
    }).join("");
    document.getElementById("allTasks").innerHTML =
      '<table class="table"><thead><tr><th>งาน</th><th>ผู้รับเหมา</th><th>คืบหน้า</th><th>สถานะ</th></tr></thead><tbody>' +
      rows + '</tbody></table>';
  }

  function renderContractors() {
    document.getElementById("contractorList").innerHTML = D.contractors.map(function (c) {
      return '<div class="act-row" style="margin-bottom:8px;padding:11px 13px"><div class="top">' +
        '<div style="display:flex;align-items:center;gap:10px"><span class="avatar" style="background:var(--accent);width:32px;height:32px">' + esc(c.initials) + '</span>' +
        '<div><b>' + esc(c.name) + '</b><div class="sub">' + esc(c.skill) + '</div></div></div>' +
        '<span class="muted tabular" style="font-size:12px">' + c.openTasks + ' งาน</span></div></div>';
    }).join("");
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
