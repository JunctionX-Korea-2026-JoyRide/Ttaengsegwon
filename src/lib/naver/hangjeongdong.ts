import fs from "fs";
import path from "path";
import { Coordinates } from "@/types";

type Position = [number, number];
type LinearRing = Position[];

interface HangJeongDongFeature {
  properties: { adm_nm: string };
  geometry:
    | { type: "Polygon"; coordinates: LinearRing[] }
    | { type: "MultiPolygon"; coordinates: LinearRing[][] };
}

interface HangJeongDongGeoJson {
  type: "FeatureCollection";
  features: HangJeongDongFeature[];
}

const GEOJSON_PATH = path.join(
  process.cwd(),
  "data",
  "HangJeongDong_ver20260701.geojson"
);

let cachedFeatures: HangJeongDongFeature[] | null = null;

function loadFeatures(): HangJeongDongFeature[] {
  if (cachedFeatures) return cachedFeatures;

  const raw = fs.readFileSync(GEOJSON_PATH, "utf-8");
  const parsed = JSON.parse(raw) as unknown;

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as { type?: unknown }).type !== "FeatureCollection" ||
    !Array.isArray((parsed as { features?: unknown }).features)
  ) {
    throw new Error("HangJeongDong geojson 형식이 올바르지 않습니다.");
  }

  cachedFeatures = (parsed as HangJeongDongGeoJson).features;
  return cachedFeatures;
}

// 섬 등 부속 폴리곤을 제외하고 가장 큰 외곽 링만 사용합니다.
function extractOuterRing(geometry: HangJeongDongFeature["geometry"]): LinearRing {
  const polygons =
    geometry.type === "MultiPolygon" ? geometry.coordinates : [geometry.coordinates];

  let largest = polygons[0][0];
  for (const polygon of polygons) {
    const outerRing = polygon[0];
    if (outerRing.length > largest.length) {
      largest = outerRing;
    }
  }
  return largest;
}

function toCoordinates(ring: LinearRing): Coordinates[] {
  return ring.map(([lng, lat]) => ({ lat, lng }));
}

/**
 * 동 이름 또는 주소 문자열로 행정동 경계를 조회합니다.
 * adm_nm(예: "서울특별시 종로구 사직동")이 query에 완전히 포함되는 매칭을 우선하고,
 * "역삼동"처럼 시/구 없이 동 이름만 온 경우 adm_nm의 접미 매칭으로 보완합니다.
 * 동명이 여러 지역에 존재해 매칭이 여러 개면(예: 부암동) 오탐을 막기 위해 매칭하지 않습니다.
 */
// 공백 유무만 다른 표기 차이를 흡수한다.
// (예: 주소는 "포항시 남구"처럼 띄어 쓰지만, geojson의 adm_nm은 "포항시남구"로 붙여 쓴다.)
function stripSpaces(s: string): string {
  return s.replace(/\s+/g, "");
}

export function findHangJeongDongBoundary(query: string): Coordinates[] | undefined {
  const trimmed = query.trim();
  if (!trimmed) return undefined;

  const features = loadFeatures();
  const normalizedQuery = stripSpaces(trimmed);

  const containsMatches = features.filter((f) =>
    normalizedQuery.includes(stripSpaces(f.properties.adm_nm))
  );
  const matches =
    containsMatches.length > 0
      ? containsMatches
      : features.filter((f) => normalizedQuery.endsWith(stripSpaces(f.properties.adm_nm)));

  if (matches.length === 0) return undefined;

  if (matches.length > 1) {
    console.warn(
      `"${trimmed}"에 매칭되는 행정동이 ${matches.length}개입니다: ${matches
        .map((m) => m.properties.adm_nm)
        .join(", ")}`
    );
    return undefined;
  }

  return toCoordinates(extractOuterRing(matches[0].geometry));
}
