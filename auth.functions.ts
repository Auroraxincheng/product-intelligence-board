import { createServerFn } from "@tanstack/react-start";

// Server-side credential store. Passwords never ship to the browser bundle.
const VIEWER_PASSCODES = new Set<string>(["0"]);

const ROLE_PASSWORDS: Record<string, "team" | "admin" | "pmm"> = {
  "0": "admin",
};

export const verifyViewerPasscode = createServerFn({ method: "POST" })
  .inputValidator((input: { passcode: string }) => ({
    passcode: String(input?.passcode ?? ""),
  }))
  .handler(async ({ data }) => {
    return { ok: VIEWER_PASSCODES.has(data.passcode) };
  });

export const verifyRolePassword = createServerFn({ method: "POST" })
  .inputValidator((input: { password: string }) => ({
    password: String(input?.password ?? ""),
  }))
  .handler(async ({ data }) => {
    const role = ROLE_PASSWORDS[data.password] ?? null;
    return { role };
  });
