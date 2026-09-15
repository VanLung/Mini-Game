"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Podium } from "@/components/Podium";
import type { AnswerRecord, RoomView } from "@/lib/game-types";

type Credentials = { version: 1; playerId: string; playerToken: string; name: string };
type AnswerResponse = { answer: AnswerRecord; totalScore: number };

const PLAYER_POLL_MS = {
  connecting: 1_000,
  lobby: 3_000,
  answering: 900,
  waiting: 2_500,
  leaderboard: 2_000,
  hidden: 15_000,
} as const;

export function PlayerGame({ code }: { code: string }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState(-1);

  useEffect(() => {
    const raw = window.localStorage.getItem(`cyber-city-player:${code}`);
    if (!raw) return;
    try {
      const stored = JSON.parse(raw) as Credentials;
      if (stored.version === 1 && stored.playerId && stored.playerToken) setCredentials(stored);
      else window.localStorage.removeItem(`cyber-city-player:${code}`);
    } catch {
      window.localStorage.removeItem(`cyber-city-player:${code}`);
    }
  }, [code]);

  const refresh = useCallback(async () => {
    if (!credentials) return;
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        cache: "no-store",
        headers: { "x-player-id": credentials.playerId, "x-player-token": credentials.playerToken },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRoom(data);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mất kết nối với phòng chơi.");
    }
  }, [code, credentials]);

  useEffect(() => {
    if (room?.status === "finished") return;

    let stopped = false;
    let poller: number | undefined;

    const delay = () => {
      if (document.hidden) return PLAYER_POLL_MS.hidden;
      if (!room) return PLAYER_POLL_MS.connecting;
      if (room.status === "lobby") return PLAYER_POLL_MS.lobby;
      if (room.status === "leaderboard") return PLAYER_POLL_MS.leaderboard;
      return room.myAnswer || answerResult ? PLAYER_POLL_MS.waiting : PLAYER_POLL_MS.answering;
    };

    const poll = async () => {
      await refresh();
      if (!stopped) poller = window.setTimeout(poll, delay());
    };

    const handleVisibility = () => {
      if (poller) window.clearTimeout(poller);
      if (!stopped) poller = window.setTimeout(poll, document.hidden ? PLAYER_POLL_MS.hidden : 0);
    };

    void poll();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopped = true;
      if (poller) window.clearTimeout(poller);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [answerResult, refresh, room?.myAnswer, room?.status]);

  useEffect(() => {
    const nextQuestion = room?.question?.index ?? -1;
    if (nextQuestion !== lastQuestion) {
      setAnswerResult(null);
      setLastQuestion(nextQuestion);
    }
  }, [lastQuestion, room?.question?.index]);

  const submitAnswer = useCallback(async (optionId: string) => {
    if (!credentials || answering || room?.myAnswer) return;
    setAnswering(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "answer", optionId, playerId: credentials.playerId, playerToken: credentials.playerToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setAnswerResult(data);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi đáp án.");
    } finally {
      setAnswering(false);
    }
  }, [answering, code, credentials, refresh, room?.myAnswer]);

  const persistedResult: AnswerResponse | null = answerResult ?? (room?.myAnswer
    ? { answer: room.myAnswer, totalScore: room.me?.score ?? 0 }
    : null);

  if (!credentials) return <main className="center-message"><h1>Bạn chưa vào phòng</h1><p>Nhập mã phòng và tên ở trang chủ trước nhé.</p><Link href="/">Vào trang chủ</Link></main>;
  if (!room) return <main className="center-message"><div className="spinner" /><p>Đang vào Cyber City...</p>{error && <span>{error}</span>}</main>;

  return (
    <main className="player-shell">
      <header className="player-topbar"><span>PIN {code}</span><strong>{room.me?.name}</strong><b>{(room.me?.score ?? 0).toLocaleString("vi-VN")} điểm</b></header>

      {room.status === "lobby" && <section className="waiting-screen"><div className="waiting-orb">👾</div><p>BẠN ĐÃ VÀO PHÒNG</p><h1>Chào {room.me?.name}!</h1><span>Đang chờ giáo viên bắt đầu...</span><div className="waiting-dots"><i /><i /><i /></div><small>{room.playerCount} người chơi đã sẵn sàng</small></section>}

      {room.status === "question" && room.question && !persistedResult && (
        <section className="player-question">
          <div className="mobile-question-meta"><span>Câu {room.question.index + 1}/{room.question.total}</span><b>{room.question.category}</b></div>
          <h1>{room.question.prompt}</h1>
          <div className="mobile-option-grid">{room.question.options.map((option, index) => <button className={`mobile-option option-${index}`} disabled={answering} key={option.id} onClick={() => submitAnswer(option.id)}><b>{["▲", "◆", "●", "■"][index]}</b><span>{option.label}</span></button>)}</div>
          <p className="tap-hint">Chọn một đáp án — càng nhanh càng nhiều điểm</p>
        </section>
      )}

      {room.status === "question" && persistedResult && (
        <section className={`feedback-screen ${persistedResult.answer.correct ? "feedback-correct" : "feedback-wrong"}`}>
          <div className="feedback-emoji">{persistedResult.answer.correct ? "🚀" : "🐔"}</div><p>{persistedResult.answer.correct ? "CHÍNH XÁC" : "CHƯA ĐÚNG"}</p><h1>{persistedResult.answer.reaction}</h1><div className="points-earned">+{persistedResult.answer.points.toLocaleString("vi-VN")}</div><span>Tổng điểm: {persistedResult.totalScore.toLocaleString("vi-VN")}</span><small>Chờ các bạn khác trả lời...</small>
        </section>
      )}

      {room.status === "leaderboard" && (
        <section className="player-ranking"><p className="screen-kicker">KẾT QUẢ CÂU {room.question ? room.question.index + 1 : ""}</p><h1>Hạng của bạn: <em>#{room.me?.rank}</em></h1>{room.question && <div className="student-explanation"><b>Đáp án đúng: {room.question.correctOption}</b><span>{room.question.explanation}</span></div>}<div className="ranking-list compact-list">{room.leaderboard.slice(0, 5).map((player) => <div className={player.id === room.me?.id ? "rank is-me" : "rank"} key={player.id}><b>{player.rank}</b><span>{player.name}</span><strong>{player.score.toLocaleString("vi-VN")}</strong></div>)}</div><p className="wait-next">Giáo viên đang chuẩn bị câu tiếp theo...</p></section>
      )}

      {room.status === "finished" && <section className="player-finish"><p className="screen-kicker">KẾT THÚC</p><h1>Cyber City đã an toàn!</h1><Podium players={room.leaderboard} /><div className="my-final-rank"><span>Thứ hạng của bạn</span><strong>#{room.me?.rank}</strong><b>{room.me?.score.toLocaleString("vi-VN")} điểm</b></div><Link href="/">Chơi phòng khác</Link></section>}
      {error && <div className="toast-error" role="alert">{error}</div>}
    </main>
  );
}
