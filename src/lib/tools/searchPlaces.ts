import { Place } from "@/types";

interface SearchPlacesParams {
  query: string;
  location?: string;
  radius?: number;
}

interface NaverSearchLocalItem {
  title: string;
  link?: string;
  category?: string;
  description?: string;
  telephone?: string;
  address?: string;
  roadAddress?: string;
  mapx: string;
  mapy: string;
}

interface NaverSearchLocalResponse {
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: NaverSearchLocalItem[];
}

/**
 * HTML 태그(<b> 등)를 제거하는 유틸 함수
 */
function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>?/g, "");
}

/**
 * 네이버 오픈API의 mapx, mapy 좌표를 WGS84 위도/경도로 변환
 */
function parseNaverCoordinates(mapxStr: string, mapyStr: string): { lat: number; lng: number } {
  const mapx = parseFloat(mapxStr);
  const mapy = parseFloat(mapyStr);

  if (isNaN(mapx) || isNaN(mapy)) {
    return { lat: 37.5665, lng: 126.9780 }; // 기본 서울 좌표
  }

  // WGS84 좌표에 10,000,000을 곱한 형태인 경우 (예: 1270578120, 375447120)
  if (mapx > 10000000) {
    return {
      lat: Number((mapy / 10000000).toFixed(7)),
      lng: Number((mapx / 10000000).toFixed(7)),
    };
  }

  // 카텍(KATECH / TM128) 좌표인 경우 (중부원점 기준 근사 변환)
  const lat = 38.0 + (mapy - 500000) / 111000;
  const lng = 128.0 + (mapx - 400000) / 88800;

  return {
    lat: Number(lat.toFixed(7)),
    lng: Number(lng.toFixed(7)),
  };
}

export async function searchPlaces(
  params: SearchPlacesParams
): Promise<Place[]> {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_SEARCH_CLIENT_ID or NAVER_SEARCH_CLIENT_SECRET is not configured"
    );
  }

  const { query, location } = params;
  const searchQuery = location ? `${location} ${query}`.trim() : query.trim();

  if (!searchQuery) {
    return [];
  }

  const url = new URL("https://openapi.naver.com/v1/search/local.json");
  url.searchParams.set("query", searchQuery);
  url.searchParams.set("display", "10");
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "random");

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      "X-Naver-Client-Id": clientId,
      "X-Naver-Client-Secret": clientSecret,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Naver search local API error (${response.status}): ${errorText}`
    );
  }

  const data = (await response.json()) as NaverSearchLocalResponse;

  if (!data.items || !Array.isArray(data.items)) {
    return [];
  }

  return data.items.map((item, index) => {
    const coords = parseNaverCoordinates(item.mapx, item.mapy);
    const cleanTitle = stripHtmlTags(item.title);

    return {
      id: `naver-place-${index + 1}-${encodeURIComponent(cleanTitle)}`,
      name: cleanTitle,
      category: item.category ? item.category.split(">").pop()?.trim() : undefined,
      coordinates: coords,
      address: item.roadAddress || item.address,
      phone: item.telephone || undefined,
      url: item.link || undefined,
    };
  });
}
