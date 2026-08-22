"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Coordinates, MapMarker, NeighborhoodCandidate } from "@/types";
import { consumeRecommendCandidates } from "@/lib/recommendCandidates";

// NaverMap 컴포넌트를 SSR 없이 불러옵니다.
const NaverMap = dynamic(() => import("@/components/naverMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <span className="text-slate-500">지도를 준비 중입니다...</span>
    </div>
  ),
});

function MapsPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<Coordinates | undefined>(undefined);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [boundary, setBoundary] = useState<Coordinates[] | undefined>(
    undefined
  );
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<NeighborhoodCandidate[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  // React StrictMode(dev)에서 마운트 effect가 두 번 실행되어도 sessionStorage 마커를
  // 두 번째 실행에서 빈 값으로 소비하지 않도록 가드한다.
  const consumedInitialMarkersRef = useRef(false);

  // 동 이름/주소로 행정동 경계를 조회해 지도에 표시합니다.
  const fetchBoundary = useCallback(async (text: string) => {
    if (!text.trim()) {
      setBoundary(undefined);
      return;
    }

    try {
      const response = await fetch(
        `/api/boundary?query=${encodeURIComponent(text)}`
      );

      if (!response.ok) {
        setBoundary(undefined);
        return;
      }

      const data = await response.json();
      setBoundary(data.boundary);
    } catch (err) {
      console.error(err);
      setBoundary(undefined);
    }
  }, []);

  // 추천 후보 하나를 지도에 반영한다 (센터/마커/검색창/경계).
  const applyCandidate = useCallback(
    (candidate: NeighborhoodCandidate) => {
      setCenter(candidate.coordinates);
      setMarkers(candidate.markers);
      setQuery(candidate.name);
      fetchBoundary(candidate.address || candidate.name);
    },
    [fetchBoundary]
  );

  const goToCandidate = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= candidates.length) return;
    setCandidateIndex(nextIndex);
    applyCandidate(candidates[nextIndex]);
  };

  // AI 추천 동을 쿼리 파라미터(lat, lng, dong, address)로 전달받아 선택된 상태로 표시
  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const dong = searchParams.get("dong");
    const address = searchParams.get("address");

    if (!lat || !lng) return;

    const coords: Coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };

    // recommend_car_free_neighborhoods 결과로 만들어진 다중 후보(병원/버스정류장/시장 마커 포함)가
    // 있으면 그것을 우선 사용해 넘겨보기(prev/next)가 가능하도록 한다.
    // StrictMode(dev)에서 이 effect가 두 번 실행되더라도, 이미 한 번 소비했다면
    // sessionStorage를 다시 읽지 않고 이전에 설정한 상태를 그대로 유지한다.
    if (!consumedInitialMarkersRef.current) {
      consumedInitialMarkersRef.current = true;
      const storedCandidates = consumeRecommendCandidates();
      if (storedCandidates && storedCandidates.length > 0) {
        setCandidates(storedCandidates);
        setCandidateIndex(0);
        applyCandidate(storedCandidates[0]);
        return;
      }
    }

    setCenter(coords);
    setMarkers([
      {
        id: "ai-recommended-dong",
        coordinates: coords,
        label: dong ? `🤖 AI 추천: ${dong}` : address || "추천 위치",
      },
    ]);
    setQuery(dong || address || "");
    fetchBoundary(address || dong || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Failed to search address");
      }

      const data = await response.json();
      const newCenter: Coordinates = data.coordinates;

      setCenter(newCenter);
      
      // 검색된 위치를 마커로 추가
      const newMarker: MapMarker = {
        id: Date.now().toString(),
        coordinates: newCenter,
        label: data.address,
        score: Math.floor(Math.random() * 41) + 60, // 임시 점수 (60~100)
      };
      
      setMarkers([newMarker]);
      fetchBoundary(data.address || query);
    } catch (err) {
      console.error(err);
      alert("주소 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50">
      {/* 플로팅 검색바 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-11/12 max-w-md">
        <form
          onSubmit={handleSearch}
          className="relative bg-white rounded-2xl shadow-lg flex items-center p-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="주소를 입력하세요 (예: 강남역)"
            className="w-full pl-4 pr-12 py-2 text-base text-slate-800 bg-transparent focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:bg-slate-300 disabled:hover:bg-slate-300"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* 지도 영역 */}
      <div className="w-full h-full">
        <NaverMap markers={markers} center={center} boundary={boundary} />
      </div>

      {/* 추천 후보 넘겨보기 */}
      {candidates.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 w-11/12 max-w-md">
          <div className="bg-white rounded-2xl shadow-lg px-3 py-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToCandidate(candidateIndex - 1)}
              disabled={candidateIndex === 0}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              aria-label="이전 후보"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="flex-1 text-center min-w-0">
              <div className="text-xs text-slate-400">
                {candidateIndex + 1} / {candidates.length}
              </div>
              <div className="text-sm font-semibold text-slate-800 truncate">
                {candidates[candidateIndex].name}
                <span className="ml-1.5 text-blue-600">
                  {candidates[candidateIndex].score}점
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => goToCandidate(candidateIndex + 1)}
              disabled={candidateIndex === candidates.length - 1}
              className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
              aria-label="다음 후보"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function MapsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-screen h-screen flex items-center justify-center bg-slate-50">
          <span className="text-slate-500">지도를 준비 중입니다...</span>
        </div>
      }
    >
      <MapsPageContent />
    </Suspense>
  );
}
