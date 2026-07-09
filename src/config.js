export const roles = ["viewer", "pm_team", "product_lead", "admin", "pmm"];

export const pmProfiles = [
  "Arbi",
  "Kintan",
  "Stephen",
  "Martin",
  "Aaron",
  "Min Hou",
  "Fadlim",
  "Aurora",
];

export const STATUS_VALUES = [
  "Backlog",
  "Planning",
  "In Progress",
  "Development",
  "Testing",
  "Live",
  "Blocked",
  "Delay",
  "Done",
];

export const productAreaConfig = {
  CBI: {
    segments: {
      B2B: ["Product", "POC & Customer Support", "Regulator", "Presales & Partnerships", "QA Work Update", "Projects"],
      SME: ["SME 1.0", "SME 2.0", "SME Partnership", "Product Features", "Presales & Discovery", "Integration / Partnership", "Customer Request"],
      D2C: ["Mobile App", "Backend", "Web App", "Partnership", "Data Partnership", "Issue / Complaint", "Feature Improvement"],
    },
  },
  CBP: {
    segments: {
      B2B: ["Product", "Product / Project", "Customer Support", "Regulatory Audit", "Presales & Partnerships", "Projects"],
      SME: ["SME 1.0", "SME 2.0", "SME Webapp", "SME Partnership", "Product Features", "Presales & Discovery", "Product / Partnership", "Customer Request", "Integration"],
      D2C: ["Underlying API", "Mobile App", "Backend", "Web App", "Partnership", "Product / Project", "Issue / Complaint", "Presales & Discovery"],
    },
  },
  "AI Agents": {
    segments: {
      "AI Agents": ["Agent KIM", "Agent SHIELD", "Agent POLAR", "Agent NORI", "Agent ORLA-HR", "Internal Agent Improvement"],
    },
  },
};

export const productAreas = Object.keys(productAreaConfig);

export function getSegments(productArea) {
  return Object.keys(productAreaConfig[productArea]?.segments || {});
}

export function getTracks(productArea, segment) {
  return productAreaConfig[productArea]?.segments?.[segment] || [];
}

function singaporeDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function currentReportingWeek(date = new Date()) {
  const parts = singaporeDateParts(date);
  const target = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((target - yearStart) / 86400000 + 1) / 7);
  return `${target.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}
