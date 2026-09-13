import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HOLOCRON | 한국어 스타워즈 뉴스",
  description: "스타워즈의 모든 소식, 하나의 아카이브. 공식 발표와 해외 매체의 뉴스를 한국어로 만나보세요.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
