import { ContentBlock, Coordinates, MapMarker, NeighborhoodCandidate, Place } from "@/types";
import { DOMAIN_TOOLS } from "@/lib/tools/definitions";
import { routeToolCall } from "@/lib/tools/router";
import { extractToolPayload } from "@/lib/mcp/client";

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface OpenAiChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

interface OpenAiAssistantMessage {
  role: "assistant";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  reasoning?: string;
}

interface LlmResponse {
  blocks: ContentBlock[];
}

export interface DongRecommendation {
  dong: string;
  reason: string;
  /** recommend_car_free_neighborhoods 도구가 이미 좌표를 제공한 경우, 별도 geocoding 없이 사용 */
  coordinates?: Coordinates;
  address?: string;
  markers?: MapMarker[];
  caveats?: string[];
  candidates?: NeighborhoodCandidate[];
}

interface ToolCallRecord {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

// gyeongbuk-mcp recommend_car_free_neighborhoods 응답 (docs/output-models.md 기준, 필요한 필드만)
interface GyeongbukCoordinates {
  latitude: number;
  longitude: number;
}

interface GyeongbukMarket {
  name: string;
  address: string;
  coordinates: GyeongbukCoordinates;
}

interface GyeongbukHospital {
  institution_id: string;
  name: string;
  coordinates: GyeongbukCoordinates;
}

interface GyeongbukBusStop {
  stop_id: string;
  name: string;
  coordinates: GyeongbukCoordinates;
}

interface GyeongbukNeighborhoodRecommendation {
  rank: number;
  candidate_name: string;
  anchor: GyeongbukCoordinates;
  score: number;
  nearest_market: GyeongbukMarket;
  nearest_hospital: GyeongbukHospital;
  qualifying_bus_stops: GyeongbukBusStop[];
  reasons: string[];
  caveats: string[];
}

interface GyeongbukRecommendCarFreeResult {
  recommendations: GyeongbukNeighborhoodRecommendation[];
  criteria: {
    hospital_max_walk_minutes?: number;
    bus_max_walk_minutes?: number;
    minimum_daily_bus_trips?: number;
  };
}

function isGyeongbukCoordinates(value: unknown): value is GyeongbukCoordinates {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { latitude?: unknown }).latitude === "number" &&
    typeof (value as { longitude?: unknown }).longitude === "number"
  );
}

function isCarFreeResult(value: unknown): value is GyeongbukRecommendCarFreeResult {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as { recommendations?: unknown }).recommendations)
  );
}

const CHAT_SYSTEM_PROMPT = `당신은 생활권 및 장소 추천 전문 AI '땡세권'입니다.
사용자가 특정 장소(카페, 식당, 편의시설, 병원 등)를 찾거나 특정 지역의 입지 및 생활 편의성을 분석해달라고 요청하면, 등록된 도구(search_places, search_nearby_facilities, analyze_area 등)를 호출하여 실제 데이터를 가져오세요.

도구 실행 후 최종 사용자 답변을 작성할 때는, 마크다운 텍스트와 함께 반드시 아래의 ContentBlock JSON 배열 형식으로만 응답해야 합니다:
[
  {
    "type": "text",
    "text": "사용자에게 전할 추천 사유 및 설명 요약"
  },
  {
    "type": "map",
    "center": { "lat": 37.5446, "lng": 127.0557 },
    "markers": [
      {
        "id": "...",
        "name": "장소명",
        "category": "카페",
        "coordinates": { "lat": 37.5446, "lng": 127.0557 },
        "address": "주소",
        "distance": 120
      }
    ]
  },
  {
    "type": "place_list",
    "places": [ ...장소 목록... ]
  }
]

주의:
- 도구 호출을 통해 얻은 실제 위도/경도(coordinates), 이름, 주소 데이터를 그대로 map과 place_list 블록에 넣으세요.
- 임의로 허위 좌표(Hallucination)를 만들어내지 마세요.
- 다른 마크다운 코드블록 백틱(\`\`\`) 없이 순수 JSON 배열만 출력하세요.`;

const RECOMMEND_DONG_SYSTEM_PROMPT = `당신은 생활권 추천 전문 AI '땡세권'입니다.
사용자의 요구사항(생활 스타일, 대중교통, 안전, 편의시설 선호 등)을 분석하여, 대한민국의 실제 행정동/법정동 중 가장 적합한 동 하나를 추천하세요.

차 없이 이동하는 고령층을 위한 동네를 찾거나, 경상북도·포항 지역에서 병원·버스·전통시장 조건(도보 시간, 최소 운행 횟수 등)을 언급하는 요청이면 반드시 recommend_car_free_neighborhoods 도구를 호출하여 실제 데이터 기반 후보를 가져오세요. 사용자가 언급한 조건을 도구 인자(region, hospital_max_walk_minutes, bus_max_walk_minutes, minimum_daily_bus_trips, service_day 등)에 최대한 반영하세요. 이 도구를 호출한 경우 그 결과가 최종 답변으로 사용되므로 별도의 JSON을 출력하지 않아도 됩니다.

그 외 일반적인 동네 추천 요청은 필요하다면 등록된 도구(search_nearby_facilities, get_public_transport, get_safety_facilities, analyze_area 등)를 호출하여 후보 지역의 정보를 참고한 뒤, 최종 답변을 반드시 아래 JSON 객체 형식으로만 응답하세요 (배열이 아닌 단일 객체이며, 다른 텍스트나 마크다운 코드블록 없이 순수 JSON만 출력):
{
  "dong": "정확한 동 이름 (예: 성수동)",
  "reason": "이 동을 추천하는 이유를 2~3문장으로 설명"
}

주의:
- dong 값은 실제 존재하는 동 이름이어야 합니다.
- 좌표(위도/경도)는 별도 시스템에서 조회하므로 절대 만들어내지 마세요.`;

export class LlmClient {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.LLM_API_KEY || "";
    this.baseUrl = process.env.LLM_BASE_URL || "https://api.openai.com/v1";
    this.model = process.env.LLM_MODEL || "gpt-4o";
  }

  public async generateChatResponse(
    messages: ChatCompletionMessage[]
  ): Promise<LlmResponse> {
    const { content, collectedPlaces } = await this.runConversation(
      CHAT_SYSTEM_PROMPT,
      messages
    );
    return { blocks: this.parseContentBlocks(content, collectedPlaces) };
  }

  public async recommendDong(prompt: string): Promise<DongRecommendation> {
    const { content, toolCalls } = await this.runConversation(
      RECOMMEND_DONG_SYSTEM_PROMPT,
      [{ role: "user", content: prompt }]
    );

    const carFreeCall = [...toolCalls]
      .reverse()
      .find((call) => call.name === "recommend_car_free_neighborhoods");

    if (carFreeCall) {
      const payload = extractToolPayload(carFreeCall.result);
      if (!isCarFreeResult(payload)) {
        throw new Error("recommend_car_free_neighborhoods 도구 응답 형식이 올바르지 않습니다.");
      }

      if (payload.recommendations.length === 0) {
        const c = payload.criteria;
        throw new Error(
          `조건(병원 ${c.hospital_max_walk_minutes ?? "?"}분 이내, 버스 하루 ${c.minimum_daily_bus_trips ?? "?"}회 이상)에 맞는 추천 지역을 찾지 못했습니다.`
        );
      }

      const candidates = payload.recommendations.map((rec) =>
        this.toNeighborhoodCandidate(rec)
      );
      const top = candidates[0];

      return {
        dong: top.name,
        reason: top.reason,
        coordinates: top.coordinates,
        address: top.address,
        markers: top.markers,
        caveats: top.caveats,
        candidates,
      };
    }

    return this.parseDongRecommendation(content);
  }

  private toNeighborhoodCandidate(
    rec: GyeongbukNeighborhoodRecommendation
  ): NeighborhoodCandidate {
    const toCoords = (c: GyeongbukCoordinates): Coordinates => ({
      lat: c.latitude,
      lng: c.longitude,
    });

    const markers: MapMarker[] = [
      {
        id: `recommended-${rec.rank}-${rec.candidate_name}`,
        coordinates: toCoords(rec.anchor),
        label: rec.candidate_name,
        score: Math.round(rec.score),
        category: "recommended",
      },
    ];

    if (isGyeongbukCoordinates(rec.nearest_market?.coordinates)) {
      markers.push({
        id: `market-${rec.rank}-${rec.nearest_market.name}`,
        coordinates: toCoords(rec.nearest_market.coordinates),
        label: rec.nearest_market.name,
        address: rec.nearest_market.address,
        category: "market",
      });
    }

    if (isGyeongbukCoordinates(rec.nearest_hospital?.coordinates)) {
      markers.push({
        id: `hospital-${rec.rank}-${rec.nearest_hospital.institution_id}`,
        coordinates: toCoords(rec.nearest_hospital.coordinates),
        label: rec.nearest_hospital.name,
        category: "hospital",
      });
    }

    for (const stop of rec.qualifying_bus_stops ?? []) {
      if (isGyeongbukCoordinates(stop.coordinates)) {
        markers.push({
          id: `bus-${rec.rank}-${stop.stop_id}`,
          coordinates: toCoords(stop.coordinates),
          label: stop.name,
          category: "bus_stop",
        });
      }
    }

    return {
      rank: rec.rank,
      name: rec.candidate_name,
      score: Math.round(rec.score),
      reason: (rec.reasons ?? []).join(" ") || "조건을 만족하는 생활권으로 평가되었습니다.",
      caveats: rec.caveats ?? [],
      coordinates: toCoords(rec.anchor),
      address: rec.nearest_market?.address ?? "",
      markers,
    };
  }

  private async runConversation(
    systemPrompt: string,
    messages: ChatCompletionMessage[]
  ): Promise<{ content: string; collectedPlaces: Place[]; toolCalls: ToolCallRecord[] }> {
    if (!this.apiKey) {
      throw new Error("LLM_API_KEY가 설정되지 않았습니다.");
    }

    const openAiTools = DOMAIN_TOOLS.map((tool) => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));

    const conversationHistory: OpenAiChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const maxRounds = 5;
    let currentRound = 0;
    const collectedPlaces: Place[] = [];
    const toolCalls: ToolCallRecord[] = [];

    while (currentRound < maxRounds) {
      currentRound++;

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: conversationHistory,
          tools: openAiTools,
          tool_choice: "auto",
          reasoning_effort: "medium",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const result = (await response.json()) as {
        choices: Array<{ message: OpenAiAssistantMessage }>;
      };

      const choice = result.choices[0];
      if (!choice || !choice.message) {
        throw new Error("No response from LLM");
      }

      const assistantMsg = choice.message;
      if (assistantMsg.reasoning) {
        console.log("[LLM reasoning]", assistantMsg.reasoning);
      }
      conversationHistory.push({
        role: "assistant",
        content: assistantMsg.content,
        tool_calls: assistantMsg.tool_calls,
      });

      // Tool call이 있는 경우 실행
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        for (const toolCall of assistantMsg.tool_calls) {
          const toolName = toolCall.function.name;
          let toolArgs: Record<string, unknown> = {};
          try {
            toolArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch (e) {
            console.error("Failed to parse tool arguments:", e);
          }

          const executionResult = await routeToolCall(
            toolName,
            toolArgs,
            toolCall.id
          );

          toolCalls.push({
            name: toolName,
            args: toolArgs,
            result: executionResult.result,
          });

          // search_places 결과 수집 (fallback 구성용)
          if (
            toolName === "search_places" &&
            executionResult.result &&
            typeof executionResult.result === "object" &&
            "places" in executionResult.result
          ) {
            const places = (
              executionResult.result as { places: Place[] }
            ).places;
            if (Array.isArray(places)) {
              collectedPlaces.push(...places);
            }
          }

          conversationHistory.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(executionResult.result),
          });
        }
        // tool 응답을 반영하여 다음 라운드 진행
        continue;
      }

      // Tool call이 없는 최종 응답 처리
      return { content: assistantMsg.content || "", collectedPlaces, toolCalls };
    }

    // 최대 라운드 초과 시
    return {
      content: "요청을 분석하였으나 도구 실행 단계가 초과되었습니다.",
      collectedPlaces,
      toolCalls,
    };
  }

  private parseContentBlocks(
    content: string,
    collectedPlaces: Place[]
  ): ContentBlock[] {
    // 1. JSON 코드블록 백틱 제거 시도
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    // 2. JSON 파싱 시도
    try {
      const parsed: unknown = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed as ContentBlock[];
      }
    } catch {
      // JSON 파싱 실패
    }

    // 3. Fallback: 텍스트 블록 + 툴로 수집된 장소가 있으면 지도 및 장소목록 블록 자동 보강
    const blocks: ContentBlock[] = [
      {
        type: "text",
        text: content,
      },
    ];

    if (collectedPlaces.length > 0) {
      blocks.push({
        type: "map",
        center: collectedPlaces[0].coordinates,
        markers: collectedPlaces,
      });

      blocks.push({
        type: "place_list",
        places: collectedPlaces,
      });
    }

    return blocks;
  }

  private parseDongRecommendation(content: string): DongRecommendation {
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }

    try {
      const parsed = JSON.parse(cleaned) as {
        dong?: unknown;
        reason?: unknown;
      };
      if (typeof parsed.dong === "string" && parsed.dong.trim()) {
        return {
          dong: parsed.dong.trim(),
          reason: typeof parsed.reason === "string" ? parsed.reason : "",
        };
      }
    } catch {
      // JSON 파싱 실패
    }

    throw new Error("LLM이 추천 동을 올바른 형식으로 반환하지 않았습니다.");
  }
}

export const llmClient = new LlmClient();
