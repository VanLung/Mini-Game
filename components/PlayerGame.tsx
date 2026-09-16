"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { GameAvatar } from "@/components/GameAvatar";
import { Podium } from "@/components/Podium";
import { THROW_ITEMS, throwItemFor } from "@/lib/game-cosmetics";
import type { AnswerRecord, RoomView, ThrowEvent } from "@/lib/game-types";

type Credentials = { version: 1; playerId: string; playerToken: string; name: string; avatarId?: string };
type AnswerResponse = { answer: AnswerRecord; totalScore: number };

const PLAYER_POLL_MS = {
  connecting: 1_000,
  lobby: 3_000,
  answering: 900,
  waiting: 2_500,
  leaderboard: 1_200,
  hidden: 15_000,
} as const;

function playGameSound(kind: "correct" | "wrong" | "throw" | "hit") {
  try {
    const AudioContextClass = window.AudioContext
      || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const patterns = {
      correct: [520, 760],
      wrong: [220, 150],
      throw: [300, 900],
      hit: [130, 90],
    };
    const [start, end] = patterns[kind];
    oscillator.type = kind === "wrong" || kind === "hit" ? "sawtooth" : "sine";
    oscillator.frequency.setValueAtTime(start, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(end, context.currentTime + .18);
    gain.gain.setValueAtTime(.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .24);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + .25);
    oscillator.addEventListener("ended", () => void context.close());
  } catch {
    // Trình duyệt có thể chặn âm thanh trước lần tương tác đầu tiên.
  }
}

export function PlayerGame({ code }: { code: string }) {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [room, setRoom] = useState<RoomView | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResponse | null>(null);
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState("");
  const [lastQuestion, setLastQuestion] = useState(-1);
  const [muted, setMuted] = useState(false);
  const [throwing, setThrowing] = useState(false);
  const [outgoingThrow, setOutgoingThrow] = useState<ThrowEvent | null>(null);
  const [incomingHit, setIncomingHit] = useState<ThrowEvent | null>(null);
  const seenThrows = useRef(new Set<string>());

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

  useEffect(() => {
    setMuted(window.localStorage.getItem("cyber-city-muted") === "1");
  }, []);

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
      if (!muted) playGameSound(data.answer.correct ? "correct" : "wrong");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể gửi đáp án.");
    } finally {
      setAnswering(false);
    }
  }, [answering, code, credentials, muted, refresh, room?.myAnswer]);

  const throwItem = useCallback(async (itemId: string) => {
    if (!credentials || throwing || !room?.canThrow) return;
    setThrowing(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "throw", itemId, playerId: credentials.playerId, playerToken: credentials.playerToken }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOutgoingThrow(data.event);
      seenThrows.current.add(data.event.id);
      if (!muted) playGameSound("throw");
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể ném vật phẩm.");
    } finally {
      setThrowing(false);
    }
  }, [code, credentials, muted, refresh, room?.canThrow, throwing]);

  useEffect(() => {
    if (!credentials) return;
    const unseen = [...(room?.throws ?? [])].reverse().find((event) => event.toId === credentials.playerId && !seenThrows.current.has(event.id));
    for (const event of room?.throws ?? []) seenThrows.current.add(event.id);
    if (!unseen) return;
    setIncomingHit(unseen);
    if (!muted) playGameSound("hit");
    const timer = window.setTimeout(() => setIncomingHit(null), 2600);
    return () => window.clearTimeout(timer);
  }, [credentials, muted, room?.throws]);

  const toggleSound = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      window.localStorage.setItem("cyber-city-muted", next ? "1" : "0");
      if (!next) playGameSound("correct");
      return next;
    });
  }, []);

  const persistedResult: AnswerResponse | null = answerResult ?? (room?.myAnswer
    ? { answer: room.myAnswer, totalScore: room.me?.score ?? 0 }
    : null);

  if (!credentials) return <main className="center-message"><h1>Bạn chưa vào phòng</h1><p>Nhập mã phòng và tên ở trang chủ trước nhé.</p><Link href="/">Vào trang chủ</Link></main>;
  if (!room) return <main className="center-message"><div className="spinner" /><p>Đang vào Cyber City...</p>{error && <span>{error}</span>}</main>;

  return (
    <main className="player-shell">
      <header className="player-topbar"><span>PIN {code}</span><div className="player-identity"><GameAvatar avatarId={room.me?.avatarId} size="small" /><strong>{room.me?.name}</strong></div><div className="player-score"><b>{(room.me?.score ?? 0).toLocaleString("vi-VN")} điểm</b><button aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"} onClick={toggleSound} type="button">{muted ? "🔇" : "🔊"}</button></div></header>

      {room.status === "lobby" && <section className="waiting-screen"><div className="avatar-stage"><GameAvatar avatarId={room.me?.avatarId} size="large" /></div><p>BẠN ĐÃ VÀO ĐẤU TRƯỜNG</p><h1>Chào {room.me?.name}!</h1><span>Trả lời đúng để mở khóa vật phẩm ném vui.</span><div className="waiting-dots"><i /><i /><i /></div><small>{room.playerCount} chiến binh đã sẵn sàng</small></section>}

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
        <section className="player-ranking">
          <p className="screen-kicker">KẾT QUẢ CÂU {room.question ? room.question.index + 1 : ""}</p><h1>Hạng của bạn: <em>#{room.me?.rank}</em></h1>
          {room.question && <div className="student-explanation"><b>Đáp án đúng: {room.question.correctOption}</b><span>{room.question.explanation}</span></div>}
          {room.canThrow && <div className="throw-panel"><p>🎯 THƯỞNG TRẢ LỜI ĐÚNG</p><h2>Chọn một món để ném vui!</h2><span>Hệ thống sẽ chọn ngẫu nhiên một bạn trả lời sai.</span><div>{THROW_ITEMS.map((item) => <button disabled={throwing} key={item.id} onClick={() => throwItem(item.id)} type="button"><b>{item.emoji}</b><small>{item.name}</small></button>)}</div></div>}
          {outgoingThrow && <div className="throw-result">{throwItemFor(outgoingThrow.itemId).emoji} Ném trúng <b>{outgoingThrow.toName}</b>!</div>}
          {!room.canThrow && room.hasThrown && <div className="throw-result done">✅ Lượt ném đã sử dụng — chờ câu tiếp theo!</div>}
          {!room.canThrow && !room.hasThrown && room.myAnswer?.correct && <div className="throw-result peaceful">🌟 Không có bạn trả lời sai — cả lớp quá đỉnh!</div>}
          <div className="ranking-list compact-list">{room.leaderboard.slice(0, 5).map((player) => <div className={player.id === room.me?.id ? "rank is-me" : "rank"} key={player.id}><b>{player.rank}</b><GameAvatar avatarId={player.avatarId} size="small" /><span>{player.name}</span><strong>{player.score.toLocaleString("vi-VN")}</strong></div>)}</div>
          {room.throws.length > 0 && <div className="battle-feed">{room.throws.slice(-3).reverse().map((event) => <span key={event.id}>{throwItemFor(event.itemId).emoji} <b>{event.fromName}</b> → {event.toName}</span>)}</div>}
          <p className="wait-next">Giáo viên đang chuẩn bị câu tiếp theo...</p>
        </section>
      )}

      {room.status === "finished" && <section className="player-finish"><p className="screen-kicker">KẾT THÚC</p><h1>Cyber City đã an toàn!</h1><Podium players={room.leaderboard} /><div className="my-final-rank"><GameAvatar avatarId={room.me?.avatarId} /><span>Hạng #{room.me?.rank}</span><b>{room.me?.score.toLocaleString("vi-VN")} điểm</b><small>🎯 {room.me?.hitsLanded ?? 0} trúng · 💥 {room.me?.hitsReceived ?? 0} lần bị ném</small></div><Link href="/">Chơi phòng khác</Link></section>}
      {incomingHit && <div className="hit-overlay" role="status"><div className="projectile">{throwItemFor(incomingHit.itemId).emoji}</div><div className="splat">{throwItemFor(incomingHit.itemId).splat}</div><GameAvatar avatarId={room.me?.avatarId} size="large" hit /><h2>{incomingHit.fromName} vừa ném trúng bạn!</h2><p>Không sao, câu sau phục thù nhé 😵‍💫</p></div>}
      {error && <div className="toast-error" role="alert">{error}</div>}
    </main>
  );
}
