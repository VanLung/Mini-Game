"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type AnswerKey = "A" | "B" | "C" | "D";

type PoseQuestion = {
  id: string;
  prompt: string;
  options: Record<AnswerKey, string>;
  correct: AnswerKey;
  seconds: number;
};

type Keypoint = [number, number, number];

type PoseResults = {
  boxes?: Array<{ x1: number; y1: number; x2: number; y2: number; conf: number }>;
  keypoints?: Array<{ points: Keypoint[] }>;
  speed?: { inference?: number };
};

type YoloModel = {
  device?: string;
  predict: (
    source: HTMLVideoElement,
    options?: { conf?: number; iou?: number },
  ) => Promise<PoseResults>;
};

type AnnotateFn = (
  canvas: HTMLCanvasElement,
  source: HTMLVideoElement,
  results: PoseResults,
) => Promise<void>;

const STORAGE_KEY = "lunix-pose-quiz-questions-v1";
const HOLD_MS = 800;
const ANSWERS: AnswerKey[] = ["A", "B", "C", "D"];

const POSE_LABELS: Record<AnswerKey, { title: string; hint: string; icon: string }> = {
  A: { title: "GIƠ TAY TRÁI", hint: "Một tay trái lên cao", icon: "🙋" },
  B: { title: "GIƠ TAY PHẢI", hint: "Một tay phải lên cao", icon: "🙋‍♂️" },
  C: { title: "GIƠ HAI TAY", hint: "Cả hai tay lên cao", icon: "🙌" },
  D: { title: "DANG HAI TAY", hint: "Hai tay dang ngang", icon: "🧍" },
};

const DEFAULT_QUESTIONS: PoseQuestion[] = [
  {
    id: "sample-1",
    prompt: "Thiết bị nào sau đây là thiết bị nhập dữ liệu?",
    options: { A: "Bàn phím", B: "Màn hình", C: "Loa", D: "Máy chiếu" },
    correct: "A",
    seconds: 12,
  },
  {
    id: "sample-2",
    prompt: "AI là viết tắt phổ biến của cụm từ nào?",
    options: {
      A: "Automatic Internet",
      B: "Artificial Intelligence",
      C: "Advanced Interface",
      D: "Applied Information",
    },
    correct: "B",
    seconds: 12,
  },
  {
    id: "sample-3",
    prompt: "Đâu là mật khẩu an toàn hơn?",
    options: {
      A: "12345678",
      B: "password",
      C: "R0bo!Lunix#26",
      D: "ngaysinh",
    },
    correct: "C",
    seconds: 12,
  },
  {
    id: "sample-4",
    prompt: "Khi gặp một thông tin đáng ngờ trên mạng, hành động phù hợp nhất là gì?",
    options: {
      A: "Chia sẻ ngay",
      B: "Tin nếu có nhiều lượt thích",
      C: "Bỏ qua mọi nguồn",
      D: "Kiểm tra nguồn và đối chiếu thông tin",
    },
    correct: "D",
    seconds: 15,
  },
];

function createQuestion(): PoseQuestion {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : "q-" + Date.now() + "-" + Math.random().toString(36).slice(2);
  return {
    id,
    prompt: "",
    options: { A: "", B: "", C: "", D: "" },
    correct: "A",
    seconds: 12,
  };
}

function clampSeconds(value: number) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(60, Math.max(5, Math.round(value)));
}

function classifyPose(points: Keypoint[] | undefined): AnswerKey | null {
  if (!points || points.length < 17) return null;

  const leftShoulder = points[5];
  const rightShoulder = points[6];
  const leftWrist = points[9];
  const rightWrist = points[10];

  const visible = (point: Keypoint) => (point?.[2] ?? 0) >= 0.35;
  if (
    !visible(leftShoulder) ||
    !visible(rightShoulder) ||
    !visible(leftWrist) ||
    !visible(rightWrist)
  ) {
    return null;
  }

  const shoulderSpan = Math.max(
    20,
    Math.abs(rightShoulder[0] - leftShoulder[0]),
  );
  const raisedMargin = shoulderSpan * 0.2;
  const leftUp = leftWrist[1] < leftShoulder[1] - raisedMargin;
  const rightUp = rightWrist[1] < rightShoulder[1] - raisedMargin;

  if (leftUp && rightUp) return "C";

  const shoulderY = (leftShoulder[1] + rightShoulder[1]) / 2;
  const horizontalTolerance = shoulderSpan * 0.42;
  const leftWide =
    Math.abs(leftWrist[1] - shoulderY) < horizontalTolerance &&
    leftWrist[0] < leftShoulder[0] - shoulderSpan * 0.45;
  const rightWide =
    Math.abs(rightWrist[1] - shoulderY) < horizontalTolerance &&
    rightWrist[0] > rightShoulder[0] + shoulderSpan * 0.45;

  if (leftWide && rightWide) return "D";
  if (leftUp && !rightUp) return "A";
  if (rightUp && !leftUp) return "B";
  return null;
}

function choosePrimaryPose(results: PoseResults): Keypoint[] | undefined {
  const boxes = results.boxes ?? [];
  const poses = results.keypoints ?? [];
  if (!poses.length) return undefined;
  if (!boxes.length) return poses[0]?.points;

  let bestIndex = 0;
  let bestScore = -1;
  boxes.forEach((box, index) => {
    const area = Math.max(0, box.x2 - box.x1) * Math.max(0, box.y2 - box.y1);
    const score = area * Math.max(0.01, box.conf ?? 0);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });
  return poses[bestIndex]?.points ?? poses[0]?.points;
}

function playTone(kind: "correct" | "wrong" | "tick") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const frequencies =
      kind === "correct" ? [520, 720, 920] : kind === "wrong" ? [260, 180] : [480];
    frequencies.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = kind === "wrong" ? "square" : "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      const start = ctx.currentTime + index * 0.08;
      osc.start(start);
      osc.stop(start + 0.13);
    });
    gain.gain.setValueAtTime(kind === "tick" ? 0.025 : 0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + (kind === "tick" ? 0.18 : 0.6),
    );
    window.setTimeout(() => void ctx.close(), 800);
  } catch {
    // Browser may block audio until user interaction.
  }
}

export function PoseQuizGame() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<YoloModel | null>(null);
  const annotateRef = useRef<AnnotateFn | null>(null);
  const loopRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const candidateRef = useRef<{ answer: AnswerKey | null; since: number }>({
    answer: null,
    since: 0,
  });
  const questionDeadlineRef = useRef(0);
  const lockedRef = useRef(false);
  const tickSecondRef = useRef(-1);

  const [questions, setQuestions] = useState<PoseQuestion[]>(DEFAULT_QUESTIONS);
  const [screen, setScreen] = useState<"studio" | "play" | "finished">("studio");
  const [cameraStatus, setCameraStatus] = useState("Chưa bật camera");
  const [modelStatus, setModelStatus] = useState("Chưa tải AI");
  const [backend, setBackend] = useState("—");
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [poseAnswer, setPoseAnswer] = useState<AnswerKey | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<{
    selected: AnswerKey | null;
    correct: AnswerKey;
    isCorrect: boolean;
    timeout?: boolean;
  } | null>(null);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PoseQuestion[];
      if (Array.isArray(saved) && saved.length) {
        setQuestions(
          saved.map((question) => ({
            ...question,
            seconds: clampSeconds(question.seconds),
          })),
        );
      }
    } catch {
      // Keep sample questions when local data is invalid.
    }
  }, []);

  const saveQuestions = useCallback(() => {
    const cleaned = questions
      .map((question) => ({
        ...question,
        prompt: question.prompt.trim(),
        options: {
          A: question.options.A.trim(),
          B: question.options.B.trim(),
          C: question.options.C.trim(),
          D: question.options.D.trim(),
        },
        seconds: clampSeconds(question.seconds),
      }))
      .filter(
        (question) =>
          question.prompt &&
          ANSWERS.every((answer) => question.options[answer]),
      );

    if (!cleaned.length) {
      setError("Cần ít nhất 1 câu hỏi đầy đủ 4 đáp án.");
      return false;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch {
      // The game still works even if storage is unavailable.
    }
    setQuestions(cleaned);
    setError("");
    return true;
  }, [questions]);

  const updateQuestion = useCallback(
    (id: string, patch: Partial<PoseQuestion>) => {
      setQuestions((current) =>
        current.map((question) =>
          question.id === id ? { ...question, ...patch } : question,
        ),
      );
    },
    [],
  );

  const updateOption = useCallback(
    (id: string, key: AnswerKey, value: string) => {
      setQuestions((current) =>
        current.map((question) =>
          question.id === id
            ? { ...question, options: { ...question.options, [key]: value } }
            : question,
        ),
      );
    },
    [],
  );

  const stopVision = useCallback(() => {
    if (loopRef.current !== null) {
      window.cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    modelRef.current = null;
    annotateRef.current = null;
    busyRef.current = false;
  }, []);

  useEffect(() => stopVision, [stopVision]);

  const beginQuestion = useCallback(
    (index: number) => {
      const question = questions[index];
      if (!question) {
        setScreen("finished");
        stopVision();
        return;
      }
      setCurrentIndex(index);
      setFeedback(null);
      setPoseAnswer(null);
      setHoldProgress(0);
      lockedRef.current = false;
      candidateRef.current = { answer: null, since: 0 };
      const seconds = clampSeconds(question.seconds);
      setSecondsLeft(seconds);
      questionDeadlineRef.current = performance.now() + seconds * 1000;
      tickSecondRef.current = seconds;
    },
    [questions, stopVision],
  );

  const submitAnswer = useCallback(
    (selected: AnswerKey | null, timeout = false) => {
      if (lockedRef.current || screen !== "play") return;
      const question = questions[currentIndex];
      if (!question) return;

      lockedRef.current = true;
      const isCorrect = selected === question.correct;
      const remaining = Math.max(
        0,
        Math.ceil((questionDeadlineRef.current - performance.now()) / 1000),
      );
      setFeedback({
        selected,
        correct: question.correct,
        isCorrect,
        timeout,
      });
      setAnsweredCount((value) => value + 1);

      if (isCorrect) {
        setScore((value) => value + 100 + remaining * 5 + streak * 10);
        setStreak((value) => value + 1);
        playTone("correct");
      } else {
        setStreak(0);
        playTone("wrong");
      }

      window.setTimeout(() => {
        const next = currentIndex + 1;
        if (next >= questions.length) {
          setScreen("finished");
          stopVision();
        } else {
          beginQuestion(next);
        }
      }, 1800);
    },
    [beginQuestion, currentIndex, questions, screen, stopVision, streak],
  );

  const startVision = useCallback(async () => {
    if (!saveQuestions()) return;

    setScreen("play");
    setScore(0);
    setStreak(0);
    setAnsweredCount(0);
    setError("");
    setCameraStatus("Đang xin quyền camera…");
    setModelStatus("Đang tải YOLO26n-pose…");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("Không tìm thấy video element.");
      video.srcObject = stream;
      await video.play();
      setCameraStatus("Camera sẵn sàng");

      const module = await import("@ultralytics/yolo");
      const model = (await module.YOLO.load("/models/yolo26n-pose.onnx", {
        device: "auto",
      })) as YoloModel;
      modelRef.current = model;
      annotateRef.current = module.annotate as unknown as AnnotateFn;
      setBackend(model.device ?? "auto");
      setModelStatus("YOLO26 Pose sẵn sàng");

      beginQuestion(0);

      const frame = async () => {
        loopRef.current = window.requestAnimationFrame(frame);
        if (busyRef.current || !modelRef.current || !videoRef.current) return;
        if (videoRef.current.readyState < 2) return;

        busyRef.current = true;
        try {
          const results = await modelRef.current.predict(videoRef.current, {
            conf: 0.28,
            iou: 0.65,
          });
          const canvas = canvasRef.current;
          if (canvas && annotateRef.current) {
            await annotateRef.current(canvas, videoRef.current, results);
          }

          if (typeof results.speed?.inference === "number") {
            setInferenceMs(Math.round(results.speed.inference));
          }

          const answer = classifyPose(choosePrimaryPose(results));
          setPoseAnswer(answer);

          const now = performance.now();
          if (answer) {
            if (candidateRef.current.answer !== answer) {
              candidateRef.current = { answer, since: now };
              setHoldProgress(0);
            } else {
              const progress = Math.min(1, (now - candidateRef.current.since) / HOLD_MS);
              setHoldProgress(progress);
              if (progress >= 1 && !lockedRef.current && !feedback) {
                submitAnswer(answer);
                candidateRef.current = { answer: null, since: 0 };
                setHoldProgress(0);
              }
            }
          } else {
            candidateRef.current = { answer: null, since: 0 };
            setHoldProgress(0);
          }
        } catch (reason) {
          const message =
            reason instanceof Error ? reason.message : "Không thể chạy nhận diện.";
          setModelStatus("AI tạm dừng");
          setError(message);
        } finally {
          busyRef.current = false;
        }
      };

      loopRef.current = window.requestAnimationFrame(frame);
    } catch (reason) {
      stopVision();
      setScreen("studio");
      const message =
        reason instanceof Error
          ? reason.message
          : "Không thể khởi động camera hoặc model AI.";
      setError(message);
      setCameraStatus("Camera chưa sẵn sàng");
      setModelStatus("AI chưa sẵn sàng");
    }
  }, [beginQuestion, feedback, saveQuestions, stopVision, submitAnswer]);

  useEffect(() => {
    if (screen !== "play" || !currentQuestion || feedback) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        Math.ceil((questionDeadlineRef.current - performance.now()) / 1000),
      );
      setSecondsLeft(remaining);
      if (remaining <= 3 && remaining > 0 && tickSecondRef.current !== remaining) {
        tickSecondRef.current = remaining;
        playTone("tick");
      }
      if (remaining <= 0 && !lockedRef.current) {
        submitAnswer(null, true);
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [currentQuestion, feedback, screen, submitAnswer]);

  const validQuestionCount = useMemo(
    () =>
      questions.filter(
        (question) =>
          question.prompt.trim() &&
          ANSWERS.every((answer) => question.options[answer].trim()),
      ).length,
    [questions],
  );

  if (screen === "studio") {
    return (
      <main className="pose-studio-shell">
        <Link className="game-back-link" href="/">← Game Hub</Link>
        <section className="pose-studio">
          <header className="pose-studio-header">
            <div>
              <p>AI VISION · YOLO26 POSE</p>
              <h1>Pose Quiz AI</h1>
              <span>
                Trả lời trắc nghiệm bằng tư thế cơ thể. Camera được xử lý trực tiếp
                trên thiết bị.
              </span>
            </div>
            <div className="pose-ai-badge">
              <strong>17</strong>
              <span>BODY KEYPOINTS</span>
            </div>
          </header>

          <section className="pose-gesture-guide">
            {ANSWERS.map((answer) => (
              <article key={answer} data-answer={answer}>
                <b>{answer}</b>
                <span>{POSE_LABELS[answer].icon}</span>
                <div>
                  <strong>{POSE_LABELS[answer].title}</strong>
                  <small>{POSE_LABELS[answer].hint}</small>
                </div>
              </article>
            ))}
          </section>

          <div className="pose-studio-toolbar">
            <div>
              <b>Question Studio</b>
              <span>{validQuestionCount}/{questions.length} câu hợp lệ · Lưu trên trình duyệt này</span>
            </div>
            <div>
              <button
                onClick={() => setQuestions((current) => [...current, createQuestion()])}
                type="button"
              >
                + Thêm câu
              </button>
              <button
                onClick={() => {
                  setQuestions(DEFAULT_QUESTIONS);
                  setError("");
                }}
                type="button"
              >
                Khôi phục mẫu
              </button>
              <button className="pose-save-button" onClick={saveQuestions} type="button">
                Lưu câu hỏi
              </button>
            </div>
          </div>

          <div className="pose-question-editor">
            {questions.map((question, questionIndex) => (
              <article className="pose-editor-card" key={question.id}>
                <div className="pose-editor-index">{String(questionIndex + 1).padStart(2, "0")}</div>
                <label className="pose-editor-prompt">
                  <span>Câu hỏi</span>
                  <textarea
                    onChange={(event) =>
                      updateQuestion(question.id, { prompt: event.target.value })
                    }
                    placeholder="Nhập nội dung câu hỏi…"
                    value={question.prompt}
                  />
                </label>
                <div className="pose-editor-options">
                  {ANSWERS.map((answer) => (
                    <label key={answer}>
                      <b>{answer}</b>
                      <input
                        onChange={(event) =>
                          updateOption(question.id, answer, event.target.value)
                        }
                        placeholder={"Đáp án " + answer}
                        value={question.options[answer]}
                      />
                    </label>
                  ))}
                </div>
                <div className="pose-editor-meta">
                  <label>
                    <span>Đáp án đúng</span>
                    <select
                      onChange={(event) =>
                        updateQuestion(question.id, {
                          correct: event.target.value as AnswerKey,
                        })
                      }
                      value={question.correct}
                    >
                      {ANSWERS.map((answer) => (
                        <option key={answer} value={answer}>{answer}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Thời gian</span>
                    <div>
                      <input
                        max={60}
                        min={5}
                        onChange={(event) =>
                          updateQuestion(question.id, {
                            seconds: Number(event.target.value),
                          })
                        }
                        type="number"
                        value={question.seconds}
                      />
                      <i>giây</i>
                    </div>
                  </label>
                  <button
                    disabled={questions.length <= 1}
                    onClick={() =>
                      setQuestions((current) =>
                        current.filter((item) => item.id !== question.id),
                      )
                    }
                    type="button"
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
          </div>

          {error && <p className="pose-error" role="alert">{error}</p>}

          <button className="pose-launch-button" onClick={startVision} type="button">
            <span>Khởi động AI Camera</span>
            <strong>YOLO26 →</strong>
          </button>
        </section>
      </main>
    );
  }

  if (screen === "finished") {
    const accuracy = questions.length
      ? Math.round((score > 0 ? answeredCount : 0) / Math.max(1, questions.length) * 100)
      : 0;
    return (
      <main className="pose-finish-screen">
        <Link className="game-back-link" href="/">← Game Hub</Link>
        <div className="pose-finish-card">
          <span>⚡</span>
          <p>AI POSE QUIZ COMPLETE</p>
          <h1>{score.toLocaleString("vi-VN")}</h1>
          <strong>ĐIỂM</strong>
          <div>
            <b>{questions.length}</b><small>Câu hỏi</small>
            <b>{accuracy}%</b><small>Hoàn thành</small>
          </div>
          <button
            onClick={() => {
              setCurrentIndex(0);
              setScore(0);
              setStreak(0);
              setAnsweredCount(0);
              setScreen("studio");
            }}
            type="button"
          >
            Về Question Studio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="pose-game-shell">
      <header className="pose-game-topbar">
        <Link href="/">GAME HUB</Link>
        <div>
          <p>POSE QUIZ AI</p>
          <b>{currentIndex + 1}/{questions.length}</b>
        </div>
        <div className="pose-tech-status">
          <span className={cameraStatus.includes("sẵn sàng") ? "ok" : ""}>CAM</span>
          <span className={modelStatus.includes("sẵn sàng") ? "ok" : ""}>AI</span>
          <span>{backend.toUpperCase()}</span>
          {inferenceMs !== null && <span>{inferenceMs} ms</span>}
        </div>
        <div className="pose-score-box">
          <small>SCORE</small>
          <strong>{score.toLocaleString("vi-VN")}</strong>
          <em>COMBO ×{Math.max(1, streak)}</em>
        </div>
      </header>

      <section className="pose-game-grid">
        <aside className="pose-question-panel">
          <div className="pose-question-kicker">
            <span>QUESTION {String(currentIndex + 1).padStart(2, "0")}</span>
            <b>{currentQuestion?.seconds ?? 0}s</b>
          </div>
          <h1>{currentQuestion?.prompt}</h1>
          <div className="pose-answer-list">
            {ANSWERS.map((answer) => {
              const isDetected = poseAnswer === answer;
              const isSelected = feedback?.selected === answer;
              const isCorrect = feedback?.correct === answer;
              return (
                <article
                  className={[
                    isDetected ? "detected" : "",
                    feedback && isCorrect ? "correct" : "",
                    feedback && isSelected && !isCorrect ? "wrong" : "",
                  ].filter(Boolean).join(" ")}
                  data-answer={answer}
                  key={answer}
                >
                  <b>{answer}</b>
                  <span>{currentQuestion?.options[answer]}</span>
                  <small>{POSE_LABELS[answer].title}</small>
                </article>
              );
            })}
          </div>
        </aside>

        <section className="pose-camera-column">
          <div className="pose-camera-frame">
            <div className="pose-scanline" />
            <div className="pose-corner top-left" />
            <div className="pose-corner top-right" />
            <div className="pose-corner bottom-left" />
            <div className="pose-corner bottom-right" />
            <video
              autoPlay
              muted
              playsInline
              ref={videoRef}
            />
            <canvas ref={canvasRef} />
            <div className="pose-camera-hud">
              <span>{modelStatus}</span>
              <span>{cameraStatus}</span>
            </div>
            <div className="pose-detection-pill">
              {poseAnswer ? (
                <>
                  <b>{poseAnswer}</b>
                  <span>{POSE_LABELS[poseAnswer].title}</span>
                </>
              ) : (
                <>
                  <b>AI</b>
                  <span>Đưa toàn thân vào khung hình</span>
                </>
              )}
            </div>
            <div className="pose-hold-meter">
              <i style={{ width: Math.round(holdProgress * 100) + "%" }} />
            </div>
          </div>

          <div className="pose-countdown-row">
            <div
              className={"pose-timer " + (secondsLeft <= 3 ? "danger" : "")}
              style={{
                background:
                  "conic-gradient(#59f2d5 " +
                  Math.max(
                    0,
                    Math.min(
                      100,
                      (secondsLeft / Math.max(1, currentQuestion?.seconds ?? 1)) * 100,
                    ),
                  ) +
                  "%, rgba(255,255,255,.1) 0)",
              }}
            >
              <div>
                <strong>{secondsLeft}</strong>
                <small>GIÂY</small>
              </div>
            </div>
            <div className="pose-current-gesture">
              <small>TƯ THẾ ĐANG NHẬN</small>
              <strong>
                {poseAnswer
                  ? poseAnswer + " · " + POSE_LABELS[poseAnswer].title
                  : "CHƯA XÁC ĐỊNH"}
              </strong>
              <span>Giữ ổn định ~0,8 giây để khóa đáp án.</span>
            </div>
          </div>
        </section>
      </section>

      {feedback && (
        <div className={"pose-feedback " + (feedback.isCorrect ? "correct" : "wrong")}>
          <span>{feedback.isCorrect ? "✓" : feedback.timeout ? "⌛" : "×"}</span>
          <div>
            <small>{feedback.timeout ? "HẾT GIỜ" : feedback.isCorrect ? "CHÍNH XÁC" : "CHƯA ĐÚNG"}</small>
            <strong>
              Đáp án đúng: {feedback.correct} · {currentQuestion?.options[feedback.correct]}
            </strong>
          </div>
        </div>
      )}
    </main>
  );
}
