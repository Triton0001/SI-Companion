import {
  clearRecords,
  isDuplicateRecord,
  json,
  normalizeRecord,
  normalizeUsername,
  readRecords,
  requireEditor,
  writeRecord,
} from "../_shared.js";

export async function onRequestGet({ env }) {
  return json({ records: await readRecords(env) });
}

export async function onRequestPost({ request, env }) {
  const payload = await request.json();
  const submittedBy = normalizeUsername(request.headers.get("X-User-Name") || payload.submittedBy || "");
  const incoming = (payload.records || []).map((record) =>
    normalizeRecord({
      ...record,
      submittedBy: record.submittedBy || submittedBy || "Unknown",
    }),
  );
  const current = await readRecords(env);
  const fresh = [];

  incoming.forEach((record) => {
    if (!isDuplicateRecord(record, [...fresh, ...current])) {
      fresh.push(record);
    }
  });

  for (const record of fresh) {
    await writeRecord(env, record);
  }

  return json({
    added: fresh.length,
    skipped: incoming.length - fresh.length,
    records: await readRecords(env),
  });
}

export async function onRequestDelete({ request, env }) {
  if (!requireEditor(request, env)) {
    return json({ error: "Editor key required" }, 401);
  }

  await clearRecords(env);
  return json({ records: [] });
}
