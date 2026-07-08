import { useEffect, useState } from "react";
import type { Role } from "@/lib/cbi/types";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { verifyRolePassword } from "@/lib/cbi/auth.functions";

export function PasswordModal({
  open, onClose, onUnlock,
}: { open: boolean; onClose: () => void; onUnlock: (role: Exclude<Role, null>) => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = useServerFn(verifyRolePassword);

  useEffect(() => {
    if (!open) { setPw(""); setErr(""); setShow(false); setBusy(false); }
  }, [open]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { role } = await verify({ data: { password: pw } });
      if (role) onUnlock(role);
      else setErr("Incorrect password. Please try again.");
    } catch {
      setErr("Could not verify password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--gray-100)" }}>
            <Lock size={16} style={{ color: "var(--sapphire)" }} />
          </div>
          <h2 className="text-[17px] font-extrabold" style={{ color: "var(--text-main)" }}>
            Product Team Access
          </h2>
        </div>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--text-sec)" }}>
          Enter your password. Access level depends on your role.
        </p>
        <div className="relative">
          <input
            autoFocus
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Password"
            className="w-full rounded-lg border px-3.5 py-2.5 pr-10 text-sm outline-none focus:ring-2"
            style={{
              borderColor: err ? "#EF4444" : "var(--border-md)",
              ['--tw-ring-color' as string]: "rgba(0,158,255,0.25)",
            }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--text-muted)] hover:text-[var(--text-sec)]"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {err && <p className="mt-2 text-xs" style={{ color: "#DC2626" }}>{err}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--border-md)", color: "var(--text-sec)" }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
            style={{ background: "var(--sapphire)" }}
          >
            {busy ? "Verifying…" : "Unlock Edit Mode"}
          </button>
        </div>
        <p className="mt-3 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          Contact the product team lead for access
        </p>
      </div>
    </div>
  );
}
