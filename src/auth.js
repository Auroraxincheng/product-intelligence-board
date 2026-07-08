import { roles } from "./config.js";

const defaultPasscodes = {
  viewer: "000",
  pm_team: "000",
  product_lead: "000",
  admin: "000",
  pmm: "000",
};

export function normalizeRole(role) {
  return role === "pm_editor" ? "pm_team" : role;
}

export function getPasscodes() {
  return Object.fromEntries(
    roles.map((role) => {
      const envName = `PIB_PASSCODE_${role.toUpperCase()}`;
      return [role, process.env[envName] || defaultPasscodes[role]];
    }),
  );
}

export function validatePasscode(role, passcode) {
  const normalizedRole = normalizeRole(role);
  if (!roles.includes(normalizedRole)) return null;
  const normalized = String(passcode || "").trim();
  const passcodes = getPasscodes();
  return passcodes[normalizedRole] === normalized ? normalizedRole : null;
}

export function validatePasscodeWithConfig(role, passcode, passcodes = {}) {
  const normalizedRole = normalizeRole(role);
  if (!roles.includes(normalizedRole)) return null;
  const normalized = String(passcode || "").trim();
  const configured = passcodes[normalizedRole] || passcodes[role] || getPasscodes()[normalizedRole];
  return configured === normalized ? normalizedRole : null;
}

export function canEditUpdates(role) {
  return ["pm_team", "pm_editor", "product_lead", "admin"].includes(role);
}

export function canArchive(role) {
  return ["product_lead", "admin"].includes(role);
}

export function canManageEverything(role) {
  return role === "admin";
}

export function canUsePmm(role) {
  return ["pmm", "product_lead", "admin"].includes(role);
}
