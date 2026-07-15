/* ============================================================
   SiteTrack — Contractor mobile app (SPA)
   Views: tasks (list) · detail (update progress) · report (issue)
           issues · notify · more
   ============================================================ */
window.App = (function () {
  UI.initTheme();

  var view = document.getElementById("view");
  var backBtn = document.getElementById("backBtn");
  var headTitle = document.getElementById("headTitle");
  var tabbar = document.getElementById("tabbar");
  var stack = [];          // navigation stack ของหน้าย่อย
  var draft = { severity: "high" };

  function esc(s) { return String(s == null ? "" : s); }

  function setHead(title, sub, showBack) {
    headTitle.innerHTML = esc(title) + (sub ? '<small>' + esc(sub) + '</small>' : '');
    backBtn.classList.toggle("hidden", !showBack);
    tabbar.style.display = showBack ? "none" : "flex";
  }
  function setTab(name) {
    Array.prototype.forEach.call(tabbar.querySelectorAll(".tb"), function (b) {
      b.classList.toggle("on", b.getAttribute("data-tab") === name);
    });
  }

  // ---------- LIST ----------
  function renderTasks() {
    stack = [];
    setHead("งานของฉัน", MOCK.currentUser.name + " · ริเวอร์ เฟส 2", false);
    setTab("tasks");
    API.getTasks().then(function (tasks) {
      var today = tasks;
      view.innerHTML = '<div class="p-label">วันนี้ · ' + today.length + ' งาน</div>' +
        today.map(taskCard).join("");
    });
  }
  function taskCard(t) {
    var s = STATUS[t.status];
    var col = PROGRESS_COLOR(t.progress, t.status);
    var dueTxt = t.status === "late" ? "เลยกำหนด" :
                 t.status === "problem" ? "รอตอบกลับ" :
                 t.status === "done" ? "รออนุมัติ" : "ครบ " + fmtDue(t.due);
    return '<button class="task ' + s.b + '" onclick="App.openTask(\'' + t.id + '\')">' +
      '<div class="tt"><b>' + esc(t.title) + '</b>' +
      '<span class="status ' + s.cls + '"><span class="d"></span>' + s.th + '</span></div>' +
      '<div class="meta"><span>📍 ' + esc(t.location) + '</span><span>🗓 ' + dueTxt + '</span></div>' +
      '<div class="pbar"><i style="width:' + t.progress + '%;background:' + col + '"></i></div></button>';
  }
  function fmtDue(iso) {
    var m = { "01":"ม.ค.","02":"ก.พ.","03":"มี.ค.","04":"เม.ย.","05":"พ.ค.","06":"มิ.ย.",
              "07":"ก.ค.","08":"ส.ค.","09":"ก.ย.","10":"ต.ค.","11":"พ.ย.","12":"ธ.ค." };
    var p = String(iso).split("-"); return p.length === 3 ? (+p[2]) + " " + m[p[1]] : iso;
  }

  // ---------- DETAIL / UPDATE ----------
  function openTask(id) {
    API.getTask(id).then(function (t) {
      if (!t) return;
      stack.push("tasks");
      setHead("อัพเดทงาน", t.title, true);
      draft = { taskId: t.id, project: t.project, title: t.title, severity: "high" };
      view.innerHTML =
        '<div class="p-label">' + esc(t.project) + ' · ' + esc(t.location) + '</div>' +
        '<div class="field"><label class="fl">ความคืบหน้า</label>' +
          '<div class="big-pct" id="pctLabel">' + t.progress + '%</div>' +
          '<input type="range" min="0" max="100" step="5" value="' + t.progress +
            '" oninput="document.getElementById(\'pctLabel\').textContent=this.value+\'%\'" id="pct" /></div>' +
        '<div class="field"><label class="fl">รูปหน้างาน</label>' +
          '<div class="photos"><div class="ph2 filled">🏗</div><div class="ph2 filled">🧱</div>' +
          '<div class="ph2" onclick="UI.toast(\'อัพโหลดรูป (ตัวอย่าง)\')">＋</div></div></div>' +
        '<div class="field"><label class="fl">บันทึกเพิ่มเติม</label>' +
          '<textarea id="note" placeholder="เช่น เทพื้นโซนตะวันตกเสร็จ รอปูนเซ็ตตัว…"></textarea></div>' +
        '<button class="btn btn-primary btn-block" onclick="App.saveProgress()">บันทึกอัพเดท</button>' +
        '<div style="height:10px"></div>' +
        '<button class="btn btn-danger btn-block" onclick="App.openReport()">⚠ แจ้งปัญหางานนี้</button>';
    });
  }
  function saveProgress() {
    var pct = +document.getElementById("pct").value;
    var note = document.getElementById("note").value;
    API.updateProgress(draft.taskId, pct, note).then(function () {
      UI.toast(pct >= 100 ? "บันทึกแล้ว · ส่งให้ PM อนุมัติ" : "บันทึกอัพเดทแล้ว", "ok");
      renderTasks();
    });
  }

  // ---------- REPORT ISSUE ----------
  function openReport() {
    stack.push("detail");
    setHead("แจ้งปัญหา", (draft.title || "") , true);
    draft.severity = "high";
    view.innerHTML =
      '<div class="p-label" style="color:var(--st-prob)">' + esc(draft.project || "") + '</div>' +
      '<div class="field"><label class="fl">ระดับความรุนแรง</label>' +
        '<div class="seg" id="sev">' +
          '<div class="s" data-v="low" onclick="App.pickSev(this)">ต่ำ</div>' +
          '<div class="s" data-v="medium" onclick="App.pickSev(this)">กลาง</div>' +
          '<div class="s on-prob" data-v="high" onclick="App.pickSev(this)">สูง / ด่วน</div>' +
        '</div></div>' +
      '<div class="field"><label class="fl">ประเภทปัญหา</label>' +
        '<select id="cat"><option>วัสดุ / อุปกรณ์</option><option>แบบ / สเปกไม่ตรง</option>' +
        '<option>ความปลอดภัย</option><option>สภาพอากาศ</option><option>แรงงาน</option><option>อื่น ๆ</option></select></div>' +
      '<div class="field"><label class="fl">รายละเอียด</label>' +
        '<textarea id="detail" placeholder="อธิบายปัญหาที่พบหน้างาน…"></textarea></div>' +
      '<div class="field"><label class="fl">แนบรูป</label>' +
        '<div class="photos"><div class="ph2 filled">📷</div>' +
        '<div class="ph2" onclick="UI.toast(\'อัพโหลดรูป (ตัวอย่าง)\')">＋</div></div></div>' +
      '<button class="btn btn-danger btn-block" onclick="App.submitIssue()">ส่งแจ้งปัญหา</button>' +
      '<div class="empty" style="padding:12px 8px;font-size:12px">จะแจ้งเตือน PM และผู้บริหารทาง LINE ทันที</div>';
  }
  function pickSev(node) {
    draft.severity = node.getAttribute("data-v");
    Array.prototype.forEach.call(node.parentNode.children, function (c) {
      c.classList.remove("on", "on-prob");
      if (c === node) c.classList.add(draft.severity === "high" ? "on-prob" : "on");
    });
  }
  function submitIssue() {
    var cat = document.getElementById("cat").value;
    var detail = document.getElementById("detail").value;
    API.reportIssue({
      taskId: draft.taskId, project: draft.project,
      title: (draft.title ? draft.title + " — " : "") + cat, severity: draft.severity, detail: detail
    }).then(function () {
      UI.toast("ส่งแจ้งปัญหาแล้ว · แจ้งเตือน LINE ให้ทีมแล้ว", "warn");
      renderTasks();
    });
  }

  // ---------- OTHER TABS ----------
  function renderIssues() {
    setHead("ปัญหาที่แจ้ง", MOCK.currentUser.name, false); setTab("issues");
    var mine = MOCK.issues;
    view.innerHTML = mine.length ? mine.map(function (s) {
      var sev = s.severity === "high" ? "s-prob" : s.severity === "medium" ? "s-late" : "s-prog";
      var svTh = s.severity === "high" ? "ด่วน" : s.severity === "medium" ? "รอแก้" : "ทั่วไป";
      return '<div class="task b-prob"><div class="tt"><b>' + esc(s.title) + '</b>' +
        '<span class="status ' + sev + '"><span class="d"></span>' + svTh + '</span></div>' +
        '<div class="meta"><span>📍 ' + esc(s.project) + '</span><span>🕒 ' + esc(s.createdAt) + '</span></div></div>';
    }).join("") : '<div class="empty">ยังไม่มีปัญหาที่แจ้ง</div>';
  }
  function renderNotify() {
    setHead("แจ้งเตือน", "", false); setTab("notify");
    var items = [
      { i: "🔴", t: "ปัญหาระดับสูง: น้ำรั่วชั้น 3", s: "ส่งเข้า LINE ทีมแล้ว", tm: "09:38" },
      { i: "🟠", t: "งานเลยกำหนด: ฉาบผนังชั้น 3 โซน B", s: "เลยกำหนด 2 วัน", tm: "08:00" },
      { i: "🔵", t: "งานใหม่: ติดตั้งฝ้าเพดานชั้น 5", s: "ครบกำหนด 25 ก.ค.", tm: "เมื่อวาน" },
      { i: "🟢", t: "งานปูกระเบื้องห้องน้ำ รออนุมัติ", s: "PM กำลังตรวจ", tm: "เมื่อวาน" }
    ];
    view.innerHTML = items.map(function (n) {
      return '<div class="task"><div class="tt"><b>' + n.i + ' ' + esc(n.t) + '</b>' +
        '<span class="muted" style="font-size:11px">' + n.tm + '</span></div>' +
        '<div class="meta"><span>' + esc(n.s) + '</span></div></div>';
    }).join("");
  }
  function renderMore() {
    setHead("อื่น ๆ", MOCK.currentUser.name, false); setTab("more");
    view.innerHTML =
      '<div class="task"><div class="tt"><b>👤 โปรไฟล์</b><span class="muted">' + esc(MOCK.currentUser.name) + '</span></div></div>' +
      '<div class="task"><div class="tt"><b>🔗 เชื่อมต่อ LINE</b><span class="status s-done"><span class="d"></span>เชื่อมแล้ว</span></div></div>' +
      '<a class="task" style="display:block" href="dashboard.html"><div class="tt"><b>📊 มุมมองผู้บริหาร</b><span class="muted">→</span></div></a>' +
      '<a class="task" style="display:block" href="index.html"><div class="tt"><b>↩ ออกจากระบบ</b><span class="muted">→</span></div></a>';
  }

  // ---------- ROUTER ----------
  function go(tab) {
    if (tab === "tasks") renderTasks();
    else if (tab === "issues") renderIssues();
    else if (tab === "notify") renderNotify();
    else if (tab === "more") renderMore();
  }
  function back() {
    var prev = stack.pop();
    if (prev === "detail") { openTask(draft.taskId); }
    else { renderTasks(); }
  }

  document.addEventListener("DOMContentLoaded", renderTasks);
  if (document.readyState !== "loading") renderTasks();

  return { go: go, back: back, openTask: openTask, saveProgress: saveProgress,
           openReport: openReport, pickSev: pickSev, submitIssue: submitIssue };
})();
