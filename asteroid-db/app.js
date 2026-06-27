const API_SETTING_KEY = "se-asteroid-db.api-root.v1";
const EDITOR_KEY_STORAGE = "se-asteroid-db.editor-key.v1";
const LEGACY_STORAGE_KEY = "se-asteroid-db.records.v1";
const DUPLICATE_DISTANCE_METERS = 200;
const API_ROOT = getApiRoot();
const CANONICAL_MATERIALS = ["Fe", "Ni", "Si", "Co", "Mg", "Ag", "Au", "Pt", "U", "O2", "Stone"];
const MATERIAL_ALIASES = {
  ag: "Ag",
  silver: "Ag",
  au: "Au",
  gold: "Au",
  co: "Co",
  cobalt: "Co",
  fe: "Fe",
  iron: "Fe",
  ice: "O2",
  water: "O2",
  mg: "Mg",
  magnesium: "Mg",
  ni: "Ni",
  nickel: "Ni",
  o2: "O2",
  oxygen: "O2",
  pt: "Pt",
  platinum: "Pt",
  si: "Si",
  silicon: "Si",
  stone: "Stone",
  u: "U",
  uranium: "U",
};

const state = {
  records: [],
  parsed: [],
  serverMode: Boolean(API_ROOT),
  activeTab: "database",
  materialMappings: {},
};

const els = {
  storageMode: document.querySelector("#storageMode"),
  editorKeyButton: document.querySelector("#editorKeyButton"),
  tabButtons: document.querySelectorAll(".tab-button"),
  importTab: document.querySelector("#importTab"),
  databasePanels: document.querySelectorAll('[data-view="database"]'),
  surveyPaste: document.querySelector("#surveyPaste"),
  parseButton: document.querySelector("#parseButton"),
  saveButton: document.querySelector("#saveButton"),
  importStatus: document.querySelector("#importStatus"),
  preview: document.querySelector("#preview"),
  materialReview: document.querySelector("#materialReview"),
  totalCount: document.querySelector("#totalCount"),
  sizeCount: document.querySelector("#sizeCount"),
  oreCount: document.querySelector("#oreCount"),
  searchInput: document.querySelector("#searchInput"),
  sizeFilter: document.querySelector("#sizeFilter"),
  materialFilter: document.querySelector("#materialFilter"),
  minRocksFilter: document.querySelector("#minRocksFilter"),
  baseGpsInput: document.querySelector("#baseGpsInput"),
  maxDistanceFilter: document.querySelector("#maxDistanceFilter"),
  sortSelect: document.querySelector("#sortSelect"),
  resetFiltersButton: document.querySelector("#resetFiltersButton"),
  clearAllButton: document.querySelector("#clearAllButton"),
  exportJsonButton: document.querySelector("#exportJsonButton"),
  importJsonInput: document.querySelector("#importJsonInput"),
  resultCount: document.querySelector("#resultCount"),
  results: document.querySelector("#results"),
  template: document.querySelector("#recordTemplate"),
};

function getApiRoot() {
  const params = new URLSearchParams(location.search);

  if (params.has("local")) {
    localStorage.removeItem(API_SETTING_KEY);
    return "";
  }

  const apiParam = params.get("api");
  if (apiParam) {
    const apiRoot = normalizeApiRoot(apiParam);
    localStorage.setItem(API_SETTING_KEY, apiRoot);
    return apiRoot;
  }

  const savedApiRoot = localStorage.getItem(API_SETTING_KEY);
  if (savedApiRoot) return savedApiRoot;

  return shouldTrySameOriginApi() ? "/api" : "";
}

function shouldTrySameOriginApi() {
  if (!location.protocol.startsWith("http")) return false;
  if (location.hostname.endsWith("github.io")) return false;
  return true;
}

function normalizeApiRoot(value) {
  return value.replace(/\/+$/, "");
}

const sizeRank = {
  Massive: 1,
  Huge: 2,
  Large: 3,
  Medium: 4,
  Small: 5,
  Unknown: 6,
};

async function init() {
  await loadRecords();
  await migrateLegacyLocalRecords();
  render();
}

async function loadRecords() {
  if (!state.serverMode) {
    state.records = loadLocalRecords();
    setStorageMode("Local browser", "Saved only in this browser on this device.");
    return;
  }

  try {
    const response = await fetch(`${API_ROOT}/records`);
    if (!response.ok) throw new Error(`Server returned ${response.status}`);
    const payload = await response.json();
    state.records = normalizeRecords(payload.records || []);
    setStorageMode("Shared server", API_ROOT === "/api" ? "Saved on this web server." : `Saved through ${API_ROOT}.`);
  } catch (error) {
    state.serverMode = false;
    state.records = loadLocalRecords();
    setStorageMode("Local browser", "Server unavailable, using this browser only.");
    els.importStatus.textContent = `Using local browser storage: ${error.message}`;
  }
}

function setStorageMode(label, title) {
  els.storageMode.textContent = `Storage: ${label}`;
  els.storageMode.title = title;
}

function getEditorKey() {
  return localStorage.getItem(EDITOR_KEY_STORAGE) || "";
}

function setEditorKey() {
  const current = getEditorKey();
  const next = window.prompt("Editor key for notes, ore edits, and deletes:", current);
  if (next === null) return;

  const value = next.trim();
  if (value) {
    localStorage.setItem(EDITOR_KEY_STORAGE, value);
    els.importStatus.textContent = "Editor key saved in this browser.";
  } else {
    localStorage.removeItem(EDITOR_KEY_STORAGE);
    els.importStatus.textContent = "Editor key cleared.";
  }
}

function getEditorHeaders() {
  const key = getEditorKey();
  return key ? { "X-Editor-Key": key } : {};
}

async function requireProtectedResponse(response, action) {
  if (response.status === 401) {
    setEditorKey();
    throw new Error(`${action} needs a valid editor key.`);
  }

  if (!response.ok) {
    throw new Error(`${action} failed with ${response.status}`);
  }
}

function loadLocalRecords() {
  try {
    return normalizeRecords(JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

async function saveRecordsLocally() {
  localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(state.records));
}

async function migrateLegacyLocalRecords() {
  if (!state.serverMode) return;
  const legacy = loadLocalRecords();
  if (!legacy.length) return;

  const result = await addRecords(legacy);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  if (result.added > 0) {
    els.importStatus.textContent = `Moved ${result.added} browser-only point${result.added === 1 ? "" : "s"} into the shared database.`;
  }
}

function normalizeMaterial(value) {
  if (!value) return "";
  const trimmed = value.trim();
  return MATERIAL_ALIASES[getMaterialKey(trimmed)] || trimmed;
}

function getMaterialKey(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/(ore|ingot|wafer|powder)$/i, "");
}

function isKnownMaterial(value) {
  return CANONICAL_MATERIALS.includes(normalizeMaterial(value));
}

function normalizeRecords(records) {
  return records.map((record) => {
    const materials = (record.materials || []).map(normalizeMaterial).filter(Boolean);
    return {
      ...record,
      id: record.id || createId(),
      x: Number(record.x),
      y: Number(record.y),
      z: Number(record.z),
      size: record.size || "Unknown",
      rockCount: Number(record.rockCount || 1),
      materials,
      notes: record.notes || "",
      fingerprint:
        record.fingerprint ||
        `${record.gpsName}|${record.x}|${record.y}|${record.z}|${materials.join(",")}`,
      importedAt: record.importedAt || new Date().toISOString(),
    };
  });
}

function parseSurveyLog(text) {
  const lines = text.split(/\r?\n/);
  const records = [];
  const gpsPattern = /^GPS:([^:]+):(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?):(-?\d+(?:\.\d+)?):([^:]*):?/;

  for (let index = 0; index < lines.length; index += 1) {
    const gpsMatch = lines[index].trim().match(gpsPattern);
    if (!gpsMatch) continue;

    const [, gpsName, x, y, z, color] = gpsMatch;
    const detailLine = findDetailLine(lines, index + 1);
    const detail = parseDetail(detailLine, gpsName);
    const gpsLine = `GPS:${gpsName}:${x}:${y}:${z}:${color}:`;
    const fingerprint = `${gpsName}|${x}|${y}|${z}|${detail.materials.join(",")}`;

    records.push({
      id: createId(),
      gpsName,
      gpsLine,
      x: Number(x),
      y: Number(y),
      z: Number(z),
      color,
      size: detail.size,
      nodeType: detail.nodeType,
      nodeNumber: detail.nodeNumber,
      rockCount: detail.rockCount,
      materials: detail.materials,
      rawDetail: detail.rawDetail,
      fingerprint,
      importedAt: new Date().toISOString(),
    });
  }

  return records;
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  const randomPart = Math.random().toString(36).slice(2, 10);
  const timePart = Date.now().toString(36);
  return `id-${timePart}-${randomPart}`;
}

function findDetailLine(lines, startIndex) {
  for (let i = startIndex; i < lines.length; i += 1) {
    const candidate = lines[i].trim();
    if (!candidate) continue;
    if (candidate.startsWith("GPS:")) return "";
    return candidate;
  }
  return "";
}

function parseDetail(detailLine, gpsName) {
  const [description = "", materialPart = ""] = detailLine.split("|").map((part) => part.trim());
  const materials = materialPart
    .split(",")
    .map(normalizeMaterial)
    .filter(Boolean);
  const sizeFromDetail = description.match(/\b(Massive|Huge|Large|Medium|Small|Unknown)\b/i);
  const sizeFromName = gpsName.match(/Survey_(Massive|Huge|Large|Medium|Small|Unknown)/i);
  const rockMatch = description.match(/\[(\d+)\s+rocks?\]/i) || gpsName.match(/_x(\d+)(?:_|$)/i);
  const nodeMatch = description.match(/\b(?:Asteroid|unknown)\s+(\d+)\b/i);
  const nodeType = description.match(/\bunknown\b/i) ? "unknown" : "Asteroid";

  return {
    size: titleCase(sizeFromDetail?.[1] || sizeFromName?.[1] || "Unknown"),
    nodeType,
    nodeNumber: nodeMatch ? Number(nodeMatch[1]) : null,
    rockCount: rockMatch ? Number(rockMatch[1]) : 1,
    materials,
    rawDetail: rebuildDetail(description, materials),
  };
}

function rebuildDetail(description, materials) {
  return [description, materials.join(", ")].filter(Boolean).join(" | ");
}

function titleCase(value) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function previewImport() {
  try {
    state.parsed = parseSurveyLog(els.surveyPaste.value);
    renderMaterialReview();
    const fresh = getFreshRecords(state.parsed);
    const newCount = fresh.length;
    const duplicateCount = state.parsed.length - newCount;
    const unresolvedCount = getUnknownMaterialTokens(state.parsed).filter((token) => !state.materialMappings[token]).length;

    els.saveButton.disabled = newCount === 0 || unresolvedCount > 0;
    els.preview.hidden = state.parsed.length === 0;

    if (state.parsed.length === 0) {
      els.importStatus.textContent = "No GPS lines found yet.";
      els.preview.innerHTML = "";
      els.materialReview.hidden = true;
      return;
    }

    const materials = unique(state.parsed.flatMap((record) => record.materials)).join(", ");
    els.importStatus.textContent = `${state.parsed.length} points parsed. ${newCount} new, ${duplicateCount} duplicate${unresolvedCount ? `, ${unresolvedCount} material label${unresolvedCount === 1 ? "" : "s"} need review` : ""}.`;
    els.preview.textContent = `Preview: ${unique(state.parsed.map((record) => record.size)).join(", ")} asteroids with ${materials || "no listed materials"}.`;
  } catch (error) {
    state.parsed = [];
    els.saveButton.disabled = true;
    els.preview.hidden = true;
    els.materialReview.hidden = true;
    els.importStatus.textContent = `Preview failed: ${error.message}`;
  }
}

async function saveParsed() {
  const unresolved = getUnknownMaterialTokens(state.parsed).filter((token) => !state.materialMappings[token]);
  if (unresolved.length) {
    els.importStatus.textContent = "Review unknown material labels before saving.";
    return;
  }

  const result = await addRecords(applyMaterialMappings(state.parsed));
  els.importStatus.textContent = `Saved ${result.added} new point${result.added === 1 ? "" : "s"}.`;
  state.parsed = [];
  state.materialMappings = {};
  els.saveButton.disabled = true;
  els.preview.hidden = true;
  els.materialReview.hidden = true;
  els.surveyPaste.value = "";
  render();
}

function getUnknownMaterialTokens(records) {
  return unique(
    records
      .flatMap((record) => record.materials)
      .filter((material) => !isKnownMaterial(material)),
  );
}

function renderMaterialReview() {
  const unknowns = getUnknownMaterialTokens(state.parsed);
  els.materialReview.innerHTML = "";
  els.materialReview.hidden = unknowns.length === 0;
  if (!unknowns.length) return;

  const heading = document.createElement("h3");
  heading.textContent = "Review material labels";
  els.materialReview.append(heading);

  const note = document.createElement("p");
  note.textContent = "These labels are not recognized. Choose what each one means before saving.";
  els.materialReview.append(note);

  unknowns.forEach((token) => {
    const row = document.createElement("label");
    row.textContent = token;
    const select = document.createElement("select");
    select.dataset.materialToken = token;
    select.innerHTML = `<option value="">Choose material...</option><option value="__ignore">Ignore this label</option>`;
    CANONICAL_MATERIALS.forEach((material) => {
      const option = document.createElement("option");
      option.value = material;
      option.textContent = material;
      select.append(option);
    });
    select.value = state.materialMappings[token] || "";
    select.addEventListener("input", () => {
      if (select.value) {
        state.materialMappings[token] = select.value;
      } else {
        delete state.materialMappings[token];
      }
      previewImport();
    });
    row.append(select);
    els.materialReview.append(row);
  });
}

function applyMaterialMappings(records) {
  return records.map((record) => {
    const materials = record.materials
      .map((material) => {
        if (isKnownMaterial(material)) return normalizeMaterial(material);
        const mapped = state.materialMappings[material];
        return mapped === "__ignore" ? "" : mapped;
      })
      .filter(Boolean);
    return {
      ...record,
      materials: unique(materials),
      rawDetail: rebuildDetail(record.rawDetail?.split("|")[0]?.trim() || "", unique(materials)),
    };
  });
}

async function addRecords(records) {
  const fresh = getFreshRecords(normalizeRecords(records));

  if (state.serverMode) {
    const response = await fetch(`${API_ROOT}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records: fresh }),
    });
    if (!response.ok) throw new Error(`Save failed with ${response.status}`);
    const payload = await response.json();
    state.records = normalizeRecords(payload.records || []);
    return { added: payload.added || 0 };
  }

  state.records = [...fresh, ...state.records];
  await saveRecordsLocally();
  return { added: fresh.length };
}

function hasDuplicate(record) {
  return isDuplicateRecord(record, state.records);
}

function getFreshRecords(records, existing = state.records) {
  const fresh = [];
  normalizeRecords(records).forEach((record) => {
    if (!isDuplicateRecord(record, [...fresh, ...existing])) {
      fresh.push(record);
    }
  });
  return fresh;
}

function isDuplicateRecord(record, records) {
  return records.some((saved) => {
    if (saved.fingerprint === record.fingerprint) return true;
    return distanceBetween(record, saved) <= DUPLICATE_DISTANCE_METERS;
  });
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function render() {
  renderTabs();
  renderSummary();
  renderFilterOptions();
  renderResults();
}

function setTab(tab) {
  state.activeTab = tab;
  renderTabs();
}

function renderTabs() {
  els.tabButtons.forEach((button) => {
    const active = button.dataset.tab === state.activeTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
  els.importTab.hidden = state.activeTab !== "import";
  els.databasePanels.forEach((panel) => {
    panel.hidden = state.activeTab !== "database";
  });
}

function renderSummary() {
  els.totalCount.textContent = state.records.length.toLocaleString();
  els.sizeCount.textContent = unique(state.records.map((record) => record.size)).length.toLocaleString();
  els.oreCount.textContent = unique(state.records.flatMap((record) => record.materials)).length.toLocaleString();
}

function renderFilterOptions() {
  fillSelect(els.sizeFilter, "All sizes", unique(state.records.map((record) => record.size)));
  fillSelect(els.materialFilter, "All materials", unique(state.records.flatMap((record) => record.materials)));
}

function fillSelect(select, label, values) {
  const currentValue = select.value;
  select.innerHTML = `<option value="">${label}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.append(option);
  });
  select.value = values.includes(currentValue) ? currentValue : "";
}

function getDistanceFilter() {
  const origin = parseCoordinateInput(els.baseGpsInput.value);
  const maxDistance = Number(els.maxDistanceFilter.value || 0);
  return { origin, maxDistance };
}

function parseCoordinateInput(value) {
  const text = value.trim();
  if (!text) return null;

  const gpsMatch = text.match(/GPS:[^:\r\n]*:([^:\r\n]+):([^:\r\n]+):([^:\r\n]+):/i);
  if (gpsMatch) return toPoint(gpsMatch.slice(1, 4));

  const values = text.match(/-?\d+(?:\.\d+)?/g);
  if (!values || values.length < 3) return null;
  return toPoint(values.slice(0, 3));
}

function toPoint(values) {
  const [x, y, z] = values.map(Number);
  if ([x, y, z].some((number) => Number.isNaN(number))) return null;
  return { x, y, z };
}

function distanceBetween(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function enrichDistance(record, origin) {
  return origin ? { ...record, distance: distanceBetween(record, origin) } : { ...record, distance: null };
}

function getFilteredRecords() {
  const search = els.searchInput.value.trim().toLowerCase();
  const size = els.sizeFilter.value;
  const material = els.materialFilter.value;
  const minRocks = Number(els.minRocksFilter.value || 0);
  const { origin, maxDistance } = getDistanceFilter();

  return state.records
    .map((record) => enrichDistance(record, origin))
    .filter((record) => {
      const searchable = [
        record.gpsName,
        record.rawDetail,
        record.notes,
        record.x,
        record.y,
        record.z,
        record.materials.join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return (
        (!search || searchable.includes(search)) &&
        (!size || record.size === size) &&
        (!material || record.materials.includes(material)) &&
        record.rockCount >= minRocks &&
        (!origin || !maxDistance || record.distance <= maxDistance)
      );
    })
    .sort(sortRecords);
}

function sortRecords(a, b) {
  switch (els.sortSelect.value) {
    case "distance":
      return compareDistance(a, b);
    case "size":
      return (sizeRank[a.size] || 99) - (sizeRank[b.size] || 99) || a.gpsName.localeCompare(b.gpsName);
    case "materials":
      return b.materials.length - a.materials.length || b.rockCount - a.rockCount;
    case "rocks":
      return b.rockCount - a.rockCount || b.materials.length - a.materials.length;
    case "name":
      return a.gpsName.localeCompare(b.gpsName);
    case "newest":
    default:
      return new Date(b.importedAt) - new Date(a.importedAt);
  }
}

function compareDistance(a, b) {
  if (a.distance === null && b.distance === null) return 0;
  if (a.distance === null) return 1;
  if (b.distance === null) return -1;
  return a.distance - b.distance;
}

function renderResults() {
  const records = getFilteredRecords();
  const { origin } = getDistanceFilter();
  const invalidOrigin = els.baseGpsInput.value.trim() && !origin;

  els.resultCount.textContent = `${records.length.toLocaleString()} match${records.length === 1 ? "" : "es"}`;
  els.results.innerHTML = "";

  if (invalidOrigin) {
    const warning = document.createElement("div");
    warning.className = "empty";
    warning.textContent = "Base GPS is not readable yet. Paste a GPS line or enter X, Y, Z.";
    els.results.append(warning);
    return;
  }

  if (records.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = state.records.length
      ? "No saved asteroid points match those filters."
      : "Open Import Survey and save a survey paste to start building the database.";
    els.results.append(empty);
    return;
  }

  records.forEach((record) => {
    const node = els.template.content.firstElementChild.cloneNode(true);
    node.querySelector("h3").textContent = record.gpsName;
    node.querySelector(".size-pill").textContent = `${record.size} - ${record.rockCount} rock${record.rockCount === 1 ? "" : "s"}`;
    node.querySelector(".detail").textContent = [
      record.rawDetail || `${record.size} ${record.nodeType}`,
    ]
      .filter(Boolean)
      .join(" - ");
    const note = node.querySelector('[data-field="note"]');
    note.textContent = record.notes ? `Notes: ${record.notes}` : "";
    note.hidden = !record.notes;

    const chips = node.querySelector(".chips");
    const chipValues = record.materials.length ? record.materials : ["No material listed"];
    chipValues.forEach((material) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.textContent = material;
      chips.append(chip);
    });

    if (record.distance !== null) {
      const chip = document.createElement("span");
      chip.className = "chip distance-chip";
      chip.textContent = `${Math.round(record.distance).toLocaleString()} m`;
      chips.append(chip);
    }

    node.querySelector('[data-coord="x"]').textContent = record.x.toLocaleString();
    node.querySelector('[data-coord="y"]').textContent = record.y.toLocaleString();
    node.querySelector('[data-coord="z"]').textContent = record.z.toLocaleString();
    node.querySelector('[data-action="copy"]').addEventListener("click", () => copyGps(record));
    node.querySelector('[data-action="edit"]').addEventListener("click", () => openEditPanel(node, record));
    node.querySelector('[data-action="save-edit"]').addEventListener("click", () => saveRecordEdits(node, record).catch(showError));
    node.querySelector('[data-action="cancel-edit"]').addEventListener("click", () => closeEditPanel(node));
    node.querySelector('[data-action="delete"]').addEventListener("click", () => deleteRecord(record.id));
    els.results.append(node);
  });
}

function openEditPanel(node, record) {
  const panel = node.querySelector(".edit-panel");
  panel.hidden = false;
  node.querySelector('[data-edit="notes"]').value = record.notes || "";
  node.querySelector('[data-edit="materials"]').value = record.materials.join(", ");
}

function closeEditPanel(node) {
  node.querySelector(".edit-panel").hidden = true;
}

async function saveRecordEdits(node, record) {
  const notes = node.querySelector('[data-edit="notes"]').value.trim();
  const materials = parseMaterialInput(node.querySelector('[data-edit="materials"]').value);
  await updateRecord(record.id, { notes, materials });
  els.importStatus.textContent = `Updated ${record.gpsName}.`;
  render();
}

function parseMaterialInput(value) {
  return unique(
    value
      .split(/[, ]+/)
      .map(normalizeMaterial)
      .filter(Boolean),
  );
}

async function updateRecord(id, updates) {
  if (state.serverMode) {
    const response = await fetch(`${API_ROOT}/records/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...getEditorHeaders() },
      body: JSON.stringify(updates),
    });
    await requireProtectedResponse(response, "Update");
    const payload = await response.json();
    state.records = normalizeRecords(payload.records || []);
    return;
  }

  state.records = state.records.map((record) => {
    if (record.id !== id) return record;
    return normalizeRecords([{ ...record, ...updates, rawDetail: rebuildDetail(record.rawDetail?.split("|")[0]?.trim() || "", updates.materials || record.materials) }])[0];
  });
  await saveRecordsLocally();
}

async function copyGps(record) {
  try {
    if (!navigator.clipboard) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(record.gpsLine);
  } catch {
    const scratch = document.createElement("textarea");
    scratch.value = record.gpsLine;
    scratch.style.position = "fixed";
    scratch.style.opacity = "0";
    document.body.append(scratch);
    scratch.select();
    document.execCommand("copy");
    scratch.remove();
  }
  els.importStatus.textContent = `Copied ${record.gpsName}.`;
}

async function deleteRecord(id) {
  if (state.serverMode) {
    const response = await fetch(`${API_ROOT}/records/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getEditorHeaders(),
    });
    await requireProtectedResponse(response, "Delete");
    const payload = await response.json();
    state.records = normalizeRecords(payload.records || []);
  } else {
    state.records = state.records.filter((record) => record.id !== id);
    await saveRecordsLocally();
  }
  render();
}

function resetFilters() {
  els.searchInput.value = "";
  els.sizeFilter.value = "";
  els.materialFilter.value = "";
  els.minRocksFilter.value = "";
  els.baseGpsInput.value = "";
  els.maxDistanceFilter.value = "";
  els.sortSelect.value = "newest";
  renderResults();
}

async function clearAll() {
  if (!state.records.length) return;
  const confirmed = window.confirm("Clear every saved asteroid point from the shared database?");
  if (!confirmed) return;

  if (state.serverMode) {
    const response = await fetch(`${API_ROOT}/records`, {
      method: "DELETE",
      headers: getEditorHeaders(),
    });
    await requireProtectedResponse(response, "Clear");
  }

  state.records = [];
  await saveRecordsLocally();
  render();
}

function exportJson() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "Space Engineers Asteroid Database",
    version: 2,
    records: state.records,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `se-asteroid-db-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importJson(event) {
  const [file] = event.target.files;
  if (!file) return;

  try {
    const payload = JSON.parse(await file.text());
    const imported = Array.isArray(payload) ? payload : payload.records;
    if (!Array.isArray(imported)) throw new Error("Missing records array");

    const result = await addRecords(imported);
    els.importStatus.textContent = `Imported ${result.added} new point${result.added === 1 ? "" : "s"}.`;
    render();
  } catch (error) {
    els.importStatus.textContent = `Import failed: ${error.message}`;
  } finally {
    event.target.value = "";
  }
}

els.parseButton.addEventListener("click", previewImport);
els.surveyPaste.addEventListener("input", previewImport);
els.saveButton.addEventListener("click", () => saveParsed().catch(showError));
els.editorKeyButton.addEventListener("click", setEditorKey);
els.tabButtons.forEach((button) => button.addEventListener("click", () => setTab(button.dataset.tab)));
els.resetFiltersButton.addEventListener("click", resetFilters);
els.clearAllButton.addEventListener("click", () => clearAll().catch(showError));
els.exportJsonButton.addEventListener("click", exportJson);
els.importJsonInput.addEventListener("change", (event) => importJson(event).catch(showError));

[
  els.searchInput,
  els.sizeFilter,
  els.materialFilter,
  els.minRocksFilter,
  els.baseGpsInput,
  els.maxDistanceFilter,
  els.sortSelect,
].forEach((element) => element.addEventListener("input", renderResults));

function showError(error) {
  els.importStatus.textContent = error.message;
}

init().catch(showError);
