"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "lunix-random-name-class";

const FUNNY_LINES = [
  "Ủa thầy/cô bịt mắt thiệt không vậy? 😭",
  "Em đã cố hòa vào đám đông nhưng bất thành!",
  "Kế hoạch đào tẩu chính thức phá sản.",
  "Yêu cầu VAR! Em nghi có gian lận!",
  "Chạy hết công suất rồi mà vẫn bị tóm. 🥲",
  "Đồng đội đâu? Sao bỏ tôi lại vậy?",
  "NPC này vừa bị giáo viên phát hiện.",
  "Em nghĩ chúng ta nên thương lượng...",
  "Một phút mặc niệm cho chiến thuật vừa rồi.",
  "Báo động đỏ! Em đã bị bắt sống!",
  "Tưởng thoát rồi, ai ngờ thầy/cô cao tay hơn.",
  "Xin tha, em còn bài tập chưa làm!",
  "Thầy/cô nghe tiếng bước chân của em hả?",
  "Em đứng im mà cũng không thoát được!",
  "Không thể tin được! Em là người được chọn.",
];

type CaughtStudent = {
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

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return Math.abs(result >>> 0);
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function playTone(kind: "start" | "caught") {
  try {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = kind === "caught" ? "square" : "sine";
    oscillator.frequency.setValueAtTime(kind === "caught" ? 180 : 380, audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "caught" ? 90 : 760, audio.currentTime + 0.28);
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.32);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.34);
    oscillator.addEventListener("ended", () => void audio.close());
  } catch {
    // Trình duyệt có thể chặn AudioContext trước lần tương tác đầu tiên.
  }
}

function drawVoxelPerson(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  label: string,
  teacher = false,
  highlight = false,
) {
  context.save();
  context.translate(x, y);

  if (highlight) {
    context.beginPath();
    context.arc(0, 0, size * 2.2, 0, Math.PI * 2);
    context.fillStyle = "rgba(255, 206, 69, .33)";
    context.fill();
    context.lineWidth = Math.max(2, size * 0.15);
    context.strokeStyle = "#ffce45";
    context.stroke();
  }

  const outline = "#17152b";
  context.lineWidth = Math.max(1.2, size * 0.12);
  context.strokeStyle = outline;

  context.fillStyle = teacher ? "#f4caa5" : "#f1bd91";
  context.fillRect(-size * 0.52, -size * 1.52, size * 1.04, size * 0.92);
  context.strokeRect(-size * 0.52, -size * 1.52, size * 1.04, size * 0.92);

  context.fillStyle = color;
  context.fillRect(-size * 0.62, -size * 0.58, size * 1.24, size * 1.08);
  context.strokeRect(-size * 0.62, -size * 0.58, size * 1.24, size * 1.08);

  context.fillStyle = color;
  context.fillRect(-size * 0.95, -size * 0.48, size * 0.3, size * 0.92);
  context.fillRect(size * 0.65, -size * 0.48, size * 0.3, size * 0.92);
  context.strokeRect(-size * 0.95, -size * 0.48, size * 0.3, size * 0.92);
  context.strokeRect(size * 0.65, -size * 0.48, size * 0.3, size * 0.92);

  context.fillStyle = "#384056";
  context.fillRect(-size * 0.5, size * 0.54, size * 0.42, size * 0.8);
  context.fillRect(size * 0.08, size * 0.54, size * 0.42, size * 0.8);
  context.strokeRect(-size * 0.5, size * 0.54, size * 0.42, size * 0.8);
  context.strokeRect(size * 0.08, size * 0.54, size * 0.42, size * 0.8);

  context.fillStyle = outline;
  if (teacher) {
    context.fillRect(-size * 0.55, -size * 1.28, size * 1.1, size * 0.24);
    context.fillStyle = "#ff5d52";
    context.fillRect(size * 0.45, -size * 1.23, size * 0.72, size * 0.11);
  } else {
    context.fillRect(-size * 0.28, -size * 1.2, size * 0.12, size * 0.12);
    context.fillRect(size * 0.16, -size * 1.2, size * 0.12, size * 0.12);
  }

  const fontSize = Math.max(8, Math.min(13, size * 0.9));
  context.font = "800 " + fontSize + "px Inter, system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  const metrics = context.measureText(label);
  const labelWidth = Math.min(metrics.width + 12, size * 7.2);
  const labelY = -size * 2.15;
  roundedRect(context, -labelWidth / 2, labelY - fontSize * 0.8, labelWidth, fontSize * 1.6, 6);
  context.fillStyle = teacher ? "#17152b" : "rgba(255,255,255,.94)";
  context.fill();
  context.fillStyle = teacher ? "#fff" : "#17152b";
  const displayLabel = metrics.width + 12 > labelWidth && label.length > 9 ? label.slice(0, 8) + "…" : label;
  context.fillText(displayLabel, 0, labelY);

  context.restore();
}

export function RandomNameGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const huntStartedAt = useRef(0);
  const huntTimer = useRef<number | null>(null);
  const [draft, setDraft] = useState("");
  const [names, setNames] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [hunting, setHunting] = useState(false);
  const [targetIndex, setTargetIndex] = useState<number | null>(null);
  const [caught, setCaught] = useState<CaughtStudent | null>(null);
  const [caughtIndexes, setCaughtIndexes] = useState<number[]>([]);
  const [noRepeat, setNoRepeat] = useState(true);
  const [muted, setMuted] = useState(false);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const saved = JSON.parse(stored) as string[];
      if (Array.isArray(saved)) {
        const clean = saved.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim());
        setDraft(clean.join("\n"));
      }
    } catch {
      // Bỏ qua dữ liệu localStorage hỏng.
    }
  }, []);

  useEffect(() => () => {
    if (huntTimer.current) window.clearTimeout(huntTimer.current);
  }, []);

  const studentPalette = useMemo(
    () => names.map((name, index) => {
      const hue = (hash(name + ":" + index) + index * 47) % 360;
      return "hsl(" + hue + " 72% 62%)";
    }),
    [names],
  );

  const beginGame = useCallback(() => {
    const parsed = parseNames(draft);
    if (parsed.length === 0) {
      setError("Hãy nhập ít nhất một tên học sinh.");
      return;
    }
    setError("");
    setNames(parsed);
    setCaught(null);
    setCaughtIndexes([]);
    setTargetIndex(null);
    setStarted(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    } catch {
      // Game vẫn chạy nếu trình duyệt chặn localStorage.
    }
  }, [draft]);

  const startHunt = useCallback(() => {
    if (hunting || names.length === 0) return;

    let candidates = names.map((_, index) => index);
    if (noRepeat) {
      candidates = candidates.filter((index) => !caughtIndexes.includes(index));
      if (candidates.length === 0) {
        setCaughtIndexes([]);
        candidates = names.map((_, index) => index);
      }
    }

    const selectedIndex = candidates[Math.floor(Math.random() * candidates.length)];
    setCaught(null);
    setTargetIndex(selectedIndex);
    setHunting(true);
    huntStartedAt.current = performance.now();
    if (!muted) playTone("start");

    if (huntTimer.current) window.clearTimeout(huntTimer.current);
    huntTimer.current = window.setTimeout(() => {
      const quote = FUNNY_LINES[Math.floor(Math.random() * FUNNY_LINES.length)];
      setHunting(false);
      setCaught({ index: selectedIndex, name: names[selectedIndex], quote });
      if (noRepeat) setCaughtIndexes((current) => current.includes(selectedIndex) ? current : [...current, selectedIndex]);
      if (!muted) playTone("caught");
    }, 3400);
  }, [caughtIndexes, hunting, muted, names, noRepeat]);

  const restoreCaught = useCallback(() => {
    if (!caught) return;
    setCaughtIndexes((current) => current.filter((index) => index !== caught.index));
    setCaught(null);
    setTargetIndex(null);
  }, [caught]);

  const closeCaught = useCallback(() => {
    setCaught(null);
    setTargetIndex(null);
  }, []);

  useEffect(() => {
    if (!started) return;
    const canvas = canvasRef.current;
    const arena = arenaRef.current;
    if (!canvas || !arena) return;

    let animation = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const resize = () => {
      const rect = arena.getBoundingClientRect();
      width = Math.max(320, rect.width);
      height = Math.max(420, rect.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
    };

    const observer = new ResizeObserver(resize);
    observer.observe(arena);
    resize();

    const render = (time: number) => {
      const context = canvas.getContext("2d");
      if (!context) return;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2 + 12;
      const arenaRadius = Math.max(120, Math.min(width, height) * 0.42);

      const background = context.createRadialGradient(centerX, centerY, arenaRadius * 0.1, centerX, centerY, arenaRadius * 1.15);
      background.addColorStop(0, "#ffdd75");
      background.addColorStop(0.72, "#f9a849");
      background.addColorStop(1, "#e8762e");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      context.beginPath();
      context.arc(centerX, centerY, arenaRadius, 0, Math.PI * 2);
      context.fillStyle = "rgba(255, 223, 135, .74)";
      context.fill();
      context.lineWidth = Math.max(5, arenaRadius * 0.025);
      context.strokeStyle = "#17152b";
      context.stroke();

      context.setLineDash([7, 9]);
      context.lineWidth = 2;
      context.strokeStyle = "rgba(23,21,43,.2)";
      context.beginPath();
      context.arc(centerX, centerY, arenaRadius * 0.43, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);

      const count = names.length;
      const rings = Math.max(1, Math.ceil(count / 28));
      const avatarSize = Math.max(6, Math.min(15, 118 / Math.sqrt(Math.max(1, count)) + 3));
      const positions: Array<{ x: number; y: number }> = [];

      for (let index = 0; index < count; index += 1) {
        const ring = index % rings;
        const itemsInRing = Math.ceil((count - ring) / rings);
        const positionInRing = Math.floor(index / rings);
        const baseAngle = (positionInRing / Math.max(1, itemsInRing)) * Math.PI * 2;
        const personal = (hash(names[index] + ":" + index + ":" + shuffleSeed) % 1000) / 1000;
        const direction = index % 2 === 0 ? 1 : -1;
        const speed = 0.00018 + personal * 0.00008;
        const motion = (started ? time : 0) * speed * direction;
        const laneFraction = rings === 1 ? 0.79 : 0.5 + (ring / Math.max(1, rings - 1)) * 0.43;
        const radius = arenaRadius * laneFraction;
        const angle = baseAngle + motion + personal * 0.35;
        positions.push({
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius,
        });
      }

      const sorted = positions.map((position, index) => ({ position, index })).sort((a, b) => a.position.y - b.position.y);
      for (const item of sorted) {
        const isCaught = caught?.index === item.index;
        drawVoxelPerson(
          context,
          item.position.x,
          item.position.y,
          avatarSize * (isCaught ? 1.18 : 1),
          studentPalette[item.index],
          names[item.index],
          false,
          isCaught,
        );
      }

      if (hunting && targetIndex !== null && positions[targetIndex]) {
        const target = positions[targetIndex];
        const huntAge = Math.max(0, time - huntStartedAt.current);
        const randomSpin = huntAge < 2400
          ? huntAge * 0.006
          : Math.atan2(target.y - centerY, target.x - centerX);
        context.save();
        context.translate(centerX, centerY);
        context.rotate(randomSpin);
        context.strokeStyle = "rgba(23,21,43,.45)";
        context.lineWidth = 4;
        context.setLineDash([10, 10]);
        context.beginPath();
        context.moveTo(25, 0);
        context.lineTo(Math.min(arenaRadius * 0.34, 100), 0);
        context.stroke();
        context.setLineDash([]);
        context.restore();
      }

      drawVoxelPerson(
        context,
        centerX,
        centerY,
        Math.max(21, Math.min(31, arenaRadius * 0.11)),
        "#7357ff",
        "GIÁO VIÊN",
        true,
        hunting,
      );

      if (hunting) {
        const age = time - huntStartedAt.current;
        const message = age < 1100 ? "BỊT MẮT..." : age < 2400 ? "NGHE TIẾNG BƯỚC CHÂN..." : "BẮT!";
        context.save();
        context.font = "950 " + Math.max(20, Math.min(34, width * 0.035)) + "px Inter, system-ui, sans-serif";
        context.textAlign = "center";
        context.fillStyle = "#17152b";
        context.fillText(message, centerX, Math.max(42, centerY - arenaRadius - 28));
        context.restore();
      }

      animation = window.requestAnimationFrame(render);
    };

    animation = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animation);
      observer.disconnect();
    };
  }, [caught, hunting, names, shuffleSeed, started, studentPalette, targetIndex]);

  if (!started) {
    const previewCount = parseNames(draft).length;
    return (
      <main className="random-setup-shell">
        <Link className="game-back-link" href="/">← Game Hub</Link>
        <section className="random-setup-card">
          <div className="random-setup-copy">
            <p className="random-kicker">RANDOM NAME · BỊT MẮT BẮT DÊ</p>
            <h1>Cả lớp vào vòng tròn.<br /><em>Ai sẽ bị bắt?</em></h1>
            <p>
              Dán danh sách lớp từ Excel, Google Sheets hoặc nhập mỗi tên một dòng.
              Game không đặt giới hạn cứng số học sinh và dùng Canvas để lớp đông vẫn chạy nhẹ.
            </p>
            <div className="random-feature-row">
              <span>🙈 Giáo viên ở trung tâm</span>
              <span>🧱 Nhân vật voxel</span>
              <span>🎲 Chọn ngẫu nhiên công bằng</span>
            </div>
          </div>

          <div className="random-input-panel">
            <div className="random-input-heading">
              <div><b>Danh sách học sinh</b><span>Mỗi dòng một tên hoặc dán nguyên cột</span></div>
              <strong>{previewCount}</strong>
            </div>
            <textarea
              autoFocus
              onChange={(event) => setDraft(event.target.value)}
              placeholder={"Minh Triết\nGia Vỹ\nNhất Phi\nNgọc Anh\n..."}
              value={draft}
            />
            <label className="random-check">
              <input checked={noRepeat} onChange={(event) => setNoRepeat(event.target.checked)} type="checkbox" />
              <span><b>Không lặp tên</b><small>Mỗi học sinh chỉ bị bắt một lần cho đến khi hết lượt.</small></span>
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="random-start-button" onClick={beginGame} type="button">
              Vào đấu trường <span>→</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  const caughtCount = noRepeat ? caughtIndexes.length : 0;

  return (
    <main className="random-game-shell">
      <header className="random-game-topbar">
        <Link href="/">GAME HUB</Link>
        <div>
          <b>Random Name</b>
          <span>{names.length} học sinh {noRepeat ? "· " + caughtCount + " đã được gọi" : ""}</span>
        </div>
        <div className="random-top-actions">
          <button onClick={() => setMuted((current) => !current)} type="button">{muted ? "🔇" : "🔊"}</button>
          <button onClick={() => setShuffleSeed((value) => value + 1)} type="button">Trộn vị trí</button>
          <button onClick={() => setStarted(false)} type="button">Sửa danh sách</button>
        </div>
      </header>

      <section className="random-arena-wrap" ref={arenaRef}>
        <canvas aria-label="Đấu trường bịt mắt bắt dê" ref={canvasRef} />
        <div className="random-arena-controls">
          <button className="hunt-button" disabled={hunting || Boolean(caught)} onClick={startHunt} type="button">
            {hunting ? "ĐANG SĂN..." : "🙈 BẮT ĐẦU SĂN"}
          </button>
          {noRepeat && caughtIndexes.length >= names.length && names.length > 0 && (
            <button className="reset-random-button" onClick={() => setCaughtIndexes([])} type="button">Làm mới lượt gọi</button>
          )}
        </div>

        {caught && (
          <div className="caught-backdrop" role="dialog" aria-modal="true" aria-labelledby="caught-name">
            <div className="caught-card">
              <span className="caught-badge">💥 ĐÃ BỊ TÓM!</span>
              <h2 id="caught-name">{caught.name}</h2>
              <p>“{caught.quote}”</p>
              <div className="caught-actions">
                <button className="caught-primary" onClick={() => { closeCaught(); window.setTimeout(startHunt, 80); }} type="button">Bắt tiếp →</button>
                {noRepeat && <button onClick={restoreCaught} type="button">Cho lại lượt</button>}
                <button onClick={closeCaught} type="button">Đóng</button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
