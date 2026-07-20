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
window.fmtDate = function (v) {
  if (v == null || v === "") return "-";
  var d = new Date(v);
  if (isNaN(d.getTime())) return window.esc(v);
  try {
    return d.toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "short", year: "numeric" });
  } catch (e) { return window.esc(v); }
};

window.photosHtml = function (str) {
  if (!str) return "";
  var urls = String(str).split(",").filter(Boolean);
  if (!urls.length) return "";
  return '<div class="dphotos">' + urls.map(function (u) {
    return '<a href="' + window.esc(u) + '" target="_blank" rel="noopener"><img src="' + window.esc(u) + '" loading="lazy" alt="รูปหน้างาน"></a>';
  }).join("") + '</div>';
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
      '<div class="drow"><span>กำหนดส่ง</span><b>' + fmtDate(t.due) + '</b></div></div>';
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
      photosHtml(s.photos) +
      (s.reply ? '<div class="dnote" style="margin-top:8px;border-left:3px solid var(--st-prog)">↩ ' + esc(s.reply) + '</div>' : "") +
      '</div>';
  }

  function projRow(p, i) {
    var st = STATUS[p.status] || STATUS.on_track, g = GRAD(p.progress, p.status);
    var s = stageOf(p), held = String(p.hold).toUpperCase() === "TRUE";
    return '<div class="di clickable" data-idx="' + i + '"><div class="dtop"><b>' + esc(p.name) + '</b>' +
      '<span class="pct">' + p.progress + '%</span></div>' +
      '<div class="dmeta"><span class="stagechip">' + s.n + '. ' + esc(s.short) + '</span>' +
      (held ? ' <span class="status s-prob"><span class="d"></span>HOLD</span>' : '') +
      ' <span class="status ' + st.cls + '"><span class="d"></span>' + st.th + '</span></div>' +
      '<div class="dmeta">' + esc(p.owner) + (p.workType ? ' · ' + esc(p.workType) : '') + '</div>' +
      bar(p.progress, g) + '<span class="chev">›</span></div>';
  }

  // แถบขั้นตอน 1-7
  function stageBar(p) {
    var cur = Number(p.stage) || 1;
    return '<div class="stagebar">' + STAGES.map(function (s) {
      var cls = s.n < cur ? "done" : (s.n === cur ? "cur" : "");
      return '<div class="stg ' + cls + '"><i>' + (s.n < cur ? "✓" : s.n) + '</i><small>' + esc(s.short) + '</small></div>';
    }).join("") + '</div>';
  }
  function projDetail(p) {
    var st = STATUS[p.status] || STATUS.on_track, g = GRAD(p.progress, p.status);
    var s = stageOf(p), held = String(p.hold).toUpperCase() === "TRUE";
    var wt = esc(p.workType || "-") + (p.workSubType ? " · " + esc(p.workSubType) : "");
    function row(label, val) { return val ? '<div class="drow"><span>' + label + '</span><b>' + esc(val) + '</b></div>' : ""; }
    return '<div class="dcard"><div class="dbig" style="color:' + PROGRESS_COLOR(p.progress, p.status) + '">' + p.progress + '%</div>' +
      bar(p.progress, g) +
      '<div class="drow"><span>ขั้นตอน</span><b>' + s.n + '. ' + esc(s.name) +
        (held ? ' <span class="status s-prob"><span class="d"></span>HOLD</span>' : '') + '</b></div>' +
      stageBar(p) +
      '<div class="drow"><span>รหัสโปรเจค</span><b>' + esc(p.id) + '</b></div>' +
      '<div class="drow"><span>ประเภทงาน</span><b>' + wt + '</b></div>' +
      row("พื้นที่", p.area) +
      row("เจ้าของพื้นที่", p.areaOwner || p.owner) +
      row("ผู้รับผิดชอบ", p.responsible) +
      row("ผู้รับเหมา / ช่างภายใน", p.contractor) +
      (p.start ? '<div class="drow"><span>วันที่เริ่ม</span><b>' + fmtDate(p.start) + '</b></div>' : "") +
      row("ระยะเวลาโดยประมาณ", p.duration) +
      '<div class="drow"><span>สถานะ</span><span class="status ' + st.cls + '"><span class="d"></span>' + st.th + '</span></div>' +
      (p.due ? '<div class="drow"><span>กำหนดส่ง</span><b>' + fmtDate(p.due) + '</b></div>' : "") +
      '<a class="btn btn-primary btn-block" style="margin-top:14px;text-decoration:none" href="project.html?id=' + esc(p.id) + '">เปิดหน้าโครงการเต็ม →</a></div>';
  }
  // ฟอร์มเปลี่ยนขั้นตอน (ใช้ในหน้า PM)
  function stageForm(p) {
    var cur = Number(p.stage) || 1, held = String(p.hold).toUpperCase() === "TRUE";
    return '<div class="field" style="margin-top:18px"><label class="fl">📊 อัพเดท % งานโครงการ' +
      (p.responsible ? ' <span class="muted" style="font-weight:500">(ผู้รับผิดชอบ: ' + esc(p.responsible) + ')</span>' : '') + '</label>' +
      '<div class="big-pct dr-pct-label" style="font-size:26px">' + (Number(p.progress) || 0) + '%</div>' +
      '<input type="range" min="0" max="100" step="5" value="' + (Number(p.progress) || 0) + '" class="dr-pct" /></div>' +
      '<button class="btn btn-ghost btn-block dr-pct-save">บันทึก % งาน</button>' +
      '<div class="field" style="margin-top:16px"><label class="fl">🔄 เปลี่ยนขั้นตอนโครงการ</label>' +
      '<select class="dr-stage">' + STAGES.map(function (s) {
        return '<option value="' + s.n + '"' + (s.n === cur ? " selected" : "") + '>' + s.n + '. ' + esc(s.name) + '</option>';
      }).join("") + '</select></div>' +
      '<label class="fl" style="display:flex;align-items:center;gap:8px;cursor:pointer">' +
      '<input type="checkbox" class="dr-hold"' + (held ? " checked" : "") + ' style="width:auto"> พักงานไว้ก่อน (Hold — ยังไม่อนุมัติ)</label>' +
      '<button class="btn btn-primary btn-block dr-stage-save" style="margin-top:12px">บันทึกขั้นตอน</button>';
  }
  function wireStageForm(dbEl, p, onDone) {
    // อัพเดท % งานโครงการ
    var pct = dbEl.querySelector(".dr-pct"), pctLabel = dbEl.querySelector(".dr-pct-label"),
        pctBtn = dbEl.querySelector(".dr-pct-save");
    if (pct) {
      pct.addEventListener("input", function () { pctLabel.textContent = pct.value + "%"; });
      pctBtn.addEventListener("click", function () {
        pctBtn.disabled = true; pctBtn.textContent = "กำลังบันทึก…";
        API.setProjectProgress(p.id, +pct.value).then(function () {
          UI.toast("อัพเดท % งานเป็น " + pct.value + "% แล้ว", "ok");
          Drawer.close(); if (onDone) onDone();
        });
      });
    }
    var btn = dbEl.querySelector(".dr-stage-save");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var stage = +dbEl.querySelector(".dr-stage").value;
      var hold = dbEl.querySelector(".dr-hold").checked;
      btn.disabled = true; btn.textContent = "กำลังบันทึก…";
      API.setProjectStage(p.id, stage, hold).then(function () {
        UI.toast("อัพเดทขั้นตอนเป็น “" + STAGES[stage - 1].short + "” แล้ว", "ok");
        Drawer.close();
        if (onDone) onDone();
      });
    });
  }
  // เปิดโครงการ (usePush=true เมื่ออยู่ใน drill) — editable=true จะมีฟอร์มเปลี่ยนขั้นตอน
  function openProject(p, usePush, editable, onDone) {
    var fn = usePush ? Drawer.push : Drawer.open;
    fn(esc(p.name), esc(p.owner), projDetail(p) + (editable ? stageForm(p) : ""),
      function (db) { if (editable) wireStageForm(db, p, onDone); });
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

  // ---- เปิดงานแบบเต็ม: สรุป + ประวัติการอัพเดท (โหลด async) ----
  function openTask(t, usePush) {
    var fn = usePush ? Drawer.push : Drawer.open;
    fn(esc(t.title), esc(t.project || ""), taskDetail(t) +
      '<div class="dload empty" style="padding:18px">⏳ กำลังโหลดประวัติงาน…</div>',
      function (db) {
        API.getTaskUpdates(t.id).then(function (ups) {
          var box = db.querySelector(".dload");
          if (!box) return;
          if (!ups || !ups.length) { box.textContent = "ยังไม่มีการอัพเดทงานนี้"; return; }
          var list = ups.slice().reverse();   // ล่าสุดขึ้นก่อน
          box.outerHTML =
            '<div class="p-label" style="margin:18px 0 10px">🕐 ประวัติการอัพเดท · ' + ups.length + ' ครั้ง</div>' +
            list.map(function (u) {
              var col = Number(u.progress) >= 100 ? "var(--st-done)" : "var(--st-prog)";
              return '<div class="di"><div class="dtop"><b>อัพเดทเป็น <span style="color:' + col + '">' + u.progress + '%</span></b>' +
                '<span class="muted" style="font-size:11.5px">' + fmtTime(u.createdAt) + '</span></div>' +
                '<div class="dmeta">👷 ' + esc(u.userName) + '</div>' +
                '<div class="bar" style="margin-bottom:' + (u.note || u.photos ? '8px' : '0') + '"><i style="width:' + u.progress + '%;background:' + col + '"></i></div>' +
                (u.note ? '<div class="dnote">' + esc(u.note) + '</div>' : '') +
                photosHtml(u.photos) + '</div>';
            }).join("");
        }).catch(function () {
          var box = db.querySelector(".dload");
          if (box) box.textContent = "โหลดประวัติไม่สำเร็จ";
        });
      });
  }

  // ---- ตอบกลับปัญหาได้จากใน drawer (ทุกหน้า) ----
  function issueReplyForm() {
    return '<div class="field" style="margin-top:16px"><label class="fl">💬 ตอบกลับถึงผู้แจ้ง</label>' +
      '<textarea class="dr-reply-text" placeholder="เช่น รับทราบ กำลังประสานสั่งวัสดุใหม่ ถึงพรุ่งนี้เช้า"></textarea></div>' +
      '<div style="display:flex;gap:8px">' +
      '<button class="btn btn-primary btn-block dr-reply-send">ส่งคำตอบ</button>' +
      '<button class="btn btn-ghost btn-block dr-reply-close">ตอบ + ปิดเรื่อง</button></div>' +
      '<div class="empty" style="padding:10px 4px 0;font-size:11.5px">ระบบจะแจ้งคำตอบกลับหาผู้แจ้งทาง LINE</div>';
  }
  function wireIssueReply(dbEl, issue, onDone) {
    var ta = dbEl.querySelector(".dr-reply-text");
    if (!ta) return;
    function submit(closeIt) {
      var msg = ta.value.trim();
      if (!msg && !closeIt) { UI.toast("พิมพ์ข้อความก่อนส่งครับ", "warn"); return; }
      API.resolveIssue(issue.id, msg, closeIt).then(function () {
        UI.toast(closeIt ? "ปิดเรื่องแล้ว · แจ้งผู้แจ้งทาง LINE" : "ส่งคำตอบแล้ว · แจ้งผู้แจ้งทาง LINE", "ok");
        Drawer.close();
        if (onDone) onDone();
      });
    }
    dbEl.querySelector(".dr-reply-send").addEventListener("click", function () { submit(false); });
    dbEl.querySelector(".dr-reply-close").addEventListener("click", function () { submit(true); });
  }
  // เปิดรายละเอียดปัญหา + ฟอร์มตอบ (ใช้ได้จากทุกหน้า) — usePush=true เมื่ออยู่ใน drill
  function openIssue(s, usePush, onDone) {
    var open = s.status === "open";
    var body = issueDetail(s) + (open ? issueReplyForm() : "");
    var fn = usePush ? Drawer.push : Drawer.open;
    fn(esc(s.title), esc(s.project), body, function (db) {
      if (open) wireIssueReply(db, s, onDone);
    });
  }

  return {
    taskRow: taskRow, taskDetail: taskDetail, openTask: openTask,
    issueRow: issueRow, issueDetail: issueDetail, openIssue: openIssue,
    issueReplyForm: issueReplyForm, wireIssueReply: wireIssueReply,
    projRow: projRow, projDetail: projDetail, openProject: openProject, stageBar: stageBar,
    contractorRow: contractorRow,
    wireList: wireList
  };
})();
