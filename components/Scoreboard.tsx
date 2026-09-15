"use client";

export type Team = {
  id: number;
  name: string;
  score: number;
  color: string;
  boostUsed: boolean;
  boostArmed: boolean;
};

type ScoreboardProps = {
  teams: Team[];
  onRename: (teamId: number, name: string) => void;
  onScore: (teamId: number, delta: number) => void;
  onToggleBoost: (teamId: number) => void;
};

export function Scoreboard({ teams, onRename, onScore, onToggleBoost }: ScoreboardProps) {
  return (
    <aside className="scoreboard" aria-label="Bảng điểm các đội">
      <div className="scoreboard-heading">
        <span>Bảng xếp hạng</span>
        <small>Điểm được lưu tự động</small>
      </div>

      <div className="team-list">
        {teams.map((team, index) => (
          <section className="team-card" style={{ "--team-color": team.color } as React.CSSProperties} key={team.id}>
            <div className="team-rank">{index + 1}</div>
            <div className="team-main">
              <input
                className="team-name"
                aria-label={`Tên đội ${index + 1}`}
                value={team.name}
                maxLength={18}
                onChange={(event) => onRename(team.id, event.target.value)}
              />
              <strong className="team-score">{team.score}</strong>
            </div>

            <div className="score-actions" aria-label={`Điều chỉnh điểm ${team.name}`}>
              <button type="button" onClick={() => onScore(team.id, 10)} title="Đáp án đúng">
                +10
              </button>
              <button type="button" onClick={() => onScore(team.id, 5)} title="Giải thích hoặc cướp quyền">
                +5
              </button>
              <button type="button" className="minus" onClick={() => onScore(team.id, -5)} title="Trừ điểm">
                −5
              </button>
            </div>

            <button
              type="button"
              className={`boost ${team.boostArmed ? "armed" : ""}`}
              disabled={team.boostUsed}
              onClick={() => onToggleBoost(team.id)}
              aria-pressed={team.boostArmed}
            >
              {team.boostUsed ? "Đã dùng x2" : team.boostArmed ? "Đang bật x2" : "Thẻ tăng tốc x2"}
            </button>
          </section>
        ))}
      </div>
    </aside>
  );
}
