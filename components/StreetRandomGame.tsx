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
    title: "XE KEM LENG KENG",
    subtitle: "Một vòng tuổi thơ chạy ngang khu phố.",
  },
  {
    kind: "bus",
    title: "XE BUÝT VÀO TRẠM",
    subtitle: "Khu phố đông vui thêm một nhịp.",
  },
  {
    kind: "rain",
    title: "MƯA RÀO BẤT CHỢT",
    subtitle: "Mưa nhanh rồi lại tạnh.",
  },
  {
    kind: "vendor",
    title: "HÀNG RONG ĐI QUA",
    subtitle: "Bánh bao nóng đây...!",
  },
];

const PALETTES = [
  ["#d55447", "#324c5b"],
  ["#e0a83f", "#4b496c"],
  ["#4e8a70", "#744b3c"],
  ["#5484a7", "#50433e"],
  ["#9b6492", "#3e5562"],
  ["#d27b4d", "#31595a"],
  ["#6b78b3", "#5b473c"],
];

function stringHash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
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
    for (let index = result.length - 1; index > 0; index -= 1) {
      crypto.getRandomValues(buffer);
      const target = Math.floor((buffer[0] / 4294967296) * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

function pickStreetEvent(): StreetEvent {
  const template = STREET_EVENTS[Math.floor(Math.random() * STREET_EVENTS.length)];
  return {
    ...template,
    id: Date.now() + Math.floor(Math.random() * 10000),
  };
}

function makeAgents(count: number): StreetAgent[] {
  return Array.from({ length: count }, (_, index) => ({
    index,
    x: 4 + Math.random() * 91,
    lane: index % 4,
    speed: 4.2 + Math.random() * 3.2,
    direction: Math.random() > 0.5 ? 1 : -1,
    nextTurnAt: performance.now() + 2600 + Math.random() * 5200,
  }));
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
          ? [740, 520, 880]
          : [440, 660, 880];

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.58);

    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = kind === "beam" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      const start = ctx.currentTime + index * 0.07;
      oscillator.start(start);
      oscillator.stop(start + 0.17);
    });
  } catch {
    // Âm thanh là hiệu ứng phụ.
  }
}

function RetroStudent({
  variant,
}: {
  variant: number;
}) {
  const palette = PALETTES[variant % PALETTES.length];
  const skin = ["#efbc8e", "#e8aa79", "#d99468"][Math.floor(variant / 7) % 3];
  const hair = variant % 4;
  const glasses = Math.floor(variant / 5) % 4 === 1;
  const backpack = Math.floor(variant / 11) % 3 === 1;

  return (
    <svg
      aria-hidden="true"
      className="street-v2-student-svg"
      viewBox="0 0 64 94"
    >
      <ellipse cx="32" cy="90" rx="21" ry="4" fill="rgba(46,42,37,.18)" />

      {backpack && (
        <rect
          x="12"
          y="43"
          width="12"
          height="29"
          rx="5"
          fill="#6c7d84"
          stroke="#4b3b31"
          strokeWidth="2"
        />
      )}

      <g className="street-v2-walk-body">
        <path
          d="M25 65 L22 88"
          stroke="#4b3b31"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M39 65 L42 88"
          stroke="#4b3b31"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d="M21 89 h11"
          stroke="#2f3438"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <path
          d="M38 89 h11"
          stroke="#2f3438"
          strokeWidth="5"
          strokeLinecap="round"
        />

        <rect
          x="19"
          y="39"
          width="27"
          height="31"
          rx="8"
          fill={palette[0]}
          stroke="#4b3b31"
          strokeWidth="2.4"
        />
        <path
          d="M23 52 H42"
          stroke="rgba(255,255,255,.35)"
          strokeWidth="3"
        />

        <path
          className="street-v2-arm-left"
          d="M20 45 Q11 54 13 65"
          fill="none"
          stroke={skin}
          strokeWidth="7"
          strokeLinecap="round"
        />
        <path
          className="street-v2-arm-right"
          d="M45 45 Q53 54 51 65"
          fill="none"
          stroke={skin}
          strokeWidth="7"
          strokeLinecap="round"
        />

        <rect
          x="20"
          y="15"
          width="24"
          height="26"
          rx="10"
          fill={skin}
          stroke="#4b3b31"
          strokeWidth="2.4"
        />

        {hair === 0 && (
          <path
            d="M19 25 Q18 10 32 9 Q47 9 45 27 Q40 18 34 20 Q28 17 19 25"
            fill="#332b29"
          />
        )}
        {hair === 1 && (
          <path
            d="M18 24 Q18 8 32 9 Q45 8 46 23 L41 17 L37 23 L31 16 L25 22 Z"
            fill="#332b29"
          />
        )}
        {hair === 2 && (
          <>
            <path
              d="M18 24 Q18 9 32 9 Q46 9 46 25 Q39 17 32 19 Q25 17 18 24"
              fill="#332b29"
            />
            <circle cx="17" cy="25" r="7" fill="#332b29" />
            <circle cx="47" cy="25" r="7" fill="#332b29" />
          </>
        )}
        {hair === 3 && (
          <path
            d="M18 24 Q20 9 32 10 Q44 9 47 24 L40 20 L36 24 L31 18 L25 24 Z"
            fill="#40302a"
          />
        )}

        <circle cx="27" cy="29" r="1.7" fill="#3d342f" />
        <circle cx="37" cy="29" r="1.7" fill="#3d342f" />
        <path
          d="M29 35 Q32 37 35 35"
          fill="none"
          stroke="#9b5e50"
          strokeWidth="1.6"
          strokeLinecap="round"
        />

        {glasses && (
          <g fill="none" stroke="#425158" strokeWidth="1.8">
            <circle cx="27" cy="29" r="5" />
            <circle cx="37" cy="29" r="5" />
            <path d="M32 29 h0" strokeWidth="3" />
          </g>
        )}

        <rect
          x="23"
          y="67"
          width="18"
          height="5"
          rx="2.5"
          fill={palette[1]}
        />
      </g>
    </svg>
  );
}

function RetroUfo() {
  return (
    <svg aria-hidden="true" className="street-v2-ufo-svg" viewBox="0 0 260 130">
      <ellipse cx="130" cy="107" rx="100" ry="12" fill="rgba(40,50,48,.18)" />
      <path
        d="M91 55 Q94 12 130 12 Q166 12 170 55"
        fill="#a7d5d1"
        stroke="#3e4c4e"
        strokeWidth="6"
      />
      <path
        d="M28 65 Q130 31 232 65 Q219 105 130 106 Q41 105 28 65Z"
        fill="#82959a"
        stroke="#3e4c4e"
        strokeWidth="6"
      />
      <path d="M52 76 Q130 101 208 76" fill="none" stroke="#64767b" strokeWidth="8" />
      {[58, 94, 130, 166, 202].map((x) => (
        <circle key={x} cx={x} cy="76" r="7" fill="#f0ca58" stroke="#534b3e" strokeWidth="3" />
      ))}
      <rect x="115" y="42" width="30" height="12" rx="6" fill="#425c5f" opacity=".75" />
    </svg>
  );
}

function RetroBus() {
  return (
    <svg aria-hidden="true" viewBox="0 0 290 100">
      <path
        d="M16 28 Q20 12 44 10 H242 Q266 11 276 37 V76 H16Z"
        fill="#61a293"
        stroke="#3f4e4c"
        strokeWidth="5"
      />
      <rect x="38" y="20" width="190" height="31" rx="5" fill="#b9d9d5" />
      {[48, 88, 128, 168, 208].map((x) => (
        <path key={x} d={"M" + x + " 20 V51"} stroke="#536b6b" strokeWidth="4" />
      ))}
      <rect x="35" y="58" width="210" height="11" rx="4" fill="#e4c35e" />
      <circle cx="66" cy="80" r="16" fill="#41413f" />
      <circle cx="225" cy="80" r="16" fill="#41413f" />
      <circle cx="66" cy="80" r="7" fill="#a6aaa6" />
      <circle cx="225" cy="80" r="7" fill="#a6aaa6" />
      <rect x="238" y="21" width="26" height="19" rx="4" fill="#fff0a7" />
      <text x="251" y="35" textAnchor="middle" fontSize="12" fontWeight="800" fill="#514737">
        08
      </text>
    </svg>
  );
}

function StreetBackdrop() {
  const stores = [
    ["TẠP HÓA", "#d88758"],
    ["CƠM TẤM", "#e3ba62"],
    ["TRÀ ĐÁ", "#6e9a86"],
    ["TIỆM NET", "#65889f"],
    ["BÁNH MÌ", "#c76151"],
    ["HỚT TÓC", "#819d69"],
  ];

  return (
    <div className="street-v2-world" aria-hidden="true">
      <div className="street-v2-sky">
        <div className="street-v2-cloud cloud-one" />
        <div className="street-v2-cloud cloud-two" />
        <div className="street-v2-skyline">
          {Array.from({ length: 14 }, (_, index) => (
            <i
              key={index}
              style={{
                height: 48 + ((index * 37) % 92) + "px",
                background:
                  ["#a3b5b0", "#9aa9b6", "#c3b19b", "#9caf9e"][index % 4],
              }}
            />
          ))}
        </div>
      </div>

      <div className="street-v2-wires wire-a" />
      <div className="street-v2-wires wire-b" />

      <div className="street-v2-store-row">
        {stores.map(([label, color], index) => (
          <div
            className="street-v2-store"
            key={label}
            style={{ "--store-color": color } as CSSProperties}
          >
            <div className="street-v2-store-floor">
              <i /><i /><i />
            </div>
            <div className="street-v2-awning" />
            <div className="street-v2-sign">{label}</div>
            <div className="street-v2-door" />
            <div className="street-v2-window" />
            {index === 2 && <div className="street-v2-stool">▰</div>}
          </div>
        ))}
      </div>

      <div className="street-v2-tree tree-one"><i /><span /></div>
      <div className="street-v2-tree tree-two"><i /><span /></div>
      <div className="street-v2-tree tree-three"><i /><span /></div>

      <div className="street-v2-sidewalk">
        <div className="street-v2-wall-note note-one">KHU PHỐ 01</div>
        <div className="street-v2-wall-note note-two">GIỮ GÌN VỆ SINH</div>
        <div className="street-v2-bus-stop">
          <b>TRẠM</b>
          <span>XE BUÝT</span>
        </div>
        <div className="street-v2-bench"><i /><i /><span /></div>
      </div>

      <div className="street-v2-road">
        <div className="street-v2-road-dash" />
      </div>

      <div className="street-v2-curb" />
    </div>
  );
}

function EventOverlay({ event }: { event: StreetEvent }) {
  return (
    <div className={"street-v2-event event-" + event.kind}>
      <div className="street-v2-event-toast">
        <small>SỰ KIỆN KHU PHỐ</small>
        <b>{event.title}</b>
        <span>{event.subtitle}</span>
      </div>

      {event.kind === "bus" && (
        <div className="street-v2-event-bus"><RetroBus /></div>
      )}

      {event.kind === "icecream" && (
        <div className="street-v2-event-cart">
          <div className="street-v2-cart-roof" />
          <div className="street-v2-cart-body">
            <b>XE KEM</b>
            <small>leng keng</small>
          </div>
          <i /><i />
          <span>♪</span>
        </div>
      )}

      {event.kind === "vendor" && (
        <div className="street-v2-event-vendor">
          <div className="street-v2-vendor-person" />
          <div className="street-v2-vendor-cart"><b>BÁNH BAO</b><i /><i /></div>
          <span>Bánh bao nóng đây!</span>
        </div>
      )}

      {event.kind === "rain" && (
        <div className="street-v2-rain">
          {Array.from({ length: 32 }, (_, index) => (
            <i
              key={index}
              style={{
                left: ((index * 31) % 101) + "%",
                animationDelay: -((index % 10) * 0.08) + "s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SetupCard({
  draft,
  setDraft,
  drawCount,
  setDrawCount,
  noRepeat,
  setNoRepeat,
  beginGame,
  error,
}: {
  draft: string;
  setDraft: (value: string) => void;
  drawCount: number;
  setDrawCount: (value: number) => void;
  noRepeat: boolean;
  setNoRepeat: (value: boolean) => void;
  beginGame: () => void;
  error: string;
}) {
  const previewCount = parseNames(draft).length;

  return (
    <main className="street-v2-setup" lang="vi">
      <Link className="game-back-link" href="/">← Game Hub</Link>
      <section className="street-v2-setup-card">
        <div className="street-v2-setup-visual">
          <StreetBackdrop />
          <div className="street-v2-setup-copy">
            <p>ROBO LUNIX · RANDOM NAME</p>
            <h1>Khu Phố Gọi Tên</h1>
            <span>
              Một khu phố Việt Nam 2D lấy cảm hứng từ webgame đời cũ. Kết quả
              được random trước; UFO chỉ làm nhiệm vụ công bố.
            </span>
          </div>
          <div className="street-v2-setup-ufo"><RetroUfo /></div>
        </div>

        <div className="street-v2-form">
          <div className="street-v2-form-title">
            <div>
              <small>DANH SÁCH LỚP</small>
              <b>Ai đang ở trong khu phố?</b>
            </div>
            <strong>{previewCount}</strong>
          </div>

          <textarea
            onChange={(event) => setDraft(event.target.value)}
            placeholder={"[Học sinh 1]\n[Học sinh 2]\n[Học sinh 3]\n..."}
            value={draft}
          />

          <div className="street-v2-form-options">
            <label>
              <span>Số bạn mỗi lượt</span>
              <select
                value={drawCount}
                onChange={(event) => setDrawCount(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5].map((count) => (
                  <option key={count} value={count}>{count} bạn</option>
                ))}
              </select>
            </label>

            <label className="street-v2-checkbox">
              <input
                checked={noRepeat}
                onChange={(event) => setNoRepeat(event.target.checked)}
                type="checkbox"
              />
              <span>Không lặp tên</span>
            </label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button className="street-v2-enter" onClick={beginGame} type="button">
            <span>VÀO KHU PHỐ</span>
            <b>→</b>
          </button>
        </div>
      </section>
    </main>
  );
}

export function StreetRandomGame() {
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

        if (now >= agent.nextTurnAt && Math.random() < 0.27) {
          agent.direction = agent.direction === 1 ? -1 : 1;
          agent.nextTurnAt = now + 2600 + Math.random() * 5200;
        }

        agent.x += agent.direction * agent.speed * dt;

        if (agent.x <= 2.5) {
          agent.x = 2.5;
          agent.direction = 1;
        } else if (agent.x >= 96) {
          agent.x = 96;
          agent.direction = -1;
        }

        const elementTop = 63 + agent.lane * 5.1;
        element.style.left = agent.x + "%";
        element.style.top = elementTop + "%";
        element.dataset.direction = String(agent.direction);
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
        }, 5000);
      }, 9000 + Math.random() * 7000);
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

  const crowdScale = useMemo(() => {
    if (names.length >= 42) return 0.72;
    if (names.length >= 28) return 0.82;
    if (names.length >= 18) return 0.9;
    return 1;
  }, [names.length]);

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
    setUfoVisible(false);
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
      setBeams([{ index, x: agent.x }]);
      if (!muted) cue("beam");

      await sleep(720);
      if (roundTokenRef.current !== token) return;

      captured.push(index);
      setAbducted((current) => [...current, index]);

      await sleep(450);
      if (roundTokenRef.current !== token) return;
    }

    setBeams([]);
    await sleep(520);
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
  }, []);

  const resetCycle = useCallback(() => {
    calledRef.current = [];
    setCalled([]);
    continueRound();
  }, [continueRound]);

  if (!started) {
    return (
      <SetupCard
        beginGame={beginGame}
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
    <main
      className="street-v2-game"
      lang="vi"
      style={{ "--crowd-scale": crowdScale } as CSSProperties}
    >
      <StreetBackdrop />

      <div className="street-v2-hud">
        <div className="street-v2-zone-badge">
          <small>ROBO LUNIX · KHU PHỐ</small>
          <strong>01</strong>
        </div>

        <div className="street-v2-status">
          <div>
            <small>HỌC SINH</small>
            <b>{names.length}</b>
          </div>
          <div>
            <small>CHƯA GỌI</small>
            <b>{noRepeat ? remainingCount : "∞"}</b>
          </div>
          <div>
            <small>LƯỢT</small>
            <b>{round}</b>
          </div>
        </div>

        <div className="street-v2-actions">
          <button onClick={() => setMuted((value) => !value)} type="button">
            {muted ? "TẮT ÂM" : "ÂM THANH"}
          </button>
          {noRepeat && (
            <button disabled={drawing} onClick={resetCycle} type="button">
              RESET LƯỢT
            </button>
          )}
          <button disabled={drawing} onClick={() => setStarted(false)} type="button">
            SỬA DS
          </button>
          <Link href="/">THOÁT</Link>
        </div>
      </div>

      <div className="street-v2-characters">
        {names.map((name, index) => {
          const variant = stringHash(name + ":" + index);
          const wasCalled = noRepeat && called.includes(index);
          const isAbducted = abducted.includes(index);

          return (
            <div
              className={[
                "street-v2-student",
                wasCalled ? "was-called" : "",
                isAbducted ? "is-abducted" : "",
              ].filter(Boolean).join(" ")}
              data-direction="1"
              key={index}
              ref={(element) => {
                if (element) characterRefs.current.set(index, element);
                else characterRefs.current.delete(index);
              }}
            >
              <span className="street-v2-name">{name}</span>
              <div className="street-v2-sprite">
                <RetroStudent variant={variant} />
              </div>
              {wasCalled && <small>ĐÃ GỌI</small>}
            </div>
          );
        })}
      </div>

      <div className="street-v2-npc npc-food">
        <div className="street-v2-npc-bubble">Bánh mì nóng đây!</div>
        <RetroStudent variant={104} />
        <div className="street-v2-npc-cart"><b>BÁNH MÌ</b><i /><i /></div>
      </div>

      <div className="street-v2-npc npc-recycle">
        <div className="street-v2-npc-bubble">Ai ve chai hông?</div>
        <RetroStudent variant={218} />
        <div className="street-v2-npc-cart recycle"><b>VE CHAI</b><i /><i /></div>
      </div>

      {streetEvent && <EventOverlay event={streetEvent} />}

      {ufoVisible && (
        <div className={"street-v2-ufo " + (drawing ? "active" : "")}>
          <RetroUfo />
          <small>RL-26</small>
        </div>
      )}

      {beams.map((beam) => (
        <div
          className="street-v2-beam"
          key={beam.index + "-" + round}
          style={{ left: "calc(" + beam.x + "% - 75px)" }}
        >
          <i />
        </div>
      ))}

      {drawing && (
        <div className="street-v2-draw-notice" key={round}>
          <small>UFO ĐANG QUÉT KHU PHỐ</small>
          <strong>AI SẼ LÊN BẢNG?</strong>
        </div>
      )}

      <div className="street-v2-control-panel">
        <div>
          <small>RANDOM ENGINE</small>
          <span>
            Kết quả được chọn trước animation · {drawCount} bạn/lượt
          </span>
        </div>
        <button
          disabled={drawing || Boolean(winners.length)}
          onClick={startDraw}
          type="button"
        >
          <i />
          <span>{drawing ? "ĐANG QUÉT..." : "GỌI TÊN"}</span>
        </button>
      </div>

      {winners.length > 0 && (
        <div className="street-v2-result-overlay">
          <section className="street-v2-result" role="dialog" aria-modal="true">
            <header>
              <div>
                <small>THÔNG BÁO KHU PHỐ 01</small>
                <h2>Mời các bạn lên bảng trả bài</h2>
              </div>
              <b>ĐÃ CHỌN</b>
            </header>

            <div className="street-v2-result-list">
              {winners.map((winner, index) => (
                <article key={winner.index}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <RetroStudent variant={stringHash(winner.name + ":" + winner.index)} />
                  </div>
                  <strong>{winner.name}</strong>
                </article>
              ))}
            </div>

            <footer>
              <span>Random công bằng · không phụ thuộc vị trí nhân vật</span>
              <button onClick={continueRound} type="button">TIẾP TỤC</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
