import type { LaneId, State, UpdateCard } from "./types";

export const STORAGE_KEY = "cbi_wd_v27";

export const LANE_META: Record<
  LaneId,
  { label: string; sub: string; code: string; color: string; dim: string; categories: string[] }
> = {
  b2b: {
    label: "B2B", sub: "ID", code: "B2B",
    color: "var(--b2b-color)", dim: "var(--b2b-dim)",
    categories: ["Product", "Customer Support", "Regulatory Audit", "Presales & Partnerships", "Projects"],
  },
  sme: {
    label: "SME Bureau", sub: "ID", code: "SME",
    color: "var(--sme-color)", dim: "var(--sme-dim)",
    categories: ["SME 1.0", "SME 2.0", "SME Partnership", "Product Features", "Presales & Discovery"],
  },
  skorku: {
    label: "D2C", sub: "SkorKu (ID)", code: "D2C",
    color: "var(--sku-color)", dim: "var(--sku-dim)",
    categories: ["Mobile App", "Backend", "Web App", "Partnership", "Presales & Discovery"],
  },
  cbp_b2b: {
    label: "B2B", sub: "PH", code: "B2B",
    color: "var(--b2b-color)", dim: "var(--b2b-dim)",
    categories: ["Product", "Customer Support", "Regulatory Audit", "Presales & Partnerships", "Projects"],
  },
  cbp_sme: {
    label: "SME Bureau", sub: "PH", code: "SME",
    color: "var(--sme-color)", dim: "var(--sme-dim)",
    categories: ["SME 1.0", "SME 2.0", "SME Partnership", "Product Features", "Presales & Discovery"],
  },
  cbp_d2c: {
    label: "D2C", sub: "Scorko (PH)", code: "D2C",
    color: "var(--sku-color)", dim: "var(--sku-dim)",
    categories: ["Mobile App", "Backend", "Web App", "Partnership", "Presales & Discovery"],
  },
  ai: {
    label: "AI Agents", sub: "ID, PH & SG", code: "AI",
    color: "var(--ai-color)", dim: "var(--ai-dim)",
    categories: ["Agent KIM", "Agent SHIELD", "Agent POLAR", "Agent NORI", "Agent ORLA-HR"],
  },
};

let _id = 0;
const uid = () => `${Date.now().toString(36)}-${(_id++).toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

const card = (
  title: string,
  status: UpdateCard["status"],
  date: string,
  owner: string,
  market: UpdateCard["market"] = "🇮🇩 ID",
  desc?: string,
): UpdateCard => ({ id: uid(), title, status, date, owner, market, desc });

const emptyCats = (laneId: LaneId): Record<string, UpdateCard[]> =>
  Object.fromEntries(LANE_META[laneId].categories.map((c) => [c, []]));

export function getSeedState(): State {
  const updates = {
    b2b: emptyCats("b2b"),
    sme: emptyCats("sme"),
    skorku: emptyCats("skorku"),
    cbp_b2b: emptyCats("cbp_b2b"),
    cbp_sme: emptyCats("cbp_sme"),
    cbp_d2c: emptyCats("cbp_d2c"),
    ai: emptyCats("ai"),
  } as State["updates"];

  updates.b2b["Product"] = [
    card("Telcoscore — Telkomsel API Wrapper Done", "In Progress", "2025-06-12", "Arbi K."),
    card("E-BAS — Error & Feature Mapping", "In Progress", "2025-06-12", "Arbi K."),
    card("Skip Tracing 2.0 — API Docs & Deck Ready", "Live", "2025-06-17", "Arbi K."),
    card("Income Prediction — Delayed (OJK Audit)", "Planning", "2025-07-03", "Arbi K."),
  ];
  updates.b2b["Customer Support"] = [
    card("Polaris — BAF Access Preparation", "In Progress", "2025-06-17", "Andre W."),
    card("CIMB Polaris — General Support", "In Progress", "2025-06-12", "Andre W."),
    card("GTF Full Version Cost Finalization", "Review", "2025-06-12", "Andre W."),
    card("Polaris — Pak Suparman DS Requests", "In Progress", "2025-06-12", "Andre W."),
  ];
  updates.b2b["Regulatory Audit"] = [
    card("OJK Audit — Sample Output & BAST Prep", "In Progress", "2025-06-12", "Andre W."),
    card("SME Bureau 1.0 — Pay Later PRD (Uniqlo & PT Integrity)", "Done", "2025-06-12", "Min H."),
  ];
  updates.b2b["Presales & Partnerships"] = [
    card("Visa Agreement — CBI (non-Polaris)", "Done", "2025-06-12", "Andre W."),
    card("UOB Recovery Campaign", "In Progress", "2025-06-12", "Andre W."),
    card("JULO — Polaris Discussion", "In Progress", "2025-06-12", "Andre W."),
    card("BSN — Custom Report on Server (Proposal)", "Review", "2025-06-12", "Andre W."),
  ];

  updates.sme["SME 1.0"] = [
    card("SME Bureau Phase 3 — Target Go-Live 15 July", "In Progress", "2025-07-15", "Kintan S."),
  ];
  updates.sme["SME Partnership"] = [
    card("Data Partner — Ginee Integration", "Planning", "2025-06-12", "Kintan S."),
    card("Data Partner — Finpay & ESB", "Planning", "2025-06-12", "Kintan S."),
  ];
  updates.sme["Product Features"] = [
    card("Sapa UMKM Integration — Content & Video", "In Progress", "2025-06-25", "Kintan S."),
  ];
  updates.sme["Presales & Discovery"] = [
    card("Robo Polaris — Way of Working Advisory", "Done", "2025-06-12", "Andre W."),
  ];

  updates.skorku["Mobile App"] = [
    card("SkorKu 3.0 Android — Testing & Bug Fix", "In Progress", "2025-06-12", "Stephen D."),
    card("SkorKu 3.0 iOS — Pending (After Android 80%)", "Planning", "2025-06-12", "Stephen D."),
    card("SkorKu 3.0 AWSA — Parallel Testing", "In Progress", "2025-06-12", "Stephen D."),
  ];
  updates.skorku["Web App"] = [
    card("SkorKu 2.0 — Remove Lite + V3 Deployment Prep", "In Progress", "2025-06-12", "Stephen D."),
  ];
  updates.skorku["Partnership"] = [
    card("SkorKu 2.0 — KYC Complaint (VIDA vs Privy)", "Review", "2025-06-12", "Stephen D."),
  ];

  updates.cbp_b2b["Presales & Partnerships"] = [
    card("CIC Accreditation — Advance Tier Schema Review", "In Progress", "2025-06-12", "Yao Kun", "🇵🇭 PH"),
    card("Income / Telco Product Strategy — 90%", "In Progress", "2025-06-12", "Yao Kun", "🇵🇭 PH"),
  ];
  updates.cbp_sme["SME Partnership"] = [
    card("Philippines SME Bureau — Gcash Discussion", "Planning", "2025-06-12", "Min H.", "🇵🇭 PH"),
  ];

  updates.ai["Agent KIM"] = [
    card("Agent KIM — BD Training Session 18 June", "Planning", "2025-06-18", "Fadlim", "🌏 Regional"),
    card("Agent KIM — Portfolio Alert V2 Presales Refresher", "In Progress", "2025-06-12", "Fadlim", "🌏 Regional"),
  ];
  updates.ai["Agent SHIELD"] = [
    card("Agent SHIELD (PH) — POC Done", "In Progress", "2025-06-12", "Min H.", "🇵🇭 PH"),
    card("Agent SHIELD (PH) — Collection Signal with Lenderlink", "Planning", "2025-06-12", "Min H.", "🇵🇭 PH"),
  ];
  updates.ai["Agent POLAR"] = [
    card("Agent POLAR — Compliance Clearance Pending", "Review", "2025-06-12", "Fadlim"),
    card("Agent POLAR BRD — OJK Compliance Review", "Review", "2025-06-12", "Fadlim"),
  ];
  updates.ai["Agent NORI"] = [
    card("Agent NORI — Feature Improvements + Sales Ops Handover", "In Progress", "2025-06-12", "Yao Kun"),
  ];
  updates.ai["Agent ORLA-HR"] = [
    card("Agent ORLA-HR — Bug Fix + Gemini Judge", "In Progress", "2025-06-12", "Yao Kun"),
  ];

  return {
    updates,
    announcements: [
      { id: uid(), type: "info", text: "Weekly product sync — Friday 4pm Jakarta", date: "2025-06-20" },
      { id: uid(), type: "success", text: "Skip Tracing 2.0 went Live this week", date: "2025-06-17" },
    ],
    pms: [
      { id: uid(), name: "Abdul Mugni Syafii", role: "QA · D2C (CBI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 67, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Anisya Kharisman", role: "QA · SME (CBI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 118, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Andre Wiryadi Dana (Andre)", role: "PM · B2B (CBI)", status: "Transfer", exitDate: "2026-07-01", activeSince: "2026-01-01", q: [{ c: 60, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Arbi Kusuma", role: "PM · B2B (CBI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 60, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Fadlim", role: "PM · B2B, AI Agent (AAI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 80, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Jolly Ann Bilad (Julia)", role: "PM · B2B (CBP)", status: "Resign", exitDate: "2026-01-01", activeSince: "2026-01-01", q: [{ c: 2, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Martin Jamie Valencia", role: "PM · B2B, D2C (CBP)", status: "Active", activeSince: "2026-04-08", q: [{ c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Jonatan Sihombing", role: "QA · B2B (CBI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 69, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Kintan Sekar Adinda", role: "PM · SME (CBI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 75, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Min Hou Lai", role: "PM · B2B, SME, AI Agent (AAI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 65, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Stephen Darmawan Anggara", role: "PM · D2C (CBI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 65, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Steven Charlino", role: "PM (Design)", status: "Active", activeSince: "2026-03-30", q: [{ c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Yao Kun Aaron Neo", role: "PM · B2B, AI Agent (AAI)", status: "Active", activeSince: "2026-04-29", q: [{ c: 1, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
      { id: uid(), name: "Yuxuan Leck", role: "LEAD · All (AAI)", status: "Active", activeSince: "2026-01-01", q: [{ c: 163, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] },
    ],

    marketing: [
      { id: uid(), title: "SkorKu 3.0 Launch Deck", type: "Deck", status: "Draft for Alignment", desc: "Investor + partner version for July rollout.", owner: "Cal" },
      { id: uid(), title: "Agent KIM — BD Enablement Campaign", type: "Campaign", status: "Internal ONLY", desc: "PH + ID activation kit, ICP-targeted.", owner: "Cal" },
    ],
    meetings: [],
  };
}

import { supabase } from "@/integrations/supabase/client";

const BOARD_ID = "main";

function normalize(parsed: State): State {
  const validMk = new Set(["Final", "Internal ONLY", "Draft for Alignment", "Archived"]);
  if (Array.isArray(parsed.marketing)) {
    parsed.marketing = parsed.marketing.map((m) =>
      validMk.has(m.status as string) ? m : { ...m, status: "Draft for Alignment" as const }
    );
  }
  if (!Array.isArray(parsed.meetings)) parsed.meetings = [];
  return parsed;
}

export function loadState(): State {
  if (typeof window === "undefined") return getSeedState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getSeedState();
    return normalize(JSON.parse(raw) as State);
  } catch {
    return getSeedState();
  }
}

export function saveState(s: State) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

/** Fetch the shared board snapshot from Lovable Cloud. Returns null when no shared state exists yet. */
export async function fetchSharedState(): Promise<State | null> {
  try {
    const { data, error } = await supabase
      .from("board_state")
      .select("data")
      .eq("id", BOARD_ID)
      .maybeSingle();
    if (error || !data) return null;
    return normalize(data.data as unknown as State);
  } catch {
    return null;
  }
}

/** Push the current state to the shared board so all viewers see the latest on refresh. */
export async function pushSharedState(s: State): Promise<{ ok: boolean; error?: string; updatedAt?: string }> {
  try {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase
      .from("board_state")
      .upsert({ id: BOARD_ID, data: JSON.parse(JSON.stringify(s)), updated_at: updatedAt });
    if (error) return { ok: false, error: error.message };
    return { ok: true, updatedAt };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export const newId = uid;
