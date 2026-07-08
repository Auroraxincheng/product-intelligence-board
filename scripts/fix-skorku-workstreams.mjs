import { readFile, writeFile } from "node:fs/promises";

const storePath = new URL("../data/store.json", import.meta.url);
const data = JSON.parse(await readFile(storePath, "utf8"));

const mapping = [
  {
    match: "Testing & Bug Fix",
    productWorkstream: "SkorKu 3.0 Android",
  },
  {
    match: "Pending (After Android 80%)",
    productWorkstream: "SkorKu 3.0 iOS",
  },
  {
    match: "Parallel Testing",
    productWorkstream: "SkorKu 3.0 AWSA",
  },
];

const changed = [];

for (const item of data.updateItems) {
  const rule = mapping.find((candidate) => item.title.includes(candidate.match));
  if (!rule || item.productArea !== "CBI" || item.segment !== "D2C" || item.track !== "Mobile App") continue;
  item.productWorkstream = rule.productWorkstream;
  item.workstreams = (item.workstreams || []).map((workstream) => ({
    ...workstream,
    title: rule.productWorkstream,
  }));
  for (const entry of data.weeklyUpdates.filter((candidate) => candidate.itemId === item.id)) {
    entry.workstreamTitle = rule.productWorkstream;
  }
  changed.push({ title: item.title, productWorkstream: item.productWorkstream });
}

await writeFile(storePath, `${JSON.stringify(data, null, 2)}\n`);
console.log(JSON.stringify({ changed }, null, 2));
