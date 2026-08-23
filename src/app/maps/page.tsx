"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import {
  Coordinates,
  MapMarker,
  NeighborhoodCandidate,
  RecommendDongApiRequest,
  RecommendDongApiResponse,
  RecommendDongStreamEvent,
  RecommendationProgressEvent,
} from "@/types";
import {
  consumeRecommendCandidates,
  saveRecommendCandidates,
} from "@/lib/recommendCandidates";
import { consumePendingRecommendation } from "@/lib/pendingRecommendation";
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

const CITY_LABEL = "포항시";
const POHANG_CENTER: Coordinates = { lat: 36.019, lng: 129.3435 };

type AnalysisStatus = "idle" | "loading" | "completed" | "error";

function getLocationLabel(candidate: NeighborhoodCandidate): string {
  const parts = candidate.address.trim().split(/\s+/);
  const cityIndex = parts.findIndex((part) => part === CITY_LABEL);
  if (cityIndex >= 0) return parts.slice(cityIndex, cityIndex + 3).join(" ");
  return candidate.name;
}

function getTrackedKeywords(
  prompt: string,
  candidate: NeighborhoodCandidate
): string[] {
  const keywords = new Set<string>();
  const promptKeywords: Array<[string, RegExp]> = [
    ["병원", /병원|의료/],
    ["버스", /버스|대중교통/],
    ["시장", /시장|장보기/],
    ["다이소", /다이소/],
    ["학교", /학교/],
    ["약국", /약국/],
    ["안전", /안전|치안/],
  ];
  promptKeywords.forEach(([label, pattern]) => {
    if (pattern.test(prompt)) keywords.add(label);
  });
  if (candidate.hospital) keywords.add("병원");
  if (candidate.busStop) keywords.add("버스");
  if (candidate.market) keywords.add("시장");
  return [...keywords].slice(0, 4);
}

function walkLabel(name: string, minutes?: number): string {
  return minutes === undefined
    ? name
    : `${name} 도보 ${Math.max(1, minutes)}분`;
}

type DetailIconType = "market" | "hospital" | "bus";

const DETAIL_ICONS: Record<
  DetailIconType,
  { src: string; width: number; height: number }
> = {
  market: {
    src: "/images/figma/detail-market.svg",
    width: 44,
    height: 42,
  },
  hospital: {
    src: "/images/figma/detail-hospital.svg",
    width: 50,
    height: 50,
  },
  bus: {
    src: "/images/figma/detail-bus.svg",
    width: 53,
    height: 53,
  },
};

function DetailIcon({ type }: { type: DetailIconType }) {
  const icon = DETAIL_ICONS[type];

  return (
    <span className={styles.detailIcon} aria-hidden="true">
      <Image
        src="/images/figma/detail-marker.svg"
        alt=""
        width={99}
        height={116}
        className={styles.detailMarker}
      />
      <Image
        src={icon.src}
        alt=""
        width={icon.width}
        height={icon.height}
        className={styles.detailIconGlyph}
      />
    </span>
  );
}

interface RecommendationResultPanelProps {
  candidate: NeighborhoodCandidate;
  keywords: string[];
  candidateIndex: number;
  candidateCount: number;
  onPrevious: () => void;
  onNext: () => void;
  isSeniorRequest: boolean;
}

function RecommendationResultPanel({
  candidate,
  keywords,
  candidateIndex,
  candidateCount,
  onPrevious,
  onNext,
  isSeniorRequest,
}: RecommendationResultPanelProps) {
  const marketName = candidate.market?.name ?? "시장 정보 없음";
  const hospitalLabel = candidate.hospital
    ? walkLabel(candidate.hospital.name, candidate.hospital.walkMinutes)
    : "의료시설 정보 없음";
  const transportLabel = candidate.busStop
    ? walkLabel(candidate.busStop.name, candidate.busStop.walkMinutes)
    : "대중교통 정보 없음";

  return (
    <aside className={styles.resultPanel} aria-label="추천 생활권 상세 정보">
      <div className={styles.resultPanelHeader}>
        <div className={styles.keywordList}>
          {keywords.map((keyword) => (
            <span key={keyword} className={styles.keywordChip}>
              {keyword}
            </span>
          ))}
        </div>
        <span className={styles.keywordLabel}>추적 키워드</span>
      </div>

      <div className={styles.resultPanelContent}>
        <div className={styles.resultTitleRow}>
          <span className={styles.rankBadge}>{candidate.rank}</span>
          <div>
            <h2>{candidate.name}</h2>
            <p>
              {isSeniorRequest
                ? "고령 친화적 & 조용한 생활"
                : "생활 편의와 이동성이 가까운 동네"}
            </p>
          </div>
        </div>

        <dl className={styles.resultDetails}>
          <div>
            <DetailIcon type="market" />
            <dt>중심 시장:</dt>
            <dd>{marketName}</dd>
          </div>
          <div>
            <DetailIcon type="hospital" />
            <dt>의료시설:</dt>
            <dd>{hospitalLabel}</dd>
          </div>
          <div>
            <DetailIcon type="bus" />
            <dt>대중교통:</dt>
            <dd>{transportLabel}</dd>
          </div>
        </dl>

        <p className={styles.resultDescription}>{candidate.reason}</p>
      </div>

      <div className={styles.resultPanelFooter}>
        <div className={styles.safetyCard}>
          <Image
            src="/images/figma/safety-shield.svg"
            alt=""
            width={41}
            height={52}
          />
          <div>
            <span>지역 안전 등급</span>
            <strong>
              {candidate.safetyGrade
                ? `${candidate.safetyGrade}등급`
                : "정보 없음"}
            </strong>
          </div>
        </div>

        {candidateCount > 1 && (
          <div className={styles.resultPager}>
            <button
              type="button"
              onClick={onPrevious}
              disabled={candidateIndex === 0}
              aria-label="이전 후보"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              {candidateIndex + 1} / {candidateCount}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={candidateIndex === candidateCount - 1}
              aria-label="다음 후보"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

function MapsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [center, setCenter] = useState<Coordinates | undefined>(
    searchParams.get("pending") === "1" ? POHANG_CENTER : undefined
  );
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [candidates, setCandidates] = useState<NeighborhoodCandidate[]>([]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [locationLabel, setLocationLabel] = useState("");
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>("idle");
  const [progressEvents, setProgressEvents] = useState<
    RecommendationProgressEvent[]
  >([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeRequest, setActiveRequest] =
    useState<RecommendDongApiRequest | null>(null);
  const [panelExpanded, setPanelExpanded] = useState(true);
  const consumedInitialMarkersRef = useRef(false);
  const initializedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyCandidate = useCallback((candidate: NeighborhoodCandidate) => {
    setCenter(candidate.coordinates);
    setMarkers(candidate.markers);
    setLocationLabel(getLocationLabel(candidate));
  }, []);

  const goToCandidate = (nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= candidates.length) return;
    setCandidateIndex(nextIndex);
    applyCandidate(candidates[nextIndex]);
  };

  const applyRecommendation = useCallback(
    (
      recommendation: RecommendDongApiResponse,
      request: RecommendDongApiRequest
    ) => {
      setAnalysisStatus("completed");
      setAnalysisError(null);

      if (recommendation.candidates && recommendation.candidates.length > 0) {
        saveRecommendCandidates(recommendation.candidates);
        setCandidates(recommendation.candidates);
        setCandidateIndex(0);
        applyCandidate(recommendation.candidates[0]);
      } else {
        setCandidates([
          {
            rank: 1,
            name: recommendation.dong,
            score: 0,
            reason: recommendation.reason,
            caveats: recommendation.caveats ?? [],
            coordinates: recommendation.coordinates,
            address: recommendation.address,
            markers: recommendation.markers ?? [],
          },
        ]);
        setCandidateIndex(0);
        setCenter(recommendation.coordinates);
        setMarkers(
          recommendation.markers && recommendation.markers.length > 0
            ? recommendation.markers
            : [
                {
                  id: "ai-recommended-dong",
                  coordinates: recommendation.coordinates,
                  label: `AI 추천: ${recommendation.dong}`,
                  category: "recommended",
                },
              ]
        );
        setLocationLabel(
          [CITY_LABEL, request.district, recommendation.dong]
            .filter((value) => value && value !== "전체")
            .join(" ")
        );
      }

      const params = new URLSearchParams({
        dong: recommendation.dong,
        address: recommendation.address,
        lat: String(recommendation.coordinates.lat),
        lng: String(recommendation.coordinates.lng),
      });
      if (request.district && request.district !== "전체") {
        params.set("district", request.district);
      }
      router.replace(`/maps?${params.toString()}`, { scroll: false });
    },
    [applyCandidate, router]
  );

  const runPendingRecommendation = useCallback(
    async (request: RecommendDongApiRequest) => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setAnalysisStatus("loading");
      setAnalysisError(null);
      setProgressEvents([]);
      setActiveRequest(request);
      setPanelExpanded(true);

      try {
        const response = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, stream: true }),
          signal: controller.signal,
        });
        if (!response.ok || !response.body) {
          throw new Error("추천 서버에 연결하지 못했습니다.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let completed = false;

        const handleLine = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line) as RecommendDongStreamEvent;
          if (event.type === "progress") {
            setProgressEvents((previous) => {
              if (
                event.event.stage !== "tool_result" ||
                !event.event.toolName
              ) {
                return [...previous, event.event];
              }

              let runningEventIndex = -1;
              for (let index = previous.length - 1; index >= 0; index -= 1) {
                const item = previous[index];
                if (
                  item.stage === "tool_call" &&
                  item.toolName === event.event.toolName
                ) {
                  runningEventIndex = index;
                  break;
                }
              }

              if (runningEventIndex === -1) {
                return [...previous, event.event];
              }

              return previous.map((item, index) =>
                index === runningEventIndex ? event.event : item
              );
            });
            return;
          }
          if (event.type === "complete") {
            completed = true;
            applyRecommendation(event.data, request);
            return;
          }
          throw new Error(event.message);
        };

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(handleLine);
          if (done) break;
        }
        handleLine(buffer);
        if (!completed) throw new Error("추천 결과를 받지 못했습니다.");
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error(error);
        setAnalysisStatus("error");
        setAnalysisError(
          error instanceof Error
            ? error.message
            : "추천 중 오류가 발생했습니다."
        );
      }
    },
    [applyRecommendation]
  );

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (searchParams.get("pending") === "1") {
      const request = consumePendingRecommendation();
      if (!request) {
        setAnalysisStatus("error");
        setAnalysisError(
          "추천 요청 정보를 찾지 못했습니다. 메인 화면에서 다시 요청해주세요."
        );
        setLocationLabel(`${CITY_LABEL} 추천 분석`);
        return;
      }
      // 이전 추천에서 남은 후보가 새 요청의 결과로 오인되지 않도록 비웁니다.
      consumeRecommendCandidates();
      setLocationLabel(
        [CITY_LABEL, request.district, request.dong]
          .filter((value) => value && value !== "전체")
          .join(" ") || `${CITY_LABEL} 추천 분석`
      );
      void runPendingRecommendation(request);
      return;
    }

    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");
    const dong = searchParams.get("dong");
    const district = searchParams.get("district");
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
    setMarkers([
      {
        id: "ai-recommended-dong",
        coordinates: coords,
        label: dong ? `🤖 AI 추천: ${dong}` : address || "추천 위치",
      },
    ]);
    setLocationLabel(
      dong
        ? [CITY_LABEL, district, dong].filter(Boolean).join(" ")
        : address || ""
    );
  }, [applyCandidate, runPendingRecommendation, searchParams]);

  useEffect(() => {
    if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    return () => {
      // React Strict Mode의 개발용 effect 재실행은 허용하되 실제 이탈 시 요청을 취소합니다.
      unmountTimerRef.current = setTimeout(
        () => abortControllerRef.current?.abort(),
        0
      );
    };
  }, []);

  const activeCandidate = candidates[candidateIndex] ?? null;
  const trackedKeywords = activeCandidate
    ? getTrackedKeywords(activeRequest?.prompt ?? "", activeCandidate)
    : [];
  const isSeniorRequest = Boolean(
    activeRequest &&
    ((Number.parseInt(activeRequest.age ?? "", 10) || 0) >= 60 ||
      /고령|노인|시니어|6\d대|7\d대|8\d대/.test(activeRequest.prompt))
  );

  return (
    <main className={styles.main}>
      {/* 좌측 상단 위치 표시 바 */}
      {(locationLabel || analysisStatus !== "idle") && (
        <div className={styles.locationBar}>
          <button
            type="button"
            onClick={() => router.push("/")}
            className={styles.backButton}
            aria-label="메인 화면으로 돌아가기"
          >
            <ChevronLeft className={styles.backIcon} strokeWidth={2} />
          </button>
          <span className={styles.locationLabel}>
            {locationLabel || `${CITY_LABEL} 추천 분석`}
          </span>
        </div>
      )}

      {analysisStatus !== "idle" && analysisStatus !== "completed" && (
        <aside
          className={`${styles.analysisPanel} ${!panelExpanded ? styles.analysisPanelCollapsed : ""}`}
        >
          <button
            type="button"
            className={styles.analysisHeader}
            onClick={() => setPanelExpanded((expanded) => !expanded)}
            aria-expanded={panelExpanded}
          >
            <span className={styles.analysisHeadingText}>
              <strong>
                {analysisStatus === "loading" && "AI가 동네를 찾고 있어요"}
                {analysisStatus === "error" && "추천을 완료하지 못했어요"}
              </strong>
            </span>
            {panelExpanded ? (
              <ChevronUp size={18} />
            ) : (
              <ChevronDown size={18} />
            )}
          </button>

          {panelExpanded && (
            <div className={styles.analysisBody} aria-live="polite">
              <ol className={styles.progressList}>
                {progressEvents.map((event, index) => {
                  const isCurrent =
                    analysisStatus === "loading" &&
                    index === progressEvents.length - 1;
                  return (
                    <li
                      key={event.id}
                      className={`${styles.progressItem} ${isCurrent ? styles.progressItemCurrent : ""}`}
                    >
                      <span className={styles.progressTitle}>
                        {event.title}
                      </span>
                    </li>
                  );
                })}
              </ol>

              {analysisStatus === "loading" && progressEvents.length === 0 && (
                <div className={styles.initialLoading}>추천 요청 전달 중</div>
              )}

              {analysisError && (
                <p className={styles.analysisError}>{analysisError}</p>
              )}
            </div>
          )}
        </aside>
      )}

      {activeCandidate &&
        analysisStatus !== "loading" &&
        analysisStatus !== "error" && (
          <RecommendationResultPanel
            candidate={activeCandidate}
            keywords={trackedKeywords}
            candidateIndex={candidateIndex}
            candidateCount={candidates.length}
            onPrevious={() => goToCandidate(candidateIndex - 1)}
            onNext={() => goToCandidate(candidateIndex + 1)}
            isSeniorRequest={isSeniorRequest}
          />
        )}

      {/* 지도 영역 */}
      <div className={styles.mapArea}>
        <NaverMap markers={markers} center={center} showMarkerCircle />
      </div>
    </main>
  );
}

export default function MapsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.suspenseFallback}>
          <span className={styles.suspenseFallbackText}>
            지도를 준비 중입니다...
          </span>
        </div>
      }
    >
      <MapsPageContent />
    </Suspense>
  );
}
