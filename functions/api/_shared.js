const DUPLICATE_DISTANCE_METERS = 200;

const MATERIAL_ALIASES = {
  ag: "Ag",
  silver: "Ag",
  au: "Au",
  gold: "Au",
  co: "Co",
  cobalt: "Co",
  fe: "Fe",
  iron: "Fe",
  ice: "Ice",
  water: "Ice",
  mg: "Mg",
  magnesium: "Mg",
  ni: "Ni",
  nickel: "Ni",
  o2: "Ice",
  oxygen: "Ice",
  pt: "Pt",
  platinum: "Pt",
  si: "Si",
  silicon: "Si",
  stone: "Stone",
  u: "U",
  uranium: "U",
};

export function json(payload, status = 200) {
  return new Response(`${JSON.stringify(payload)}\n`, {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function readRecords(env) {
  const result = await env.DB.prepare(
    `SELECT id, gps_name, gps_line, x, y, z, color, size, node_type, node_number,
            rock_count, materials, notes, raw_detail, fingerprint, imported_at
       FROM asteroid_records
       ORDER BY imported_at DESC`,
  ).all();

  return (result.results || []).map(rowToRecord);
}

export async function writeRecord(env, record) {
  await env.DB.prepare(
    `INSERT INTO asteroid_records (
      id, gps_name, gps_line, x, y, z, color, size, node_type, node_number,
      rock_count, materials, notes, raw_detail, fingerprint, imported_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      gps_name = excluded.gps_name,
      gps_line = excluded.gps_line,
      x = excluded.x,
      y = excluded.y,
      z = excluded.z,
      color = excluded.color,
      size = excluded.size,
      node_type = excluded.node_type,
      node_number = excluded.node_number,
      rock_count = excluded.rock_count,
      materials = excluded.materials,
      notes = excluded.notes,
      raw_detail = excluded.raw_detail,
      fingerprint = excluded.fingerprint,
      imported_at = excluded.imported_at`,
  )
    .bind(
      record.id,
      record.gpsName,
      record.gpsLine,
      record.x,
      record.y,
      record.z,
      record.color || "",
      record.size,
      record.nodeType || "",
      record.nodeNumber,
      record.rockCount,
      JSON.stringify(record.materials),
      record.notes || "",
      record.rawDetail || "",
      record.fingerprint,
      record.importedAt,
    )
    .run();
}

export async function deleteRecord(env, id) {
  await env.DB.prepare("DELETE FROM asteroid_records WHERE id = ?").bind(id).run();
}

export async function clearRecords(env) {
  await env.DB.prepare("DELETE FROM asteroid_records").run();
}

export function normalizeRecord(record) {
  const materials = unique((record.materials || []).map(normalizeMaterial).filter(Boolean));
  const normalized = {
    ...record,
    id: record.id || crypto.randomUUID(),
    gpsName: record.gpsName || record.gps_name || "Unknown GPS",
    gpsLine: record.gpsLine || record.gps_line || "",
    x: Number(record.x),
    y: Number(record.y),
    z: Number(record.z),
    color: record.color || "",
    size: record.size || "Unknown",
    nodeType: record.nodeType || record.node_type || "",
    nodeNumber: record.nodeNumber ?? record.node_number ?? null,
    rockCount: Number(record.rockCount || record.rock_count || 1),
    materials,
    notes: record.notes || "",
    rawDetail: normalizeDetail(record.rawDetail || record.raw_detail || "", materials),
    importedAt: record.importedAt || record.imported_at || new Date().toISOString(),
  };

  normalized.fingerprint =
    record.fingerprint ||
    `${normalized.gpsName}|${normalized.x}|${normalized.y}|${normalized.z}|${materials.join(",")}`;

  return normalized;
}

export function isDuplicateRecord(record, records) {
  return records.some((saved) => {
    if (saved.fingerprint === record.fingerprint) return true;
    return distanceBetween(record, saved) <= DUPLICATE_DISTANCE_METERS;
  });
}

export function requireEditor(request, env) {
  const configured = String(env.EDITOR_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean);
  const provided = request.headers.get("X-Editor-Key") || "";
  return configured.length > 0 && configured.includes(provided);
}

export function normalizeMaterial(value) {
  if (!value) return "";
  const trimmed = String(value).trim();
  const key = trimmed
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/(ore|ingot|wafer|powder)$/i, "");
  return MATERIAL_ALIASES[key] || trimmed;
}

function rowToRecord(row) {
  return {
    id: row.id,
    gpsName: row.gps_name,
    gpsLine: row.gps_line,
    x: row.x,
    y: row.y,
    z: row.z,
    color: row.color,
    size: row.size,
    nodeType: row.node_type,
    nodeNumber: row.node_number,
    rockCount: row.rock_count,
    materials: parseMaterials(row.materials),
    notes: row.notes,
    rawDetail: row.raw_detail,
    fingerprint: row.fingerprint,
    importedAt: row.imported_at,
  };
}

function parseMaterials(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeDetail(rawDetail, materials) {
  if (!rawDetail) return rawDetail;
  const [description = ""] = rawDetail.split("|").map((part) => part.trim());
  return [description, materials.join(", ")].filter(Boolean).join(" | ");
}

function distanceBetween(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}
