import { readFile } from "node:fs/promises";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const stateId = process.env.SUPABASE_STATE_ID || "production";

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const storeUrl = new URL("../data/store.json", import.meta.url);
const data = JSON.parse(await readFile(storeUrl, "utf8"));

const response = await fetch(`${url}/rest/v1/app_state`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify({
    id: stateId,
    data,
    updated_at: new Date().toISOString(),
  }),
});

if (!response.ok) {
  console.error(`Upload failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

console.log(`Uploaded data/store.json to Supabase app_state.${stateId}`);
