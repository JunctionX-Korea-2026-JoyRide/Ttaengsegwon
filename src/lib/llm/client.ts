import { AnalysisResult } from "@/types";

interface ChatCompletionMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface LlmResponse {
  message: string;
  data?: AnalysisResult;
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
    messages: ChatCompletionMessage[],
    systemPrompt?: string
  ): Promise<LlmResponse> {
    if (!this.apiKey) {
      // Mock fallback response for initial development without API keys
      return {
        message:
          "LLM API 키가 설정되지 않았습니다. .env.local에 LLM_API_KEY를 설정해주세요.",
        data: {
          score: 85,
          summary:
            "테스트용 기본 분석 데이터입니다. 교통 및 편의시설이 우수한 지역입니다.",
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
      };
    }

    const payloadMessages: ChatCompletionMessage[] = [];
    if (systemPrompt) {
      payloadMessages.push({ role: "system", content: systemPrompt });
    }
    payloadMessages.push(...messages);

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
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`LLM API error (${response.status}): ${errorText}`);
    }

    const result = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };

    const content = result.choices[0]?.message?.content || "";

    try {
      // Try to parse structured JSON if returned
      const parsed = JSON.parse(content);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "message" in parsed
      ) {
        return parsed as LlmResponse;
      }
    } catch {
      // Plain text response
    }

    return {
      message: content,
    };
  }
}

export const llmClient = new LlmClient();
