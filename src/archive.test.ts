import { beforeEach, describe, expect, it } from "vitest";
import {
  deleteMemoryArchive,
  loadBlessingConfig,
  loadMemoryArchives,
  makeMemoryArchive,
  saveBlessingConfig,
  saveMemoryArchive,
} from "./archive";
import { defaultBlessingConfig, loadAssets, saveAsset } from "./assets";
import { initialGameState } from "./game";

beforeEach(() => {
  window.localStorage.clear();
});

describe("本机纪念档案", () => {
  it("保存后可以读取完整状态、素材和祝福配置", async () => {
    const blessings = {
      ...defaultBlessingConfig,
      names: ["发起人", ...defaultBlessingConfig.names.slice(1)],
    };
    const archive = makeMemoryArchive(
      { ...initialGameState, chapter: "complete", shared: true },
      { photo: "photo-data", observation: ["detail-data"] },
      blessings,
      "poster-data",
    );

    expect(await saveMemoryArchive(archive)).toBe(true);
    await expect(loadMemoryArchives()).resolves.toEqual([archive]);
  });

  it("删除档案不会删除祝福配置", async () => {
    const archive = makeMemoryArchive(initialGameState, { observation: [] }, defaultBlessingConfig, "poster-data");
    await saveMemoryArchive(archive);
    const nextBlessings = { ...defaultBlessingConfig, messages: ["已准备好的祝福", ...defaultBlessingConfig.messages.slice(1)] };

    expect(saveBlessingConfig(nextBlessings)).toBe(true);
    expect(await deleteMemoryArchive(archive.id)).toBe(true);
    await expect(loadMemoryArchives()).resolves.toEqual([]);
    expect(loadBlessingConfig().messages[0]).toBe("已准备好的祝福");
  });
});

describe("本机素材", () => {
  it("保存照片和现场细节后可以重新读取", async () => {
    await saveAsset("photo", "photo-data");
    await saveAsset("observation", "detail-data", 1);

    await expect(loadAssets()).resolves.toEqual({
      photo: "photo-data",
      observation: [, "detail-data"],
    });
  });
});
