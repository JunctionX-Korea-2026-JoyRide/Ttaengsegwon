import { NextRequest, NextResponse } from "next/server";
import { llmClient } from "@/lib/llm/client";
import { geocodeAddress } from "@/lib/naver/geocode";
import {
  RecommendDongApiRequest,
  RecommendDongApiResponse,
  RecommendDongStreamEvent,
  RecommendationProgressEvent,
} from "@/types";

// "전체"는 미지정을 의미하므로 프롬프트 맥락에서 제외한다.
function buildContextPrefix(body: RecommendDongApiRequest): string {
  const lines: string[] = [];
  if (body.age && body.age.trim()) lines.push(`나이: ${body.age.trim()}대`);
  if (body.gender && body.gender.trim())
    lines.push(`성별: ${body.gender.trim()}`);
  if (body.district && body.district.trim() && body.district !== "전체") {
    lines.push(`희망 지역(구): ${body.district.trim()}`);
  }
  if (body.dong && body.dong.trim() && body.dong !== "전체") {
    lines.push(`희망 지역(동): ${body.dong.trim()}`);
  }
  return lines.length > 0 ? `[사용자 정보]\n${lines.join("\n")}\n\n` : "";
}

function publicErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.startsWith("조건(")) {
    return error.message;
  }
  return "동네 추천 처리 중 오류가 발생했습니다.";
}

function progressEvent(
  stage: RecommendationProgressEvent["stage"],
  title: string,
  detail?: string
): RecommendationProgressEvent {
  return {
    id: `${stage}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stage,
    title,
    detail,
  };
}

async function createRecommendation(
  body: RecommendDongApiRequest,
  onProgress?: (event: RecommendationProgressEvent) => void
): Promise<RecommendDongApiResponse> {
  onProgress?.(
    progressEvent(
      "request",
      "요청 조건 정리 중",
      [body.age && `${body.age}대`, body.gender, body.district, body.dong]
        .filter((value): value is string => Boolean(value && value !== "전체"))
        .join(" · ") || "입력한 추천 문장을 기준으로 분석합니다."
    )
  );

  const fullPrompt = `${buildContextPrefix(body)}${body.prompt}`;
  const recommendation = await llmClient.recommendDong(fullPrompt, onProgress);
  const { dong, reason, markers, caveats, candidates } = recommendation;

  let coordinates = recommendation.coordinates;
  let address = recommendation.address;

  if (!coordinates) {
    onProgress?.(
      progressEvent(
        "geocoding",
        "지도 위치 찾는 중",
        `${dong}의 실제 좌표와 주소를 확인합니다.`
      )
    );
    const geocoded = await geocodeAddress(dong);
    if (!geocoded) {
      throw new Error(`'${dong}'의 위치 정보를 찾을 수 없습니다.`);
    }
    coordinates = geocoded.coordinates;
    address = geocoded.address;
  }

  onProgress?.(
    progressEvent(
      "finalizing",
      "추천 결과 표시 중",
      "후보와 주변 시설을 보기 쉽게 정리합니다."
    )
  );

  return {
    dong,
    reason,
    address: address ?? "",
    coordinates,
    markers,
    caveats,
    candidates,
  };
}

function streamRecommendation(body: RecommendDongApiRequest): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      const send = (event: RecommendDongStreamEvent) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        } catch {
          open = false;
        }
      };

      void createRecommendation(body, (event) =>
        send({ type: "progress", event })
      )
        .then((data) => send({ type: "complete", data }))
        .catch((error: unknown) => {
          console.error("Recommend stream error:", error);
          send({ type: "error", message: publicErrorMessage(error) });
        })
        .finally(() => {
          if (!open) return;
          open = false;
          controller.close();
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody: unknown = await req.json();
    if (typeof rawBody !== "object" || rawBody === null) {
      return NextResponse.json(
        { error: "올바른 요청 본문이 필요합니다." },
        { status: 400 }
      );
    }
    const body = rawBody as RecommendDongApiRequest;
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "prompt가 필요합니다." },
        { status: 400 }
      );
    }

    if (body.stream === true) {
      return streamRecommendation(body);
    }

    return NextResponse.json(await createRecommendation(body));
  } catch (error) {
    console.error("Recommend API error:", error);

    const message = publicErrorMessage(error);
    if (message.startsWith("조건(")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "동네 추천 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
