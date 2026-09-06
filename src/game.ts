export type PlayMode = "real" | "remote";
export type Chapter = "invite" | "station-one" | "station-two" | "finale" | "complete";
export type StationId = "station-one" | "station-two" | "finale";
export type CheckinMethod = "gps" | "qr" | "phrase" | "manual";
export type TaskId =
  | "keywords"
  | "puzzle"
  | "station-one-checkin"
  | "observation"
  | "memory-order"
  | "messenger"
  | "station-two-checkin"
  | "final-checkin"
  | "final-code";

export interface GameState {
  chapter: Chapter;
  completedTasks: TaskId[];
  petals: number;
  selectedKeywords: string[];
  memoryOrder: string[];
  finalCode: string;
  shared: boolean;
  checkins: Partial<Record<StationId, CheckinMethod>>;
  playMode: PlayMode;
  revealedWishes: number[];
}

export const BIRTHDAY_CODE = "220906";
export const WISH_COUNT = 22;

export function matchesBirthdayCode(value: string) {
  return value.trim() === BIRTHDAY_CODE;
}

export const initialGameState: GameState = {
  chapter: "invite",
  completedTasks: [],
  petals: 0,
  selectedKeywords: [],
  memoryOrder: [],
  finalCode: "",
  shared: false,
  checkins: {},
  playMode: "real",
  revealedWishes: [],
};

export type GameAction =
  | { type: "choose-mode"; mode: PlayMode }
  | { type: "start-journey" }
  | { type: "complete-task"; taskId: TaskId }
  | { type: "verify-checkin"; station: StationId; method: CheckinMethod }
  | { type: "select-keyword"; keyword: string }
  | { type: "set-memory-order"; order: string[] }
  | { type: "set-final-code"; code: string }
  | { type: "reveal-wish"; index: number }
  | { type: "share" }
  | { type: "open-birthday" };

const chapterTasks: Record<Exclude<Chapter, "invite" | "complete">, TaskId[]> = {
  "station-one": ["keywords", "puzzle", "station-one-checkin"],
  "station-two": ["observation", "memory-order", "messenger", "station-two-checkin"],
  finale: ["final-checkin", "final-code"],
};

const stationTask: Record<StationId, TaskId> = {
  "station-one": "station-one-checkin",
  "station-two": "station-two-checkin",
  finale: "final-checkin",
};

const taskPetals: Partial<Record<TaskId, number>> = {
  keywords: 3,
  puzzle: 2,
  "station-one-checkin": 1,
  observation: 3,
  "memory-order": 3,
  messenger: 2,
  "station-two-checkin": 1,
  "final-checkin": 1,
  "final-code": 6,
};

function isComplete(state: GameState, taskId: TaskId) {
  return state.completedTasks.includes(taskId);
}

function tasksForChapter(chapter: Chapter): TaskId[] {
  return chapter === "invite" || chapter === "complete" ? [] : chapterTasks[chapter];
}

function advanceChapter(state: GameState): Chapter {
  if (state.chapter === "station-one" && chapterTasks["station-one"].every((task) => isComplete(state, task))) {
    return "station-two";
  }
  if (state.chapter === "station-two" && chapterTasks["station-two"].every((task) => isComplete(state, task))) {
    return "finale";
  }
  return state.chapter;
}

function completeTask(state: GameState, taskId: TaskId): GameState {
  if (isComplete(state, taskId) || !tasksForChapter(state.chapter).includes(taskId)) return state;
  const next = {
    ...state,
    completedTasks: [...state.completedTasks, taskId],
    petals: Math.min(WISH_COUNT, state.petals + (taskPetals[taskId] ?? 1)),
  };
  return { ...next, chapter: advanceChapter(next) };
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "choose-mode":
      return { ...state, playMode: action.mode };
    case "start-journey":
      return state.chapter === "invite" ? { ...state, chapter: "station-one" } : state;
    case "select-keyword":
      return state.selectedKeywords.includes(action.keyword)
        ? { ...state, selectedKeywords: state.selectedKeywords.filter((keyword) => keyword !== action.keyword) }
        : state.selectedKeywords.length >= 3
          ? state
          : { ...state, selectedKeywords: [...state.selectedKeywords, action.keyword] };
    case "set-memory-order":
      return { ...state, memoryOrder: action.order };
    case "set-final-code":
      return { ...state, finalCode: action.code };
    case "reveal-wish":
      return !isComplete(state, "final-code") || state.revealedWishes.includes(action.index) || action.index < 0 || action.index >= WISH_COUNT
        ? state
        : { ...state, revealedWishes: [...state.revealedWishes, action.index], petals: Math.min(WISH_COUNT, state.petals + 1) };
    case "verify-checkin":
      return state.checkins[action.station] || !tasksForChapter(state.chapter).includes(stationTask[action.station])
        ? state
        : completeTask({ ...state, checkins: { ...state.checkins, [action.station]: action.method } }, stationTask[action.station]);
    case "share":
      return { ...state, shared: true };
    case "open-birthday":
      return isComplete(state, "final-code") && state.revealedWishes.length === WISH_COUNT
        ? { ...state, chapter: "complete", petals: WISH_COUNT }
        : state;
    case "complete-task":
      return completeTask(state, action.taskId);
    default:
      return state;
  }
}

const storageKey = "time-letters-game-v2";

export function loadGame(): GameState {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return initialGameState;
    const parsed = JSON.parse(saved) as Partial<GameState>;
    const allowedWishes = Array.isArray(parsed.revealedWishes)
      ? [...new Set(parsed.revealedWishes.filter((index) => Number.isInteger(index) && index >= 0 && index < WISH_COUNT))]
      : [];
    return {
      ...initialGameState,
      ...parsed,
      finalCode: typeof parsed.finalCode === "string" ? parsed.finalCode : "",
      completedTasks: Array.isArray(parsed.completedTasks) ? parsed.completedTasks : [],
      selectedKeywords: Array.isArray(parsed.selectedKeywords) ? parsed.selectedKeywords : [],
      memoryOrder: Array.isArray(parsed.memoryOrder) ? parsed.memoryOrder : [],
      revealedWishes: allowedWishes,
      checkins: parsed.checkins ?? {},
    };
  } catch {
    return initialGameState;
  }
}

export function saveGame(state: GameState) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // 本地进度不可用时，仍然允许完整游玩。
  }
}
