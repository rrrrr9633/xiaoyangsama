import type { AppRole } from "./game";

export const XIAOYANG_ACCESS_CODE = "0906";
export const ADMIN_ACCESS_CODE = "0310";

export function matchesRoleCode(value: string, role: AppRole) {
  return value.trim() === (role === "xiaoyang" ? XIAOYANG_ACCESS_CODE : ADMIN_ACCESS_CODE);
}
