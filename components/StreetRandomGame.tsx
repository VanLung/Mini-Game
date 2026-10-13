"use client";

import Link from "next/link";
import {
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const STORAGE_KEY = "lunix-street-random-class";
const MAX_STUDENTS = 60;

type StreetAgent = {
  index: number;
  x: number;
  lane: number;
  speed: number;
  direction: 1 | -1;
  nextTurnAt: number;
};

type Winner = {
  index: number;
  name: string;
};

type StreetEventKind = "icecream" | "bus" | "rain" | "vendor";

type StreetEvent = {
  id: number;
  kind: StreetEventKind;
  title: string;
  subtitle: string;
};

const STREET_EVENTS: Array<Omit<StreetEvent, "id">> = [
  {
    kind: "icecream",
    title: "Xe kem tuổi thơ",
    subtitle: "Leng keng... ai nghe tiếng là biết!",
  },
  {
    kind: "bus",
    title: "Xe buýt ghé trạm",
    subtitle: "Khu phố tự nhiên đông vui hơn hẳn.",
  },
  {
    kind: "rain",
    title: "Mưa rào bất chợt",
    subtitle: "Mưa một chút rồi lại tạnh.",
  },
  {
    kind: "vendor",
    title: "Hàng rong đi qua",
    subtitle: "Bánh bao nóng đây...!",
  },
];

const SHOP_SIGNS = [
  ["TẠP HÓA CÔ BA", "Có bán mì gói"],
  ["BÁNH MÌ", "Nóng giòn"],
  ["TRÀ ĐÁ", "2K một ly"],
  ["TIỆM NET", "Máy lạnh"],
  ["CẮT TÓC", "Gọn gàng"],
  ["XE ÔM", "Có mặt ngay"],
];

function stringHash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

function pickStreetEvent(): StreetEvent {
  const template = STREET_EVENTS[Math.floor(Math.random() * STREET_EVENTS.length)];
  return { ...template, id: Date.now() + Math.floor(Math.random() * 10000) };
}

function parseNames(value: string) {
  return value
    .split(/[\n,;\t]+/)
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, MAX_STUDENTS);
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buffer = new Uint32Array(1);
    for (let i = result.length - 1; i > 0; i -= 1) {
      crypto.getRandomValues(buffer);
      const j = Math.floor((buffer[0] / 4294967296) * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

let streetAudio: AudioContext | null = null;

function cue(kind: "start" | "beam" | "result") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!streetAudio || streetAudio.state === "closed") {
      streetAudio = new AudioContextClass();
    }

    const ctx = streetAudio;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const notes =
      kind === "start"
        ? [330, 440, 660]
        : kind === "beam"
          ? [720, 540, 860]
          : [440, 660, 880];

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.065, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = kind === "beam" ? "sine" : "triangle";
      oscillator.frequency.setValueAtTime(
        frequency,
        ctx.currentTime + index * 0.07,
      );
      oscillator.connect(gain);
      oscillator.start(ctx.currentTime + index * 0.07);
      oscillator.stop(ctx.currentTime + index * 0.07 + 0.18);
    });
  } catch {
    // Âm thanh chỉ là hiệu ứng phụ.
  }
}

function makeAgents(count: number): StreetAgent[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    x: 4 + Math.random() * 90,
    lane: index % 4,
    speed: 2.8 + Math.random() * 2.9,
    direction: Math.random() > 0.5 ? 1 : -1,
    nextTurnAt: performance.now() + 1800 + Math.random() * 4200,
  }));
}

export function StreetRandomGame() {
  const sceneRef = useRef<HTMLDivElement | null>(null);
  const characterRefs = useRef(new Map<number, HTMLDivElement>());
  const agentsRef = useRef<StreetAgent[]>([]);
  const calledRef = useRef<number[]>([]);
  const frozenRef = useRef(new Set<number>());
  const roundTokenRef = useRef(0);
  const drawingRef = useRef(false);

  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [drawCount, setDrawCount] = useState(2);
  const [noRepeat, setNoRepeat] = useState(true);
  const [muted, setMuted] = useState(false);
  const [called, setCalled] = useState<number[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [ufoVisible, setUfoVisible] = useState(false);
  const [beams, setBeams] = useState<Array<{ index: number; x: number }>>([]);
  const [abducted, setAbducted] = useState<number[]>([]);
  const [winners, setWinners] = useState<Winner[]>([]);
  const [round, setRound] = useState(0);
  const [streetEvent, setStreetEvent] = useState<StreetEvent | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as string[];
      if (Array.isArray(saved)) {
        setDraft(
          saved
            .filter((item) => typeof item === "string" && item.trim())
            .join("\n"),
        );
      }
    } catch {
      // Bỏ qua localStorage hỏng.
    }
  }, []);

  useEffect(() => {
    calledRef.current = called;
  }, [called]);

  useEffect(() => {
    drawingRef.current = drawing;
  }, [drawing]);

  useEffect(() => {
    if (!started || names.length === 0) return;

    agentsRef.current = makeAgents(names.length);
    let frame = 0;
    let previous = performance.now();

    const animate = (now: number) => {
      const dt = Math.min(0.04, (now - previous) / 1000);
      previous = now;

      for (const agent of agentsRef.current) {
        const element = characterRefs.current.get(agent.index);
        if (!element || frozenRef.current.has(agent.index)) continue;

        if (now >= agent.nextTurnAt && Math.random() < 0.38) {
          agent.direction = agent.direction === 1 ? -1 : 1;
          agent.nextTurnAt = now + 1800 + Math.random() * 4200;
        }

        agent.x += agent.direction * agent.speed * dt;

        if (agent.x <= 2.5) {
          agent.x = 2.5;
          agent.direction = 1;
          agent.nextTurnAt = now + 2200 + Math.random() * 3200;
        } else if (agent.x >= 94.5) {
          agent.x = 94.5;
          agent.direction = -1;
          agent.nextTurnAt = now + 2200 + Math.random() * 3200;
        }

        const y = 63 + agent.lane * 6.2;
        element.style.left = agent.x + "%";
        element.style.top = y + "%";
      }

      frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      roundTokenRef.current += 1;
      frozenRef.current.clear();
      characterRefs.current.clear();
    };
  }, [names, started]);

  useEffect(() => {
    if (!started) {
      setStreetEvent(null);
      return;
    }

    let showTimer = 0;
    let hideTimer = 0;
    let stopped = false;

    const schedule = () => {
      if (stopped) return;
      showTimer = window.setTimeout(() => {
        if (stopped) return;
        if (drawingRef.current) {
          schedule();
          return;
        }
        setStreetEvent(pickStreetEvent());
        hideTimer = window.setTimeout(() => {
          if (stopped) return;
          setStreetEvent(null);
          schedule();
        }, 5200);
      }, 8500 + Math.random() * 6500);
    };

    schedule();

    return () => {
      stopped = true;
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
      setStreetEvent(null);
    };
  }, [started]);

  useEffect(() => {
    return () => {
      roundTokenRef.current += 1;
      if (streetAudio && streetAudio.state !== "closed") {
        void streetAudio.close().catch(() => undefined);
      }
      streetAudio = null;
    };
  }, []);

  const remainingCount = useMemo(() => {
    if (!noRepeat) return names.length;
    return Math.max(0, names.length - called.length);
  }, [called.length, names.length, noRepeat]);

  const beginGame = useCallback(() => {
    const parsed = parseNames(draft);
    if (!parsed.length) {
      setError("Hãy nhập ít nhất một tên học sinh.");
      return;
    }

    setError("");
    setNames(parsed);
    setCalled([]);
    calledRef.current = [];
    setWinners([]);
    setBeams([]);
    setAbducted([]);
    setStarted(true);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Game vẫn chạy nếu localStorage bị chặn.
    }
  }, [draft]);

  const chooseWinners = useCallback(() => {
    let pool = names.map((_, index) => index);

    if (noRepeat) {
      const used = new Set(calledRef.current);
      pool = pool.filter((index) => !used.has(index));

      if (!pool.length) {
        calledRef.current = [];
        setCalled([]);
        pool = names.map((_, index) => index);
      }
    }

    return shuffle(pool).slice(0, Math.min(drawCount, pool.length));
  }, [drawCount, names, noRepeat]);

  const startDraw = useCallback(async () => {
    if (drawing || winners.length || !names.length) return;

    const selected = chooseWinners();
    if (!selected.length) return;

    const token = roundTokenRef.current + 1;
    roundTokenRef.current = token;
    setDrawing(true);
    setStreetEvent(null);
    setRound((value) => value + 1);
    setWinners([]);
    setAbducted([]);
    setBeams([]);

    if (!muted) cue("start");
    setUfoVisible(true);

    await sleep(1050);
    if (roundTokenRef.current !== token) return;

    const captured: number[] = [];

    for (const index of selected) {
      if (roundTokenRef.current !== token) return;

      const agent = agentsRef.current[index];
      if (!agent) continue;

      frozenRef.current.add(index);
      const x = agent.x;
      setBeams([{ index, x }]);
      if (!muted) cue("beam");

      await sleep(780);
      if (roundTokenRef.current !== token) return;

      captured.push(index);
      setAbducted((current) => [...current, index]);

      await sleep(420);
      if (roundTokenRef.current !== token) return;
    }

    setBeams([]);
    await sleep(500);
    if (roundTokenRef.current !== token) return;

    const finalWinners = captured.map((index) => ({
      index,
      name: names[index],
    }));

    if (noRepeat) {
      setCalled((current) => {
        const next = [...current];
        for (const index of captured) {
          if (!next.includes(index)) next.push(index);
        }
        calledRef.current = next;
        return next;
      });
    }

    setWinners(finalWinners);
    setDrawing(false);
    if (!muted) cue("result");
  }, [chooseWinners, drawing, muted, names, noRepeat, winners.length]);

  const continueRound = useCallback(() => {
    roundTokenRef.current += 1;
    frozenRef.current.clear();
    setAbducted([]);
    setBeams([]);
    setUfoVisible(false);
    setWinners([]);
    setDrawing(false);

    window.setTimeout(() => {
      for (const index of calledRef.current) {
        const element = characterRefs.current.get(index);
        if (element) element.style.opacity = "1";
      }
    }, 30);
  }, []);

  const resetCycle = useCallback(() => {
    calledRef.current = [];
    setCalled([]);
    continueRound();
  }, [continueRound]);

  if (!started) {
    const previewCount = parseNames(draft).length;

    return (
      <main className="street-setup-shell">
        <Link className="game-back-link" href="/">← Game Hub</Link>

        <section className="street-setup-card">
          <div className="street-setup-copy">
            <p>KHU PHỐ GỌI TÊN · RANDOM NAME</p>
            <h1>Chiều nay ai lên bảng?</h1>
            <span>
              Random công bằng trước, UFO chỉ làm nhiệm vụ “diễn”. Phong cách khu
              phố Việt Nam hoài niệm, lấy cảm hứng từ webgame đời cũ.
            </span>

            <div className="street-mini-scene" aria-hidden="true">
              <i className="street-mini-ufo">🛸</i>
              <i>🏪</i><i>🛵</i><i>🧍</i><i>🥖</i><i>🧋</i>
            </div>
          </div>

          <div className="street-setup-form">
            <div className="street-form-heading">
              <div>
                <b>Danh sách học sinh</b>
                <span>Mỗi dòng một tên hoặc dán nguyên cột</span>
              </div>
              <strong>{previewCount}</strong>
            </div>

            <textarea
              onChange={(event) => setDraft(event.target.value)}
              placeholder={"[Học sinh 1]\n[Học sinh 2]\n[Học sinh 3]\n..."}
              value={draft}
            />

            <div className="street-settings-row">
              <label>
                <span>Số bạn mỗi lượt</span>
                <select
                  onChange={(event) => setDrawCount(Number(event.target.value))}
                  value={drawCount}
                >
                  {[1, 2, 3, 4, 5].map((count) => (
                    <option key={count} value={count}>{count} bạn</option>
                  ))}
                </select>
              </label>

              <label className="street-check">
                <input
                  checked={noRepeat}
                  onChange={(event) => setNoRepeat(event.target.checked)}
                  type="checkbox"
                />
                <span>Không lặp tên</span>
              </label>
            </div>

            {error && <p className="form-error">{error}</p>}

            <button className="street-enter-button" onClick={beginGame} type="button">
              Vào khu phố <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="street-game-shell">
      <header className="street-topbar">
        <Link href="/">GAME HUB</Link>
        <div>
          <b>Khu Phố Gọi Tên</b>
          <span>
            {names.length} học sinh · gọi {drawCount} bạn/lượt
            {noRepeat ? " · còn " + remainingCount + " chưa gọi" : ""}
          </span>
        </div>
        <div className="street-top-actions">
          <button onClick={() => setMuted((value) => !value)} type="button">
            {muted ? "🔇" : "🔊"}
          </button>
          {noRepeat && (
            <button disabled={drawing} onClick={resetCycle} type="button">
              Làm mới lượt
            </button>
          )}
          <button disabled={drawing} onClick={() => setStarted(false)} type="button">
            Sửa danh sách
          </button>
        </div>
      </header>

      <section className="street-stage" ref={sceneRef}>
        <div className="street-sky">
          <div className="street-cloud cloud-a" />
          <div className="street-cloud cloud-b" />
          <div className="street-wire wire-one" />
          <div className="street-wire wire-two" />
        </div>

        <div className="street-buildings" aria-hidden="true">
          {SHOP_SIGNS.map(([title, sub], index) => (
            <div className={"street-shop shop-" + (index + 1)} key={title}>
              <div className="street-shop-upper">
                <i /><i /><i />
              </div>
              <div className="street-awning" />
              <div className="street-shop-sign">
                <b>{title}</b>
                <small>{sub}</small>
              </div>
              <div className="street-shop-door" />
            </div>
          ))}
        </div>

        <div className="street-sidewalk">
          <div className="street-lamp lamp-one" />
          <div className="street-lamp lamp-two" />
          <div className="street-bench">▰</div>
          <div className="street-cart">
            <span>XE ĐẨY</span>
            <i>●</i><i>●</i>
          </div>

          <div className="street-npc npc-banhmi" aria-hidden="true">
            <div className="street-npc-speech">Bánh mì nóng đây!</div>
            <div className="street-npc-body"><i /><b /></div>
            <div className="street-npc-pushcart"><span>🥖</span><i /><i /></div>
          </div>

          <div className="street-npc npc-trada" aria-hidden="true">
            <div className="street-npc-speech">Trà đá mát lạnh!</div>
            <div className="street-npc-body"><i /><b /></div>
            <div className="street-npc-pushcart blue"><span>🧋</span><i /><i /></div>
          </div>

          <div className="street-npc npc-vechai" aria-hidden="true">
            <div className="street-npc-speech">Ai ve chai hông?</div>
            <div className="street-npc-body"><i /><b /></div>
            <div className="street-npc-pushcart green"><span>♻</span><i /><i /></div>
          </div>
        </div>

        <div className="street-road">
          <div className="street-road-line" />
          <div className="street-scooter scooter-a">🛵</div>
          <div className="street-scooter scooter-b">🛵</div>
        </div>

        {streetEvent && (
          <div className={"street-live-event event-" + streetEvent.kind} key={streetEvent.id}>
            <div className="street-event-label">
              <small>SỰ KIỆN KHU PHỐ</small>
              <b>{streetEvent.title}</b>
              <span>{streetEvent.subtitle}</span>
            </div>

            {streetEvent.kind === "icecream" && (
              <div className="street-event-icecream">
                <div>🍦</div>
                <b>XE KEM</b>
                <i /><i />
              </div>
            )}

            {streetEvent.kind === "bus" && (
              <div className="street-event-bus">
                <small>08</small>
                <strong>XE BUÝT</strong>
                <span>● ● ●</span>
                <i /><i />
              </div>
            )}

            {streetEvent.kind === "vendor" && (
              <div className="street-event-vendor">
                <span>📣</span>
                <b>BÁNH BAO NÓNG ĐÂY!</b>
              </div>
            )}

            {streetEvent.kind === "rain" && (
              <div className="street-event-rain" aria-hidden="true">
                {Array.from({ length: 28 }, (_, index) => (
                  <i
                    key={index}
                    style={{
                      "--rain-index": index,
                      left: ((index * 37) % 101) + "%",
                    } as CSSProperties}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="street-characters">
          {names.map((name, index) => {
            const wasCalled = noRepeat && called.includes(index);
            const isAbducted = abducted.includes(index);
            const variant = stringHash(name + ":" + index);
            const hue = variant % 360;
            const hairVariant = variant % 4;
            const accessoryVariant = Math.floor(variant / 7) % 5;
            const bodyVariant = Math.floor(variant / 13) % 3;
            const style = {
              "--shirt": "hsl(" + hue + " 62% 55%)",
              "--shirt-alt":
                "hsl(" + ((hue + 34) % 360) + " 58% 46%)",
              "--pants":
                "hsl(" + ((hue + 180) % 360) + " 35% 32%)",
            } as CSSProperties;

            return (
              <div
                className={[
                  "street-person",
                  wasCalled ? "was-called" : "",
                  isAbducted ? "is-abducted" : "",
                ].filter(Boolean).join(" ")}
                key={index}
                ref={(element) => {
                  if (element) characterRefs.current.set(index, element);
                  else characterRefs.current.delete(index);
                }}
                style={style}
              >
                <span className="street-name-tag">{name}</span>
                <div className={"street-person-body body-" + bodyVariant}>
                  <i className={"street-hair hair-" + hairVariant} />
                  <i className="street-head" />
                  <i className={"street-accessory accessory-" + accessoryVariant} />
                  <i className="street-shirt" />
                  <i className="street-arm arm-left" />
                  <i className="street-arm arm-right" />
                  <i className="street-leg leg-left" />
                  <i className="street-leg leg-right" />
                </div>
                {wasCalled && <small>đã gọi</small>}
              </div>
            );
          })}
        </div>

        {ufoVisible && (
          <div className={"street-ufo " + (drawing ? "active" : "")}>
            <div className="ufo-dome" />
            <div className="ufo-body">
              <i /><i /><i /><i /><i />
            </div>
            <small>RANDOM FAIR ENGINE</small>
          </div>
        )}

        {beams.map((beam) => (
          <div
            className="street-ufo-beam"
            key={beam.index + "-" + round}
            style={{ left: "calc(" + beam.x + "% - 70px)" }}
          >
            <i />
          </div>
        ))}

        <div className="street-game-controls">
          <div>
            <span>UFO chọn ngẫu nhiên trước khi animation bắt đầu</span>
            <small>Hình ảnh không ảnh hưởng kết quả</small>
          </div>
          <button
            disabled={drawing || Boolean(winners.length)}
            onClick={startDraw}
            type="button"
          >
            {drawing ? "🛸 ĐANG TÓM..." : "🛸 GỌI TÊN NGẪU NHIÊN"}
          </button>
        </div>

        {drawing && (
          <div className="street-round-banner" key={round}>
            <span>🛸</span>
            <div>
              <small>CHÚ Ý · UFO ĐANG TỚI</small>
              <strong>TÓM AI LÊN BẢNG ĐÂY?</strong>
            </div>
          </div>
        )}

        {winners.length > 0 && (
          <div className="street-result-backdrop">
            <section className="street-result-card" role="dialog" aria-modal="true">
              <div className="street-result-stamp">ĐÃ BẮT</div>
              <div className="street-result-title">
                <span>🛸</span>
                <div>
                  <small>KẾT QUẢ GỌI TÊN</small>
                  <h2>Mời các bạn lên bảng trả bài</h2>
                </div>
              </div>

              <div className="street-winner-list">
                {winners.map((winner, index) => (
                  <article key={winner.index}>
                    <b>{String(index + 1).padStart(2, "0")}</b>
                    <div className="street-winner-avatar">🙂</div>
                    <strong>{winner.name}</strong>
                  </article>
                ))}
              </div>

              <div className="street-result-actions">
                <button className="street-primary" onClick={continueRound} type="button">
                  Tiếp tục
                </button>
              </div>
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
