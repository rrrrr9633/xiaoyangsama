export type Chapter = "invite" | "station-one" | "station-two" | "finale" | "complete";
export type TaskId =
  | "keywords"
  | "puzzle"
  | "station-one-checkin"
  | "observation"
  | "memory-order"
  | "messenger"
  | "final-code";

export interface GameState {
  chapter: Chapter;
  completedTasks: TaskId[];
  petals: number;
  selectedKeywords: string[];
  memoryOrder: string[];
  finalCode: string;
  shared: boolean;
}

export const initialGameState: GameState = {
  chapter: "invite",
  completedTasks: [],
  petals: 0,
  selectedKeywords: [],
  memoryOrder: [],
  finalCode: "",
  shared: false,
};

export type GameAction =
  | { type: "start-journey" }
  | { type: "complete-task"; taskId: TaskId }
  | { type: "select-keyword"; keyword: string }
  | { type: "set-memory-order"; order: string[] }
  | { type: "set-final-code"; code: string }
  | { type: "share" }
  | { type: "open-birthday" };

const chapterTasks: Record<Exclude<Chapter, "invite" | "complete">, TaskId[]> = {
  "station-one": ["keywords", "puzzle", "station-one-checkin"],
  "station-two": ["observation", "memory-order", "messenger"],
  finale: ["final-code"],
};

function isComplete(state: GameState, taskId: TaskId) {
  return state.completedTasks.includes(taskId);
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

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
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
    case "share":
      return { ...state, shared: true };
    case "open-birthday":
      return { ...state, chapter: "complete", petals: 22 };
    case "complete-task": {
      if (isComplete(state, action.taskId)) return state;
      const next = {
        ...state,
        completedTasks: [...state.completedTasks, action.taskId],
        petals: Math.min(22, state.petals + 1),
      };
      return { ...next, chapter: advanceChapter(next) };
    }
    default:
      return state;
  }
}

export function loadGame(): GameState {
  try {
    const saved = window.localStorage.getItem("time-letters-game");
    if (!saved) return initialGameState;
    return { ...initialGameState, ...JSON.parse(saved) } as GameState;
  } catch {
    return initialGameState;
  }
}

export function saveGame(state: GameState) {
  try {
    window.localStorage.setItem("time-letters-game", JSON.stringify(state));
  } catch {
    // Local progress is a convenience; the game remains usable if storage is unavailable.
  }
}
