"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gameScreens, roundMeta, type QuestionScreen } from "@/data/game-data";
import { Scoreboard, type Team } from "@/components/Scoreboard";

const STORAGE_KEY = "cyber-city-bai-2:v1";

const DEFAULT_TEAMS: Team[] = [
  { id: 1, name: "Đội Neon", score: 0, color: "#00e5ff", boostUsed: false, boostArmed: false },
  { id: 2, name: "Đội Photon", score: 0, color: "#ff4fd8", boostUsed: false, boostArmed: false },
  { id: 3, name: "Đội Quantum", score: 0, color: "#ffd166", boostUsed: false, boostArmed: false },
  { id: 4, name: "Đội Vector", score: 0, color: "#8cff66", boostUsed: false, boostArmed: false },
];

type PersistedState = {
  version: 1;
  screenIndex: number;
  teams: Team[];
};

function tone(frequency: number, duration = 0.12) {
  const AudioContextClass = window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.08, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
  oscillator.addEventListener("ended", () => context.close());
}

function clampScreen(value: number) {
  return Math.min(Math.max(value, 0), gameScreens.length - 1);
}

export function GameApp() {
  const [screenIndex, setScreenIndex] = useState(0);
  const [teams, setTeams] = useState<Team[]>(DEFAULT_TEAMS);
  const [revealed, setRevealed] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const screen = gameScreens[screenIndex];
  const initialTime = screen.kind === "question" || screen.kind === "boss" ? screen.time : 0;
  const [seconds, setSeconds] = useState(initialTime);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored = JSON.parse(raw) as PersistedState;
        if (stored.version === 1 && Array.isArray(stored.teams)) {
          setScreenIndex(clampScreen(stored.screenIndex));
          setTeams(stored.teams);
        }
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = { version: 1, screenIndex, teams };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, screenIndex, teams]);

  useEffect(() => {
    setRunning(false);
    setRevealed(false);
    setSelectedOption(null);
    setSeconds(initialTime);
  }, [screenIndex, initialTime]);

  useEffect(() => {
    if (!running || seconds <= 0) return;
    intervalRef.current = setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          setRunning(false);
          if (!muted) tone(170, 0.45);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [muted, running, seconds]);

  const goNext = useCallback(() => {
    setScreenIndex((value) => clampScreen(value + 1));
  }, []);

  const goBack = useCallback(() => {
    setScreenIndex((value) => clampScreen(value - 1));
  }, []);

  const reveal = useCallback(() => {
    setRevealed(true);
    setRunning(false);
    if (!muted) {
      tone(520);
      window.setTimeout(() => tone(760), 120);
    }
  }, [muted]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key === "ArrowRight") goNext();
      if (event.key === "ArrowLeft") goBack();
      if (event.key.toLowerCase() === "a" && (screen.kind === "question" || screen.kind === "boss")) reveal();
      if (event.key === "Escape") setShowHelp(false);
      if (event.code === "Space" && (screen.kind === "question" || screen.kind === "boss")) {
        event.preventDefault();
        if (seconds > 0) setRunning((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goBack, goNext, reveal, screen.kind, seconds]);

  const progress = Math.round(((screenIndex + 1) / gameScreens.length) * 100);

  const completedRounds = useMemo(() => {
    const completed = new Set<number>();
    for (const meta of roundMeta) {
      const lastIndex = gameScreens.reduce(
        (latest, item, index) => ("round" in item && item.round === meta.round ? index : latest),
        -1,
      );
      if (screenIndex > lastIndex) completed.add(meta.round);
    }
    return completed;
  }, [screenIndex]);

  const rankedTeams = useMemo(
    () => [...teams].sort((first, second) => second.score - first.score || first.id - second.id),
    [teams],
  );

  const updateScore = useCallback((teamId: number, delta: number) => {
    setTeams((current) =>
      current.map((team) => {
        if (team.id !== teamId) return team;
        const multiplier = delta > 0 && team.boostArmed ? 2 : 1;
        return {
          ...team,
          score: Math.max(0, team.score + delta * multiplier),
          boostArmed: delta > 0 ? false : team.boostArmed,
          boostUsed: delta > 0 && team.boostArmed ? true : team.boostUsed,
        };
      }),
    );
    if (!muted) tone(delta > 0 ? 660 : 220);
  }, [muted]);

  const renameTeam = useCallback((teamId: number, name: string) => {
    setTeams((current) => current.map((team) => (team.id === teamId ? { ...team, name } : team)));
  }, []);

  const toggleBoost = useCallback((teamId: number) => {
    setTeams((current) =>
      current.map((team) => {
        if (team.id !== teamId || team.boostUsed) return team;
        return { ...team, boostArmed: !team.boostArmed };
      }),
    );
  }, []);

  const resetGame = useCallback(() => {
    if (!window.confirm("Bắt đầu lại sẽ xóa toàn bộ điểm và tiến trình hiện tại. Tiếp tục?")) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setScreenIndex(0);
    setTeams(DEFAULT_TEAMS);
    setRevealed(false);
    setSelectedOption(null);
    setRunning(false);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      setShowHelp(true);
    }
  }, []);

  const toggleTimer = useCallback(() => {
    if (seconds === 0) setSeconds(initialTime);
    setRunning((value) => !value);
    if (!muted) tone(440, 0.08);
  }, [initialTime, muted, seconds]);

  const resetTimer = useCallback(() => {
    setRunning(false);
    setSeconds(initialTime);
  }, [initialTime]);

  if (!hydrated) {
    return <main className="loading-screen">Đang nạp Cyber City...</main>;
  }

  return (
    <main className="game-shell">
      <div className="cyber-grid" aria-hidden="true" />

      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">CC</div>
          <div>
            <strong>Đại chiến Cyber City 4.0</strong>
            <span>Tin học 10 · Bài 2</span>
          </div>
        </div>

        <div className="key-track" aria-label="Tiến độ thu thập chìa khóa">
          {roundMeta.map((meta) => (
            <div className={`key-chip ${completedRounds.has(meta.round) ? "unlocked" : ""}`} key={meta.keyName}>
              <span>{completedRounds.has(meta.round) ? "✓" : meta.round}</span>
              {meta.keyName}
            </div>
          ))}
        </div>

        <div className="utility-actions">
          <button type="button" onClick={() => setMuted((value) => !value)} aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"}>
            {muted ? "Âm tắt" : "Có âm"}
          </button>
          <button type="button" onClick={() => setShowHelp(true)}>Phím tắt</button>
          <button type="button" onClick={toggleFullscreen}>Toàn màn hình</button>
          <button type="button" className="danger-ghost" onClick={resetGame}>Chơi lại</button>
        </div>
      </header>

      <div className="progress-track" aria-label={`Tiến độ ${progress}%`}>
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="game-layout">
        <section className="stage" aria-live="polite">
          {screen.kind === "round" ? (
            <div className="round-screen screen-enter">
              <div className="round-orbit" aria-hidden="true">
                <span>{screen.round}</span>
              </div>
              <p className="eyebrow">Vòng {screen.round} · Chìa khóa {screen.keyName}</p>
              <h1>{screen.title}</h1>
              <h2>{screen.subtitle}</h2>
              <p className="round-mission">{screen.mission}</p>
              <button type="button" className="primary-cta" onClick={goNext}>Bắt đầu vòng {screen.round}</button>
            </div>
          ) : null}

          {screen.kind === "question" ? (
            <QuestionView
              screen={screen}
              revealed={revealed}
              selectedOption={selectedOption}
              onSelect={setSelectedOption}
            />
          ) : null}

          {screen.kind === "boss" ? (
            <div className="boss-screen screen-enter">
              <div className="boss-badge">BOSS CUỐI</div>
              <h1>{screen.title}</h1>
              <p className="boss-prompt">{screen.prompt}</p>
              <div className="boss-grid">
                <div>
                  <h3>Nhiệm vụ 90 giây</h3>
                  <ol>
                    {screen.requirements.map((item) => <li key={item}>{item}</li>)}
                  </ol>
                </div>
                <div className={`solution-panel ${revealed ? "visible" : ""}`}>
                  <h3>{revealed ? "Phương án tham khảo" : "Phương án đang được mã hóa"}</h3>
                  {revealed ? (
                    <ul>{screen.answer.map((item) => <li key={item}>{item}</li>)}</ul>
                  ) : (
                    <div className="encrypted-lines" aria-hidden="true"><span /><span /><span /><span /></div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {screen.kind === "results" ? (
            <div className="results-screen screen-enter">
              <p className="eyebrow">Nhiệm vụ hoàn tất</p>
              <h1>{screen.title}</h1>
              <div className="winner-card" style={{ "--team-color": rankedTeams[0].color } as React.CSSProperties}>
                <span>Nhà vô địch</span>
                <strong>{rankedTeams[0].name}</strong>
                <b>{rankedTeams[0].score} điểm</b>
              </div>
              <div className="knowledge-locks">
                <span>SMART · Thiết bị xử lí và thích ứng</span>
                <span>AI · Tự động không đồng nghĩa trí tuệ</span>
                <span>IMPACT · Tin học thay đổi xã hội</span>
                <span>CORE · Nền tảng tạo nên thế giới số</span>
              </div>
              <button type="button" className="primary-cta" onClick={resetGame}>Mở trận đấu mới</button>
            </div>
          ) : null}

          {(screen.kind === "question" || screen.kind === "boss") ? (
            <div className="timer-dock">
              <div className={`timer-ring ${seconds <= 5 ? "urgent" : ""}`} style={{ "--timer-progress": `${initialTime ? (seconds / initialTime) * 360 : 0}deg` } as React.CSSProperties}>
                <strong>{seconds}</strong>
                <span>giây</span>
              </div>
              <button type="button" onClick={toggleTimer}>{running ? "Tạm dừng" : seconds === 0 ? "Chạy lại" : "Bắt đầu giờ"}</button>
              <button type="button" className="ghost" onClick={resetTimer}>Đặt lại</button>
            </div>
          ) : null}

          <nav className="game-nav" aria-label="Điều khiển màn chơi">
            <button type="button" onClick={goBack} disabled={screenIndex === 0}>← Quay lại</button>
            <span>{screenIndex + 1} / {gameScreens.length}</span>
            {(screen.kind === "question" || screen.kind === "boss") && !revealed ? (
              <button type="button" className="reveal-button" onClick={reveal}>Mở đáp án</button>
            ) : null}
            <button type="button" onClick={goNext} disabled={screenIndex === gameScreens.length - 1}>Tiếp theo →</button>
          </nav>
        </section>

        <Scoreboard teams={rankedTeams} onRename={renameTeam} onScore={updateScore} onToggleBoost={toggleBoost} />
      </div>

      {showHelp ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setShowHelp(false)}>
          <section className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setShowHelp(false)} aria-label="Đóng">×</button>
            <p className="eyebrow">Điều khiển nhanh</p>
            <h2 id="help-title">Phím tắt dành cho giáo viên</h2>
            <dl>
              <div><dt>Space</dt><dd>Bắt đầu hoặc tạm dừng đồng hồ</dd></div>
              <div><dt>A</dt><dd>Mở đáp án và phần giải thích</dd></div>
              <div><dt>→</dt><dd>Chuyển sang màn tiếp theo</dd></div>
              <div><dt>←</dt><dd>Quay lại màn trước</dd></div>
            </dl>
            <p>Điểm và tiến trình được lưu tự động trên trình duyệt này.</p>
          </section>
        </div>
      ) : null}
    </main>
  );
}

type QuestionViewProps = {
  screen: QuestionScreen;
  revealed: boolean;
  selectedOption: string | null;
  onSelect: (id: string) => void;
};

function QuestionView({ screen, revealed, selectedOption, onSelect }: QuestionViewProps) {
  return (
    <div className="question-screen screen-enter">
      <div className="question-meta">
        <span>Vòng {screen.round}</span>
        <span>{screen.category}</span>
        <span>10 điểm + 5 điểm giải thích</span>
      </div>
      <h1>{screen.title}</h1>
      <p className="question-prompt">{screen.prompt}</p>

      <div className="option-grid">
        {screen.options.map((option) => {
          const isCorrect = screen.correct.includes(option.id);
          const isSelected = selectedOption === option.id;
          const stateClass = revealed
            ? isCorrect ? "correct" : isSelected ? "wrong" : "dimmed"
            : isSelected ? "selected" : "";
          return (
            <button
              type="button"
              className={`option-card ${stateClass}`}
              key={option.id}
              onClick={() => !revealed && onSelect(option.id)}
              aria-pressed={isSelected}
            >
              <b>{option.id}</b>
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>

      <div className={`answer-panel ${revealed ? "visible" : ""}`}>
        {revealed ? (
          <>
            <strong>{screen.answer}</strong>
            <p>{screen.explanation}</p>
          </>
        ) : (
          <span>Chọn một phương án để khóa đáp án đại diện, sau đó giáo viên mở lời giải.</span>
        )}
      </div>
    </div>
  );
}
