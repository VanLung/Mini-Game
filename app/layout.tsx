import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Robo Lunix Game Hub",
  description: "Các trò chơi tương tác lớp học của Robo Lunix. Cyber City có 20 câu hỏi Big Mouth I và II.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
