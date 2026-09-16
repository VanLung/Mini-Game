"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { GameAvatar } from "@/components/GameAvatar";
import { Podium } from "@/components/Podium";
import { throwItemFor } from "@/lib/game-cosmetics";
import type { RoomView } from "@/lib/game-types";

const HOST_POLL_MS = {
  connecting: 1_000,
  lobby: 2_000,
  question: 900,
  leaderboard: 1_500,
  finished: 60_000,
  hidden: 10_000,
} as const;

export function HostGame({ code }: { code: string }) {
  const [room, setRoom] = useState<RoomView | null>(null);
  const [hostToken, setHostToken] = useState("");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setHostToken(window.sessionStorage.getItem(`cyber-city-host:${code}`) ?? "");
  }, [code]);

  const refresh = useCallback(async () => {
    if (!hostToken) return;
    try {
      const response = await fetch(`/api/rooms/${code}`, { cache: "no-store", headers: { "x-host-token": hostToken } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRoom(data);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Mất kết nối với phòng chơi.");
    }
  }, [code, hostToken]);

  useEffect(() => {
    if (room?.status === "finished") return;

    let stopped = false;
    let poller: number | undefined;

    const delay = () => {
      if (document.hidden) return HOST_POLL_MS.hidden;
      if (!room) return HOST_POLL_MS.connecting;
      return HOST_POLL_MS[room.status];
    };

    const poll = async () => {
      await refresh();
      if (!stopped) poller = window.setTimeout(poll, delay());
    };

    const handleVisibility = () => {
      if (poller) window.clearTimeout(poller);
      if (!stopped) poller = window.setTimeout(poll, document.hidden ? HOST_POLL_MS.hidden : 0);
    };

    void poll();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      stopped = true;
      if (poller) window.clearTimeout(poller);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh, room?.status]);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(clock);
  }, []);

  const remaining = useMemo(() => {
    if (!room?.question?.startedAt || room.status !== "question") return room?.question?.timeLimit ?? 0;
    return Math.max(0, Math.ceil((room.question.startedAt + room.question.timeLimit * 1000 - now) / 1000));
  }, [now, room]);

  const command = useCallback(async (name: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/rooms/${code}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "host", command: name, hostToken, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRoom(data);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể thực hiện thao tác.");
    } finally {
      setBusy(false);
    }
  }, [code, hostToken]);

  useEffect(() => {
    if (room?.status === "question" && remaining === 0 && !busy) void command("leaderboard");
  }, [busy, command, remaining, room?.status]);

  if (!hostToken) return <main className="center-message"><h1>Không tìm thấy quyền giáo viên</h1><p>Hãy tạo một phòng mới từ trang chủ.</p><Link href="/">Về trang chủ</Link></main>;
  if (!room) return <main className="center-message"><div className="spinner" /><p>Đang kết nối phòng {code}...</p>{error && <span>{error}</span>}</main>;

  const shareUrl = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <main className="host-shell">
      <header className="host-topbar">
        <Link className="mini-brand" href="/"><b>CYBER</b><span>CITY 4.0</span></Link>
        <div className="room-code"><span>MÃ PHÒNG</span><strong>{code}</strong></div>
        <div className="player-count"><span className="live-dot" /> {room.playerCount} người chơi</div>
      </header>

      {room.status === "lobby" && (
        <section className="host-lobby">
          <div className="lobby-heading"><p>HỌC SINH TRUY CẬP</p><h1>{shareUrl.replace(/^https?:\/\//, "")}</h1><span>Nhập mã <b>{code}</b> và tên để tham gia</span></div>
          <div className="host-settings"><span>Thời gian mỗi câu</span><div className="time-picker">{[10, 15, 20, 30, 45, 60].map((seconds) => <button className={seconds === room.timeLimit ? "active" : ""} disabled={busy} key={seconds} onClick={() => command("setTime", { seconds })}>{seconds}s</button>)}</div></div>
          <div className="joined-board"><div className="joined-title"><h2>Đã vào phòng</h2><strong>{room.playerCount}</strong></div><div className="player-cloud">{room.players?.map((player, index) => <span style={{ "--delay": `${index * 35}ms` } as React.CSSProperties} key={player.id}><GameAvatar avatarId={player.avatarId} size="small" />{player.name}</span>)}{room.playerCount === 0 && <p>Đang chờ những chiến binh đầu tiên...</p>}</div></div>
          <button className="host-primary" disabled={busy || room.playerCount === 0} onClick={() => command("start")}>Bắt đầu chơi <span>→</span></button>
        </section>
      )}

      {room.status === "question" && room.question && (
        <section className="host-question">
          <div className="question-status"><span>CÂU {room.question.index + 1}/{room.question.total}</span><b>Vòng {room.question.round} · {room.question.category}</b></div>
          <div className={`big-timer ${remaining <= 5 ? "urgent" : ""}`}>{remaining}</div>
          <h1>{room.question.prompt}</h1>
          <div className="host-options">{room.question.options.map((option, index) => <div className={`color-option option-${index}`} key={option.id}><b>{["▲", "◆", "●", "■"][index]}</b><span>{option.label}</span></div>)}</div>
          <div className="answer-progress"><div><strong>{room.answeredCount}</strong><span>đã trả lời</span></div><div className="answer-progress-track"><span style={{ width: `${room.playerCount ? room.answeredCount / room.playerCount * 100 : 0}%` }} /></div><div><strong>{room.playerCount - room.answeredCount}</strong><span>đang suy nghĩ</span></div></div>
          <div className="host-controls"><button className="secondary-button" disabled={busy} onClick={() => command("setTime", { seconds: Math.min(120, room.question!.timeLimit + 10) })}>+10 giây và đặt lại</button><button className="host-primary compact" disabled={busy} onClick={() => command("leaderboard")}>Kết thúc câu</button><button className="danger-button" disabled={busy} onClick={() => command("end")}>Kết thúc game</button></div>
        </section>
      )}

      {room.status === "leaderboard" && (
        <section className="leaderboard-screen">
          <p className="screen-kicker">BẢNG XẾP HẠNG</p><h1>Ai đang dẫn đầu?</h1>
          {room.question && <div className="answer-reveal"><b>Đáp án: {room.question.correctOption}</b><span>{room.question.explanation}</span></div>}
          {room.throws.length > 0 && <div className="host-battle-feed"><strong>ĐẤU TRƯỜNG ĐANG BÙNG NỔ</strong><div>{room.throws.slice(-6).reverse().map((event) => <span key={event.id}>{throwItemFor(event.itemId).emoji} <b>{event.fromName}</b> ném trúng {event.toName}</span>)}</div></div>}
          <div className="ranking-list">{room.leaderboard.slice(0, 8).map((player) => <div className={player.rank <= 3 ? `rank top-${player.rank}` : "rank"} key={player.id}><b>{player.rank}</b><GameAvatar avatarId={player.avatarId} size="small" /><span>{player.name}<small>🎯 {player.hitsLanded} · 💥 {player.hitsReceived}</small></span><strong>{player.score.toLocaleString("vi-VN")}</strong></div>)}</div>
          <div className="host-controls"><button className="secondary-button" disabled={busy} onClick={() => command("setTime", { seconds: Math.max(5, (room.question?.timeLimit ?? 20) - 5) })}>−5 giây câu sau</button><button className="secondary-button" disabled={busy} onClick={() => command("setTime", { seconds: Math.min(120, (room.question?.timeLimit ?? 20) + 5) })}>+5 giây câu sau</button><button className="host-primary compact" disabled={busy} onClick={() => command("next")}>{room.question && room.question.index + 1 >= room.question.total ? "Xem kết quả" : "Câu tiếp theo →"}</button><button className="danger-button" disabled={busy} onClick={() => command("end")}>Kết thúc game</button></div>
        </section>
      )}

      {room.status === "finished" && <section className="finish-screen"><p className="screen-kicker">CYBER CITY ĐÃ ĐƯỢC KHÔI PHỤC</p><h1>Vinh danh chiến binh xuất sắc</h1><Podium players={room.leaderboard} /><Link className="host-primary link-button" href="/">Tạo phòng mới</Link></section>}
      {error && <div className="toast-error" role="alert">{error}</div>}
    </main>
  );
}
