import { randomBytes } from "node:crypto";
import { quizQuestions } from "@/data/game-data";
import type { AnswerRecord, GameRoom, PublicPlayer, RoomView } from "@/lib/game-types";
import { mutateRoom, readRoom } from "@/lib/room-store";

export const runtime = "nodejs";

const CORRECT_REACTIONS = [
  "Đỉnh của chóp! 🚀",
  "Không phải dạng vừa đâu! 😎",
  "Chính xác luôn! 🎯",
  "Quá dữ! 🔥",
];
const WRONG_REACTIONS = [
  "Úi, con gà chạy lạc rồi! 🐔",
  "Thế cơ à? Câu sau phục thù nhé! 😵‍💫",
  "Suýt đúng rồi! Bình tĩnh chiến tiếp 💪",
  "Não đang tải... thử câu sau nhé! 🧠",
];

function normalizeCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function rankPlayers(room: GameRoom): PublicPlayer[] {
  return Object.values(room.players)
    .sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt)
    .map(({ id, name, score, joinedAt }, index) => ({ id, name, score, joinedAt, rank: index + 1 }));
}

function currentQuestion(room: GameRoom, reveal: boolean) {
  const question = quizQuestions[room.currentQuestion];
  if (!question) return null;
  return {
    index: room.currentQuestion,
    total: quizQuestions.length,
    round: question.round,
    category: question.category,
    title: question.title,
    prompt: question.prompt,
    options: question.options,
    timeLimit: room.timeLimit,
    startedAt: room.questionStartedAt,
    ...(reveal ? { correctOption: question.correct[0], explanation: question.explanation } : {}),
  };
}

function buildView(room: GameRoom, role: "host" | "player", playerId?: string): RoomView {
  const leaderboard = rankPlayers(room);
  const answers = room.answers[String(room.currentQuestion)] ?? {};
  const reveal = room.status === "leaderboard" || room.status === "finished" || role === "host";
  const view: RoomView = {
    code: room.code,
    status: room.status,
    timeLimit: room.timeLimit,
    playerCount: leaderboard.length,
    answeredCount: Object.keys(answers).length,
    question: currentQuestion(room, reveal),
    leaderboard,
  };
  if (role === "host") view.players = leaderboard;
  if (playerId) {
    view.me = leaderboard.find((player) => player.id === playerId);
    view.myAnswer = answers[playerId];
  }
  return view;
}

function messageFor(error: string) {
  const messages: Record<string, string> = {
    ROOM_NOT_FOUND: "Không tìm thấy phòng hoặc phòng đã hết hạn.",
    ROOM_BUSY: "Phòng đang nhận quá nhiều thao tác. Vui lòng thử lại.",
    UNAUTHORIZED: "Phiên truy cập không hợp lệ.",
    NAME_TAKEN: "Tên này đã có trong phòng. Hãy chọn tên khác.",
    GAME_STARTED: "Trò chơi đã bắt đầu, không thể tham gia thêm.",
    ALREADY_ANSWERED: "Bạn đã trả lời câu này rồi.",
    QUESTION_CLOSED: "Câu hỏi đã kết thúc.",
    INVALID_ACTION: "Thao tác không hợp lệ.",
  };
  return messages[error] ?? "Có lỗi xảy ra. Vui lòng thử lại.";
}

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  const room = await readRoom(code);
  if (!room) return Response.json({ error: messageFor("ROOM_NOT_FOUND") }, { status: 404 });

  const hostToken = request.headers.get("x-host-token");
  const playerId = request.headers.get("x-player-id") ?? undefined;
  const playerToken = request.headers.get("x-player-token");

  if (hostToken && hostToken === room.hostToken) return Response.json(buildView(room, "host"));
  if (playerId && playerToken && room.players[playerId]?.token === playerToken) {
    return Response.json(buildView(room, "player", playerId));
  }
  return Response.json({ error: messageFor("UNAUTHORIZED") }, { status: 401 });
}

export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.action !== "string") {
    return Response.json({ error: messageFor("INVALID_ACTION") }, { status: 400 });
  }

  if (body.action === "join") {
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ").slice(0, 22) : "";
    if (name.length < 2) return Response.json({ error: "Tên phải có ít nhất 2 ký tự." }, { status: 400 });
    const playerId = randomBytes(8).toString("hex");
    const playerToken = randomBytes(20).toString("hex");
    const outcome = await mutateRoom(code, (room) => {
      if (room.status !== "lobby") return { error: "GAME_STARTED" };
      if (Object.values(room.players).some((player) => player.name.localeCompare(name, "vi", { sensitivity: "base" }) === 0)) {
        return { error: "NAME_TAKEN" };
      }
      room.players[playerId] = { id: playerId, token: playerToken, name, score: 0, joinedAt: Date.now() };
      return { room, result: { playerId, playerToken, name } };
    });
    if ("error" in outcome) return Response.json({ error: messageFor(outcome.error) }, { status: 409 });
    return Response.json(outcome.result);
  }

  if (body.action === "answer") {
    const playerId = typeof body.playerId === "string" ? body.playerId : "";
    const playerToken = typeof body.playerToken === "string" ? body.playerToken : "";
    const optionId = typeof body.optionId === "string" ? body.optionId : "";
    const now = Date.now();
    const outcome = await mutateRoom(code, (room) => {
      const player = room.players[playerId];
      if (!player || player.token !== playerToken) return { error: "UNAUTHORIZED" };
      const question = quizQuestions[room.currentQuestion];
      if (room.status !== "question" || !question || !room.questionStartedAt) return { error: "QUESTION_CLOSED" };
      const elapsed = now - room.questionStartedAt;
      if (elapsed > room.timeLimit * 1000) return { error: "QUESTION_CLOSED" };
      const answerKey = String(room.currentQuestion);
      room.answers[answerKey] ??= {};
      if (room.answers[answerKey][playerId]) return { error: "ALREADY_ANSWERED" };
      if (!question.options.some((option) => option.id === optionId)) return { error: "INVALID_ACTION" };

      const correct = question.correct.includes(optionId);
      const remainingRatio = Math.max(0, 1 - elapsed / (room.timeLimit * 1000));
      const points = correct ? 500 + Math.round(500 * remainingRatio) : 0;
      const reactions = correct ? CORRECT_REACTIONS : WRONG_REACTIONS;
      const reaction = reactions[Math.floor(Math.random() * reactions.length)];
      const answer: AnswerRecord = { optionId, correct, points, answeredAt: now, reaction };
      room.answers[answerKey][playerId] = answer;
      player.score += points;
      return { room, result: { answer, totalScore: player.score } };
    });
    if ("error" in outcome) {
      const status = outcome.error === "UNAUTHORIZED" ? 401 : outcome.error === "QUESTION_CLOSED" ? 409 : 400;
      return Response.json({ error: messageFor(outcome.error) }, { status });
    }
    return Response.json(outcome.result);
  }

  if (body.action === "host") {
    const hostToken = typeof body.hostToken === "string" ? body.hostToken : "";
    const command = typeof body.command === "string" ? body.command : "";
    const outcome = await mutateRoom(code, (room) => {
      if (room.hostToken !== hostToken) return { error: "UNAUTHORIZED" };

      if (command === "setTime") {
        const seconds = Math.round(Number(body.seconds));
        if (!Number.isFinite(seconds) || seconds < 5 || seconds > 120) return { error: "INVALID_ACTION" };
        room.timeLimit = seconds;
        if (room.status === "question") room.questionStartedAt = Date.now();
        return { room, result: buildView(room, "host") };
      }

      if (command === "start" || command === "next") {
        if (room.status === "question") return { error: "INVALID_ACTION" };
        const nextIndex = room.status === "lobby" ? 0 : room.currentQuestion + 1;
        if (nextIndex >= quizQuestions.length) {
          room.status = "finished";
          room.questionStartedAt = null;
        } else {
          room.currentQuestion = nextIndex;
          room.status = "question";
          room.questionStartedAt = Date.now();
        }
        return { room, result: buildView(room, "host") };
      }

      if (command === "leaderboard") {
        if (room.status !== "question") return { error: "INVALID_ACTION" };
        room.status = "leaderboard";
        room.questionStartedAt = null;
        return { room, result: buildView(room, "host") };
      }

      if (command === "end") {
        room.status = "finished";
        room.questionStartedAt = null;
        return { room, result: buildView(room, "host") };
      }

      return { error: "INVALID_ACTION" };
    });
    if ("error" in outcome) {
      return Response.json({ error: messageFor(outcome.error) }, { status: outcome.error === "UNAUTHORIZED" ? 401 : 400 });
    }
    return Response.json(outcome.result);
  }

  return Response.json({ error: messageFor("INVALID_ACTION") }, { status: 400 });
}
