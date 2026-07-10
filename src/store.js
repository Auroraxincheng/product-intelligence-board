import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

import { STATUS_VALUES, currentReportingWeek, pmProfiles, productAreas, getSegments, getTracks } from "./config.js";

const defaultPmAccounts = [
  { accountId: "pm01", pmProfile: "Arbi", active: true },
  { accountId: "pm02", pmProfile: "Kintan", active: true },
  { accountId: "pm03", pmProfile: "Stephen", active: true },
  { accountId: "pm04", pmProfile: "Martin", active: true },
  { accountId: "pm05", pmProfile: "Aaron", active: true },
  { accountId: "pm06", pmProfile: "Min Hou", active: true },
  { accountId: "pm07", pmProfile: "Fadlim", active: true },
  { accountId: "pm08", pmProfile: "Aurora", active: true },
];

const defaultPasscodes = {
  viewer: "000",
  pm_team: "000",
  product_lead: "000",
  admin: "000",
  pmm: "000",
};

const SUPABASE_STATE_ID = process.env.SUPABASE_STATE_ID || "production";
const SUPABASE_CACHE_TTL_MS = Number(process.env.SUPABASE_CACHE_TTL_MS || 1000);
let cachedSupabaseState = null;
let cachedSupabaseStateAt = 0;
let pendingSupabaseRead = null;

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return {
    url: url.replace(/\/$/, ""),
    key,
  };
}

async function readSupabaseState() {
  const config = supabaseConfig();
  if (!config) return null;
  if (cachedSupabaseState && Date.now() - cachedSupabaseStateAt < SUPABASE_CACHE_TTL_MS) {
    return structuredClone(cachedSupabaseState);
  }
  if (pendingSupabaseRead) return structuredClone(await pendingSupabaseRead);
  pendingSupabaseRead = (async () => {
    const response = await fetch(`${config.url}/rest/v1/app_state?id=eq.${encodeURIComponent(SUPABASE_STATE_ID)}&select=data`, {
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
      },
    });
    if (!response.ok) throw new Error(`Failed to read Supabase app_state: ${response.status} ${await response.text()}`);
    const rows = await response.json();
    cachedSupabaseState = rows[0]?.data || null;
    cachedSupabaseStateAt = Date.now();
    return cachedSupabaseState;
  })();
  try {
    return structuredClone(await pendingSupabaseRead);
  } finally {
    pendingSupabaseRead = null;
  }
}

async function writeSupabaseState(data) {
  const config = supabaseConfig();
  if (!config) return false;
  const response = await fetch(`${config.url}/rest/v1/app_state`, {
    method: "POST",
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ id: SUPABASE_STATE_ID, data, updated_at: nowIso() }),
  });
  if (!response.ok) throw new Error(`Failed to write Supabase app_state: ${response.status} ${await response.text()}`);
  cachedSupabaseState = structuredClone(data);
  cachedSupabaseStateAt = Date.now();
  return true;
}

function nowIso() {
  return new Date().toISOString();
}

function weekToNumber(week) {
  const [year, number] = String(week).split("-").map(Number);
  return year * 100 + number;
}

function isoWeekStart(week) {
  const [year, number] = String(week).split("-").map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);
  const start = new Date(week1Monday);
  start.setUTCDate(week1Monday.getUTCDate() + (number - 1) * 7);
  return start;
}

function isoWeekFromDate(date) {
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function weeksBetween(start, end) {
  const weeks = [];
  let cursor = new Date(start);
  while (cursor <= end) {
    weeks.push(isoWeekFromDate(cursor));
    cursor = addDays(cursor, 7);
  }
  return [...new Set(weeks)];
}

function getPeriodRange(selectedWeek, period = "weekly") {
  const start = isoWeekStart(selectedWeek);
  const anchor = addDays(start, 3);
  if (period === "bi-weekly" || period === "biweekly") {
    return { start, end: addDays(start, 13), weeks: weeksBetween(start, addDays(start, 13)) };
  }
  if (period === "monthly") {
    const monthStart = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + 1, 0));
    return { start: monthStart, end: monthEnd, weeks: weeksBetween(monthStart, monthEnd) };
  }
  if (period === "quarterly") {
    const quarterStartMonth = Math.floor(anchor.getUTCMonth() / 3) * 3;
    const quarterStart = new Date(Date.UTC(anchor.getUTCFullYear(), quarterStartMonth, 1));
    const quarterEnd = new Date(Date.UTC(anchor.getUTCFullYear(), quarterStartMonth + 3, 0));
    return { start: quarterStart, end: quarterEnd, weeks: weeksBetween(quarterStart, quarterEnd) };
  }
  return { start, end: addDays(start, 6), weeks: [selectedWeek] };
}

function normalizeLinks(value) {
  if (Array.isArray(value)) return value.filter((link) => link?.label || link?.url);
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...rest] = line.split("|").map((part) => part.trim());
      return { label: rest.length ? label : line, url: rest.length ? rest.join("|") : line };
    });
}

function normalizeSubTasks(value, previous = []) {
  const previousByTitle = new Map((previous || []).map((task) => [workstreamKey(task.title || task), task]));
  if (Array.isArray(value)) return value
    .filter(Boolean)
    .map((task) => {
      const title = String(task.title || task).trim();
      const previousTask = previousByTitle.get(workstreamKey(title));
      return {
        id: task.id || previousTask?.id || crypto.randomUUID(),
        title,
        done: Boolean(task.done ?? previousTask?.done),
      };
    })
    .filter((task) => task.title);
  return String(value || "")
    .split("\n")
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => {
      const previousTask = previousByTitle.get(workstreamKey(title));
      return { id: previousTask?.id || crypto.randomUUID(), title, done: Boolean(previousTask?.done) };
    });
}

function applySubTaskStates(item, states = []) {
  if (!Array.isArray(states) || !states.length) return;
  const doneById = new Map(states.map((state) => [String(state.id || ""), Boolean(state.done)]));
  const doneByTitle = new Map(states.map((state) => [workstreamKey(state.title), Boolean(state.done)]));
  item.subTasks = (item.subTasks || []).map((task) => {
    const id = String(task.id || "");
    const titleKey = workstreamKey(task.title);
    if (doneById.has(id)) return { ...task, done: doneById.get(id) };
    if (doneByTitle.has(titleKey)) return { ...task, done: doneByTitle.get(titleKey) };
    return task;
  });
}

function normalizeModuleLinks(value) {
  return normalizeLinks(value).filter((link) => link.url || link.label);
}

const DEFAULT_WORKSTREAM_TITLE = "Overall update";

function isPlaceholderWorkstreamTitle(value) {
  return ["no", "none", "n/a", "na", "-", "无", "没有"].includes(workstreamKey(value));
}

function normalizeWorkstreams(value) {
  if (Array.isArray(value)) {
    return value
      .map((workstream) => {
        const title = String(workstream.title || workstream.name || workstream).trim();
        return {
          id: workstream.id || crypto.randomUUID(),
          title: title === "General" ? DEFAULT_WORKSTREAM_TITLE : title,
          done: Boolean(workstream.done),
        };
      })
      .filter((workstream) => workstream.title && !isPlaceholderWorkstreamTitle(workstream.title));
  }
  return String(value || "")
    .split("\n")
    .map((title) => title.trim())
    .filter((title) => title && !isPlaceholderWorkstreamTitle(title))
    .map((title) => ({ id: crypto.randomUUID(), title, done: false }));
}

function workstreamKey(value) {
  return String(value || "").trim().toLowerCase();
}

function deriveProductWorkstreamTitle(item) {
  if (item.productWorkstream) return item.productWorkstream;
  const titleBase = String(item.title || "").split(/\s+[—–-]\s+/)[0]?.trim();
  if (titleBase) return titleBase;
  const firstWorkstream = normalizeWorkstreams(item.workstreams || [])[0]?.title;
  if (firstWorkstream && firstWorkstream !== DEFAULT_WORKSTREAM_TITLE) return firstWorkstream;
  return DEFAULT_WORKSTREAM_TITLE;
}

function ensureWorkstream(item, payload = {}) {
  item.workstreams = normalizeWorkstreams(item.workstreams || item.subTasks || []);
  let title = String(payload.workstreamTitle || "").trim();
  let id = String(payload.workstreamId || "").trim();
  if (id.startsWith("new:")) id = "";
  if (!title && id) title = item.workstreams.find((workstream) => workstream.id === id)?.title || "";
  if (title === "General") title = DEFAULT_WORKSTREAM_TITLE;
  if (isPlaceholderWorkstreamTitle(title)) title = "";
  if (!title) title = DEFAULT_WORKSTREAM_TITLE;
  let workstream = item.workstreams.find((candidate) => candidate.id === id || workstreamKey(candidate.title) === workstreamKey(title));
  if (!workstream) {
    workstream = { id: id || crypto.randomUUID(), title, done: false };
    item.workstreams.push(workstream);
  }
  return workstream;
}

function normalizeAccountId(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePmProfile(value) {
  return String(value || "").trim();
}

function accountSortKey(account) {
  const match = normalizeAccountId(account.accountId).match(/^(pm|qa)(\d+)$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const prefixOrder = match[1] === "pm" ? 0 : 1;
  return prefixOrder * 10000 + Number(match[2]);
}

function seedData() {
  const timestamp = nowIso();
  const week = currentReportingWeek();
  const samples = [
    ["Telco Score - Telkomsel API Wrapper", "CBI", "B2B", "Product", "Arbi", "Development", "TSEL features completed. CBI Engineer queuing to develop.", "Start Telkomsel API wrapper development once engineering queue is available.", "Engineering queue / development capacity."],
    ["OJK Audit Preparation", "CBI", "B2B", "Regulatory Audit", "Arbi", "In Progress", "Document preparation done. IDR 1M reporting is in progress.", "Continue preparing product audit list and answer open questions.", "Limitation of SLIK data copy needs clarification."],
    ["SME 2.0 Phase 3.0", "CBI", "SME", "SME 2.0", "Kintan", "Development", "Testcase review done. External Users menu confirmed. JSON added as analysis results format.", "Continue development and prepare next testing / validation step.", "None."],
    ["Ginee Integration", "CBI", "SME", "Integration / Partnership", "Kintan", "Blocked", "No update from Ginee.", "Follow up with Ginee contact.", "Partner response delay."],
    ["SKORKU 3.0 Android Testing & Bug Fix", "CBI", "D2C", "Mobile App", "Stephen", "Testing", "Android builds are in active testing and bug fixing cycle.", "Continue testing and bug fixing until Android reaches milestone stability.", "None."],
    ["SKORKU 2.0 KYC Complaint - VIDA vs Privy", "CBI", "D2C", "Issue / Complaint", "Stephen", "In Progress", "Complaint under review. User data does not match VIDA data but was approved through Privy KYC.", "Investigate potential data consistency issue with relevant KYC data source.", "Potential data consistency issue between VIDA and Privy."],
    ["Agent SHIELD PH Public Data Source POC", "AI Agents", "AI Agents", "Agent SHIELD", "Fadlim", "Done", "POC for PH public data sources completed.", "Walkthrough with local BDs and Compliance.", "None."],
  ];
  const updateItems = [];
  const weeklyUpdates = [];
  for (const [title, productArea, segment, track, owner, status, progress, nextStep, blockerRisk] of samples) {
    const itemId = crypto.randomUUID();
    updateItems.push({
      id: itemId,
      title,
      description: `${title} sample Update Item seeded from the PRD demo data.`,
      productArea,
      segment,
      track,
      owner,
      status,
        targetCompletionDate: "2026-08-15",
        relatedLinks: [{ label: "Working doc", url: "https://example.com/product-intelligence-board" }],
        workstreams: [{ id: crypto.randomUUID(), title, done: status === "Done" }],
        archived: false,
      archivedReason: "",
      lifecycleState: status === "Done" ? "Done" : "Active",
      doneDate: status === "Done" ? timestamp.slice(0, 10) : "",
      doneWeek: status === "Done" ? week : "",
      createdBy: owner,
      createdAt: timestamp,
      lastUpdatedBy: owner,
      lastUpdatedAt: timestamp,
    });
    const workstream = updateItems.at(-1).workstreams[0];
    weeklyUpdates.push({
      id: crypto.randomUUID(),
      itemId,
      workstreamId: workstream.id,
      workstreamTitle: workstream.title,
      reportingWeek: week,
      progress,
      nextStep,
      blockerRisk: blockerRisk === "None." ? "" : blockerRisk,
      status,
      relatedLinks: [{ label: "Working doc", url: "https://example.com/product-intelligence-board" }],
      submittedBy: owner,
      submittedAt: timestamp,
      lastUpdatedBy: owner,
      lastUpdatedAt: timestamp,
    });
  }
  return {
    passcodes: defaultPasscodes,
    pmAccounts: defaultPmAccounts,
    updateItems,
    weeklyUpdates,
    announcements: [],
    meetings: [],
    marketingAssets: [],
    capacity: { metricDefinition: "Capacity is tracked in PD. Update the calculation rule here.", records: [] },
    customTracks: [],
  };
}

export function createStore(filePath) {
  function normalizeData(data) {
    const passcodes = { ...defaultPasscodes, ...(data.passcodes || {}) };
    if (!passcodes.pm_team && data.passcodes?.pm_editor) passcodes.pm_team = data.passcodes.pm_editor;
    delete passcodes.pm_editor;
    return {
      passcodes,
      pmAccounts: data.pmAccounts || defaultPmAccounts,
      updateItems: data.updateItems || [],
      weeklyUpdates: data.weeklyUpdates || [],
      announcements: data.announcements || [],
      meetings: data.meetings || [],
      marketingAssets: data.marketingAssets || [],
      capacity: data.capacity || { metricDefinition: "Capacity is tracked in PD. Update the calculation rule here.", records: [] },
      customTracks: data.customTracks || [],
      settingsUpdatedBy: data.settingsUpdatedBy || "",
      settingsUpdatedAt: data.settingsUpdatedAt || "",
    };
  }

  async function readData() {
    try {
      const source = (await readSupabaseState()) || JSON.parse(await readFile(filePath, "utf8"));
      const data = normalizeData(source);
      if (!data.pmAccounts.length) data.pmAccounts = defaultPmAccounts;
      if (migrateWorkstreams(data) || repairDoneWeeks(data)) await writeData(data);
      return data;
    } catch {
      const data = seedData();
      await writeData(data);
      return data;
    }
  }

  async function writeData(data) {
    if (await writeSupabaseState(data)) return;
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`);
  }

  function repairDoneWeeks(data) {
    let changed = false;
    for (const item of data.updateItems) {
      const firstDoneEntry = data.weeklyUpdates
        .filter((entry) => entry.itemId === item.id && entry.status === "Done")
        .sort((a, b) => a.reportingWeek.localeCompare(b.reportingWeek) || a.submittedAt.localeCompare(b.submittedAt))[0];
      if (item.status === "Done" && firstDoneEntry && item.doneWeek !== firstDoneEntry.reportingWeek) {
        item.doneWeek = firstDoneEntry.reportingWeek;
        item.doneDate = item.doneDate || firstDoneEntry.submittedAt.slice(0, 10);
        changed = true;
      }
    }
    return changed;
  }

  function migrateWorkstreams(data) {
    let changed = false;
    for (const item of data.updateItems) {
      if (!item.productWorkstream) {
        item.productWorkstream = deriveProductWorkstreamTitle(item);
        changed = true;
      }
      if (normalizeTrackName(item)) changed = true;
      const sourceWorkstreams = item.workstreams?.length ? item.workstreams : item.subTasks || [];
      const normalizedWorkstreams = normalizeWorkstreams(sourceWorkstreams);
      if (JSON.stringify(item.workstreams || []) !== JSON.stringify(normalizedWorkstreams)) {
        item.workstreams = normalizedWorkstreams;
        changed = true;
      }
      for (const entry of data.weeklyUpdates.filter((candidate) => candidate.itemId === item.id)) {
        if (entry.workstreamTitle === "General") {
          entry.workstreamTitle = DEFAULT_WORKSTREAM_TITLE;
          changed = true;
        }
        if (isPlaceholderWorkstreamTitle(entry.workstreamTitle)) {
          entry.workstreamId = "";
          entry.workstreamTitle = "";
          changed = true;
        }
        if (entry.workstreamTitle) continue;
        const inferred = inferWorkstreamFromProgress(item, entry.progress);
        if (inferred) {
          entry.workstreamId = inferred.id;
          entry.workstreamTitle = inferred.title;
        } else {
          const workstream = ensureWorkstream(item, { workstreamTitle: DEFAULT_WORKSTREAM_TITLE });
          entry.workstreamId = workstream.id;
          entry.workstreamTitle = workstream.title;
        }
        changed = true;
      }
    }
    changed = splitMergedWorkstreamItems(data) || changed;
    changed = normalizeAgentProductWorkstreams(data) || changed;
    return changed;
  }

  function normalizeTrackName(item) {
    if (item.productArea === "CBI" && item.segment === "B2B" && item.track === "Customer Support") {
      item.track = "POC & Customer Support";
      return true;
    }
    if (item.productArea === "CBI" && item.segment === "B2B" && item.track === "Regulatory Audit") {
      item.track = "Regulator";
      return true;
    }
    return false;
  }

  function normalizeAgentProductWorkstreams(data) {
    let changed = false;
    for (const item of data.updateItems) {
      const agentProduct = String(item.productWorkstream || item.title || "").match(/^(Agent\s+[A-Z]+)$/i)?.[1]?.replace(/\s+/g, " ").trim();
      const agentWithSuffix = String(item.productWorkstream || item.title || "").match(/^(Agent\s+[A-Z]+)\s+(.+)$/i);
      if (!agentProduct && !agentWithSuffix) continue;
      const product = agentProduct || agentWithSuffix[1].replace(/\s+/g, " ").trim();
      const suffix = agentWithSuffix?.[2]?.trim() || "";
      const entry = data.weeklyUpdates.find((candidate) => candidate.itemId === item.id);
      const entryTopic = String(entry?.progress || "").split(":")[0]?.trim();
      let nextTitle = item.title;
      if (suffix && item.title === `${product} ${suffix}`) {
        const topic = suffix.toLowerCase() === "brd" && /compliance review/i.test(entryTopic)
          ? "BRD Compliance Review"
          : `${suffix}${entryTopic && !entryTopic.toLowerCase().startsWith(suffix.toLowerCase()) ? ` ${entryTopic}` : entryTopic && entryTopic.toLowerCase().startsWith(suffix.toLowerCase()) ? ` ${entryTopic.slice(suffix.length).trim()}` : ""}`.trim();
        nextTitle = `${product} — ${topic}`;
      } else if (item.title === product && entryTopic && !entryTopic.startsWith(product)) {
        nextTitle = `${product} — ${entryTopic}`;
      }
      const existingWorkstream = (item.workstreams || []).find((workstream) => workstreamKey(workstream.title) === workstreamKey(product));
      const nextWorkstreams = [{ id: existingWorkstream?.id || crypto.randomUUID(), title: product, done: Boolean(existingWorkstream?.done) }];
      if (item.productWorkstream !== product) {
        item.productWorkstream = product;
        changed = true;
      }
      if (item.title !== nextTitle) {
        item.title = nextTitle;
        changed = true;
      }
      if (JSON.stringify(item.workstreams || []) !== JSON.stringify(nextWorkstreams)) {
        item.workstreams = nextWorkstreams;
        changed = true;
      }
      for (const entry of data.weeklyUpdates.filter((candidate) => candidate.itemId === item.id)) {
        const nextWorkstreamId = item.workstreams[0]?.id || entry.workstreamId;
        if (entry.workstreamTitle !== product) {
          entry.workstreamTitle = product;
          changed = true;
        }
        if (entry.workstreamId !== nextWorkstreamId) {
          entry.workstreamId = nextWorkstreamId;
          changed = true;
        }
      }
    }
    return changed;
  }

  function splitMergedWorkstreamItems(data) {
    let changed = false;
    const newItems = [];
    const itemsToRemove = new Set();
    for (const item of data.updateItems) {
      const entries = data.weeklyUpdates.filter((entry) => entry.itemId === item.id);
      const distinctEntryWorkstreams = [...new Set(entries.map((entry) => entry.workstreamTitle).filter((title) => title && title !== DEFAULT_WORKSTREAM_TITLE))];
      if (distinctEntryWorkstreams.length <= 1) continue;

      itemsToRemove.add(item.id);
      for (const workstreamTitle of distinctEntryWorkstreams) {
        const itemId = crypto.randomUUID();
        const workstream = { id: crypto.randomUUID(), title: item.productWorkstream || deriveProductWorkstreamTitle(item), done: false };
        const workstreamEntries = entries.filter((entry) => entry.workstreamTitle === workstreamTitle);
        const latestEntry = [...workstreamEntries].sort((a, b) => b.reportingWeek.localeCompare(a.reportingWeek) || b.submittedAt.localeCompare(a.submittedAt))[0];
        const newItem = {
          ...item,
          id: itemId,
          title: item.title === workstreamTitle ? item.title : `${item.productWorkstream || deriveProductWorkstreamTitle(item)} — ${workstreamTitle}`,
          description: item.description || `${workstreamTitle} under ${item.productWorkstream || deriveProductWorkstreamTitle(item)}.`,
          status: latestEntry?.status || item.status,
          workstreams: [workstream],
          subTasks: [],
          lastUpdatedBy: latestEntry?.lastUpdatedBy || item.lastUpdatedBy,
          lastUpdatedAt: latestEntry?.lastUpdatedAt || item.lastUpdatedAt,
        };
        for (const entry of workstreamEntries) {
          entry.itemId = itemId;
          entry.workstreamId = workstream.id;
          entry.workstreamTitle = workstream.title;
          entry.progress = String(entry.progress || "").replace(new RegExp(`^${escapeRegExp(workstreamTitle)}:\\s*`), "");
        }
        const firstDoneEntry = workstreamEntries
          .filter((entry) => entry.status === "Done")
          .sort((a, b) => a.reportingWeek.localeCompare(b.reportingWeek) || a.submittedAt.localeCompare(b.submittedAt))[0];
        if (firstDoneEntry) {
          newItem.doneWeek = firstDoneEntry.reportingWeek;
          newItem.doneDate = firstDoneEntry.lastUpdatedAt.slice(0, 10);
          newItem.lifecycleState = "Done";
        } else {
          newItem.doneWeek = "";
          newItem.doneDate = "";
          newItem.lifecycleState = newItem.archived ? "Archived" : "Active";
        }
        newItems.push(newItem);
      }
      changed = true;
    }
    if (changed) {
      data.updateItems = [...newItems, ...data.updateItems.filter((item) => !itemsToRemove.has(item.id))];
    }
    return changed;
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function inferWorkstreamFromProgress(item, progress = "") {
    const prefix = String(progress).split(":")[0]?.trim();
    if (!prefix) return null;
    return (item.workstreams || []).find((workstream) => workstreamKey(workstream.title) === workstreamKey(prefix)) || null;
  }

  function applyDoneState(item, status, at = new Date(), doneWeek = "") {
    if (status === "Done" && (!item.doneWeek || (doneWeek && weekToNumber(doneWeek) < weekToNumber(item.doneWeek)))) {
      item.doneDate = at.toISOString().slice(0, 10);
      item.doneWeek = doneWeek || currentReportingWeek(at);
      item.lifecycleState = "Done";
    }
    if (status !== "Done") {
      item.doneDate = "";
      item.doneWeek = "";
      item.lifecycleState = item.archived ? "Archived" : "Active";
    }
  }

  function lifecycleState(item) {
    if (item.archived) return "Archived";
    if (item.status === "Done" || item.doneWeek) return "Done";
    return "Active";
  }

  function lifecycleStateForWeek(item, selectedWeek) {
    if (item.archived) return "Archived";
    if (item.doneWeek && weekToNumber(item.doneWeek) <= weekToNumber(selectedWeek)) return "Done";
    return "Active";
  }

  function itemCreatedWeek(item) {
    if (item.createdWeek) return item.createdWeek;
    const createdAt = item.createdAt ? new Date(item.createdAt) : null;
    if (!createdAt || Number.isNaN(createdAt.getTime())) return "0000-00";
    return currentReportingWeek(createdAt);
  }

  function isVisibleInWeek(item, selectedWeek, options = {}) {
    if (item.archived && !options.includeArchived) return false;
    if (weekToNumber(itemCreatedWeek(item)) > weekToNumber(selectedWeek)) return false;
    if (!options.includeFutureDone && item.doneWeek && weekToNumber(item.doneWeek) < weekToNumber(selectedWeek)) return false;
    return true;
  }

  function matchesItemFilters(item, filters = {}) {
    if (filters.owner && item.owner !== filters.owner) return false;
    if (filters.productArea && item.productArea !== filters.productArea) return false;
    if (filters.segment && item.segment !== filters.segment) return false;
    if (filters.track && item.track !== filters.track) return false;
    if (filters.productWorkstream && item.productWorkstream !== filters.productWorkstream) return false;
    return true;
  }

  function getEffectiveStatus(data, item, selectedWeek) {
    const entry = data.weeklyUpdates
      .filter((candidate) => candidate.itemId === item.id && weekToNumber(candidate.reportingWeek) <= weekToNumber(selectedWeek))
      .sort((a, b) => b.reportingWeek.localeCompare(a.reportingWeek) || b.submittedAt.localeCompare(a.submittedAt))[0];
    if (entry) {
      const itemUpdatedAt = item.lastUpdatedAt ? new Date(item.lastUpdatedAt).getTime() : 0;
      const entryUpdatedAt = entry.lastUpdatedAt ? new Date(entry.lastUpdatedAt).getTime() : 0;
      if (itemUpdatedAt > entryUpdatedAt) return item.status;
      return entry.status;
    }
    if (item.status === "Done" && item.doneWeek && weekToNumber(item.doneWeek) > weekToNumber(selectedWeek)) return "Backlog";
    return item.status;
  }

  function getEntriesForItem(data, itemId) {
    return data.weeklyUpdates
      .filter((entry) => entry.itemId === itemId)
      .sort((a, b) => a.reportingWeek.localeCompare(b.reportingWeek) || a.submittedAt.localeCompare(b.submittedAt));
  }

  function recalculateItemFromEntries(data, item) {
    const entries = data.weeklyUpdates
      .filter((entry) => entry.itemId === item.id)
      .sort((a, b) => b.reportingWeek.localeCompare(a.reportingWeek) || b.submittedAt.localeCompare(a.submittedAt));
    if (!entries.length) return;
    const latest = entries[0];
    item.status = latest.status;
    item.lastUpdatedBy = latest.lastUpdatedBy;
    item.lastUpdatedAt = latest.lastUpdatedAt;
    const firstDoneEntry = [...entries]
      .filter((entry) => entry.status === "Done")
      .sort((a, b) => a.reportingWeek.localeCompare(b.reportingWeek) || a.submittedAt.localeCompare(b.submittedAt))[0];
    if (firstDoneEntry) {
      item.doneWeek = firstDoneEntry.reportingWeek;
      item.doneDate = firstDoneEntry.lastUpdatedAt.slice(0, 10);
      item.lifecycleState = "Done";
    } else {
      item.doneWeek = "";
      item.doneDate = "";
      item.lifecycleState = item.archived ? "Archived" : "Active";
    }
  }

  return {
    async getPasscodes() {
      const data = await readData();
      return data.passcodes;
    },

    async updatePasscodes(passcodes, actor) {
      const data = await readData();
      for (const [role, passcode] of Object.entries(passcodes || {})) {
        if (Object.hasOwn(defaultPasscodes, role) && String(passcode || "").trim()) {
          data.passcodes[role] = String(passcode).trim();
        }
      }
      data.settingsUpdatedBy = actor;
      data.settingsUpdatedAt = nowIso();
      await writeData(data);
      return data.passcodes;
    },

    async getPmAccounts() {
      const data = await readData();
      return data.pmAccounts;
    },

    async getPmAccount(accountId) {
      const data = await readData();
      return data.pmAccounts.find((account) => account.accountId === accountId && account.active) || null;
    },

    async getKnownOwners() {
      const data = await readData();
      return [...new Set(data.updateItems.map((item) => item.owner).filter(Boolean))];
    },

    async getKnownTracks(productArea, segment) {
      const data = await readData();
      const itemTracks = data.updateItems
        .filter((item) => item.productArea === productArea && item.segment === segment)
        .map((item) => item.track)
        .filter(Boolean);
      const customTracks = data.customTracks
        .filter((track) => track.productArea === productArea && track.segment === segment && !track.archived)
        .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name))
        .map((track) => track.name);
      return [...new Set([...customTracks, ...itemTracks])];
    },

    async getTracksByAreaSegment() {
      const data = await readData();
      const result = {};
      for (const area of productAreas) {
        for (const segment of getSegments(area)) {
          const key = `${area}::${segment}`;
          const custom = data.customTracks
            .filter((track) => track.productArea === area && track.segment === segment && !track.archived)
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name))
            .map((track) => track.name);
          result[key] = [...new Set([...getTracks(area, segment), ...custom])];
        }
      }
      return result;
    },

    async getCustomTracks() {
      const data = await readData();
      return data.customTracks;
    },

    async saveCustomTracks(tracks, actor) {
      const data = await readData();
      const timestamp = nowIso();
      data.customTracks = (Array.isArray(tracks) ? tracks : [])
        .map((track, index) => ({
          id: track.id || crypto.randomUUID(),
          productArea: String(track.productArea || "").trim(),
          segment: String(track.segment || "").trim(),
          name: String(track.name || "").trim(),
          archived: Boolean(track.archived),
          order: Number.isFinite(Number(track.order)) ? Number(track.order) : index,
          lastUpdatedBy: actor,
          lastUpdatedAt: timestamp,
        }))
        .filter((track) => productAreas.includes(track.productArea) && getSegments(track.productArea).includes(track.segment) && track.name)
        .sort((a, b) => a.productArea.localeCompare(b.productArea) || a.segment.localeCompare(b.segment) || a.order - b.order || a.name.localeCompare(b.name));
      await writeData(data);
      return data.customTracks;
    },

    async updatePmAccounts(accounts) {
      const data = await readData();
      const seen = new Set();
      data.pmAccounts = accounts
        .map((account) => ({
          accountId: normalizeAccountId(account.accountId),
          pmProfile: normalizePmProfile(account.pmProfile),
          active: Boolean(account.active),
        }))
        .filter((account) => account.accountId && account.pmProfile && !seen.has(account.accountId) && seen.add(account.accountId))
        .sort((a, b) => accountSortKey(a) - accountSortKey(b) || a.accountId.localeCompare(b.accountId));
      await writeData(data);
      return data.pmAccounts;
    },

    async getDashboard(selectedWeek, filters = {}, options = {}) {
      const data = await readData();
      const period = filters.period || "weekly";
      const periodRange = getPeriodRange(selectedWeek, period);
      const periodWeeks = new Set(periodRange.weeks);
      const useRawStatus = options.role === "admin";
      const productWorkstreamOptionItems = data.updateItems
        .filter((item) => isVisibleInWeek(item, selectedWeek, filters))
        .filter((item) => matchesItemFilters(item, { ...filters, productWorkstream: "" }))
        .map((item) => ({ ...item, status: useRawStatus ? item.status : getEffectiveStatus(data, item, selectedWeek) }))
        .filter((item) => !filters.status || item.status === filters.status);
      const filterOptions = {
        productWorkstreams: [...new Set(productWorkstreamOptionItems
          .map((item) => item.productWorkstream || deriveProductWorkstreamTitle(item))
          .filter(Boolean))]
          .sort((a, b) => a.localeCompare(b)),
      };
      const candidateItems = data.updateItems
        .filter((item) => isVisibleInWeek(item, selectedWeek, filters))
        .filter((item) => matchesItemFilters(item, filters));
      const items = candidateItems
        .map((item) => {
          const effectiveStatus = useRawStatus ? item.status : getEffectiveStatus(data, item, selectedWeek);
          const weekEntries = data.weeklyUpdates
            .filter((entry) => entry.itemId === item.id && periodWeeks.has(entry.reportingWeek))
            .sort((a, b) => b.reportingWeek.localeCompare(a.reportingWeek) || b.submittedAt.localeCompare(a.submittedAt));
          const latestByWorkstream = [];
          const seenWorkstreams = new Set();
          for (const entry of weekEntries) {
            const key = entry.workstreamId || entry.workstreamTitle || "General";
            if (seenWorkstreams.has(key)) continue;
            seenWorkstreams.add(key);
            latestByWorkstream.push(entry);
          }
          return {
            ...item,
            status: effectiveStatus,
            currentStatus: item.status,
            lifecycleState: lifecycleStateForWeek(item, selectedWeek),
            latestWeeklyUpdate: weekEntries[0] || null,
            weeklyUpdatesThisPeriod: weekEntries,
            timelineEntries: getEntriesForItem(data, item.id),
            latestByWorkstream,
            updatesThisWeek: weekEntries.length,
          };
        })
        .filter((item) => !filters.status || item.status === filters.status);
      const cards = Object.fromEntries(["Total Updates", ...STATUS_VALUES, "Current Week"].map((key) => [key, 0]));
      cards["Total Updates"] = items.length;
      const visibleIds = new Set(items.map((item) => item.id));
      cards["Current Week"] = data.weeklyUpdates.filter((entry) => periodWeeks.has(entry.reportingWeek) && visibleIds.has(entry.itemId)).length;
      for (const item of items) cards[item.status] = (cards[item.status] || 0) + 1;

      return {
        reportingWeek: selectedWeek,
        period,
        periodWeeks: periodRange.weeks,
        periodStart: periodRange.start.toISOString().slice(0, 10),
        periodEnd: periodRange.end.toISOString().slice(0, 10),
        cards,
        filterOptions,
        items,
      };
    },

    async getUpdateItemDetail(itemId) {
      const data = await readData();
      const item = data.updateItems.find((candidate) => candidate.id === itemId);
      if (!item) return null;
      return { ...item, lifecycleState: lifecycleState(item), weeklyUpdates: getEntriesForItem(data, itemId) };
    },

    async createUpdateItem(payload, actor) {
      const data = await readData();
      const timestamp = nowIso();
      const item = {
        id: crypto.randomUUID(),
        title: payload.title.trim(),
        description: String(payload.description || "").trim(),
        productWorkstream: String(payload.productWorkstream || payload.newProductWorkstream || payload.existingProductWorkstream || "").trim(),
        productArea: payload.productArea,
        segment: payload.segment,
        track: payload.track,
        owner: payload.owner,
        status: payload.status || "Backlog",
        isQaIssue: Boolean(payload.isQaIssue),
        blockerRisk: String(payload.blockerRisk || "").trim(),
        targetCompletionDate: payload.targetCompletionDate || "",
        relatedLinks: normalizeLinks(payload.relatedLinks),
        workstreams: normalizeWorkstreams(payload.productWorkstream || payload.newProductWorkstream || payload.existingProductWorkstream),
        subTasks: normalizeSubTasks(payload.subTasks),
        archived: false,
        archivedReason: "",
        lifecycleState: payload.status === "Done" ? "Done" : "Active",
        doneDate: "",
        doneWeek: "",
        createdBy: actor,
        createdAt: timestamp,
        lastUpdatedBy: actor,
        lastUpdatedAt: timestamp,
      };
      applyDoneState(item, item.status);
      data.updateItems.unshift(item);
      await writeData(data);
      return item;
    },

    async updateUpdateItem(itemId, payload, actor) {
      const data = await readData();
      const item = data.updateItems.find((candidate) => candidate.id === itemId);
      if (!item) return null;
      Object.assign(item, {
        title: payload.title.trim(),
        description: String(payload.description || "").trim(),
        productWorkstream: String(payload.productWorkstream || payload.newProductWorkstream || payload.existingProductWorkstream || "").trim(),
        productArea: payload.productArea,
        segment: payload.segment,
        track: payload.track,
        owner: payload.owner,
        status: payload.status,
        isQaIssue: Boolean(payload.isQaIssue),
        blockerRisk: String(payload.blockerRisk || "").trim(),
        targetCompletionDate: payload.targetCompletionDate || "",
        relatedLinks: normalizeLinks(payload.relatedLinks),
        workstreams: normalizeWorkstreams(payload.productWorkstream || payload.newProductWorkstream || payload.existingProductWorkstream),
        subTasks: normalizeSubTasks(payload.subTasks, item.subTasks),
        lastUpdatedBy: actor,
        lastUpdatedAt: nowIso(),
      });
      applySubTaskStates(item, payload.subTaskStates);
      applyDoneState(item, payload.status);
      await writeData(data);
      return item;
    },

    async archiveUpdateItem(itemId, archivedReason, actor) {
      const data = await readData();
      const item = data.updateItems.find((candidate) => candidate.id === itemId);
      if (!item) return null;
      item.archived = true;
      item.archivedReason = archivedReason.trim();
      item.lifecycleState = "Archived";
      item.lastUpdatedBy = actor;
      item.lastUpdatedAt = nowIso();
      await writeData(data);
      return item;
    },

    async createWeeklyUpdate(payload, actor) {
      const data = await readData();
      const item = data.updateItems.find((candidate) => candidate.id === payload.itemId);
      if (!item) return null;
      const workstream = ensureWorkstream(item, payload);
      const timestamp = nowIso();
      const entry = {
        id: crypto.randomUUID(),
        itemId: payload.itemId,
        workstreamId: workstream.id,
        workstreamTitle: workstream.title,
        reportingWeek: payload.reportingWeek,
        progress: String(payload.progress || "").trim(),
        nextStep: String(payload.nextStep || "").trim(),
        blockerRisk: String(payload.blockerRisk || "").trim(),
        status: payload.status,
        relatedLinks: normalizeLinks(payload.relatedLinks),
        submittedBy: actor,
        submittedAt: timestamp,
        lastUpdatedBy: actor,
        lastUpdatedAt: timestamp,
      };
      data.weeklyUpdates.unshift(entry);
      applySubTaskStates(item, payload.subTaskStates);
      item.status = payload.status;
      item.lastUpdatedBy = actor;
      item.lastUpdatedAt = timestamp;
      applyDoneState(item, payload.status, new Date(timestamp), payload.reportingWeek);
      await writeData(data);
      return entry;
    },

    async updateWeeklyUpdate(entryId, payload, actor) {
      const data = await readData();
      const entry = data.weeklyUpdates.find((candidate) => candidate.id === entryId);
      if (!entry) return null;
      const item = data.updateItems.find((candidate) => candidate.id === entry.itemId);
      if (!item) return null;
      const workstream = ensureWorkstream(item, payload);
      const timestamp = nowIso();
      Object.assign(entry, {
        workstreamId: workstream.id,
        workstreamTitle: workstream.title,
        reportingWeek: payload.reportingWeek,
        progress: String(payload.progress || "").trim(),
        nextStep: String(payload.nextStep || "").trim(),
        blockerRisk: String(payload.blockerRisk || "").trim(),
        status: payload.status,
        relatedLinks: normalizeLinks(payload.relatedLinks),
        lastUpdatedBy: actor,
        lastUpdatedAt: timestamp,
      });
      applySubTaskStates(item, payload.subTaskStates);
      recalculateItemFromEntries(data, item);
      await writeData(data);
      return entry;
    },

    async getPreviousUpdate(itemId, reportingWeek, excludeEntryId = "", workstreamId = "", workstreamTitle = "") {
      const data = await readData();
      const previous = data.weeklyUpdates
        .filter((entry) => entry.itemId === itemId && entry.id !== excludeEntryId && weekToNumber(entry.reportingWeek) <= weekToNumber(reportingWeek))
        .filter((entry) => {
          if (workstreamId) return entry.workstreamId === workstreamId;
          if (workstreamTitle) return workstreamKey(entry.workstreamTitle) === workstreamKey(workstreamTitle);
          return true;
        })
        .sort((a, b) => b.reportingWeek.localeCompare(a.reportingWeek) || b.submittedAt.localeCompare(a.submittedAt))[0];
      return { previousUpdate: previous || null };
    },

    async deleteUpdateItem(itemId) {
      const data = await readData();
      const before = data.updateItems.length;
      data.updateItems = data.updateItems.filter((item) => item.id !== itemId);
      data.weeklyUpdates = data.weeklyUpdates.filter((entry) => entry.itemId !== itemId);
      await writeData(data);
      return before !== data.updateItems.length;
    },

    async getArchivedItems() {
      const data = await readData();
      return data.updateItems
        .filter((item) => item.archived)
        .map((item) => {
          const entries = getEntriesForItem(data, item.id);
          const latest = [...entries].sort((a, b) => b.reportingWeek.localeCompare(a.reportingWeek) || b.submittedAt.localeCompare(a.submittedAt))[0] || null;
          return {
            ...item,
            lifecycleState: "Archived",
            latestWeeklyUpdate: latest,
            weeklyUpdatesThisPeriod: entries,
            timelineEntries: entries,
            updatesThisWeek: entries.length,
          };
        })
        .sort((a, b) => String(b.lastUpdatedAt || "").localeCompare(String(a.lastUpdatedAt || "")));
    },

    async getModules() {
      const data = await readData();
      return {
        announcements: data.announcements,
        meetings: data.meetings,
        marketing: data.marketingAssets,
        capacity: data.capacity,
      };
    },

    async getConfigSnapshot() {
      const data = await readData();
      const tracksByAreaSegment = {};
      for (const area of productAreas) {
        for (const segment of getSegments(area)) {
          const key = `${area}::${segment}`;
          const custom = data.customTracks
            .filter((track) => track.productArea === area && track.segment === segment && !track.archived)
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0) || a.name.localeCompare(b.name))
            .map((track) => track.name);
          tracksByAreaSegment[key] = [...new Set([...getTracks(area, segment), ...custom])];
        }
      }
      return {
        pmAccounts: data.pmAccounts,
        pmProfiles: [...new Set([...pmProfiles, ...data.pmAccounts.map((account) => account.pmProfile).filter(Boolean), ...data.updateItems.map((item) => item.owner).filter(Boolean)])],
        tracksByAreaSegment,
        customTracks: data.customTracks,
        modules: {
          announcements: data.announcements,
          meetings: data.meetings,
          marketing: data.marketingAssets,
          capacity: data.capacity,
        },
      };
    },

    async createAnnouncement(payload, actor) {
      const data = await readData();
      const timestamp = nowIso();
      const announcement = {
        id: crypto.randomUUID(),
        title: String(payload.title || "").trim(),
        body: String(payload.body || "").trim(),
        week: String(payload.week || "").trim(),
        type: String(payload.type || "Info").trim(),
        productArea: String(payload.productArea || "").trim(),
        priority: String(payload.priority || "Normal").trim(),
        validUntil: String(payload.validUntil || "").trim(),
        visibility: String(payload.visibility || "All").trim(),
        archived: Boolean(payload.archived),
        relatedLinks: normalizeModuleLinks(payload.relatedLinks),
        createdBy: actor,
        createdAt: timestamp,
        lastUpdatedBy: actor,
        lastUpdatedAt: timestamp,
      };
      data.announcements.unshift(announcement);
      await writeData(data);
      return announcement;
    },

    async updateAnnouncement(id, payload, actor) {
      const data = await readData();
      const announcement = data.announcements.find((item) => item.id === id);
      if (!announcement) return null;
      Object.assign(announcement, {
        title: String(payload.title || "").trim(),
        body: String(payload.body || "").trim(),
        week: String(payload.week || "").trim(),
        type: String(payload.type || announcement.type || "Info").trim(),
        productArea: String(payload.productArea || "").trim(),
        priority: String(payload.priority || "Normal").trim(),
        validUntil: String(payload.validUntil || "").trim(),
        visibility: String(payload.visibility || "All").trim(),
        archived: Boolean(payload.archived),
        relatedLinks: normalizeModuleLinks(payload.relatedLinks),
        lastUpdatedBy: actor,
        lastUpdatedAt: nowIso(),
      });
      await writeData(data);
      return announcement;
    },

    async deleteAnnouncement(id) {
      const data = await readData();
      const before = data.announcements.length;
      data.announcements = data.announcements.filter((item) => item.id !== id);
      await writeData(data);
      return before !== data.announcements.length;
    },

    async createMeeting(payload, actor) {
      const data = await readData();
      const timestamp = nowIso();
      const meeting = {
        id: crypto.randomUUID(),
        title: String(payload.title || "").trim(),
        meetingType: String(payload.meetingType || "Weekly Review").trim(),
        meetingDate: String(payload.meetingDate || "").trim(),
        reportingWeek: String(payload.reportingWeek || "").trim(),
        productArea: String(payload.productArea || "").trim(),
        relatedUpdateItemId: String(payload.relatedUpdateItemId || "").trim(),
        owner: String(payload.owner || actor).trim(),
        participants: String(payload.participants || "").trim(),
        agenda: String(payload.agenda || "").trim(),
        notes: String(payload.notes || "").trim(),
        decisions: String(payload.decisions || "").trim(),
        actionItems: normalizeSubTasks(payload.actionItems),
        attachments: normalizeModuleLinks(payload.attachments || payload.relatedLinks),
        status: String(payload.status || "Open").trim(),
        createdBy: actor,
        createdAt: timestamp,
        lastUpdatedBy: actor,
        lastUpdatedAt: timestamp,
      };
      data.meetings.unshift(meeting);
      await writeData(data);
      return meeting;
    },

    async updateMeeting(id, payload, actor) {
      const data = await readData();
      const meeting = data.meetings.find((item) => item.id === id);
      if (!meeting) return null;
      Object.assign(meeting, {
        title: String(payload.title || "").trim(),
        meetingType: String(payload.meetingType || "Weekly Review").trim(),
        meetingDate: String(payload.meetingDate || "").trim(),
        reportingWeek: String(payload.reportingWeek || "").trim(),
        productArea: String(payload.productArea || "").trim(),
        relatedUpdateItemId: String(payload.relatedUpdateItemId || "").trim(),
        owner: String(payload.owner || actor).trim(),
        participants: String(payload.participants || "").trim(),
        agenda: String(payload.agenda || "").trim(),
        notes: String(payload.notes || "").trim(),
        decisions: String(payload.decisions || "").trim(),
        actionItems: normalizeSubTasks(payload.actionItems),
        attachments: normalizeModuleLinks(payload.attachments || payload.relatedLinks),
        status: String(payload.status || "Open").trim(),
        lastUpdatedBy: actor,
        lastUpdatedAt: nowIso(),
      });
      await writeData(data);
      return meeting;
    },

    async deleteMeeting(id) {
      const data = await readData();
      const before = data.meetings.length;
      data.meetings = data.meetings.filter((item) => item.id !== id);
      await writeData(data);
      return before !== data.meetings.length;
    },

    async createMarketingAsset(payload, actor) {
      const data = await readData();
      const timestamp = nowIso();
      const status = String(payload.status || "Backlog").trim();
      const asset = {
        id: crypto.randomUUID(),
        title: String(payload.title || "").trim(),
        productArea: String(payload.productArea || "").trim(),
        relatedUpdateItemId: String(payload.relatedUpdateItemId || payload.launchItemId || "").trim(),
        type: String(payload.type || payload.channel || "Internal enablement").trim(),
        owner: String(payload.owner || "").trim(),
        pmReviewer: String(payload.pmReviewer || "").trim(),
        status,
        description: String(payload.description || payload.notes || "").trim(),
        draftLink: String(payload.draftLink || payload.link || "").trim(),
        internalVersionLink: String(payload.internalVersionLink || "").trim(),
        finalVersionLink: String(payload.finalVersionLink || "").trim(),
        pmFeedback: String(payload.pmFeedback || "").trim(),
        targetCompletionDate: String(payload.targetCompletionDate || "").trim(),
        completedDate: String(payload.completedDate || "").trim(),
        archived: Boolean(payload.archived) || status === "Archived",
        launchItemId: String(payload.relatedUpdateItemId || payload.launchItemId || "").trim(),
        channel: String(payload.type || payload.channel || "Internal enablement").trim(),
        link: String(payload.finalVersionLink || payload.internalVersionLink || payload.draftLink || payload.link || "").trim(),
        notes: String(payload.description || payload.notes || "").trim(),
        createdBy: actor,
        createdAt: timestamp,
        lastUpdatedBy: actor,
        lastUpdatedAt: timestamp,
      };
      data.marketingAssets.unshift(asset);
      await writeData(data);
      return asset;
    },

    async updateMarketingAsset(id, payload, actor) {
      const data = await readData();
      const asset = data.marketingAssets.find((item) => item.id === id);
      if (!asset) return null;
      const status = String(payload.status || asset.status || "Backlog").trim();
      Object.assign(asset, {
        title: String(payload.title || "").trim(),
        productArea: String(payload.productArea || "").trim(),
        relatedUpdateItemId: String(payload.relatedUpdateItemId || payload.launchItemId || "").trim(),
        type: String(payload.type || payload.channel || "Internal enablement").trim(),
        owner: String(payload.owner || "").trim(),
        pmReviewer: String(payload.pmReviewer || "").trim(),
        status,
        description: String(payload.description || payload.notes || "").trim(),
        draftLink: String(payload.draftLink || payload.link || "").trim(),
        internalVersionLink: String(payload.internalVersionLink || "").trim(),
        finalVersionLink: String(payload.finalVersionLink || "").trim(),
        pmFeedback: String(payload.pmFeedback || "").trim(),
        targetCompletionDate: String(payload.targetCompletionDate || "").trim(),
        completedDate: String(payload.completedDate || "").trim(),
        archived: Boolean(payload.archived) || status === "Archived",
        launchItemId: String(payload.relatedUpdateItemId || payload.launchItemId || "").trim(),
        channel: String(payload.type || payload.channel || "Internal enablement").trim(),
        link: String(payload.finalVersionLink || payload.internalVersionLink || payload.draftLink || payload.link || "").trim(),
        notes: String(payload.description || payload.notes || "").trim(),
        lastUpdatedBy: actor,
        lastUpdatedAt: nowIso(),
      });
      await writeData(data);
      return asset;
    },

    async deleteMarketingAsset(id) {
      const data = await readData();
      const before = data.marketingAssets.length;
      data.marketingAssets = data.marketingAssets.filter((item) => item.id !== id);
      await writeData(data);
      return before !== data.marketingAssets.length;
    },

    async saveCapacity(payload, actor) {
      const data = await readData();
      const timestamp = nowIso();
      const normalizeCapacityValue = (value) => (value === "" || value === null || value === undefined ? "" : Number(value || 0));
      data.capacity = {
        metricDefinition: String(payload.metricDefinition || data.capacity?.metricDefinition || "").trim(),
        summary: payload.summary || data.capacity?.summary || {},
        records: Array.isArray(payload.records)
          ? payload.records.map((record) => ({
              id: record.id || crypto.randomUUID(),
              initials: String(record.initials || "").trim(),
              pmName: String(record.pmName || "").trim(),
              status: String(record.status || "Active").trim(),
              roleScope: String(record.roleScope || "").trim(),
              activeSince: String(record.activeSince || "").trim(),
              q1: normalizeCapacityValue(record.q1),
              q1Total: normalizeCapacityValue(record.q1Total),
              q1Alert: Boolean(record.q1Alert),
              q2: normalizeCapacityValue(record.q2),
              q2Total: normalizeCapacityValue(record.q2Total),
              q2Alert: Boolean(record.q2Alert),
              q3: normalizeCapacityValue(record.q3),
              q3Total: normalizeCapacityValue(record.q3Total),
              q3Alert: Boolean(record.q3Alert),
              q4: normalizeCapacityValue(record.q4),
              q4Total: normalizeCapacityValue(record.q4Total),
              q4Alert: Boolean(record.q4Alert),
              notes: String(record.notes || "").trim(),
            })).filter((record) => record.pmName)
          : data.capacity?.records || [],
        lastUpdatedBy: actor,
        lastUpdatedAt: timestamp,
      };
      await writeData(data);
      return data.capacity;
    },
  };
}
