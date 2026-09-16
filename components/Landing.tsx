"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AVATARS } from "@/lib/game-cosmetics";
import type { AvatarId } from "@/lib/game-cosmetics";

export function Landing() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [avatarId, setAvatarId] = useState<AvatarId>("robot");
  const [busy, setBusy] = useState<"host" | "join" | null>(null);
  const [error, setError] = useState("");

  async function createGame() {
    setBusy("host");
    setError("");
    try {
      const response = await fetch("/api/rooms", { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.sessionStorage.setItem(`cyber-city-host:${data.code}`, data.hostToken);
      router.push(`/host/${data.code}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể tạo phòng.");
      setBusy(null);
    }
  }

  async function joinGame(event: React.FormEvent) {
    event.preventDefault();
    const cleanCode = code.replace(/\D/g, "");
    if (cleanCode.length !== 6 || name.trim().length < 2) {
      setError("Hãy nhập mã phòng 6 số và tên có ít nhất 2 ký tự.");
      return;
    }
    setBusy("join");
    setError("");
    try {
      const response = await fetch(`/api/rooms/${cleanCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", name, avatarId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      window.localStorage.setItem(
        `cyber-city-player:${cleanCode}`,
        JSON.stringify({ version: 1, playerId: data.playerId, playerToken: data.playerToken, name: data.name, avatarId: data.avatarId }),
      );
      router.push(`/play/${cleanCode}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Không thể vào phòng.");
      setBusy(null);
    }
  }

  return (
    <main className="landing-shell">
      <div className="bubble bubble-one" />
      <div className="bubble bubble-two" />
      <section className="landing-card">
        <div className="game-logo" aria-hidden="true"><span>4.0</span></div>
        <p className="landing-kicker">TIN HỌC 10 · BÀI 2</p>
        <h1>Đại chiến<br /><em>Cyber City</em></h1>
        <p className="landing-lead">Vào phòng, chọn thật nhanh, leo bảng xếp hạng!</p>

        <div className="entry-grid">
          <form className="join-panel" onSubmit={joinGame}>
            <span className="panel-number">01</span>
            <div><h2>Học sinh</h2><p>Nhập mã trên màn hình giáo viên</p></div>
            <label><span>Mã phòng</span><input inputMode="numeric" maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} placeholder="123 456" aria-label="Mã phòng" /></label>
            <label><span>Tên hiển thị</span><input maxLength={22} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Minh Anh" aria-label="Tên hiển thị" /></label>
            <fieldset className="avatar-picker">
              <legend>Chọn chiến binh</legend>
              {AVATARS.map((avatar) => (
                <button
                  aria-label={avatar.name}
                  aria-pressed={avatar.id === avatarId}
                  className={avatar.id === avatarId ? "selected" : ""}
                  key={avatar.id}
                  onClick={() => setAvatarId(avatar.id)}
                  title={avatar.name}
                  type="button"
                >
                  {avatar.emoji}
                </button>
              ))}
            </fieldset>
            <button className="primary-button coral" disabled={busy !== null} type="submit">{busy === "join" ? "Đang vào..." : "Vào chơi →"}</button>
          </form>

          <div className="host-panel">
            <span className="panel-number">02</span>
            <div><h2>Giáo viên</h2><p>Tạo phòng và điều khiển trò chơi</p></div>
            <div className="host-illustration" aria-hidden="true"><span>◒</span><span>△</span><span>◇</span></div>
            <button className="primary-button dark" disabled={busy !== null} type="button" onClick={createGame}>{busy === "host" ? "Đang tạo..." : "Tạo phòng mới"}</button>
          </div>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
      </section>
    </main>
  );
}
