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

    const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
    const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error("NAVER_MAP_CLIENT_ID or NAVER_MAP_CLIENT_SECRET is not configured");
      return NextResponse.json(
        { error: "Internal server error: API key missing" },
        { status: 500 }
      );
    }

    const encodedQuery = encodeURIComponent(query);
    const url = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodedQuery}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret,
      },
    });

    if (!response.ok) {
      console.error("Naver API error", await response.text());
      return NextResponse.json(
        { error: "Failed to fetch from Naver API" },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.addresses || data.addresses.length === 0) {
      return NextResponse.json(
        { error: "No results found for the given query" },
        { status: 404 }
      );
    }

    // 첫 번째 검색 결과를 사용
    const result = data.addresses[0];
    const lat = parseFloat(result.y);
    const lng = parseFloat(result.x);
    const addressName = result.jibunAddress || result.roadAddress;

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
