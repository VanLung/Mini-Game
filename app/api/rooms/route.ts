import { randomBytes } from "node:crypto";
import { createRoom, storageReady } from "@/lib/room-store";
import type { GameRoom } from "@/lib/game-types";

export const runtime = "nodejs";

function roomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST() {
  if (!storageReady()) {
    return Response.json({ error: "Kho dữ liệu chưa được cấu hình." }, { status: 503 });
  }

  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = roomCode();
    const hostToken = randomBytes(24).toString("hex");
    const room: GameRoom = {
      code,
      hostToken,
      status: "lobby",
      currentQuestion: -1,
      timeLimit: 20,
      questionStartedAt: null,
      createdAt: Date.now(),
      revision: 1,
      players: {},
      answers: {},
      throws: {},
    };
    if (await createRoom(room)) return Response.json({ code, hostToken });
  }

  return Response.json({ error: "Không thể tạo mã phòng. Vui lòng thử lại." }, { status: 503 });
}
