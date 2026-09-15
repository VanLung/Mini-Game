import type { Option } from "@/data/game-data";

export type RoomStatus = "lobby" | "question" | "leaderboard" | "finished";

export type PlayerRecord = {
  id: string;
  token: string;
  name: string;
  score: number;
  joinedAt: number;
};

export type AnswerRecord = {
  optionId: string;
  correct: boolean;
  points: number;
  answeredAt: number;
  reaction: string;
};

export type GameRoom = {
  code: string;
  hostToken: string;
  status: RoomStatus;
  currentQuestion: number;
  timeLimit: number;
  questionStartedAt: number | null;
  createdAt: number;
  revision: number;
  players: Record<string, PlayerRecord>;
  answers: Record<string, Record<string, AnswerRecord>>;
};

export type PublicPlayer = Pick<PlayerRecord, "id" | "name" | "score" | "joinedAt"> & {
  rank: number;
};

export type PublicQuestion = {
  index: number;
  total: number;
  round: number;
  category: string;
  title: string;
  prompt: string;
  options: Option[];
  timeLimit: number;
  startedAt: number | null;
  correctOption?: string;
  explanation?: string;
};

export type RoomView = {
  code: string;
  status: RoomStatus;
  timeLimit: number;
  playerCount: number;
  answeredCount: number;
  question: PublicQuestion | null;
  leaderboard: PublicPlayer[];
  players?: PublicPlayer[];
  me?: PublicPlayer;
  myAnswer?: AnswerRecord;
};

export type ApiError = { error: string };
