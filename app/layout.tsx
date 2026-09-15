import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đại chiến Cyber City | Tin học 10",
  description: "Trò chơi tương tác nhiều người dành cho Bài 2 Tin học 10.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
