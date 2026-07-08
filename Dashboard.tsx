import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity, AlertTriangle, CheckCircle2, Download, Info, Lock, Pencil, Plus,
  Save, Sparkles, Trash2, Unlock, Upload, X,
} from "lucide-react";
import type { Announcement, LaneId, MarketingCard, Meeting, MeetingTodo, PM, Role, State, Status, UpdateCard } from "@/lib/cbi/types";
import { LANE_META, getSeedState, loadState, newId, saveState, fetchSharedState, pushSharedState } from "@/lib/cbi/store";
import { supabase } from "@/integrations/supabase/client";
import { ALL_STATUSES, STATUS_STYLES, formatDate, getQuarterInfo, getRangeInfo, getWeekInfo, inRange, initials, weekdaysInQuarter, type ViewMode } from "@/lib/cbi/utils";
import { PasswordModal } from "./PasswordModal";
import { EditCardModal } from "./EditCardModal";
import { ViewerGate, useViewerGate } from "./ViewerGate";

const ROLE_LABEL: Record<Exclude<Role, null>, string> = {
  team: "Exit Edit",
  admin: "Exit Admin",
  pmm: "Exit PMM",
};

// ──────────────────────────────────────────────────────────────────
// Card
// ──────────────────────────────────────────────────────────────────
function Card({
  card, accent, onClick, canEdit,
}: { card: UpdateCard; accent: string; onClick?: () => void; canEdit: boolean }) {
  const done = card.status === "Done" || card.status === "Live" || card.status === "Complete";
  const isDelay = !!card.targetDate && !done && new Date().toISOString().slice(0, 10) > card.targetDate;
  const displayStatus = isDelay ? "Delay" : card.status;
  const st = STATUS_STYLES[displayStatus];
  const ini = initials(card.owner || "—");
  return (
    <div
      onClick={canEdit ? onClick : undefined}
      className={`group rounded-lg bg-white p-3 transition ${canEdit ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""}`}
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[12.5px] font-bold leading-snug" style={{ color: "var(--text-main)" }}>
          {card.title}
        </h4>
        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[8.5px] font-semibold uppercase tracking-wider font-mono"
          style={{ background: st.bg, color: st.fg }}
        >
          {displayStatus}
        </span>
      </div>
      {card.desc && (
        <p className="mt-1.5 text-[11px] leading-snug" style={{ color: "var(--text-sec)" }}>
          {card.desc}
        </p>
      )}
      {card.subTasks && card.subTasks.length > 0 && (
        <ul className="mt-1.5 space-y-0.5">
          {card.subTasks.map((t) => {
            const st = t.status ? STATUS_STYLES[t.status] : null;
            return (
              <Fragment key={t.id}>
              <li className="flex items-start gap-1.5 text-[11px] leading-snug" style={{ color: t.done ? "var(--text-muted)" : "var(--text-sec)" }}>
                <span className="mt-[1px]">{t.done ? "☑" : "☐"}</span>
                <span className={`flex-1 ${t.done ? "line-through" : ""}`}>{t.text}</span>
                {st && (
                  <span className="shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[8.5px] font-semibold" style={{ background: st.bg, color: st.fg }}>
                    {t.status}
                  </span>
                )}
                {t.date && (
                  <span className="shrink-0 font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
                    {formatDate(t.date)}
                  </span>
                )}
              </li>
              {t.linkUrl && (
                <li className="ml-5 mt-0.5">
                  <a
                    href={t.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="block truncate text-[10.5px] font-mono hover:underline"
                    style={{ color: "var(--sapphire)" }}
                  >
                    ↗ {t.linkName?.trim() || t.linkUrl.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
              {t.status === "Escalation Required" && t.ask && (
                <li className="ml-5 mt-0.5 rounded-md px-1.5 py-1 text-[10.5px] leading-snug" style={{ background: "rgba(220,38,38,0.08)", color: "#7F1D1D", borderLeft: "2px solid #DC2626" }}>
                  <span className="font-semibold">Ask: </span>{t.ask}
                </li>
              )}
              </Fragment>
            );
          })}
        </ul>
      )}
      {(() => {
        const links = card.links && card.links.length ? card.links : (card.link ? [card.link] : []);
        if (!links.length) return null;
        return (
          <div className="mt-1.5 space-y-0.5">
            {links.map((l, i) => (
              <a
                key={i}
                href={l}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="block truncate text-[10.5px] font-mono hover:underline"
                style={{ color: "var(--sapphire)" }}
              >
                ↗ {l.replace(/^https?:\/\//, "")}
              </a>
            ))}
          </div>
        );
      })()}
      <div className="mt-2 flex items-center justify-between">
        <span className="font-mono text-[9px]" style={{ color: "var(--text-muted)" }}>
          {formatDate(card.date)}
          {card.targetDate && (
            <span className="ml-1.5" style={{ color: "var(--text-sec)" }}>
              · Target {formatDate(card.targetDate)}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-[17px] w-[17px] items-center justify-center rounded-full text-[8px] font-bold text-white"
            style={{ background: accent }}
            title={card.owner}
          >
            {ini}
          </span>
          <span className="text-[10px] font-semibold" style={{ color: "var(--text-sec)" }}>
            {card.owner}
          </span>
      </div>
      {card.updatedAt && (
        <div className="mt-1.5 font-mono text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          Last saved: {new Date(card.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </div>
      )}
    </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Lane (column with categories)
// ──────────────────────────────────────────────────────────────────
function Lane({
  laneId, state, canEdit, onAdd, onEdit, onRenameCategory, onAddCategory, onRemoveCategory,
}: {
  laneId: LaneId;
  state: State;
  canEdit: boolean;
  onAdd: (laneId: LaneId, category: string) => void;
  onEdit: (laneId: LaneId, category: string, card: UpdateCard) => void;
  onRenameCategory?: (laneId: LaneId, originalKey: string, newName: string) => void;
  onAddCategory?: (laneId: LaneId, name: string) => void;
  onRemoveCategory?: (laneId: LaneId, key: string) => void;
}) {
  const meta = LANE_META[laneId];
  const cats = state.updates[laneId] ?? {};
  const overrides = state.categoryNames?.[laneId] ?? {};
  const removed = state.removedCategories?.[laneId] ?? [];
  const extras = state.extraCategories?.[laneId] ?? [];
  const categoryList = [
    ...meta.categories.filter((c) => !removed.includes(c)),
    ...extras,
  ];
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [newCatDraft, setNewCatDraft] = useState("");
  const startRename = (cat: string) => {
    setEditingCat(cat);
    setDraft(overrides[cat] ?? cat);
  };
  const commitRename = (cat: string) => {
    const v = draft.trim();
    if (v && onRenameCategory) onRenameCategory(laneId, cat, v);
    setEditingCat(null);
  };
  const commitAddCat = () => {
    const v = newCatDraft.trim();
    if (v && onAddCategory) onAddCategory(laneId, v);
    setNewCatDraft("");
    setAddingCat(false);
  };
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl bg-white" style={{ border: "1px solid var(--border)" }}>
      <div className="relative px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[10px] font-extrabold text-white font-mono"
            style={{ background: meta.color }}
          >
            {meta.code}
          </div>
          <div className="min-w-0">
            <div className="text-[14px] font-extrabold leading-tight" style={{ color: "var(--text-main)" }}>
              {meta.label}
            </div>
            <div className="font-mono text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              {meta.sub}
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ background: meta.color }} />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 p-3.5">
        {categoryList.map((cat) => {
          const cards = cats[cat] ?? [];
          if (cards.length === 0 && !canEdit) return null;
          const displayName = overrides[cat] ?? cat;
          const isEditing = editingCat === cat;
          return (
            <div key={cat}>
              <div className="mb-2 flex items-center gap-1.5 border-b pb-1" style={{ borderColor: "var(--border)" }}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                {isEditing ? (
                  <input
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitRename(cat)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename(cat);
                      if (e.key === "Escape") setEditingCat(null);
                    }}
                    className="flex-1 rounded border bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider outline-none"
                    style={{ borderColor: "var(--border-md)", color: "var(--text-main)" }}
                  />
                ) : (
                  <>
                    <span className="flex-1 font-mono text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                      {displayName}
                    </span>
                    {canEdit && onRenameCategory && (
                      <button
                        onClick={() => startRename(cat)}
                        className="rounded p-0.5 hover:bg-[var(--gray-100)]"
                        aria-label={`Rename ${displayName}`}
                      >
                        <Pencil size={10} style={{ color: "var(--text-muted)" }} />
                      </button>
                    )}
                    {canEdit && onRemoveCategory && (
                      <button
                        onClick={() => {
                          if (cards.length > 0 && !confirm(`Remove sub-category "${displayName}" and its ${cards.length} card(s)?`)) return;
                          onRemoveCategory(laneId, cat);
                        }}
                        className="rounded p-0.5 hover:bg-[var(--gray-100)]"
                        aria-label={`Remove ${displayName}`}
                        title="Remove sub-category"
                      >
                        <X size={11} style={{ color: "var(--text-muted)" }} />
                      </button>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {cards.map((c) => (
                  <Card key={c.id} card={c} accent={meta.color} canEdit={canEdit} onClick={() => onEdit(laneId, cat, c)} />
                ))}
                {canEdit && (
                  <button
                    onClick={() => onAdd(laneId, cat)}
                    className="flex items-center justify-center gap-1 rounded-lg border border-dashed py-1.5 text-[10.5px] font-semibold transition hover:bg-[var(--gray-100)]"
                    style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}
                  >
                    <Plus size={11} /> Add Update
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {canEdit && onAddCategory && (
          <div>
            {addingCat ? (
              <input
                autoFocus
                value={newCatDraft}
                onChange={(e) => setNewCatDraft(e.target.value)}
                onBlur={commitAddCat}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitAddCat();
                  if (e.key === "Escape") { setAddingCat(false); setNewCatDraft(""); }
                }}
                placeholder="New sub-category…"
                className="w-full rounded border bg-white px-1.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider outline-none"
                style={{ borderColor: "var(--border-md)", color: "var(--text-main)" }}
              />
            ) : (
              <button
                onClick={() => setAddingCat(true)}
                className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed py-1.5 text-[10.5px] font-semibold transition hover:bg-[var(--gray-100)]"
                style={{ borderColor: "var(--border-md)", color: "var(--sapphire)" }}
              >
                <Plus size={11} /> Add Sub-Category
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}



// ──────────────────────────────────────────────────────────────────
// Stat card
// ──────────────────────────────────────────────────────────────────
function Stat({ dot, label, value, split }: { dot: string; label: string; value: string | number; split?: { cbi: number; cbp: number } }) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-3.5" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: dot }} />
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
      </div>
      <div className="mt-1.5 text-[26px] font-extrabold leading-none" style={{ color: "var(--text-main)" }}>
        {value}
      </div>
      {split && (
        <div className="mt-2 flex items-center gap-2 font-mono text-[9.5px] font-semibold uppercase tracking-wider">
          <span className="flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: "rgba(0,158,255,0.10)", color: "var(--sapphire)" }}>
            CBI <span className="font-extrabold">{split.cbi}</span>
          </span>
          <span className="flex items-center gap-1 rounded px-1.5 py-0.5" style={{ background: "rgba(220,38,38,0.10)", color: "#B91C1C" }}>
            CBP <span className="font-extrabold">{split.cbp}</span>
          </span>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Announcement bar
// ──────────────────────────────────────────────────────────────────
const ANN_STYLE: Record<Announcement["type"], { bg: string; fg: string; icon: typeof Info }> = {
  info:    { bg: "rgba(0,158,255,0.10)",  fg: "#005C94", icon: Info },
  warning: { bg: "rgba(245,158,11,0.12)", fg: "#92580A", icon: AlertTriangle },
  alert:   { bg: "rgba(239,68,68,0.11)",  fg: "#991B1B", icon: AlertTriangle },
  success: { bg: "rgba(0,200,74,0.12)",   fg: "#007B2E", icon: CheckCircle2 },
  event:   { bg: "rgba(139,92,246,0.12)", fg: "#5B21B6", icon: Sparkles },
};

function AnnouncementBar({
  items, canEdit, onAdd, onEdit,
}: { items: Announcement[]; canEdit: boolean; onAdd: () => void; onEdit: (a: Announcement) => void }) {
  return (
    <div className="rounded-xl bg-white p-3" style={{ border: "1px solid var(--border)" }}>
      <div className="mb-2 px-1">
        <div className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--sapphire)" }}>This Week</div>
        <h2 className="text-[15px] font-extrabold" style={{ color: "var(--text-main)" }}>Announcements</h2>
      </div>
      {items.length === 0 && !canEdit ? (
        <p className="px-1 py-1.5 text-[12px]" style={{ color: "var(--text-muted)" }}>
          No announcements this week. Switch to Edit Mode to add one.
        </p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {items.map((a) => {
            const s = ANN_STYLE[a.type];
            const Icon = s.icon;
            return (
              <button
                key={a.id}
                onClick={canEdit ? () => onEdit(a) : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left ${canEdit ? "cursor-pointer hover:brightness-95" : "cursor-default"}`}
                style={{ background: s.bg, color: s.fg, maxWidth: 420 }}
              >
                <Icon size={14} />
                <span className="flex flex-col">
                  <span className="text-[12px] font-semibold">{a.text}</span>
                  <span className="font-mono text-[9.5px] opacity-75">
                    {a.postedAt && <>Posted {new Date(a.postedAt).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" })}</>}
                    {(a.validTill ?? a.date) && <> · Valid till {formatDate(a.validTill ?? a.date ?? "")}</>}
                  </span>
                </span>
                
              </button>
            );
          })}
          {canEdit && (
            <button
              onClick={onAdd}
              className="flex shrink-0 items-center gap-1 rounded-lg border border-dashed px-3 py-2 text-[12px] font-semibold"
              style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}
            >
              <Plus size={13} /> Add
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// PM Timesheet
// ──────────────────────────────────────────────────────────────────
function PMTimesheet({
  pms, canEdit, onEdit, onAdd,
}: { pms: PM[]; canEdit: boolean; onEdit: (p: PM) => void; onAdd: () => void }) {
  // Per-quarter activity: a PM is active in quarter q (0-based) if:
  //  - q >= activeSince quarter (if set), AND
  //  - status === "Active" OR q < exit quarter (derived from exitDate/exitQuarter)
  const quarterOfDate = (iso?: string) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return Math.floor(d.getMonth() / 3); // 0..3
  };
  const isActiveInQuarter = (p: PM, qIdx0: number) => {
    const status = p.status ?? "Active";
    const startQ = quarterOfDate(p.activeSince);
    if (startQ != null && qIdx0 < startQ) return false;
    if (status === "Active") return true;
    // Resign/Transfer: active strictly before exit quarter
    const exitQ = p.exitQuarter != null ? p.exitQuarter - 1 : quarterOfDate(p.exitDate);
    if (exitQ == null) return false;
    return qIdx0 < exitQ;
  };
  const entityOf = (p: PM): "CBI" | "CBP" | "AAI" => {
    const r = (p.role || "").toUpperCase();
    if (r.includes("CBP")) return "CBP";
    if (r.includes("AAI")) return "AAI";
    return "CBI";
  };
  const ENTITIES = ["CBI", "CBP", "AAI"] as const;
  const ENTITY_COLORS: Record<typeof ENTITIES[number], string> = {
    CBI: "var(--sapphire)",
    CBP: "#B91C1C",
    AAI: "#7C3AED",
  };
  const currentQ0 = Math.floor(new Date().getMonth() / 3); // 0..3
  const currentYear = new Date().getFullYear();
  const targetFor = (p: PM, qi: number) => weekdaysInQuarter(currentYear, qi, p.activeSince);
  const recordedFor = (p: PM) =>
    p.q.reduce((s, q, i) => s + (isActiveInQuarter(p, i) ? (q.c || 0) : 0), 0);
  const totalRecorded = pms.reduce((sum, p) => sum + recordedFor(p), 0);
  const quarterTotals = [0, 1, 2, 3].map((qi) =>
    pms.reduce((sum, p) => sum + (isActiveInQuarter(p, qi) ? (p.q[qi]?.c || 0) : 0), 0)
  );
  const quarterTotalsByEntity = [0, 1, 2, 3].map((qi) => {
    const out: Record<string, number> = { CBI: 0, CBP: 0, AAI: 0 };
    pms.forEach((p) => { if (isActiveInQuarter(p, qi)) out[entityOf(p)] += (p.q[qi]?.c || 0); });
    return out;
  });
  const quarterCountsByEntity = [0, 1, 2, 3].map((qi) => {
    const out: Record<string, number> = { CBI: 0, CBP: 0, AAI: 0 };
    pms.forEach((p) => { if (isActiveInQuarter(p, qi)) out[entityOf(p)] += 1; });
    return out;
  });
  const activeNowPMs = pms.filter((p) => isActiveInQuarter(p, currentQ0));
  const activeCount = activeNowPMs.length;
  const activeRecorded = activeNowPMs.reduce((sum, p) => sum + (p.q[currentQ0]?.c || 0), 0);
  const avgPerActive = activeCount > 0 ? (activeRecorded / activeCount) : 0;

  const statusStyle = (s: PM["status"]) => {
    const v = s ?? "Active";
    if (v === "Active") return { bg: "rgba(16,185,129,0.12)", fg: "#065F46" };
    if (v === "Resign") return { bg: "rgba(239,68,68,0.11)", fg: "#7F1D1D" };
    return { bg: "rgba(245,158,11,0.12)", fg: "#92580A" };
  };
  return (
    <section className="rounded-xl bg-white p-5" style={{ border: "1px solid var(--border)" }}>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--tosca)" }}>
            Capacity
          </div>
          <h2 className="text-[18px] font-extrabold" style={{ color: "var(--text-main)" }}>
            PM Timesheet
          </h2>
        </div>
        {canEdit && (
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-white" style={{ background: "var(--sapphire)" }}>
            <Plus size={13} /> Add PM
          </button>
        )}
      </div>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl p-3.5" style={{ border: "1px solid var(--border)", background: "var(--off-white)" }}>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Team Timesheet Recorded</div>
          <div className="mt-1 text-[20px] font-extrabold" style={{ color: "var(--text-main)" }}>{totalRecorded} PD</div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {quarterTotals.map((v, i) => (
              <div
                key={i}
                className="rounded-md px-1.5 py-1 text-center"
                style={{
                  background: i === currentQ0 ? "rgba(0,158,255,0.12)" : "rgba(15,23,42,0.04)",
                  border: i === currentQ0 ? "1px solid rgba(0,158,255,0.35)" : "1px solid transparent",
                }}
              >
                <div className="font-mono text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Q{i + 1}</div>
                <div className="text-[12px] font-bold" style={{ color: "var(--text-main)" }}>{v} PD</div>
                <div className="mt-1 space-y-0.5">
                  {ENTITIES.map((e) => (
                    <div key={e} className="flex items-center justify-between font-mono text-[8.5px]">
                      <span className="font-semibold" style={{ color: ENTITY_COLORS[e] }}>{e}</span>
                      <span className="font-bold" style={{ color: "var(--text-main)" }}>{quarterTotalsByEntity[i][e]}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl p-3.5" style={{ border: "1px solid var(--border)", background: "var(--off-white)" }}>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Total Active PM Count</div>
          <div className="mt-1 text-[20px] font-extrabold" style={{ color: "var(--text-main)" }}>{activeCount}</div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((qi) => {
              const cnt = pms.filter((p) => isActiveInQuarter(p, qi)).length;
              return (
                <div
                  key={qi}
                  className="rounded-md px-1.5 py-1 text-center"
                  style={{
                    background: qi === currentQ0 ? "rgba(0,158,255,0.12)" : "rgba(15,23,42,0.04)",
                    border: qi === currentQ0 ? "1px solid rgba(0,158,255,0.35)" : "1px solid transparent",
                  }}
                >
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Q{qi + 1}</div>
                  <div className="text-[12px] font-bold" style={{ color: "var(--text-main)" }}>{cnt}</div>
                  <div className="mt-1 space-y-0.5">
                    {ENTITIES.map((e) => (
                      <div key={e} className="flex items-center justify-between font-mono text-[8.5px]">
                        <span className="font-semibold" style={{ color: ENTITY_COLORS[e] }}>{e}</span>
                        <span className="font-bold" style={{ color: "var(--text-main)" }}>{quarterCountsByEntity[qi][e]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
        <div className="rounded-xl p-3.5" style={{ border: "1px solid var(--border)", background: "var(--off-white)" }}>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Average PD per Active PM</div>
          <div className="mt-1 text-[20px] font-extrabold" style={{ color: "var(--text-main)" }}>{(activeCount > 0 ? totalRecorded / activeCount : 0).toFixed(1)} PD</div>

          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((qi) => {
              const actives = pms.filter((p) => isActiveInQuarter(p, qi));
              const rec = actives.reduce((s, p) => s + (p.q[qi]?.c || 0), 0);
              const avg = actives.length > 0 ? rec / actives.length : 0;
              return (
                <div
                  key={qi}
                  className="rounded-md px-1.5 py-1 text-center"
                  style={{
                    background: qi === currentQ0 ? "rgba(0,158,255,0.12)" : "rgba(15,23,42,0.04)",
                    border: qi === currentQ0 ? "1px solid rgba(0,158,255,0.35)" : "1px solid transparent",
                  }}
                >
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Q{qi + 1}</div>
                  <div className="text-[12px] font-bold" style={{ color: "var(--text-main)" }}>{avg.toFixed(1)}</div>
                  <div className="mt-1 space-y-0.5">
                    {ENTITIES.map((e) => {
                      const eActives = actives.filter((p) => entityOf(p) === e);
                      const eRec = eActives.reduce((s, p) => s + (p.q[qi]?.c || 0), 0);
                      const eAvg = eActives.length > 0 ? eRec / eActives.length : 0;
                      return (
                        <div key={e} className="flex items-center justify-between font-mono text-[8.5px]">
                          <span className="font-semibold" style={{ color: ENTITY_COLORS[e] }}>{e}</span>
                          <span className="font-bold" style={{ color: "var(--text-main)" }}>{eAvg.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              );
            })}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {pms.map((pm) => {
          const ss = statusStyle(pm.status);
          return (
          <div key={pm.id} className="rounded-xl p-3.5" style={{ border: "1px solid var(--border)", background: "var(--off-white)" }}>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full text-[12px] font-extrabold text-white" style={{ background: "var(--sapphire)" }}>
                {initials(pm.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="text-[13.5px] font-extrabold leading-tight" style={{ color: "var(--text-main)" }}>
                    {pm.name}
                  </div>
                  <span className="rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider" style={{ background: ss.bg, color: ss.fg }}>
                    {pm.status ?? "Active"}
                  </span>
                </div>
                <div className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {pm.role}
                  {pm.exitDate && (pm.status === "Resign" || pm.status === "Transfer") && (
                    <span> · w.e.f. {formatDate(pm.exitDate)}</span>
                  )}
                  {pm.activeSince && (pm.status ?? "Active") === "Active" && (
                    <span> · active since {formatDate(pm.activeSince)}</span>
                  )}
                </div>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  {pm.okrLink && (
                    <a
                      href={pm.okrLink}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="rounded-md px-1.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider hover:opacity-80"
                      style={{ background: "rgba(0,127,184,0.10)", color: "var(--sapphire)" }}
                      title="Open OKR"
                    >
                      OKR ↗
                    </a>
                  )}
                  <button onClick={() => onEdit(pm)} className="rounded-md p-1.5 hover:bg-[var(--gray-100)]" aria-label="Edit PM">
                    <Pencil size={13} style={{ color: "var(--text-sec)" }} />
                  </button>
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {pm.q.map((q, i) => {
                const active = isActiveInQuarter(pm, i);
                const tgt = targetFor(pm, i);
                const pct = tgt > 0 ? Math.min(100, Math.round((q.c / tgt) * 100)) : 0;
                const now = new Date();
                const qStart = new Date(now.getFullYear(), i * 3, 1);
                const qEnd = new Date(now.getFullYear(), (i + 1) * 3, 0); // last day of quarter
                const quarterEnded = now > qEnd;
                const joinedMidQuarter = pm.activeSince ? new Date(pm.activeSince) > qStart : false;
                const underTarget = active && quarterEnded && q.c < tgt && !joinedMidQuarter;
                const below60 = active && (pm.status ?? "Active") === "Active" && quarterEnded && q.c < 60 && !joinedMidQuarter;
                return (
                  <div key={i} style={{ opacity: active ? 1 : 0.4 }}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <span className="font-mono text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                        Q{i + 1}
                        {underTarget && (
                          <span title={`Quarter ended; only ${q.c}/${tgt} weekdays clocked`} aria-label="Under target">
                            <AlertTriangle size={10} style={{ color: "#B91C1C" }} />
                          </span>
                        )}
                        {below60 && (
                          <span title={`Active PM below 60-day threshold (${q.c}/60)`} aria-label="Below 60 days" className="rounded-sm px-1 font-mono text-[8px] font-bold" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
                            &lt;60
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[9.5px] font-semibold" style={{ color: (underTarget || below60) ? "#B91C1C" : "var(--text-sec)" }}>
                        {active ? `${q.c}/${tgt}` : "—"}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--gray-100)" }}>
                      <div className="h-full rounded-full" style={{ width: `${active ? pct : 0}%`, background: underTarget ? "#EF4444" : (pct >= 100 ? "var(--green)" : "var(--sapphire)") }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          );
        })}
      </div>
    </section>
  );
}


// PM modal
function PMModal({
  open, initial, onClose, onSave, onDelete,
}: { open: boolean; initial: PM | null; onClose: () => void; onSave: (p: PM) => void; onDelete?: () => void }) {
  const [p, setP] = useState<PM>({
    id: newId(), name: "", role: "", status: "Active",
    q: [{ c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }],
  });
  useEffect(() => {
    if (initial) setP({ status: "Active", ...initial });
    else setP({ id: newId(), name: "", role: "", status: "Active", q: [{ c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }, { c: 0, t: 60 }] });
  }, [initial, open]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  const fld = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const fldStyle = { borderColor: "var(--border-md)" };
  const lbl = "block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1";
  const lblStyle = { color: "var(--text-sec)" };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-extrabold" style={{ color: "var(--text-main)" }}>{initial ? "Edit PM" : "Add PM"}</h2>
        <div className="space-y-3">
          <div><label className={lbl} style={lblStyle}>Name</label><input className={fld} style={fldStyle} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
          <div><label className={lbl} style={lblStyle}>Role</label><input className={fld} style={fldStyle} value={p.role} onChange={(e) => setP({ ...p, role: e.target.value })} /></div>
          <div>
            <label className={lbl} style={lblStyle}>OKR Link <span className="opacity-60">(admin only)</span></label>
            <input type="url" placeholder="https://docs.google.com/..." className={fld} style={fldStyle} value={p.okrLink ?? ""} onChange={(e) => setP({ ...p, okrLink: e.target.value || undefined })} />
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>Visible to Admin role only.</p>
          </div>
          <div><label className={lbl} style={lblStyle}>Status</label>
            <select className={fld} style={fldStyle} value={p.status ?? "Active"} onChange={(e) => setP({ ...p, status: e.target.value as PM["status"] })}>
              <option value="Active">Active</option>
              <option value="Resign">Resign</option>
              <option value="Transfer">Transfer</option>
            </select>
          </div>
          {(p.status ?? "Active") === "Active" && (
            <div><label className={lbl} style={lblStyle}>Active Since</label>
              <input type="date" className={fld} style={fldStyle} value={p.activeSince ?? ""} onChange={(e) => setP({ ...p, activeSince: e.target.value || undefined })} />
            </div>
          )}
          {(p.status === "Resign" || p.status === "Transfer") && (
            <>
              <div><label className={lbl} style={lblStyle}>{p.status} W.E.F. Date</label>
                <input type="date" className={fld} style={fldStyle} value={p.exitDate ?? ""} onChange={(e) => {
                  const d = e.target.value;
                  const q = d ? (Math.floor(new Date(d).getMonth() / 3) + 1) as 1|2|3|4 : undefined;
                  setP({ ...p, exitDate: d || undefined, exitQuarter: q });
                }} />
              </div>
              <div><label className={lbl} style={lblStyle}>Exit Quarter (PM counts as active before this quarter)</label>
                <select className={fld} style={fldStyle} value={p.exitQuarter ?? ""} onChange={(e) => setP({ ...p, exitQuarter: e.target.value ? (Number(e.target.value) as 1|2|3|4) : undefined })}>
                  <option value="">— Select —</option>
                  <option value="1">Q1</option>
                  <option value="2">Q2</option>
                  <option value="3">Q3</option>
                  <option value="4">Q4</option>
                </select>
              </div>
            </>
          )}
          {[0, 1, 2, 3].map((i) => {
            const autoTarget = weekdaysInQuarter(new Date().getFullYear(), i, p.activeSince);
            return (
              <div key={i} className="grid grid-cols-2 gap-2">
                <div><label className={lbl} style={lblStyle}>Q{i + 1} Clocked</label><input type="text" inputMode="numeric" pattern="[0-9]*" className={fld} style={fldStyle} value={p.q[i].c} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); const q = [...p.q] as PM["q"]; q[i] = { ...q[i], c: v === "" ? 0 : Number(v) }; setP({ ...p, q }); }} /></div>
                <div>
                  <label className={lbl} style={lblStyle}>Q{i + 1} Target <span className="opacity-60">(weekdays, auto)</span></label>
                  <input type="text" disabled className={`${fld} bg-gray-50`} style={{ ...fldStyle, color: "var(--text-sec)" }} value={autoTarget} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 flex items-center gap-2">
          {onDelete && <button onClick={onDelete} className="rounded-lg px-3 py-2 text-sm font-semibold mr-auto" style={{ background: "rgba(239,68,68,0.10)", color: "#B91C1C" }}>Remove PM</button>}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}>Cancel</button>
            <button onClick={() => p.name.trim() && onSave(p)} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "var(--sapphire)" }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Announcement modal
// ──────────────────────────────────────────────────────────────────
function AnnouncementModal({
  open, initial, onClose, onSave, onDelete,
}: { open: boolean; initial: Announcement | null; onClose: () => void; onSave: (a: Announcement) => void; onDelete?: () => void }) {
  const [a, setA] = useState<Announcement>({ id: newId(), type: "info", text: "", validTill: "", postedAt: new Date().toISOString() });
  useEffect(() => {
    if (initial) setA({ ...initial, postedAt: initial.postedAt ?? new Date().toISOString(), validTill: initial.validTill ?? initial.date ?? "" });
    else setA({ id: newId(), type: "info", text: "", validTill: "", postedAt: new Date().toISOString() });
  }, [initial, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-extrabold" style={{ color: "var(--text-main)" }}>{initial ? "Edit Announcement" : "Add Announcement"}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Type</label>
            <select className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={a.type} onChange={(e) => setA({ ...a, type: e.target.value as Announcement["type"] })}>
              <option value="info">Info</option><option value="warning">Warning</option><option value="alert">Alert</option><option value="success">Success</option><option value="event">Event</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Text</label>
            <textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={a.text} onChange={(e) => setA({ ...a, text: e.target.value })} />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Date of Post</label>
            <input type="text" disabled className="w-full rounded-lg border px-3 py-2 text-sm bg-gray-50" style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }} value={a.postedAt ? new Date(a.postedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"} />
          </div>
          <div>
            <label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Valid Till Date (optional)</label>
            <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={a.validTill ?? ""} onChange={(e) => setA({ ...a, validTill: e.target.value, date: e.target.value })} />
            <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>Announcement rolls over to future weeks until this date passes. Leave blank to show indefinitely.</p>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          {onDelete && <button onClick={onDelete} className="rounded-lg px-3 py-2 text-sm font-semibold mr-auto" style={{ background: "rgba(239,68,68,0.10)", color: "#B91C1C" }}>Delete</button>}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}>Cancel</button>
            <button onClick={() => a.text.trim() && onSave(a)} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "var(--sapphire)" }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Marketing
// ──────────────────────────────────────────────────────────────────
function MarketingSection({
  items, canEdit, onAdd, onEdit, onArchive,
}: { items: MarketingCard[]; canEdit: boolean; onAdd: () => void; onEdit: (m: MarketingCard) => void; onArchive: (m: MarketingCard) => void }) {
  const [showArchived, setShowArchived] = useState(false);
  const archivedCount = items.filter((m) => m.status === "Archived").length;
  const visible = items.filter((m) => showArchived ? m.status === "Archived" : m.status !== "Archived");
  return (
    <section className="rounded-xl bg-white" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between rounded-t-xl px-5 py-3.5" style={{ background: "rgba(124,58,237,0.08)" }}>
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#7C3AED" }}>Product Marketing</div>
          <h2 className="text-[18px] font-extrabold" style={{ color: "var(--text-main)" }}>Campaigns & Collateral</h2>
        </div>
        <div className="flex items-center gap-2">
          {(archivedCount > 0 || showArchived) && (
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="rounded-md px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider"
              style={{ background: showArchived ? "#7C3AED" : "rgba(124,58,237,0.12)", color: showArchived ? "#fff" : "#7C3AED" }}
            >
              {showArchived ? `← Back to Active` : `Archived (${archivedCount})`}
            </button>
          )}
          {canEdit && !showArchived && (
            <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-white" style={{ background: "#7C3AED" }}>
              <Plus size={13} /> Add
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            {showArchived ? "No archived items." : `No marketing items yet.${!canEdit ? " PMM role can add." : ""}`}
          </p>
        )}
        {visible.map((m) => {
          const s = MK_STATUS_STYLES[m.status] ?? { bg: "rgba(0,0,0,0.06)", fg: "#374151" };
          return (
            <div
              key={m.id}
              onClick={canEdit ? () => onEdit(m) : undefined}
              className={`rounded-lg p-3.5 ${canEdit ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md" : ""} transition`}
              style={{ border: "1px solid var(--border)", background: "var(--off-white)" }}
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-[13px] font-bold" style={{ color: "var(--text-main)" }}>{m.title}</h4>
                <span className="rounded-md px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ background: s.bg, color: s.fg }}>{m.status}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider" style={{ background: "rgba(124,58,237,0.12)", color: "#7C3AED" }}>{m.type}</span>
                <span className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>Owner: {m.owner}</span>
              </div>
              {m.desc && <p className="mt-2 text-[11.5px]" style={{ color: "var(--text-sec)" }}>{m.desc}</p>}
              {m.link && <a href={m.link} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="mt-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition hover:opacity-80" style={{ background: "rgba(124,58,237,0.10)", color: "#7C3AED" }}>📎 Open document →</a>}
              {m.updatedAt && <div className="mt-2 font-mono text-[9.5px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Last saved: {new Date(m.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>}
              {canEdit && m.status !== "Archived" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onArchive(m); }}
                  className="mt-2 ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(100,116,139,0.12)", color: "#475569" }}
                  title="Archive — stop rolling this card over"
                >
                  Archive
                </button>
              )}
              {canEdit && m.status === "Archived" && (
                <button
                  onClick={(e) => { e.stopPropagation(); onArchive(m); }}
                  className="mt-2 ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider"
                  style={{ background: "rgba(124,58,237,0.12)", color: "#7C3AED" }}
                  title="Restore from archive"
                >
                  Restore
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

const MARKETING_STATUSES: MarketingCard["status"][] = ["Final", "Internal ONLY", "Draft for Alignment", "Archived"];
const MK_STATUS_STYLES: Record<MarketingCard["status"], { bg: string; fg: string }> = {
  "Final": { bg: "rgba(34,197,94,0.14)", fg: "#15803D" },
  "Internal ONLY": { bg: "rgba(239,68,68,0.12)", fg: "#B91C1C" },
  "Draft for Alignment": { bg: "rgba(234,179,8,0.16)", fg: "#A16207" },
  "Archived": { bg: "rgba(100,116,139,0.14)", fg: "#475569" },
};

function MarketingModal({
  open, initial, onClose, onSave, onDelete,
}: { open: boolean; initial: MarketingCard | null; onClose: () => void; onSave: (m: MarketingCard) => void; onDelete?: () => void }) {
  const [m, setM] = useState<MarketingCard>({ id: newId(), title: "", type: "Campaign", status: "Draft for Alignment", desc: "", link: "", owner: "" });
  useEffect(() => {
    if (initial) setM(initial);
    else setM({ id: newId(), title: "", type: "Campaign", status: "Draft for Alignment", desc: "", link: "", owner: "" });
  }, [initial, open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-extrabold" style={{ color: "var(--text-main)" }}>{initial ? "Edit Marketing" : "Add Marketing"}</h2>
        <div className="space-y-3">
          <div><label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Title</label><input className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={m.title} onChange={(e) => setM({ ...m, title: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Type</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={m.type} onChange={(e) => setM({ ...m, type: e.target.value as MarketingCard["type"] })}>
                <option>Campaign</option><option>Deck</option><option>Content</option><option>Event</option>
              </select></div>
            <div><label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Status</label>
              <select className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={m.status} onChange={(e) => {
                const newStatus = e.target.value as MarketingCard["status"];
                setM({
                  ...m,
                  status: newStatus,
                  completedDate: newStatus === "Final" ? (m.completedDate ?? new Date().toISOString().slice(0, 10)) : undefined,
                });
              }}>
                {MARKETING_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select></div>
          </div>
          {m.status === "Final" && (
            <div><label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Complete Date</label>
              <input type="date" className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={m.completedDate ?? ""} onChange={(e) => setM({ ...m, completedDate: e.target.value })} />
            </div>
          )}
          <div><label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Owner</label><input className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={m.owner} onChange={(e) => setM({ ...m, owner: e.target.value })} /></div>
          <div><label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Update</label><textarea rows={3} className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={m.desc ?? ""} onChange={(e) => setM({ ...m, desc: e.target.value })} /></div>
          <div><label className="block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-sec)" }}>Document / Repository Link</label><input type="url" placeholder="https://drive.google.com/... or https://github.com/..." className="w-full rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--border-md)" }} value={m.link ?? ""} onChange={(e) => setM({ ...m, link: e.target.value })} /><p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>Paste a link to the deck, doc, repo, or campaign asset.</p></div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          {onDelete && <button onClick={onDelete} className="rounded-lg px-3 py-2 text-sm font-semibold mr-auto" style={{ background: "rgba(239,68,68,0.10)", color: "#B91C1C" }}>Delete</button>}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}>Cancel</button>
            <button onClick={() => m.title.trim() && onSave(m)} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "#7C3AED" }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Toast
// ──────────────────────────────────────────────────────────────────
function Toasts({ items, onDismiss }: { items: { id: string; text: string }[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {items.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold shadow-lg" style={{ border: "1px solid var(--border-md)", color: "var(--text-main)" }}>
          <CheckCircle2 size={15} style={{ color: "var(--green)" }} />
          {t.text}
          <button onClick={() => onDismiss(t.id)} className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-sec)]"><X size={13} /></button>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────
// Meetings & To-Do helpers
// ──────────────────────────────────────────────────────────────────
function meetingComplete(m: Meeting): boolean {
  return m.todos.length > 0 && m.todos.every((t) => t.done);
}

function MeetingsSection({
  items, canEdit, onAdd, onEdit, onToggleTodo,
}: {
  items: Meeting[];
  canEdit: boolean;
  onAdd: () => void;
  onEdit: (m: Meeting) => void;
  onToggleTodo: (meetingId: string, todoId: string) => void;
}) {
  const fmt = (iso: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };
  return (
    <section className="rounded-xl bg-white" style={{ border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between rounded-t-xl px-5 py-3.5" style={{ background: "rgba(0,158,255,0.08)" }}>
        <div>
          <div className="font-mono text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--sapphire)" }}>
            This Week
          </div>
          <h2 className="text-[18px] font-extrabold" style={{ color: "var(--text-main)" }}>
            Meetings & To-Do of the Week (Internal)
          </h2>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Incomplete meetings roll over to future weeks until all to-dos are closed.
          </p>
        </div>
        {canEdit && (
          <button onClick={onAdd} className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-bold text-white" style={{ background: "var(--sapphire)" }}>
            <Plus size={13} /> Add Meeting
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 p-5 md:grid-cols-2 xl:grid-cols-3">
        {items.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--text-muted)" }}>
            No meetings this week.{canEdit ? " Click Add Meeting to create one." : ""}
          </p>
        )}
        {items.map((m) => {
          const complete = meetingComplete(m);
          const open = m.todos.filter((t) => !t.done).length;
          const total = m.todos.length;
          const status = complete ? "Complete" : total === 0 ? "Planning" : "In Progress";
          const st = STATUS_STYLES[status as keyof typeof STATUS_STYLES] ?? { bg: "rgba(0,0,0,0.06)", fg: "#374151" };
          return (
            <div
              key={m.id}
              className="rounded-lg p-3.5 transition"
              style={{
                border: "1px solid var(--border)",
                background: complete ? "rgba(0,200,74,0.06)" : "var(--off-white)",
                borderLeft: `4px solid ${complete ? "var(--green)" : "var(--sapphire)"}`,
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={canEdit ? () => onEdit(m) : undefined}
                  className={`min-w-0 flex-1 text-left ${canEdit ? "cursor-pointer hover:underline" : ""}`}
                >
                  <h4 className="text-[13px] font-bold leading-tight" style={{ color: "var(--text-main)" }}>{m.header || "(untitled meeting)"}</h4>
                  <div className="mt-1 font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {fmt(m.date)} · {open}/{total} open
                  </div>
                </button>
                <span className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[8.5px] font-semibold uppercase tracking-wider" style={{ background: st.bg, color: st.fg }}>
                  {status}
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {m.todos.length === 0 && (
                  <li className="text-[11px]" style={{ color: "var(--text-muted)" }}>No to-dos yet.</li>
                )}
                {m.todos.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-[11.5px] leading-snug">
                    <input
                      type="checkbox"
                      checked={t.done}
                      onChange={() => onToggleTodo(m.id, t.id)}
                      disabled={!canEdit}
                      className="mt-[2px]"
                    />
                    <span className={`flex-1 ${t.done ? "line-through opacity-60" : ""}`} style={{ color: "var(--text-sec)" }}>
                      {t.text}
                    </span>
                    {t.owner && (
                      <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] font-semibold" style={{ background: "rgba(0,158,255,0.10)", color: "var(--sapphire)" }}>
                        {t.owner}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {m.updatedAt && (
                <div className="mt-2 font-mono text-[9px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                  Last saved: {new Date(m.updatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MeetingModal({
  open, initial, owners, onClose, onSave, onDelete,
}: {
  open: boolean;
  initial: Meeting | null;
  owners: string[];
  onClose: () => void;
  onSave: (m: Meeting) => void;
  onDelete?: () => void;
}) {
  const [m, setM] = useState<Meeting>({ id: newId(), header: "", date: new Date().toISOString().slice(0, 10), todos: [] });
  useEffect(() => {
    if (initial) setM(initial);
    else setM({ id: newId(), header: "", date: new Date().toISOString().slice(0, 10), todos: [] });
  }, [initial, open]);
  if (!open) return null;
  const fld = "w-full rounded-lg border px-3 py-2 text-sm outline-none";
  const fldStyle = { borderColor: "var(--border-md)" };
  const lbl = "block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1";
  const lblStyle = { color: "var(--text-sec)" };
  const addTodo = () => setM({ ...m, todos: [...m.todos, { id: newId(), text: "", owner: owners[0] ?? "", done: false }] });
  const updTodo = (id: string, patch: Partial<MeetingTodo>) =>
    setM({ ...m, todos: m.todos.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const rmTodo = (id: string) => setM({ ...m, todos: m.todos.filter((t) => t.id !== id) });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-xl rounded-xl bg-white p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-extrabold" style={{ color: "var(--text-main)" }}>{initial ? "Edit Meeting" : "Add Meeting"}</h2>
        <div className="space-y-3">
          <div><label className={lbl} style={lblStyle}>Meeting Header</label><input className={fld} style={fldStyle} value={m.header} onChange={(e) => setM({ ...m, header: e.target.value })} placeholder="e.g. Weekly Product Sync" /></div>
          <div><label className={lbl} style={lblStyle}>Date of Meeting</label><input type="date" className={fld} style={fldStyle} value={m.date} onChange={(e) => setM({ ...m, date: e.target.value })} /></div>
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={lbl} style={lblStyle}>To-Do List</label>
              <button onClick={addTodo} className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "rgba(0,158,255,0.10)", color: "var(--sapphire)" }}>
                <Plus size={11} /> Add To-Do
              </button>
            </div>
            <div className="space-y-2">
              {m.todos.length === 0 && <p className="text-[11.5px]" style={{ color: "var(--text-muted)" }}>No to-dos yet. Add at least one so this meeting can be marked Complete.</p>}
              {m.todos.map((t) => (
                <div key={t.id} className="flex items-start gap-2 rounded-lg border p-2" style={{ borderColor: "var(--border)" }}>
                  <input type="checkbox" checked={t.done} onChange={(e) => updTodo(t.id, { done: e.target.checked })} className="mt-2" />
                  <div className="flex-1 space-y-1.5">
                    <input className="w-full rounded border px-2 py-1 text-[12px]" style={{ borderColor: "var(--border-md)" }} placeholder="To-do description" value={t.text} onChange={(e) => updTodo(t.id, { text: e.target.value })} />
                    <select className="w-full rounded border px-2 py-1 text-[12px]" style={{ borderColor: "var(--border-md)" }} value={t.owner} onChange={(e) => updTodo(t.id, { owner: e.target.value })}>
                      <option value="">— PM tasked —</option>
                      {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <button onClick={() => rmTodo(t.id)} className="rounded p-1 hover:bg-[var(--gray-100)]" aria-label="Remove to-do" title="Remove to-do">
                    <X size={13} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          {onDelete && <button onClick={onDelete} className="rounded-lg px-3 py-2 text-sm font-semibold mr-auto" style={{ background: "rgba(239,68,68,0.10)", color: "#B91C1C" }}>Delete Meeting</button>}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}>Cancel</button>
            <button onClick={() => m.header.trim() && onSave({ ...m, todos: m.todos.filter((t) => t.text.trim()) })} className="rounded-lg px-4 py-2 text-sm font-bold text-white" style={{ background: "var(--sapphire)" }}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────
// Dashboard
// ──────────────────────────────────────────────────────────────────
export function Dashboard() {
  const { unlocked, unlock } = useViewerGate();
  const [state, setState] = useState<State>(() => getSeedState());
  const [role, setRole] = useState<Role>(null);
  const [pwOpen, setPwOpen] = useState(false);
  const [cardEdit, setCardEdit] = useState<{ laneId: LaneId; cat: string; card: UpdateCard | null } | null>(null);
  const [annEdit, setAnnEdit] = useState<{ a: Announcement | null } | null>(null);
  const [pmEdit, setPmEdit] = useState<{ p: PM | null } | null>(null);
  const [mkEdit, setMkEdit] = useState<{ m: MarketingCard | null } | null>(null);
  const [mtgEdit, setMtgEdit] = useState<{ m: Meeting | null } | null>(null);
  const [toasts, setToasts] = useState<{ id: string; text: string }[]>([]);
  const [view, setView] = useState<ViewMode>("weekly");
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current, -1 = previous, etc.
  const fileInput = useRef<HTMLInputElement>(null);

  const [hydrated, setHydrated] = useState(false);
  // hydrate: prefer shared (cloud) state so viewers see latest; fall back to local
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const shared = await fetchSharedState();
      if (cancelled) return;
      if (shared) {
        setState(shared);
        saveState(shared);
      } else {
        setState(loadState());
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, []);
  // persist locally (debounced) so typing in modals doesn't stringify huge state on every keystroke
  useEffect(() => {
    if (!hydrated) return;
    const t = setTimeout(() => { saveState(state); }, 400);
    return () => clearTimeout(t);
  }, [state, hydrated]);
  // push to shared board (debounced) when an editor role makes changes
  const lastPushedAtRef = useRef<string | null>(null);
  const lastLocalEditAtRef = useRef<number>(0);
  const skipNextPushRef = useRef<boolean>(false);
  useEffect(() => {
    if (!hydrated || !role) return;
    // state changes that originated from a remote apply must not trigger another push
    if (skipNextPushRef.current) { skipNextPushRef.current = false; return; }
    lastLocalEditAtRef.current = Date.now();
    const t = setTimeout(() => {
      void pushSharedState(state).then((res) => {
        if (res.ok && res.updatedAt) lastPushedAtRef.current = res.updatedAt;
      });
    }, 400);
    return () => clearTimeout(t);
  }, [state, role, hydrated]);
  // live updates: subscribe to remote board changes so all viewers/editors see them instantly
  useEffect(() => {
    if (!hydrated) return;
    const channel = supabase
      .channel("board_state_live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "board_state", filter: "id=eq.main" },
        (payload: { new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => {
          const row = (payload.new ?? payload.old) as { data?: State; updated_at?: string } | null;
          if (!row?.data) return;
          // skip our own echo
          if (row.updated_at && row.updated_at === lastPushedAtRef.current) return;
          // skip remote overwrite if the user has pending unsaved local edits (within debounce window + grace)
          if (role && Date.now() - lastLocalEditAtRef.current < 2000) return;
          skipNextPushRef.current = true;
          setState(row.data);
          saveState(row.data);
        },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [hydrated, role]);
  // reset offset when switching view mode
  useEffect(() => { setPeriodOffset(0); }, [view]);

  const week = useMemo(() => getWeekInfo(periodOffset), [periodOffset]);
  const range = useMemo(() => getRangeInfo(view, periodOffset), [view, periodOffset]);


  // A card is "closed" when its main status is Complete/Live/Done AND every sub-task is Complete/Live/Done.
  const isClosedStatus = (s?: Status) => s === "Complete" || s === "Live" || s === "Done";
  const isCardClosed = (c: UpdateCard) => {
    if (!isClosedStatus(c.status)) return false;
    const subs = c.subTasks ?? [];
    return subs.every((t) => t.done || isClosedStatus(t.status));
  };

  // Filter state.updates and announcements by current range (date-based).
  // Open (not-closed) cards from prior periods roll over into the current view.
  const filteredState = useMemo<State>(() => {
    const updates = {} as State["updates"];
    (Object.keys(state.updates) as LaneId[]).forEach((lane) => {
      const cats: Record<string, UpdateCard[]> = {};
      Object.entries(state.updates[lane] ?? {}).forEach(([cat, arr]) => {
        cats[cat] = arr.filter((c) => {
          if (inRange(c.date, range.start, range.end)) return true;
          // Rollover: open cards dated before this period stay visible until closed
          if (c.date && new Date(c.date) < range.start && !isCardClosed(c)) return true;
          return false;
        });
      });
      updates[lane] = cats;
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const announcements = state.announcements.filter((a) => {
      const vt = a.validTill ?? a.date;
      if (!vt) return true; // no expiry → always show (rolls over indefinitely)
      const end = new Date(vt); end.setHours(23, 59, 59, 999);
      return end.getTime() >= today.getTime();
    });
    return { ...state, updates, announcements };
  }, [state, range]);

  const toast = (text: string) => {
    const id = newId();
    setToasts((t) => [...t, { id, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  };

  // Permissions
  const canEditUpdates = role === "team" || role === "admin";
  const canEditAnnouncements = role === "team" || role === "admin" || role === "pmm";
  const canEditPM = role === "admin";
  const canEditMarketing = role === "pmm";
  const canEditMeetings = role === "team" || role === "admin";

  // Meetings: show within range OR rolled-over (date <= range.end with open todos).
  const visibleMeetings = useMemo<Meeting[]>(() => {
    const all = state.meetings ?? [];
    return all.filter((m) => {
      const inWindow = inRange(m.date, range.start, range.end);
      const isRollover = !!m.date && new Date(m.date) < range.start && !meetingComplete(m);
      return inWindow || isRollover;
    });
  }, [state.meetings, range]);

  const saveMeeting = (m: Meeting) => {
    setState((s) => {
      const list = [...(s.meetings ?? [])];
      const idx = list.findIndex((x) => x.id === m.id);
      const stamped = { ...m, updatedAt: new Date().toISOString() };
      if (idx >= 0) list[idx] = stamped; else list.push(stamped);
      return { ...s, meetings: list };
    });
    setMtgEdit(null); toast("✓ Meeting saved");
  };
  const deleteMeeting = (id: string) => {
    setState((s) => ({ ...s, meetings: (s.meetings ?? []).filter((m) => m.id !== id) }));
    setMtgEdit(null); toast("✓ Meeting deleted");
  };
  const toggleMeetingTodo = (meetingId: string, todoId: string) => {
    setState((s) => ({
      ...s,
      meetings: (s.meetings ?? []).map((m) =>
        m.id !== meetingId ? m : { ...m, todos: m.todos.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)), updatedAt: new Date().toISOString() }
      ),
    }));
  };

  // Stats (scoped to current view range)
  const allCards = useMemo(() => {
    const out: UpdateCard[] = [];
    Object.values(filteredState.updates).forEach((cats) => Object.values(cats).forEach((arr) => out.push(...arr)));
    return out;
  }, [filteredState]);
  const stat = useMemo(() => {
    const buckets: UpdateCard[] = [];
    const cbiCards: UpdateCard[] = [];
    const cbpCards: UpdateCard[] = [];
    (Object.entries(filteredState.updates) as [LaneId, Record<string, UpdateCard[]>][]).forEach(([laneId, cats]) => {
      Object.values(cats).forEach((arr) => {
        buckets.push(...arr);
        (laneId.startsWith("cbp_") ? cbpCards : cbiCards).push(...arr);
      });
    });
    const by = (cards: UpdateCard[], s: string) => cards.filter((c) => c.status === s).length;
    const subCount = (cards: UpdateCard[]) => cards.reduce((n, c) => n + (c.subTasks?.length ?? 0), 0);
    return {
      total: {
        all: buckets.length + subCount(buckets),
        cbi: cbiCards.length + subCount(cbiCards),
        cbp: cbpCards.length + subCount(cbpCards),
      },
      inProgress: { all: by(buckets, "In Progress"), cbi: by(cbiCards, "In Progress"), cbp: by(cbpCards, "In Progress") },
      live: { all: by(buckets, "Live"), cbi: by(cbiCards, "Live"), cbp: by(cbpCards, "Live") },
      planning: { all: by(buckets, "Planning"), cbi: by(cbiCards, "Planning"), cbp: by(cbpCards, "Planning") },
    };
  }, [filteredState]);

  // Card save/delete
  const saveCard = (laneId: LaneId, cat: string, card: UpdateCard) => {
    setState((s) => {
      const lane = { ...(s.updates[laneId] ?? {}) };
      const list = [...(lane[cat] ?? [])];
      const idx = list.findIndex((c) => c.id === card.id);
      const stamped = { ...card, updatedAt: new Date().toISOString() };
      if (idx >= 0) list[idx] = stamped; else list.push(stamped);
      lane[cat] = list;
      return { ...s, updates: { ...s.updates, [laneId]: lane } };
    });
    setCardEdit(null); toast("✓ Update saved");
  };
  const deleteCard = (laneId: LaneId, cat: string, id: string) => {
    setState((s) => {
      const lane = { ...(s.updates[laneId] ?? {}) };
      lane[cat] = (lane[cat] ?? []).filter((c) => c.id !== id);
      return { ...s, updates: { ...s.updates, [laneId]: lane } };
    });
    setCardEdit(null); toast("✓ Update deleted");
  };

  const renameCategory = (laneId: LaneId, originalKey: string, newName: string) => {
    setState((s) => {
      const laneMap = { ...(s.categoryNames?.[laneId] ?? {}) };
      const original = LANE_META[laneId].categories.find((c) => c === originalKey) ?? originalKey;
      if (newName.trim() === original) delete laneMap[originalKey];
      else laneMap[originalKey] = newName.trim();
      return { ...s, categoryNames: { ...(s.categoryNames ?? {}), [laneId]: laneMap } };
    });
    toast("✓ Category renamed");
  };

  const addCategory = (laneId: LaneId, name: string) => {
    const key = name.trim();
    if (!key) return;
    setState((s) => {
      const defaults = LANE_META[laneId].categories;
      const extras = s.extraCategories?.[laneId] ?? [];
      const removed = s.removedCategories?.[laneId] ?? [];
      // If re-adding a removed default, just un-remove it
      if (defaults.includes(key) && removed.includes(key)) {
        return {
          ...s,
          removedCategories: {
            ...(s.removedCategories ?? {}),
            [laneId]: removed.filter((c) => c !== key),
          },
        };
      }
      if (defaults.includes(key) || extras.includes(key)) return s;
      const laneUpdates = { ...(s.updates[laneId] ?? {}), [key]: [] };
      return {
        ...s,
        updates: { ...s.updates, [laneId]: laneUpdates },
        extraCategories: { ...(s.extraCategories ?? {}), [laneId]: [...extras, key] },
      };
    });
    toast("✓ Sub-category added");
  };

  const removeCategory = (laneId: LaneId, key: string) => {
    setState((s) => {
      const defaults = LANE_META[laneId].categories;
      const extras = s.extraCategories?.[laneId] ?? [];
      const laneUpdates = { ...(s.updates[laneId] ?? {}) };
      delete laneUpdates[key];
      const next: State = { ...s, updates: { ...s.updates, [laneId]: laneUpdates } };
      if (defaults.includes(key)) {
        const removed = s.removedCategories?.[laneId] ?? [];
        next.removedCategories = {
          ...(s.removedCategories ?? {}),
          [laneId]: removed.includes(key) ? removed : [...removed, key],
        };
      } else if (extras.includes(key)) {
        next.extraCategories = {
          ...(s.extraCategories ?? {}),
          [laneId]: extras.filter((c) => c !== key),
        };
      }
      return next;
    });
    toast("✓ Sub-category removed");
  };


  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `cbi-weekly-snapshot-Week${week.wk}.json`; a.click();
    URL.revokeObjectURL(url); toast("✓ Exported snapshot");
  };
  const importData = (file: File) => {
    const r = new FileReader();
    r.onload = () => {
      try { setState(JSON.parse(String(r.result)) as State); toast("✓ Imported snapshot"); }
      catch { toast("⚠ Invalid file"); }
    };
    r.readAsText(file);
  };
  const snapshot = async () => {
    saveState(state);
    const res = await pushSharedState(state);
    toast(res.ok ? `✓ Snapshot saved & published — Week ${week.wk}` : `⚠ Saved locally — cloud sync failed: ${res.error ?? ""}`);
  };

  const generateReport = () => {
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const fmt = (iso?: string) => (iso ? formatDate(iso) : "—");
    const periodLabel =
      view === "weekly" ? `Week ${week.wk} · ${range.label}` :
      view === "biweekly" ? `Bi-Weekly · ${range.label}` :
      view === "monthly" ? `Monthly · ${range.label}` :
      `Quarterly · ${range.label}`;

    const updatesHtml = (Object.entries(filteredState.updates) as [LaneId, Record<string, UpdateCard[]>][])
      .map(([laneId, cats]) => {
        const meta = LANE_META[laneId];
        const items = Object.entries(cats).filter(([, arr]) => arr.length > 0);
        if (items.length === 0) return "";
        const catsHtml = items.map(([cat, arr]) => `
          <div class="cat">
            <h4>${esc(cat)}</h4>
            <table>
              <thead><tr><th>Title</th><th>Status</th><th>Owner</th><th>Market</th><th>Date</th><th>Target</th></tr></thead>
              <tbody>
                ${arr.map((c) => `
                  <tr>
                    <td>
                      <div class="title">${esc(c.title)}</div>
                      ${c.desc ? `<div class="desc">${esc(c.desc)}</div>` : ""}
                      ${c.subTasks && c.subTasks.length ? `<ul class="subs">${c.subTasks.map((t) => `<li>${t.done ? "☑" : "☐"} ${esc(t.text)}${t.status ? ` <em>(${esc(t.status)})</em>` : ""}</li>`).join("")}</ul>` : ""}
                    </td>
                    <td><span class="badge">${esc(c.status)}</span></td>
                    <td>${esc(c.owner)}</td>
                    <td>${esc(c.market)}</td>
                    <td>${fmt(c.date)}</td>
                    <td>${fmt(c.targetDate)}</td>
                  </tr>`).join("")}
              </tbody>
            </table>
          </div>`).join("");
        return `
          <section class="lane" style="border-left: 4px solid ${meta.color}">
            <h3>${esc(meta.label)} <span class="sub">— ${esc(meta.sub)}</span></h3>
            ${catsHtml}
          </section>`;
      }).filter(Boolean).join("");

    const annHtml = filteredState.announcements.length
      ? `<ul class="ann">${filteredState.announcements.map((a) => `<li><strong>[${esc(a.type)}]</strong> ${esc(a.text)} ${a.date ? `<em>· ${fmt(a.date)}</em>` : ""}</li>`).join("")}</ul>`
      : `<p class="muted">No announcements.</p>`;

    const mtgs = visibleMeetings;
    const mtgHtml = mtgs.length ? mtgs.map((m) => {
      const open = m.todos.filter((t) => !t.done).length;
      const total = m.todos.length;
      const status = meetingComplete(m) ? "Complete" : total === 0 ? "Planning" : "In Progress";
      const rollover = !!m.date && new Date(m.date) < range.start;
      return `
        <div class="mtg">
          <h4>${esc(m.header)} <span class="badge">${status}</span> ${rollover ? `<span class="rollover">↻ Rolled over</span>` : ""}</h4>
          <div class="muted">${fmt(m.date)} · ${open}/${total} open to-dos</div>
          ${m.todos.length ? `<ul>${m.todos.map((t) => `<li>${t.done ? "☑" : "☐"} ${esc(t.text)}${t.owner ? ` <em>— ${esc(t.owner)}</em>` : ""}</li>`).join("")}</ul>` : ""}
        </div>`;
    }).join("") : `<p class="muted">No meetings in this period.</p>`;

    const mkHtml = state.marketing.length
      ? `<table>
          <thead><tr><th>Title</th><th>Type</th><th>Status</th><th>Owner</th><th>Completed</th></tr></thead>
          <tbody>${state.marketing.map((m) => `<tr><td>${esc(m.title)}${m.desc ? `<div class="desc">${esc(m.desc)}</div>` : ""}</td><td>${esc(m.type)}</td><td>${esc(m.status)}</td><td>${esc(m.owner)}</td><td>${fmt(m.completedDate)}</td></tr>`).join("")}</tbody>
        </table>`
      : `<p class="muted">No marketing items.</p>`;

    const totalUpdates = allCards.length;
    const liveCount = allCards.filter((c) => c.status === "Live" || c.status === "Complete" || c.status === "Done").length;

    const html = `<!doctype html>
<html><head><meta charset="utf-8"/>
<title>Product Intelligence Report — ${esc(periodLabel)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 32px; background: #F7FAFC; }
  .wrap { max-width: 1100px; margin: 0 auto; background: white; padding: 36px 40px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
  header.top { border-bottom: 3px solid #0066B2; padding-bottom: 16px; margin-bottom: 24px; }
  header.top h1 { margin: 0 0 4px; font-size: 24px; color: #0F172A; }
  header.top .meta { color: #64748B; font-size: 13px; font-family: ui-monospace, monospace; }
  h2 { font-size: 16px; margin: 28px 0 12px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0; color: #0066B2; letter-spacing: 0.05em; text-transform: uppercase; }
  h3 { font-size: 15px; margin: 18px 0 10px; color: #0F172A; }
  h3 .sub { color: #64748B; font-weight: 500; font-size: 12px; }
  h4 { font-size: 13px; margin: 12px 0 6px; color: #334155; }
  .lane { padding: 8px 14px 14px; margin-bottom: 14px; background: #FAFBFC; border-radius: 6px; }
  .cat { margin-top: 8px; }
  table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #E2E8F0; vertical-align: top; }
  th { background: #F1F5F9; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #475569; }
  .title { font-weight: 600; color: #0F172A; }
  .desc { color: #64748B; font-size: 11px; margin-top: 2px; }
  .subs { margin: 4px 0 0 0; padding-left: 16px; font-size: 11px; color: #475569; }
  .badge { display: inline-block; background: #E0F2FE; color: #075985; padding: 1px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
  .rollover { color: #B45309; font-size: 10px; font-weight: 600; margin-left: 6px; }
  .muted { color: #94A3B8; font-style: italic; font-size: 12px; }
  ul.ann li, .mtg ul li { font-size: 12px; margin-bottom: 4px; }
  .mtg { padding: 10px 14px; border: 1px solid #E2E8F0; border-radius: 6px; margin-bottom: 10px; background: #FAFBFC; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .stat { background: #F1F5F9; padding: 10px 12px; border-radius: 6px; }
  .stat .lbl { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; font-weight: 600; }
  .stat .val { font-size: 22px; font-weight: 800; color: #0F172A; margin-top: 2px; }
  .toolbar { position: fixed; top: 12px; right: 12px; }
  .toolbar button { background: #0066B2; color: white; border: 0; padding: 8px 14px; border-radius: 6px; font-weight: 700; font-size: 12px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  @media print { body { background: white; padding: 0; } .wrap { box-shadow: none; padding: 16px; } .toolbar { display: none; } }
</style>
</head>
<body>
<div class="toolbar"><button onclick="window.print()">🖨 Print / Save as PDF</button></div>
<div class="wrap">
  <header class="top">
    <h1>Product Intelligence Report</h1>
    <div class="meta">${esc(periodLabel)} · Generated ${new Date().toLocaleString()}</div>
  </header>

  <div class="summary">
    <div class="stat"><div class="lbl">Total Updates</div><div class="val">${stat.total.all}</div></div>
    <div class="stat"><div class="lbl">In Progress</div><div class="val">${stat.inProgress.all}</div></div>
    <div class="stat"><div class="lbl">Live / Done</div><div class="val">${liveCount}</div></div>
    <div class="stat"><div class="lbl">Planning</div><div class="val">${stat.planning.all}</div></div>
  </div>

  <h2>Announcements</h2>
  ${annHtml}

  <h2>Meetings & To-Do</h2>
  ${mtgHtml}

  <h2>Updates by Lane</h2>
  ${updatesHtml || `<p class="muted">No updates in this period.</p>`}

  <h2>Marketing Collateral</h2>
  ${mkHtml}

  <footer style="margin-top: 32px; padding-top: 14px; border-top: 1px solid #E2E8F0; color: #94A3B8; font-size: 11px; font-family: ui-monospace, monospace;">
    CBI & CBP Product Intelligence · Confidential · Total updates in period: ${totalUpdates}
  </footer>
</div>
</body></html>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast("⚠ Pop-up blocked — allow pop-ups to view report");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    toast(`✓ Report generated — ${periodLabel}`);
  };


  if (!unlocked) return <ViewerGate onUnlock={unlock} />;

  return (
    <div className="min-h-screen pb-32">
      {/* HEADER */}
      <header className="bg-white" style={{ borderBottom: "2px solid var(--border)" }}>
        <div className="grid grid-cols-1 items-stretch md:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-4 px-6 py-5 md:gap-5 md:px-8">
            <div className="flex items-center gap-4">
              <img src="/__l5e/assets-v1/ea79a44e-7572-4d68-92db-94572148f1e6/cbi-logo.svg" alt="CBI — Credit Bureau Indonesia" className="h-10 w-auto" />
              <div className="h-8 w-px" style={{ background: "var(--border-md)" }} />
              <img src="/__l5e/assets-v1/6f71444c-c6df-4fae-a02b-92ca9c28fec3/cbp-logo.svg" alt="ADVANCE CBP — Credit Bureau Philippines" className="h-5 w-auto" />
            </div>
            <div className="hidden h-12 w-px md:block" style={{ background: "var(--border-md)" }} />
            <div className="flex flex-col">
              <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: "var(--tosca)" }}>Product Update</span>
              <h1 className="text-[20px] font-extrabold" style={{ color: "var(--text-main)" }}>Product Intelligence Board</h1>
            </div>
            <div className="ml-auto">
              <button
                onClick={() => { if (role) { setRole(null); toast("Exited edit mode"); } else setPwOpen(true); }}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-bold transition"
                style={
                  role
                    ? { background: "rgba(0,200,74,0.12)", color: "var(--green-dark)", border: "1px solid rgba(0,200,74,0.30)" }
                    : { background: "var(--sapphire)", color: "white" }
                }
              >
                {role ? <Unlock size={13} /> : <Lock size={13} />}
                {role ? ROLE_LABEL[role] : "Edit Mode"}
              </button>
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2 px-6 py-5 md:px-8" style={{ background: "linear-gradient(135deg, var(--sapphire) 0%, var(--tosca) 100%)" }}>
            <div className="flex items-baseline gap-2 text-white">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] opacity-80">
                {view === "weekly" ? "Week" : view === "biweekly" ? "Bi-Weekly" : view === "monthly" ? "Month" : "Quarter"}
              </span>
              {view === "weekly" && <span className="text-[28px] font-black leading-none">{week.wk}</span>}
              {view === "quarterly" && <span className="text-[28px] font-black leading-none">Q{getQuarterInfo(periodOffset).q}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPeriodOffset((o) => o - 1)}
                className="rounded p-1 text-white/85 transition hover:bg-white/15"
                aria-label="Previous period"
                title="Previous period"
              >‹</button>
              <div className="font-mono text-[11px] text-white/85">{range.label}</div>
              <button
                onClick={() => setPeriodOffset((o) => Math.min(0, o + 1))}
                disabled={periodOffset >= 0}
                className="rounded p-1 text-white/85 transition hover:bg-white/15 disabled:opacity-30"
                aria-label="Next period"
                title="Next period"
              >›</button>
              {periodOffset !== 0 && (
                <button
                  onClick={() => setPeriodOffset(0)}
                  className="ml-1 rounded bg-white/15 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-white transition hover:bg-white/25"
                >Today</button>
              )}
            </div>


            {/* VIEW MODE TOGGLE */}
            <div className="mt-1 inline-flex w-fit rounded-md bg-white/10 p-0.5">
              {(["weekly", "biweekly", "monthly", "quarterly"] as ViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider transition ${
                    view === v ? "bg-white text-[var(--sapphire)]" : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  {v === "weekly" ? "Weekly" : v === "biweekly" ? "Bi-Weekly" : v === "monthly" ? "Monthly" : "Quarterly"}
                </button>
              ))}
            </div>

            {role && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {role === "admin" && (
                  <>
                    <button onClick={exportData} className="flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/25"><Download size={11} /> Export</button>
                    <button onClick={() => fileInput.current?.click()} className="flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/25"><Upload size={11} /> Import</button>
                    <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) importData(f); e.currentTarget.value = ""; }} />
                  </>
                )}
                {role === "admin" && (
                  <button onClick={generateReport} className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-bold text-[var(--sapphire)] hover:bg-white/90"><Activity size={11} /> Generate Report</button>
                )}
                <button onClick={snapshot} className="flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/25"><Save size={11} /> Snapshot</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* BODY */}
      <main className="mx-auto flex max-w-[1600px] flex-col gap-4 px-4 py-5 md:px-6">
        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat dot="var(--sapphire)" label="Total Updates" value={stat.total.all} split={{ cbi: stat.total.cbi, cbp: stat.total.cbp }} />
          <Stat dot="var(--sky)" label="In Progress" value={stat.inProgress.all} split={{ cbi: stat.inProgress.cbi, cbp: stat.inProgress.cbp }} />
          <Stat dot="var(--green)" label="Live" value={stat.live.all} split={{ cbi: stat.live.cbi, cbp: stat.live.cbp }} />
          <Stat dot="#F59E0B" label="Planning" value={stat.planning.all} split={{ cbi: stat.planning.cbi, cbp: stat.planning.cbp }} />
          <Stat dot="var(--ai-color)" label={view === "weekly" ? "Week" : view === "biweekly" ? "Bi-Weekly" : view === "monthly" ? "Month" : "Quarter"} value={view === "weekly" ? `W${week.wk}` : view === "biweekly" ? "14d" : view === "monthly" ? new Date().toLocaleDateString("en-GB", { month: "short" }) : `Q${getQuarterInfo(periodOffset).q}`} />
        </div>

        {/* ANNOUNCEMENTS */}
        <AnnouncementBar
          items={filteredState.announcements}
          canEdit={canEditAnnouncements}
          onAdd={() => setAnnEdit({ a: null })}
          onEdit={(a) => setAnnEdit({ a })}
        />

        {/* MAIN GRID */}
        <div className="flex flex-col gap-4 xl:flex-row">
          {/* LEFT — CBI + CBP */}
          <div className="flex min-w-0 flex-[3] flex-col gap-4">
            {/* CBI */}
            <section className="rounded-xl bg-white p-4" style={{ border: "1px solid var(--border)", borderLeft: "4px solid var(--sapphire)" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">🇮🇩</span>
                <h2 className="text-[15px] font-extrabold" style={{ color: "var(--text-main)" }}>CBI — Credit Bureau Indonesia</h2>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row">
                {(["b2b", "sme", "skorku"] as LaneId[]).map((id) => (
                  <Lane key={id} laneId={id} state={filteredState} canEdit={canEditUpdates}
                    onAdd={(l, c) => setCardEdit({ laneId: l, cat: c, card: null })}
                    onEdit={(l, c, card) => setCardEdit({ laneId: l, cat: c, card })}
                    onRenameCategory={renameCategory}
                    onAddCategory={addCategory}
                    onRemoveCategory={removeCategory}
                  />
                ))}
              </div>
            </section>

            {/* CBP */}
            <section className="rounded-xl bg-white p-4" style={{ border: "1px solid var(--border)", borderLeft: "4px solid #F5C400" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">🇵🇭</span>
                <h2 className="text-[15px] font-extrabold" style={{ color: "var(--text-main)" }}>CBP — Credit Bureau Philippines</h2>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row">
                {(["cbp_b2b", "cbp_sme", "cbp_d2c"] as LaneId[]).map((id) => (
                  <Lane key={id} laneId={id} state={filteredState} canEdit={canEditUpdates}
                    onAdd={(l, c) => setCardEdit({ laneId: l, cat: c, card: null })}
                    onEdit={(l, c, card) => setCardEdit({ laneId: l, cat: c, card })}
                    onRenameCategory={renameCategory}
                    onAddCategory={addCategory}
                    onRemoveCategory={removeCategory}
                  />
                ))}
              </div>
            </section>
          </div>

          {/* RIGHT — AI Agents */}
          <div className="w-full xl:w-[280px] xl:shrink-0">
            <section className="rounded-xl p-4 h-full" style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.20)", borderLeft: "4px solid #7C3AED" }}>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles size={16} style={{ color: "#7C3AED" }} />
                <h2 className="text-[14px] font-extrabold" style={{ color: "var(--text-main)" }}>AI Agents — ID, PH & SG</h2>
              </div>
              <Lane laneId="ai" state={filteredState} canEdit={canEditUpdates}
                onAdd={(l, c) => setCardEdit({ laneId: l, cat: c, card: null })}
                onEdit={(l, c, card) => setCardEdit({ laneId: l, cat: c, card })}
                    onRenameCategory={renameCategory}
                    onAddCategory={addCategory}
                    onRemoveCategory={removeCategory}
              />
            </section>
          </div>
        </div>

        {/* MEETINGS & TO-DO */}
        <MeetingsSection
          items={visibleMeetings}
          canEdit={canEditMeetings}
          onAdd={() => setMtgEdit({ m: null })}
          onEdit={(m) => setMtgEdit({ m })}
          onToggleTodo={toggleMeetingTodo}
        />

        {/* PM TIMESHEET */}
        <PMTimesheet
          pms={state.pms}
          canEdit={canEditPM}
          onAdd={() => setPmEdit({ p: null })}
          onEdit={(p) => setPmEdit({ p })}
        />

        {/* MARKETING */}
        <MarketingSection
          items={state.marketing}
          canEdit={canEditMarketing}
          onAdd={() => setMkEdit({ m: null })}
          onEdit={(m) => setMkEdit({ m })}
          onArchive={(m) => {
            setState((s) => ({
              ...s,
              marketing: s.marketing.map((x) =>
                x.id !== m.id ? x : { ...x, status: x.status === "Archived" ? "Draft for Alignment" : "Archived", updatedAt: new Date().toISOString() }
              ),
            }));
            toast(m.status === "Archived" ? "✓ Restored from archive" : "✓ Archived — will stop rolling over");
          }}
        />
      </main>

      {/* FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t bg-white/95 backdrop-blur" style={{ borderColor: "var(--border)" }}>
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 md:px-6">
          <div className="font-mono text-[10px]" style={{ color: "var(--text-muted)" }}>
            CBI & CBP Product Intelligence • Confidential Internal Use • {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((s) => {
              const st = STATUS_STYLES[s];
              return (
                <span key={s} className="flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold" style={{ background: st.bg, color: st.fg }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.fg }} />
                  {s}
                </span>
              );
            })}
          </div>
        </div>
      </footer>

      {/* MODALS */}
      <PasswordModal open={pwOpen} onClose={() => setPwOpen(false)} onUnlock={(r) => { setRole(r); setPwOpen(false); toast(`Unlocked — ${r.toUpperCase()}`); }} />
      <EditCardModal
        open={!!cardEdit}
        initial={cardEdit?.card ?? null}
        owners={state.pms.filter((p) => (p.status ?? "Active") === "Active").map((p) => p.name)}
        onClose={() => setCardEdit(null)}
        onSave={(c) => cardEdit && saveCard(cardEdit.laneId, cardEdit.cat, c)}
        onDelete={cardEdit?.card ? () => deleteCard(cardEdit.laneId, cardEdit.cat, cardEdit.card!.id) : undefined}
      />
      <AnnouncementModal
        open={!!annEdit}
        initial={annEdit?.a ?? null}
        onClose={() => setAnnEdit(null)}
        onSave={(a) => {
          setState((s) => {
            const idx = s.announcements.findIndex((x) => x.id === a.id);
            const next = [...s.announcements];
            const stamped: Announcement = { ...a, postedAt: a.postedAt ?? new Date().toISOString() };
            if (idx >= 0) next[idx] = stamped; else next.push(stamped);
            return { ...s, announcements: next };
          });
          setAnnEdit(null); toast("✓ Announcement saved");
        }}
        onDelete={annEdit?.a ? () => {
          setState((s) => ({ ...s, announcements: s.announcements.filter((x) => x.id !== annEdit!.a!.id) }));
          setAnnEdit(null); toast("✓ Announcement deleted");
        } : undefined}
      />
      <PMModal
        open={!!pmEdit}
        initial={pmEdit?.p ?? null}
        onClose={() => setPmEdit(null)}
        onSave={(p) => {
          setState((s) => {
            const idx = s.pms.findIndex((x) => x.id === p.id);
            const next = [...s.pms];
            if (idx >= 0) next[idx] = p; else next.push(p);
            return { ...s, pms: next };
          });
          setPmEdit(null); toast("✓ PM saved");
        }}
        onDelete={pmEdit?.p ? () => {
          setState((s) => ({ ...s, pms: s.pms.filter((x) => x.id !== pmEdit!.p!.id) }));
          setPmEdit(null); toast("✓ PM removed");
        } : undefined}
      />
      <MarketingModal
        open={!!mkEdit}
        initial={mkEdit?.m ?? null}
        onClose={() => setMkEdit(null)}
        onSave={(m) => {
          const stamped = { ...m, updatedAt: new Date().toISOString() };
          setState((s) => {
            const idx = s.marketing.findIndex((x) => x.id === stamped.id);
            const next = [...s.marketing];
            if (idx >= 0) next[idx] = stamped; else next.push(stamped);
            return { ...s, marketing: next };
          });
          setMkEdit(null); toast("✓ Marketing saved");
        }}
        onDelete={mkEdit?.m ? () => {
          setState((s) => ({ ...s, marketing: s.marketing.filter((x) => x.id !== mkEdit!.m!.id) }));
          setMkEdit(null); toast("✓ Marketing deleted");
        } : undefined}
      />
      <MeetingModal
        open={!!mtgEdit}
        initial={mtgEdit?.m ?? null}
        owners={state.pms.filter((p) => (p.status ?? "Active") === "Active").map((p) => p.name)}
        onClose={() => setMtgEdit(null)}
        onSave={saveMeeting}
        onDelete={mtgEdit?.m ? () => deleteMeeting(mtgEdit!.m!.id) : undefined}
      />



      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

// Suppress unused imports warnings (kept for future use)
export const __unused = { Activity, Trash2 };
