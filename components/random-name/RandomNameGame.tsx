"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RandomArena } from "./RandomArena";
import {
  baseStatusFor,
  type ActivityType,
  type NpcModel,
  type OutfitType,
} from "./NpcCharacter";
import type { UfoPhase } from "./Ufo";

const STORAGE_KEY = "lunix-random-name-class-v2";

const FUNNY_LINES = [
  "Ủa thầy/cô bịt mắt thiệt không vậy? 😭",
  "Kế hoạch đào tẩu chính thức phá sản.",
  "Yêu cầu VAR! Em nghi có gian lận!",
  "Chạy hết tốc lực rồi mà vẫn bị tóm. 🥲",
  "Đồng đội đâu? Sao bỏ tôi lại vậy?",
  "NPC này vừa bị UFO khóa mục tiêu.",
  "Em nghĩ chúng ta nên thương lượng...",
  "Một phút mặc niệm cho chiến thuật vừa rồi.",
  "Báo động đỏ! Em đã bị bắt sống!",
  "Xin tha, em còn bài tập chưa làm!",
];

type Result = {
  id: string;
  name: string;
  quote: string;
};

function parseNames(value: string) {
  return value
    .split(/[\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

function randomIndex(max: number) {
  if (max <= 1) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const data = new Uint32Array(1);
    crypto.getRandomValues(data);
    return Math.floor((data[0] / 4294967296) * max);
  }
  return Math.floor(Math.random() * max);
}

function makeNpc(name: string, index: number, total: number): NpcModel {
  const seed = hash(name + ":" + index);
  const angle = index * 2.399963229728653;
  const ring = total <= 24
    ? 24 + (index % 4) * 13
    : 18 + ((index % 8) / 7) * 34;
  const x = 50 + Math.cos(angle) * ring;
  const y = 52 + Math.sin(angle) * ring * 0.64;

  const outfits: OutfitType[] = ["street", "street", "street", "baba", "briefs"];
  const activities: ActivityType[] = ["walk", "walk", "idle", "drink", "sweep"];
  const outfit = outfits[seed % outfits.length];
  const activity = activities[(seed >>> 3) % activities.length];

  return {
    id: "npc-" + index + "-" + seed,
    name,
    outfit,
    activity,
    status: baseStatusFor(activity),
    x: Math.max(7, Math.min(93, x)),
    y: Math.max(16, Math.min(88, y)),
    hue: seed % 360,
    variant: seed % 4,
  };
}

function playCue(kind: "start" | "caught") {
  try {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind === "caught" ? "square" : "sine";
    oscillator.frequency.setValueAtTime(kind === "caught" ? 190 : 330, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "caught" ? 85 : 760, audio.currentTime + 0.28);
    gain.gain.setValueAtTime(0.09, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.36);
    oscillator.addEventListener("ended", () => void audio.close());
  } catch {
    // Game vẫn hoạt động nếu trình duyệt chặn AudioContext.
  }
}

export function RandomNameGame() {
  const timers = useRef<number[]>([]);
  const [draft, setDraft] = useState("");
  const [npcs, setNpcs] = useState<NpcModel[]>([]);
  const [started, setStarted] = useState(false);
  const [noRepeat, setNoRepeat] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ufoPhase, setUfoPhase] = useState<UfoPhase>("hidden");
  const [targetId, setTargetId] = useState<string | null>(null);
  const [calledIds, setCalledIds] = useState<string[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const schedule = useCallback((callback: () => void, delay: number) => {
    const id = window.setTimeout(callback, delay);
    timers.current.push(id);
  }, []);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as string[];
      if (Array.isArray(saved)) setDraft(saved.filter(Boolean).join("\n"));
    } catch {
      // Bỏ qua dữ liệu cũ không hợp lệ.
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const previewCount = useMemo(() => parseNames(draft).length, [draft]);

  const begin = useCallback(() => {
    const names = parseNames(draft);
    if (names.length === 0) {
      setError("Hãy nhập ít nhất một tên học sinh.");
      return;
    }

    clearTimers();
    setError("");
    setNpcs(names.map((name, index) => makeNpc(name, index, names.length)));
    setCalledIds([]);
    setTargetId(null);
    setResult(null);
    setUfoPhase("hidden");
    setBusy(false);
    setStarted(true);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
    } catch {
      // Không bắt buộc localStorage để chơi.
    }
  }, [clearTimers, draft]);

  const resetRound = useCallback(() => {
    clearTimers();
    setCalledIds([]);
    setTargetId(null);
    setResult(null);
    setUfoPhase("hidden");
    setBusy(false);
    setNpcs((current) => current.map((npc) => ({
      ...npc,
      status: baseStatusFor(npc.activity),
    })));
  }, [clearTimers]);

  const restoreTarget = useCallback((id: string) => {
    setNpcs((current) => current.map((npc) => (
      npc.id === id ? { ...npc, status: baseStatusFor(npc.activity) } : npc
    )));
  }, []);

  const finishResult = useCallback(() => {
    if (!result) return;
    if (!noRepeat) restoreTarget(result.id);
    setResult(null);
    setTargetId(null);
  }, [noRepeat, restoreTarget, result]);

  const startRound = useCallback(() => {
    if (busy || result) return;

    const active = npcs.filter((npc) => (
      npc.status !== "abducted" && (!noRepeat || !calledIds.includes(npc.id))
    ));

    if (active.length === 0) {
      resetRound();
      return;
    }

    const selected = active[randomIndex(active.length)];
    const visibleIds = new Set(npcs.filter((npc) => npc.status !== "abducted").map((npc) => npc.id));

    clearTimers();
    setBusy(true);
    setTargetId(selected.id);
    setUfoPhase("entering");
    if (!muted) playCue("start");

    schedule(() => setUfoPhase("hovering"), 700);

    schedule(() => {
      setUfoPhase("beam-on");
      setNpcs((current) => current.map((npc) => (
        visibleIds.has(npc.id) ? { ...npc, status: "surprised" } : npc
      )));
    }, 1350);

    schedule(() => {
      setUfoPhase("abducting");
      setNpcs((current) => current.map((npc) => (
        visibleIds.has(npc.id) ? { ...npc, status: "lifting" } : npc
      )));
    }, 1950);

    schedule(() => {
      setNpcs((current) => current.map((npc) => {
        if (!visibleIds.has(npc.id)) return npc;
        if (npc.id === selected.id) return { ...npc, status: "abducted" };
        return { ...npc, status: "falling" };
      }));
    }, 3650);

    schedule(() => {
      setNpcs((current) => current.map((npc) => (
        visibleIds.has(npc.id) && npc.id !== selected.id
          ? { ...npc, status: "fainted" }
          : npc
      )));
    }, 4300);

    schedule(() => {
      setUfoPhase("leaving");
      setCalledIds((current) => current.includes(selected.id) ? current : [...current, selected.id]);
      setResult({
        id: selected.id,
        name: selected.name,
        quote: FUNNY_LINES[randomIndex(FUNNY_LINES.length)],
      });
      if (!muted) playCue("caught");
    }, 5050);

    schedule(() => {
      setUfoPhase("hidden");
      setNpcs((current) => current.map((npc) => (
        visibleIds.has(npc.id) && npc.id !== selected.id
          ? { ...npc, status: "recovering" }
          : npc
      )));
    }, 6050);

    schedule(() => {
      setNpcs((current) => current.map((npc) => (
        visibleIds.has(npc.id) && npc.id !== selected.id
          ? { ...npc, status: baseStatusFor(npc.activity) }
          : npc
      )));
      setBusy(false);
    }, 7200);
  }, [busy, calledIds, clearTimers, muted, noRepeat, npcs, resetRound, result, schedule]);

  if (!started) {
    return (
      <main className="rn-shell">
        <style>{STYLES}</style>
        <Link className="rn-back" href="/">← Game Hub</Link>
        <section className="rn-setup">
          <div className="rn-copy">
            <p>ROBO LUNIX · RANDOM NAME</p>
            <h1>Bịt mắt bắt dê<br /><em>phiên bản UFO</em></h1>
            <span>
              Dán nguyên danh sách lớp. Không đặt giới hạn cứng số học sinh;
              kích thước nhân vật sẽ tự co khi lớp đông.
            </span>
            <div className="rn-demo">🛸　🧍　🧍　🙈　🧍　🧍</div>
          </div>

          <div className="rn-form">
            <div className="rn-form-title">
              <div><b>Danh sách học sinh</b><span>Mỗi dòng một tên hoặc dán cả cột</span></div>
              <strong>{previewCount}</strong>
            </div>
            <textarea
              onChange={(event) => setDraft(event.target.value)}
              placeholder={"Minh Triết\nGia Vỹ\nNhất Phi\nNgọc Anh\n..."}
              value={draft}
            />
            <label>
              <input checked={noRepeat} onChange={(event) => setNoRepeat(event.target.checked)} type="checkbox" />
              <span><b>Không lặp tên</b><small>Người đã bị UFO bắt sẽ biến mất cho đến khi làm mới lượt.</small></span>
            </label>
            {error && <p className="rn-error">{error}</p>}
            <button className="rn-enter" onClick={begin} type="button">Vào đấu trường →</button>
          </div>
        </section>
      </main>
    );
  }

  const abductedCount = npcs.filter((npc) => npc.status === "abducted").length;

  return (
    <main className="rn-shell rn-game-shell">
      <style>{STYLES}</style>
      <header className="rn-topbar">
        <Link href="/">GAME HUB</Link>
        <div>
          <b>Random Name · UFO</b>
          <span>{npcs.length} học sinh · {abductedCount} đã bị bắt</span>
        </div>
        <div>
          <button onClick={() => setMuted((current) => !current)} type="button">{muted ? "🔇" : "🔊"}</button>
          <button disabled={busy} onClick={() => setStarted(false)} type="button">Sửa danh sách</button>
        </div>
      </header>

      <RandomArena
        busy={busy}
        canReset={calledIds.length > 0}
        npcs={npcs}
        onReset={resetRound}
        onStart={startRound}
        targetId={targetId}
        ufoPhase={ufoPhase}
      />

      {result && (
        <div className="rn-result-backdrop" role="dialog" aria-modal="true">
          <section className="rn-result">
            <span>🛸 ĐÃ BỊ UFO BẮT</span>
            <h2>{result.name}</h2>
            <p>“{result.quote}”</p>
            <div>
              <button className="rn-primary" disabled={busy} onClick={finishResult} type="button">Tiếp tục</button>
              {noRepeat && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setCalledIds((current) => current.filter((id) => id !== result.id));
                    restoreTarget(result.id);
                    setResult(null);
                    setTargetId(null);
                  }}
                  type="button"
                >
                  Cho lại lượt
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

const STYLES = `
.rn-shell{min-height:100svh;background:#211936;color:#fff;font-family:Inter,ui-sans-serif,system-ui,sans-serif}
.rn-back{position:fixed;z-index:40;left:18px;top:18px;padding:9px 12px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:rgba(20,14,35,.72);color:#fff;text-decoration:none;font-weight:850}
.rn-setup{width:min(1120px,calc(100% - 36px));min-height:100svh;margin:auto;display:grid;grid-template-columns:1.1fr .9fr;align-items:center;gap:24px;padding:74px 0 42px}
.rn-copy p{margin:0 0 12px;color:#ffb74f;font-size:12px;font-weight:950;letter-spacing:.18em}.rn-copy h1{margin:0;font-size:clamp(44px,6vw,78px);line-height:.92;letter-spacing:-.055em}.rn-copy h1 em{color:#ffcf5a;font-family:Georgia,serif}.rn-copy>span{display:block;max-width:650px;margin-top:20px;color:#d9d2e8;font-size:17px;line-height:1.55}.rn-demo{margin-top:32px;font-size:clamp(28px,4vw,48px);letter-spacing:.08em}
.rn-form{padding:25px;border:2px solid #171224;border-radius:24px;background:#fff;color:#171224;box-shadow:9px 9px 0 #f0a23c}.rn-form-title{display:flex;justify-content:space-between;align-items:center;gap:12px}.rn-form-title div{display:grid;gap:3px}.rn-form-title b{font-size:20px}.rn-form-title span{color:#70697b;font-size:12px}.rn-form-title strong{min-width:48px;padding:8px 10px;border-radius:999px;background:#7357ff;color:#fff;text-align:center}
.rn-form textarea{width:100%;height:330px;margin:18px 0 14px;padding:14px;border:2px solid #d9d2c8;border-radius:14px;resize:vertical;background:#fbf8f2;color:#171224;font:700 15px/1.5 inherit;outline:none}.rn-form textarea:focus{border-color:#7357ff;box-shadow:0 0 0 4px rgba(115,87,255,.12)}
.rn-form label{display:flex;align-items:flex-start;gap:10px}.rn-form label input{margin-top:4px}.rn-form label span{display:grid;gap:2px}.rn-form label small{color:#70697b}.rn-error{padding:9px 11px;border-radius:10px;background:#ffe0de;color:#9c2526;font-weight:800}.rn-enter{width:100%;min-height:52px;margin-top:18px;border:2px solid #171224;border-radius:13px;background:#ffb54a;color:#171224;box-shadow:4px 4px 0 #171224;cursor:pointer;font-weight:950}
.rn-game-shell{overflow:hidden}.rn-topbar{height:68px;display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:18px;padding:10px 18px;border-bottom:1px solid rgba(255,255,255,.16);background:#171224}.rn-topbar>a{color:#ffcb62;text-decoration:none;font-weight:950}.rn-topbar>div:nth-child(2){display:grid;justify-items:center;gap:2px}.rn-topbar>div:nth-child(2) span{color:#aaa0be;font-size:11px}.rn-topbar>div:last-child{display:flex;gap:7px}.rn-topbar button{min-height:38px;padding:7px 11px;border:1px solid rgba(255,255,255,.22);border-radius:9px;background:#2a213e;color:#fff;cursor:pointer;font-weight:800}
.rn-arena{position:relative;height:calc(100svh - 68px);min-height:560px;overflow:hidden;background:linear-gradient(#1f1833 0 36%,#44325a 36% 100%)}.rn-arena-sky{position:absolute;inset:0 0 50%;background:radial-gradient(circle at 50% 30%,rgba(115,87,255,.24),transparent 38%),linear-gradient(#171126,#34244d)}.rn-arena-sky i{position:absolute;width:3px;height:3px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff}.rn-arena-sky i:nth-child(1){left:12%;top:20%}.rn-arena-sky i:nth-child(2){left:34%;top:14%}.rn-arena-sky i:nth-child(3){left:58%;top:23%}.rn-arena-sky i:nth-child(4){left:77%;top:11%}.rn-arena-sky i:nth-child(5){left:90%;top:29%}
.rn-arena-ground{position:absolute;left:50%;top:55%;width:min(94vw,1180px);height:min(70vh,720px);transform:translate(-50%,-50%);border:5px solid #171224;border-radius:50%;background:radial-gradient(ellipse at center,#f7c36a 0 48%,#ee9941 49% 76%,#c9652e 77%);box-shadow:0 28px 80px rgba(0,0,0,.38),inset 0 0 70px rgba(129,52,22,.22)}
.rn-ring{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border:2px dashed rgba(70,38,34,.18);border-radius:50%}.rn-ring-a{width:46%;height:46%}.rn-ring-b{width:76%;height:76%}
.rn-npc-slot{position:absolute;width:62px;height:88px;transform-origin:center bottom;transition:left .3s ease,top .3s ease}.rn-npc{position:relative;width:62px;height:88px;transform-origin:center 78%;transition:filter .2s ease}.rn-name-tag{position:absolute;z-index:8;left:50%;top:-18px;max-width:110px;transform:translateX(-50%);overflow:hidden;text-overflow:ellipsis;padding:3px 6px;border:1px solid #171224;border-radius:7px;background:rgba(255,255,255,.94);color:#171224;font-size:9px;font-weight:900;white-space:nowrap}.rn-activity{position:absolute;z-index:9;right:-3px;top:27px;font-size:15px}.rn-body{position:absolute;left:13px;top:6px;width:36px;height:78px;animation:rn-bob .58s ease-in-out infinite alternate}.rn-head{position:absolute;z-index:3;left:7px;top:8px;width:22px;height:22px;border:2px solid #34252b;border-radius:7px;background:#efb787}.rn-head b{position:absolute;top:9px;width:3px;height:3px;border-radius:50%;background:#221820}.rn-head b:first-child{left:5px}.rn-head b:last-child{right:5px}.rn-hair{position:absolute;z-index:5;left:5px;top:4px;width:26px;height:12px;border-radius:10px 11px 4px 4px;background:#32242b}.rn-torso{position:absolute;z-index:2;left:6px;top:29px;width:24px;height:27px;border:2px solid #34252b;border-radius:6px;background:hsl(var(--npc-hue) 68% 58%)}.rn-arm,.rn-leg{position:absolute;z-index:1;border:2px solid #34252b;transform-origin:top center}.rn-arm{top:31px;width:7px;height:26px;border-radius:5px;background:#efb787}.rn-arm-left{left:1px}.rn-arm-right{right:1px}.rn-leg{top:54px;width:9px;height:24px;background:#34445d}.rn-leg-left{left:8px}.rn-leg-right{right:8px}
.rn-outfit-baba .rn-torso{height:32px;border-radius:10px 10px 4px 4px;background:hsl(var(--npc-hue) 42% 54%)}.rn-outfit-briefs .rn-torso{background:#f4d8bd}.rn-outfit-briefs .rn-leg{top:51px;height:13px;background:#fff;border-radius:4px}.rn-outfit-briefs .rn-leg::after{content:"";position:absolute;left:-2px;top:10px;width:9px;height:14px;border-left:2px solid #34252b}
.rn-status-walking .rn-arm-left,.rn-status-running .rn-arm-left{animation:rn-limb .35s ease-in-out infinite alternate}.rn-status-walking .rn-arm-right,.rn-status-running .rn-arm-right{animation:rn-limb .35s ease-in-out infinite alternate-reverse}.rn-status-walking .rn-leg-left,.rn-status-running .rn-leg-left{animation:rn-limb .35s ease-in-out infinite alternate-reverse}.rn-status-walking .rn-leg-right,.rn-status-running .rn-leg-right{animation:rn-limb .35s ease-in-out infinite alternate}.rn-status-surprised .rn-body{animation:rn-shock .18s linear infinite alternate}.rn-status-lifting{animation:rn-lift 1.7s ease-in forwards}.rn-status-falling{animation:rn-fall .65s cubic-bezier(.5,0,.7,1) forwards}.rn-status-fainted{transform:translateY(20px) rotate(88deg);filter:saturate(.65)}.rn-status-recovering{animation:rn-recover 1.05s ease-out both}.rn-npc-slot[data-highlighted="true"] .rn-npc{filter:drop-shadow(0 0 15px #d9ff8e)}
@keyframes rn-bob{to{transform:translateY(-2px)}}@keyframes rn-limb{to{transform:rotate(24deg)}}@keyframes rn-shock{to{transform:translateX(2px) rotate(2deg)}}@keyframes rn-lift{0%{transform:translateY(0) scale(1)}70%{opacity:1}100%{transform:translateY(-330px) scale(.56) rotate(8deg);opacity:.22}}@keyframes rn-fall{0%{transform:translateY(-170px) rotate(-8deg)}100%{transform:translateY(20px) rotate(82deg)}}@keyframes rn-recover{from{transform:translateY(20px) rotate(88deg)}to{transform:none}}
.rn-teacher{position:absolute;z-index:900;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;justify-items:center;gap:6px}.rn-teacher>span{padding:4px 8px;border-radius:7px;background:#171224;color:#fff;font-size:9px;font-weight:950}.rn-teacher>div{width:66px;height:82px;display:grid;place-items:center;border:3px solid #171224;border-radius:18px;background:#7357ff;box-shadow:5px 5px 0 rgba(23,18,36,.45)}.rn-teacher>div b{font-size:37px}.rn-teacher>div i{position:absolute;width:54px;height:10px;margin-top:-17px;background:#171224}
.rn-ufo{position:absolute;z-index:1200;top:4%;width:210px;transform:translateX(-50%);pointer-events:none}.rn-ufo-craft{position:relative;height:90px;filter:drop-shadow(0 16px 18px rgba(0,0,0,.35));animation:rn-ufo-hover .8s ease-in-out infinite alternate}.rn-ufo-dome{position:absolute;left:70px;top:0;width:72px;height:40px;border:3px solid #263441;border-radius:50px 50px 8px 8px;background:rgba(119,223,244,.7)}.rn-ufo-body{position:absolute;left:22px;top:30px;width:166px;height:54px;border:3px solid #263441;border-radius:50%;background:#7c8792}.rn-ufo-body i{position:absolute;top:27px;width:10px;height:10px;border-radius:50%;background:#ffe26c;box-shadow:0 0 9px #ffe26c}.rn-ufo-body i:nth-child(1){left:25px}.rn-ufo-body i:nth-child(2){left:55px}.rn-ufo-body i:nth-child(3){left:78px}.rn-ufo-body i:nth-child(4){right:55px}.rn-ufo-body i:nth-child(5){right:25px}.rn-ufo-beam{position:absolute;left:50%;top:72px;width:170px;height:440px;transform:translateX(-50%);background:linear-gradient(rgba(211,255,137,.6),rgba(211,255,137,.1));clip-path:polygon(43% 0,57% 0,100% 100%,0 100%);filter:drop-shadow(0 0 16px rgba(205,255,129,.65));animation:rn-beam .25s ease-in-out infinite alternate}.rn-ufo-entering{animation:rn-ufo-enter .7s cubic-bezier(.16,1,.3,1) both}.rn-ufo-leaving{animation:rn-ufo-leave 1s ease-in both}@keyframes rn-ufo-hover{to{transform:translateY(-8px) rotate(1.5deg)}}@keyframes rn-ufo-enter{from{transform:translate(-50%,-180px) scale(.7);opacity:0}to{transform:translateX(-50%);opacity:1}}@keyframes rn-ufo-leave{to{transform:translate(-50%,-220px) scale(.7);opacity:0}}@keyframes rn-beam{to{opacity:.62;filter:blur(1px) drop-shadow(0 0 22px rgba(205,255,129,.7))}}
.rn-controls{position:absolute;z-index:1500;left:50%;bottom:18px;width:min(760px,calc(100% - 28px));transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:10px;padding:10px;border:2px solid #171224;border-radius:15px;background:rgba(255,250,237,.94);color:#171224;box-shadow:6px 6px 0 rgba(23,18,36,.45);backdrop-filter:blur(8px)}.rn-controls>div{display:grid;margin-right:auto}.rn-controls>div b{font-size:20px}.rn-controls>div span{color:#71697c;font-size:10px}.rn-controls button{min-height:46px;padding:8px 15px;border:2px solid #171224;border-radius:11px;background:#ffb54a;box-shadow:3px 3px 0 #171224;cursor:pointer;font-weight:950}.rn-controls .rn-reset{background:#fff}
.rn-result-backdrop{position:fixed;z-index:3000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(14,10,24,.72);backdrop-filter:blur(6px)}.rn-result{width:min(610px,100%);padding:30px;border:3px solid #171224;border-radius:22px;background:#fff8e6;color:#171224;box-shadow:12px 12px 0 #ffad46;text-align:center;animation:rn-result-in .32s cubic-bezier(.16,1,.3,1) both}.rn-result>span{display:inline-block;padding:6px 10px;border-radius:999px;background:#7357ff;color:#fff;font-size:11px;font-weight:950}.rn-result h2{margin:13px 0 8px;font-size:clamp(38px,6vw,70px);letter-spacing:-.05em}.rn-result p{margin:0 auto 24px;max-width:500px;color:#655d6c;font-size:18px}.rn-result>div{display:flex;justify-content:center;gap:8px}.rn-result button{min-height:44px;padding:8px 14px;border:2px solid #171224;border-radius:10px;background:#fff;cursor:pointer;font-weight:900}.rn-result .rn-primary{background:#ffb54a}@keyframes rn-result-in{from{opacity:0;transform:translateY(18px) scale(.88)}}
@media(max-width:760px){.rn-setup{grid-template-columns:1fr;padding-top:80px}.rn-form textarea{height:240px}.rn-topbar{height:auto;grid-template-columns:auto 1fr}.rn-topbar>div:last-child{grid-column:1/-1;justify-content:flex-end}.rn-arena{height:calc(100svh - 112px)}.rn-arena-ground{width:118vw;height:70vh}.rn-controls>div{display:none}.rn-controls{justify-content:center}.rn-controls button:first-of-type{flex:1}.rn-name-tag{font-size:8px}.rn-result>div{flex-wrap:wrap}}
`;
