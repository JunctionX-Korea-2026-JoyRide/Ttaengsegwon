import { NextRequest, NextResponse } from "next/server";
import { findHangJeongDongBoundary } from "@/lib/naver/hangjeongdong";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("query");

  if (!query || typeof query !== "string") {
    return NextResponse.json(
      { error: "query 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  try {
    const boundary = findHangJeongDongBoundary(query);

    if (!boundary) {
      return NextResponse.json(
        { error: `'${query}'에 해당하는 행정동 경계를 찾을 수 없습니다.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ boundary });
  } catch (error) {
    console.error("Boundary lookup error:", error);
    return NextResponse.json(
      { error: "경계 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
