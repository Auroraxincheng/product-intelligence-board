import { readFile, writeFile } from "node:fs/promises";

const storePath = new URL("../data/store.json", import.meta.url);
const data = JSON.parse(await readFile(storePath, "utf8"));

data.capacity = {
  metricDefinition: "PM Timesheet. Capacity is recorded in PD by quarter. Red values indicate over-capacity or exception items.",
  summary: {
    totalPd: 822,
    activePm: 12,
    averagePd: 68.5,
    totalQuarters: { q1: 822, q2: 0, q3: 0, q4: 0 },
    activeQuarters: { q1: 11, q2: 13, q3: 12, q4: 12 },
    averageQuarters: { q1: 74.7, q2: 0, q3: 0, q4: 0 },
  },
  records: [
    { initials: "AS", pmName: "Abdul Mugni Syafii", status: "Active", roleScope: "Q4 · D2C (CBI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 67, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "AK", pmName: "Anisya Kharisman", status: "Active", roleScope: "Q4 · SME (CBI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 118, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "AI", pmName: "Andre Wiryadi Dana (Andre)", status: "Transfer", roleScope: "PM · B2B (CBI) · w.e.f. 01 Jul 2026", activeSince: "01 Jul 2026", q1: 60, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: "", q3Total: 66, q4: "", q4Total: 66 },
    { initials: "AK", pmName: "Arbi Kusuma", status: "Active", roleScope: "PM · B2B (CBI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 60, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "F", pmName: "Fadlim", status: "Active", roleScope: "PM · B2B, AI Agent (AAI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 80, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "J", pmName: "Jolly Ann Bilad (Julia)", status: "Resign", roleScope: "PM · B2B (CBP) · w.e.f. 01 Jan 2026", activeSince: "01 Jan 2026", q1: "", q1Total: 64, q2: "", q2Total: 65, q3: "", q3Total: 66, q4: "", q4Total: 66 },
    { initials: "MV", pmName: "Martin Jamie Valencia", status: "Active", roleScope: "PM · B2B, D2C (CBP) · active since 08 Apr 2026", activeSince: "08 Apr 2026", q1: "", q1Total: 64, q2: 0, q2Total: 60, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "JS", pmName: "Jonatan Sihombing", status: "Active", roleScope: "QA · B2B (CBI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 69, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "KA", pmName: "Kintan Sekar Adinda", status: "Active", roleScope: "PM · SME (CBI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 75, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "ML", pmName: "Min Hou Lai", status: "Active", roleScope: "PM · B2B, SME, AI Agent (AAI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 65, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "SA", pmName: "Stephen Darmawan Anggara", status: "Active", roleScope: "PM · D2C (CBI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 65, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "SC", pmName: "Steven Charlino", status: "Active", roleScope: "PM (Design) · active since 30 Mar 2026", activeSince: "30 Mar 2026", q1: 0, q1Total: 2, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "YN", pmName: "Yao Kun Aaron Neo", status: "Active", roleScope: "PM · B2B, AI Agent (AAI) · active since 29 Apr 2026", activeSince: "29 Apr 2026", q1: "", q1Total: 64, q2: 0, q2Total: 45, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
    { initials: "YL", pmName: "Yuxuan Leck", status: "Active", roleScope: "LEAD · All (AAI) · active since 01 Jan 2026", activeSince: "01 Jan 2026", q1: 163, q1Total: 64, q2: 0, q2Total: 65, q2Alert: true, q3: 0, q3Total: 66, q4: 0, q4Total: 66 },
  ],
  lastUpdatedBy: "Capacity Screenshot Import",
  lastUpdatedAt: new Date().toISOString(),
};

await writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Seeded ${data.capacity.records.length} capacity records.`);
