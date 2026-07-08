import { readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";

const storePath = new URL("../data/store.json", import.meta.url);
const lovablePath = new URL("../store.ts", import.meta.url);

const laneMap = {
  b2b: { productArea: "CBI", segment: "B2B" },
  sme: { productArea: "CBI", segment: "SME" },
  skorku: { productArea: "CBI", segment: "D2C" },
  cbp_b2b: { productArea: "CBP", segment: "B2B" },
  cbp_sme: { productArea: "CBP", segment: "SME" },
  cbp_d2c: { productArea: "CBP", segment: "D2C" },
  ai: { productArea: "AI Agents", segment: "AI Agents" },
};

const ownerMap = {
  "Arbi K.": "Arbi",
  "Kintan S.": "Kintan",
  "Stephen D.": "Stephen",
  "Min H.": "Min Hou",
  "Min H": "Min Hou",
  "Yao Kun": "Aaron",
};

const statusMap = {
  Review: "Testing",
  Complete: "Done",
  Delay: "Blocked",
  Bottleneck: "Blocked",
  "Escalation Required": "Blocked",
};

function isoWeek(dateString) {
  const date = new Date(`${dateString}T00:00:00Z`);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function currentReportingWeek(date = new Date()) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function splitArgs(raw) {
  const args = [];
  let current = "";
  let quote = "";
  let escaped = false;
  for (const char of raw) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }
    if (char === "\\") {
      current += char;
      escaped = true;
      continue;
    }
    if (quote) {
      current += char;
      if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }
    if (char === ",") {
      args.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args.map((arg) => {
    const trimmed = arg.trim();
    if (trimmed === "undefined") return "";
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return JSON.parse(trimmed.replace(/^'/, '"').replace(/'$/, '"'));
    }
    return trimmed;
  });
}

function parseLovableCards(source) {
  const cards = [];
  let lane = "";
  let track = "";
  for (const line of source.split("\n")) {
    const assignment = line.match(/updates\.([a-z0-9_]+)\["([^"]+)"\]\s*=/);
    if (assignment) {
      lane = assignment[1];
      track = assignment[2];
      continue;
    }
    const laneInfo = laneMap[lane];
    const start = line.indexOf("card(");
    const end = line.lastIndexOf(")");
    if (!laneInfo || start === -1 || end === -1 || end <= start) continue;
    const [title, status, date, owner, market, desc] = splitArgs(line.slice(start + 5, end));
    cards.push({
      ...laneInfo,
      track,
      title,
      status: statusMap[status] || status,
      date,
      owner: ownerMap[owner] || owner,
      market: market || "🇮🇩 ID",
      desc,
    });
  }
  return cards;
}

function relatedLinks(card) {
  return [{ label: "Lovable source", url: "lovable-seed" }];
}

function productParts(title) {
  const parts = title.split(/\s+[—–-]\s+/);
  let product = parts[0]?.trim() || title.trim();
  const topic = parts.slice(1).join(" - ").trim() || title.trim();

  product = product.replace(/\s+\((ID|PH|SG|ID,\s*PH\s*&\s*SG|PH\s*&\s*SG|Regional)\)$/i, "").trim();
  product = product.replace(/^SkorKu 3\.0.*/i, "SkorKu 3.0");
  product = product.replace(/^SkorKu 2\.0.*/i, "SkorKu 2.0");
  const agentMatch = product.match(/^(Agent\s+[A-Z]+)\s+(.+)$/i);
  if (agentMatch) {
    product = agentMatch[1].replace(/\s+/g, " ").trim();
    return {
      product,
      topic: `${agentMatch[2].trim()}${parts.length > 1 ? ` - ${parts.slice(1).join(" - ").trim()}` : ""}`,
      key: product.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    };
  }

  return {
    product,
    topic,
    key: product.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
  };
}

function statusRank(status) {
  const ranks = {
    Backlog: 0,
    Planning: 1,
    "In Progress": 2,
    Development: 3,
    Testing: 4,
    Blocked: 5,
    Live: 6,
    Done: 7,
  };
  return ranks[status] ?? 0;
}

function representativeCard(cards) {
  return [...cards].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare) return dateCompare;
    return statusRank(a.status) - statusRank(b.status);
  }).at(-1);
}

function groupCards(cards) {
  const groups = new Map();
  for (const card of cards) {
    const parts = productParts(card.title);
    const key = `${card.productArea}::${card.segment}::${parts.key}`;
    const group = groups.get(key) || { ...parts, cards: [] };
    group.cards.push({ ...card, topic: parts.topic });
    groups.set(key, group);
  }
  return [...groups.values()];
}

const source = await readFile(lovablePath, "utf8");
const data = JSON.parse(await readFile(storePath, "utf8"));
const cards = parseLovableCards(source);
const importedIds = new Set(data.updateItems.filter((item) => item.createdBy === "Lovable Import").map((item) => item.id));
if (importedIds.size) {
  data.updateItems = data.updateItems.filter((item) => !importedIds.has(item.id));
  data.weeklyUpdates = data.weeklyUpdates.filter((entry) => !importedIds.has(entry.itemId));
}
const existingTitles = new Set(data.updateItems.map((item) => item.title));
const timestamp = new Date().toISOString();
const importWeek = currentReportingWeek();
let imported = 0;
let importedEntries = 0;

for (const group of groupCards(cards)) {
  const reportingWeek = importWeek;
  for (const card of group.cards) {
    const itemTitle = card.topic === card.title ? card.title : `${group.product} — ${card.topic}`;
    if (existingTitles.has(itemTitle)) continue;
    const itemId = crypto.randomUUID();
    const workstream = { id: crypto.randomUUID(), title: group.product, done: card.status === "Done" };
    const item = {
      id: itemId,
      title: itemTitle,
      productWorkstream: group.product,
      description: `${card.topic} imported from Lovable under ${group.product}.`,
      productArea: card.productArea,
      segment: card.segment,
      track: card.track,
      owner: card.owner,
      status: card.status,
      targetCompletionDate: card.date,
      relatedLinks: relatedLinks(card),
      workstreams: [workstream],
      subTasks: [],
      archived: false,
      archivedReason: "",
      doneDate: card.status === "Done" ? card.date : "",
      doneWeek: card.status === "Done" ? reportingWeek : "",
      createdBy: "Lovable Import",
      createdAt: timestamp,
      lastUpdatedBy: "Lovable Import",
      lastUpdatedAt: timestamp,
    };
    data.updateItems.push(item);
    existingTitles.add(itemTitle);
    data.weeklyUpdates.push({
      id: crypto.randomUUID(),
      itemId,
      workstreamId: workstream.id,
      workstreamTitle: workstream.title,
      reportingWeek,
      progress: card.desc || `listed as ${card.status} on the Lovable board.`,
      nextStep: card.status === "Done" || card.status === "Live" ? "Monitor and follow up if needed." : "Continue follow-up in the next product review.",
      blockerRisk: card.status === "Blocked" ? "Imported status indicates blocker or escalation." : "",
      status: card.status,
      relatedLinks: relatedLinks(card),
      submittedBy: "Lovable Import",
      submittedAt: timestamp,
      lastUpdatedBy: "Lovable Import",
      lastUpdatedAt: timestamp,
    });
    imported += 1;
    importedEntries += 1;
  }
}

await writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Imported ${imported} Lovable update items with ${importedEntries} weekly entries.`);
