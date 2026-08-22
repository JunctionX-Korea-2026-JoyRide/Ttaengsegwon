import { NeighborhoodCandidate } from "@/types";

const STORAGE_KEY = "ttaengsegwon:recommendCandidates";

/** /maps로 이동하기 전, recommend_car_free_neighborhoods 추천 후보 목록을 임시 저장한다. */
export function saveRecommendCandidates(candidates: NeighborhoodCandidate[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
  } catch {
    // sessionStorage 사용 불가 시 조용히 무시 (지도는 단일 마커로 fallback)
  }
}

/** /maps 진입 시 저장된 후보 목록을 1회 소비한다 (읽은 뒤 즉시 삭제). */
export function consumeRecommendCandidates(): NeighborhoodCandidate[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as NeighborhoodCandidate[]) : null;
  } catch {
    return null;
  }
}
