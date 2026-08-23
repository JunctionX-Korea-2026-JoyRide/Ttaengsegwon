// ============================================================
// 지도 & 장소
// ============================================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Place {
  id: string;
  name: string;
  category?: string;
  coordinates: Coordinates;
  address?: string;
  distance?: number; // 기준점으로부터 거리 (미터)
  phone?: string;
  url?: string;
}

export type MapMarkerCategory =
  "recommended" | "hospital" | "pharmacy" | "bus_stop" | "market" | "shopping";

export interface MapMarker {
  id: string;
  coordinates: Coordinates;
  label: string;
  score?: number;
  category?: MapMarkerCategory;
  address?: string;
  distanceMeter?: number;
}

export interface GeocodingApiResponse {
  coordinates: Coordinates;
  address: string;
}

// ============================================================
// 도메인 분석 데이터 (기존 AreaScoreCard 등에서 활용)
// ============================================================

export interface FacilityInfo {
  name: string;
  category: string;
  distanceMeter: number;
  address?: string;
}

export interface TransportInfo {
  stationName: string;
  line: string;
  distanceMeter: number;
  walkingMinutes: number;
}

export interface SafetyInfo {
  cctvCount: number;
  policeStationDistanceMeter: number;
  streetLightDensity: "low" | "medium" | "high";
  safetyScore: number;
}

export interface AnalysisResult {
  score: number;
  summary: string;
  transport?: {
    score: number;
    nearestStations: TransportInfo[];
  };
  safety?: SafetyInfo;
  facilities?: FacilityInfo[];
}

// ============================================================
// ContentBlock — UI 렌더링 단위
// 채팅 응답은 단순 문자열이 아니라 ContentBlock[]으로 구성됩니다.
// ============================================================

/** 텍스트(마크다운) 블록 */
export interface TextBlock {
  type: "text";
  text: string;
}

/** 지도 블록 — 마커와 함께 지도를 렌더링합니다 */
export interface MapBlock {
  type: "map";
  center?: Coordinates;
  markers: Place[];
}

/** 장소 목록 블록 — 카드 형태의 리스트 */
export interface PlaceListBlock {
  type: "place_list";
  places: Place[];
}

/** 지역 분석 결과 블록 (기존 AreaScoreCard) */
export interface AnalysisBlock {
  type: "analysis";
  address: string;
  result: AnalysisResult;
}

/** 모든 ContentBlock 타입의 유니온 */
export type ContentBlock =
  TextBlock | MapBlock | PlaceListBlock | AnalysisBlock;

// ============================================================
// 채팅 메시지
// ============================================================

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  /**
   * user 메시지: 단순 string
   * assistant 메시지: ContentBlock[] — type에 따라 다른 렌더러가 처리
   */
  content: string | ContentBlock[];
  createdAt: string;
}

// ============================================================
// API 요청/응답 스키마
// ============================================================

export interface ChatApiRequest {
  messages: Array<{
    role: "user" | "assistant" | "system";
    /** 서버 전달 시에는 항상 string으로 직렬화 */
    content: string;
  }>;
}

export interface ChatApiResponse {
  /** 어시스턴트 응답 — ContentBlock 배열 */
  blocks: ContentBlock[];
}

export interface RecommendDongApiRequest {
  prompt: string;
  /** 사용자가 온보딩에서 선택한 나이/성별/희망 구/희망 동 (선택값, "전체"는 미지정으로 취급) */
  age?: string;
  gender?: string;
  district?: string;
  dong?: string;
  /** true이면 추천 진행 상황과 최종 결과를 NDJSON 스트림으로 받습니다. */
  stream?: boolean;
}

export type RecommendationProgressStage =
  | "request"
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "geocoding"
  | "finalizing";

/** 모델의 비공개 추론이 아닌, 사용자에게 공개 가능한 작업 진행 정보입니다. */
export interface RecommendationProgressEvent {
  id: string;
  stage: RecommendationProgressStage;
  title: string;
  detail?: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
}

export type RecommendDongStreamEvent =
  | { type: "progress"; event: RecommendationProgressEvent }
  | { type: "complete"; data: RecommendDongApiResponse }
  | { type: "error"; message: string };

export interface RecommendDongApiResponse {
  dong: string;
  reason: string;
  address: string;
  coordinates: Coordinates;
  /** recommend_car_free_neighborhoods 등 MCP 도구 결과에서 나온 주변 시설 마커 (병원/버스정류장/시장) */
  markers?: MapMarker[];
  /** 직선거리 추정, 배차 추정 등에 관한 주의사항 (MCP 도구 결과) */
  caveats?: string[];
  /** recommend_car_free_neighborhoods 결과 후보 목록 (점수 내림차순), /maps에서 후보별로 넘겨보기 위함 */
  candidates?: NeighborhoodCandidate[];
}

/** recommend_car_free_neighborhoods의 추천 후보 하나 (지도에서 넘겨보기 위한 단위) */
export interface NeighborhoodCandidate {
  rank: number;
  name: string;
  score: number;
  reason: string;
  caveats: string[];
  coordinates: Coordinates;
  /** 시장 주소 등 경계 조회용 대표 주소 */
  address: string;
  markers: MapMarker[];
  market?: CandidatePlaceSummary;
  hospital?: CandidatePlaceSummary;
  busStop?: CandidatePlaceSummary & { dailyTrips?: number };
  /** 행정안전부 지역안전지수 등급. 1등급에 가까울수록 상대적으로 안전합니다. */
  safetyGrade?: number;
}

export interface CandidatePlaceSummary {
  name: string;
  walkMinutes?: number;
  distanceMeter?: number;
}

// ============================================================
// LLM Tool Calling
// ============================================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolExecutionResult {
  toolCallId: string;
  name: string;
  result: unknown;
  isError?: boolean;
}
