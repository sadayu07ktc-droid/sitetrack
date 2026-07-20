/* ============================================================
   SiteTrack — API layer
   ------------------------------------------------------------
   ชั้นกลางระหว่าง UI กับข้อมูล ตอนนี้ USE_MOCK = true จึงอ่าน/เขียน
   จาก window.MOCK (ในหน่วยความจำ) เพื่อทำ prototype

   วิธีต่อ backend จริง (Google Apps Script + Google Sheets):
   1) เปลี่ยน USE_MOCK = false
   2) ใส่ GAS_URL เป็น URL ของ Web App ที่ deploy จาก Apps Script
   3) โครงสร้าง response ของ GAS ต้องตรงกับ MOCK (ดู backend/Code.gs)
   ทุกฟังก์ชันคืน Promise เพื่อให้สลับเป็น fetch จริงได้โดยไม่แก้ UI
   ============================================================ */
window.API = (function () {
  const USE_MOCK = false;
  const GAS_URL = "https://script.google.com/macros/s/AKfycbz_Zf3K3YxBoj4DBY8LgzLALkSFgxb98mIxcFHEEV0wVGh4-ZJfyMMefaeiq_1Ey5Cf7A/exec";

  function delay(v, ms) { return new Promise(function (r) { setTimeout(function () { r(v); }, ms || 180); }); }

  async function callGAS(action, payload) {
    // เรียก Google Apps Script Web App (ใช้เมื่อ USE_MOCK = false)
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // เลี่ยง CORS preflight
      body: JSON.stringify({ action: action, payload: payload || {} })
    });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || "GAS error");
    return json.data;
  }

  return {
    isMock: function () { return USE_MOCK; },

    getDashboard: function () {
      if (USE_MOCK) return delay({
        projects: MOCK.projects, issues: MOCK.issues, activity: MOCK.activity,
        weekly: MOCK.weekly, weekLabels: MOCK.weekLabels,
        kpi: {
          projects: MOCK.projects.length,
          avgProgress: Math.round(MOCK.projects.reduce((a, p) => a + p.progress, 0) / MOCK.projects.length),
          late: MOCK.tasks.filter(t => t.status === "late").length + MOCK.projects.filter(p => p.status === "late").length,
          openIssues: MOCK.issues.filter(i => i.status === "open").length
        }
      });
      return callGAS("getDashboard");
    },

    getTasks: function () {
      if (USE_MOCK) return delay(MOCK.tasks.slice());
      return callGAS("getTasks", { userId: MOCK.currentUser.id });
    },

    resolveUser: function (lineUserId) {
      if (USE_MOCK) return delay(MOCK.currentUser);
      return callGAS("resolveUser", { lineUserId: lineUserId });
    },

    getTask: function (id) {
      if (USE_MOCK) return delay(MOCK.tasks.find(t => t.id === id) || null);
      return callGAS("getTask", { id: id });
    },

    getTaskUpdates: function (taskId) {
      if (USE_MOCK) return delay([]);
      return callGAS("getTaskUpdates", { taskId: taskId });
    },

    updateProgress: function (taskId, progress, note, photos) {
      if (USE_MOCK) {
        const t = MOCK.tasks.find(x => x.id === taskId);
        if (t) {
          t.progress = progress;
          if (progress >= 100) t.status = "done";
          else if (t.status === "done") t.status = "in_progress";
        }
        return delay({ ok: true, task: t });
      }
      return callGAS("updateProgress", { taskId, progress, note, photos: photos || [], userId: MOCK.currentUser.id });
      // NOTE: backend เซฟรูปลง Drive + ยิงแจ้งเตือน LINE ให้ PM เมื่อ progress ครบ 100%
    },

    reportIssue: function (data) {
      if (USE_MOCK) {
        const issue = {
          id: "i" + (MOCK.issues.length + 1), taskId: data.taskId || null,
          project: data.project || "", title: data.title, severity: data.severity,
          reporter: MOCK.currentUser.name, status: "open", createdAt: "เมื่อสักครู่"
        };
        MOCK.issues.unshift(issue);
        const t = MOCK.tasks.find(x => x.id === data.taskId);
        if (t) t.status = "problem";
        return delay({ ok: true, issue });
      }
      return callGAS("reportIssue", Object.assign({ userId: MOCK.currentUser.id }, data));
      // NOTE: backend จะยิง Flex Message แจ้ง PM + ผู้บริหารทาง LINE ทันที
    },

    /* ---------- มุมมองผู้จัดการโครงการ (PM) ---------- */
    getPMData: function () {
      if (USE_MOCK) return delay({
        pending: MOCK.tasks.filter(t => t.status === "done"),          // งานรออนุมัติ
        openIssues: MOCK.issues.filter(i => i.status === "open"),      // ปัญหาที่ต้องตอบ
        contractors: MOCK.contractors,
        projects: MOCK.projects,
        tasks: MOCK.tasks
      });
      return callGAS("getPMData");
    },

    getContractors: function () {
      if (USE_MOCK) return delay(MOCK.contractors.slice());
      return callGAS("getContractors");
    },

    createProject: function (data) {
      if (USE_MOCK) {
        var proj = { id: "p" + (MOCK.projects.length + 1), name: data.name, owner: data.owner || "",
          budget: Number(data.budget) || 0, progress: 0, due: data.due || "", status: "on_track" };
        MOCK.projects.push(proj);
        return delay({ ok: true, project: proj });
      }
      return callGAS("createProject", data);
    },

    setProjectStage: function (projectId, stage, hold) {
      if (USE_MOCK) {
        var p = MOCK.projects.find(x => x.id === projectId);
        if (p) { p.stage = stage; p.hold = hold ? "TRUE" : ""; }
        return delay({ ok: true, project: p });
      }
      return callGAS("setProjectStage", { projectId: projectId, stage: stage, hold: !!hold });
    },

    assignTask: function (data) {
      if (USE_MOCK) {
        var proj = MOCK.projects.find(p => p.id === data.projectId);
        var con = MOCK.contractors.find(c => c.id === data.contractorId);
        var task = {
          id: "t" + (MOCK.tasks.length + 1), projectId: data.projectId,
          project: proj ? proj.name.split(" ").slice(-2).join(" ") : "", contractorId: data.contractorId,
          title: data.title, location: data.location || "", progress: 0,
          due: data.due || "", status: "in_progress", assignee: con ? con.name : ""
        };
        MOCK.tasks.push(task);
        if (con) con.openTasks++;
        return delay({ ok: true, task: task });
      }
      return callGAS("assignTask", data);
      // NOTE: backend จะยิงแจ้งเตือน LINE "งานใหม่" ให้ผู้รับเหมา
    },

    approveTask: function (taskId) {
      if (USE_MOCK) {
        var t = MOCK.tasks.find(x => x.id === taskId);
        if (t) t.status = "approved";
        return delay({ ok: true, task: t });
      }
      return callGAS("approveTask", { taskId: taskId });
    },

    rejectTask: function (taskId, reason) {
      if (USE_MOCK) {
        var t = MOCK.tasks.find(x => x.id === taskId);
        if (t) { t.status = "in_progress"; t.progress = Math.min(t.progress, 90); }
        return delay({ ok: true, task: t });
      }
      return callGAS("rejectTask", { taskId: taskId, reason: reason });
      // NOTE: backend จะแจ้ง LINE ให้ผู้รับเหมาแก้งาน
    },

    resolveIssue: function (issueId, reply, close) {
      if (USE_MOCK) {
        var i = MOCK.issues.find(x => x.id === issueId);
        if (i) { i.reply = reply || ""; if (close) i.status = "closed"; }
        return delay({ ok: true, issue: i });
      }
      return callGAS("resolveIssue", { issueId: issueId, reply: reply, close: !!close });
      // NOTE: backend จะแจ้ง LINE กลับไปยังผู้แจ้งปัญหา
    },

    getProject: function (id) {
      if (USE_MOCK) {
        var p = MOCK.projects.find(x => x.id === id);
        if (!p) return delay(null);
        return delay({
          project: p,
          tasks: MOCK.tasks.filter(t => t.projectId === id),
          issues: MOCK.issues.filter(is => {
            var t = MOCK.tasks.find(tt => tt.id === is.taskId);
            return (t && t.projectId === id) || is.project.indexOf(p.name.split(" ").slice(-2).join(" ")) > -1;
          })
        });
      }
      return callGAS("getProject", { id: id });
    }
  };
})();
