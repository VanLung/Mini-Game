export type AnswerKey = "A" | "B" | "C" | "D";

export type PoseQuestion = {
  id: string;
  prompt: string;
  options: Record<AnswerKey, string>;
  correct: AnswerKey;
  seconds: number;
};

export type TeacherCommand =
  | { type: "sync"; index: number; paused: boolean; sessionId: string }
  | { type: "prepare"; index: number }
  | { type: "start"; index: number }
  | { type: "pause" }
  | { type: "resume" }
  | { type: "reset"; index: number }
  | { type: "shutdown" };

export type DisplayTelemetry = {
  type: "telemetry";
  ready: boolean;
  phase: "booting" | "standby" | "countdown" | "question" | "answered" | "paused" | "finished" | "error";
  index: number;
  cameraStatus: string;
  modelStatus: string;
  backend: string;
  inferenceMs: number | null;
  poseAnswer: AnswerKey | null;
  selected: AnswerKey | null;
  isCorrect: boolean | null;
  secondsLeft: number;
  score: number;
  streak: number;
  error?: string;
};

export const POSE_QUESTIONS_KEY = "lunix-pose-quiz-questions-v2";
export const POSE_SESSION_KEY = "lunix-pose-quiz-session-v2";
export const ANSWERS: AnswerKey[] = ["A", "B", "C", "D"];
export const HOLD_MS = 800;

export const POSE_LABELS: Record<AnswerKey, { title: string; hint: string; icon: string }> = {
  A: { title: "GIƠ TAY TRÁI", hint: "Một tay trái lên cao", icon: "🙋" },
  B: { title: "GIƠ TAY PHẢI", hint: "Một tay phải lên cao", icon: "🙋‍♂️" },
  C: { title: "GIƠ HAI TAY", hint: "Cả hai tay lên cao", icon: "🙌" },
  D: { title: "DANG HAI TAY", hint: "Hai tay dang ngang", icon: "🧍" },
};

export const DEFAULT_POSE_QUESTIONS: PoseQuestion[] = [
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

export function createPoseQuestion(): PoseQuestion {
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

export function clampQuestionSeconds(value: number) {
  if (!Number.isFinite(value)) return 12;
  return Math.min(60, Math.max(5, Math.round(value)));
}

export function sanitizePoseQuestions(questions: PoseQuestion[]): PoseQuestion[] {
  return questions.map((question) => ({
    ...question,
    prompt: question.prompt.trim(),
    options: {
      A: question.options.A.trim(),
      B: question.options.B.trim(),
      C: question.options.C.trim(),
      D: question.options.D.trim(),
    },
    seconds: clampQuestionSeconds(question.seconds),
  }));
}

export function validatePoseQuestions(questions: PoseQuestion[]): string | null {
  if (!questions.length) return "Cần ít nhất 1 câu hỏi.";
  if (
    questions.some(
      (question) =>
        !question.prompt.trim() ||
        ANSWERS.some((answer) => !question.options[answer].trim()),
    )
  ) {
    return "Hãy hoàn thiện nội dung và đủ 4 đáp án cho mọi câu hỏi, hoặc xóa câu chưa dùng.";
  }
  return null;
}

export function loadPoseQuestions(): PoseQuestion[] {
  if (typeof window === "undefined") return DEFAULT_POSE_QUESTIONS;
  try {
    const raw = window.localStorage.getItem(POSE_QUESTIONS_KEY);
    if (!raw) return DEFAULT_POSE_QUESTIONS;
    const parsed = JSON.parse(raw) as PoseQuestion[];
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_POSE_QUESTIONS;
    return sanitizePoseQuestions(parsed);
  } catch {
    return DEFAULT_POSE_QUESTIONS;
  }
}

export function savePoseQuestions(questions: PoseQuestion[]) {
  const cleaned = sanitizePoseQuestions(questions);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(POSE_QUESTIONS_KEY, JSON.stringify(cleaned));
  }
  return cleaned;
}

export function poseChannelName(sessionId: string) {
  return "lunix-pose-quiz-" + sessionId;
}
