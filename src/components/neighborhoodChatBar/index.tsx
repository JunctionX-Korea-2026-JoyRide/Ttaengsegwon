"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { RecommendDongApiResponse } from "@/types";
import { saveRecommendCandidates } from "@/lib/recommendCandidates";

export const NeighborhoodChatBar: React.FC = () => {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "추천에 실패했습니다.");
      }

      const result = data as RecommendDongApiResponse;

      if (result.candidates && result.candidates.length > 0) {
        saveRecommendCandidates(result.candidates);
      }

      const params = new URLSearchParams({
        dong: result.dong,
        address: result.address,
        lat: String(result.coordinates.lat),
        lng: String(result.coordinates.lng),
      });

      router.push(`/maps?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "추천 중 오류가 발생했습니다."
      );
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mb-10">
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
        <Sparkles className="w-4 h-4 text-blue-500 shrink-0" />
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 조용하고 대중교통 편한 동네 추천해줘"
          className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          aria-label="동네 추천 요청"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      {loading && (
        <p className="mt-2 text-xs text-slate-500 text-center">
          AI가 가장 적합한 동네를 분석 중입니다...
        </p>
      )}
      {error && (
        <p className="mt-2 text-xs text-red-500 text-center">{error}</p>
      )}
    </form>
  );
};

export default NeighborhoodChatBar;
