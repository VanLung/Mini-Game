import { avatarFor } from "@/lib/game-cosmetics";

export function GameAvatar({ avatarId, size = "medium", hit = false }: { avatarId?: string; size?: "small" | "medium" | "large"; hit?: boolean }) {
  const avatar = avatarFor(avatarId);
  return (
    <span
      className={`game-avatar avatar-${size}${hit ? " avatar-hit" : ""}`}
      style={{ "--avatar-color": avatar.color } as React.CSSProperties}
      title={avatar.name}
      aria-label={avatar.name}
    >
      {avatar.emoji}
    </span>
  );
}
