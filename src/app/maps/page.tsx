"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { Coordinates, MapMarker } from "@/types";

// NaverMap 컴포넌트를 SSR 없이 불러옵니다.
const NaverMap = dynamic(() => import("@/components/naverMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100">
      <span className="text-slate-500">지도를 준비 중입니다...</span>
    </div>
  ),
});

export default function MapsPage() {
  const [query, setQuery] = useState("");
  const [center, setCenter] = useState<Coordinates | undefined>(undefined);
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error("Failed to search address");
      }

      const data = await response.json();
      const newCenter: Coordinates = data.coordinates;

      setCenter(newCenter);
      
      // 검색된 위치를 마커로 추가
      const newMarker: MapMarker = {
        id: Date.now().toString(),
        coordinates: newCenter,
        label: data.address,
        score: Math.floor(Math.random() * 41) + 60, // 임시 점수 (60~100)
      };
      
      setMarkers([newMarker]);
    } catch (err) {
      console.error(err);
      alert("주소 검색에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-50">
      {/* 플로팅 검색바 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-11/12 max-w-md">
        <form
          onSubmit={handleSearch}
          className="relative bg-white rounded-2xl shadow-lg flex items-center p-2"
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="주소를 입력하세요 (예: 강남역)"
            className="w-full pl-4 pr-12 py-2 text-base text-slate-800 bg-transparent focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="absolute right-3 p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors disabled:bg-slate-300 disabled:hover:bg-slate-300"
          >
            <Search className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* 지도 영역 */}
      <div className="w-full h-full">
        <NaverMap markers={markers} center={center} />
      </div>
    </main>
  );
}
