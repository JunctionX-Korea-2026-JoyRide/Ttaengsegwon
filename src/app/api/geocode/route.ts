import { NextResponse } from "next/server";
import { GeocodingApiResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { error: "Invalid query parameter" },
        { status: 400 }
      );
    }

    const apiKey = process.env.KAKAO_REST_API_KEY;
    if (!apiKey) {
      console.error("KAKAO_REST_API_KEY is not configured");
      return NextResponse.json(
        { error: "Internal server error: API key missing" },
        { status: 500 }
      );
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodedQuery}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `KakaoAK ${apiKey}`,
      },
    });

    if (!response.ok) {
      console.error("Kakao API error", await response.text());
      return NextResponse.json(
        { error: "Failed to fetch from Kakao API" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.documents || data.documents.length === 0) {
      return NextResponse.json(
        { error: "No results found for the given query" },
        { status: 404 }
      );
    }

    // 첫 번째 검색 결과를 사용
    const result = data.documents[0];
    const lat = parseFloat(result.y);
    const lng = parseFloat(result.x);
    const addressName = result.address_name;

    const responseData: GeocodingApiResponse = {
      coordinates: { lat, lng },
      address: addressName,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
