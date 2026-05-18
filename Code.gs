// ============================================================
//  IMAD Students Data Collection — Apps Script Backend v2.2
//  Deploy as Web App: Execute as Me, Anyone can access
// ============================================================

const SHEET_ID      = "15VGrlmOvBjEYp3I8PxwQ954_Pp6S8d3sJUmgMBROLT4";
const BASE_TAB      = "base";
const CODES_TAB     = "codes";
const ADMIN_KEY     = "DIA_ADMIN_PASS";
const DRIVE_FOLDER  = "DIA_PHOTOS_FOLDER_ID";
const SUBMITTED_COL = "Submitted At";

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
function ok(data)  { return json({ ok: true,  data }); }
function err(msg)  { return json({ ok: false, error: msg }); }
function doGet(e) {
  if (e.parameter.payload) {
    let body = {};
    try { body = JSON.parse(e.parameter.payload); } catch(_) {}
    return route(body.action, e.parameter, body);
  }
  return route(e.parameter.action, e.parameter, {});
}
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
      case "markSubmitted":     return ok(markSubmitted(body.adNo));
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

function getSheet() { return SpreadsheetApp.openById(SHEET_ID).getSheetByName(BASE_TAB); }
function getCodesSheet() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(CODES_TAB);
  if (!sh) {
    // case-insensitive fallback (sheet might be named "Codes" or "CODES")
    const all = ss.getSheets();
    sh = all.find(s => s.getName().toLowerCase() === CODES_TAB.toLowerCase()) || null;
  }
  if (!sh) {
    sh = ss.insertSheet(CODES_TAB);
    sh.getRange(1, 1, 1, 2).setValues([['BatchNo', 'Code']]);
  }
  return sh;
}

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

// Returns the column index of the "Submitted At" column, or -1 if not found
function getSubmittedColIndex(headers) {
  return headers.findIndex(h => {
    const l = h.toLowerCase().replace(/\s/g, '');
    return l === 'submittedat' || l === 'submitted';
  });
}

// Determines whether a row counts as submitted.
// Only counts rows that have an explicit "Submitted At" timestamp.
function isSubmitted(row, headers) {
  const subCol = getSubmittedColIndex(headers);
  if (subCol < 0) return false;
  return !!String(row[subCol] || '').trim();
}

function getStudent(adNo) {
  if (!adNo) throw new Error("adNo required");
  const { headers, rows } = getAllData();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === String(adNo).trim()) {
      const student = rowToObj(headers, rows[i]);
      student._photoUrl  = getPhotoUrl(adNo);
      student._submitted = isSubmitted(rows[i], headers);
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

// Marks a student as submitted. Creates the "Submitted At" column if it doesn't exist.
function markSubmitted(adNo) {
  if (!adNo) throw new Error("adNo required");
  const sh = getSheet();
  const raw = sh.getDataRange().getValues();
  const headers = raw[0].map(h => String(h).trim());

  let subCol = getSubmittedColIndex(headers);
  if (subCol === -1) {
    subCol = headers.length;
    sh.getRange(1, subCol + 1).setValue(SUBMITTED_COL);
  }

  for (let i = 1; i < raw.length; i++) {
    if (String(raw[i][0]).trim() === String(adNo).trim()) {
      sh.getRange(i + 1, subCol + 1).setValue(new Date().toISOString());
      return { marked: true };
    }
  }
  throw new Error("Student not found: " + adNo);
}

function getBatchSummaries() {
  const { headers, rows } = getAllData();
  const batchCol = getColIndex(headers, "batch");
  const map = {};
  rows.forEach(row => {
    const batch = String(row[batchCol] || "").trim();
    if (!batch) return;
    if (!map[batch]) map[batch] = { batch, total: 0, submitted: 0 };
    map[batch].total++;
    if (isSubmitted(row, headers)) map[batch].submitted++;
  });
  return Object.values(map).sort((a, b) => {
    const n = s => parseInt(s.replace(/\D/g,""))||0;
    return n(a.batch) - n(b.batch);
  });
}

function validateBatch(batch, code) {
  const csh = getCodesSheet();
  if (!csh) throw new Error("'codes' sheet not found");
  const data = csh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowBatch = String(data[i][0]).trim();
    const rowCode  = String(data[i][1]).trim().toLowerCase();
    if (rowBatch === String(batch).trim() && rowCode === String(code).trim().toLowerCase()) return true;
  }
  return false;
}

function testBatch(batch, code) {
  const result = validateBatch(batch, code);
  Logger.log("validateBatch(%s, %s) => %s", batch, code, result);
  return result;
}

function getBatchStudents(batch, code) {
  if (!validateBatch(batch, code)) throw new Error("Invalid batch code");
  const { headers, rows } = getAllData();
  const batchCol = getColIndex(headers, "batch");
  const students = [];
  rows.forEach((row, i) => {
    if (String(row[batchCol] || "").trim() === String(batch).trim()) {
      const obj = rowToObj(headers, row);
      obj._rowIndex  = i + 2;
      obj._submitted = isSubmitted(row, headers);
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
  const batchMap = {};
  rows.forEach(row => {
    const batch = String(row[batchCol] || "").trim();
    if (!batch) return;
    if (!batchMap[batch]) batchMap[batch] = { batch, total: 0, submitted: 0, adNos: [] };
    batchMap[batch].total++;
    const adNo = parseInt(row[0]);
    if (adNo) batchMap[batch].adNos.push(adNo);
    if (isSubmitted(row, headers)) batchMap[batch].submitted++;
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
  const totalStudents  = rows.length;
  const totalSubmitted = rows.filter(r => isSubmitted(r, headers)).length;
  return {
    batches: Object.values(batchMap).sort((a,b) => (parseInt(a.batch)||0)-(parseInt(b.batch)||0)),
    fieldRates,
    totalStudents,
    totalSubmitted,
    headers,
  };
}

function getAllStudents(password) {
  if (!validateAdmin(password)) throw new Error("Unauthorized");
  const { headers, rows } = getAllData();
  const students = rows.map((row, i) => {
    const obj = rowToObj(headers, row);
    obj._rowIndex  = i + 2;
    obj._submitted = isSubmitted(row, headers);
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
  const FOLDER_NAME = "IMAD Student Photos";
  const props = PropertiesService.getScriptProperties();

  // 1. Try stored ID first (works for both owned and shared-with-me folders)
  const storedId = props.getProperty(DRIVE_FOLDER);
  if (storedId) {
    try { return DriveApp.getFolderById(storedId); } catch(_) {}
  }

  // 2. Search by name in My Drive and shared-with-me
  try {
    const iter = DriveApp.getFoldersByName(FOLDER_NAME);
    if (iter.hasNext()) {
      const found = iter.next();
      props.setProperty(DRIVE_FOLDER, found.getId());
      return found;
    }
  } catch(_) {}

  // 3. Create a fresh folder in My Drive
  const fresh = DriveApp.createFolder(FOLDER_NAME);
  props.setProperty(DRIVE_FOLDER, fresh.getId());
  return fresh;
}

function getPhotoUrl(adNo) {
  try {
    const folder = getOrCreateFolder();
    const files = folder.getFilesByName("photo_" + String(adNo).trim());
    if (files.hasNext()) {
      const f = files.next();
      try { f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch(_) {}
      return "https://drive.google.com/uc?export=view&id=" + f.getId();
    }
    return null;
  } catch(_) { return null; }
}

function uploadPhoto(adNo, imageData, mimeType) {
  if (!adNo || !imageData) throw new Error("adNo and imageData required");
  let folder;
  try { folder = getOrCreateFolder(); }
  catch(e) { throw new Error("Cannot access photo folder: " + e.message); }
  const old = folder.getFilesByName("photo_" + String(adNo).trim());
  while (old.hasNext()) {
    try { old.next().setTrashed(true); } catch(_) { /* skip files we can't trash (owned by other account) */ }
  }
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
