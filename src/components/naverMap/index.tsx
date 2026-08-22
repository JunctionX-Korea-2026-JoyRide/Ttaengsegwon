"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { MapMarker as MarkerType, Coordinates } from "@/types";
import styles from "./naverMap.module.css";

interface NaverMapProps {
  markers?: MarkerType[];
  center?: Coordinates;
  boundary?: Coordinates[];
}

const DEFAULT_CENTER: Coordinates = { lat: 37.5665, lng: 126.9780 }; // 서울시청
const MIN_ZOOM = 6;
const MAX_ZOOM = 21;
const DEFAULT_ZOOM = 16;

const CATEGORY_STYLE: Record<string, { emoji: string; bg: string; label: string }> = {
  recommended: { emoji: "🏠", bg: "#2563eb", label: "추천 생활권" },
  hospital: { emoji: "🏥", bg: "#ef4444", label: "병원" },
  bus_stop: { emoji: "🚌", bg: "#16a34a", label: "버스정류장" },
  market: { emoji: "🏪", bg: "#f59e0b", label: "전통시장" },
};

function buildCategoryIcon(category?: string): naver.maps.HtmlIcon | undefined {
  const style = category ? CATEGORY_STYLE[category] : undefined;
  if (!style) return undefined;

  return {
    content: `<div style="display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;background:${style.bg};border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.35);font-size:16px;">${style.emoji}</div>`,
    size: new window.naver.maps.Size(32, 32),
    anchor: new window.naver.maps.Point(16, 16),
  };
}

export default function NaverMap({ markers = [], center, boundary }: NaverMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<naver.maps.Map | null>(null);
  const markersRef = useRef<naver.maps.Marker[]>([]);
  const infoWindowsRef = useRef<naver.maps.InfoWindow[]>([]);
  const polygonRef = useRef<naver.maps.Polygon | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercentage, setDragPercentage] = useState<number | null>(null);

  const clientId = process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID;

  // 1. 네이버 지도 스크립트 로드
  useEffect(() => {
    if (!clientId) {
      setError("NEXT_PUBLIC_NAVER_MAP_CLIENT_ID가 설정되지 않았습니다.");
      setLoading(false);
      return;
    }

    if (window.naver && window.naver.maps) {
      setLoading(false);
      return;
    }

    const scriptId = "naver-map-script";
    const existingScript = document.getElementById(scriptId);

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${clientId}`;
      script.async = true;
      script.onload = () => setLoading(false);
      script.onerror = () => {
        setError("네이버 지도 스크립트를 불러오는데 실패했습니다.");
        setLoading(false);
      };
      document.head.appendChild(script);
    } else {
      existingScript.addEventListener("load", () => setLoading(false));
    }
  }, [clientId]);

  // 2. 지도 초기화
  useEffect(() => {
    if (loading || error || !mapElementRef.current || !window.naver?.maps) return;

    if (!mapRef.current) {
      const initialCenter = center || (markers.length > 0 ? markers[0].coordinates : DEFAULT_CENTER);
      const naverCenter = new window.naver.maps.LatLng(initialCenter.lat, initialCenter.lng);

      const mapOptions: naver.maps.MapOptions = {
        center: naverCenter,
        zoom: DEFAULT_ZOOM,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        zoomControl: false, // 커스텀 줌 컨트롤러 사용
        scaleControl: false,
        mapDataControl: false,
      };

      const mapInstance = new window.naver.maps.Map(mapElementRef.current, mapOptions);
      mapRef.current = mapInstance;

      window.naver.maps.Event.addListener(mapInstance, "zoom_changed", (zoom: number) => {
        setZoomLevel(zoom);
      });

      setMapReady(true);
    }
  }, [loading, error, center, markers]);

  // 3. Center 변경 감지 및 이동
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;
    if (center) {
      const targetLatLng = new window.naver.maps.LatLng(center.lat, center.lng);
      mapRef.current.morph(targetLatLng, mapRef.current.getZoom());
    } else if (markers.length > 0) {
      const firstCoord = markers[0].coordinates;
      const targetLatLng = new window.naver.maps.LatLng(firstCoord.lat, firstCoord.lng);
      mapRef.current.morph(targetLatLng, mapRef.current.getZoom());
    }
  }, [center, markers, mapReady]);

  // 4. 마커 및 인포윈도우 렌더링
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;

    // 기존 마커 및 인포윈도우 제거
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current = [];

    markers.forEach((markerData) => {
      const position = new window.naver.maps.LatLng(
        markerData.coordinates.lat,
        markerData.coordinates.lng
      );

      const marker = new window.naver.maps.Marker({
        position,
        map: mapRef.current!,
        title: markerData.label,
        animation: window.naver.maps.Animation.DROP,
        icon: buildCategoryIcon(markerData.category),
      });

      const categoryStyle = markerData.category
        ? CATEGORY_STYLE[markerData.category]
        : undefined;

      const contentString = `
        <div style="padding: 10px; min-width: 140px; text-align: center; font-family: sans-serif;">
          ${
            categoryStyle
              ? `<div style="font-size: 11px; color: ${categoryStyle.bg}; font-weight: 600; margin-bottom: 2px;">${categoryStyle.emoji} ${categoryStyle.label}</div>`
              : ""
          }
          <div style="font-weight: 600; font-size: 13px; color: #1e293b;">${markerData.label}</div>
          ${
            markerData.address
              ? `<div style="font-size: 11px; color: #64748b; margin-top: 2px;">${markerData.address}</div>`
              : ""
          }
          ${
            markerData.score
              ? `<div style="font-size: 11px; color: #2563eb; margin-top: 4px; font-weight: bold;">추천 점수: ${markerData.score}점</div>`
              : ""
          }
        </div>
      `;

      const infoWindow = new window.naver.maps.InfoWindow({
        content: contentString,
        backgroundColor: "#ffffff",
        borderColor: "#cbd5e1",
        borderWidth: 1,
        anchorSize: new window.naver.maps.Size(10, 10),
        anchorSkew: true,
      });

      window.naver.maps.Event.addListener(marker, "click", () => {
        if (infoWindow.getMap()) {
          infoWindow.close();
        } else {
          infoWindow.open(mapRef.current!, marker);
        }
      });

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infoWindow);
    });
  }, [markers, mapReady]);

  // 5. 동 경계 폴리곤 렌더링
  useEffect(() => {
    if (!mapRef.current || !window.naver?.maps) return;

    if (polygonRef.current) {
      polygonRef.current.setMap(null);
      polygonRef.current = null;
    }

    if (boundary && boundary.length > 0) {
      const path = boundary.map(
        (c) => new window.naver.maps.LatLng(c.lat, c.lng)
      );

      polygonRef.current = new window.naver.maps.Polygon({
        map: mapRef.current,
        paths: [path],
        fillColor: "#3b82f6",
        fillOpacity: 0.15,
        strokeColor: "#2563eb",
        strokeOpacity: 0.8,
        strokeWeight: 2,
      });
    }
  }, [boundary, mapReady]);

  // 6. 줌 컨트롤 로직
  const zoomIn = () => {
    if (!mapRef.current) return;
    const current = mapRef.current.getZoom();
    if (current < MAX_ZOOM) {
      mapRef.current.setZoom(current + 1, true);
    }
  };

  const zoomOut = () => {
    if (!mapRef.current) return;
    const current = mapRef.current.getZoom();
    if (current > MIN_ZOOM) {
      mapRef.current.setZoom(current - 1, true);
    }
  };

  const calculatePercentageFromY = useCallback((clientY: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return percentage;
  }, []);

  const handleTrackMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!mapRef.current) return;
    setIsDragging(true);
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const percentage = calculatePercentageFromY(clientY);
    setDragPercentage(percentage);

    // 위쪽(0%)이 MAX_ZOOM, 아래쪽(100%)이 MIN_ZOOM
    const newZoom = Math.round(MAX_ZOOM - percentage * (MAX_ZOOM - MIN_ZOOM));
    mapRef.current.setZoom(newZoom);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!mapRef.current) return;
      const percentage = calculatePercentageFromY(e.clientY);
      setDragPercentage(percentage);
      const newZoom = Math.round(MAX_ZOOM - percentage * (MAX_ZOOM - MIN_ZOOM));
      mapRef.current.setZoom(newZoom);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!mapRef.current) return;
      const percentage = calculatePercentageFromY(e.touches[0].clientY);
      setDragPercentage(percentage);
      const newZoom = Math.round(MAX_ZOOM - percentage * (MAX_ZOOM - MIN_ZOOM));
      mapRef.current.setZoom(newZoom);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      setDragPercentage(null);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onMouseUp);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [isDragging, calculatePercentageFromY]);

  // 핸들 위치 계산: 네이버 지도는 zoom이 높을수록 확대(위쪽 0%)
  const handlePositionPercentage =
    isDragging && dragPercentage !== null
      ? dragPercentage * 100
      : ((MAX_ZOOM - zoomLevel) / (MAX_ZOOM - MIN_ZOOM)) * 100;

  if (loading) {
    return (
    <div className={styles.loading}>
        <span className={styles.loadingText}>네이버 지도를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error}>
        <span className={styles.errorText}>
          {error} (환경 변수를 확인해주세요.)
        </span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* 커스텀 줌 컨트롤 바 */}
      <div className={styles.zoomControl}>
        {/* + 버튼 (원형) */}
        <button
          onClick={zoomIn}
          className={`${styles.zoomBtn} ${styles.zoomIn}`}
          aria-label="확대"
        >
          +
        </button>

        {/* 줌 트랙 및 드래그 핸들 */}
        <div
          ref={trackRef}
          className={styles.track}
          onMouseDown={handleTrackMouseDown}
          onTouchStart={handleTrackMouseDown}
        >
          {/* 드래그 가능한 손잡이 */}
          <div
            className={styles.handle}
            style={{
              top: `${handlePositionPercentage}%`,
              transform: "translateY(-50%)",
              transition: isDragging ? "none" : "top 0.2s ease-out",
            }}
          />
        </div>

        {/* - 버튼 (원형) */}
        <button
          onClick={zoomOut}
          className={`${styles.zoomBtn} ${styles.zoomOut}`}
          aria-label="축소"
        >
          -
        </button>
      </div>

      {/* 네이버 지도 캔버스 컨테이너 */}
      <div ref={mapElementRef} className={styles.mapCanvas} />
    </div>
  );
}
