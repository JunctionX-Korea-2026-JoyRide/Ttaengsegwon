import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/naver/geocode";

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

    const result = await geocodeAddress(query);

    if (!result) {
      return NextResponse.json(
        { error: "No results found for the given query" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Geocoding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
