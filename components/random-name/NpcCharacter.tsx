"use client";

export type NpcStatus =
  | "idle"
  | "walking"
  | "running"
  | "drinking"
  | "sweeping"
  | "surprised"
  | "lifting"
  | "abducted"
  | "falling"
  | "fainted"
  | "recovering";

export type OutfitType = "street" | "baba" | "briefs";
export type ActivityType = "walk" | "drink" | "sweep" | "idle";

export type NpcModel = {
  id: string;
  name: string;
  outfit: OutfitType;
  activity: ActivityType;
  status: NpcStatus;
  x: number;
  y: number;
  hue: number;
  variant: number;
};

function activityIcon(activity: ActivityType) {
  if (activity === "drink") return "🥤";
  if (activity === "sweep") return "🧹";
  if (activity === "walk") return "💨";
  return "";
}

export function baseStatusFor(activity: ActivityType): NpcStatus {
  if (activity === "drink") return "drinking";
  if (activity === "sweep") return "sweeping";
  if (activity === "walk") return "walking";
  return "idle";
}

export function NpcCharacter({
  npc,
  scale,
  highlighted = false,
}: {
  npc: NpcModel;
  scale: number;
  highlighted?: boolean;
}) {
  if (npc.status === "abducted") return null;

  return (
    <div
      className="rn-npc-slot"
      data-highlighted={highlighted ? "true" : "false"}
      style={{
        left: `${npc.x}%`,
        top: `${npc.y}%`,
        zIndex: Math.round(npc.y * 10),
        transform: `translate(-50%, -50%) scale(${scale})`,
      }}
    >
      <div
        className={`rn-npc rn-status-${npc.status} rn-outfit-${npc.outfit} rn-variant-${npc.variant}`}
        style={{ "--npc-hue": npc.hue } as React.CSSProperties}
      >
        <span className="rn-name-tag">{npc.name}</span>
        <span className="rn-activity" aria-hidden="true">{activityIcon(npc.activity)}</span>
        <div className="rn-body" aria-hidden="true">
          <i className="rn-hair" />
          <i className="rn-head"><b /><b /></i>
          <i className="rn-torso" />
          <i className="rn-arm rn-arm-left" />
          <i className="rn-arm rn-arm-right" />
          <i className="rn-leg rn-leg-left" />
          <i className="rn-leg rn-leg-right" />
        </div>
      </div>
    </div>
  );
}
