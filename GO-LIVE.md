# 🚀 GO-LIVE — พา SiteTrack ขึ้นใช้งานจริง

เอกสารนี้แยกชัดว่า **อะไรพร้อมแล้ว** กับ **อะไรที่คุณต้องทำเอง** (เพราะต้องใช้บัญชี Google/LINE ของคุณ)
รายละเอียดเชิงเทคนิคเต็ม ๆ อยู่ใน [docs/SETUP.md](docs/SETUP.md)

---

## ✅ พร้อมแล้วจากฝั่งโค้ด
- Frontend ครบ 3 บทบาท (ผู้รับเหมา / PM / ผู้บริหาร) — static ล้วน ไม่ต้อง build
- Backend `backend/Code.gs` — API + LINE + `setupSheets()` สร้างชีตอัตโนมัติ
- Config deploy: `package.json`, `frontend/_headers`, `.clasp.json.example`, `.gitignore`
- ชั้น API สลับ mock ↔ ของจริงได้ที่จุดเดียว (`frontend/js/api.js`)

---

## 📋 5 ขั้นตอนที่คุณต้องทำเอง

### 1️⃣ Google Sheets (ฐานข้อมูล) — ~5 นาที
1. สร้าง Google Sheet ใหม่ → **Extensions → Apps Script**
2. วางโค้ดจาก `backend/Code.gs` → Run ฟังก์ชัน **`setupSheets`** (สร้าง 6 แท็บให้อัตโนมัติ)
3. กรอกข้อมูลตั้งต้นในแท็บ `Users` และ `Projects`

### 2️⃣ LINE Official Account — ~10 นาที
1. สร้าง OA ที่ https://manager.line.biz + เปิด Messaging API
2. คัดลอก **Channel access token** จาก https://developers.line.biz
3. เก็บ token ไว้ใช้ขั้นที่ 3

### 3️⃣ Deploy Apps Script — ~3 นาที
1. Apps Script → **Deploy → New deployment → Web app**
   (Execute as: **Me**, Access: **Anyone**)
2. คัดลอก **Web app URL** (`.../exec`)
3. ใส่ Script Properties: `LINE_TOKEN`, `LINE_ADMIN_IDS`
4. เอา URL ไปตั้งเป็น **Webhook URL** ใน LINE Developers → Verify

### 4️⃣ เชื่อม Frontend — ~1 นาที
แก้ `frontend/js/api.js` 2 บรรทัด:
```js
const USE_MOCK = false;
const GAS_URL  = "https://script.google.com/macros/s/XXXX/exec";
```

### 5️⃣ Deploy หน้าเว็บขึ้น Cloudflare Pages — ~5 นาที
```bash
npm install                 # ติดตั้ง wrangler
npx wrangler login          # ล็อกอิน Cloudflare (ทำเอง ครั้งเดียว)
npm run deploy:web          # ได้ URL https://sitetrack.pages.dev
```
หรือเชื่อม GitHub ผ่าน Cloudflare Dashboard (Build output = `frontend`)

---

## 🧰 ทางเลือก: จัดการ Apps Script ด้วย clasp (จากเครื่องนี้)
```bash
npm install
npx clasp login                              # ล็อกอิน Google (ทำเอง)
cp backend/.clasp.json.example backend/.clasp.json   # แล้วใส่ scriptId
npm run push:gas                             # อัปโค้ด Code.gs ขึ้น Apps Script
```

---

## ✔️ เช็กลิสต์
- [ ] 1. สร้าง Sheet + Run `setupSheets` + กรอก Users/Projects
- [ ] 2. สร้าง LINE OA + ได้ Channel access token
- [ ] 3. Deploy GAS web app + ตั้ง Script Properties + Webhook
- [ ] 4. ตั้ง `USE_MOCK=false` + `GAS_URL` ใน `api.js`
- [ ] 5. Deploy `frontend/` ขึ้น Cloudflare Pages
- [ ] ทดสอบ: แจ้งปัญหาจากมือถือ → เด้งเข้า LINE ของ PM

> 💡 ระหว่างนี้ยังใช้ prototype (`npm run dev` → http://localhost:8787) โชว์ลูกค้า/ทีมได้เลย
