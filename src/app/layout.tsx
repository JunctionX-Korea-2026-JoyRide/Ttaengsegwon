import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "땡세권 (Ttaengsegwon) - AI 생활권 입지 분석",
  description:
    "MCP 기반 실시간 공공데이터 및 편의시설, 치안, 교통 분석 AI 챗봇",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
