import type { AppRole } from "./game";

export const XIAOYANG_ACCESS_CODE = "0906";
export const ADMIN_ACCESS_CODE = "0310";

export function resolveRoleCode(value: string): AppRole | null {
  const code = value.trim();
  if (code === XIAOYANG_ACCESS_CODE) return "xiaoyang";
  if (code === ADMIN_ACCESS_CODE) return "admin";
  return null;
}

export function matchesRoleCode(value: string, role: AppRole) {
  return resolveRoleCode(value) === role;
}
