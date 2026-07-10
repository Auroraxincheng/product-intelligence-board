import { readFile } from "node:fs/promises";

const stateId = process.argv[2] || process.env.SUPABASE_STATE_ID || "staging";
const envFiles = [".env.local", ".env"];

function parseEnv(content) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

for (const file of envFiles) {
  try {
    parseEnv(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

process.env.SUPABASE_STATE_ID = stateId;

if (!process.env.SUPABASE_URL || !(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)) {
  console.warn("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing. Server will use local data/store.json fallback.");
}

console.log(`Starting Product Intelligence Board with SUPABASE_STATE_ID=${process.env.SUPABASE_STATE_ID}`);
await import("../server.js");
