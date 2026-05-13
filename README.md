# DIA Students Data Collection — v2.1

Modern mobile-first form system for Darul Irshad Academy.

---

## Stack
- **Frontend**: React + Vite → deployed on Vercel
- **Backend**: Google Apps Script Web App (JSON API)
- **Database**: Google Sheets ("base" tab)
- **Photos**: Google Drive folder (auto-created)

---

## Quick start

```bash
npm install
cp .env.example .env
# Paste your Apps Script Web App URL into .env
npm run dev
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo on vercel.com
3. Add environment variable: `VITE_APPS_SCRIPT_URL` = your Apps Script URL
4. Deploy

---

## Apps Script setup

### 1. Replace Code.gs
Paste the contents of `Code.gs` into your Apps Script project.

### 2. Set admin password
- Apps Script → Project Settings → Script Properties
- Add: `DIA_ADMIN_PASS` = `your-password`

### 3. Create "codes" sheet
In your Google Spreadsheet, add a sheet named **codes** with:

| BatchNo | Code      |
|---------|-----------|
| 1       | batch1key |
| 2       | batch2key |
| …       | …         |

### 4. Deploy as Web App
- Execute as: **Me**
- Who has access: **Anyone**
- Copy the Web App URL → paste into `.env`

### 5. Photo storage (auto)
On first photo upload, Apps Script will auto-create a "DIA Student Photos" folder in your Drive. The folder ID is stored in Script Properties automatically.

---

## Column names expected in "base" sheet

| Column | Notes |
|--------|-------|
| Ad No | First column — student identifier |
| Name | Pre-filled, read-only |
| Ad. Year | Pre-filled, read-only |
| Batch | Pre-filled, read-only |
| Phone Number | **Defines "submitted" status** |
| Email | |
| Address | |
| Post Office | |
| DH Status | |
| Last Attended Class | Shown when DH Status = "Not completed UG" |
| Educational Qualification | |
| Current Status | Self-employed / Employed / Higher Studies |
| Business Name, Nature of Business, Year Started, Business Location | |
| Designation, Custom Designation, Organisation Name, Work Location | |
| Course, University, Year of Completion | |
| Photo URL | Auto-filled on photo upload |

Column name matching is case-insensitive and uses partial matching.

---

## Access levels

| Role | Access method |
|------|--------------|
| Students | Public — enter admission number on home page |
| Batch coordinators | "Batch" button → select batch → enter code |
| Admin | "Admin" button → enter master password |

---

## Features

### Public home
- Pie chart + batch grid showing real-time completion
- Admission number lookup

### Student form
- Pre-filled read-only fields (Ad No, Name, Year, Batch)
- Photo upload (≤1 MB, auto-compresses, stores in Drive)
- Auto-save on blur for every field
- "Save all" footer button
- Conditional: Last attended class (only when DH Status = Not completed UG)
- Conditional employment panels (Self-employed / Employed / Higher Studies)

### Batch view
- All students in batch, colour-coded green/red
- Pending admission numbers listed at top
- Search + filter
- Click any student → opens their full form

### Admin dashboard
- **Overview tab**: sortable batch table, missing ad numbers, CSV export
- **Analytics tab**: sequence gap detection, per-field fill rates
- **Complete Data tab**: full searchable/filterable table, inline edit popup, CSV export

---

## Customisation

| What | Where |
|------|-------|
| Colour scheme | `src/index.css` `:root` CSS variables |
| Number of batches | `Topbar.jsx` — change `length:18` |
| Completion metric | `Code.gs` `getBatchSummaries()` — currently phone≠empty |
| Read-only fields | `StudentForm.jsx` `READONLY` array |
