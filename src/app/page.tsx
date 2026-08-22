import { ModeSelectButton } from "@/components/modeSelectButton";
import { NeighborhoodChatBar } from "@/components/neighborhoodChatBar";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      {/* 타이틀 영역 */}
      <div className="text-center mb-8">
        <h1 className="text-6xl sm:text-8xl font-bold tracking-tight text-slate-900">
          <span className="text-blue-500">땡</span>세권
        </h1>
        <p className="mt-3 text-base sm:text-lg text-slate-500">
          필요한 곳이 가까운 동네를 찾아주는 서비스
        </p>
      </div>

      {/* AI 동네 추천 채팅바 */}
      <NeighborhoodChatBar />

      {/* 버튼 그리드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-sm sm:max-w-4xl sm:w-auto">
        <ModeSelectButton
          href="/young"
          emoji="🏃"
          label={"청년층\n땡세권 찾기"}
          colorScheme="blue"
        />
        <ModeSelectButton
          href="/senior"
          emoji="🧓"
          label={"고령층\n땡세권 찾기"}
          colorScheme="green"
        />
        <ModeSelectButton
          href="/maps"
          emoji="🗺️"
          label={"지도로\n탐색하기"}
          colorScheme="blue"
        />
      </div>
    </main>
  );
}
