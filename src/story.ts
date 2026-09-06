import photo01 from "../picture/1.jpg";
import photo02 from "../picture/2.jpg";
import photo03 from "../picture/3.jpg";
import photo04 from "../picture/4.jpg";
import photo05 from "../picture/5.jpg";
import photo06 from "../picture/6.jpg";
import photo07 from "../picture/7.jpg";
import photo08 from "../picture/8.jpg";
import photo09 from "../picture/9.jpg";
import photo10 from "../picture/10.jpg";

export type StoryChapter = "invite" | "station-one" | "station-two" | "finale";

export type StoryPhoto = {
  id: number;
  src: string;
  title: string;
  note: string;
  chapter: StoryChapter;
};

export const storyPhotos: StoryPhoto[] = [
  { id: 1, src: photo01, title: "一起去皇城海洋乐园", note: "一起把那天的快乐带回来。", chapter: "station-one" },
  { id: 2, src: photo02, title: "一起吃必胜汉堡", note: "两个人的汉堡，要一起吃才算完整。", chapter: "station-one" },
  { id: 3, src: photo03, title: "龙之梦看到的可爱小狗狗", note: "在龙之梦突然遇见的可爱，被认真记住了。", chapter: "station-two" },
  { id: 4, src: photo04, title: "突然发现的很美的街道", note: "没有安排的风景，也会成为很美的一站。", chapter: "station-two" },
  { id: 5, src: photo05, title: "超级水果盆！", note: "把甜甜的水果装满，也把那天的好心情装满。", chapter: "station-two" },
  { id: 6, src: photo06, title: "七夕在soosoo庆祝", note: "七夕那天，我们如此幸福。", chapter: "station-two" },
  { id: 7, src: photo07, title: "200送1100网费还吃了必胜客和炸鸡", note: "那天的网费、必胜客和炸鸡，也都值得好好记住。", chapter: "station-two" },
  { id: 8, src: photo08, title: "一起建的房子特别温馨", note: "一点一点建起来的房子，像我们一起过出的日子。", chapter: "station-two" },
  { id: 9, src: photo09, title: "生日预热", note: "生日还没到，期待已经先亮起来了。", chapter: "finale" },
  { id: 10, src: photo10, title: "张嘉桐的手写信", note: "这封手写信，留给终章最后打开。", chapter: "finale" },
];

export function storyPhotosFor(chapter: StoryChapter) {
  return storyPhotos.filter((photo) => photo.chapter === chapter);
}
