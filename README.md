# SiteTrack — ระบบติดตามงานผู้รับเหมา

แอพติดตามงานผู้รับเหมา ให้คนหน้างานอัพเดทความคืบหน้าและแจ้งปัญหาผ่านมือถือ
ผู้บริหารดูภาพรวมทุกโครงการบนแดชบอร์ด และแจ้งเตือนเหตุการณ์สำคัญเข้า **LINE** อัตโนมัติ

> **สถานะ: Prototype** — หน้าเว็บใช้งานได้จริงด้วยข้อมูลจำลอง (mock) ยังไม่ต่อฐานข้อมูลจริง
> โครง backend + คู่มือต่อของจริงพร้อมแล้วใน `backend/` และ `docs/SETUP.md`

## Tech stack (no-build, ต้นทุนต่ำ)
| ชั้น | เทคโนโลยี |
|---|---|
| หน้าเว็บ | HTML/CSS/JS ล้วน (responsive, light/dark) → **Cloudflare Pages** |
| API + แจ้งเตือน | **Google Apps Script** Web App |
| ฐานข้อมูล | **Google Sheets** (6 ตาราง) |
| แจ้งเตือน | **LINE Messaging API** (Flex Message + LINE Login) |

## โครงสร้างไฟล์
```
Track project progress/
├─ frontend/                 ← เว็บ (deploy ขึ้น Cloudflare Pages)
│  ├─ index.html             หน้าเลือกบทบาท
│  ├─ app.html               แอพผู้รับเหมา (มือถือ, SPA)
│  ├─ pm.html                มุมมองผู้จัดการโครงการ (มอบหมาย/อนุมัติ/ตอบปัญหา)
│  ├─ dashboard.html         แดชบอร์ดผู้บริหาร (จอคอม)
│  ├─ project.html           หน้ารายละเอียดโครงการ (drill-down)
│  ├─ css/styles.css         design system (light/dark, responsive)
│  ├─ js/
│  │  ├─ mock-data.js        ข้อมูลจำลอง (สคีมาตรงกับ Google Sheets)
│  │  ├─ api.js              ชั้น API — สลับ mock ↔ Google Apps Script ที่นี่
│  │  ├─ ui.js               theme toggle + toast
│  │  ├─ app.js              ตรรกะแอพมือถือ (list → update → report)
│  │  ├─ pm.js               ตรรกะผู้จัดการโครงการ
│  │  ├─ dashboard.js        ตรรกะแดชบอร์ด
│  │  └─ project.js          ตรรกะหน้ารายละเอียดโครงการ
│  └─ server.js              dev server เล็ก ๆ สำหรับรันบนเครื่อง
├─ backend/
│  ├─ Code.gs                Google Apps Script (API + LINE + setupSheets)
│  └─ appsscript.json        ตั้งค่า deploy web app
├─ docs/SETUP.md             คู่มือติดตั้งครบทุกขั้นตอน
└─ README.md
```

## รันบนเครื่อง (prototype)
```bash
cd frontend
node server.js      # http://localhost:8787
```
เปิดในเบราว์เซอร์แล้วเลือกบทบาท — ปรับขนาดจอเป็นมือถือได้ (responsive)

## ฟีเจอร์ที่ทำงานแล้วใน prototype
**ผู้รับเหมา (มือถือ)**
- ✅ ดูรายการงาน (สี/สถานะตามความคืบหน้า)
- ✅ อัพเดท % ความคืบหน้า + แนบรูป + บันทึก
- ✅ แจ้งปัญหา (ระดับความรุนแรง/ประเภท/รายละเอียด/รูป) → งานเปลี่ยนเป็น "มีปัญหา"

**ผู้จัดการโครงการ**
- ✅ อนุมัติงาน / ตีกลับให้แก้
- ✅ ตอบกลับและปิดเรื่องปัญหา
- ✅ มอบหมายงานใหม่ให้ผู้รับเหมา
- ✅ ตารางงานทั้งหมด + รายชื่อผู้รับเหมา

**ผู้บริหาร**
- ✅ แดชบอร์ด: KPI, ความคืบหน้ารายโครงการ, กราฟรายสัปดาห์, ปัญหาล่าสุด, กิจกรรมสด
- ✅ คลิกโครงการเพื่อดูรายละเอียด (งาน + ปัญหาในโครงการ)

**ทั่วไป**
- ✅ รองรับจอคอมและมือถือ + โหมดสว่าง/มืด
- ⏳ (ต่อของจริง) บันทึกลง Google Sheets + ยิงแจ้งเตือน LINE — ดู `docs/SETUP.md`

## ต่อเป็นระบบจริง
ทำตาม **[docs/SETUP.md](docs/SETUP.md)** — สร้างชีต, ตั้งค่า LINE, deploy Apps Script,
ตั้ง `USE_MOCK = false` + `GAS_URL` ใน `frontend/js/api.js`, แล้ว deploy `frontend/` ขึ้น Cloudflare Pages
