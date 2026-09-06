import { defaultBlessingConfig, type BlessingConfig, type StoryAssets } from "./assets";
import type { GameState } from "./game";

export type MemoryArchive = {
  id: string;
  savedAt: string;
  state: GameState;
  assets: StoryAssets;
  blessings: BlessingConfig;
  poster: string;
};

const databaseName = "time-letters-archives";
const storeName = "memory-archives";
const archiveFallbackKey = "time-letters-archives-v1";
const blessingStorageKey = "time-letters-blessings-v1";

function clone<T>(value: T): T {
  return typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value)) as T;
}

function readFallbackArchives(): MemoryArchive[] {
  try {
    const saved = window.localStorage.getItem(archiveFallbackKey);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed as MemoryArchive[] : [];
  } catch {
    return [];
  }
}

function writeFallbackArchives(archives: MemoryArchive[]) {
  try {
    window.localStorage.setItem(archiveFallbackKey, JSON.stringify(archives));
    return true;
  } catch {
    return false;
  }
}

export function loadBlessingConfig(): BlessingConfig {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(blessingStorageKey) || "null") as Partial<BlessingConfig> | null;
    return {
      ...clone(defaultBlessingConfig),
      ...parsed,
      names: Array.isArray(parsed?.names) ? parsed.names.map(String).slice(0, 4) : [...defaultBlessingConfig.names],
      messages: Array.isArray(parsed?.messages) ? parsed.messages.map(String).slice(0, 4) : [...defaultBlessingConfig.messages],
      openingEvaluations: Array.isArray(parsed?.openingEvaluations) ? parsed.openingEvaluations.map(String).slice(0, 5) : [...defaultBlessingConfig.openingEvaluations],
    };
  } catch {
    return clone(defaultBlessingConfig);
  }
}

export function saveBlessingConfig(config: BlessingConfig) {
  try {
    window.localStorage.setItem(blessingStorageKey, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadMemoryArchives(): Promise<MemoryArchive[]> {
  if (!("indexedDB" in window)) return readFallbackArchives().sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  try {
    const database = await openDatabase();
    const archives = await new Promise<MemoryArchive[]>((resolve, reject) => {
      const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
      request.onsuccess = () => resolve(request.result as MemoryArchive[]);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return archives.sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  } catch {
    return readFallbackArchives().sort((left, right) => right.savedAt.localeCompare(left.savedAt));
  }
}

export async function saveMemoryArchive(archive: MemoryArchive) {
  if (!("indexedDB" in window)) return writeFallbackArchives([...readFallbackArchives(), archive]);
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(archive);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
    return true;
  } catch {
    return writeFallbackArchives([...readFallbackArchives(), archive]);
  }
}

export async function deleteMemoryArchive(id: string) {
  if (!("indexedDB" in window)) return writeFallbackArchives(readFallbackArchives().filter((archive) => archive.id !== id));
  try {
    const database = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const request = database.transaction(storeName, "readwrite").objectStore(storeName).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    database.close();
    return true;
  } catch {
    return writeFallbackArchives(readFallbackArchives().filter((archive) => archive.id !== id));
  }
}

export function makeMemoryArchive(state: GameState, assets: StoryAssets, blessings: BlessingConfig, poster: string): MemoryArchive {
  const savedAt = new Date().toISOString();
  return {
    id: `${savedAt}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt,
    state: clone(state),
    assets: clone(assets),
    blessings: clone(blessings),
    poster,
  };
}
