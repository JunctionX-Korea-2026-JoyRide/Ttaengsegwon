"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Sparkles } from "lucide-react";
import { savePendingRecommendation } from "@/lib/pendingRecommendation";
import styles from "./neighborhoodChatBar.module.css";

export const NeighborhoodChatBar: React.FC = () => {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    const saved = savePendingRecommendation({
      prompt: prompt.trim(),
      stream: true,
    });
    if (!saved) {
      setError(
        "추천 요청을 저장하지 못했습니다. 브라우저 설정을 확인해주세요."
      );
      setLoading(false);
      return;
    }
    router.push("/maps?pending=1");
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
      {loading && (
        <p className={styles.loadingText}>
          AI가 가장 적합한 동네를 분석 중입니다...
        </p>
      )}
      {error && <p className={styles.errorText}>{error}</p>}
    </form>
  );
};

export default NeighborhoodChatBar;
