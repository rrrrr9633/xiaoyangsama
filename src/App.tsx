import { useEffect, useReducer, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, ReactNode } from "react";
import { loadAssets, saveAsset, type BlessingConfig, type StoryAssets } from "./assets";
import { deleteMemoryArchive, loadBlessingConfig, loadMemoryArchives, makeMemoryArchive, saveBlessingConfig, saveMemoryArchive, type MemoryArchive } from "./archive";
import { resolveRoleCode } from "./auth";
import { makeQrCode } from "./qr";
import { storyPhotos, storyPhotosFor, type StoryPhoto } from "./story";
import {
  loadGame,
  matchesBirthdayCode,
  reduceGame,
  saveGame,
  WISH_COUNT,
  type AppRole,
  type Chapter,
  type CheckinMethod,
  type GameState,
  type GameEvent,
  type PlayMode,
  type StationId,
  type TaskId,
  isTaskComplete,
} from "./game";

const taskMeta: Record<TaskId, { title: string; reward: string }> = {
  keywords: { title: "把她写进今天", reward: "获得「心意」" },
  puzzle: { title: "拼回那一刻", reward: "获得「回放」" },
  "station-one-checkin": { title: "第一枚印章", reward: "路线亮起" },
  observation: { title: "红色记忆", reward: "获得「观察」" },
  "memory-order": { title: "把时间排好", reward: "获得「时间线」" },
  messenger: { title: "信使已抵达", reward: "获得「信使」" },
  "station-two-checkin": { title: "第二枚印章", reward: "旧城回应你" },
  "final-checkin": { title: "终点已抵达", reward: "最后一封信出现" },
  "final-code": { title: "打开最后一封信", reward: "打开 22 个愿望" },
};

const chapters: { id: Chapter; kicker: string; title: string; place: string }[] = [
  { id: "station-one", kicker: "第一封信", title: "出发", place: "好再来大盘子 · 惠工社区店" },
  { id: "station-two", kicker: "第二封信", title: "我们走过的地方", place: "东中街附近" },
  { id: "finale", kicker: "最后一封信", title: "22 岁以后", place: "东北大马路附近 · 烧烤 KTV" },
];

const mapStops: { station: StationId; position: [number, number]; label: string }[] = [
  { station: "station-one", position: [123.445, 41.823], label: "好再来大盘子" },
  { station: "station-two", position: [123.470596, 41.802831], label: "东中街附近" },
  { station: "finale", position: [123.49, 41.82], label: "东北大马路附近 · 烧烤 KTV" },
];

const wishes = [
  "愿你永远拥有把平凡过得闪亮的能力。", "愿你想去的地方，都有好天气。", "愿你被认真倾听，也被温柔惦记。", "愿你的勇敢总有回声。", "愿你保留对世界的好奇。", "愿你每一次选择都更靠近自己。", "愿你笑起来的时候，眼睛一直有光。", "愿你遇见很多真诚的人。", "愿你不必迎合任何人的期待。", "愿你有说走就走的自由。", "愿你永远知道自己值得被爱。", "愿你忙有所获，闲有所乐。", "愿你把委屈留在昨天。", "愿你拥有属于自己的小小宇宙。", "愿你在新的一岁睡得好、吃得香。", "愿你想做的事，都能慢慢做到。", "愿你被生活偏爱，也有拥抱生活的力气。", "愿你一直是那个会发光的小漾。", "愿你身边始终有并肩的人。", "愿你不慌不忙，走自己的路。", "愿你每次回头，都看见我们在。", "生日快乐，22 岁的你值得所有好事。",
];

type AssetReader = (event: ChangeEvent<HTMLInputElement>, key: "photo" | "observation", index?: number) => void;

function describeEvent(event: GameEvent) {
  const labels: Record<GameEvent["type"], string> = { mode: "游玩方式", journey: "开始旅程", keyword: "关键词选择", puzzle: "拼图完成", memory: "时间线选择", checkin: "地点签到", task: "任务完成", code: "生日密码", wish: "愿望翻开", birthday: "生日终章" };
  return `${labels[event.type]}：${event.value}`;
}

export default function App() {
  const [state, dispatch] = useReducer(reduceGame, undefined, loadGame);
  const [role, setRole] = useState<AppRole | null>(null);
  const [keywordDraft, setKeywordDraft] = useState<string[]>(state.selectedKeywords);
  const [memoryDraft, setMemoryDraft] = useState<string[]>(state.memoryOrder);
  const [codeDraft, setCodeDraft] = useState(state.finalCode);
  const [errorMessage, setErrorMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [assets, setAssets] = useState<StoryAssets>({ observation: [] });
  const [blessings, setBlessings] = useState<BlessingConfig>(loadBlessingConfig);
  const [archives, setArchives] = useState<MemoryArchive[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<MemoryArchive | null>(null);

  useEffect(() => {
    void loadAssets().then(setAssets);
    void loadMemoryArchives().then(setArchives);
  }, []);
  useEffect(() => saveGame(state), [state]);
  useEffect(() => {
    setKeywordDraft(state.selectedKeywords);
    setMemoryDraft(state.memoryOrder);
    setCodeDraft(state.finalCode);
  }, [state.selectedKeywords, state.memoryOrder, state.finalCode]);

  const login = (code: string) => {
    const nextRole = resolveRoleCode(code);
    if (!nextRole) return false;
    setErrorMessage("");
    setShareMessage("");
    setRole(nextRole);
    return true;
  };
  const logout = () => {
    setRole(null);
    setSelectedArchive(null);
    setErrorMessage("");
  };
  const complete = (taskId: TaskId) => {
    setErrorMessage("");
    dispatch({ type: "complete-task", taskId });
  };
  const chooseKeyword = (keyword: string) => {
    const next = keywordDraft.includes(keyword)
      ? keywordDraft.filter((item) => item !== keyword)
      : keywordDraft.length >= 3 ? keywordDraft : [...keywordDraft, keyword];
    setKeywordDraft(next);
    dispatch({ type: "select-keyword", keyword });
  };
  const setMemory = (item: string) => {
    const next = memoryDraft.includes(item) ? memoryDraft.filter((value) => value !== item) : [...memoryDraft, item];
    setMemoryDraft(next);
    dispatch({ type: "set-memory-order", order: next });
  };
  const readAsset: AssetReader = (event, key, index) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = String(reader.result);
      setAssets((current) => {
        if (key === "observation" && index !== undefined) {
          const observation = [...current.observation];
          observation[index] = data;
          return { ...current, observation };
        }
        return { ...current, [key]: data };
      });
      void saveAsset(key, data, index);
    };
    reader.readAsDataURL(file);
  };
  const openFinalCode = () => {
    dispatch({ type: "set-final-code", code: codeDraft });
    if (matchesBirthdayCode(codeDraft)) complete("final-code");
    else setErrorMessage("这封信还没有被正确唤醒，再试一次。");
  };
  const openBirthday = () => {
    const next = reduceGame(state, { type: "open-birthday" });
    if (next.chapter === state.chapter) {
      setErrorMessage("还有花瓣没有点亮，等所有愿望都读完再打开生日终章。");
      return;
    }
    setErrorMessage("");
    dispatch({ type: "open-birthday" });
  };
  const shareResult = async () => {
    const poster = await createPoster(assets.photo);
    if (!poster) {
      setShareMessage("当前设备无法生成海报，请截取这一页留存。");
      return;
    }
    const posterData = await fileToDataUrl(poster);
    const archive = makeMemoryArchive(reduceGame(state, { type: "share" }), assets, blessings, posterData);
    const saved = await saveMemoryArchive(archive);
    if (!saved) {
      setShareMessage("纪念档案没有保存成功，请稍后再试。");
      return;
    }
    setArchives((current) => [archive, ...current]);
    let shared = false;
    if (navigator.share && navigator.canShare?.({ files: [poster] })) {
      try {
        await navigator.share({ title: "22封时光信", text: "今天，我们一起走完了一封写给她的生日信。", files: [poster] });
        shared = true;
      } catch {
        setShareMessage("纪念档案已保存，海报仍可再次下载。");
      }
    } else {
      const url = URL.createObjectURL(poster);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "22封时光信.png";
      anchor.click();
      URL.revokeObjectURL(url);
      shared = true;
    }
    if (shared) setShareMessage("纪念档案与海报已保存。");
    dispatch({ type: "share" });
    dispatch({ type: "reset-game" });
    setRole(null);
  };

  if (!role) {
    if (selectedArchive) return <ArchiveScreen archive={selectedArchive} onBack={() => setSelectedArchive(null)} onDelete={async () => { await deleteMemoryArchive(selectedArchive.id); setArchives((current) => current.filter((archive) => archive.id !== selectedArchive.id)); setSelectedArchive(null); }} />;
    return <LoginScreen archives={archives} onLogin={login} onArchive={setSelectedArchive} errorMessage={errorMessage} />;
  }
  if (role === "admin") return <AdminScreen blessings={blessings} onSave={(next) => { setBlessings(next); saveBlessingConfig(next); }} onLogout={logout} />;
  if (state.chapter === "invite") return <InviteScreen mode={state.playMode} blessings={blessings} onMode={(mode) => dispatch({ type: "choose-mode", mode })} onStart={() => dispatch({ type: "start-journey" })} onLogout={logout} />;
  if (state.chapter === "complete") return <FinaleScreen state={state} blessings={blessings} wishes={wishes} shareMessage={shareMessage} onShare={shareResult} onLogout={logout} />;

  const activeChapter = state.chapter;
  const chapterIndex = Math.max(0, chapters.findIndex((chapter) => chapter.id === activeChapter));
  const progressCount = state.chapter === "finale" && isTaskComplete(state, "final-code") ? state.revealedWishes.length : state.petals;
  const progress = Math.round((progressCount / WISH_COUNT) * 100);
  const checkin = (station: StationId, method: CheckinMethod) => dispatch({ type: "verify-checkin", station, method });

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信</span></div>
        <div className="topbar-meta"><span className="progress-copy">小漾端 · {progressCount} / 22 已点亮</span><button className="text-button" onClick={logout}>退出</button></div>
      </header>
      <section className="journey-layout">
        <div className="journey-main">
          <div className="chapter-heading"><p className="chapter-kicker">{chapters[chapterIndex].kicker}</p><h1>{chapters[chapterIndex].title}</h1><p className="chapter-place">{chapters[chapterIndex].place}</p></div>
          <RouteMap activeIndex={chapterIndex} state={state} />
          <div className="section-rule"><span>当前任务</span><span className="petal-count"><b>{state.petals}</b> / 22 朵花瓣</span></div>
          {state.chapter === "station-one" && <StationOne state={state} assets={assets} onAsset={readAsset} keywordDraft={keywordDraft} onKeyword={chooseKeyword} onComplete={complete} onCheckin={checkin} />}
          {state.chapter === "station-two" && <StationTwo state={state} assets={assets} onAsset={readAsset} memoryDraft={memoryDraft} onMemory={setMemory} onComplete={complete} onCheckin={checkin} />}
          {state.chapter === "finale" && <FinaleTasks state={state} blessings={blessings} codeDraft={codeDraft} setCodeDraft={setCodeDraft} errorMessage={errorMessage} onCode={openFinalCode} onCheckin={checkin} onOpen={openBirthday} wishes={wishes} revealedWishes={state.revealedWishes} onRevealWish={(index) => dispatch({ type: "reveal-wish", index })} />}
        </div>
        <aside className="story-rail" aria-label="故事进度"><div className="rail-heading"><span>这趟路</span><span>{progress}%</span></div><div className="rail-track"><span style={{ height: `${Math.max(8, progress)}%` }} /></div><div className="rail-list">{chapters.map((chapter, index) => <div className={`rail-stop ${index <= chapterIndex ? "is-reached" : ""} ${index === chapterIndex ? "is-current" : ""}`} key={chapter.id}><span className="rail-dot" /><div><strong>{chapter.kicker}</strong><small>{index <= chapterIndex ? chapter.place.split(" · ")[0] : "下一封信"}</small></div></div>)}</div></aside>
      </section>
    </main>
  );
}

function LoginScreen({ archives, onLogin, onArchive, errorMessage }: { archives: MemoryArchive[]; onLogin: (code: string) => boolean; onArchive: (archive: MemoryArchive) => void; errorMessage: string }) {
  const [code, setCode] = useState("");
  const [localError, setLocalError] = useState("");
  const submit = () => {
    if (!onLogin(code)) {
      setLocalError("生日还没有对上，再试一次。");
      return;
    }
    setCode("");
    setLocalError("");
  };
  return <main className="login-screen">
    <div className="login-card">
      <div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信</span></div>
      <p className="chapter-kicker">沈阳 · 给小漾的生日</p>
      <h1>欢迎回来，小漾。</h1>
      <p className="login-lead">生日当天，从这里继续走完大家为你写好的路线。</p>
      <label className="login-code-label" htmlFor="birthday-access">输入生日</label>
      <div className="login-code-row"><input id="birthday-access" inputMode="numeric" autoComplete="off" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} onKeyDown={(event) => { if (event.key === "Enter") submit(); }} placeholder="4 位数字" /><button className="primary-button" onClick={submit}>进入</button></div>
      {(localError || errorMessage) && <p className="form-error">{localError || errorMessage}</p>}
      <p className="login-scope">输入生日，打开属于今天的入口。</p>
    </div>
    <section className="archive-entry" aria-label="纪念档案">
      <div><strong>已经保存的纪念档案</strong><small>{archives.length ? `${archives.length} 次生日旅程可以回看` : "完成一趟旅程后，纪念海报会保存在这里"}</small></div>
      {archives.length > 0 && <div className="archive-list">{archives.map((archive) => <button key={archive.id} onClick={() => onArchive(archive)}><span>{new Date(archive.savedAt).toLocaleString("zh-CN")}</span><b>{archive.state.revealedWishes.length} / 22 个愿望</b></button>)}</div>}
    </section>
  </main>;
}

function StoryGallery({ photos, title = "记忆卡片" }: { photos: StoryPhoto[]; title?: string }) {
  return (
    <section className="story-gallery" aria-label={title}>
      <div className="story-gallery-heading">
        <strong>{title}</strong>
        <small>第一块记忆碎片。</small>
      </div>
      <div className="story-gallery-grid">
        {photos.map((photo) => (
          <article className="story-photo-card" key={photo.id}>
            <img src={photo.src} alt={photo.title} loading="lazy" />
            <div>
              <strong>{photo.title}</strong>
              <p>{photo.note}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminScreen({ blessings, onSave, onLogout }: { blessings: BlessingConfig; onSave: (config: BlessingConfig) => void; onLogout: () => void }) {
  const [draft, setDraft] = useState(blessings);
  const updateArray = (key: "names" | "messages" | "openingEvaluations", index: number, value: string) => setDraft((current) => ({ ...current, [key]: current[key].map((item, itemIndex) => itemIndex === index ? value : item) }));
  const save = () => onSave(draft);
  return <main className="admin-screen">
    <header className="admin-header"><div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信 · 生日准备</span></div><button className="text-button" onClick={onLogout}>退出</button></header>
    <section className="admin-layout">
      <div className="admin-intro"><p className="chapter-kicker">第四章 · 信使</p><h1>把最后一封信准备好。</h1><p>hi</p><button className="primary-button large" onClick={save}>保存祝福配置 <span>↗</span></button></div>
      <div className="admin-form">
        <section className="admin-section"><h2>开始时，大家怎样形容她</h2><p>这些评价会在小漾进入生日任务时展示。</p>{draft.openingEvaluations.map((item, index) => <input key={`evaluation-${index}`} value={item} onChange={(event) => updateArray("openingEvaluations", index, event.target.value)} placeholder={`评价 ${index + 1}`} />)}</section>
        <section className="admin-section"><h2>四位信使的祝福</h2><div className="admin-blessing-grid">{draft.messages.map((message, index) => <div className="admin-blessing-row" key={`blessing-${index}`}><input value={draft.names[index] || ""} onChange={(event) => updateArray("names", index, event.target.value)} aria-label={`信使 ${index + 1} 名称`} /><textarea value={message} onChange={(event) => updateArray("messages", index, event.target.value)} aria-label={`信使 ${index + 1} 文字`} rows={3} /></div>)}</div></section>
      </div>
    </section>
  </main>;
}

function ArchiveScreen({ archive, onBack, onDelete }: { archive: MemoryArchive; onBack: () => void; onDelete: () => void }) {
  const { state, blessings } = archive;
  return <main className="archive-screen">
    <header className="admin-header"><div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信 · 纪念档案</span></div><button className="text-button" onClick={() => { if (window.confirm("确定删除这份纪念档案吗？")) onDelete(); }}>删除这份档案</button><button className="text-button" onClick={onBack}>回到登录</button></header>
    <section className="archive-content"><p className="chapter-kicker">{new Date(archive.savedAt).toLocaleString("zh-CN")}</p><h1>小漾的 22 岁生日</h1><p className="archive-lead">这份档案保存了当天的选择、路线、照片、祝福和 22 个愿望。</p><StoryGallery photos={archive.photoStories ?? storyPhotos} title="十个被记住的片段" />{archive.poster && <img className="archive-poster" src={archive.poster} alt="生日纪念海报" />}<section className="archive-photos"><strong>当天留下的照片</strong>{archive.assets.photo && <img src={archive.assets.photo} alt="共同照片" />}{archive.assets.observation.filter(Boolean).length > 0 && <div>{archive.assets.observation.filter((item): item is string => Boolean(item)).map((item, index) => <img key={item} src={item} alt={`现场细节 ${index + 1}`} />)}</div>}</section><div className="archive-facts"><div><strong>{state.completedTasks.length}</strong><span>项任务完成</span></div><div><strong>{state.selectedKeywords.length}</strong><span>个关键词</span></div><div><strong>{state.revealedWishes.length}</strong><span>个愿望翻开</span></div><div><strong>{Object.keys(state.checkins).length}</strong><span>处签到</span></div></div><section className="archive-section"><h2>大家开始时这样形容她</h2><ul>{blessings.openingEvaluations.map((item) => <li key={item}>{item}</li>)}</ul></section><section className="archive-section"><h2>这趟路留下的选择</h2><p>关键词：{state.selectedKeywords.join("、") || "未记录"}</p><p>时间线：{state.memoryOrder.join(" → ") || "未记录"}</p><p>签到：{Object.entries(state.checkins).map(([station, method]) => `${station}（${method}）`).join("、") || "未记录"}</p><p>过程记录：{state.events.length} 条</p></section><section className="archive-section"><h2>完整过程记录</h2><ol className="archive-events">{state.events.map((event, index) => <li key={`${event.at}-${index}`}>{new Date(event.at).toLocaleTimeString("zh-CN")} · {describeEvent(event)}</li>)}</ol></section><section className="archive-section"><h2>信使的祝福</h2>{blessings.messages.map((message, index) => <article key={`${blessings.names[index]}-${message}`}><strong>{blessings.names[index]}</strong><p>{message}</p></article>)}</section><section className="archive-section"><h2>22 个愿望</h2><div className="archive-wishes">{wishes.map((wish, index) => <p key={wish}><strong>{String(index + 1).padStart(2, "0")}</strong>{wish}<span>{state.revealedWishes.includes(index) ? "已翻开" : "未翻开"}</span></p>)}</div></section></section>
  </main>;
}
function InviteScreen({ mode, blessings, onMode, onStart, onLogout }: { mode: PlayMode; blessings: BlessingConfig; onMode: (mode: PlayMode) => void; onStart: () => void; onLogout: () => void }) {
  const [showStationCodes, setShowStationCodes] = useState(false);
  return <main className="invite-screen"><div className="invite-noise" aria-hidden="true" /><header className="invite-topbar"><div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信</span></div><span className="invite-date">一场生日任务 <button className="text-button" onClick={onLogout}>退出</button></span></header><section className="invite-content"><div className="invite-copy"><p className="chapter-kicker">给小漾的生日</p><h1>今天，去找回<br /><em>闪闪发光的片段。</em></h1><p className="invite-lead">沿着沈阳的夜色走两站，最后一封信不在地图上。</p><div className="opening-evaluations"><strong>大家眼里的你</strong>{blessings.openingEvaluations.map((item) => <span key={item}>{item}</span>)}</div><div className="mode-picker" role="group" aria-label="选择游玩方式"><button className={mode === "real" ? "is-selected" : ""} onClick={() => onMode("real")}>到现场</button><button className={mode === "remote" ? "is-selected" : ""} onClick={() => onMode("remote")}>线上完成</button></div><button className="primary-button large" onClick={onStart}>开始这场生日任务 <span>↗</span></button><p className="invite-note">全程约 3–4 小时</p></div><div className="invite-art" aria-label="三站路线预览"><div className="art-skyline"><span /><span /><span /><span /><span /></div><div className="art-route"><i className="route-dash dash-one" /><i className="route-dash dash-two" /><i className="route-dash dash-three" /></div><div className="art-node node-one"><b>01</b><span>出发</span></div><div className="art-node node-two"><b>02</b><span>记忆</span></div><div className="art-node node-three"><b>22</b><span>终章</span></div><div className="art-caption">SHENYANG / 22:00<br /><strong>一封写给今天的信</strong></div></div></section><button className="text-button station-code-toggle" onClick={() => setShowStationCodes((value) => !value)}>{showStationCodes ? "收起站点准备" : "准备现场二维码"}</button>{showStationCodes && <StationCodeKit />}<footer className="invite-footer"><span>沈阳 · 生日地图</span><span>五人同行</span></footer></main>;
}

function StationCodeKit() {
  const [station, setStation] = useState<StationId>("station-one");
  const [message, setMessage] = useState("");
  const qrRef = useRef<SVGSVGElement>(null);
  const selected = mapStops.find((stop) => stop.station === station)!;
  const value = `time-letters://checkin/${station}`;
  const matrix = makeQrCode(value);

  const saveCode = () => {
    const svg = qrRef.current?.outerHTML;
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `22封时光信-${selected.label}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("站点二维码已保存。");
  };

  const printCode = () => {
    const svg = qrRef.current?.outerHTML;
    if (!svg) return;
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) {
      setMessage("打印窗口没有打开，请允许当前页面打开新窗口。");
      return;
    }
    const printDocument = printWindow.document;
    printDocument.title = `${selected.label} · 现场二维码`;
    printDocument.head.innerHTML = `<style>body{margin:0;display:grid;place-items:center;min-height:100vh;font-family:sans-serif;color:#30271f;text-align:center}main{display:grid;gap:18px;justify-items:center}svg{width:280px;height:280px}h1{font-size:22px;margin:0}p{font-size:14px;margin:0}</style>`;
    printDocument.body.innerHTML = `<main>${svg}<h1>${selected.label}</h1><p>22 封时光信 · 到达后扫码确认</p></main>`;
    printDocument.close();
    printWindow.focus();
    printWindow.print();
    setMessage("已打开打印页面。");
  };

  return <section className="station-code-kit" aria-label="现场二维码准备">
    <div className="code-kit-copy"><p className="chapter-kicker">出发前准备</p><h2>打印三枚站点二维码</h2><p>把对应二维码放在每一站现场，抵达后用手机扫描即可确认。二维码只包含本站令牌，不依赖外部图片服务。</p></div>
    <div className="code-kit-body">
      <div className="code-kit-stations" role="tablist" aria-label="选择站点二维码">{mapStops.map((stop, index) => <button className={station === stop.station ? "is-selected" : ""} key={stop.station} onClick={() => { setStation(stop.station); setMessage(""); }} role="tab" aria-selected={station === stop.station}><b>{index === 2 ? "终" : `0${index + 1}`}</b><span>{stop.label}</span></button>)}</div>
      <div className="code-kit-preview"><svg ref={qrRef} viewBox="0 0 41 41" role="img" aria-label={`${selected.label}二维码`} shapeRendering="crispEdges"><rect width="41" height="41" fill="#fff" />{matrix.map((row, rowIndex) => row.map((dark, columnIndex) => dark ? <rect key={`${rowIndex}-${columnIndex}`} x={columnIndex + 4} y={rowIndex + 4} width="1" height="1" fill="#30271f" /> : null))}</svg><strong>{selected.label}</strong><small>{value}</small></div>
      <div className="code-kit-actions"><button className="small-button" onClick={saveCode}>保存二维码</button><button className="text-button" onClick={printCode}>打印这一枚</button></div>
      {message && <p className="code-kit-message" role="status">{message}</p>}
    </div>
  </section>;
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
    if (!existing) { script.dataset.amap = "true"; script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(amapKey)}`; script.async = true; document.head.appendChild(script); }
    const onReady = () => setRealMapReady(Boolean(window.AMap));
    script.addEventListener("load", onReady); if (window.AMap) onReady();
    return () => script.removeEventListener("load", onReady);
  }, [amapKey, serviceHost]);
  useEffect(() => {
    if (!realMapReady || !mapRef.current || !window.AMap) return;
    const map = new window.AMap.Map(mapRef.current, { zoom: 12, center: [123.46, 41.81], viewMode: "2D" });
    const markers = mapStops.map(({ position, label }) => { const marker = new window.AMap!.Marker({ position, title: label }); marker.setMap(map); return marker; });
    const line = new window.AMap.Polyline({ path: mapStops.map((stop) => stop.position), strokeColor: "#c75b4f", strokeWeight: 4, strokeOpacity: .85, strokeStyle: "dashed", lineJoin: "round" });
    line.setMap(map); map.setFitView?.(markers);
    return () => map.destroy();
  }, [realMapReady]);
  return <div className={`route-map ${realMapReady ? "has-real-map" : ""}`}><div className="real-map-layer" ref={mapRef} aria-label="沈阳地图" /><div className="map-grid" aria-hidden="true" /><div className="map-label map-label-a">惠工社区</div><div className="map-label map-label-b">东中街 · 沈河区</div><div className="map-label map-label-c">东北大马路</div><div className="map-road road-one" /><div className="map-road road-two" /><div className="map-road road-three" /><div className="map-path"><span className="path-segment segment-one" /><span className="path-segment segment-two" /></div>{chapters.map((chapter, index) => { const reached = index < activeIndex || state.chapter === "complete"; const available = index <= activeIndex || state.chapter === "complete"; const stop = mapStops[index]; return <div className={`map-stop map-stop-${index + 1} ${index === activeIndex ? "is-active" : ""} ${reached ? "is-reached" : ""}`} key={chapter.id}><b>{index === 2 ? "22" : `0${index + 1}`}</b><span>{available ? chapter.place.split(" · ")[0] : "待揭晓"}</span>{available && <a className="nav-button" href={`https://uri.amap.com/marker?position=${stop.position[0]},${stop.position[1]}&name=${encodeURIComponent(stop.label)}`} target="_blank" rel="noreferrer">导航</a>}</div>; })}<div className="map-compass">N<br /><span>+</span></div><div className="map-caption">沈阳夜行手账 <span>·</span> {realMapReady ? "实时位置" : "城市路线"}</div></div>;
}

function TaskRow({ taskId, copy, done, onComplete, children }: { taskId: TaskId; copy: string; done: boolean; onComplete: () => void; children?: ReactNode }) {
  return <article className={`task-row ${done ? "is-done" : ""}`}><div className="task-index">{done ? "✓" : taskMeta[taskId].title === "最后一封信" ? "22" : taskId === "station-two-checkin" || taskId === "final-checkin" ? "03" : taskId === "messenger" || taskId === "memory-order" ? "02" : "01"}</div><div className="task-body"><div className="task-title-line"><h3>{taskMeta[taskId].title}</h3><span>{done ? "已完成" : taskMeta[taskId].reward}</span></div><p>{copy}</p>{children}</div>{!children && !done && <button className="small-button" onClick={onComplete}>完成</button>}</article>;
}

function CheckinPanel({ station, place, mode, checkin, onCheckin }: { station: StationId; place: string; mode: PlayMode; checkin?: CheckinMethod; onCheckin: (station: StationId, method: CheckinMethod) => void }) {
  const [locationMessage, setLocationMessage] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [phrase, setPhrase] = useState("");
  const target = mapStops.find((item) => item.station === station)!;
  const locate = () => {
    if (!navigator.geolocation) { setLocationMessage("当前设备无法提供定位，请使用二维码或密语确认。"); return; }
    setLocationMessage("正在确认你的位置…");
    navigator.geolocation.getCurrentPosition((position) => {
      const distance = distanceInMeters(position.coords.latitude, position.coords.longitude, target.position[1], target.position[0]);
      if (distance <= 180) { setLocationMessage("位置已确认。"); onCheckin(station, "gps"); }
      else setLocationMessage(`距离这里还有约 ${Math.round(distance / 10) * 10} 米。`);
    }, () => setLocationMessage("没有取得定位，请使用二维码或密语确认。"), { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 });
  };
  const submitPhrase = () => { if (phrase.trim().toLowerCase() === stationPhrase(station)) onCheckin(station, "phrase"); else setLocationMessage("密语不对，再听信使说一遍。"); };
  const submitQr = (value: string) => {
    if (value.trim() === `time-letters://checkin/${station}`) { onCheckin(station, "qr"); return true; }
    setLocationMessage("这枚二维码属于另一站。");
    return false;
  };
  if (checkin) return <div className="checkin-success"><span>◎</span><div><strong>{checkin === "gps" ? "位置已确认" : checkin === "qr" ? "二维码已确认" : checkin === "phrase" ? "密语已确认" : "路线已解锁"}</strong><small>{place}</small></div></div>;
  if (mode === "remote") return <div className="checkin-block remote-checkin"><div className="checkin-symbol">↗</div><div><strong>线上抵达</strong><small>在熟悉的地方停下，和大家一起完成这一站。</small></div><button className="small-button" onClick={() => onCheckin(station, "manual")}>解锁这一站</button></div>;
  return <div className="checkin-block real-checkin"><div className="checkin-symbol">⌖</div><div><strong>{place}</strong><small>{locationMessage || "到达后可用定位确认，也可以扫描现场二维码或输入信使密语。"}</small></div><div className="checkin-actions"><button className="small-button" onClick={locate}>确认位置</button><button className="text-button" onClick={() => setCameraOpen((value) => !value)}>{cameraOpen ? "收起确认" : "二维码确认"}</button></div>{cameraOpen && <CameraPhrasePanel phrase={phrase} setPhrase={setPhrase} onPhrase={submitPhrase} onScan={submitQr} />}</div>;
}

function distanceInMeters(latA: number, lngA: number, latB: number, lngB: number) { const rad = Math.PI / 180; const x = (lngB - lngA) * rad * Math.cos((latA + latB) * rad / 2); const y = (latB - latA) * rad; return Math.sqrt(x * x + y * y) * 6371000; }
function stationPhrase(station: StationId) { return station === "station-one" ? "出发" : station === "station-two" ? "记忆" : "二十二"; }

type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>> };
type BarcodeDetectorConstructor = new (options?: { formats: string[] }) => BarcodeDetectorLike;

function CameraPhrasePanel({ phrase, setPhrase, onPhrase, onScan }: { phrase: string; setPhrase: (value: string) => void; onPhrase: () => void; onScan: (value: string) => boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [cameraMessage, setCameraMessage] = useState("相机只在点击开启后使用。");
  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    if (!cameraStarted || !videoRef.current) return;
    const BarcodeDetectorApi = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    if (!BarcodeDetectorApi) {
      setCameraMessage("当前浏览器不支持自动识别，请扫描后输入信使密语。");
      return;
    }
    const detector = new BarcodeDetectorApi({ formats: ["qr_code"] });
    let stopped = false;
    let frame = 0;
    const scan = async () => {
      const video = videoRef.current;
      if (!stopped && video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          const codes = await detector.detect(video);
          const value = codes.find((code) => code.rawValue)?.rawValue;
          if (value) { if (onScan(value)) return; }
        } catch { setCameraMessage("二维码暂时无法识别，请调整距离或输入信使密语。"); }
      }
      if (!stopped) frame = requestAnimationFrame(() => void scan());
    };
    frame = requestAnimationFrame(() => void scan());
    return () => { stopped = true; cancelAnimationFrame(frame); };
  }, [cameraStarted, onScan]);
  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setCameraMessage("当前设备无法打开相机，请输入信使密语。"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraStarted(true);
      setCameraMessage("将现场二维码放入取景框，识别后自动确认。");
      const video = videoRef.current; if (video) void video.play();
    } catch { setCameraMessage("相机没有打开，请输入信使密语完成确认。"); }
  };
  return <div className="camera-panel"><video ref={videoRef} className={`camera-preview ${cameraStarted ? "is-active" : ""}`} playsInline muted /><button className="small-button" onClick={startCamera}>{cameraStarted ? "重新开启相机" : "开启相机"}</button><p className="camera-message">{cameraMessage}</p><div className="phrase-row"><input value={phrase} onChange={(event) => setPhrase(event.target.value)} placeholder="输入信使密语" /><button className="text-button" onClick={onPhrase}>确认密语</button></div></div>;
}


function StationOne({ state, assets, onAsset, keywordDraft, onKeyword, onComplete, onCheckin }: { state: GameState; assets: StoryAssets; onAsset: AssetReader; keywordDraft: string[]; onKeyword: (keyword: string) => void; onComplete: (taskId: TaskId) => void; onCheckin: (station: StationId, method: CheckinMethod) => void }) {
  const words = ["勇敢", "可爱", "嘴硬", "浪漫", "自由"];
  return <div className="task-list">
    <StoryGallery photos={storyPhotosFor("station-one")} title="第一站 " />
    <TaskRow taskId="keywords" copy="合成第一封信。" done={isTaskComplete(state, "keywords")} onComplete={() => onComplete("keywords")}>
      {!isTaskComplete(state, "keywords") && <div className="choice-block"><div className="choice-grid">{words.map((word) => <button className={`choice-chip ${keywordDraft.includes(word) ? "is-selected" : ""}`} key={word} onClick={() => onKeyword(word)}>{word}</button>)}</div><button className="inline-action" disabled={keywordDraft.length !== 3} onClick={() => onComplete("keywords")}>{keywordDraft.length === 3 ? "合成第一封信" : `请选择 ${3 - keywordDraft.length} 个词`}</button></div>}
      {isTaskComplete(state, "keywords") && <div className="letter-snippet">“你身上有勇敢的光，也有让人想一直靠近的自由。”</div>}
    </TaskRow>
    <TaskRow taskId="puzzle" copy="把你们一起出发的那一刻，亲手拼回完整。" done={isTaskComplete(state, "puzzle")} onComplete={() => onComplete("puzzle")}>
      {!isTaskComplete(state, "puzzle") && <PhotoPuzzle photo={assets.photo || storyPhotos[0]?.src} onAsset={onAsset} onComplete={() => onComplete("puzzle")} />}
      {isTaskComplete(state, "puzzle") && <div className="letter-snippet">第一站不是目的地，是有人一直陪你出发。</div>}
    </TaskRow>
    <TaskRow taskId="station-one-checkin" copy="到达惠工社区店后，用定位或现场密语盖下第一枚印章。" done={isTaskComplete(state, "station-one-checkin")} onComplete={() => onComplete("station-one-checkin")}>
      <CheckinPanel station="station-one" place="好再来大盘子 · 惠工社区店" mode={state.playMode} checkin={state.checkins["station-one"]} onCheckin={onCheckin} />
    </TaskRow>
  </div>;
}

function PhotoPuzzle({ photo, onAsset, onComplete }: { photo?: string; onAsset: AssetReader; onComplete: () => void }) {
  const target = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  const [tiles, setTiles] = useState([2, 0, 7, 4, 1, 8, 5, 3, 6]);
  const [selected, setSelected] = useState<number | null>(null);
  const swap = (index: number) => {
    if (selected === null) { setSelected(index); return; }
    if (selected === index) { setSelected(null); return; }
    const next = [...tiles]; [next[selected], next[index]] = [next[index], next[selected]];
    setTiles(next); setSelected(null);
    if (next.every((tile, tileIndex) => tile === target[tileIndex])) onComplete();
  };
  if (!photo) return <div className="puzzle-empty"><strong>先放入你们的照片</strong><small>照片加入后，九块拼图会在这里展开。</small><label className="upload-inline">选择照片<input type="file" accept="image/*" onChange={(event) => onAsset(event, "photo")} /></label></div>;
  return <div className="puzzle-block"><div className="puzzle-grid interactive-puzzle">{tiles.map((tile, index) => <button className={selected === index ? "is-selected" : ""} key={`${tile}-${index}`} onClick={() => swap(index)} aria-label={`拼图第 ${tile + 1} 块`} style={{ backgroundImage: `url(${photo})`, backgroundSize: "300% 300%", backgroundPosition: `${(tile % 3) * 50}% ${Math.floor(tile / 3) * 50}%` }} />)}</div><div className="puzzle-copy"><strong>{selected === null ? "点击两块交换位置" : "再选择一块交换"}</strong><small>把这张照片拼完整。</small><label className="upload-inline">换一张照片<input type="file" accept="image/*" onChange={(event) => onAsset(event, "photo")} /></label></div></div>;
}

function ObservationTask({ assets, onAsset, onComplete }: { assets: StoryAssets; onAsset: AssetReader; onComplete: () => void }) {
  const selected = assets.observation.filter(Boolean).length;
  const canFinish = selected === 3;
  return <div className="observation-block">
    <div className="observation-gallery">
      {[0, 1, 2].map((index) => <label className="observation-card" key={index}>
        {assets.observation[index] ? <img src={assets.observation[index]} alt={`现场细节 ${index + 1}`} /> : <span className="observation-swatch"><i /><i /><i /></span>}
        <strong>{assets.observation[index] ? "已加入细节" : `加入细节 ${index + 1}`}</strong>
        <input type="file" accept="image/*" onChange={(event) => onAsset(event, "observation", index)} />
      </label>)}
    </div>
    <button className="inline-action" disabled={!canFinish} onClick={onComplete}>{canFinish ? "确认三张细节" : `还需加入 ${3 - selected} 张照片`}</button>
  </div>;
}

function StationTwo({ state, assets, onAsset, memoryDraft, onMemory, onComplete, onCheckin }: { state: GameState; assets: StoryAssets; onAsset: AssetReader; memoryDraft: string[]; onMemory: (item: string) => void; onComplete: (taskId: TaskId) => void; onCheckin: (station: StationId, method: CheckinMethod) => void }) {
  const memories = ["第一次一起看夜场电影", "临时决定去皇家海洋乐园", "她说想去看更大的世界"];
  return <div className="task-list">
    <StoryGallery photos={storyPhotosFor("station-two")} title="第二站，把走过的日子翻出来" />
    <TaskRow taskId="observation" copy="在安全的公共区域，找到你们拍下的细节。" done={isTaskComplete(state, "observation")} onComplete={() => onComplete("observation")}>
      {!isTaskComplete(state, "observation") && <ObservationTask assets={assets} onAsset={onAsset} onComplete={() => onComplete("observation")} />}
    </TaskRow>
    <TaskRow taskId="memory-order" copy="按你记得的顺序，把三件小事排成一条时间线。" done={isTaskComplete(state, "memory-order")} onComplete={() => onComplete("memory-order")}>
      {!isTaskComplete(state, "memory-order") && <div className="memory-block"><div className="memory-options">{memories.map((item) => <button className={memoryDraft.includes(item) ? "is-selected" : ""} key={item} onClick={() => onMemory(item)}><span>{memoryDraft.indexOf(item) + 1 || "·"}</span>{item}</button>)}</div><button className="inline-action" disabled={memoryDraft.length !== 3} onClick={() => onComplete("memory-order")}>确认这条时间线</button></div>}
    </TaskRow>
    <TaskRow taskId="messenger" copy="为它盖章。" done={isTaskComplete(state, "messenger")} onComplete={() => onComplete("messenger")}>
      {!isTaskComplete(state, "messenger") && <div className="messenger-block"><div className="messenger-card"><span>信使 A</span><strong>你让我们记住的事</strong></div><div className="messenger-card"><span>信使 B</span><strong>希望你 22 岁拥有的事</strong></div><button className="small-button" onClick={() => onComplete("messenger")}>两张都收到</button></div>}
    </TaskRow>
    <TaskRow taskId="station-two-checkin" copy="到达东中街附近，用现场密语盖下第二枚城市印章。" done={isTaskComplete(state, "station-two-checkin")} onComplete={() => onComplete("station-two-checkin")}>
      <CheckinPanel station="station-two" place="东中街附近" mode={state.playMode} checkin={state.checkins["station-two"]} onCheckin={onCheckin} />
    </TaskRow>
  </div>;
}

function FinaleTasks({ state, blessings, codeDraft, setCodeDraft, errorMessage, onCode, onCheckin, onOpen, wishes, revealedWishes, onRevealWish }: { state: GameState; blessings: BlessingConfig; codeDraft: string; setCodeDraft: (value: string) => void; errorMessage: string; onCode: () => void; onCheckin: (station: StationId, method: CheckinMethod) => void; onOpen: () => void; wishes: string[]; revealedWishes: number[]; onRevealWish: (index: number) => void }) {
  const unlocked = isTaskComplete(state, "final-code");
  const arrived = isTaskComplete(state, "final-checkin");
  return <div className="finale-panel">
    <div className="finale-intro"><span className="finale-seal">22</span><div><p className="chapter-kicker">东站 · 终点</p><h2>最后一封信，不在地图上。</h2><p>四位信使的祝福已经准备好。先让终点回应你。</p></div></div>
    <StoryGallery photos={storyPhotosFor("finale")} title="终章之前，先收下两份预热" />
    <CheckinPanel station="finale" place="东北大马路附近 · 烧烤 KTV" mode={state.playMode} checkin={state.checkins.finale} onCheckin={onCheckin} />
    {arrived && !unlocked && <div className="code-form"><label htmlFor="birthday-code">生日密码</label><div className="code-input-row"><input id="birthday-code" inputMode="numeric" maxLength={6} value={codeDraft} onChange={(event) => setCodeDraft(event.target.value.replace(/\\D/g, ""))} aria-label="六位生日密码" /><button className="primary-button" onClick={onCode}>打开信封</button></div>{errorMessage && <p className="form-error">{errorMessage}</p>}</div>}
    {unlocked && <div className="unlocked-panel"><BlessingMessages blessings={blessings} /><div className="wishes-heading"><strong>给 22 岁的 22 个愿望</strong><small>点亮每一片花瓣，读一条写给她的话。</small></div><div className="flower-grid wish-grid">{wishes.map((wish, index) => <button className={`flower-petal ${revealedWishes.includes(index) ? "is-lit" : ""}`} key={wish} onClick={() => onRevealWish(index)} aria-label={`第 ${index + 1} 个愿望`}>{revealedWishes.includes(index) ? <span>{wish}</span> : index + 1}</button>)}</div><button className="primary-button large" onClick={onOpen}>打开生日终章 <span>↗</span></button>{errorMessage && <p className="form-error finale-error">{errorMessage}</p>}</div>}
  </div>;
}

function BlessingMessages({ blessings }: { blessings: BlessingConfig }) {
  return <div className="blessing-studio">
    <div className="studio-heading"><strong>信使的祝福</strong><small>四位信使已经把想说的话放在这里。</small></div>
    <div className="blessing-message-list">{blessings.messages.map((message, index) => <article key={`${blessings.names[index]}-${message}`}><strong>{blessings.names[index]}</strong><p>{message}</p></article>)}</div>
  </div>;
}

function FinaleScreen({ state, blessings, wishes, shareMessage, onShare, onLogout }: { state: GameState; blessings: BlessingConfig; wishes: string[]; shareMessage: string; onShare: () => void; onLogout: () => void }) {
  return <main className="finale-screen"><div className="finale-glow" aria-hidden="true" /><header className="invite-topbar"><div className="brand-lockup"><span className="brand-mark">22</span><span>封时光信</span></div><span className="invite-date">终章已打开 <button className="text-button" onClick={onLogout}>退出</button></span></header><section className="finale-content"><p className="chapter-kicker">To 小漾 · 22</p><h1>愿你以后每一次出发，<br /><em>都有喜欢的人在身边。</em></h1><p className="finale-copy">今天的路线走完了，故事还会继续。现在，请收下现实里的最后一件道具。</p><div className="bouquet"><div className="bouquet-stems" />{Array.from({ length: 22 }, (_, index) => <span className="bouquet-flower" key={index} style={{ "--i": index } as CSSProperties}>✦</span>)}</div><div className="blessing-reel"><div className="finale-blessing-messages">{blessings.messages.map((message, index) => <article key={`${blessings.names[index]}-${message}`}><strong>{blessings.names[index]}</strong><p>{message}</p></article>)}</div></div><div className="finale-wishes">{wishes.map((wish, index) => <article key={wish}><span>{String(index + 1).padStart(2, "0")}</span><p>{wish}</p></article>)}</div><div className="finale-actions"><button className="primary-button large" onClick={onShare}>{state.shared ? "纪念海报已保存" : "保存纪念海报"} <span>↗</span></button>{shareMessage && <span className="share-message">{shareMessage}</span>}<span>22 支花，等你在包间里亲手拆开。</span></div></section><footer className="invite-footer"><span>沈阳 · 生日任务完成</span><span>05 位同行者</span></footer></main>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function createPoster(photo?: string): Promise<File | null> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas"); canvas.width = 1080; canvas.height = 1350;
    const context = canvas.getContext("2d"); if (!context) return resolve(null);
    context.fillStyle = "#dce8bd"; context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#30271f"; context.font = "900 56px sans-serif"; context.fillText("22封时光信", 90, 120);
    context.font = "700 32px sans-serif"; context.fillText("给小漾的 22 岁生日", 90, 180);
    const drawText = (y: number) => { context.fillStyle = "#c75b4f"; context.font = "900 42px sans-serif"; context.fillText("愿你以后每一次出发", 90, y); context.fillText("都有喜欢的人在身边。", 90, y + 70); context.fillStyle = "#30271f"; context.font = "700 26px sans-serif"; context.fillText("沈阳 · 五位同行者 · 22 支花", 90, y + 160); canvas.toBlob((blob) => resolve(blob ? new File([blob], "22封时光信.png", { type: "image/png" }) : null), "image/png"); };
    if (photo) { const image = new Image(); const finishWithPhoto = () => { context.drawImage(image, 90, 250, 900, 620); drawText(960); }; image.onload = finishWithPhoto; image.onerror = () => drawText(360); image.src = photo; } else drawText(360);
  });
}
