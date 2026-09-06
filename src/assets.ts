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
  const empty: StoryAssets = { videos: [], observation: [] };
  if (!("indexedDB" in window)) return empty;
  try {
    const database = await openDatabase();
    const records = await new Promise<AssetRecord[]>((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result as AssetRecord[]);
      request.onerror = () => reject(request.error);
    });
    database.close();
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
    }, empty);
  } catch {
    return empty;
  }
}

export async function saveAsset(slot: AssetSlot, data: string, index?: number) {
  if (!("indexedDB" in window)) return;
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, "readwrite").objectStore(storeName).put({ slot: slotKey(slot, index), data });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
  } catch {
    // 素材无法持久化时，当前页面仍保留已读取的内容。
  }
}
