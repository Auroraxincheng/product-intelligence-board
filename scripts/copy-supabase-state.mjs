const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const sourceStateId = process.env.SOURCE_SUPABASE_STATE_ID || process.argv[2] || "staging";
const targetStateId = process.env.TARGET_SUPABASE_STATE_ID || process.argv[3] || "production";

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

if (sourceStateId === targetStateId) {
  console.error("Source and target state ids must be different.");
  process.exit(1);
}

const readResponse = await fetch(`${url}/rest/v1/app_state?id=eq.${encodeURIComponent(sourceStateId)}&select=data`, {
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
  },
});

if (!readResponse.ok) {
  console.error(`Read failed: ${readResponse.status} ${await readResponse.text()}`);
  process.exit(1);
}

const rows = await readResponse.json();
const data = rows[0]?.data;

if (!data) {
  console.error(`No app_state row found for "${sourceStateId}".`);
  process.exit(1);
}

const writeResponse = await fetch(`${url}/rest/v1/app_state`, {
  method: "POST",
  headers: {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  },
  body: JSON.stringify({
    id: targetStateId,
    data,
    updated_at: new Date().toISOString(),
  }),
});

if (!writeResponse.ok) {
  console.error(`Write failed: ${writeResponse.status} ${await writeResponse.text()}`);
  process.exit(1);
}

console.log(`Copied Supabase app_state.${sourceStateId} to app_state.${targetStateId}`);
