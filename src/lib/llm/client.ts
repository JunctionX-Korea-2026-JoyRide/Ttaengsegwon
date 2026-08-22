import { ContentBlock, Place } from "@/types";
import { DOMAIN_TOOLS } from "@/lib/tools/definitions";
import { routeToolCall } from "@/lib/tools/router";

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

interface LlmResponse {
  blocks: ContentBlock[];
}

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
    if (!this.apiKey) {
      throw new Error("LLM_API_KEY가 설정되지 않았습니다.");
    }

    const systemPrompt = `당신은 생활권 및 장소 추천 전문 AI '땡세권'입니다.
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
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LLM API error (${response.status}): ${errorText}`);
      }

      const result = (await response.json()) as {
        choices: Array<{
          message: {
            role: "assistant";
            content: string | null;
            tool_calls?: OpenAiToolCall[];
          };
        }>;
      };

      const choice = result.choices[0];
      if (!choice || !choice.message) {
        throw new Error("No response from LLM");
      }

      const assistantMsg = choice.message;
      conversationHistory.push(assistantMsg);

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
      const content = assistantMsg.content || "";
      const parsedBlocks = this.parseContentBlocks(content, collectedPlaces);
      return { blocks: parsedBlocks };
    }

    // 최대 라운드 초과 시
    return {
      blocks: this.parseContentBlocks(
        "요청을 분석하였으나 도구 실행 단계가 초과되었습니다.",
        collectedPlaces
      ),
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

}

export const llmClient = new LlmClient();
