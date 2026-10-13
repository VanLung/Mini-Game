"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "lunix-street-random-class-v3";

const BACKGROUND_URL =
  "https://opengameart.org/sites/default/files/2dpixx_town_bg_0.png";

const KENNEY_ROOT =
  "https://raw.githubusercontent.com/ETdoFresh/kenney.nl/master/kenney_tooncharacters1";

const STUDENT_ASSETS = [
  KENNEY_ROOT + "/Male%20person/PNG/Poses%20HD/character_malePerson_run0.png",
  KENNEY_ROOT + "/Female%20person/PNG/Poses%20HD/character_femalePerson_run0.png",
  KENNEY_ROOT + "/Male%20adventurer/PNG/Poses%20HD/character_maleAdventurer_run0.png",
  KENNEY_ROOT + "/Female%20adventurer/PNG/Poses%20HD/character_femaleAdventurer_run0.png",
] as const;

const TEACHER_ASSET =
  KENNEY_ROOT + "/Male%20person/PNG/Poses%20HD/character_malePerson_cheer0.png";

const FUNNY_LINES = [
  "Ủa thầy bịt mắt thiệt không vậy? 😭",
  "Kế hoạch đào tẩu chính thức phá sản.",
  "Yêu cầu VAR! Em nghi có gian lận!",
  "Chạy hết công suất rồi mà vẫn bị tóm. 🥲",
  "Đồng đội đâu? Sao bỏ tôi lại vậy?",
  "NPC này vừa bị giáo viên phát hiện.",
  "Em nghĩ chúng ta nên thương lượng...",
  "Một phút mặc niệm cho chiến thuật vừa rồi.",
  "Báo động đỏ! Em đã bị bắt sống!",
  "Tưởng thoát rồi, ai ngờ thầy cao tay hơn.",
  "Xin tha, em còn bài tập chưa làm!",
  "Thầy nghe tiếng bước chân của em hả?",
  "Không thể tin được! Em là người được chọn.",
];

type Winner = {
  index: number;
  name: string;
  quote: string;
};

function parseNames(value: string) {
  return value
    .split(/[\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean);
}

function stringHash(value: string) {
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
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return Math.floor((values[0] / 4294967296) * max);
  }
  return Math.floor(Math.random() * max);
}

function shuffled(values: number[]) {
  const next = [...values];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function playCue(kind: "hunt" | "caught", muted: boolean) {
  if (muted) return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();

    oscillator.type = kind === "caught" ? "square" : "sine";
    oscillator.frequency.setValueAtTime(
      kind === "caught" ? 260 : 360,
      audio.currentTime,
    );
    oscillator.frequency.exponentialRampToValueAtTime(
      kind === "caught" ? 110 : 820,
      audio.currentTime + 0.3,
    );
    gain.gain.setValueAtTime(0.09, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.36);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.38);
    oscillator.addEventListener("ended", () => void audio.close());
  } catch {
    // Trình duyệt có thể chặn AudioContext trước lần tương tác đầu tiên.
  }
}

function studentAsset(name: string, index: number) {
  return STUDENT_ASSETS[stringHash(name + ":" + index) % STUDENT_ASSETS.length];
}

function placement(name: string, index: number, total: number) {
  const hash = stringHash(name + ":" + index);
  const rows = total > 96 ? 7 : total > 60 ? 6 : total > 34 ? 5 : 4;
  const row = index % rows;
  const column = Math.floor(index / rows);
  const columns = Math.max(1, Math.ceil(total / rows));
  const baseX = ((column + 0.5) / columns) * 92 + 4;
  const jitterX = ((hash % 100) / 100 - 0.5) * Math.min(5, 80 / columns);
  const baseY = 42 + row * (45 / Math.max(1, rows - 1));
  const jitterY = (((hash >> 8) % 100) / 100 - 0.5) * 3.5;
  return {
    left: Math.max(2, Math.min(98, baseX + jitterX)),
    top: Math.max(40, Math.min(91, baseY + jitterY)),
    delay: -((hash % 900) / 100),
    duration: 4.5 + ((hash >> 4) % 35) / 10,
    drift: 10 + ((hash >> 10) % 16),
    flip: hash % 2 === 0 ? 1 : -1,
  };
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
    <main className="street3-setup">
      <div className="street3-setup-bg" aria-hidden="true">
        <img src={BACKGROUND_URL} alt="" />
      </div>

      <header className="street3-topline">
        <Link href="/">⌂ Game Hub</Link>
        <span>Random Name · Khu Phố Gọi Tên</span>
      </header>

      <section className="street3-setup-grid">
        <div className="street3-hero">
          <div className="street3-title-board">
            <small>ROBO LUNIX · RANDOM NAME</small>
            <h1>KHU PHỐ<br />GỌI TÊN</h1>
            <p>Hôm nay ai sẽ được gọi?</p>
          </div>

          <div className="street3-hero-teacher" aria-hidden="true">
            <div className="street3-teacher-art">
              <img src={TEACHER_ASSET} alt="" />
              <i className="street3-blindfold" />
            </div>
          </div>

          <div className="street3-hero-students" aria-hidden="true">
            {STUDENT_ASSETS.slice(0, 3).map((src, index) => (
              <img key={src} src={src} alt="" style={{ "--i": index } as React.CSSProperties} />
            ))}
          </div>
        </div>

        <div className="street3-form-card">
          <div className="street3-form-heading">
            <div>
              <small>DANH SÁCH LỚP</small>
              <h2>Nhập danh sách học sinh</h2>
            </div>
            <strong>{count}</strong>
          </div>

          <textarea
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={"Nguyễn Gia Vỹ\nTrần Minh Triết\nLê Nhất Phi\nNguyễn Ngọc Anh\n..."}
          />

          <p className="street3-hint">
            Mỗi dòng một tên. Có thể dán trực tiếp từ Excel/Google Sheets; hỗ trợ dấu phẩy, dấu chấm phẩy và tab.
          </p>

          <div className="street3-options">
            <label>
              <span>Số bạn mỗi lượt</span>
              <select value={drawCount} onChange={(event) => setDrawCount(Number(event.target.value))}>
                {[1, 2, 3, 4, 5].map((countValue) => (
                  <option key={countValue} value={countValue}>{countValue} bạn</option>
                ))}
              </select>
            </label>

            <label className="street3-check">
              <input checked={noRepeat} onChange={(event) => setNoRepeat(event.target.checked)} type="checkbox" />
              <span>
                <b>Không lặp tên</b>
                <small>Cho đến khi gọi hết cả lớp</small>
              </span>
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="street3-enter" onClick={begin} type="button">
            <span>👥 VÀO KHU PHỐ</span>
            <b>→</b>
          </button>

          <div className="street3-credit">
            Background: 2DPIXX / OpenGameArt · CC BY 4.0 · Characters: Kenney · CC0
          </div>
        </div>
      </section>
    </main>
  );
}

export function StreetRandomGame() {
  const huntTimer = useRef<number | null>(null);
  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [noRepeat, setNoRepeat] = useState(true);
  const [drawCount, setDrawCount] = useState(1);
  const [called, setCalled] = useState<number[]>([]);
  const [hunting, setHunting] = useState(false);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [round, setRound] = useState(0);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as string[];
      if (Array.isArray(stored)) setDraft(stored.filter(Boolean).join("\n"));
    } catch {
      // Bỏ qua localStorage hỏng.
    }
  }, []);

  useEffect(() => () => {
    if (huntTimer.current) window.clearTimeout(huntTimer.current);
  }, []);

  const density =
    names.length > 120
      ? "ultra"
      : names.length > 70
        ? "dense"
        : names.length > 40
          ? "medium"
          : "normal";

  const remaining = useMemo(
    () => (noRepeat ? Math.max(0, names.length - called.length) : names.length),
    [called.length, names.length, noRepeat],
  );

  const begin = useCallback(() => {
    const parsed = parseNames(draft);
    if (!parsed.length) {
      setError("Hãy nhập ít nhất một tên học sinh.");
      return;
    }
    setError("");
    setNames(parsed);
    setCalled([]);
    setWinners([]);
    setSelectedIndexes([]);
    setRound(0);
    setStarted(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Không ảnh hưởng game nếu trình duyệt chặn localStorage.
    }
  }, [draft]);

  const choose = useCallback(() => {
    let pool = names.map((_, index) => index);
    if (noRepeat) {
      const used = new Set(called);
      pool = pool.filter((index) => !used.has(index));
      if (!pool.length) {
        setCalled([]);
        pool = names.map((_, index) => index);
      }
    }
    return shuffled(pool).slice(0, Math.min(drawCount, pool.length));
  }, [called, drawCount, names, noRepeat]);

  const startHunt = useCallback(() => {
    if (hunting || winners.length || !names.length) return;
    const selected = choose();
    if (!selected.length) return;

    setRound((value) => value + 1);
    setSelectedIndexes(selected);
    setHunting(true);
    playCue("hunt", muted);

    if (huntTimer.current) window.clearTimeout(huntTimer.current);
    huntTimer.current = window.setTimeout(() => {
      const result = selected.map((index) => ({
        index,
        name: names[index],
        quote: FUNNY_LINES[randomIndex(FUNNY_LINES.length)],
      }));

      if (noRepeat) {
        setCalled((current) => {
          const next = [...current];
          for (const index of selected) if (!next.includes(index)) next.push(index);
          return next;
        });
      }

      setHunting(false);
      setWinners(result);
      playCue("caught", muted);
    }, 3300);
  }, [choose, hunting, muted, names, noRepeat, winners.length]);

  const continueRound = useCallback(() => {
    setWinners([]);
    setSelectedIndexes([]);
  }, []);

  const resetCycle = useCallback(() => {
    setCalled([]);
    setWinners([]);
    setSelectedIndexes([]);
  }, []);

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
    <main className="street3-game" data-density={density}>
      <div className="street3-stage-bg" aria-hidden="true">
        <img src={BACKGROUND_URL} alt="" />
      </div>
      <div className="street3-stage-shade" />

      <header className="street3-gamebar">
        <Link href="/">⌂ Game Hub</Link>

        <div className="street3-stats">
          <span><small>HỌC SINH</small><b>{names.length}</b></span>
          <span><small>CHƯA GỌI</small><b>{noRepeat ? remaining : "∞"}</b></span>
          <span><small>LƯỢT</small><b>{round}</b></span>
        </div>

        <div className="street3-actions">
          <button onClick={() => setMuted((value) => !value)} type="button">{muted ? "🔇" : "🔊"}</button>
          {noRepeat && <button disabled={hunting} onClick={resetCycle} type="button">↻ Reset lượt</button>}
          <button disabled={hunting} onClick={() => setStarted(false)} type="button">✎ Sửa danh sách</button>
        </div>
      </header>

      <section className={hunting ? "street3-arena is-hunting" : "street3-arena"}>
        <div className="street3-crowd">
          {names.map((name, index) => {
            const spot = placement(name, index, names.length);
            const selected = selectedIndexes.includes(index);
            const wasCalled = noRepeat && called.includes(index);
            return (
              <div
                className={[
                  "street3-student",
                  selected ? "is-selected" : "",
                  wasCalled ? "was-called" : "",
                ].filter(Boolean).join(" ")}
                key={index}
                style={{
                  left: spot.left + "%",
                  top: spot.top + "%",
                  "--delay": spot.delay + "s",
                  "--duration": spot.duration + "s",
                  "--drift": spot.drift + "px",
                  "--flip": spot.flip,
                  "--z": Math.round(spot.top),
                } as React.CSSProperties}
              >
                <span>{name}</span>
                <img src={studentAsset(name, index)} alt="" />
              </div>
            );
          })}
        </div>

        <div className={hunting ? "street3-teacher is-hunting" : "street3-teacher"}>
          <b>GIÁO VIÊN</b>
          <div>
            <img src={TEACHER_ASSET} alt="" />
            <i className="street3-blindfold" />
          </div>
        </div>

        {hunting && (
          <div className="street3-hunt-banner">
            <small>🙈 GIÁO VIÊN ĐÃ BỊT MẮT</small>
            <strong>AI SẼ BỊ BẮT?</strong>
          </div>
        )}
      </section>

      <div className="street3-control">
        <div>
          <small>BỊT MẮT BẮT DÊ</small>
          <span>Random từ toàn bộ {names.length} học sinh · {drawCount} bạn/lượt</span>
        </div>
        <button disabled={hunting || Boolean(winners.length)} onClick={startHunt} type="button">
          {hunting ? "ĐANG SĂN..." : "🙈 BẮT ĐẦU SĂN"}
        </button>
      </div>

      <div className="street3-credit game-credit">
        Art: 2DPIXX (CC BY 4.0) · Kenney (CC0)
      </div>

      {winners.length > 0 && (
        <div className="street3-result-backdrop">
          <section className="street3-result" role="dialog" aria-modal="true">
            <header>
              <small>💥 KHU PHỐ VỪA BẮT ĐƯỢC</small>
              <h2>{winners.length > 1 ? winners.length + " HỌC SINH!" : "ĐÃ BỊ TÓM!"}</h2>
            </header>

            <div className="street3-winners">
              {winners.map((winner) => (
                <article key={winner.index}>
                  <img src={studentAsset(winner.name, winner.index)} alt="" />
                  <div>
                    <h3>{winner.name}</h3>
                    <p>“{winner.quote}”</p>
                  </div>
                </article>
              ))}
            </div>

            <footer>
              <span>Kết quả được chọn ngẫu nhiên trước animation.</span>
              <button onClick={continueRound} type="button">BẮT TIẾP →</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
