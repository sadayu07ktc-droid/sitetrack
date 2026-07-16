/* ============================================================
   SiteTrack — Mock data (prototype)
   โครงสร้างนี้ตรงกับชีตใน Google Sheets (ดู docs/SETUP.md)
   เมื่อต่อ backend จริงแล้ว ข้อมูลชุดนี้จะถูกแทนด้วยผลลัพธ์จาก
   Google Apps Script Web App — ดู js/api.js
   ============================================================ */
window.MOCK = {
  currentUser: { id: "u1", name: "สมชาย ใจดี", initials: "สม", role: "contractor" },

  projects: [
    { id: "p1", name: "คอนโด เดอะริเวอร์ เฟส 2", owner: "บมจ. ริเวอร์ดีเวลลอปเมนท์", progress: 82, due: "2026-10-30", status: "on_track" },
    { id: "p2", name: "อาคารสำนักงาน ปาร์คเลน",   owner: "บจก. ปาร์คเลน",            progress: 64, due: "2026-12-15", status: "on_track" },
    { id: "p3", name: "บ้านจัดสรร กรีนวิลล์",       owner: "บจก. กรีนวิลล์ เอสเตท",   progress: 47, due: "2026-09-20", status: "late" },
    { id: "p4", name: "รีโนเวทโรงแรม สุขุมวิท",     owner: "โรงแรมสุขุมวิท อินน์",     progress: 29, due: "2026-08-31", status: "problem" }
  ],

  // งานของผู้รับเหมาที่ล็อกอินอยู่
  tasks: [
    { id: "t1", projectId: "p1", project: "ริเวอร์ เฟส 2", title: "ฉาบผนังชั้น 3 โซน B", location: "ชั้น 3",
      progress: 55, due: "2026-07-13", status: "late", assignee: "สมชาย" },
    { id: "t2", projectId: "p1", project: "ริเวอร์ เฟส 2", title: "เทพื้นคอนกรีตชั้น 4", location: "ชั้น 4",
      progress: 70, due: "2026-07-18", status: "in_progress", assignee: "สมชาย" },
    { id: "t3", projectId: "p1", project: "ริเวอร์ เฟส 2", title: "ติดตั้งท่อน้ำทิ้ง", location: "ชั้น 2",
      progress: 30, due: "2026-07-19", status: "problem", assignee: "สมชาย" },
    { id: "t4", projectId: "p1", project: "ริเวอร์ เฟส 2", title: "ปูกระเบื้องห้องน้ำ", location: "ชั้น 1",
      progress: 100, due: "2026-07-10", status: "done", assignee: "สมชาย" },
    { id: "t5", projectId: "p2", project: "ปาร์คเลน", title: "ติดตั้งฝ้าเพดานชั้น 5", location: "ชั้น 5",
      progress: 20, due: "2026-07-25", status: "in_progress", assignee: "สมชาย" }
  ],

  issues: [
    { id: "i1", taskId: "t3", project: "ริเวอร์ เฟส 2", title: "น้ำรั่วชั้น 3 ฝั่งตะวันออก", severity: "high",
      reporter: "สมชาย", status: "open", createdAt: "2026-07-15 09:38" },
    { id: "i2", taskId: null, project: "ปาร์คเลน", title: "วัสดุปูพื้นส่งไม่ครบ", severity: "medium",
      reporter: "ธนา", status: "open", createdAt: "2026-07-15 09:05" },
    { id: "i3", taskId: null, project: "กรีนวิลล์", title: "แบบไฟฟ้าไม่ตรงหน้างาน", severity: "high",
      reporter: "วิชัย", status: "open", createdAt: "2026-07-14 16:20" }
  ],

  contractors: [
    { id: "u1", name: "สมชาย ใจดี", initials: "สม", skill: "งานโครงสร้าง/ปูน", openTasks: 3 },
    { id: "u2", name: "ธนา รักงาน", initials: "ธน", skill: "งานพื้น/กระเบื้อง", openTasks: 2 },
    { id: "u3", name: "ณัฐ ตั้งใจ", initials: "ณั", skill: "งานระบบประปา", openTasks: 1 },
    { id: "u4", name: "วิชัย มานะ", initials: "วช", skill: "งานไฟฟ้า", openTasks: 2 }
  ],

  activity: [
    { who: "สมชาย", initials: "สม", color: "var(--st-done)", text: "อัพเดทงานเทพื้นชั้น 4 เป็น 100%", time: "12 นาทีที่แล้ว" },
    { who: "ธนา",   initials: "ธน", color: "var(--st-prob)", text: "แจ้งปัญหาวัสดุส่งไม่ครบ", time: "40 นาทีที่แล้ว" },
    { who: "ณัฐ",   initials: "ณั", color: "var(--st-prog)", text: "ส่งงานติดตั้งระบบประปา รออนุมัติ", time: "1 ชม.ที่แล้ว" },
    { who: "วิชัย", initials: "วช", color: "var(--st-late)", text: "อัพเดทงานฉาบผนัง เป็น 60%", time: "2 ชม.ที่แล้ว" }
  ],

  // งานเสร็จรายวัน (จ-ส) : [เสร็จ, กำลังทำ]
  weekly: [ [7,3], [6,4], [8,2], [9,4], [11,3], [7,2] ],
  weekLabels: ["จ","อ","พ","พฤ","ศ","ส"]
};

/* ---- helper: mapping สถานะ -> คลาส/ข้อความไทย ---- */
window.STATUS = {
  done:        { cls: "s-done", b: "b-done", th: "เสร็จ" },
  in_progress: { cls: "s-prog", b: "b-prog", th: "กำลังทำ" },
  late:        { cls: "s-late", b: "b-late", th: "ล่าช้า" },
  problem:     { cls: "s-prob", b: "b-prob", th: "มีปัญหา" },
  on_track:    { cls: "s-prog", b: "b-prog", th: "ตามแผน" },
  approved:    { cls: "s-done", b: "b-done", th: "อนุมัติแล้ว" }
};
window.PROGRESS_COLOR = function (p, status) {
  if (status === "problem") return "var(--st-prob)";
  if (status === "late") return "var(--st-late)";
  if (p >= 100) return "var(--st-done)";
  return "var(--st-prog)";
};
window.GRAD = function (p, status) {
  if (status === "problem") return "var(--grad-prob)";
  if (status === "late") return "var(--grad-late)";
  if (p >= 100) return "var(--grad-done)";
  return "var(--grad-prog)";
};
window.SEV = {
  high:   { cls: "s-prob", th: "ด่วน" },
  medium: { cls: "s-late", th: "รอแก้" },
  low:    { cls: "s-prog", th: "ทั่วไป" }
};
