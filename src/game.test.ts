import { describe, expect, it } from "vitest";
import { initialGameState, matchesBirthdayCode, reduceGame, type GameState } from "./game";

describe("birthday game state", () => {
  it("starts at the invite chapter with no unlocked rewards", () => {
    expect(initialGameState.chapter).toBe("invite");
    expect(initialGameState.completedTasks).toEqual([]);
    expect(initialGameState.petals).toBe(0);
  });

  it("records a task once and grants its configured petals", () => {
    const started = reduceGame(initialGameState, { type: "start-journey" });
    const next = reduceGame(started, { type: "complete-task", taskId: "keywords" });

    expect(next.completedTasks).toEqual(["keywords"]);
    expect(next.petals).toBe(3);
    expect(reduceGame(next, { type: "complete-task", taskId: "keywords" })).toEqual(next);
  });

  it("moves from invite to first station and then to the memory station", () => {
    let state: GameState = initialGameState;
    state = reduceGame(state, { type: "start-journey" });
    expect(state.chapter).toBe("station-one");
    state = reduceGame(state, { type: "complete-task", taskId: "keywords" });
    state = reduceGame(state, { type: "complete-task", taskId: "puzzle" });
    state = reduceGame(state, { type: "complete-task", taskId: "station-one-checkin" });
    expect(state.chapter).toBe("station-two");
  });

  it("unlocks the finale after the second station is complete", () => {
    let state: GameState = {
      ...initialGameState,
      chapter: "station-two",
      completedTasks: ["keywords", "puzzle", "station-one-checkin"],
      petals: 3,
    };
    state = reduceGame(state, { type: "complete-task", taskId: "observation" });
    state = reduceGame(state, { type: "complete-task", taskId: "memory-order" });
    state = reduceGame(state, { type: "complete-task", taskId: "messenger" });
    state = reduceGame(state, { type: "verify-checkin", station: "station-two", method: "manual" });
    expect(state.chapter).toBe("finale");
  });
  it("records the choices and clears only current game progress", () => {
    let state = reduceGame(initialGameState, { type: "start-journey" });
    state = reduceGame(state, { type: "select-keyword", keyword: "勇敢" });
    expect(state.events.some((event) => event.type === "keyword" && event.value === "勇敢")).toBe(true);
    expect(reduceGame(state, { type: "reset-game" })).toEqual(initialGameState);
  });
  it("accepts only the current birthday code", () => {
    expect(matchesBirthdayCode("111111")).toBe(false);
    expect(matchesBirthdayCode(" 220906 ")).toBe(true);
  });

  it("opens the birthday finale only after all wishes are revealed", () => {
    const locked: GameState = {
      ...initialGameState,
      chapter: "finale",
      completedTasks: ["final-checkin", "final-code"],
    };
    expect(reduceGame(locked, { type: "open-birthday" }).chapter).toBe("finale");

    const ready: GameState = {
      ...locked,
      revealedWishes: Array.from({ length: 22 }, (_, index) => index),
      petals: 22,
    };
    expect(reduceGame(ready, { type: "open-birthday" }).chapter).toBe("complete");
  });
});
