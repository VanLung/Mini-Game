import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Đại chiến Cyber City 4.0 | Tin học 10",
  description: "Mini game Bài 2 Tin học 10 về thiết bị thông minh và vai trò của Tin học đối với xã hội.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
