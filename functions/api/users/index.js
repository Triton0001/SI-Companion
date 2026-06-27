import { getUsernameKey, json, normalizeUsername } from "../_shared.js";

export async function onRequestPost({ request, env }) {
  const payload = await request.json();
  const username = normalizeUsername(payload.username || "");
  const userId = String(payload.userId || "").trim();

  if (username.length < 2) {
    return json({ error: "Username must be at least 2 characters" }, 400);
  }

  if (!userId) {
    return json({ error: "User id required" }, 400);
  }

  const usernameKey = getUsernameKey(username);

  await env.DB.prepare(
    `INSERT OR IGNORE INTO asteroid_users (username_key, username, user_id, created_at)
     VALUES (?, ?, ?, ?)`,
  )
    .bind(usernameKey, username, userId, new Date().toISOString())
    .run();

  const existing = await env.DB.prepare(
    `SELECT username, user_id, created_at
       FROM asteroid_users
      WHERE username_key = ?`,
  )
    .bind(usernameKey)
    .first();

  if (!existing) {
    return json({ error: "Username could not be reserved" }, 500);
  }

  if (existing.user_id !== userId) {
    return json({ error: "Username already taken" }, 409);
  }

  return json({
    user: {
      username: existing.username,
      userId: existing.user_id,
      createdAt: existing.created_at,
    },
  });
}
