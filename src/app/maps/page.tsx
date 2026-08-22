"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Coordinates, MapMarker, NeighborhoodCandidate } from "@/types";
import { consumeRecommendCandidates } from "@/lib/recommendCandidates";
import styles from "./maps.module.css";

// NaverMap 컴포넌트를 SSR 없이 불러옵니다.
const NaverMap = dynamic(() => import("@/components/naverMap"), {
  ssr: false,
  loading: () => (
    <div className={styles.mapLoading}>
      <span className={styles.mapLoadingText}>지도를 준비 중입니다...</span>
    </div>
  ),
});

function MapsPageContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<Coordinates | undefined>(undefined);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [boundary, setBoundary] = useState<Coordinates[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<NeighborhoodCandidate[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const consumedInitialMarkersRef = useRef(false);

  const fetchBoundary = useCallback(async (text: string) => {
    if (!text.trim()) { setBoundary(undefined); return; }
    try {
      const response = await fetch(`/api/boundary?query=${encodeURIComponent(text)}`);
      if (!response.ok) { setBoundary(undefined); return; }
      const data = await response.json();
      setBoundary(data.boundary);
    } catch (err) { console.error(err); setBoundary(undefined); }
  }, []);

  const applyCandidate = useCallback((candidate: NeighborhoodCandidate) => {
    setCenter(candidate.coordinates);
    setMarkers(candidate.markers);
    setQuery(candidate.name);
    fetchBoundary(candidate.address || candidate.name);
  }, [fetchBoundary]);

  const goToCandidate = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= candidates.length) return;
    setCandidateIndex(nextIndex);
    applyCandidate(candidates[nextIndex]);
  };

  useEffect(() => {
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const dong = searchParams.get("dong");
    const address = searchParams.get("address");
    if (!lat || !lng) return;
    const coords: Coordinates = { lat: parseFloat(lat), lng: parseFloat(lng) };
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
    setMarkers([{ id: "ai-recommended-dong", coordinates: coords, label: dong ? `🤖 AI 추천: ${dong}` : address || "추천 위치" }]);
    setQuery(dong || address || "");
    fetchBoundary(address || dong || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch("/api/geocode", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      if (!response.ok) throw new Error("Failed to search address");
      const data = await response.json();
      const newCenter: Coordinates = data.coordinates;
      setCenter(newCenter);
      const newMarker: MapMarker = { id: Date.now().toString(), coordinates: newCenter, label: data.address, score: Math.floor(Math.random() * 41) + 60 };
      setMarkers([newMarker]);
      fetchBoundary(data.address || query);
    } catch (err) { console.error(err); alert("주소 검색에 실패했습니다."); } finally { setLoading(false); }
  };

  return (
    <main className={styles.main}>
      {/* 플로팅 검색바 */}
      <div className={styles.searchBarWrapper}>
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="주소를 입력하세요 (예: 강남역)"
            className={styles.searchInput}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className={styles.searchButton}
          >
            <Search width={20} height={20} />
          </button>
        </form>
      </div>

      {/* 지도 영역 */}
      <div className={styles.mapArea}>
        <NaverMap markers={markers} center={center} boundary={boundary} />
      </div>

      {/* 추천 후보 넘겨보기 */}
      {candidates.length > 1 && (
        <div className={styles.candidateWrapper}>
          <div className={styles.candidateCard}>
            <button
              type="button"
              onClick={() => goToCandidate(candidateIndex - 1)}
              disabled={candidateIndex === 0}
              className={styles.navButton}
              aria-label="이전 후보"
            >
              <ChevronLeft width={20} height={20} />
            </button>
            <div className={styles.candidateInfo}>
              <div className={styles.candidatePager}>{candidateIndex + 1} / {candidates.length}</div>
              <div className={styles.candidateName}>
                {candidates[candidateIndex].name}
                <span className={styles.candidateScore}>{candidates[candidateIndex].score}점</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => goToCandidate(candidateIndex + 1)}
              disabled={candidateIndex === candidates.length - 1}
              className={styles.navButton}
              aria-label="다음 후보"
            >
              <ChevronRight width={20} height={20} />
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default function MapsPage() {
  return (
    <Suspense fallback={
      <div className={styles.suspenseFallback}>
        <span className={styles.suspenseFallbackText}>지도를 준비 중입니다...</span>
      </div>
    }>
      <MapsPageContent />
    </Suspense>
  );
}
