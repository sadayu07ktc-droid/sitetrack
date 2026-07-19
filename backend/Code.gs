/**
 * ============================================================
 * SiteTrack — Backend (Google Apps Script Web App)
 * ระบบติดตามงานผู้รับเหมา · ฐานข้อมูล = Google Sheets · แจ้งเตือน = LINE Messaging API
 * ------------------------------------------------------------
 * โครงชีต (แต่ละแท็บ = ตาราง) — ดู docs/SETUP.md :
 *   Projects | Tasks | Updates | Issues | Users | Notifications
 *
 * Deploy: Apps Script > Deploy > New deployment > Web app
 *   Execute as: Me | Who has access: Anyone
 * แล้วเอา URL /exec ไปใส่ใน frontend/js/api.js (GAS_URL) และตั้ง USE_MOCK=false
 * ============================================================
 */

// ====== CONFIG (เก็บใน Script Properties เพื่อความปลอดภัย) ======
// Project Settings > Script Properties:
//   LINE_TOKEN      = Channel access token ของ LINE Official Account
//   LINE_ADMIN_IDS  = userId ของ PM/ผู้บริหาร คั่นด้วย comma (ผู้รับแจ้งเตือน)
//   SHEET_ID        = (ไม่ต้องใส่ถ้าสคริปต์ผูกกับชีตอยู่แล้ว)
function CONFIG_() {
  var p = PropertiesService.getScriptProperties();
  return {
    lineToken: p.getProperty('LINE_TOKEN') || '',
    adminIds: (p.getProperty('LINE_ADMIN_IDS') || '').split(',').map(function (s) { return s.trim(); }).filter(String)
  };
}
function SS_() {
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

// ====== ROUTER ======
function doGet(e) { return json_({ ok: true, data: { status: 'SiteTrack API online' } }); }

function doPost(e) {
  try {
    // แยกระหว่าง LINE webhook กับ API ปกติ
    if (e.postData && e.postData.contents && e.postData.contents.indexOf('"destination"') > -1) {
      return handleLineWebhook_(JSON.parse(e.postData.contents));
    }
    var body = JSON.parse(e.postData.contents);
    var action = body.action, payload = body.payload || {};
    var data;
    switch (action) {
      case 'getDashboard':   data = getDashboard_(); break;
      case 'getTasks':       data = getTasks_(payload.userId); break;
      case 'getTask':        data = getTask_(payload.id); break;
      case 'getTaskUpdates': data = rows_('Updates').filter(function (u) { return String(u.taskId) === String(payload.taskId); }); break;
      case 'updateProgress': data = updateProgress_(payload); break;
      case 'reportIssue':    data = reportIssue_(payload); break;
      case 'getPMData':      data = getPMData_(); break;
      case 'getContractors': data = getContractors_(); break;
      case 'assignTask':     data = assignTask_(payload); break;
      case 'createProject':  data = createProject_(payload); break;
      case 'approveTask':    data = setTaskStatus_(payload.taskId, 'approved'); break;
      case 'rejectTask':     data = rejectTask_(payload); break;
      case 'resolveIssue':   data = resolveIssue_(payload); break;
      case 'getProject':     data = getProject_(payload.id); break;
      default: return json_({ ok: false, error: 'unknown action: ' + action });
    }
    return json_({ ok: true, data: data });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ====== SHEET HELPERS ======
function rows_(name) {
  var sh = SS_().getSheetByName(name);
  if (!sh) return [];
  var values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  var head = values[0];
  return values.slice(1).map(function (r) {
    var o = {}; head.forEach(function (h, i) { o[h] = r[i]; }); return o;
  });
}
function appendRow_(name, obj) {
  var sh = SS_().getSheetByName(name);
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(function (h) { return obj[h] != null ? obj[h] : ''; }));
}
function updateCell_(name, idField, idVal, field, value) {
  var sh = SS_().getSheetByName(name);
  var values = sh.getDataRange().getValues(), head = values[0];
  var idCol = head.indexOf(idField), fCol = head.indexOf(field);
  for (var r = 1; r < values.length; r++) {
    if (String(values[r][idCol]) === String(idVal)) {
      sh.getRange(r + 1, fCol + 1).setValue(value); return true;
    }
  }
  return false;
}
function uid_(prefix) { return prefix + Utilities.getUuid().slice(0, 8); }
function now_() { return Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'); }

// ====== BUSINESS LOGIC ======
function getDashboard_() {
  var projects = rows_('Projects'), tasks = rows_('Tasks'), issues = rows_('Issues');
  var updates = rows_('Updates');
  var avg = projects.length ? Math.round(projects.reduce(function (a, p) { return a + Number(p.progress || 0); }, 0) / projects.length) : 0;
  // weekly: นับ Updates ต่อวัน (จ-ส) แยกเสร็จ(100%)/กำลังทำ
  var labels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  var weekly = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
  var weeklyItems = [[], [], [], [], [], []];   // รายละเอียดงานแต่ละวัน (สำหรับ drawer)
  updates.forEach(function (u) {
    var dt = new Date(u.createdAt);
    if (isNaN(dt.getTime())) return;
    var wd = dt.getDay();               // 0=อา..6=ส
    if (wd === 0) return;               // ข้ามวันอาทิตย์
    var idx = wd - 1, pg = Number(u.progress) || 0;
    if (pg >= 100) weekly[idx][0]++; else weekly[idx][1]++;
    weeklyItems[idx].push({ taskTitle: u.taskTitle, userName: u.userName, progress: pg, note: u.note || '', time: u.createdAt });
  });
  return {
    projects: projects,
    issues: issues.filter(function (i) { return i.status === 'open'; }),
    activity: updates.slice(-6).reverse().map(function (u) {
      return { who: u.userName, initials: (u.userName || '').slice(0, 2), color: 'var(--st-prog)',
               text: 'อัพเดท ' + u.taskTitle + ' เป็น ' + u.progress + '%', time: u.createdAt };
    }),
    weekly: weekly,
    weekLabels: labels,
    weeklyItems: weeklyItems,
    lateTasks: tasks.filter(function (t) { return t.status === 'late'; }),
    kpi: {
      projects: projects.length, avgProgress: avg,
      late: tasks.filter(function (t) { return t.status === 'late'; }).length,
      openIssues: issues.filter(function (i) { return i.status === 'open'; }).length
    }
  };
}
function getTasks_(userId) {
  return rows_('Tasks').filter(function (t) { return !userId || String(t.contractorId) === String(userId); });
}
function getTask_(id) {
  return rows_('Tasks').filter(function (t) { return String(t.id) === String(id); })[0] || null;
}

function updateProgress_(p) {
  updateCell_('Tasks', 'id', p.taskId, 'progress', p.progress);
  if (p.progress >= 100) updateCell_('Tasks', 'id', p.taskId, 'status', 'done');
  var task = getTask_(p.taskId);
  appendRow_('Updates', {
    id: uid_('u'), taskId: p.taskId, taskTitle: task ? task.title : '',
    userId: p.userId, userName: userName_(p.userId), progress: p.progress,
    note: p.note || '', photos: savePhotos_(p.photos, 'update'), createdAt: now_()
  });
  // งานเสร็จ -> แจ้ง PM ให้อนุมัติ
  if (p.progress >= 100) {
    notifyLine_(CONFIG_().adminIds, flexTask_('🟢 งานเสร็จ รออนุมัติ', task, 'var(--st-done)'));
  }
  return { ok: true, task: task };
}

function reportIssue_(p) {
  var issue = {
    id: uid_('i'), taskId: p.taskId || '', project: p.project || '', title: p.title,
    severity: p.severity, detail: p.detail || '', reporter: userName_(p.userId),
    status: 'open', reply: '', photos: savePhotos_(p.photos, 'issue'), createdAt: now_()
  };
  appendRow_('Issues', issue);
  if (p.taskId) updateCell_('Tasks', 'id', p.taskId, 'status', 'problem');
  // แจ้งเตือน LINE : ปัญหาระดับสูง -> PM + ผู้บริหาร
  var flag = p.severity === 'high' ? '🔴 ปัญหาระดับสูง' : p.severity === 'medium' ? '🟠 ปัญหา' : '🔵 ปัญหา';
  notifyLine_(CONFIG_().adminIds, flexIssue_(flag, issue));
  return { ok: true, issue: issue };
}

// ---- PM actions ----
function getPMData_() {
  var tasks = rows_('Tasks'), issues = rows_('Issues'), contractors = rows_('Users').filter(function (u) { return u.role === 'contractor'; });
  return {
    pending: tasks.filter(function (t) { return t.status === 'done'; }),
    openIssues: issues.filter(function (i) { return i.status === 'open'; }),
    contractors: contractors.map(function (c) {
      return { id: c.id, name: c.name, initials: (c.name || '').slice(0, 2), skill: c.skill || '',
               openTasks: tasks.filter(function (t) { return String(t.contractorId) === String(c.id) && t.status !== 'approved'; }).length };
    }),
    projects: rows_('Projects'), tasks: tasks
  };
}
function getContractors_() { return getPMData_().contractors; }

function assignTask_(p) {
  var proj = rows_('Projects').filter(function (x) { return String(x.id) === String(p.projectId); })[0];
  var task = {
    id: uid_('t'), projectId: p.projectId, project: proj ? proj.name : '', contractorId: p.contractorId,
    title: p.title, location: p.location || '', progress: 0, due: p.due || '',
    status: 'in_progress', assignee: userName_(p.contractorId)
  };
  appendRow_('Tasks', task);
  var lineId = lineIdOf_(p.contractorId);
  if (lineId) notifyLine_([lineId], flexTask_('🔵 งานใหม่ที่ได้รับมอบหมาย', task, 'var(--st-prog)'));
  return { ok: true, task: task };
}
function createProject_(p) {
  var proj = {
    id: uid_('p'), name: p.name, owner: p.owner || '', budget: Number(p.budget) || 0,
    start: p.start || now_().slice(0, 10), due: p.due || '', progress: 0, status: 'on_track'
  };
  appendRow_('Projects', proj);
  return { ok: true, project: proj };
}
function setTaskStatus_(taskId, status) {
  updateCell_('Tasks', 'id', taskId, 'status', status);
  return { ok: true, task: getTask_(taskId) };
}
function rejectTask_(p) {
  updateCell_('Tasks', 'id', p.taskId, 'status', 'in_progress');
  var task = getTask_(p.taskId);
  var lineId = task ? lineIdOf_(task.contractorId) : '';
  if (lineId) notifyLine_([lineId], flexTask_('🟠 งานถูกตีกลับให้แก้ไข', task, 'var(--st-late)'));
  return { ok: true, task: task };
}
function resolveIssue_(p) {
  updateCell_('Issues', 'id', p.issueId, 'reply', p.reply || '');
  if (p.close) updateCell_('Issues', 'id', p.issueId, 'status', 'closed');
  var issue = rows_('Issues').filter(function (x) { return String(x.id) === String(p.issueId); })[0];
  // แจ้ง LINE กลับไปยังผู้แจ้ง (หาจากชื่อ reporter -> user -> lineUserId)
  if (issue) {
    var u = rows_('Users').filter(function (x) { return x.name === issue.reporter; })[0];
    if (u && u.lineUserId) notifyLine_([u.lineUserId], flexIssue_(p.close ? '🟢 ปัญหาได้รับการแก้ไข' : '🔵 PM ตอบกลับ', issue));
  }
  return { ok: true, issue: issue };
}
function getProject_(id) {
  var p = rows_('Projects').filter(function (x) { return String(x.id) === String(id); })[0];
  if (!p) return null;
  var tasks = rows_('Tasks').filter(function (t) { return String(t.projectId) === String(id); });
  var taskIds = tasks.map(function (t) { return String(t.id); });
  return { project: p, tasks: tasks,
    issues: rows_('Issues').filter(function (is) { return taskIds.indexOf(String(is.taskId)) > -1; }) };
}

function userName_(userId) {
  var u = rows_('Users').filter(function (x) { return String(x.id) === String(userId); })[0];
  return u ? u.name : '';
}
function lineIdOf_(userId) {
  var u = rows_('Users').filter(function (x) { return String(x.id) === String(userId); })[0];
  return u ? u.lineUserId : '';
}

// ====== LINE MESSAGING API ======
function notifyLine_(toIds, flexContents) {
  var token = CONFIG_().lineToken;
  if (!token || !toIds || !toIds.length) return;
  toIds.forEach(function (to) {
    if (!to) return;
    UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ to: to, messages: [flexContents] }),
      muteHttpExceptions: true
    });
  });
  toIds.forEach(function (to) {
    appendRow_('Notifications', { id: uid_('n'), userId: to, type: flexContents.altText || 'alert',
      channel: 'line', sentAt: now_() });
  });
}

// สร้าง Flex Message การ์ดปัญหา
function flexIssue_(flag, issue) {
  return {
    type: 'flex', altText: flag + ' : ' + issue.title,
    contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      { type: 'text', text: flag, weight: 'bold', color: '#DC2626', size: 'sm' },
      { type: 'text', text: issue.title, weight: 'bold', size: 'lg', wrap: true },
      kv_('โครงการ', issue.project), kv_('ผู้แจ้ง', issue.reporter), kv_('เวลา', issue.createdAt),
      { type: 'text', text: issue.detail, size: 'sm', color: '#666666', wrap: true, margin: 'md' }
    ]}}
  };
}
function flexTask_(flag, task, color) {
  return {
    type: 'flex', altText: flag + ' : ' + (task ? task.title : ''),
    contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', spacing: 'sm', contents: [
      { type: 'text', text: flag, weight: 'bold', size: 'sm' },
      { type: 'text', text: task ? task.title : '', weight: 'bold', size: 'lg', wrap: true },
      kv_('โครงการ', task ? task.project : ''), kv_('คืบหน้า', (task ? task.progress : 0) + '%')
    ]}}
  };
}
function kv_(k, v) {
  return { type: 'box', layout: 'baseline', contents: [
    { type: 'text', text: k, size: 'sm', color: '#999999', flex: 2 },
    { type: 'text', text: String(v), size: 'sm', color: '#333333', flex: 4, wrap: true }
  ]};
}

// ====== LINE WEBHOOK (รับข้อความ / ผูกบัญชี) ======
function handleLineWebhook_(body) {
  (body.events || []).forEach(function (ev) {
    if (ev.type === 'message' && ev.message.type === 'text') {
      var uid = ev.source.userId;
      // ตัวอย่าง: ผู้ใช้พิมพ์ "ผูก <รหัสพนักงาน>" เพื่อเชื่อม LINE กับบัญชี
      var m = String(ev.message.text).match(/^ผูก\s+(\S+)/);
      if (m) { updateCell_('Users', 'code', m[1], 'lineUserId', uid);
        replyLine_(ev.replyToken, 'เชื่อมบัญชี LINE เรียบร้อยแล้ว ✅'); }
    }
  });
  return json_({ ok: true });
}
function replyLine_(replyToken, text) {
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'post', contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + CONFIG_().lineToken },
    payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: 'text', text: text }] }),
    muteHttpExceptions: true
  });
}

// ====== utils ======
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ====== รูปภาพ -> Google Drive ======
function photoFolder_() {
  var p = PropertiesService.getScriptProperties();
  var id = p.getProperty('PHOTO_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var folder = DriveApp.createFolder('SiteTrack Photos');
  p.setProperty('PHOTO_FOLDER_ID', folder.getId());
  return folder;
}
// รับ array ของ data URL (base64) -> เซฟลง Drive -> คืน URL คั่นด้วย comma
function savePhotos_(photos, prefix) {
  if (!photos || !photos.length) return '';
  var folder = photoFolder_();
  var urls = [];
  for (var i = 0; i < photos.length; i++) {
    var m = String(photos[i]).match(/^data:([^;]+);base64,(.*)$/);
    if (!m) continue;
    var name = (prefix || 'photo') + '_' + now_().replace(/[^0-9]/g, '') + '_' + i;
    var blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], name);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    urls.push('https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200');
  }
  return urls.join(',');
}
function ensureColumn_(sheetName, col) {
  var sh = SS_().getSheetByName(sheetName);
  if (!sh) return;
  var head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  if (head.indexOf(col) === -1) sh.getRange(1, head.length + 1).setValue(col);
}
/**
 * รันครั้งเดียวเพื่อเปิดใช้แนบรูป: อนุญาตสิทธิ์ Drive + เพิ่มคอลัมน์ photos + สร้างโฟลเดอร์
 * (Apps Script editor > เลือก setupPhotos > Run)
 */
function setupPhotos() {
  ensureColumn_('Updates', 'photos');
  ensureColumn_('Issues', 'photos');
  return photoFolder_().getId();
}

/**
 * รันครั้งเดียวเพื่อสร้างแท็บ + หัวคอลัมน์ให้ครบตามสคีมา
 * (Apps Script editor > เลือกฟังก์ชัน setupSheets > Run)
 */
function setupSheets() {
  var ss = SS_();
  var schema = {
    Projects: ['id', 'name', 'owner', 'budget', 'start', 'due', 'progress', 'status'],
    Tasks: ['id', 'projectId', 'project', 'contractorId', 'title', 'location', 'progress', 'due', 'status', 'assignee'],
    Updates: ['id', 'taskId', 'taskTitle', 'userId', 'userName', 'progress', 'note', 'photos', 'createdAt'],
    Issues: ['id', 'taskId', 'project', 'title', 'severity', 'detail', 'reporter', 'status', 'reply', 'photos', 'createdAt'],
    Users: ['id', 'code', 'name', 'role', 'skill', 'lineUserId', 'phone'],
    Notifications: ['id', 'userId', 'type', 'channel', 'sentAt']
  };
  Object.keys(schema).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(schema[name]);
  });
}

/**
 * ใส่ข้อมูลตัวอย่างลงชีต (รันครั้งเดียวจาก editor)
 * ล้างข้อมูลเดิม (เก็บหัวตาราง) แล้วเติมชุดตัวอย่าง — รันซ้ำได้ไม่ซ้ำข้อมูล
 */
function seedSampleData() {
  var ss = SS_();
  function fill(name, rows) {
    var sh = ss.getSheetByName(name);
    if (!sh) return;
    var last = sh.getLastRow();
    if (last > 1) sh.getRange(2, 1, last - 1, sh.getLastColumn()).clearContent();
    if (rows.length) sh.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
  // Users: id, code, name, role, skill, lineUserId, phone
  fill('Users', [
    ['u1', 'C001', 'สมชาย ใจดี', 'contractor', 'งานโครงสร้าง/ปูน', '', '0810000001'],
    ['u2', 'C002', 'ธนา รักงาน', 'contractor', 'งานพื้น/กระเบื้อง', '', '0810000002'],
    ['u3', 'C003', 'ณัฐ ตั้งใจ', 'contractor', 'งานระบบประปา', '', '0810000003'],
    ['u4', 'C004', 'วิชัย มานะ', 'contractor', 'งานไฟฟ้า', '', '0810000004'],
    ['u5', 'P001', 'ประเสริฐ คุมงาน', 'pm', 'ผู้จัดการโครงการ', '', '0820000001'],
    ['u6', 'E001', 'วิเชียร บริหาร', 'executive', 'ผู้บริหาร', '', '0830000001']
  ]);
  // Projects: id, name, owner, budget, start, due, progress, status
  fill('Projects', [
    ['p1', 'คอนโด เดอะริเวอร์ เฟส 2', 'บมจ. ริเวอร์ดีเวลลอปเมนท์', 85000000, '2026-01-15', '2026-10-30', 82, 'on_track'],
    ['p2', 'อาคารสำนักงาน ปาร์คเลน', 'บจก. ปาร์คเลน', 120000000, '2026-02-01', '2026-12-15', 64, 'on_track'],
    ['p3', 'บ้านจัดสรร กรีนวิลล์', 'บจก. กรีนวิลล์ เอสเตท', 45000000, '2026-03-10', '2026-09-20', 47, 'late'],
    ['p4', 'รีโนเวทโรงแรม สุขุมวิท', 'โรงแรมสุขุมวิท อินน์', 30000000, '2026-04-01', '2026-08-31', 29, 'problem']
  ]);
  // Tasks: id, projectId, project, contractorId, title, location, progress, due, status, assignee
  fill('Tasks', [
    ['t1', 'p1', 'ริเวอร์ เฟส 2', 'u1', 'ฉาบผนังชั้น 3 โซน B', 'ชั้น 3', 55, '2026-07-13', 'late', 'สมชาย ใจดี'],
    ['t2', 'p1', 'ริเวอร์ เฟส 2', 'u1', 'เทพื้นคอนกรีตชั้น 4', 'ชั้น 4', 70, '2026-07-18', 'in_progress', 'สมชาย ใจดี'],
    ['t3', 'p1', 'ริเวอร์ เฟส 2', 'u1', 'ติดตั้งท่อน้ำทิ้ง', 'ชั้น 2', 30, '2026-07-19', 'problem', 'สมชาย ใจดี'],
    ['t4', 'p1', 'ริเวอร์ เฟส 2', 'u1', 'ปูกระเบื้องห้องน้ำ', 'ชั้น 1', 100, '2026-07-10', 'done', 'สมชาย ใจดี'],
    ['t5', 'p2', 'ปาร์คเลน', 'u1', 'ติดตั้งฝ้าเพดานชั้น 5', 'ชั้น 5', 20, '2026-07-25', 'in_progress', 'สมชาย ใจดี'],
    ['t6', 'p2', 'ปาร์คเลน', 'u2', 'ปูพื้นกระเบื้องล็อบบี้', 'ชั้น 1', 60, '2026-07-22', 'in_progress', 'ธนา รักงาน'],
    ['t7', 'p3', 'กรีนวิลล์', 'u4', 'เดินสายไฟบ้าน A', 'บ้าน A', 40, '2026-07-16', 'late', 'วิชัย มานะ'],
    ['t8', 'p1', 'ริเวอร์ เฟส 2', 'u3', 'ติดตั้งระบบประปาชั้น 3', 'ชั้น 3', 90, '2026-07-14', 'done', 'ณัฐ ตั้งใจ']
  ]);
  // Updates: id, taskId, taskTitle, userId, userName, progress, note, createdAt
  fill('Updates', [
    ['ux1', 't4', 'ปูกระเบื้องห้องน้ำ', 'u1', 'สมชาย ใจดี', 100, 'ปูเสร็จทั้งห้อง', '2026-07-06 15:00'],
    ['ux2', 't6', 'ปูพื้นกระเบื้องล็อบบี้', 'u2', 'ธนา รักงาน', 45, 'ปูไป 45%', '2026-07-07 10:30'],
    ['ux3', 't7', 'เดินสายไฟบ้าน A', 'u4', 'วิชัย มานะ', 30, 'เดินสายชั้นล่าง', '2026-07-08 14:00'],
    ['ux4', 't8', 'ติดตั้งระบบประปาชั้น 3', 'u3', 'ณัฐ ตั้งใจ', 75, 'ต่อท่อเมนเสร็จ', '2026-07-09 11:00'],
    ['ux5', 't1', 'ฉาบผนังชั้น 3 โซน B', 'u1', 'สมชาย ใจดี', 40, 'ฉาบโซนแรก', '2026-07-10 16:00'],
    ['ux6', 't2', 'เทพื้นคอนกรีตชั้น 4', 'u1', 'สมชาย ใจดี', 50, 'เทครึ่งชั้น', '2026-07-11 09:00'],
    ['ux7', 't8', 'ติดตั้งระบบประปาชั้น 3', 'u3', 'ณัฐ ตั้งใจ', 90, 'เกือบเสร็จ', '2026-07-13 13:00'],
    ['ux8', 't6', 'ปูพื้นกระเบื้องล็อบบี้', 'u2', 'ธนา รักงาน', 60, 'ปูเพิ่มเป็น 60%', '2026-07-14 10:00'],
    ['ux9', 't2', 'เทพื้นคอนกรีตชั้น 4', 'u1', 'สมชาย ใจดี', 70, 'เทโซนตะวันตกเสร็จ', '2026-07-15 09:20'],
    ['ux10', 't4', 'ปูกระเบื้องห้องน้ำ', 'u1', 'สมชาย ใจดี', 100, 'ตรวจงานผ่าน', '2026-07-15 15:30']
  ]);
  // Issues: id, taskId, project, title, severity, detail, reporter, status, reply, createdAt
  fill('Issues', [
    ['i1', 't3', 'ริเวอร์ เฟส 2', 'น้ำรั่วชั้น 3 ฝั่งตะวันออก', 'high', 'ท่อ PVC ขนาดไม่ตรงแบบ ติดตั้งต่อไม่ได้', 'สมชาย ใจดี', 'open', '', '2026-07-15 09:38'],
    ['i2', '', 'ปาร์คเลน', 'วัสดุปูพื้นส่งไม่ครบ', 'medium', 'ส่งมา 60% ของที่สั่ง', 'ธนา รักงาน', 'open', '', '2026-07-15 09:05'],
    ['i3', '', 'กรีนวิลล์', 'แบบไฟฟ้าไม่ตรงหน้างาน', 'high', 'ตำแหน่งปลั๊กไม่ตรงแปลน', 'วิชัย มานะ', 'open', '', '2026-07-14 16:20']
  ]);
}
