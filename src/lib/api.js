const BASE = import.meta.env.VITE_APPS_SCRIPT_URL ||
  "https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec";

async function get(action, params = {}) {
  const url = new URL(BASE);
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error("Network error: " + res.status);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json.data;
}

async function post(body) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Network error: " + res.status);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json.data;
}

export const api = {
  getStudent:        (adNo)              => get("getStudent", { adNo }),
  updateField:       (adNo, field, value)=> post({ action:"updateField", adNo, field, value }),
  updateRow:         (adNo, values)      => post({ action:"updateRow", adNo, values }),
  getBatchSummaries: ()                  => get("getBatchSummaries"),
  validateBatch:     (batch, code)       => post({ action:"validateBatch", batch, code }),
  getBatchStudents:  (batch, code)       => post({ action:"getBatchStudents", batch, code }),
  validateAdmin:     (password)          => post({ action:"validateAdmin", password }),
  getAdminStats:     (password)          => post({ action:"getAdminStats", password }),
  getAllStudents:     (password)          => post({ action:"getAllStudents", password }),
  uploadPhoto:       (adNo, imageData, mimeType) => post({ action:"uploadPhoto", adNo, imageData, mimeType }),
  exportCSV:         (password)          => post({ action:"exportCSV", password }),
};
