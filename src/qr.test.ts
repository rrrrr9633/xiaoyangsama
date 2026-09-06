import { describe, expect, it } from "vitest";
import { makeQrCode } from "./qr";

describe("站点二维码", () => {
  it("生成带定位图形的 33×33 QR 矩阵", () => {
    const matrix = makeQrCode("time-letters://checkin/station-one");

    expect(matrix).toHaveLength(33);
    expect(matrix.every((row) => row.length === 33)).toBe(true);
    expect(matrix[0].slice(0, 7)).toEqual([true, true, true, true, true, true, true]);
    expect(matrix[0][7]).toBe(false);
  });

  it("为不同站点生成不同码", () => {
    const first = makeQrCode("time-letters://checkin/station-one");
    const second = makeQrCode("time-letters://checkin/station-two");

    expect(first.flat().join("")).not.toBe(second.flat().join(""));
  });
});
