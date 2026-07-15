# คู่มือติดตั้ง SiteTrack (GS + GAS + Cloudflare)

สถาปัตยกรรม: **Cloudflare Pages** (หน้าเว็บ) → **Google Apps Script Web App** (API + LINE) → **Google Sheets** (ฐานข้อมูล)

```
ผู้ใช้ (มือถือ/คอม)
      │
      ▼
Cloudflare Pages  ──POST JSON──►  Apps Script Web App  ──►  Google Sheets
 (frontend/)                       (backend/Code.gs)         (6 แท็บ = 6 ตาราง)
                                        │
                                        └──push──►  LINE Messaging API ──►  LINE ของทีม
```

---

## ส่วนที่ 1 — ฐานข้อมูล (Google Sheets)

1. สร้าง Google Sheet ใหม่ 1 ไฟล์ ตั้งชื่อ `SiteTrack DB`
2. เปิด **Extensions → Apps Script** จะได้โปรเจกต์สคริปต์ที่ผูกกับชีตนี้
3. ก๊อปโค้ดจาก `backend/Code.gs` วางทับ แล้วบันทึก
4. เลือกฟังก์ชัน **`setupSheets`** ในแถบด้านบน แล้วกด **Run** หนึ่งครั้ง
   → สคริปต์จะสร้างแท็บ `Projects, Tasks, Updates, Issues, Users, Notifications` พร้อมหัวคอลัมน์ให้อัตโนมัติ
5. กรอกข้อมูลตั้งต้นในแท็บ `Users` และ `Projects` (อย่างน้อย 1 แถวต่อแท็บ)

### สคีมาตาราง (หัวคอลัมน์)
| แท็บ | คอลัมน์ |
|---|---|
| Projects | id, name, owner, budget, start, due, progress, status |
| Tasks | id, projectId, project, contractorId, title, location, progress, due, status, assignee |
| Updates | id, taskId, taskTitle, userId, userName, progress, note, createdAt |
| Issues | id, taskId, project, title, severity, detail, reporter, status, reply, createdAt |
| Users | id, code, name, role, skill, lineUserId, phone |
| Notifications | id, userId, type, channel, sentAt |

ค่า `status` งาน: `in_progress` / `late` / `problem` / `done` · `severity`: `low` / `medium` / `high` · `role`: `contractor` / `pm` / `executive`

---

## ส่วนที่ 2 — LINE Messaging API

> LINE Notify ปิดบริการแล้ว (เม.ย. 2025) จึงใช้ **Messaging API** ผ่าน Official Account

1. สร้าง **LINE Official Account** ที่ https://manager.line.biz แล้วเปิดใช้ Messaging API
2. เข้า https://developers.line.biz → เลือก channel → แท็บ **Messaging API**
   - คัดลอก **Channel access token (long-lived)**
   - ปิด *Auto-reply messages* / *Greeting messages* ถ้าไม่ต้องการ
3. ให้ PM/ผู้บริหารแอด Official Account เป็นเพื่อน แล้วหา **userId** ของแต่ละคน
   (พิมพ์ `ผูก <รหัสพนักงาน>` ในแชท ระบบจะบันทึก `lineUserId` ลงแท็บ Users ให้ — ดูฟังก์ชัน `handleLineWebhook_`)
4. ใน Apps Script → **Project Settings → Script Properties** เพิ่ม:
   | Property | Value |
   |---|---|
   | `LINE_TOKEN` | Channel access token |
   | `LINE_ADMIN_IDS` | userId ของผู้รับแจ้งเตือน คั่นด้วย comma |

---

## ส่วนที่ 3 — Deploy Apps Script เป็น Web App

1. Apps Script → **Deploy → New deployment → เลือกชนิด Web app**
2. ตั้งค่า: **Execute as = Me**, **Who has access = Anyone**
3. กด Deploy → คัดลอก **Web app URL** (ลงท้าย `/exec`)
4. (สำหรับ LINE webhook) เอา URL เดียวกันไปใส่ใน LINE Developers → Messaging API → **Webhook URL** แล้วกด Verify

---

## ส่วนที่ 4 — เชื่อม Frontend กับ Backend

แก้ไฟล์ `frontend/js/api.js`:
```js
const USE_MOCK = false;                                   // เดิม true
const GAS_URL  = "https://script.google.com/macros/s/XXXX/exec";  // URL จากส่วนที่ 3
```
> เราส่ง request แบบ `Content-Type: text/plain` โดยตั้งใจ เพื่อเลี่ยง CORS preflight ของ Apps Script

---

## ส่วนที่ 5 — Deploy Frontend ขึ้น Cloudflare Pages

เป็นเว็บ static ล้วน ไม่ต้อง build:

**วิธี A — ผ่าน Git**
1. push โฟลเดอร์นี้ขึ้น GitHub
2. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
3. ตั้งค่า: **Build command = (เว้นว่าง)** · **Build output directory = `frontend`**
4. Deploy → ได้ URL `https://xxx.pages.dev`

**วิธี B — อัปโหลดตรง (Wrangler)**
```bash
npm i -g wrangler
wrangler pages deploy frontend --project-name sitetrack
```

---

## รันทดสอบบนเครื่อง (ตอนนี้ยังเป็น mock)
```bash
cd frontend
node server.js          # เปิด http://localhost:8787
```
- `/` หน้าเลือกบทบาท · `/app.html` แอพผู้รับเหมา · `/dashboard.html` แดชบอร์ดผู้บริหาร

---

## เช็กลิสต์ไปโปรดักชัน
- [ ] เปลี่ยน `USE_MOCK = false` + ใส่ `GAS_URL`
- [ ] ใส่ `LINE_TOKEN`, `LINE_ADMIN_IDS` ใน Script Properties
- [ ] ตั้ง Webhook URL ใน LINE Developers + Verify
- [ ] จำกัดสิทธิ์: ถ้าต้องล็อกอิน ให้เพิ่ม LINE Login (ผูก `lineUserId` กับ role)
- [ ] สำรองข้อมูล: Google Sheets version history / export อัตโนมัติ
