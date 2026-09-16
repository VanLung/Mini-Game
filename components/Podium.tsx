import type { PublicPlayer } from "@/lib/game-types";
import { GameAvatar } from "@/components/GameAvatar";

export function Podium({ players }: { players: PublicPlayer[] }) {
  const top = players.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  return (
    <div className="podium" aria-label="Top 3 người chơi">
      {order.map((player, index) => {
        if (!player) return <div className="podium-empty" key={`empty-${index}`} />;
        const place = index === 0 ? 2 : index === 1 ? 1 : 3;
        return <div className={`podium-place place-${place}`} key={player.id}><div className="podium-avatar"><GameAvatar avatarId={player.avatarId} /></div><strong>{player.name}</strong><span>{player.score.toLocaleString("vi-VN")} điểm · 🎯 {player.hitsLanded}</span><div className="podium-block"><b>{place}</b></div></div>;
      })}
    </div>
  );
}
