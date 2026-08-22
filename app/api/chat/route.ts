import { NextRequest, NextResponse } from "next/server";
import { llmClient } from "@/lib/llm/client";
import { ChatApiRequest, ChatApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatApiRequest;
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const systemPrompt = `당신은 주거 입지 및 생활 편의성 분석 전문가 '땡세권 AI'입니다.
사용자가 특정 지역이나 주소를 문의하면 교통, 편의시설, 치안, 거주 편의성을 종합적으로 분석하여 안내합니다.
친절하고 명확한 어조로 설명하며, 구조화된 분석 정보를 함께 제공합니다.

반드시 다음 JSON 형식으로 응답할 수 있습니다:
{
  "message": "사용자에게 전할 답변 텍스트",
  "data": {
    "score": 85,
    "summary": "핵심 입지 요약",
    "transport": {
      "score": 90,
      "nearestStations": [
        { "stationName": "역이름", "line": "호선", "distanceMeter": 300, "walkingMinutes": 4 }
      ]
    },
    "safety": {
      "cctvCount": 15,
      "policeStationDistanceMeter": 350,
      "streetLightDensity": "high",
      "safetyScore": 88
    }
  }
}`;

    const llmResponse = await llmClient.generateChatResponse(
      messages,
      systemPrompt
    );

    const responsePayload: ChatApiResponse = {
      message: llmResponse.message,
      data: llmResponse.data,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      {
        message:
          "요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 }
    );
  }
}
