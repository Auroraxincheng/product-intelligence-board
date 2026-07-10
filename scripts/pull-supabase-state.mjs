import { writeFile } from "node:fs/promises";

const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const stateId = process.env.SUPABASE_STATE_ID || process.argv[2] || "staging";
const outputPath = process.argv[3] || new URL("../data/store.json", import.meta.url);

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const response = await fetch(`${url}/rest/v1/app_state?id=eq.${encodeURIComponent(stateId)}&select=data`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

if (!response.ok) {
  console.error(`Download failed: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const rows = await response.json();
const data = rows[0]?.data;

if (!data) {
  console.error(`No app_state row found for "${stateId}".`);
  process.exit(1);
}

await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Downloaded Supabase app_state.${stateId} to ${outputPath}`);
