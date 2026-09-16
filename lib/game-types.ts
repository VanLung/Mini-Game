import type { Option } from "@/data/game-data";
import type { AvatarId, ThrowItemId } from "@/lib/game-cosmetics";

export type RoomStatus = "lobby" | "question" | "leaderboard" | "finished";

export type PlayerRecord = {
  id: string;
  token: string;
  name: string;
  avatarId: AvatarId;
  score: number;
  joinedAt: number;
};

export type ThrowEvent = {
  id: string;
  questionIndex: number;
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  itemId: ThrowItemId;
  createdAt: number;
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
  throws: Record<string, ThrowEvent[]>;
};

export type PublicPlayer = Pick<PlayerRecord, "id" | "name" | "avatarId" | "score" | "joinedAt"> & {
  rank: number;
  hitsLanded: number;
  hitsReceived: number;
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
  throws: ThrowEvent[];
  canThrow?: boolean;
  hasThrown?: boolean;
};

export type ApiError = { error: string };
