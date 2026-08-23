import { RecommendDongApiRequest } from "@/types";

const STORAGE_KEY = "ttaengsegwon:pendingRecommendation";

export function savePendingRecommendation(
  request: RecommendDongApiRequest
): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(request));
    return true;
  } catch {
    return false;
  }
}

export function consumePendingRecommendation(): RecommendDongApiRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(STORAGE_KEY);
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as { prompt?: unknown }).prompt !== "string"
    ) {
      return null;
    }
    return parsed as RecommendDongApiRequest;
  } catch {
    return null;
  }
}
