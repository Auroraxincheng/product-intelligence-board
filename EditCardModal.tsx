import { useEffect, useState } from "react";
import type { Market, Status, UpdateCard } from "@/lib/cbi/types";
import { ALL_STATUSES } from "@/lib/cbi/utils";
import { newId } from "@/lib/cbi/store";

const MARKETS: Market[] = ["🇮🇩 ID", "🇵🇭 PH", "🇸🇬 SG", "🌏 Regional"];

const blank = (): UpdateCard => ({
  id: newId(),
  title: "",
  desc: "",
  links: [""],
  status: "In Progress",
  date: new Date().toISOString().slice(0, 10),
  targetDate: "",
  owner: "",
  market: "🇮🇩 ID",
});

export function EditCardModal({
  open, initial, owners = [], onClose, onSave, onDelete,
}: {
  open: boolean;
  initial: UpdateCard | null;
  owners?: string[];
  onClose: () => void;
  onSave: (c: UpdateCard) => void;
  onDelete?: () => void;
}) {
  const [c, setC] = useState<UpdateCard>(blank());

  useEffect(() => {
    if (initial) {
      const links = initial.links && initial.links.length
        ? initial.links
        : (initial.link ? [initial.link] : [""]);
      setC({ ...initial, links });
    } else {
      setC(blank());
    }
  }, [initial, open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const fld = "w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2";
  const fldStyle = {
    borderColor: "var(--border-md)",
    ['--tw-ring-color' as string]: "rgba(0,158,255,0.25)",
  };
  const lbl = "block text-[10px] font-mono font-semibold uppercase tracking-wider mb-1.5";
  const lblStyle = { color: "var(--text-sec)" };

  const links = c.links ?? [""];
  const updateLink = (i: number, v: string) => {
    const next = [...links];
    next[i] = v;
    setC({ ...c, links: next });
  };
  const addLink = () => setC({ ...c, links: [...links, ""] });
  const removeLink = (i: number) => {
    const next = links.filter((_, idx) => idx !== i);
    setC({ ...c, links: next.length ? next : [""] });
  };

  const handleSave = () => {
    if (!c.title.trim()) return;
    const cleaned = (c.links ?? []).map((l) => l.trim()).filter(Boolean);
    const { link: _ignore, ...rest } = c;
    const subTasks = (c.subTasks ?? []).filter((t) => t.text.trim()).map((t) => ({ ...t, text: t.text.trim() }));
    onSave({ ...rest, links: cleaned, link: cleaned[0], subTasks });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl my-8" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-extrabold mb-4" style={{ color: "var(--text-main)" }}>
          {initial ? "Edit Update" : "New Update"}
        </h2>
        <div className="space-y-3">
          <div>
            <label className={lbl} style={lblStyle}>Title</label>
            <input className={fld} style={fldStyle} value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
          </div>
          <div>
            <label className={lbl} style={lblStyle}>Description</label>
            <textarea rows={3} className={fld} style={fldStyle} value={c.desc ?? ""} onChange={(e) => setC({ ...c, desc: e.target.value })} />
          </div>
          <div>
            <label className={lbl} style={lblStyle}>Sub-Tasks</label>
            <div className="space-y-2">
              {(c.subTasks ?? []).map((t, i) => {
                const upd = (patch: Partial<typeof t>) => {
                  const next = [...(c.subTasks ?? [])];
                  next[i] = { ...t, ...patch };
                  setC({ ...c, subTasks: next });
                };
                return (
                  <div key={t.id} className="rounded-lg border p-2" style={{ borderColor: "var(--border-md)" }}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={t.done}
                        onChange={(e) => upd({ done: e.target.checked, status: e.target.checked ? "Done" : t.status })}
                        className="h-4 w-4 shrink-0"
                      />
                      <input
                        className={fld}
                        style={fldStyle}
                        placeholder="Sub-task…"
                        value={t.text}
                        onChange={(e) => upd({ text: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => setC({ ...c, subTasks: (c.subTasks ?? []).filter((_, idx) => idx !== i) })}
                        className="shrink-0 rounded-lg border px-2.5 text-sm font-semibold"
                        style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}
                        aria-label="Remove sub-task"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <select
                        className={fld}
                        style={fldStyle}
                        value={t.status ?? "In Progress"}
                        onChange={(e) => upd({ status: e.target.value as Status, done: e.target.value === "Done" || e.target.value === "Live" || e.target.value === "Complete" })}
                      >
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <input
                        type="date"
                        className={fld}
                        style={fldStyle}
                        value={t.date ?? ""}
                        onChange={(e) => upd({ date: e.target.value })}
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-[1fr_1.4fr] gap-2">
                      <input
                        className={fld}
                        style={fldStyle}
                        placeholder="Document name (optional)"
                        value={t.linkName ?? ""}
                        onChange={(e) => upd({ linkName: e.target.value })}
                      />
                      <input
                        type="url"
                        className={fld}
                        style={fldStyle}
                        placeholder="https://… (document link)"
                        value={t.linkUrl ?? ""}
                        onChange={(e) => upd({ linkUrl: e.target.value })}
                      />
                    </div>
                    {t.status === "Escalation Required" && (
                      <div className="mt-2">
                        <label className={lbl} style={lblStyle}>Escalation Ask</label>
                        <input
                          className={fld}
                          style={fldStyle}
                          placeholder="e.g. Need CEO to sign document"
                          value={t.ask ?? ""}
                          onChange={(e) => upd({ ask: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setC({ ...c, subTasks: [...(c.subTasks ?? []), { id: newId(), text: "", done: false, status: "In Progress", date: new Date().toISOString().slice(0, 10) }] })}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold"
                style={{ borderColor: "var(--border-md)", color: "var(--sapphire)" }}
              >
                + Add sub-task
              </button>
            </div>
          </div>
          <div>
            <label className={lbl} style={lblStyle}>Documents / Links</label>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={fld}
                    style={fldStyle}
                    placeholder="https://…"
                    value={l}
                    onChange={(e) => updateLink(i, e.target.value)}
                  />
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLink(i)}
                      className="shrink-0 rounded-lg border px-2.5 text-sm font-semibold"
                      style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}
                      aria-label="Remove link"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addLink}
                className="rounded-lg border px-3 py-1.5 text-[11px] font-semibold"
                style={{ borderColor: "var(--border-md)", color: "var(--sapphire)" }}
              >
                + Add link
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={lblStyle}>Status</label>
              <select className={fld} style={fldStyle} value={c.status} onChange={(e) => setC({ ...c, status: e.target.value as Status })}>
                {ALL_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl} style={lblStyle}>Date of Post</label>
              <input type="date" className={fld} style={fldStyle} value={c.date} onChange={(e) => setC({ ...c, date: e.target.value })} />
            </div>
            <div>
              <label className={lbl} style={lblStyle}>Target Completion Date</label>
              <input
                type="date"
                className={fld}
                style={fldStyle}
                value={c.targetDate ?? ""}
                onChange={(e) => setC({ ...c, targetDate: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl} style={lblStyle}>Owner</label>
              {owners.length > 0 ? (
                <select className={fld} style={fldStyle} value={c.owner} onChange={(e) => setC({ ...c, owner: e.target.value })}>
                  <option value="">Select PM…</option>
                  {!owners.includes(c.owner) && c.owner && <option value={c.owner}>{c.owner}</option>}
                  {owners.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input className={fld} style={fldStyle} placeholder="e.g. Yuxuan, Stephen" value={c.owner} onChange={(e) => setC({ ...c, owner: e.target.value })} />
              )}
            </div>
            <div>
              <label className={lbl} style={lblStyle}>Market</label>
              <select className={fld} style={fldStyle} value={c.market} onChange={(e) => setC({ ...c, market: e.target.value as Market })}>
                {MARKETS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2">
          {onDelete && (
            <button onClick={onDelete} className="rounded-lg px-3 py-2 text-sm font-semibold mr-auto" style={{ background: "rgba(239,68,68,0.10)", color: "#B91C1C" }}>
              Delete
            </button>
          )}
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-semibold" style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="rounded-lg px-4 py-2 text-sm font-bold text-white"
              style={{ background: "var(--sapphire)" }}
            >
              Save Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
