import { GeocodingApiResponse } from "@/types";

interface NaverGeocodeAddress {
  x: string;
  y: string;
  jibunAddress?: string;
  roadAddress?: string;
}

interface NaverGeocodeResponse {
  addresses: NaverGeocodeAddress[];
}

export async function geocodeAddress(
  query: string
): Promise<GeocodingApiResponse | null> {
  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;
  const clientSecret = process.env.NAVER_MAP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "NAVER_MAP_CLIENT_ID or NAVER_MAP_CLIENT_SECRET is not configured"
    );
  }

  const url = `https://maps.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-NCP-APIGW-API-KEY-ID": clientId,
      "X-NCP-APIGW-API-KEY": clientSecret,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Naver geocode API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as NaverGeocodeResponse;

  if (!data.addresses || data.addresses.length === 0) {
    return null;
  }

  const result = data.addresses[0];

  return {
    coordinates: {
      lat: parseFloat(result.y),
      lng: parseFloat(result.x),
    },
    address: result.jibunAddress || result.roadAddress || query,
  };
}
