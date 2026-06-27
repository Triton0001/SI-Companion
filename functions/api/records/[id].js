import { deleteRecord, json, normalizeRecord, readRecords, requireEditor, writeRecord } from "../_shared.js";

export async function onRequestPut({ params, request, env }) {
  if (!requireEditor(request, env)) {
    return json({ error: "Editor key required" }, 401);
  }

  const payload = await request.json();
  const records = await readRecords(env);
  const existing = records.find((record) => record.id === params.id);
  if (!existing) {
    return json({ error: "Record not found" }, 404);
  }

  const updated = normalizeRecord({
    ...existing,
    notes: payload.notes,
    materials: payload.materials,
    rawDetail: existing.rawDetail,
  });
  await writeRecord(env, updated);

  return json({ records: await readRecords(env) });
}

export async function onRequestDelete({ params, request, env }) {
  if (!requireEditor(request, env)) {
    return json({ error: "Editor key required" }, 401);
  }

  await deleteRecord(env, params.id);
  return json({ records: await readRecords(env) });
}
