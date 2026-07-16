/* ============================================================
   SiteTrack — shared right-side Drawer (with drill-down stack)
   ใช้ร่วมกันทุกหน้า: Drawer.open() เปิดชั้นแรก, Drawer.push() ลงลึก
   (มีปุ่มย้อนกลับให้อัตโนมัติ), Drawer.close() ปิด
   ------------------------------------------------------------
   เปิดจาก element ที่มีคลาส .dr-trigger เพื่อไม่ให้คลิกนั้นปิด drawer เอง
   ============================================================ */
window.esc = function (s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
};
window.fmtTime = function (v) {
  var d = new Date(v);
  if (isNaN(d.getTime())) return window.esc(v);
  try {
    return d.toLocaleString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch (e) { return window.esc(v); }
};

window.Drawer = (function () {
  var bg, el, stack = [];

  function ensure() {
    if (bg) return;
    bg = document.createElement("div"); bg.className = "drawer-bg";
    el = document.createElement("div"); el.className = "drawer";
    document.body.appendChild(bg); document.body.appendChild(el);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.addEventListener("click", function (e) {
      if (!el.classList.contains("open")) return;
      // ถ้า element ที่คลิกถูก re-render ออกจาก DOM ไปแล้ว (เช่น คลิกรายการใน
      // drawer เพื่อ drill-down) อย่าตีความว่าเป็นการคลิกข้างนอก
      if (!document.documentElement.contains(e.target)) return;
      if (e.target.closest(".drawer") || e.target.closest(".dr-trigger")) return;
      close();
    });
  }

  function render() {
    var top = stack[stack.length - 1];
    var back = stack.length > 1 ? '<button class="dback" aria-label="ย้อนกลับ">‹</button>' : "";
    el.innerHTML =
      '<div class="dh">' + back +
        '<div class="dhx"><h3>' + top.title + '</h3>' +
        (top.sub ? '<div class="dsub">' + top.sub + '</div>' : "") + '</div>' +
        '<button class="dclose" aria-label="ปิด">✕</button></div>' +
      '<div class="db">' + (top.body || '<div class="empty">ไม่มีข้อมูล</div>') + '</div>';
    el.querySelector(".dclose").addEventListener("click", close);
    var b = el.querySelector(".dback"); if (b) b.addEventListener("click", pop);
    if (typeof top.onRender === "function") top.onRender(el.querySelector(".db"));
  }

  function show() { bg.classList.add("open"); void el.offsetWidth; el.classList.add("open"); }
  function open(title, sub, body, onRender) { ensure(); stack = [{ title: title, sub: sub, body: body, onRender: onRender }]; render(); show(); }
  function push(title, sub, body, onRender) { ensure(); stack.push({ title: title, sub: sub, body: body, onRender: onRender }); render(); show(); }
  function pop() { if (stack.length > 1) { stack.pop(); render(); } }
  function close() {
    if (!el) return;
    el.classList.remove("open"); bg.classList.remove("open"); stack = [];
    [].forEach.call(document.querySelectorAll(".dr-trigger.active"), function (a) { a.classList.remove("active"); });
  }
  return { open: open, push: push, pop: pop, close: close };
})();

/* ---- shared row + detail renderers (window.DR) ---- */
window.DR = (function () {
  function bar(pct, grad) { return '<div class="bar"><i style="width:' + pct + '%;background:' + grad + '"></i></div>'; }

  function taskRow(t, i) {
    var st = STATUS[t.status] || STATUS.in_progress, g = GRAD(t.progress, t.status);
    return '<div class="di clickable" data-idx="' + i + '"><div class="dtop"><b>' + esc(t.title) + '</b>' +
      '<span class="status ' + st.cls + '"><span class="d"></span>' + st.th + '</span></div>' +
      '<div class="dmeta">📍 ' + esc(t.project) + ' · ' + esc(t.location || "") + ' · 👷 ' + esc(t.assignee) + '</div>' +
      bar(t.progress, g) + '<span class="chev">›</span></div>';
  }
  function taskDetail(t) {
    var st = STATUS[t.status] || STATUS.in_progress, g = GRAD(t.progress, t.status);
    return '<div class="dcard"><div class="dbig" style="color:' + PROGRESS_COLOR(t.progress, t.status) + '">' + t.progress + '%</div>' +
      bar(t.progress, g) +
      '<div class="drow"><span>สถานะ</span><span class="status ' + st.cls + '"><span class="d"></span>' + st.th + '</span></div>' +
      '<div class="drow"><span>โครงการ</span><b>' + esc(t.project) + '</b></div>' +
      '<div class="drow"><span>ตำแหน่ง</span><b>' + esc(t.location || "-") + '</b></div>' +
      '<div class="drow"><span>ผู้รับเหมา</span><b>' + esc(t.assignee) + '</b></div>' +
      '<div class="drow"><span>กำหนดส่ง</span><b>' + esc(t.due || "-") + '</b></div></div>';
  }

  function issueRow(s, i) {
    var sv = SEV[s.severity] || SEV.low;
    return '<div class="di clickable" data-idx="' + i + '"><div class="dtop"><b>' + esc(s.title) + '</b>' +
      '<span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span></div>' +
      '<div class="dmeta">📍 ' + esc(s.project) + ' · 👷 ' + esc(s.reporter) + '</div><span class="chev">›</span></div>';
  }
  function issueDetail(s) {
    var sv = SEV[s.severity] || SEV.low;
    return '<div class="dcard">' +
      '<div class="drow"><span>ระดับ</span><span class="status ' + sv.cls + '"><span class="d"></span>' + sv.th + '</span></div>' +
      '<div class="drow"><span>โครงการ</span><b>' + esc(s.project) + '</b></div>' +
      '<div class="drow"><span>ผู้แจ้ง</span><b>' + esc(s.reporter) + '</b></div>' +
      '<div class="drow"><span>เวลา</span><b>' + fmtTime(s.createdAt) + '</b></div>' +
      (s.detail ? '<div class="dnote" style="margin-top:10px">' + esc(s.detail) + '</div>' : "") +
      (s.reply ? '<div class="dnote" style="margin-top:8px;border-left:3px solid var(--st-prog)">↩ ' + esc(s.reply) + '</div>' : "") +
      '</div>';
  }

  function projRow(p, i) {
    var st = STATUS[p.status] || STATUS.on_track, g = GRAD(p.progress, p.status);
    return '<div class="di clickable" data-idx="' + i + '"><div class="dtop"><b>' + esc(p.name) + '</b>' +
      '<span class="pct">' + p.progress + '%</span></div>' +
      '<div class="dmeta"><span class="status ' + st.cls + '"><span class="d"></span>' + st.th + '</span> · ' + esc(p.owner) + '</div>' +
      bar(p.progress, g) + '<span class="chev">›</span></div>';
  }

  function projDetail(p) {
    var st = STATUS[p.status] || STATUS.on_track, g = GRAD(p.progress, p.status);
    return '<div class="dcard"><div class="dbig" style="color:' + PROGRESS_COLOR(p.progress, p.status) + '">' + p.progress + '%</div>' +
      bar(p.progress, g) +
      '<div class="drow"><span>สถานะ</span><span class="status ' + st.cls + '"><span class="d"></span>' + st.th + '</span></div>' +
      '<div class="drow"><span>เจ้าของโครงการ</span><b>' + esc(p.owner) + '</b></div>' +
      '<div class="drow"><span>กำหนดส่ง</span><b>' + esc(p.due || "-") + '</b></div>' +
      '<a class="btn btn-primary btn-block" style="margin-top:14px;text-decoration:none" href="project.html?id=' + esc(p.id) + '">เปิดหน้าโครงการเต็ม →</a></div>';
  }

  function contractorRow(c, i) {
    return '<div class="di clickable" data-idx="' + i + '"><div class="dtop">' +
      '<b><span class="miniava">' + esc(c.initials) + '</span> ' + esc(c.name) + '</b>' +
      '<span class="pct" style="font-size:13px">' + c.openTasks + ' งาน</span></div>' +
      '<div class="dmeta">' + esc(c.skill) + '</div><span class="chev">›</span></div>';
  }

  // build a clickable list into a container; onPick(item) fires on row click
  function wireList(dbEl, items, onPick) {
    [].forEach.call(dbEl.querySelectorAll(".di.clickable"), function (row) {
      row.addEventListener("click", function () { onPick(items[+row.getAttribute("data-idx")]); });
    });
  }

  return {
    taskRow: taskRow, taskDetail: taskDetail,
    issueRow: issueRow, issueDetail: issueDetail,
    projRow: projRow, projDetail: projDetail, contractorRow: contractorRow,
    wireList: wireList
  };
})();
