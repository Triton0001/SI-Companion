import { json } from "./_shared.js";

export function onRequestGet() {
  return json({ ok: true });
}
