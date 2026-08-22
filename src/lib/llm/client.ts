import { ContentBlock } from "@/types";

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
      // API 키 없을 때 개발용 mock 응답 (ContentBlock[] 구조)
      return {
        blocks: [
          {
            type: "text",
            text: "LLM API 키가 설정되지 않았습니다. .env.local에 LLM_API_KEY를 설정해주세요.\n\n(아래는 개발용 Mock 분석 결과입니다.)",
          },
          {
            type: "analysis",
            address: "강남구 역삼동",
            result: {
              score: 85,
              summary: "테스트용 기본 분석 데이터입니다. 교통 및 편의시설이 우수한 지역입니다.",
              transport: {
                score: 90,
                nearestStations: [
                  {
                    stationName: "강남역",
                    line: "2호선/신분당선",
                    distanceMeter: 250,
                    walkingMinutes: 3,
                  },
                ],
              },
              safety: {
                cctvCount: 14,
                policeStationDistanceMeter: 400,
                streetLightDensity: "high",
                safetyScore: 88,
              },
            },
          },
        ],
      };
    }

    const systemPrompt = `당신은 주거 입지 및 생활 편의성 분석 전문가 '땡세권 AI'입니다.
사용자가 특정 지역이나 주소를 문의하면 교통, 편의시설, 치안, 거주 편의성을 종합적으로 분석하여 안내합니다.

반드시 아래 ContentBlock 배열 JSON 형식으로만 응답하십시오. 다른 텍스트는 포함하지 마세요.
[
  { "type": "text", "text": "사용자에게 전할 설명" },
  {
    "type": "analysis",
    "address": "분석한 주소",
    "result": {
      "score": 85,
      "summary": "핵심 요약",
      "transport": { "score": 90, "nearestStations": [{ "stationName": "역이름", "line": "호선", "distanceMeter": 300, "walkingMinutes": 4 }] },
      "safety": { "cctvCount": 15, "policeStationDistanceMeter": 350, "streetLightDensity": "high", "safetyScore": 88 }
    }
  }
]`;

    const payloadMessages: ChatCompletionMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: payloadMessages,
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = result.choices[0]?.message?.content || "[]";

    try {
      const parsed: unknown = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return { blocks: parsed as ContentBlock[] };
      }
    } catch {
      // 파싱 실패 시 텍스트 블록으로 fallback
    }

    return {
      blocks: [{ type: "text", text: content }],
    };
  }
}

export const llmClient = new LlmClient();
