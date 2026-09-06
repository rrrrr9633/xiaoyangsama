export type PlayMode = "real" | "remote";
export type AppRole = "xiaoyang" | "admin";
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

export type GameEvent = {
  type: "mode" | "journey" | "keyword" | "puzzle" | "memory" | "checkin" | "task" | "code" | "wish" | "birthday";
  value: string;
  at: string;
};

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
  events: GameEvent[];
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
  events: [],
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
  | { type: "open-birthday" }
  | { type: "reset-game" };

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

export function isTaskComplete(state: GameState, taskId: TaskId) {
  return state.completedTasks.includes(taskId);
}

function recordEvent(state: GameState, type: GameEvent["type"], value: string): GameState {
  return { ...state, events: [...state.events, { type, value, at: new Date().toISOString() }] };
}

function tasksForChapter(chapter: Chapter): TaskId[] {
  return chapter === "invite" || chapter === "complete" ? [] : chapterTasks[chapter];
}

function advanceChapter(state: GameState): Chapter {
  if (state.chapter === "station-one" && chapterTasks["station-one"].every((task) => isTaskComplete(state, task))) {
    return "station-two";
  }
  if (state.chapter === "station-two" && chapterTasks["station-two"].every((task) => isTaskComplete(state, task))) {
    return "finale";
  }
  return state.chapter;
}

function completeTask(state: GameState, taskId: TaskId): GameState {
  if (isTaskComplete(state, taskId) || !tasksForChapter(state.chapter).includes(taskId)) return state;
  const next = recordEvent({
    ...state,
    completedTasks: [...state.completedTasks, taskId],
    petals: Math.min(WISH_COUNT, state.petals + (taskPetals[taskId] ?? 1)),
  }, taskId === "puzzle" ? "puzzle" : "task", taskId);
  return { ...next, chapter: advanceChapter(next) };
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "choose-mode":
      return recordEvent({ ...state, playMode: action.mode }, "mode", action.mode);
    case "start-journey":
      return state.chapter === "invite" ? recordEvent({ ...state, chapter: "station-one" }, "journey", "start") : state;
    case "select-keyword": {
      const selectedKeywords = state.selectedKeywords.includes(action.keyword)
        ? state.selectedKeywords.filter((keyword) => keyword !== action.keyword)
        : state.selectedKeywords.length >= 3
          ? state.selectedKeywords
          : [...state.selectedKeywords, action.keyword];
      return recordEvent({ ...state, selectedKeywords }, "keyword", selectedKeywords.join("、"));
    }
    case "set-memory-order":
      return recordEvent({ ...state, memoryOrder: action.order }, "memory", action.order.join(" → "));
    case "set-final-code":
      return recordEvent({ ...state, finalCode: action.code }, "code", action.code);
    case "reveal-wish":
      return !isTaskComplete(state, "final-code") || state.revealedWishes.includes(action.index) || action.index < 0 || action.index >= WISH_COUNT
        ? state
        : recordEvent({ ...state, revealedWishes: [...state.revealedWishes, action.index], petals: Math.min(WISH_COUNT, state.petals + 1) }, "wish", String(action.index + 1));
    case "verify-checkin":
      return state.checkins[action.station] || !tasksForChapter(state.chapter).includes(stationTask[action.station])
        ? state
        : completeTask(recordEvent({ ...state, checkins: { ...state.checkins, [action.station]: action.method } }, "checkin", `${action.station}:${action.method}`), stationTask[action.station]);
    case "share":
      return recordEvent({ ...state, shared: true }, "birthday", "archive-saved");
    case "open-birthday":
      return isTaskComplete(state, "final-code") && state.revealedWishes.length === WISH_COUNT
        ? recordEvent({ ...state, chapter: "complete", petals: WISH_COUNT }, "birthday", "opened")
        : state;
    case "reset-game":
      return { ...initialGameState };
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
      events: Array.isArray(parsed.events) ? parsed.events : [],
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
