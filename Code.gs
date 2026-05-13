// ============================================================
//  DIA Students Data Collection — Apps Script Backend v2.1
//  Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

const SHEET_ID      = "15VGrlmOvBjEYp3I8PxwQ954_Pp6S8d3sJUmgMBROLT4";
const BASE_TAB      = "base";
const CODES_TAB     = "codes";
const ADMIN_KEY     = "DIA_ADMIN_PASS";
const DRIVE_FOLDER  = "DIA_PHOTOS_FOLDER_ID";

function cors(output) {
  return output
    .setMimeType(ContentService.MimeType.JSON)
    .addHeader("Access-Control-Allow-Origin", "*")
    .addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    .addHeader("Access-Control-Allow-Headers", "Content-Type");
}
function ok(data)  { return cors(ContentService.createTextOutput(JSON.stringify({ ok: true,  data }))); }
function err(msg)  { return cors(ContentService.createTextOutput(JSON.stringify({ ok: false, error: msg }))); }

function doOptions() {
  return ContentService.createTextOutput("")
    .addHeader("Access-Control-Allow-Origin", "*")
    .addHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    .addHeader("Access-Control-Allow-Headers", "Content-Type");
}
function doGet(e)  { return route(e.parameter.action, e.parameter, {}); }
function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch(_) {}
  return route(body.action, {}, body);
}

function route(action, qp, body) {
  try {
    switch (action) {
      case "getStudent":        return ok(getStudent(qp.adNo || body.adNo));
      case "updateField":       return ok(updateField(body.adNo, body.field, body.value));
      case "updateRow":         return ok(updateRow(body.adNo, body.values));
      case "getBatchSummaries": return ok(getBatchSummaries());
      case "validateBatch":     return ok(validateBatch(body.batch, body.code));
      case "getBatchStudents":  return ok(getBatchStudents(body.batch, body.code));
      case "validateAdmin":     return ok(validateAdmin(body.password));
      case "getAdminStats":     return ok(getAdminStats(body.password));
      case "getAllStudents":     return ok(getAllStudents(body.password));
      case "uploadPhoto":       return ok(uploadPhoto(body.adNo, body.imageData, body.mimeType));
      case "getPhotoUrl":       return ok(getPhotoUrl(qp.adNo || body.adNo));
      case "exportCSV":         return ok(exportCSV(body.password));
      default:                  return err("Unknown action: " + action);
    }
  } catch(e) { console.error(e); return err(e.message); }
}

function getSheet()      { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(BASE_TAB); }
function getCodesSheet() { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(CODES_TAB); }

function getAllData() {
  const sh = getSheet();
  const raw = sh.getDataRange().getValues();
  const headers = raw[0].map(h => String(h).trim());
  return { headers, rows: raw.slice(1), sheet: sh };
}

function rowToObj(headers, row) {
  const obj = {};
  headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? String(row[i]) : ""; });
  return obj;
}

function getColIndex(headers, name) {
  const lower = name.toLowerCase();
  return headers.findIndex(h => h.toLowerCase() === lower || h.toLowerCase().includes(lower));
}

function getStudent(adNo) {
  if (!adNo) throw new Error("adNo required");
  const { headers, rows } = getAllData();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(adNo).trim()) {
      const student = rowToObj(headers, rows[i]);
      student._photoUrl = getPhotoUrl(adNo);
      return { rowIndex: i + 2, student, headers };
    }
  }
  return null;
}

function updateField(adNo, field, value) {
  const { headers, rows, sheet } = getAllData();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(adNo).trim()) {
      let col = headers.indexOf(field);
      if (col === -1) col = getColIndex(headers, field);
      if (col === -1) throw new Error("Field not found: " + field);
      sheet.getRange(i + 2, col + 1).setValue(value);
      return { updated: field };
    }
  }
  throw new Error("Student not found: " + adNo);
}

function updateRow(adNo, values) {
  const { headers, rows, sheet } = getAllData();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(adNo).trim()) {
      let count = 0;
      Object.entries(values).forEach(([field, value]) => {
        let col = headers.indexOf(field);
        if (col === -1) col = getColIndex(headers, field);
        if (col >= 0) { sheet.getRange(i + 2, col + 1).setValue(value); count++; }
      });
      return { updated: count };
    }
  }
  throw new Error("Student not found: " + adNo);
}

function getBatchSummaries() {
  const { headers, rows } = getAllData();
  const batchCol = getColIndex(headers, "batch");
  const phoneCol = getColIndex(headers, "phone");
  const map = {};
  rows.forEach(row => {
    const batch = String(row[batchCol] || "").trim();
    if (!batch) return;
    if (!map[batch]) map[batch] = { batch, total: 0, submitted: 0 };
    map[batch].total++;
    if (String(row[phoneCol] || "").trim()) map[batch].submitted++;
  });
  return Object.values(map).sort((a, b) => {
    const n = s => parseInt(s.replace(/\D/g,""))||0;
    return n(a.batch) - n(b.batch);
  });
}

function validateBatch(batch, code) {
  const csh = getCodesSheet();
  if (!csh) throw new Error("'codes' sheet not found. Create it with columns: BatchNo, Code");
  const data = csh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(batch).trim() &&
        String(data[i][1]).trim() === String(code).trim()) return true;
  }
  return false;
}

function getBatchStudents(batch, code) {
  if (!validateBatch(batch, code)) throw new Error("Invalid batch code");
  const { headers, rows } = getAllData();
  const batchCol = getColIndex(headers, "batch");
  const phoneCol = getColIndex(headers, "phone");
  const students = [];
  rows.forEach((row, i) => {
    if (String(row[batchCol] || "").trim() === String(batch).trim()) {
      const obj = rowToObj(headers, row);
      obj._rowIndex  = i + 2;
      obj._submitted = !!String(row[phoneCol] || "").trim();
      obj._photoUrl  = getPhotoUrl(row[0]);
      students.push(obj);
    }
  });
  return { headers, students };
}

function validateAdmin(password) {
  const stored = PropertiesService.getScriptProperties().getProperty(ADMIN_KEY);
  if (!stored) throw new Error("Admin password not set. Add DIA_ADMIN_PASS in Script Properties.");
  return password === stored;
}

function getAdminStats(password) {
  if (!validateAdmin(password)) throw new Error("Unauthorized");
  const { headers, rows } = getAllData();
  const batchCol = getColIndex(headers, "batch");
  const phoneCol = getColIndex(headers, "phone");
  const batchMap = {};
  rows.forEach(row => {
    const batch = String(row[batchCol] || "").trim();
    if (!batch) return;
    if (!batchMap[batch]) batchMap[batch] = { batch, total: 0, submitted: 0, adNos: [] };
    batchMap[batch].total++;
    const adNo = parseInt(row[0]);
    if (adNo) batchMap[batch].adNos.push(adNo);
    if (String(row[phoneCol] || "").trim()) batchMap[batch].submitted++;
  });
  Object.values(batchMap).forEach(b => {
    const sorted = b.adNos.sort((a,z) => a-z);
    const missing = [];
    for (let i = 0; i < sorted.length - 1; i++)
      for (let n = sorted[i]+1; n < sorted[i+1]; n++) missing.push(n);
    b.missingAdNos = missing;
    delete b.adNos;
  });
  const fieldRates = {};
  headers.slice(4).forEach(h => {
    if (!h) return;
    const col = headers.indexOf(h);
    const filled = rows.filter(r => String(r[col] || "").trim()).length;
    fieldRates[h] = { filled, total: rows.length, pct: rows.length ? Math.round(filled / rows.length * 100) : 0 };
  });
  return {
    batches: Object.values(batchMap).sort((a,b) => (parseInt(a.batch)||0)-(parseInt(b.batch)||0)),
    fieldRates,
    totalStudents:  rows.length,
    totalSubmitted: rows.filter(r => String(r[phoneCol]||"").trim()).length,
    headers,
  };
}

function getAllStudents(password) {
  if (!validateAdmin(password)) throw new Error("Unauthorized");
  const { headers, rows } = getAllData();
  const phoneCol = getColIndex(headers, "phone");
  const students = rows.map((row, i) => {
    const obj = rowToObj(headers, row);
    obj._rowIndex  = i + 2;
    obj._submitted = !!String(row[phoneCol] || "").trim();
    return obj;
  });
  return { headers, students };
}

function exportCSV(password) {
  if (!validateAdmin(password)) throw new Error("Unauthorized");
  const { headers, rows } = getAllData();
  const escape = c => { const s = String(c || ""); return (s.includes(",") || s.includes('"')) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [headers.join(","), ...rows.map(r => r.map(escape).join(","))].join("\n");
}

function getOrCreateFolder() {
  const folderId = PropertiesService.getScriptProperties().getProperty(DRIVE_FOLDER);
  if (folderId) { try { return DriveApp.getFolderById(folderId); } catch(_) {} }
  const folder = DriveApp.createFolder("DIA Student Photos");
  PropertiesService.getScriptProperties().setProperty(DRIVE_FOLDER, folder.getId());
  return folder;
}

function getPhotoUrl(adNo) {
  try {
    const folderId = PropertiesService.getScriptProperties().getProperty(DRIVE_FOLDER);
    if (!folderId) return null;
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFilesByName("photo_" + String(adNo).trim());
    if (files.hasNext()) {
      const f = files.next();
      f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return "https://drive.google.com/uc?export=view&id=" + f.getId();
    }
    return null;
  } catch(_) { return null; }
}

function uploadPhoto(adNo, imageData, mimeType) {
  if (!adNo || !imageData) throw new Error("adNo and imageData required");
  const folder = getOrCreateFolder();
  const old = folder.getFilesByName("photo_" + String(adNo).trim());
  while (old.hasNext()) old.next().setTrashed(true);
  const blob = Utilities.newBlob(Utilities.base64Decode(imageData), mimeType || "image/jpeg", "photo_" + String(adNo).trim());
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const url = "https://drive.google.com/uc?export=view&id=" + file.getId();
  try {
    const { headers, rows, sheet } = getAllData();
    const photoCol = headers.findIndex(h => h.toLowerCase().includes("photo"));
    if (photoCol >= 0) {
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).trim() === String(adNo).trim()) {
          sheet.getRange(i + 2, photoCol + 1).setValue(url); break;
        }
      }
    }
  } catch(_) {}
  return { url };
}
