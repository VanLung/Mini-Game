import Link from "next/link";

const games = [
  {
    href: "/cyber-city",
    eyebrow: "QUIZ NHIỀU NGƯỜI",
    title: "Đại chiến Cyber City",
    description: "Học sinh vào bằng mã phòng, trả lời câu hỏi, leo bảng xếp hạng và tương tác trong đấu trường.",
    icon: "⚡",
    className: "hub-card cyber",
    status: "Sẵn sàng",
  },
  {
    href: "/random-name",
    eyebrow: "RANDOM NAME · BỊT MẮT BẮT DÊ",
    title: "Random Name",
    description: "Đưa cả lớp vào đấu trường vòng tròn, giáo viên bịt mắt săn ngẫu nhiên một học sinh.",
    icon: "🙈",
    className: "hub-card random",
    status: "Mới",
  },
  {
    href: "/duck-race",
    eyebrow: "RANDOM NAME · DUCK RACE 3D",
    title: "Đại Loạn Ao Làng",
    description: "Đua vịt 3D đầy drama: bánh mì, UFO, dép tổ ong, CSGT ao làng và màn nước rút không ai được tin ai.",
    icon: "🦆",
    className: "hub-card duck",
    status: "Mới",
  },
];

export default function Home() {
  return (
    <main className="game-hub-shell">
      <section className="game-hub">
        <header className="hub-header">
          <div className="hub-mark">RL</div>
          <div>
            <p>ROBO LUNIX · CLASSROOM GAMES</p>
            <h1>Game Hub</h1>
            <span>Chọn trò chơi để bắt đầu. Các game mới sau này sẽ được thêm trực tiếp tại đây.</span>
          </div>
        </header>

        <div className="hub-grid">
          {games.map((game) => (
            <Link className={game.className} href={game.href} key={game.href}>
              <div className="hub-card-top">
                <span className="hub-card-icon" aria-hidden="true">{game.icon}</span>
                <b>{game.status}</b>
              </div>
              <div className="hub-card-copy">
                <p>{game.eyebrow}</p>
                <h2>{game.title}</h2>
                <span>{game.description}</span>
              </div>
              <div className="hub-card-action">Mở game <strong>→</strong></div>
            </Link>
          ))}

        </div>
      </section>
    </main>
  );
}
