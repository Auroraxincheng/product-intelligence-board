import { useEffect, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { verifyViewerPasscode } from "@/lib/cbi/auth.functions";

const STORAGE_KEY = "cbi_viewer_unlocked";

export function useViewerGate() {
  const [unlocked, setUnlocked] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) === "1") setUnlocked(true);
    } catch {}
  }, []);
  const unlock = () => {
    try { sessionStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setUnlocked(true);
  };
  return { unlocked, unlock };
}

export function ViewerGate({ onUnlock }: { onUnlock: () => void }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = useServerFn(verifyViewerPasscode);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { ok } = await verify({ data: { passcode: pw } });
      if (ok) onUnlock();
      else setErr("Incorrect passcode. Please try again.");
    } catch {
      setErr("Could not verify passcode. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.92)" }}
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-center gap-3">
          <img src="/__l5e/assets-v1/ea79a44e-7572-4d68-92db-94572148f1e6/cbi-logo.svg" alt="CBI" className="h-9 w-auto" />
          <div className="h-7 w-px" style={{ background: "var(--border-md)" }} />
          <img src="/__l5e/assets-v1/6f71444c-c6df-4fae-a02b-92ca9c28fec3/cbp-logo.svg" alt="CBP" className="h-4 w-auto" />
        </div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: "var(--gray-100)" }}>
            <Lock size={16} style={{ color: "var(--sapphire)" }} />
          </div>
          <h2 className="text-[17px] font-extrabold" style={{ color: "var(--text-main)" }}>
            Board Access
          </h2>
        </div>
        <p className="text-[12.5px] mb-4" style={{ color: "var(--text-sec)" }}>
          Enter the viewer passcode to access the Product Intelligence Board.
        </p>
        <div className="relative">
          <input
            autoFocus
            type={show ? "text" : "password"}
            value={pw}
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Passcode"
            inputMode="numeric"
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
            aria-label={show ? "Hide passcode" : "Show passcode"}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {err && <p className="mt-2 text-xs" style={{ color: "#DC2626" }}>{err}</p>}
        <button
          onClick={submit}
          disabled={busy}
          className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: "var(--sapphire)" }}
        >
          {busy ? "Verifying…" : "Enter Board"}
        </button>
        <p className="mt-3 text-center text-[11px]" style={{ color: "var(--text-muted)" }}>
          Contact the product team if you don't have the passcode
        </p>
      </div>
    </div>
  );
}
