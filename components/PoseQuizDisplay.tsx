"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ANSWERS,
  HOLD_MS,
  POSE_LABELS,
  type AnswerKey,
  type DisplayTelemetry,
  type PoseQuestion,
  type TeacherCommand,
  loadPoseQuestions,
  poseChannelName,
} from "../lib/poseQuiz";

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
  free: () => void;
};

type DisplayPhase = DisplayTelemetry["phase"];

const SKELETON_EDGES: Array<[number, number]> = [
  [5, 7], [7, 9],
  [6, 8], [8, 10],
  [5, 6],
  [5, 11], [6, 12],
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
];

const INFERENCE_INTERVAL_MS = 160;

function drawPoseOverlay(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  results: PoseResults,
) {
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 360;

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const poses = (results.keypoints ?? []).slice(0, 6);
  for (const pose of poses) {
    const points = pose.points ?? [];

    ctx.strokeStyle = "rgba(89, 242, 213, .92)";
    ctx.lineWidth = Math.max(2, width / 260);
    ctx.shadowColor = "rgba(89, 242, 213, .45)";
    ctx.shadowBlur = 8;

    for (const [a, b] of SKELETON_EDGES) {
      const p1 = points[a];
      const p2 = points[b];
      if (!p1 || !p2 || (p1[2] ?? 0) < 0.3 || (p2[2] ?? 0) < 0.3) continue;
      ctx.beginPath();
      ctx.moveTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
    for (const point of points) {
      if (!point || (point[2] ?? 0) < 0.3) continue;
      ctx.beginPath();
      ctx.fillStyle = "#dffcf5";
      ctx.arc(point[0], point[1], Math.max(2.5, width / 220), 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#59f2d5";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }
}

const MODEL_URL =
  "https://huggingface.co/zwh20081/yolo26-onnx/resolve/main/yolo26n-pose.onnx?download=true";

function readSessionId() {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("session") ?? "";
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

function playTone(kind: "correct" | "wrong" | "tick" | "go") {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const frequencies =
      kind === "correct"
        ? [520, 720, 920]
        : kind === "wrong"
          ? [260, 180]
          : kind === "go"
            ? [620, 820]
            : [480];

    frequencies.forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = kind === "wrong" ? "square" : "sine";
      osc.frequency.value = frequency;
      osc.connect(gain);
      const start = ctx.currentTime + index * 0.07;
      osc.start(start);
      osc.stop(start + 0.13);
    });

    gain.gain.setValueAtTime(kind === "tick" ? 0.025 : 0.065, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      ctx.currentTime + (kind === "tick" ? 0.18 : 0.55),
    );
    window.setTimeout(() => void ctx.close(), 750);
  } catch {
    // Audio is optional.
  }
}

export function PoseQuizDisplay() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<YoloModel | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const loopRef = useRef<number | null>(null);
  const visionActiveRef = useRef(false);
  const busyRef = useRef(false);
  const consecutiveErrorsRef = useRef(0);
  const lastInferenceAtRef = useRef(0);
  const candidateRef = useRef<{ answer: AnswerKey | null; since: number }>({
    answer: null,
    since: 0,
  });
  const phaseRef = useRef<DisplayPhase>("booting");
  const indexRef = useRef(0);
  const questionDeadlineRef = useRef(0);
  const countdownDeadlineRef = useRef(0);
  const pausedRemainingRef = useRef(0);
  const pausedFromRef = useRef<"countdown" | "question" | null>(null);
  const lockedRef = useRef(true);
  const tickSecondRef = useRef(-1);
  const scoreRef = useRef(0);
  const streakRef = useRef(0);

  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<PoseQuestion[]>([]);
  const [phase, setPhase] = useState<DisplayPhase>("booting");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cameraStatus, setCameraStatus] = useState("Đang chuẩn bị camera…");
  const [modelStatus, setModelStatus] = useState("Đang chuẩn bị AI…");
  const [backend, setBackend] = useState("—");
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [poseAnswer, setPoseAnswer] = useState<AnswerKey | null>(null);
  const [holdProgress, setHoldProgress] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [error, setError] = useState("");

  const currentQuestion = questions[currentIndex];

  const setPhaseSafe = useCallback((next: DisplayPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const setIndexSafe = useCallback((index: number) => {
    indexRef.current = index;
    setCurrentIndex(index);
  }, []);

  const clearAnswerState = useCallback(() => {
    setSelected(null);
    setIsCorrect(null);
    setPoseAnswer(null);
    setHoldProgress(0);
    candidateRef.current = { answer: null, since: 0 };
    lockedRef.current = true;
  }, []);

  const stopLoop = useCallback(() => {
    visionActiveRef.current = false;
    if (loopRef.current !== null) {
      window.cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
    busyRef.current = false;
  }, []);

  const stopCamera = useCallback(() => {
    stopLoop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, [stopLoop]);

  const freeModel = useCallback(() => {
    try {
      modelRef.current?.free();
    } catch {
      // Best effort cleanup.
    }
    modelRef.current = null;
  }, []);

  const destroyVision = useCallback(() => {
    stopCamera();
    freeModel();
  }, [freeModel, stopCamera]);

  const submitAnswer = useCallback(
    (answer: AnswerKey | null, timeout = false) => {
      if (
        lockedRef.current ||
        phaseRef.current !== "question" ||
        !questions[indexRef.current]
      ) {
        return;
      }

      lockedRef.current = true;
      const question = questions[indexRef.current];
      const correct = answer === question.correct;
      const remaining = Math.max(
        0,
        Math.ceil((questionDeadlineRef.current - performance.now()) / 1000),
      );

      setSelected(answer);
      setIsCorrect(correct);
      setPhaseSafe("answered");

      if (correct) {
        const nextScore =
          scoreRef.current + 100 + remaining * 5 + streakRef.current * 10;
        const nextStreak = streakRef.current + 1;
        scoreRef.current = nextScore;
        streakRef.current = nextStreak;
        setScore(nextScore);
        setStreak(nextStreak);
        playTone("correct");
      } else {
        streakRef.current = 0;
        setStreak(0);
        playTone("wrong");
      }

      if (timeout) setPoseAnswer(null);
    },
    [questions, setPhaseSafe],
  );

  const startInferenceLoop = useCallback(() => {
    if (visionActiveRef.current || !modelRef.current) return;

    visionActiveRef.current = true;
    consecutiveErrorsRef.current = 0;

    const frame = async () => {
      if (!visionActiveRef.current) return;

      const video = videoRef.current;
      const model = modelRef.current;
      const now = performance.now();
      const shouldInfer =
        phaseRef.current === "countdown" || phaseRef.current === "question";

      if (!shouldInfer) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          ctx?.clearRect(0, 0, canvas.width, canvas.height);
        }
        loopRef.current = window.requestAnimationFrame(frame);
        return;
      }

      if (
        !video ||
        !model ||
        video.readyState < 2 ||
        busyRef.current ||
        now - lastInferenceAtRef.current < INFERENCE_INTERVAL_MS
      ) {
        loopRef.current = window.requestAnimationFrame(frame);
        return;
      }

      lastInferenceAtRef.current = now;
      busyRef.current = true;
      let keepRunning = true;

      try {
        const results = await model.predict(video, {
          conf: 0.28,
          iou: 0.65,
        });

        consecutiveErrorsRef.current = 0;

        const canvas = canvasRef.current;
        if (canvas) {
          drawPoseOverlay(canvas, video, results);
        }

        if (typeof results.speed?.inference === "number") {
          setInferenceMs(Math.round(results.speed.inference));
        }

        const answer = classifyPose(choosePrimaryPose(results));
        setPoseAnswer(answer);

        if (
          phaseRef.current === "question" &&
          !lockedRef.current &&
          answer
        ) {
          const now = performance.now();

          if (candidateRef.current.answer !== answer) {
            candidateRef.current = { answer, since: now };
            setHoldProgress(0);
          } else {
            const progress = Math.min(
              1,
              (now - candidateRef.current.since) / HOLD_MS,
            );
            setHoldProgress(progress);

            if (progress >= 1) {
              submitAnswer(answer);
              candidateRef.current = { answer: null, since: 0 };
              setHoldProgress(0);
            }
          }
        } else if (!answer || phaseRef.current !== "question") {
          candidateRef.current = { answer: null, since: 0 };
          setHoldProgress(0);
        }
      } catch (reason) {
        consecutiveErrorsRef.current += 1;
        const message =
          reason instanceof Error ? reason.message : "Không thể chạy nhận diện AI.";

        if (consecutiveErrorsRef.current >= 3) {
          keepRunning = false;
          visionActiveRef.current = false;
          setModelStatus("AI đã dừng để bảo vệ phiên");
          setError(
            "Inference lỗi liên tiếp. AI đã tự dừng thay vì tiếp tục làm treo trình duyệt. " +
              message,
          );
          setPhaseSafe("error");
        }
      } finally {
        busyRef.current = false;
      }

      if (keepRunning && visionActiveRef.current) {
        loopRef.current = window.requestAnimationFrame(frame);
      }
    };

    loopRef.current = window.requestAnimationFrame(frame);
  }, [setPhaseSafe, submitAnswer]);

  const bootVision = useCallback(
    async (forceReload = false) => {
      setError("");
      setCameraStatus("Đang xin quyền camera…");

      try {
        if (forceReload) {
          stopCamera();
          freeModel();
        }

        if (!streamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 640, max: 640 },
              height: { ideal: 360, max: 480 },
              frameRate: { ideal: 24, max: 30 },
            },
            audio: false,
          });
          streamRef.current = stream;
        }

        const video = videoRef.current;
        if (!video) throw new Error("Không tìm thấy video element.");

        if (video.srcObject !== streamRef.current) {
          video.srcObject = streamRef.current;
        }
        await video.play();
        setCameraStatus("Camera sẵn sàng");

        if (!modelRef.current) {
          setModelStatus("Đang tải YOLO26n-pose…");
          const response = await fetch(MODEL_URL, {
            cache: "force-cache",
            mode: "cors",
          });
          if (!response.ok) {
            throw new Error("Không tải được model AI (HTTP " + response.status + ").");
          }

          const modelBlob = await response.blob();
          if (modelBlob.size < 5_000_000) {
            throw new Error(
              "Model AI tải về không hợp lệ (" +
                (modelBlob.size / 1024 / 1024).toFixed(1) +
                " MB).",
            );
          }

          setModelStatus(
            "Đã tải " +
              (modelBlob.size / 1024 / 1024).toFixed(1) +
              " MB · đang khởi tạo…",
          );

          const module = await import("@ultralytics/yolo");
          const model = (await module.YOLO.load(modelBlob, {
            device: "auto",
          })) as YoloModel;

          modelRef.current = model;
          setBackend(model.device ?? "auto");
        }

        setModelStatus("YOLO26 Pose sẵn sàng · chế độ ổn định ~6 FPS");
        if (phaseRef.current === "booting" || phaseRef.current === "error") {
          setPhaseSafe("standby");
        }
        startInferenceLoop();
      } catch (reason) {
        stopCamera();
        const raw =
          reason instanceof Error
            ? reason.message
            : "Không thể khởi động camera hoặc AI.";
        const message =
          raw === "Load failed" || raw.includes("Failed to fetch")
            ? "Không tải được model AI từ mạng. Kiểm tra Internet rồi bấm Thử lại AI."
            : raw;
        setCameraStatus("Camera/AI chưa sẵn sàng");
        setModelStatus("AI chưa sẵn sàng");
        setError(message);
        setPhaseSafe("error");
      }
    },
    [freeModel, setPhaseSafe, startInferenceLoop, stopCamera],
  );

  const prepareQuestion = useCallback(
    (index: number) => {
      if (!questions.length) return;
      const safeIndex = Math.max(0, Math.min(questions.length - 1, index));
      setIndexSafe(safeIndex);
      clearAnswerState();
      setSecondsLeft(questions[safeIndex].seconds);
      setCountdown(3);
      pausedFromRef.current = null;
      setPhaseSafe("standby");
    },
    [clearAnswerState, questions, setIndexSafe, setPhaseSafe],
  );

  const startQuestion = useCallback(
    (index: number) => {
      if (!questions.length) return;
      const safeIndex = Math.max(0, Math.min(questions.length - 1, index));
      setIndexSafe(safeIndex);
      clearAnswerState();
      setCountdown(3);
      setSecondsLeft(questions[safeIndex].seconds);
      countdownDeadlineRef.current = performance.now() + 3000;
      pausedFromRef.current = null;
      setPhaseSafe("countdown");
      playTone("tick");
    },
    [clearAnswerState, questions, setIndexSafe, setPhaseSafe],
  );

  const pause = useCallback(() => {
    const now = performance.now();
    if (phaseRef.current === "countdown") {
      pausedRemainingRef.current = Math.max(
        0,
        countdownDeadlineRef.current - now,
      );
      pausedFromRef.current = "countdown";
      setPhaseSafe("paused");
    } else if (phaseRef.current === "question") {
      pausedRemainingRef.current = Math.max(
        0,
        questionDeadlineRef.current - now,
      );
      pausedFromRef.current = "question";
      lockedRef.current = true;
      setPhaseSafe("paused");
    }
  }, [setPhaseSafe]);

  const resume = useCallback(() => {
    const origin = pausedFromRef.current;
    if (!origin) return;

    if (origin === "countdown") {
      countdownDeadlineRef.current =
        performance.now() + pausedRemainingRef.current;
      setPhaseSafe("countdown");
    } else {
      questionDeadlineRef.current =
        performance.now() + pausedRemainingRef.current;
      lockedRef.current = false;
      setPhaseSafe("question");
    }

    pausedFromRef.current = null;
  }, [setPhaseSafe]);

  const resetSession = useCallback(
    (index: number) => {
      scoreRef.current = 0;
      streakRef.current = 0;
      setScore(0);
      setStreak(0);
      prepareQuestion(index);
    },
    [prepareQuestion],
  );

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    indexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    const id = readSessionId();
    setSessionId(id);
    setQuestions(loadPoseQuestions());

    if (!id) {
      setError("Thiếu mã phiên Presenter Mode.");
      setPhaseSafe("error");
    }
  }, [setPhaseSafe]);

  useEffect(() => {
    if (!sessionId || !questions.length) return;

    if (!("BroadcastChannel" in window)) {
      setError("Trình duyệt không hỗ trợ BroadcastChannel. Hãy dùng Chrome/Edge mới.");
      setPhaseSafe("error");
      return;
    }

    const channel = new BroadcastChannel(poseChannelName(sessionId));
    channelRef.current = channel;

    channel.onmessage = (event: MessageEvent<TeacherCommand>) => {
      const command = event.data;
      if (!command || typeof command.type !== "string") return;

      if (command.type === "sync") {
        if (
          phaseRef.current === "booting" ||
          phaseRef.current === "standby"
        ) {
          prepareQuestion(command.index);
        }
        return;
      }

      if (command.type === "prepare") {
        prepareQuestion(command.index);
      } else if (command.type === "start") {
        startQuestion(command.index);
      } else if (command.type === "pause") {
        pause();
      } else if (command.type === "resume") {
        resume();
      } else if (command.type === "reset") {
        resetSession(command.index);
      } else if (command.type === "shutdown") {
        destroyVision();
        setPhaseSafe("finished");
      }
    };

    const startup = window.setTimeout(() => {
      void bootVision();
    }, 150);

    return () => {
      window.clearTimeout(startup);
      channel.close();
      channelRef.current = null;
      destroyVision();
    };
  }, [
    bootVision,
    destroyVision,
    pause,
    prepareQuestion,
    questions.length,
    resetSession,
    resume,
    sessionId,
    setPhaseSafe,
    startQuestion,
  ]);

  useEffect(() => {
    if (!questions.length) return;

    const timer = window.setInterval(() => {
      const now = performance.now();

      if (phaseRef.current === "countdown") {
        const remainingMs = countdownDeadlineRef.current - now;
        const nextCount = Math.max(0, Math.ceil(remainingMs / 1000));

        if (nextCount !== tickSecondRef.current && nextCount > 0) {
          tickSecondRef.current = nextCount;
          setCountdown(nextCount);
          playTone("tick");
        }

        if (remainingMs <= 0) {
          const question = questions[indexRef.current];
          if (!question) return;
          questionDeadlineRef.current = performance.now() + question.seconds * 1000;
          tickSecondRef.current = question.seconds;
          lockedRef.current = false;
          setSecondsLeft(question.seconds);
          setCountdown(0);
          setPhaseSafe("question");
          playTone("go");
        }
      } else if (phaseRef.current === "question") {
        const remaining = Math.max(
          0,
          Math.ceil((questionDeadlineRef.current - now) / 1000),
        );

        setSecondsLeft(remaining);

        if (
          remaining <= 3 &&
          remaining > 0 &&
          tickSecondRef.current !== remaining
        ) {
          tickSecondRef.current = remaining;
          playTone("tick");
        }

        if (remaining <= 0 && !lockedRef.current) {
          submitAnswer(null, true);
        }
      }
    }, 100);

    return () => window.clearInterval(timer);
  }, [questions, setPhaseSafe, submitAnswer]);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !sessionId) return;

    const telemetry: DisplayTelemetry = {
      type: "telemetry",
      ready: true,
      phase,
      index: currentIndex,
      cameraStatus,
      modelStatus,
      backend,
      inferenceMs,
      poseAnswer,
      selected,
      isCorrect,
      secondsLeft,
      score,
      streak,
      error: error || undefined,
    };

    channel.postMessage(telemetry);
  }, [
    backend,
    cameraStatus,
    currentIndex,
    error,
    inferenceMs,
    isCorrect,
    modelStatus,
    phase,
    poseAnswer,
    score,
    secondsLeft,
    selected,
    sessionId,
    streak,
  ]);

  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      const channel = channelRef.current;
      if (!channel || !sessionId) return;

      channel.postMessage({
        type: "telemetry",
        ready: true,
        phase: phaseRef.current,
        index: indexRef.current,
        cameraStatus,
        modelStatus,
        backend,
        inferenceMs,
        poseAnswer,
        selected,
        isCorrect,
        secondsLeft,
        score: scoreRef.current,
        streak: streakRef.current,
        error: error || undefined,
      } satisfies DisplayTelemetry);
    }, 1000);

    return () => window.clearInterval(heartbeat);
  }, [
    backend,
    cameraStatus,
    error,
    inferenceMs,
    isCorrect,
    modelStatus,
    poseAnswer,
    secondsLeft,
    selected,
    sessionId,
  ]);

  const retryVision = () => {
    void bootVision(true);
  };

  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      void document.documentElement.requestFullscreen();
    } else {
      void document.exitFullscreen();
    }
  };

  const showQuestion =
    phase === "question" ||
    phase === "answered" ||
    (phase === "paused" && pausedFromRef.current === "question");

  if (phase === "finished") {
    return (
      <main className="pose-display-finished">
        <div>
          <span>✓</span>
          <p>POSE QUIZ AI</p>
          <h1>Phiên đã kết thúc</h1>
          <strong>{score.toLocaleString("vi-VN")} điểm</strong>
        </div>
      </main>
    );
  }

  return (
    <main className="pose-game-shell pose-display-shell">
      <header className="pose-game-topbar">
        <div className="pose-display-brand">
          <p>POSE QUIZ AI</p>
          <b>STUDENT DISPLAY</b>
        </div>

        <div className="pose-display-question-count">
          {questions.length
            ? "CÂU " + (currentIndex + 1) + " / " + questions.length
            : "ĐANG TẢI CÂU HỎI"}
        </div>

        <div className="pose-tech-status">
          <span className={cameraStatus.includes("sẵn sàng") ? "ok" : ""}>CAM</span>
          <span className={modelStatus.includes("sẵn sàng") ? "ok" : ""}>AI</span>
          <span>{backend.toUpperCase()}</span>
          {inferenceMs !== null && <span>{inferenceMs} ms</span>}
        </div>

        <button className="pose-display-fullscreen" onClick={enterFullscreen} type="button">
          ⛶ Toàn màn hình
        </button>

        <div className="pose-score-box">
          <small>SCORE</small>
          <strong>{score.toLocaleString("vi-VN")}</strong>
          <em>COMBO ×{Math.max(1, streak)}</em>
        </div>
      </header>

      <section className="pose-game-grid">
        <aside className={"pose-question-panel " + (!showQuestion ? "concealed" : "")}>
          {showQuestion && currentQuestion ? (
            <>
              <div className="pose-question-kicker">
                <span>QUESTION {String(currentIndex + 1).padStart(2, "0")}</span>
                <b>{currentQuestion.seconds}s</b>
              </div>

              <h1>{currentQuestion.prompt}</h1>

              <div className="pose-answer-list">
                {ANSWERS.map((answer) => {
                  const detected = poseAnswer === answer && phase === "question";
                  const correctAfterAnswer =
                    phase === "answered" && currentQuestion.correct === answer;
                  const wrongSelection =
                    phase === "answered" &&
                    selected === answer &&
                    selected !== currentQuestion.correct;

                  return (
                    <article
                      className={[
                        detected ? "detected" : "",
                        correctAfterAnswer ? "correct" : "",
                        wrongSelection ? "wrong" : "",
                      ].filter(Boolean).join(" ")}
                      key={answer}
                    >
                      <b>{answer}</b>
                      <span>{currentQuestion.options[answer]}</span>
                      <small>{POSE_LABELS[answer].title}</small>
                    </article>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="pose-question-concealed">
              <span>⚡</span>
              <p>POSE QUIZ AI</p>
              <h1>
                {phase === "countdown"
                  ? "Chuẩn bị!"
                  : phase === "paused"
                    ? "Đang tạm dừng"
                    : phase === "error"
                      ? "AI cần khởi động lại"
                      : "Chờ câu hỏi tiếp theo"}
              </h1>
              <small>
                Câu hỏi và đáp án đúng được điều khiển riêng từ Teacher Console.
              </small>
            </div>
          )}
        </aside>

        <section className="pose-camera-column">
          <div className="pose-camera-frame">
            <div className="pose-scanline" />
            <div className="pose-corner top-left" />
            <div className="pose-corner top-right" />
            <div className="pose-corner bottom-left" />
            <div className="pose-corner bottom-right" />

            <video autoPlay muted playsInline ref={videoRef} />
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

            {phase === "countdown" && (
              <div className="pose-presenter-countdown" key={countdown}>
                <small>SẴN SÀNG</small>
                <strong>{countdown || "GO"}</strong>
              </div>
            )}

            {phase === "paused" && (
              <div className="pose-presenter-paused">
                <span>Ⅱ</span>
                <strong>TẠM DỪNG</strong>
              </div>
            )}

            {phase === "error" && (
              <div className="pose-presenter-error">
                <span>⚠</span>
                <strong>AI TẠM DỪNG</strong>
                <p>{error || "Không thể chạy nhận diện."}</p>
                <button onClick={retryVision} type="button">Thử lại AI</button>
              </div>
            )}
          </div>

          <div className="pose-countdown-row">
            <div
              className={"pose-timer " + (secondsLeft <= 3 && phase === "question" ? "danger" : "")}
              style={{
                background:
                  "conic-gradient(#59f2d5 " +
                  Math.max(
                    0,
                    Math.min(
                      100,
                      currentQuestion && currentQuestion.seconds
                        ? (secondsLeft / currentQuestion.seconds) * 100
                        : 0,
                    ),
                  ) +
                  "%, rgba(255,255,255,.1) 0)",
              }}
            >
              <div>
                <strong>{phase === "question" ? secondsLeft : "—"}</strong>
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
              <span>
                {phase === "question"
                  ? "Giữ ổn định ~0,8 giây để khóa đáp án."
                  : "AI vẫn theo dõi cơ thể nhưng chưa chốt đáp án."}
              </span>
            </div>
          </div>
        </section>
      </section>

      {phase === "answered" && currentQuestion && (
        <div className={"pose-feedback " + (isCorrect ? "correct" : "wrong")}>
          <span>{isCorrect ? "✓" : selected ? "×" : "⌛"}</span>
          <div>
            <small>{isCorrect ? "CHÍNH XÁC" : selected ? "CHƯA ĐÚNG" : "HẾT GIỜ"}</small>
            <strong>
              Đáp án đúng: {currentQuestion.correct} ·{" "}
              {currentQuestion.options[currentQuestion.correct]}
            </strong>
          </div>
        </div>
      )}
    </main>
  );
}
