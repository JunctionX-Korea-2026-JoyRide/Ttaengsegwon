"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { RecommendDongApiResponse } from "@/types";
import { saveRecommendCandidates } from "@/lib/recommendCandidates";
import styles from "./neighborhoodChatBar.module.css";

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
      const response = await fetch("/api/recommend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "추천에 실패했습니다.");
      const result = data as RecommendDongApiResponse;
      if (result.candidates && result.candidates.length > 0) saveRecommendCandidates(result.candidates);
      const params = new URLSearchParams({ dong: result.dong, address: result.address, lat: String(result.coordinates.lat), lng: String(result.coordinates.lng) });
      router.push(`/maps?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "추천 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputWrapper}>
        <Sparkles className={styles.sparklesIcon} />
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="예: 조용하고 대중교통 편한 동네 추천해줘"
          className={styles.input}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className={styles.submitButton}
          aria-label="동네 추천 요청"
        >
          <Send className={styles.sendIcon} />
        </button>
      </div>
      {loading && <p className={styles.loadingText}>AI가 가장 적합한 동네를 분석 중입니다...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
    </form>
  );
};

export default NeighborhoodChatBar;
