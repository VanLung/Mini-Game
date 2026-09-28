"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANSWERS,
  POSE_LABELS,
  type DisplayTelemetry,
  type PoseQuestion,
  type TeacherCommand,
  loadPoseQuestions,
  poseChannelName,
} from "../lib/poseQuiz";

const EMPTY_TELEMETRY: DisplayTelemetry = {
  type: "telemetry",
  ready: false,
  phase: "booting",
  index: 0,
  cameraStatus: "Chưa kết nối",
  modelStatus: "Chưa kết nối",
  backend: "—",
  inferenceMs: null,
  poseAnswer: null,
  selected: null,
  isCorrect: null,
  secondsLeft: 0,
  score: 0,
  streak: 0,
};

function readSessionId() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("session") ?? "";
}

export function PoseQuizControl() {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<PoseQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [telemetry, setTelemetry] = useState<DisplayTelemetry>(EMPTY_TELEMETRY);
  const [channelError, setChannelError] = useState("");

  const currentQuestion = questions[currentIndex];

  const post = useCallback((command: TeacherCommand) => {
    if (!channelRef.current) return;
    channelRef.current.postMessage(command);
  }, []);

  useEffect(() => {
    const id = readSessionId();
    setSessionId(id);
    setQuestions(loadPoseQuestions());

    if (!id) {
      setChannelError("Thiếu mã phiên. Hãy mở Presenter Mode lại từ Question Studio.");
      return;
    }

    if (!("BroadcastChannel" in window)) {
      setChannelError("Trình duyệt này không hỗ trợ BroadcastChannel. Hãy dùng Chrome hoặc Edge mới.");
      return;
    }

    const channel = new BroadcastChannel(poseChannelName(id));
    channelRef.current = channel;
    channel.onmessage = (event: MessageEvent<DisplayTelemetry>) => {
      const message = event.data;
      if (!message || message.type !== "telemetry") return;
      setTelemetry(message);
    };

    const syncTimer = window.setInterval(() => {
      channel.postMessage({
        type: "sync",
        index: currentIndex,
        paused: false,
        sessionId: id,
      } satisfies TeacherCommand);
    }, 2500);

    return () => {
      window.clearInterval(syncTimer);
      channel.close();
      channelRef.current = null;
    };
  }, [currentIndex]);

  const openDisplay = () => {
    if (!sessionId) return;
    const display = window.open(
      "/pose-quiz/display?session=" + encodeURIComponent(sessionId),
      "pose-quiz-display-" + sessionId,
      "popup=yes,width=1280,height=800",
    );
    if (!display) {
      setChannelError("Pop-up đang bị chặn. Hãy cho phép pop-up cho website rồi thử lại.");
      return;
    }
    display.focus();
  };

  const selectQuestion = (index: number) => {
    setCurrentIndex(index);
    post({ type: "prepare", index });
  };

  const prepare = () => {
    post({ type: "prepare", index: currentIndex });
  };

  const start = () => {
    post({ type: "start", index: currentIndex });
  };

  const goPrevious = () => {
    const next = Math.max(0, currentIndex - 1);
    setCurrentIndex(next);
    post({ type: "prepare", index: next });
  };

  const goNext = () => {
    const next = Math.min(questions.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    post({ type: "prepare", index: next });
  };

  const skip = () => {
    const next = Math.min(questions.length - 1, currentIndex + 1);
    setCurrentIndex(next);
    post({ type: "prepare", index: next });
  };

  const resetSession = () => {
    setCurrentIndex(0);
    post({ type: "reset", index: 0 });
  };

  const endSession = () => {
    post({ type: "shutdown" });
    window.location.href = "/pose-quiz";
  };

  if (!questions.length) {
    return (
      <main className="pose-control-shell">
        <section className="pose-control-empty">
          <h1>Teacher Console</h1>
          <p>Chưa có bộ câu hỏi. Hãy quay lại Question Studio.</p>
          <Link href="/pose-quiz">Về Question Studio</Link>
        </section>
      </main>
    );
  }

  const displayConnected = telemetry.ready;

  return (
    <main className="pose-control-shell">
      <header className="pose-control-topbar">
        <div>
          <p>POSE QUIZ AI · TEACHER CONSOLE</p>
          <strong>Phiên {sessionId || "—"}</strong>
        </div>

        <div className="pose-control-connection">
          <span className={displayConnected ? "ok" : ""}>
            {displayConnected ? "● STUDENT DISPLAY ONLINE" : "○ CHỜ STUDENT DISPLAY"}
          </span>
          <span>{telemetry.backend.toUpperCase()}</span>
          {telemetry.inferenceMs !== null && <span>{telemetry.inferenceMs} ms</span>}
        </div>

        <div className="pose-control-top-actions">
          <button onClick={openDisplay} type="button">Mở/Focus TV</button>
          <button onClick={endSession} type="button">Kết thúc phiên</button>
        </div>
      </header>

      <section className="pose-control-layout">
        <aside className="pose-control-question-list">
          <div className="pose-control-list-heading">
            <b>Bộ câu hỏi</b>
            <span>{questions.length} câu</span>
          </div>
          {questions.map((question, index) => (
            <button
              className={[
                index === currentIndex ? "active" : "",
                index < telemetry.index ? "past" : "",
              ].filter(Boolean).join(" ")}
              key={question.id}
              onClick={() => selectQuestion(index)}
              type="button"
            >
              <b>{String(index + 1).padStart(2, "0")}</b>
              <span>{question.prompt}</span>
              <i>{question.correct}</i>
            </button>
          ))}
        </aside>

        <section className="pose-control-main">
          <div className="pose-control-current">
            <div className="pose-control-kicker">
              <span>CÂU {currentIndex + 1}/{questions.length}</span>
              <b>{currentQuestion.seconds} GIÂY</b>
            </div>

            <h1>{currentQuestion.prompt}</h1>

            <div className="pose-control-options">
              {ANSWERS.map((answer) => (
                <article
                  className={answer === currentQuestion.correct ? "correct" : ""}
                  key={answer}
                >
                  <b>{answer}</b>
                  <span>{currentQuestion.options[answer]}</span>
                  {answer === currentQuestion.correct && <strong>ĐÁP ÁN ĐÚNG</strong>}
                </article>
              ))}
            </div>
          </div>

          <div className="pose-control-buttons">
            <button onClick={goPrevious} type="button">← Câu trước</button>
            <button onClick={prepare} type="button">Chuẩn bị trên TV</button>
            <button className="primary" onClick={start} type="button">
              3 · 2 · 1 · BẮT ĐẦU
            </button>
            {telemetry.phase === "paused" ? (
              <button onClick={() => post({ type: "resume" })} type="button">▶ Tiếp tục</button>
            ) : (
              <button
                disabled={!["question", "countdown"].includes(telemetry.phase)}
                onClick={() => post({ type: "pause" })}
                type="button"
              >
                ⏸ Pause
              </button>
            )}
            <button onClick={skip} type="button">Skip →</button>
            <button onClick={goNext} type="button">Câu sau →</button>
          </div>

          <div className="pose-control-monitor-grid">
            <article>
              <small>STUDENT DISPLAY</small>
              <strong>{telemetry.phase.toUpperCase()}</strong>
              <span>{displayConnected ? "Đã kết nối" : "Chưa kết nối"}</span>
            </article>
            <article>
              <small>CAMERA</small>
              <strong>{telemetry.cameraStatus}</strong>
              <span>{telemetry.modelStatus}</span>
            </article>
            <article>
              <small>POSE ĐANG NHẬN</small>
              <strong>
                {telemetry.poseAnswer
                  ? telemetry.poseAnswer + " · " + POSE_LABELS[telemetry.poseAnswer].title
                  : "—"}
              </strong>
              <span>
                {telemetry.selected
                  ? "Đã khóa: " + telemetry.selected
                  : "Chưa khóa đáp án"}
              </span>
            </article>
            <article>
              <small>THỜI GIAN</small>
              <strong>{telemetry.secondsLeft}s</strong>
              <span>Còn lại của câu hiện tại</span>
            </article>
            <article>
              <small>ĐIỂM</small>
              <strong>{telemetry.score.toLocaleString("vi-VN")}</strong>
              <span>Combo ×{Math.max(1, telemetry.streak)}</span>
            </article>
            <article className={telemetry.isCorrect === false ? "danger" : telemetry.isCorrect ? "success" : ""}>
              <small>KẾT QUẢ GẦN NHẤT</small>
              <strong>
                {telemetry.isCorrect === null
                  ? "—"
                  : telemetry.isCorrect
                    ? "CHÍNH XÁC"
                    : "CHƯA ĐÚNG"}
              </strong>
              <span>{telemetry.error || "AI telemetry realtime"}</span>
            </article>
          </div>

          <div className="pose-control-footer-actions">
            <button onClick={resetSession} type="button">Reset điểm + về câu 1</button>
            <Link href="/pose-quiz">Sửa bộ câu hỏi</Link>
          </div>

          {channelError && <p className="pose-error">{channelError}</p>}
        </section>
      </section>
    </main>
  );
}
