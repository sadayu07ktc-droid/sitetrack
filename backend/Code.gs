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
      case 'updateProgress': data = updateProgress_(payload); break;
      case 'reportIssue':    data = reportIssue_(payload); break;
      case 'getPMData':      data = getPMData_(); break;
      case 'getContractors': data = getContractors_(); break;
      case 'assignTask':     data = assignTask_(payload); break;
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
  var avg = projects.length ? Math.round(projects.reduce(function (a, p) { return a + Number(p.progress || 0); }, 0) / projects.length) : 0;
  return {
    projects: projects,
    issues: issues.filter(function (i) { return i.status === 'open'; }),
    activity: rows_('Updates').slice(-6).reverse().map(function (u) {
      return { who: u.userName, initials: (u.userName || '').slice(0, 2), color: 'var(--st-prog)',
               text: 'อัพเดท ' + u.taskTitle + ' เป็น ' + u.progress + '%', time: u.createdAt };
    }),
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
    note: p.note || '', createdAt: now_()
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
    status: 'open', createdAt: now_()
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

/**
 * รันครั้งเดียวเพื่อสร้างแท็บ + หัวคอลัมน์ให้ครบตามสคีมา
 * (Apps Script editor > เลือกฟังก์ชัน setupSheets > Run)
 */
function setupSheets() {
  var ss = SS_();
  var schema = {
    Projects: ['id', 'name', 'owner', 'budget', 'start', 'due', 'progress', 'status'],
    Tasks: ['id', 'projectId', 'project', 'contractorId', 'title', 'location', 'progress', 'due', 'status', 'assignee'],
    Updates: ['id', 'taskId', 'taskTitle', 'userId', 'userName', 'progress', 'note', 'createdAt'],
    Issues: ['id', 'taskId', 'project', 'title', 'severity', 'detail', 'reporter', 'status', 'reply', 'createdAt'],
    Users: ['id', 'code', 'name', 'role', 'skill', 'lineUserId', 'phone'],
    Notifications: ['id', 'userId', 'type', 'channel', 'sentAt']
  };
  Object.keys(schema).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) sh.appendRow(schema[name]);
  });
}
