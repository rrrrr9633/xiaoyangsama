import { describe, expect, it } from "vitest";
import { matchesRoleCode } from "./auth";

describe("角色入口", () => {
  it("只允许小漾生日进入小漾端", () => {
    expect(matchesRoleCode("0906", "xiaoyang")).toBe(true);
    expect(matchesRoleCode("0310", "xiaoyang")).toBe(false);
  });

  it("只允许管理生日进入发起人端", () => {
    expect(matchesRoleCode("0310", "admin")).toBe(true);
    expect(matchesRoleCode("0906", "admin")).toBe(false);
  });
});
