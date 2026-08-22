import { ToolDefinition } from "@/types";

// gyeongbuk-mcp (경상북도 공공데이터 MCP 서버, stdio) 도구 정의
// https://github.com/JunctionX-Korea-2026-JoyRide/gyeongbuk-mcp
const GYEONGBUK_TOOLS: ToolDefinition[] = [
  {
    name: "search_nearby_hospitals",
    description:
      "기준 좌표에서 지정한 보행 추정시간 안의 병원을 가까운 순으로 반환합니다. (경상북도 지역 데이터)",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "기준 위도 (WGS84)" },
        longitude: { type: "number", description: "기준 경도 (WGS84)" },
        max_walk_minutes: {
          type: "number",
          description: "최대 보행 추정시간(분), 기본값 15",
        },
        department_code: {
          type: "string",
          description: "심평원 진료과목 코드 필터 (선택)",
        },
        include_departments: {
          type: "boolean",
          description: "기관별 진료과목 상세조회 여부, 기본값 false",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  {
    name: "search_nearby_bus_stops",
    description:
      "기준 좌표 근처의 버스정류장을 찾고, 최소 일 운행 횟수 조건을 만족하는 정류장만 반환합니다. (경상북도 포항시 데이터)",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "기준 위도 (WGS84)" },
        longitude: { type: "number", description: "기준 경도 (WGS84)" },
        max_walk_minutes: {
          type: "number",
          description: "정류장까지 최대 보행 추정시간(분), 기본값 10",
        },
        minimum_daily_trips: {
          type: "number",
          description: "정류장 전체 최소 일 운행 횟수, 기본값 5",
        },
        service_day: {
          type: "string",
          description: "요일 유형: weekday, saturday, sunday 중 하나, 기본값 weekday",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  {
    name: "search_nearby_markets",
    description:
      "지역명으로 등록 전통시장을 조회한 뒤, 기준 좌표에서 보행 추정시간 안의 시장을 반환합니다. (경상북도 데이터)",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "도로명주소에 포함될 지역명, 예: 포항시" },
        latitude: { type: "number", description: "기준 위도 (WGS84)" },
        longitude: { type: "number", description: "기준 경도 (WGS84)" },
        max_walk_minutes: {
          type: "number",
          description: "시장까지 최대 보행 추정시간(분), 기본값 15",
        },
      },
      required: ["region", "latitude", "longitude"],
    },
  },
  {
    name: "recommend_car_free_neighborhoods",
    description:
      "전통시장을 생활권 중심점으로 삼아 병원·버스 조건을 모두 만족하는 후보 동네를 점수화하여 추천합니다. 차 없는 고령층 거주 적합 지역 추천에 사용합니다. (경상북도 포항시 데이터)",
    parameters: {
      type: "object",
      properties: {
        region: { type: "string", description: "시장 주소 검색 지역, 기본값 포항시" },
        hospital_max_walk_minutes: {
          type: "number",
          description: "병원까지 최대 보행 추정시간(분), 기본값 15",
        },
        bus_max_walk_minutes: {
          type: "number",
          description: "정류장까지 최대 보행 추정시간(분), 기본값 10",
        },
        minimum_daily_bus_trips: {
          type: "number",
          description: "정류장 최소 일 운행 추정 횟수, 기본값 5",
        },
        service_day: {
          type: "string",
          description: "요일 유형: weekday, saturday, sunday 중 하나, 기본값 weekday",
        },
        candidate_limit: {
          type: "number",
          description: "평가할 시장 수, 기본값 20",
        },
        result_limit: {
          type: "number",
          description: "반환할 후보 수, 기본값 5",
        },
      },
      required: [],
    },
  },
  {
    name: "search_nearby_stores",
    description:
      "기준 좌표에서 최대 2km 안의 영업 중 상가업소를 업종·상호 조건으로 검색합니다. (경상북도 데이터)",
    parameters: {
      type: "object",
      properties: {
        latitude: { type: "number", description: "기준 위도 (WGS84)" },
        longitude: { type: "number", description: "기준 경도 (WGS84)" },
        radius_m: {
          type: "number",
          description: "직선거리 검색 반경(m), 1~2000, 기본값 1000",
        },
        industry_code: {
          type: "string",
          description: "업종 대/중/소분류 코드(2·4·6자리) 필터 (선택)",
        },
        industry_name: {
          type: "string",
          description: "업종명 부분 일치 필터 (선택)",
        },
        name_query: {
          type: "string",
          description: "상호명·지점명 부분 일치 필터 (선택)",
        },
        result_limit: {
          type: "number",
          description: "반환할 최대 업소 수, 기본값 20",
        },
      },
      required: ["latitude", "longitude"],
    },
  },
  {
    name: "get_age_population_ratio",
    description:
      "경상북도 행정구역의 주민등록인구에서 요청한 나이대의 인구수와 전체 인구 대비 비율을 반환합니다. 기본값은 70~79세입니다.",
    parameters: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "행정구역 코드 또는 전체·끝 지역명, 예: 4711054500, 죽도동",
        },
        age_from: { type: "number", description: "포함할 최소 만 나이, 기본값 70" },
        age_to: { type: "number", description: "포함할 최대 만 나이, 기본값 79" },
        as_of: {
          type: "string",
          description: "기준년월 (YYYYMM), 미지정 시 최신 적재월",
        },
      },
      required: ["region"],
    },
  },
  {
    name: "get_safety_grade",
    description:
      "경상북도 또는 시군의 공식 지역안전지수 등급(1~5, 낮을수록 안전)을 반환합니다. 기본 분야는 범죄입니다.",
    parameters: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "전체·끝 지역명, 예: 경상북도 포항시, 포항시",
        },
        category: {
          type: "string",
          description:
            "안전 분야: traffic_accident, fire, crime, life_safety, suicide, infectious_disease 중 하나, 기본값 crime",
        },
        publication_year: {
          type: "number",
          description: "지역안전지수 공표연도, 미지정 시 최신 적재연도",
        },
      },
      required: ["region"],
    },
  },
];

export const DOMAIN_TOOLS: ToolDefinition[] = [
  {
    name: "search_nearby_facilities",
    description:
      "Search for convenience facilities (cafes, marts, hospitals, gyms, pharmacies) near a given location.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
        category: {
          type: "string",
          description:
            "Facility category (e.g. cafe, mart, hospital, gym, pharmacy)",
        },
        radiusMeter: {
          type: "number",
          description: "Search radius in meters (default 500m)",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_public_transport",
    description:
      "Get public transportation information (subway stations, bus stops) near the target location.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
        radiusMeter: {
          type: "number",
          description: "Search radius in meters (default 1000m)",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "get_safety_facilities",
    description:
      "Retrieve safety indicators including CCTV counts, police station proximity, and street lighting status.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "analyze_area",
    description:
      "Comprehensive living quality and convenience analysis for a residential location.",
    parameters: {
      type: "object",
      properties: {
        address: {
          type: "string",
          description: "Target address or building name",
        },
      },
      required: ["address"],
    },
  },
  {
    name: "search_places",
    description:
      "Search for places, shops, cafes, restaurants, or amenities using keyword and optional location (e.g. '성수역 카페', '강남 맛집'). Returns real coordinates and place information for map rendering.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search keyword or place category (e.g., '조용한 카페', '한식당', '약국')",
        },
        location: {
          type: "string",
          description: "Reference location, station, or neighborhood (e.g., '성수역', '역삼동', '홍대입구')",
        },
        radius: {
          type: "number",
          description: "Search radius in meters (optional, default 1000)",
        },
      },
      required: ["query"],
    },
  },
  ...GYEONGBUK_TOOLS,
];

