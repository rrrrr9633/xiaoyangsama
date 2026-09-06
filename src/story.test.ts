import { describe, expect, it } from "vitest";
import { storyPhotos, storyPhotosFor } from "./story";

describe("生日照片故事", () => {
  it("按图片编号保留十个片段及对应文案", () => {
    expect(storyPhotos).toHaveLength(10);
    expect(storyPhotos.map((photo) => photo.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(storyPhotos.map((photo) => photo.title)).toEqual([
      "一起去皇城海洋乐园",
      "一起吃必胜汉堡",
      "龙之梦看到的可爱小狗狗",
      "突然发现的很美的街道",
      "超级水果盆！",
      "七夕在soosoo庆祝",
      "200送1100网费还吃了必胜客和炸鸡",
      "一起建的房子特别温馨",
      "生日预热",
      "张嘉桐的手写信",
    ]);
  });

  it("按旅程阶段展示照片，而不是提前泄露后续片段", () => {
    expect(storyPhotosFor("station-one").map((photo) => photo.id)).toEqual([1, 2]);
    expect(storyPhotosFor("station-two").map((photo) => photo.id)).toEqual([3, 4, 5, 6, 7, 8]);
    expect(storyPhotosFor("finale").map((photo) => photo.id)).toEqual([9, 10]);
  });
});
