"use client";

export type UfoPhase =
  | "hidden"
  | "entering"
  | "hovering"
  | "beam-on"
  | "abducting"
  | "leaving";

export function Ufo({
  phase,
  targetX = 50,
}: {
  phase: UfoPhase;
  targetX?: number;
}) {
  if (phase === "hidden") return null;

  const beamVisible = phase === "beam-on" || phase === "abducting";

  return (
    <div
      className={`rn-ufo rn-ufo-${phase}`}
      style={{ left: `${Math.max(14, Math.min(86, targetX))}%` }}
      aria-hidden="true"
    >
      <div className="rn-ufo-craft">
        <div className="rn-ufo-dome" />
        <div className="rn-ufo-body">
          <i /><i /><i /><i /><i />
        </div>
      </div>
      {beamVisible && <div className="rn-ufo-beam"><i /></div>}
    </div>
  );
}
