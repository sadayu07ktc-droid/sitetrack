# ⚙️ Auto-Deploy — push แล้ว deploy เอง

โปรเจกต์นี้มี **GitHub Actions** ให้ deploy อัตโนมัติ ตั้งค่า secret ครั้งเดียว จบ

| Workflow | ทำงานเมื่อ | Deploy อะไร |
|---|---|---|
| `deploy-web.yml` | **อัตโนมัติ** ทุก push ที่แก้ `frontend/` | หน้าเว็บ → Cloudflare Pages |
| `deploy-gas.yml` | กดรันเองจากแท็บ Actions | backend → Google Apps Script |

---

## 🟢 ทางที่ง่ายที่สุด (แนะนำ) — Cloudflare เชื่อม Git ตรง ๆ
ไม่ต้องใช้ Actions/secret เลย คลิกครั้งเดียวในเว็บ Cloudflare แล้วมัน auto-deploy ทุก push ให้เอง:
1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**
2. เลือก repo **`sitetrack`**
3. Build command = *(เว้นว่าง)* · **Build output directory = `frontend`**
4. Save and Deploy → ได้ URL `https://sitetrack.pages.dev`

> ✅ ถ้าเลือกทางนี้ **ลบไฟล์ `.github/workflows/deploy-web.yml` ทิ้งได้เลย** (ไม่งั้นมันจะ deploy ซ้ำ 2 ทาง)

---

## 🔵 ทาง GitHub Actions (ถ้าอยากคุมทุกอย่างในโค้ด)

### ตั้งค่า secret ของเว็บ (ครั้งเดียว)
ที่ repo → **Settings → Secrets and variables → Actions → New repository secret** เพิ่ม 2 ตัว:

| Secret | เอามาจากไหน |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → **API Tokens → Create Token** → เทมเพลต **"Edit Cloudflare Workers"** (หรือสิทธิ์ `Account · Cloudflare Pages · Edit`) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → หน้า Workers & Pages → คอลัมน์ขวา **Account ID** |

> ⚠️ สร้าง Pages project ชื่อ `sitetrack` ให้มีอยู่ก่อน 1 ครั้ง (ทาง Dashboard หรือรัน `npm run deploy:web` จากเครื่องครั้งแรก) แล้ว Actions จะ deploy ทับ project เดิมทุกครั้ง

เสร็จแล้ว — **push โค้ดที่แก้ `frontend/` ขึ้น main → Actions deploy ให้เองอัตโนมัติ** ดูสถานะที่แท็บ **Actions**

### ตั้งค่า secret ของ backend (ถ้าจะ auto-deploy GAS ด้วย)
บนเครื่องคุณ:
```bash
npm install
npx clasp login          # ล็อกอิน Google (จะสร้างไฟล์ ~/.clasprc.json)
```
แล้วเอาเนื้อหาไฟล์ไปใส่เป็น secret:

| Secret | เนื้อหา |
|---|---|
| `CLASPRC_JSON` | เนื้อหาทั้งไฟล์ `~/.clasprc.json` (มี access/refresh token) |
| `CLASP_JSON` | `{ "scriptId": "<Apps Script ID>", "rootDir": "." }` |

จากนั้นไปแท็บ **Actions → Deploy Backend (Apps Script) → Run workflow** เมื่อต้องการอัปโค้ด GAS

---

## สรุปการใช้งานประจำวัน
```bash
git add -A
git commit -m "แก้ไข ..."
git push            # ← เว็บ deploy เองอัตโนมัติ
```
backend แก้เมื่อไร ค่อยกด Run workflow "Deploy Backend" เอง
