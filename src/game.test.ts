import { describe, expect, it } from "vitest";
import { initialGameState, reduceGame, type GameState } from "./game";

describe("birthday game state", () => {
  it("starts at the invite chapter with no unlocked rewards", () => {
    expect(initialGameState.chapter).toBe("invite");
    expect(initialGameState.completedTasks).toEqual([]);
    expect(initialGameState.petals).toBe(0);
  });

  it("records a task once and grants one petal", () => {
    const next = reduceGame(initialGameState, { type: "complete-task", taskId: "keywords" });

    expect(next.completedTasks).toEqual(["keywords"]);
    expect(next.petals).toBe(1);
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
    expect(state.chapter).toBe("finale");
  });
});
