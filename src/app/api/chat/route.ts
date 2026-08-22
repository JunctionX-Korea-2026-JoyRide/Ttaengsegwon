import { NextRequest, NextResponse } from "next/server";
import { llmClient } from "@/lib/llm/client";
import { ChatApiRequest, ChatApiResponse, ContentBlock } from "@/types";

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

    const llmResponse = await llmClient.generateChatResponse(messages);

    const responsePayload: ChatApiResponse = {
      blocks: llmResponse.blocks,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Chat API error:", error);
    const errorBlocks: ContentBlock[] = [
      {
        type: "text",
        text: "요청을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      },
    ];
    return NextResponse.json(
      { blocks: errorBlocks } satisfies ChatApiResponse,
      { status: 500 }
    );
  }
}
