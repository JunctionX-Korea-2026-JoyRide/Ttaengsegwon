import { NextRequest, NextResponse } from "next/server";
import { llmClient } from "@/lib/llm/client";
import { geocodeAddress } from "@/lib/naver/geocode";
import { RecommendDongApiRequest, RecommendDongApiResponse } from "@/types";

// "전체"는 미지정을 의미하므로 프롬프트 맥락에서 제외한다.
function buildContextPrefix(body: RecommendDongApiRequest): string {
  const lines: string[] = [];
  if (body.age && body.age.trim()) lines.push(`나이: ${body.age.trim()}대`);
  if (body.gender && body.gender.trim()) lines.push(`성별: ${body.gender.trim()}`);
  if (body.district && body.district.trim() && body.district !== "전체") {
    lines.push(`희망 지역(구): ${body.district.trim()}`);
  }
  if (body.dong && body.dong.trim() && body.dong !== "전체") {
    lines.push(`희망 지역(동): ${body.dong.trim()}`);
  }
  return lines.length > 0 ? `[사용자 정보]\n${lines.join("\n")}\n\n` : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RecommendDongApiRequest;
    const { prompt } = body;

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "prompt가 필요합니다." },
        { status: 400 }
      );
    }

    const fullPrompt = `${buildContextPrefix(body)}${prompt}`;
    const recommendation = await llmClient.recommendDong(fullPrompt);
    const { dong, reason, markers, caveats, candidates } = recommendation;

    // recommend_car_free_neighborhoods 등 MCP 도구가 이미 실제 좌표를 제공한 경우
    // (candidate_name은 지오코딩 가능한 주소가 아니므로) 별도 geocoding 없이 그대로 사용한다.
    let coordinates = recommendation.coordinates;
    let address = recommendation.address;

    if (!coordinates) {
      const geocoded = await geocodeAddress(dong);
      if (!geocoded) {
        return NextResponse.json(
          { error: `'${dong}'의 위치 정보를 찾을 수 없습니다.` },
          { status: 404 }
        );
      }
      coordinates = geocoded.coordinates;
      address = geocoded.address;
    }

    const responsePayload: RecommendDongApiResponse = {
      dong,
      reason,
      address: address ?? "",
      coordinates,
      markers,
      caveats,
      candidates,
    };

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error("Recommend API error:", error);

    if (error instanceof Error && error.message.startsWith("조건(")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: "동네 추천 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
