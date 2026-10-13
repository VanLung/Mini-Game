"use client";

import { NpcCharacter, type NpcModel } from "./NpcCharacter";
import { Ufo, type UfoPhase } from "./Ufo";

export function RandomArena({
  npcs,
  ufoPhase,
  targetId,
  busy,
  onStart,
  onReset,
  canReset,
}: {
  npcs: NpcModel[];
  ufoPhase: UfoPhase;
  targetId: string | null;
  busy: boolean;
  onStart: () => void;
  onReset: () => void;
  canReset: boolean;
}) {
  const target = targetId ? npcs.find((npc) => npc.id === targetId) : undefined;
  const visibleCount = npcs.filter((npc) => npc.status !== "abducted").length;
  const scale = visibleCount <= 28
    ? 1
    : Math.max(0.44, 1 - (visibleCount - 28) / 155);

  return (
    <section className="rn-arena">
      <div className="rn-arena-sky">
        <i /><i /><i /><i /><i />
      </div>
      <div className="rn-arena-ground">
        <div className="rn-ring rn-ring-a" />
        <div className="rn-ring rn-ring-b" />
        {npcs.map((npc) => (
          <NpcCharacter
            highlighted={npc.id === targetId && ufoPhase === "abducting"}
            key={npc.id}
            npc={npc}
            scale={scale}
          />
        ))}
        <div className="rn-teacher" aria-label="Giáo viên">
          <span>GIÁO VIÊN</span>
          <div><i /><b>🙈</b></div>
        </div>
      </div>

      <Ufo phase={ufoPhase} targetX={target?.x ?? 50} />

      <div className="rn-controls">
        <div>
          <b>{visibleCount}</b>
          <span>nhân vật còn trong đấu trường</span>
        </div>
        <button disabled={busy || visibleCount === 0} onClick={onStart} type="button">
          {busy ? "🛸 UFO ĐANG HOẠT ĐỘNG..." : "🛸 BẮT ĐẦU GỌI TÊN"}
        </button>
        {canReset && (
          <button className="rn-reset" disabled={busy} onClick={onReset} type="button">
            Làm mới lượt
          </button>
        )}
      </div>
    </section>
  );
}
