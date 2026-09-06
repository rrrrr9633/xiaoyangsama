import { describe, expect, it } from "vitest";
import { matchesRoleCode, resolveRoleCode } from "./auth";

describe("角色入口", () => {
  it("根据生日口令静默分流角色", () => {
    expect(resolveRoleCode("0906")).toBe("xiaoyang");
    expect(resolveRoleCode(" 0310 ")).toBe("admin");
    expect(resolveRoleCode("1234")).toBeNull();
  });

  it("只允许小漾生日进入小漾端", () => {
    expect(matchesRoleCode("0906", "xiaoyang")).toBe(true);
    expect(matchesRoleCode("0310", "xiaoyang")).toBe(false);
  });

  it("只允许管理生日进入发起人端", () => {
    expect(matchesRoleCode("0310", "admin")).toBe(true);
    expect(matchesRoleCode("0906", "admin")).toBe(false);
  });
});
