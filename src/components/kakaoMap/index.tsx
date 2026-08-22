"use client";

import React, { useState, useEffect, useRef } from "react";
import { Map, MapMarker, useKakaoLoader } from "react-kakao-maps-sdk";
import { MapMarker as MarkerType, Coordinates } from "@/types";

interface KakaoMapProps {
  markers?: MarkerType[];
  center?: Coordinates;
}

const DEFAULT_CENTER = { lat: 37.5665, lng: 126.9780 }; // 서울시청
const MIN_LEVEL = 1;
const MAX_LEVEL = 14;

export default function KakaoMap({ markers = [], center }: KakaoMapProps) {
  // 카카오맵 스크립트 로드
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_MAP_API_KEY as string, // 발급받은 JS 키
  });

  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(3);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercentage, setDragPercentage] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const calculatePercentageFromY = (clientY: number) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const percentage = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return percentage;
  };

  const handleTrackMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!map) return;
    setIsDragging(true);
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const percentage = calculatePercentageFromY(clientY);
    setDragPercentage(percentage);
    
    const newLevel = Math.round(MIN_LEVEL + percentage * (MAX_LEVEL - MIN_LEVEL));
    map.setLevel(newLevel);
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => {
      if (!map) return;
      const percentage = calculatePercentageFromY(e.clientY);
      setDragPercentage(percentage);
      const newLevel = Math.round(MIN_LEVEL + percentage * (MAX_LEVEL - MIN_LEVEL));
      map.setLevel(newLevel);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!map) return;
      const percentage = calculatePercentageFromY(e.touches[0].clientY);
      setDragPercentage(percentage);
      const newLevel = Math.round(MIN_LEVEL + percentage * (MAX_LEVEL - MIN_LEVEL));
      map.setLevel(newLevel);
    };

    const onMouseUp = () => {
      setIsDragging(false);
      setDragPercentage(null);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, map]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <span className="text-slate-500">지도를 불러오는 중입니다...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-100">
        <span className="text-red-500">
          지도 스크립트를 불러오는데 실패했습니다. API 키를 확인해주세요.
        </span>
      </div>
    );
  }

  const mapCenter = center || (markers.length > 0 ? markers[0].coordinates : DEFAULT_CENTER);

  const zoomIn = () => {
    if (!map) return;
    map.setLevel(map.getLevel() - 1, { animate: true });
  };

  const zoomOut = () => {
    if (!map) return;
    map.setLevel(map.getLevel() + 1, { animate: true });
  };

  // 핸들 위치 계산 (드래그 중일 때는 마우스 위치, 아닐 때는 현재 지도 레벨 기준)
  const handlePositionPercentage = isDragging && dragPercentage !== null
    ? dragPercentage * 100
    : ((zoomLevel - MIN_LEVEL) / (MAX_LEVEL - MIN_LEVEL)) * 100;

  return (
    <div className="relative w-full h-full">
      {/* 커스텀 줌 컨트롤 바 */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-2">
        {/* + 버튼 (원형) */}
        <button
          onClick={zoomIn}
          className="w-10 h-10 flex items-center justify-center bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-md rounded-full border border-slate-200 font-medium text-xl"
          aria-label="확대"
        >
          +
        </button>

        {/* 줌 트랙 및 드래그 핸들 */}
        <div 
          ref={trackRef}
          className="relative w-2 h-32 bg-white/80 border border-slate-200 rounded-full shadow-inner cursor-pointer flex justify-center py-2 box-content"
          onMouseDown={handleTrackMouseDown}
          onTouchStart={handleTrackMouseDown}
        >
          {/* 드래그 가능한 손잡이 */}
          <div 
            className="absolute w-4 h-6 bg-blue-500 rounded-full shadow-md cursor-grab active:cursor-grabbing hover:bg-blue-600 transition-colors -ml-1"
            style={{ 
              top: `${handlePositionPercentage}%`,
              transform: 'translateY(-50%)',
              transition: isDragging ? 'none' : 'top 0.2s ease-out'
            }}
          />
        </div>

        {/* - 버튼 (원형) */}
        <button
          onClick={zoomOut}
          className="w-10 h-10 flex items-center justify-center bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-md rounded-full border border-slate-200 font-medium text-2xl leading-none pb-1"
          aria-label="축소"
        >
          -
        </button>
      </div>

      <Map
        center={mapCenter}
        style={{ width: "100%", height: "100%" }}
        level={zoomLevel}
        onCreate={setMap}
        onZoomChanged={(m) => setZoomLevel(m.getLevel())}
      >
        {markers.map((marker) => (
          <MapMarker
            key={marker.id}
            position={marker.coordinates}
            onClick={() => setActiveMarker(marker.id)}
          >
            {activeMarker === marker.id && (
              <div style={{ padding: "5px", color: "#000", width: "150px", textAlign: "center" }}>
                <div className="font-semibold text-sm">{marker.label}</div>
                {marker.score && (
                  <div className="text-xs mt-1 text-blue-600">
                    추천 점수: {marker.score}점
                  </div>
                )}
              </div>
            )}
          </MapMarker>
        ))}
      </Map>
    </div>
  );
}
