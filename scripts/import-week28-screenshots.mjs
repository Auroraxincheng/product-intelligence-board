import { readFile, writeFile } from "node:fs/promises";
import crypto from "node:crypto";

const storePath = new URL("../data/store.json", import.meta.url);
const SOURCE = "Week 28 Screenshot Import";
const WEEK = "2026-28";
const IMPORTED_AT = "2026-07-06T02:30:00.000Z";
const DONE_DATE = "2026-07-06";

const statusValues = new Set(["Backlog", "Planning", "In Progress", "Development", "Testing", "Live", "Blocked", "Done"]);

const rows = [
  {
    productArea: "CBI",
    segment: "B2B",
    track: "Product",
    productWorkstream: "Enhanced Bureau Alternative Score",
    detail: "Final Pricing",
    owner: "Arbi",
    status: "In Progress",
    targetCompletionDate: "2026-06-30",
    copyHistoryFromAggregate: true,
    progress:
      "Final pricing is in progress. Related supporting items for slider request, parameter DoB, BD training, and API document are completed.",
    nextStep: "Follow up remaining final pricing item.",
    subTasks: [
      ["1 Slider Request Parameter Adding DoB", true],
      ["E-BAS Training to BD", true],
      ["E-BAS API Document", true],
    ],
  },
  {
    productArea: "CBI",
    segment: "B2B",
    track: "Product",
    productWorkstream: "Income Prediction v2",
    detail: "Generate 40k+ label",
    owner: "Arbi",
    status: "In Progress",
    targetCompletionDate: "2026-07-31",
    progress: "40k+ label generation and modelling are in progress. Label generation from Atlastat is done.",
    nextStep: "Continue modelling and label generation follow-up.",
    subTasks: [
      ["Generate label from Atlastat", true],
      ["Modelling", false],
      ["Generate 40k+ label", false],
    ],
  },
  {
    productArea: "CBI",
    segment: "B2B",
    track: "Product",
    productWorkstream: "Bureau Telco Score",
    detail: "Telkomsel CBI Features - API Wrapper",
    owner: "Arbi",
    status: "Blocked",
    progress: "Telkomsel CBI Features - API Wrapper is delayed; pricing remains in progress.",
    nextStep: "Follow up API wrapper and pricing readiness.",
    blockerRisk: "Delay shown on Week 28 board.",
    subTasks: [
      ["Telkomsel CBI Features - API Wrapper", false],
      ["Pricing", false],
    ],
  },
  ...[
    ["Polaris", "BAF Access Preparation", "In Progress", "Andre W.", "BAF Access Preparation remains in progress."],
    ["CIMB Polaris", "General Support", "In Progress", "Andre W.", "General support remains in progress.", true],
    ["GTF Full Version Cost Finalization", "GTF Full Version Cost Finalization", "Testing", "Andre W.", "Cost finalization is under review."],
    ["Polaris", "Pak Suparman DS Requests", "In Progress", "Andre W.", "Pak Suparman DS Requests remain in progress."],
  ].map(([productWorkstream, detail, status, owner, progress, copyHistoryFromAggregate]) => ({
    productArea: "CBI",
    segment: "B2B",
    track: "POC & Customer Support",
    productWorkstream,
    detail,
    owner,
    status,
    copyHistoryFromAggregate,
    progress,
    nextStep: status === "Testing" ? "Continue review and follow-up." : "Continue follow-up.",
  })),
  {
    productArea: "CBI",
    segment: "B2B",
    track: "Regulator",
    productWorkstream: "OJK Audit",
    detail: "Sample Output & BAST Prep",
    owner: "Andre W.",
    status: "In Progress",
    copyHistoryFromAggregate: true,
    progress: "Sample output and BAST preparation remain in progress.",
    nextStep: "Continue preparation and follow-up.",
  },
  {
    productArea: "CBI",
    segment: "B2B",
    track: "Regulator",
    productWorkstream: "OJK New Policy",
    detail: "< IDR 1Million SLIK Reporting",
    owner: "Yuxuan Leck",
    status: "Blocked",
    targetCompletionDate: "2026-07-03",
    progress: "OJK New Policy on < IDR 1Million SLIK Reporting is delayed.",
    nextStep: "Follow up reporting policy readiness.",
    blockerRisk: "Delay shown on Week 28 board.",
  },
  {
    productArea: "CBI",
    segment: "B2B",
    track: "Regulator",
    productWorkstream: "OJK Audit",
    detail: "Audit Session for Telcoscore, SkipTracing, Enhanced BAS",
    owner: "Arbi",
    status: "Blocked",
    targetCompletionDate: "2026-06-26",
    progress: "Audit session for Telcoscore, SkipTracing, and Enhanced BAS is delayed.",
    nextStep: "Follow up audit session closure.",
    blockerRisk: "Delay shown on Week 28 board.",
  },
  ...[
    ["Project Preview", "Project Preview", "In Progress", "Andre W.", "Project preview remains in progress."],
    ["JULO", "Polaris Discussion", "In Progress", "Andre W.", "JULO Polaris discussion remains in progress.", undefined, true],
    ["BSN", "Custom Report on Server (Proposal)", "Testing", "Andre W.", "Custom report on server proposal is under review.", undefined, true],
    ["Partnership - Gtech", "Shopper Profile API", "In Progress", "Arbi", "GTF to POC on Shopper Profile result will determine whether to move ahead with this partnership.", "2026-07-31"],
  ].map(([productWorkstream, detail, status, owner, progress, targetCompletionDate, copyHistoryFromAggregate]) => ({
    productArea: "CBI",
    segment: "B2B",
    track: "Presales & Partnerships",
    productWorkstream,
    detail,
    owner,
    status,
    targetCompletionDate,
    copyHistoryFromAggregate,
    progress,
    nextStep: status === "Testing" ? "Continue review." : "Continue follow-up.",
  })),
  {
    productArea: "CBI",
    segment: "B2B",
    track: "QA Work Update",
    productWorkstream: "[QA] Wali",
    detail: "Log Statistics",
    owner: "Jonatan Sihombing",
    status: "Done",
    targetCompletionDate: "2026-06-18",
    progress:
      "UAT testing for Log Service was performed. Issues with service options display were resolved after discussion with PM and Product Manager, with a requested display change. Multiple services issue found in file download; waiting for production deployment for further testing and validation.",
    nextStep: "Monitor production deployment and validate further testing.",
    subTasks: [
      ["Create Test Case", true],
      ["UAT Testing Execution", true],
      ["Production Testing", false],
    ],
  },
  {
    productArea: "CBI",
    segment: "SME",
    track: "SME 1.0",
    productWorkstream: "SME Bureau Phase 3",
    detail: "Target Go-Live 15 July",
    owner: "Kintan",
    status: "In Progress",
    targetCompletionDate: "2025-07-15",
    copyHistoryFromAggregate: true,
    progress: "Target Go-Live 15 July remains in progress.",
    nextStep: "Continue go-live follow-up.",
  },
  {
    productArea: "CBI",
    segment: "SME",
    track: "SME 2.0",
    productWorkstream: "Security Testing Sign-Off",
    detail: "Security Testing Sign-Off",
    owner: "Kintan",
    status: "Blocked",
    targetCompletionDate: "2026-06-25",
    progress:
      "All deployment actions for SME have prerequisite functional testing, UAT testing, and security testing. Both SME 1.0 and 2.0 deployments are carried out only after these tests have been cleared.",
    nextStep: "Clear functional, UAT, and security testing prerequisites.",
    blockerRisk: "Security testing sign-off is delayed.",
  },
  ...[
    ["Data Partner", "Ginee Integration", "Planning", "Kintan", "Ginee Integration remains in planning."],
    ["Data Partner", "Finpay & ESB", "Planning", "Kintan", "Finpay & ESB remains in planning."],
  ].map(([productWorkstream, detail, status, owner, progress]) => ({
    productArea: "CBI",
    segment: "SME",
    track: "SME Partnership",
    productWorkstream,
    detail,
    owner,
    status,
    progress,
    nextStep: "Continue partner follow-up.",
  })),
  {
    productArea: "CBI",
    segment: "SME",
    track: "Product Features",
    productWorkstream: "Sapa UMKM Integration",
    detail: "Content & Video",
    owner: "Kintan",
    status: "In Progress",
    copyHistoryFromAggregate: true,
    progress: "Content and video work remains in progress.",
    nextStep: "Continue follow-up.",
  },
  {
    productArea: "CBP",
    segment: "B2B",
    track: "Product",
    productWorkstream: "Credit Report via Advance Tier",
    detail: "[AT] Credit Report - Individual API v1.0.0",
    owner: "Yao Kun",
    status: "Planning",
    targetCompletionDate: "2026-10-31",
    progress: "Credit Report via Advance Tier review is in progress.",
    nextStep: "Continue review follow-up.",
  },
  ...[
    ["CIC Accreditation", "Advance Tier Schema Review", "In Progress", "Yao Kun", "Advance Tier Schema Review remains in progress.", true],
    ["Income / Telco Product Strategy", "90%", "In Progress", "Yao Kun", "Income / Telco Product Strategy is at 90% and remains in progress.", true],
  ].map(([productWorkstream, detail, status, owner, progress, copyHistoryFromAggregate]) => ({
    productArea: "CBP",
    segment: "B2B",
    track: "Presales & Partnerships",
    productWorkstream,
    detail,
    owner,
    status,
    copyHistoryFromAggregate,
    progress,
    nextStep: "Continue follow-up.",
  })),
  {
    productArea: "CBP",
    segment: "B2B",
    track: "Projects",
    productWorkstream: "Advance Tier",
    detail: "Direct access to CIC database instead of getting through API",
    owner: "Yao Kun",
    status: "In Progress",
    targetCompletionDate: "2026-12-31",
    progress:
      "Direct access to CIC database instead of getting through API is in progress. Live data from CIC and engineer resource planning for search/score are in progress.",
    nextStep: "Continue engineering resource planning and CIC data access follow-up.",
    subTasks: [
      ["Live data from CIC", false],
      ["Engineer resource planning for search, score", false],
    ],
  },
  {
    productArea: "CBP",
    segment: "SME",
    track: "SME Webapp",
    productWorkstream: "BRD Concept",
    detail: "MiniApp",
    owner: "Min Hou",
    status: "Planning",
    targetCompletionDate: "2026-12-31",
    progress: "BRD Concept - MiniApp is in planning. Demo is complete.",
    nextStep: "Continue BRD concept follow-up.",
    subTasks: [["Demo", true]],
  },
  {
    productArea: "CBP",
    segment: "SME",
    track: "SME Partnership",
    productWorkstream: "Philippines SME Bureau",
    detail: "Gcash Discussion",
    owner: "Min Hou",
    status: "Planning",
    targetCompletionDate: "2026-08-31",
    copyHistoryFromAggregate: true,
    progress: "Philippines SME Bureau Gcash Discussion remains in planning. Data is TBC.",
    nextStep: "Continue GCash discussion follow-up.",
  },
  {
    productArea: "CBP",
    segment: "SME",
    track: "Presales & Discovery",
    productWorkstream: "Discussion With GCash",
    detail: "SME Backoffice",
    owner: "Min Hou",
    status: "Planning",
    targetCompletionDate: "2026-08-31",
    progress: "Meeting with GCash is scheduled / policy follow-up shown on Week 28 board.",
    nextStep: "Continue meeting and policy follow-up.",
    subTasks: [["Meeting With GCash", false]],
  },
  {
    productArea: "CBP",
    segment: "D2C",
    track: "Underlying API",
    productWorkstream: "D2C Credit Report API",
    detail: "Product Factsheet",
    owner: "Martin",
    status: "Live",
    targetCompletionDate: "2026-06-04",
    progress: "Product Factsheet is live. Pricing - Pending Finance (Finalise Stage) remains in progress.",
    nextStep: "Monitor product factsheet and continue pricing finalisation follow-up.",
    subTasks: [
      ["Product factsheet", true],
      ["Pricing - Pending Finance (Finalise Stage)", false],
    ],
  },
  {
    productArea: "CBP",
    segment: "D2C",
    track: "Web App",
    productWorkstream: "Product Requirement Document",
    detail: "Web-based D2C Credit Report Portal",
    owner: "Martin",
    status: "In Progress",
    targetCompletionDate: "2026-09-30",
    progress: "Web-based D2C Credit Report Portal product requirement document is in progress.",
    nextStep: "Continue PRD follow-up.",
  },
  {
    productArea: "AI Agents",
    segment: "AI Agents",
    track: "Agent KIM",
    productWorkstream: "Agent KIM",
    detail: "ID - Commercial Training",
    owner: "Fadlim",
    status: "Done",
    targetCompletionDate: "2026-07-31",
    progress:
      "AAI BD Training on KIM - ID: pricing reference and training are complete; Agent KIM AAI Market Plan remains in progress.",
    nextStep: "Continue market plan follow-up.",
    subTasks: [
      ["Pricing Reference (Ballpark)", true],
      ["Training", true],
      ["Agent KIM AAI - Market Plan", false],
    ],
  },
  ...[
    ["Agent SHIELD", "Agent SHIELD", "PH - Product walkthrough with BD & Compliance", "In Progress", "Min Hou", "Product walkthrough with BD & Compliance is done. BD & Compliance & Product team feedback remains in progress.", "Continue feedback follow-up."],
    ["Agent SHIELD", "Agent SHIELD", "Collection Signal with Lenderlink", "Planning", "Min Hou", "Collection Signal with Lenderlink remains in planning.", "Continue follow-up."],
    ["Agent POLAR", "Agent POLAR", "Compliance Clearance Pending", "Testing", "Fadlim", "Compliance Clearance Pending is under review/testing.", "Continue compliance clearance follow-up."],
    ["Agent POLAR", "Agent POLAR", "BRD Compliance Review", "Testing", "Fadlim", "OJK Compliance Review remains under review/testing.", "Continue BRD/OJK compliance review follow-up."],
    ["Agent NORI", "Agent NORI", "Feature Improvements + Sales Ops Handover", "In Progress", "Aaron", "Feature Improvements + Sales Ops Handover remains in progress.", "Continue handover follow-up."],
    ["Agent ORLA-HR", "Agent ORLA-HR", "Bug Fix + Gemini Judge", "In Progress", "Aaron", "Bug Fix + Gemini Judge remains in progress.", "Continue bug fix follow-up.", true],
  ].map(([track, productWorkstream, detail, status, owner, progress, nextStep, copyHistoryFromAggregate]) => ({
    productArea: "AI Agents",
    segment: "AI Agents",
    track,
    productWorkstream,
    detail,
    owner,
    status,
    copyHistoryFromAggregate,
    progress,
    nextStep,
  })),
];

function normalize(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
}

function titleFor(row) {
  return normalize(row.detail) === normalize(row.productWorkstream)
    ? row.productWorkstream
    : `${row.productWorkstream} — ${row.detail}`;
}

function itemKey(item) {
  return [
    item.productArea,
    item.segment,
    item.track,
    item.productWorkstream || String(item.title || "").split(/\s+[—–-]\s+/)[0],
    item.title,
  ]
    .map(normalize)
    .join("|");
}

function rowKey(row) {
  return [row.productArea, row.segment, row.track, row.productWorkstream, titleFor(row)].map(normalize).join("|");
}

function subTasks(row) {
  return (row.subTasks || []).map(([title, done]) => ({
    id: crypto.randomUUID(),
    title,
    done,
  }));
}

function ensureItem(data, row) {
  const desiredKey = rowKey(row);
  let item = data.updateItems.find((candidate) => itemKey(candidate) === desiredKey);
  if (item) return item;

  const workstreamId = crypto.randomUUID();
  item = {
    id: crypto.randomUUID(),
    title: titleFor(row),
    description: `${row.productWorkstream} Week 28 screenshot item.`,
    productArea: row.productArea,
    segment: row.segment,
    track: row.track,
    owner: row.owner,
    status: row.status,
    targetCompletionDate: row.targetCompletionDate || "",
    relatedLinks: [],
    subTasks: subTasks(row),
    archived: false,
    archivedReason: "",
    doneDate: row.status === "Done" ? DONE_DATE : "",
    doneWeek: row.status === "Done" ? WEEK : "",
    createdBy: SOURCE,
    createdAt: IMPORTED_AT,
    lastUpdatedBy: SOURCE,
    lastUpdatedAt: IMPORTED_AT,
    workstreams: [{ id: workstreamId, title: row.productWorkstream, done: row.status === "Done" }],
    productWorkstream: row.productWorkstream,
    lifecycleState: row.status === "Done" ? "Done" : "Active",
  };
  data.updateItems.push(item);
  return item;
}

function updateItemFromRow(item, row) {
  item.productWorkstream = row.productWorkstream;
  item.owner = row.owner || item.owner;
  item.status = row.status;
  item.targetCompletionDate = row.targetCompletionDate || item.targetCompletionDate || "";
  item.lastUpdatedBy = SOURCE;
  item.lastUpdatedAt = IMPORTED_AT;
  item.lifecycleState = row.status === "Done" ? "Done" : item.archived ? "Archived" : "Active";
  if (row.subTasks?.length) item.subTasks = subTasks(row);
  if (row.status === "Done") {
    item.doneDate = item.doneDate || DONE_DATE;
    item.doneWeek = item.doneWeek || WEEK;
  }
  const workstream = item.workstreams?.[0] || { id: crypto.randomUUID() };
  workstream.title = row.productWorkstream;
  workstream.done = row.status === "Done";
  item.workstreams = [workstream];
  return workstream;
}

function copyAggregateHistory(data, item, row) {
  if (!row.copyHistoryFromAggregate) return;
  const aggregate = data.updateItems.find((candidate) =>
    candidate.id !== item.id &&
    candidate.createdBy !== SOURCE &&
    normalize(candidate.productArea) === normalize(row.productArea) &&
    normalize(candidate.segment) === normalize(row.segment) &&
    normalize(candidate.track) === normalize(row.track) &&
    normalize(candidate.productWorkstream || candidate.title) === normalize(row.productWorkstream) &&
    normalize(candidate.title) === normalize(row.productWorkstream)
  );
  if (!aggregate) return;

  const existingWeeks = new Set(data.weeklyUpdates.filter((entry) => entry.itemId === item.id).map((entry) => `${entry.reportingWeek}|${entry.progress}|${entry.status}`));
  for (const entry of data.weeklyUpdates.filter((candidate) => candidate.itemId === aggregate.id)) {
    const key = `${entry.reportingWeek}|${entry.progress}|${entry.status}`;
    if (existingWeeks.has(key)) continue;
    data.weeklyUpdates.push({
      ...entry,
      id: crypto.randomUUID(),
      itemId: item.id,
      workstreamId: item.workstreams[0].id,
      workstreamTitle: row.productWorkstream,
      importedFromAggregateItemId: aggregate.id,
    });
    existingWeeks.add(key);
  }

  aggregate.archived = true;
  aggregate.archivedReason = `Superseded by split Week 28 item: ${item.title}`;
  aggregate.lifecycleState = "Archived";
  aggregate.lastUpdatedBy = SOURCE;
  aggregate.lastUpdatedAt = IMPORTED_AT;
}

const data = JSON.parse(await readFile(storePath, "utf8"));
const importedItemIds = new Set(data.updateItems.filter((item) => item.createdBy === SOURCE).map((item) => item.id));

data.weeklyUpdates = data.weeklyUpdates.filter(
  (entry) => entry.submittedBy !== SOURCE && entry.lastUpdatedBy !== SOURCE && !entry.importedFromAggregateItemId && !importedItemIds.has(entry.itemId),
);
data.updateItems = data.updateItems.filter((item) => item.createdBy !== SOURCE);

const seenRows = new Set();
for (const row of rows) {
  if (!statusValues.has(row.status)) throw new Error(`Unsupported status: ${row.status}`);
  const key = rowKey(row);
  if (seenRows.has(key)) throw new Error(`Duplicate import row: ${key}`);
  seenRows.add(key);

  const item = ensureItem(data, row);
  const workstream = updateItemFromRow(item, row);
  copyAggregateHistory(data, item, row);
  data.weeklyUpdates.push({
    id: crypto.randomUUID(),
    itemId: item.id,
    workstreamId: workstream.id,
    workstreamTitle: row.productWorkstream,
    reportingWeek: WEEK,
    progress: row.progress,
    nextStep: row.nextStep,
    blockerRisk: row.blockerRisk || "",
    status: row.status,
    relatedLinks: [],
    submittedBy: SOURCE,
    submittedAt: IMPORTED_AT,
    lastUpdatedBy: SOURCE,
    lastUpdatedAt: IMPORTED_AT,
  });
}

await writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`);

const byPath = rows.reduce((acc, row) => {
  const path = `${row.productArea} > ${row.segment} > ${row.track}`;
  acc[path] = (acc[path] || 0) + 1;
  return acc;
}, {});

console.log(
  JSON.stringify(
    {
      importedWeek: WEEK,
      entries: rows.length,
      totalItems: data.updateItems.length,
      totalWeeklyUpdates: data.weeklyUpdates.length,
      byPath,
    },
    null,
    2,
  ),
);
