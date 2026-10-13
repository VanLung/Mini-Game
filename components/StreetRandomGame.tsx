"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "lunix-street-random-class-v4";

const BACKGROUND_URL =
  "https://opengameart.org/sites/default/files/2dpixx_town_bg_0.png";

const KENNEY_ROOT =
  "https://raw.githubusercontent.com/ETdoFresh/kenney.nl/master/kenney_tooncharacters1";

const CHARACTER_ASSETS = [
  KENNEY_ROOT + "/Male%20person/PNG/Poses%20HD/character_malePerson_run0.png",
  KENNEY_ROOT + "/Female%20person/PNG/Poses%20HD/character_femalePerson_run0.png",
  KENNEY_ROOT + "/Male%20adventurer/PNG/Poses%20HD/character_maleAdventurer_run0.png",
  KENNEY_ROOT + "/Female%20adventurer/PNG/Poses%20HD/character_femaleAdventurer_run0.png",
] as const;

type GamePhase =
  | "idle"
  | "ufo-enter"
  | "lifting"
  | "abducting"
  | "fainted"
  | "result";

type Activity = "walk" | "drink" | "sweep";
type Outfit = "street" | "baba" | "briefs";

type Winner = {
  index: number;
  name: string;
};

function parseNames(value: string) {
  return value
    .split(/[\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function hashString(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function randomIndex(max: number) {
  if (max <= 1) return 0;
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return Math.floor((buffer[0] / 4294967296) * max);
  }
  return Math.floor(Math.random() * max);
}

function shuffle(values: number[]) {
  const next = [...values];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function characterAsset(name: string, index: number) {
  return CHARACTER_ASSETS[hashString(name + ":" + index) % CHARACTER_ASSETS.length];
}

function activityFor(name: string, index: number): Activity {
  const activities: Activity[] = ["walk", "drink", "sweep"];
  return activities[hashString("activity:" + name + ":" + index) % activities.length];
}

function outfitFor(name: string, index: number): Outfit {
  const outfits: Outfit[] = ["street", "baba", "briefs"];
  return outfits[hashString("outfit:" + name + ":" + index) % outfits.length];
}

function placement(name: string, index: number, total: number) {
  const hash = hashString("spot:" + name + ":" + index);
  const lanes = total >= 120 ? 7 : total >= 80 ? 6 : total >= 48 ? 5 : 4;
  const lane = index % lanes;
  const column = Math.floor(index / lanes);
  const columns = Math.max(1, Math.ceil(total / lanes));
  const left = 3 + ((column + 0.5) / columns) * 94;
  const sidewalkTop = 61 + lane * (24 / Math.max(1, lanes - 1));
  const jitter = (((hash >> 7) % 100) / 100 - 0.5) * 2.5;

  return {
    left: Math.min(98, Math.max(2, left)),
    top: Math.min(88, sidewalkTop + jitter),
    delay: -((hash % 900) / 100),
    duration: 5 + ((hash >> 5) % 45) / 10,
    drift: 9 + ((hash >> 10) % 18),
    recover: 3 + ((hash >> 14) % 21) / 10,
    flip: hash % 2 === 0 ? 1 : -1,
  };
}

function playCue(kind: "ufo" | "beam" | "result", muted: boolean) {
  if (muted) return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind === "result" ? "square" : "sine";

    const start = kind === "ufo" ? 180 : kind === "beam" ? 420 : 320;
    const end = kind === "ufo" ? 540 : kind === "beam" ? 1100 : 140;
    oscillator.frequency.setValueAtTime(start, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(end, audio.currentTime + 0.42);

    gain.gain.setValueAtTime(0.07, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.46);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.48);
    oscillator.addEventListener("ended", () => void audio.close());
  } catch {
    // Trình duyệt có thể chặn AudioContext trước lần tương tác đầu tiên.
  }
}

function Setup({
  draft,
  setDraft,
  noRepeat,
  setNoRepeat,
  drawCount,
  setDrawCount,
  begin,
  error,
}: {
  draft: string;
  setDraft: (value: string) => void;
  noRepeat: boolean;
  setNoRepeat: (value: boolean) => void;
  drawCount: number;
  setDrawCount: (value: number) => void;
  begin: () => void;
  error: string;
}) {
  const count = parseNames(draft).length;

  return (
    <main className="street4-setup">
      <div className="street4-bg" aria-hidden="true">
        <img src={BACKGROUND_URL} alt="" />
      </div>

      <header className="street4-topline">
        <Link href="/">⌂ Game Hub</Link>
        <span>Random Name · Khu Phố Gọi Tên</span>
      </header>

      <section className="street4-setup-grid">
        <div className="street4-setup-hero">
          <div className="street4-title-board">
            <small>ROBO LUNIX · RANDOM NAME</small>
            <h1>KHU PHỐ<br />GỌI TÊN</h1>
            <p>UFO sẽ bắt ai đi mất?</p>
          </div>

          <div className="street4-setup-ufo" aria-hidden="true">
            <div className="street4-ufo">
              <i className="street4-ufo-dome" />
              <i className="street4-ufo-body" />
              <i className="street4-ufo-light l1" />
              <i className="street4-ufo-light l2" />
              <i className="street4-ufo-light l3" />
              <i className="street4-ufo-light l4" />
            </div>
          </div>

          <div className="street4-setup-cast" aria-hidden="true">
            {CHARACTER_ASSETS.slice(0, 3).map((src, index) => (
              <img key={src} src={src} alt="" style={{ "--i": index } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className="street4-form-card">
          <div className="street4-form-heading">
            <div>
              <small>DANH SÁCH LỚP</small>
              <h2>Nhập danh sách nhân vật</h2>
            </div>
            <strong>{count}</strong>
          </div>

          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={"Nguyễn Gia Vỹ\nTrần Minh Triết\nLê Nhất Phi\nNguyễn Ngọc Anh\n..."}
          />

          <p className="street4-hint">
            Mỗi dòng một tên. Có thể dán trực tiếp từ Excel hoặc Google Sheets.
          </p>

          <div className="street4-options">
            <label>
              <span>Số người UFO bắt</span>
              <select value={drawCount} onChange={(event) => setDrawCount(Number(event.target.value))}>
                <option value={1}>1 người</option>
                <option value={2}>2 người</option>
              </select>
            </label>

            <label className="street4-check">
              <input checked={noRepeat} onChange={(event) => setNoRepeat(event.target.checked)} type="checkbox" />
              <span>
                <b>Không lặp tên</b>
                <small>Người bị UFO bắt sẽ biến mất cho tới khi reset lượt</small>
              </span>
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="street4-enter" onClick={begin} type="button">
            <span>👽 VÀO KHU PHỐ</span>
            <b>→</b>
          </button>
        </div>
      </section>
    </main>
  );
}

export function StreetRandomGame() {
  const timers = useRef<number[]>([]);
  const selectedRef = useRef<number[]>([]);

  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [noRepeat, setNoRepeat] = useState(true);
  const [drawCount, setDrawCount] = useState(1);
  const [called, setCalled] = useState<number[]>([]);
  const [phase, setPhase] = useState<GamePhase>("idle");
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [round, setRound] = useState(0);
  const [muted, setMuted] = useState(false);
  const [recovered, setRecovered] = useState(true);
  const [error, setError] = useState("");

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) window.clearTimeout(timer);
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const timer = window.setTimeout(fn, ms);
    timers.current.push(timer);
  }, []);

  useEffect(() => {
    try {
      const raw =
        window.localStorage.getItem(STORAGE_KEY) ||
        window.localStorage.getItem("lunix-street-random-class-v3");
      if (!raw) return;
      const stored = JSON.parse(raw) as string[];
      if (Array.isArray(stored)) setDraft(stored.filter(Boolean).join("\n"));
    } catch {
      // Bỏ qua localStorage hỏng.
    }
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const busy = phase !== "idle" && phase !== "result";

  const remaining = useMemo(
    () => (noRepeat ? Math.max(0, names.length - called.length) : names.length),
    [called.length, names.length, noRepeat],
  );

  const density =
    names.length >= 150
      ? "ultra"
      : names.length >= 95
        ? "dense"
        : names.length >= 55
          ? "medium"
          : "normal";

  const begin = useCallback(() => {
    const parsed = parseNames(draft);
    if (!parsed.length) {
      setError("Hãy nhập ít nhất một tên.");
      return;
    }

    clearTimers();
    setError("");
    setNames(parsed);
    setCalled([]);
    setPhase("idle");
    setSelectedIndexes([]);
    setWinners([]);
    setRound(0);
    setRecovered(true);
    setStarted(true);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Game vẫn hoạt động nếu trình duyệt chặn localStorage.
    }
  }, [clearTimers, draft]);

  const chooseWinners = useCallback(() => {
    let pool = names.map((_, index) => index);

    if (noRepeat) {
      const used = new Set(called);
      pool = pool.filter((index) => !used.has(index));

      if (!pool.length) {
        setCalled([]);
        pool = names.map((_, index) => index);
      }
    }

    return shuffle(pool).slice(0, Math.min(drawCount, pool.length));
  }, [called, drawCount, names, noRepeat]);

  const startRandom = useCallback(() => {
    if (busy || winners.length || !names.length) return;

    const selected = chooseWinners();
    if (!selected.length) return;

    clearTimers();
    selectedRef.current = selected;
    setSelectedIndexes([]);
    setWinners([]);
    setRound((value) => value + 1);
    setRecovered(false);
    setPhase("ufo-enter");
    playCue("ufo", muted);

    later(() => {
      setPhase("lifting");
      playCue("beam", muted);
    }, 950);

    later(() => {
      setSelectedIndexes(selectedRef.current);
      setPhase("abducting");
    }, 2600);

    later(() => {
      const picked = selectedRef.current;
      if (noRepeat) {
        setCalled((current) => {
          const next = [...current];
          for (const index of picked) if (!next.includes(index)) next.push(index);
          return next;
        });
      }
      setPhase("fainted");
    }, 3900);

    later(() => {
      const picked = selectedRef.current;
      setWinners(picked.map((index) => ({ index, name: names[index] })));
      playCue("result", muted);
    }, 4800);

    later(() => {
      setPhase("idle");
      setRecovered(true);
    }, 9000);
  }, [
    busy,
    chooseWinners,
    clearTimers,
    later,
    muted,
    names,
    noRepeat,
    winners.length,
  ]);

  const continueRound = useCallback(() => {
    if (!recovered) return;
    clearTimers();
    setSelectedIndexes([]);
    selectedRef.current = [];
    setWinners([]);
    setPhase("idle");
  }, [clearTimers, recovered]);

  const resetCycle = useCallback(() => {
    clearTimers();
    setCalled([]);
    setSelectedIndexes([]);
    selectedRef.current = [];
    setWinners([]);
    setRecovered(true);
    setPhase("idle");
  }, [clearTimers]);

  const activeNames = noRepeat ? names.filter((_, index) => !called.includes(index)) : names;

  if (!started) {
    return (
      <Setup
        begin={begin}
        draft={draft}
        drawCount={drawCount}
        error={error}
        noRepeat={noRepeat}
        setDraft={setDraft}
        setDrawCount={setDrawCount}
        setNoRepeat={setNoRepeat}
      />
    );
  }

  return (
    <main className="street4-game" data-density={density} data-phase={phase}>
      <div className="street4-bg" aria-hidden="true">
        <img src={BACKGROUND_URL} alt="" />
      </div>
      <div className="street4-scene-tone" />

      <header className="street4-gamebar">
        <Link href="/">⌂ Game Hub</Link>

        <div className="street4-stats">
          <span><small>TRONG KHU PHỐ</small><b>{activeNames.length}</b></span>
          <span><small>CHƯA BỊ BẮT</small><b>{noRepeat ? remaining : "∞"}</b></span>
          <span><small>LƯỢT UFO</small><b>{round}</b></span>
        </div>

        <div className="street4-actions">
          <button onClick={() => setMuted((value) => !value)} type="button">
            {muted ? "🔇" : "🔊"}
          </button>
          {noRepeat && (
            <button disabled={busy} onClick={resetCycle} type="button">
              ↻ Reset lượt
            </button>
          )}
          <button disabled={busy} onClick={() => setStarted(false)} type="button">
            ✎ Sửa danh sách
          </button>
        </div>
      </header>

      <section className="street4-world">
        <div className={"street4-ufo-wrap phase-" + phase}>
          <div className="street4-ufo">
            <i className="street4-ufo-dome" />
            <i className="street4-ufo-body" />
            <i className="street4-ufo-light l1" />
            <i className="street4-ufo-light l2" />
            <i className="street4-ufo-light l3" />
            <i className="street4-ufo-light l4" />
          </div>
          <div className="street4-beam" />
        </div>

        <div className="street4-sidewalk-crowd">
          {names.map((name, index) => {
            const wasTaken = noRepeat && called.includes(index);
            const selected = selectedIndexes.includes(index);
            if (wasTaken && phase === "idle") return null;

            const spot = placement(name, index, names.length);
            const activity = activityFor(name, index);
            const outfit = outfitFor(name, index);
            const isSurvivor =
              phase === "fainted" &&
              !selectedIndexes.includes(index) &&
              !wasTaken;

            return (
              <div
                className={[
                  "street4-person",
                  "activity-" + activity,
                  "outfit-" + outfit,
                  selected ? "is-selected" : "",
                  isSurvivor ? "is-fainted" : "",
                  wasTaken ? "was-taken" : "",
                ].filter(Boolean).join(" ")}
                key={index}
                style={{
                  left: spot.left + "%",
                  top: spot.top + "%",
                  "--delay": spot.delay + "s",
                  "--duration": spot.duration + "s",
                  "--drift": spot.drift + "px",
                  "--recover": spot.recover + "s",
                  "--flip": spot.flip,
                  "--z": Math.round(spot.top),
                } as React.CSSProperties}
              >
                <div className="street4-name-bubble">{name}</div>

                <div className="street4-person-art">
                  <img src={characterAsset(name, index)} alt="" />
                  <i className="street4-costume" aria-hidden="true" />
                </div>

                {activity === "drink" && (
                  <div className="street4-prop drink" aria-hidden="true">
                    <i className="stool" />
                    <i className="glass">🥤</i>
                  </div>
                )}

                {activity === "sweep" && (
                  <div className="street4-prop sweep" aria-hidden="true">
                    <i className="broom">🧹</i>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {phase !== "idle" && phase !== "result" && (
          <div className="street4-event-copy">
            {phase === "ufo-enter" && <strong>🛸 UFO ĐANG TỚI!</strong>}
            {phase === "lifting" && <strong>TẤT CẢ ĐANG BỊ HÚT LÊN!</strong>}
            {phase === "abducting" && <strong>UFO ĐANG CHỌN...</strong>}
            {phase === "fainted" && <strong>💫 NHỮNG NGƯỜI CÒN LẠI ĐÃ XỈU!</strong>}
          </div>
        )}
      </section>

      <div className="street4-control">
        <div>
          <small>UFO RANDOM</small>
          <span>
            UFO hút cả khu phố lên rồi bắt đi {drawCount} người ngẫu nhiên
          </span>
        </div>
        <button disabled={busy || Boolean(winners.length)} onClick={startRandom} type="button">
          {busy ? "UFO ĐANG HOẠT ĐỘNG..." : "🛸 GỌI UFO"}
        </button>
      </div>

      {winners.length > 0 && (
        <div className="street4-result-backdrop">
          <section className="street4-result" role="dialog" aria-modal="true">
            <header>
              <small>🛸 UFO ĐÃ RỜI KHỎI KHU PHỐ</small>
              <h2>{winners.length === 1 ? "ĐÃ BẮT ĐI 1 NGƯỜI!" : "ĐÃ BẮT ĐI 2 NGƯỜI!"}</h2>
            </header>

            <div className="street4-winners">
              {winners.map((winner) => (
                <article key={winner.index}>
                  <img src={characterAsset(winner.name, winner.index)} alt="" />
                  <div>
                    <small>ĐÃ BỊ UFO BẮT</small>
                    <h3>{winner.name}</h3>
                  </div>
                </article>
              ))}
            </div>

            <footer>
              <span>
                {recovered
                  ? "Những người còn lại đã tỉnh dậy và tiếp tục sinh hoạt."
                  : "Những người còn lại đang xỉu và sẽ tỉnh lại sau khoảng 3–5 giây..."}
              </span>
              <button disabled={!recovered} onClick={continueRound} type="button">
                {recovered ? "TIẾP TỤC →" : "ĐANG HỒI PHỤC..."}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
