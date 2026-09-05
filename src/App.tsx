import { useEffect, useReducer, useState, useRef } from "react";
import {
  initialGameState,
  loadGame,
  reduceGame,
  saveGame,
  type Chapter,
  type GameState,
  type TaskId,
} from "./game";

const taskMeta: Record<TaskId, { title: string; label: string; reward: string }> = {
  keywords: { title: "把她写进今天", label: "关键词合成", reward: "获得「心意」装备" },
  puzzle: { title: "拼回那一刻", label: "记忆拼图", reward: "获得「回放」装备" },
  "station-one-checkin": { title: "第一枚印章", label: "现场确认", reward: "路线亮起" },
  observation: { title: "红色记忆", label: "现场观察", reward: "获得「观察」装备" },
  "memory-order": { title: "把时间排好", label: "共同记忆", reward: "获得「时间线」装备" },
  messenger: { title: "信使已抵达", label: "实体信件", reward: "获得「信使」装备" },
  "final-code": { title: "打开最后一封信", label: "生日密码", reward: "解锁 22 朵花" },
};

const chapters: { id: Chapter; kicker: string; title: string; place: string }[] = [
  { id: "station-one", kicker: "第一封信", title: "出发", place: "好再来大盘子 · 惠工社区店" },
  { id: "station-two", kicker: "第二封信", title: "我们走过的地方", place: "中街 · 东中街附近" },
  { id: "finale", kicker: "最后一封信", title: "22 岁以后", place: "狼头山火锅 · 东站店" },
];

function isDone(state: GameState, id: TaskId) {
  return state.completedTasks.includes(id);
}

function App() {
  const [state, dispatch] = useReducer(reduceGame, undefined, loadGame);
  const [showHint, setShowHint] = useState(false);
  const [keywordDraft, setKeywordDraft] = useState<string[]>(state.selectedKeywords);
  const [memoryDraft, setMemoryDraft] = useState<string[]>([]);
  const [codeDraft, setCodeDraft] = useState(state.finalCode);

  useEffect(() => saveGame(state), [state]);

  useEffect(() => {
    setKeywordDraft(state.selectedKeywords);
    setCodeDraft(state.finalCode);
  }, [state.selectedKeywords, state.finalCode]);

  const completedCount = state.completedTasks.length;
  const activeChapter = state.chapter === "invite" || state.chapter === "complete" ? "station-one" : state.chapter;
  const chapterIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeChapter));
  const progress = Math.round((completedCount / 7) * 100);

  const handleKeyword = (keyword: string) => {
    const next = keywordDraft.includes(keyword)
      ? keywordDraft.filter((item) => item !== keyword)
      : keywordDraft.length >= 3
        ? keywordDraft
        : [...keywordDraft, keyword];
    setKeywordDraft(next);
    dispatch({ type: "select-keyword", keyword });
  };

  const shareResult = async () => {
    const shareData = { title: "22封时光信", text: "今天，我们一起走完了一封写给她的生日信。", url: window.location.href };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(window.location.href);
    }
    dispatch({ type: "share" });
  };

  if (state.chapter === "invite") {
    return <InviteScreen onStart={() => dispatch({ type: "start-journey" })} />;
  }

  if (state.chapter === "complete") {
    return <FinaleScreen state={state} onShare={shareResult} />;
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">22</span>
          <span>封时光信</span>
        </div>
        <div className="topbar-meta">
          <span className="room-status"><i /> 私密房间</span>
          <span className="progress-copy">{completedCount} / 7 已完成</span>
        </div>
      </header>

      <section className="journey-layout">
        <div className="journey-main">
          <div className="chapter-heading">
            <p className="chapter-kicker">{chapters[chapterIndex].kicker}</p>
            <h1>{chapters[chapterIndex].title}</h1>
            <p className="chapter-place">{chapters[chapterIndex].place}</p>
          </div>

          <RouteMap activeIndex={chapterIndex} state={state} />

          <div className="section-rule">
            <span>当前任务</span>
            <span className="petal-count"><b>{state.petals}</b> / 22 朵花瓣</span>
          </div>

          {state.chapter === "station-one" && (
            <StationOne
              state={state}
              showHint={showHint}
              keywordDraft={keywordDraft}
              onKeyword={handleKeyword}
              onComplete={(taskId) => dispatch({ type: "complete-task", taskId })}
              onHint={() => setShowHint((value) => !value)}
            />
          )}
          {state.chapter === "station-two" && (
            <StationTwo
              state={state}
              showHint={showHint}
              memoryDraft={memoryDraft}
              setMemoryDraft={setMemoryDraft}
              onComplete={(taskId) => dispatch({ type: "complete-task", taskId })}
              onHint={() => setShowHint((value) => !value)}
            />
          )}
          {state.chapter === "finale" && (
            <FinaleTasks
              state={state}
              codeDraft={codeDraft}
              setCodeDraft={setCodeDraft}
              onCode={() => {
                dispatch({ type: "set-final-code", code: codeDraft });
                if (codeDraft.trim().toLowerCase() === "2208") dispatch({ type: "complete-task", taskId: "final-code" });
              }}
              onOpen={() => dispatch({ type: "open-birthday" })}
            />
          )}
        </div>

        <aside className="story-rail" aria-label="故事进度">
          <div className="rail-heading"><span>这趟路</span><span>{progress}%</span></div>
          <div className="rail-track"><span style={{ height: `${Math.max(8, progress)}%` }} /></div>
          <div className="rail-list">
            {chapters.map((chapter, index) => {
              const reached = index <= chapterIndex;
              return (
                <div className={`rail-stop ${reached ? "is-reached" : ""} ${index === chapterIndex ? "is-current" : ""}`} key={chapter.id}>
                  <span className="rail-dot" />
                  <div><strong>{chapter.kicker}</strong><small>{chapter.place.split(" · ")[0]}</small></div>
                </div>
              );
            })}
          </div>
          <button className="text-button" onClick={() => setShowHint((value) => !value)}>{showHint ? "收起提示" : "需要一点提示？"}</button>
        </aside>
      </section>
    </main>
  );
}

function InviteScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="invite-screen">
      <div className="invite-noise" aria-hidden="true" />
      <header className="invite-topbar">
        <div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信</span></div>
        <span className="invite-date">一场只属于五个人的生日任务</span>
      </header>
      <section className="invite-content">
        <div className="invite-copy">
          <p className="chapter-kicker">给小漾的生日任务</p>
          <h1>今天，去找回<br /><em>闪闪发光的片段。</em></h1>
          <p className="invite-lead">四位信使已经就位。沿着沈阳的夜色走两站，最后一封信不在地图上。</p>
          <button className="primary-button large" onClick={onStart}>开始这场生日任务 <span>↗</span></button>
          <p className="invite-note">建议由闺蜜拿着手机 · 全程约 3–4 小时</p>
        </div>
        <div className="invite-art" aria-label="三站路线预览">
          <div className="art-skyline"><span /><span /><span /><span /><span /></div>
          <div className="art-route"><i className="route-dash dash-one" /><i className="route-dash dash-two" /><i className="route-dash dash-three" /></div>
          <div className="art-node node-one"><b>01</b><span>出发</span></div>
          <div className="art-node node-two"><b>02</b><span>记忆</span></div>
          <div className="art-node node-three"><b>22</b><span>终章</span></div>
          <div className="art-caption">SHENYANG / 22:00<br /><strong>一封写给今天的信</strong></div>
        </div>
      </section>
      <footer className="invite-footer"><span>沈阳 · 私密生日地图</span><span>房间 05 / 05</span></footer>
    </main>
  );
}

function RouteMap({ activeIndex, state }: { activeIndex: number; state: GameState }) {
  const amapKey = import.meta.env.VITE_AMAP_KEY;
  const serviceHost = import.meta.env.VITE_AMAP_SERVICE_HOST || "https://xn--sama-px9gg69g.top/_AMapService";
  const [realMapReady, setRealMapReady] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!amapKey || !mapRef.current) return;
    window._AMapSecurityConfig = { serviceHost };
    const existing = document.querySelector<HTMLScriptElement>("script[data-amap]");
    const script = existing || document.createElement("script");
    if (!existing) {
      script.dataset.amap = "true";
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapKey)}`;
      script.async = true;
      document.head.appendChild(script);
    }
    const onReady = () => setRealMapReady(Boolean(window.AMap));
    script.addEventListener("load", onReady);
    if (window.AMap) onReady();
    return () => script.removeEventListener("load", onReady);
  }, [amapKey, serviceHost]);

  useEffect(() => {
    if (!realMapReady || !mapRef.current || !window.AMap) return;
    const map = new window.AMap.Map(mapRef.current, { zoom: 12, center: [123.43, 41.8], viewMode: "2D" });
    // Prototype anchors only. Replace the first and final points after on-site AMap geocoding.
    const stops: [number, number][] = [[123.445, 41.823], [123.470596, 41.802831], [123.49, 41.82]];
    const markers = stops.map((position, index) => {
      const marker = new window.AMap!.Marker({ position, title: chapters[index].place });
      marker.setMap(map);
      return marker;
    });
    const line = new window.AMap.Polyline({ path: stops, strokeColor: "#c75b4f", strokeWeight: 4, strokeOpacity: .85, strokeStyle: "dashed", lineJoin: "round" });
    line.setMap(map);
    return () => map.destroy();
  }, [realMapReady]);

  return (
    <div className={`route-map ${realMapReady ? "has-real-map" : ""}`}>
      {amapKey && <div className="real-map-layer" ref={mapRef} aria-label="沈阳地图" />}
      <div className="map-grid" aria-hidden="true" />
      <div className="map-label map-label-a">和平区</div><div className="map-label map-label-b">沈河区</div><div className="map-label map-label-c">大东区</div>
      <div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" />
      <div className="map-path"><span className="path-segment segment-one" /><span className="path-segment segment-two" /></div>
      {chapters.map((chapter, index) => {
        const reached = index < activeIndex || state.chapter === "complete";
        return <div className={`map-stop map-stop-${index + 1} ${index === activeIndex ? "is-active" : ""} ${reached ? "is-reached" : ""}`} key={chapter.id}><b>{index === 2 ? "22" : `0${index + 1}`}</b><span>{chapter.place.split(" · ")[0]}</span></div>;
      })}
      <div className="map-compass">N<br /><span>+</span></div>
      <div className="map-caption">沈阳夜行手账 <span>·</span> {realMapReady ? "地图已接入" : "路线未公开"}</div>
    </div>
  );
}

function TaskRow({ taskId, title, copy, done, onComplete, children }: { taskId: TaskId; title: string; copy: string; done: boolean; onComplete: () => void; children?: React.ReactNode }) {
  return (
    <article className={`task-row ${done ? "is-done" : ""}`}>
      <div className="task-index">{done ? "✓" : taskId === "station-one-checkin" ? "03" : taskId === "messenger" ? "03" : taskId === "memory-order" ? "02" : taskId === "observation" ? "01" : taskId === "puzzle" ? "02" : "01"}</div>
      <div className="task-body"><div className="task-title-line"><h3>{title}</h3><span>{done ? "已完成" : taskMeta[taskId].reward}</span></div><p>{copy}</p>{children}</div>
      {!children && !done && <button className="small-button" onClick={onComplete}>完成</button>}
    </article>
  );
}

function StationOne({ state, keywordDraft, onKeyword, onComplete, showHint, onHint }: { state: GameState; keywordDraft: string[]; onKeyword: (keyword: string) => void; onComplete: (taskId: TaskId) => void; showHint: boolean; onHint: () => void }) {
  const words = ["勇敢", "可爱", "嘴硬", "浪漫", "自由"];
  return <div className="task-list">
    <TaskRow taskId="keywords" title="把她写进今天" copy="五个人各选一个词。选完后，第一封信会出现。" done={isDone(state, "keywords")} onComplete={() => onComplete("keywords")}>
      {!isDone(state, "keywords") && <div className="choice-block"><div className="choice-grid">{words.map((word) => <button key={word} className={`choice-chip ${keywordDraft.includes(word) ? "is-selected" : ""}`} onClick={() => onKeyword(word)}>{word}</button>)}</div><button className="inline-action" disabled={keywordDraft.length !== 3} onClick={() => onComplete("keywords")}>{keywordDraft.length === 3 ? "合成第一封信" : `还差 ${3 - keywordDraft.length} 个词`}</button></div>}
      {isDone(state, "keywords") && <div className="letter-snippet">“你身上有勇敢的光，也有让人想一直靠近的自由。”</div>}
    </TaskRow>
    <TaskRow taskId="puzzle" title="拼回那一刻" copy="把一张旧照片拼完整。今天不需要拍照，记忆本身就是道具。" done={isDone(state, "puzzle")} onComplete={() => onComplete("puzzle")}>
      {!isDone(state, "puzzle") && <div className="puzzle-block"><div className="puzzle-grid">{["#c6a36b", "#6b7973", "#a9584d", "#d4bf91", "#596b69", "#b47d63"].map((color, index) => <span key={index} style={{ background: color }} />)}</div><button className="inline-action" onClick={() => onComplete("puzzle")}>我拼好了</button></div>}
      {isDone(state, "puzzle") && <div className="letter-snippet">第一站不是目的地，是有人一直陪你出发。</div>}
    </TaskRow>
    <TaskRow taskId="station-one-checkin" title="第一枚印章" copy="到达惠工社区店后，让闺蜜扫描实体信封里的二维码。" done={isDone(state, "station-one-checkin")} onComplete={() => onComplete("station-one-checkin")}>
      {!isDone(state, "station-one-checkin") && <div className="checkin-block"><span className="fake-qr" aria-hidden="true">▦</span><div><strong>好再来大盘子 · 惠工社区店</strong><small>定位只是提示，二维码才是确认</small></div><button className="small-button" onClick={() => onComplete("station-one-checkin")}>确认到场</button></div>}
    </TaskRow>
    {showHint && <p className="hint-line">提示：三个任务不必一次做完，先把你最想对她说的三个词选出来。</p>}
    <button className="text-button task-hint" onClick={onHint}>{showHint ? "收起提示" : "需要一点提示？"}</button>
  </div>;
}

function StationTwo({ state, memoryDraft, setMemoryDraft, onComplete, showHint, onHint }: { state: GameState; memoryDraft: string[]; setMemoryDraft: (items: string[]) => void; onComplete: (taskId: TaskId) => void; showHint: boolean; onHint: () => void }) {
  const memories = ["第一次一起看夜场电影", "五个人临时决定去海边", "她说想去看更大的世界"];
  return <div className="task-list">
    <TaskRow taskId="observation" title="红色记忆" copy="在安全的公共区域，找一处你们提前拍下的红色细节。" done={isDone(state, "observation")} onComplete={() => onComplete("observation")}>
      {!isDone(state, "observation") && <div className="observation-block"><div className="observation-swatch"><span /><span /><span /></div><div className="observation-options"><button onClick={() => onComplete("observation")}>是那扇红色的门</button><button onClick={() => onComplete("observation")}>是路边的灯牌</button></div></div>}
    </TaskRow>
    <TaskRow taskId="memory-order" title="把时间排好" copy="按你记得的顺序，把三件小事排成一条时间线。" done={isDone(state, "memory-order")} onComplete={() => onComplete("memory-order")}>
      {!isDone(state, "memory-order") && <div className="memory-block"><div className="memory-options">{memories.map((item) => <button key={item} className={memoryDraft.includes(item) ? "is-selected" : ""} onClick={() => setMemoryDraft(memoryDraft.includes(item) ? memoryDraft.filter((value) => value !== item) : [...memoryDraft, item])}><span>{memoryDraft.indexOf(item) + 1 || "·"}</span>{item}</button>)}</div><button className="inline-action" disabled={memoryDraft.length !== 3} onClick={() => onComplete("memory-order")}>确认这条时间线</button></div>}
    </TaskRow>
    <TaskRow taskId="messenger" title="信使已抵达" copy="两位朋友各交出一张实体卡片，网页只负责为它盖章。" done={isDone(state, "messenger")} onComplete={() => onComplete("messenger")}>
      {!isDone(state, "messenger") && <div className="messenger-block"><div className="messenger-card"><span>信使 A</span><strong>你让我们记住的事</strong></div><div className="messenger-card"><span>信使 B</span><strong>希望你 22 岁拥有的事</strong></div><button className="small-button" onClick={() => onComplete("messenger")}>两张都收到</button></div>}
    </TaskRow>
    {showHint && <p className="hint-line">提示：答案没有标准版本，按寿星的记忆确认就好。</p>}
    <button className="text-button task-hint" onClick={onHint}>{showHint ? "收起提示" : "需要一点提示？"}</button>
  </div>;
}

function FinaleTasks({ state, codeDraft, setCodeDraft, onCode, onOpen }: { state: GameState; codeDraft: string; setCodeDraft: (value: string) => void; onCode: () => void; onOpen: () => void }) {
  const unlocked = isDone(state, "final-code");
  return <div className="finale-panel">
    <div className="finale-intro"><span className="finale-seal">22</span><div><p className="chapter-kicker">东站 · 终点</p><h2>最后一封信，不在地图上。</h2><p>四位信使的祝福已经准备好。先输入只有你们知道的生日密码。</p></div></div>
    {!unlocked ? <div className="code-form"><label htmlFor="birthday-code">生日密码</label><div className="code-input-row"><input id="birthday-code" inputMode="numeric" value={codeDraft} onChange={(event) => setCodeDraft(event.target.value)} placeholder="例如 2208" /><button className="primary-button" onClick={onCode}>打开信封</button></div><small>提示：可以用“22 + 第一次见面的月份”。演示密码为 2208。</small></div> : <div className="unlocked-panel"><div className="video-placeholder"><span>▶</span><p>四人祝福接力</p><small>终点包间内播放</small></div><div className="flower-grid">{Array.from({ length: 22 }, (_, index) => <span key={index} className="flower-petal is-lit" style={{ "--delay": `${index * 35}ms` } as React.CSSProperties}>{index + 1}</span>)}</div><button className="primary-button large" onClick={onOpen}>打开生日终章 <span>↗</span></button></div>}
  </div>;
}

function FinaleScreen({ state, onShare }: { state: GameState; onShare: () => void }) {
  return <main className="finale-screen"><div className="finale-glow" aria-hidden="true" /><header className="invite-topbar"><div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信</span></div><span className="invite-date">终章已打开</span></header><section className="finale-content"><p className="chapter-kicker">To 小漾 · 22</p><h1>愿你以后每一次出发，<br /><em>都有喜欢的人在身边。</em></h1><p className="finale-copy">今天的路线走完了，故事还会继续。现在，请收下现实里的最后一件道具。</p><div className="bouquet"><div className="bouquet-stems" />{Array.from({ length: 22 }, (_, index) => <span key={index} className="bouquet-flower" style={{ "--i": index } as React.CSSProperties}>✦</span>)}</div><div className="finale-actions"><button className="primary-button large" onClick={onShare}>{state.shared ? "链接已复制" : "保存这封信"} <span>↗</span></button><span>22 支花，等你在包间里亲手拆开。</span></div></section><footer className="invite-footer"><span>沈阳 · 生日任务完成</span><span>05 位同行者</span></footer></main>;
}

export default App;
