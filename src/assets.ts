export type BlessingConfig = {
  names: string[];
  messages: string[];
  openingEvaluations: string[];
};

export const defaultBlessingConfig: BlessingConfig = {
  names: ["男朋友", "闺蜜", "信使 A", "信使 B"],
  messages: [
    "你把普通的日子过成了我们都想收藏的样子。",
    "希望你永远保留可爱，也永远有选择生活的勇气。",
    "你认真发光的每一天，都值得被好好记住。",
    "22 岁，去更大的世界，也别忘了回头看看我们。",
  ],
  openingEvaluations: [
    "勇敢，但从来不把温柔弄丢。",
    "会把平凡日子过出闪光细节的人。",
    "嘴上说着没事，心里却装着很多人的小漾。",
    "值得被认真准备一场生日冒险。",
    "我们想陪你把新一岁走得更远一点。",
  ],
};

export type StoryAssets = {
  photo?: string;
  videos: (string | undefined)[];
  audio?: string;
  observation: (string | undefined)[];
};

type AssetSlot = "photo" | "audio" | "video" | "observation";
type AssetRecord = { slot: string; data: string };

const databaseName = "time-letters-assets";
const storeName = "private-assets";
const fallbackKey = "time-letters-assets-v1";

const emptyAssets = (): StoryAssets => ({ videos: [], observation: [] });

function readFallbackAssets(): AssetRecord[] {
  try {
    const saved = window.localStorage.getItem(fallbackKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed as AssetRecord[] : [];
  } catch {
    return [];
  }
}

function writeFallbackAsset(record: AssetRecord) {
  const records = readFallbackAssets().filter((item) => item.slot !== record.slot);
  try {
    window.localStorage.setItem(fallbackKey, JSON.stringify([...records, record]));
  } catch {
    // 本机容量不足时，页面仍继续保留当前会话中的素材。
  }
}

function recordsToAssets(records: AssetRecord[]): StoryAssets {
  return records.reduce((assets, record) => {
    if (record.slot === "photo") return { ...assets, photo: record.data };
    if (record.slot === "audio") return { ...assets, audio: record.data };
    if (record.slot.startsWith("video-")) {
      const videos = [...assets.videos];
      videos[Number(record.slot.slice(6))] = record.data;
      return { ...assets, videos };
    }
    if (record.slot.startsWith("observation-")) {
      const observation = [...assets.observation];
      observation[Number(record.slot.slice(12))] = record.data;
      return { ...assets, observation };
    }
    return assets;
  }, emptyAssets());
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "slot" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function slotKey(slot: AssetSlot, index?: number) {
  return index === undefined ? slot : `${slot}-${index}`;
}

export async function loadAssets(): Promise<StoryAssets> {
  if (!("indexedDB" in window)) return recordsToAssets(readFallbackAssets());
  try {
    const database = await openDatabase();
    const records = await new Promise<AssetRecord[]>((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result as AssetRecord[]);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return recordsToAssets(records);
  } catch {
    return recordsToAssets(readFallbackAssets());
  }
}

export async function saveAsset(slot: AssetSlot, data: string, index?: number) {
  const record = { slot: slotKey(slot, index), data };
  if (!("indexedDB" in window)) {
    writeFallbackAsset(record);
    return;
  }
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    writeFallbackAsset(record);
  }
}
