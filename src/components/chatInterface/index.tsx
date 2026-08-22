"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { Message, ContentBlock, ChatApiResponse, AnalysisBlock, MapBlock, PlaceListBlock, TextBlock } from "@/types";
import { AreaScoreCard } from "../areaScoreCard";
import { Send, Sparkles, Building2, MapPin } from "lucide-react";
import styles from "./chatInterface.module.css";

const NaverMap = dynamic(() => import("@/components/naverMap"), { ssr: false });

function renderBlock(block: ContentBlock, index: number): React.ReactNode {
  switch (block.type) {
    case "text":
      return (
        <p key={index} className={styles.textBlock}>
          {(block as TextBlock).text}
        </p>
      );
    case "analysis": {
      const b = block as AnalysisBlock;
      return (
        <div key={index} className={styles.analysisBlock}>
          <AreaScoreCard data={b.result} />
        </div>
      );
    }
    case "map": {
      const b = block as MapBlock;
      const markers = b.markers.map((p) => ({ id: p.id, coordinates: p.coordinates, label: p.name }));
      return (
        <div key={index} className={styles.mapBlock}>
          <NaverMap markers={markers} center={b.center} />
        </div>
      );
    }
    case "place_list": {
      const b = block as PlaceListBlock;
      return (
        <ul key={index} className={styles.placeList}>
          {b.places.map((place) => (
            <li key={place.id} className={styles.placeItem}>
              <MapPin className={styles.placeIcon} />
              <div>
                <div className={styles.placeName}>{place.name}</div>
                {place.address && <div className={styles.placeAddress}>{place.address}</div>}
                {place.distance !== undefined && <div className={styles.placeDistance}>{place.distance}m</div>}
              </div>
            </li>
          ))}
        </ul>
      );
    }
    default:
      return null;
  }
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "assistant",
      content: [
        {
          type: "text",
          text: "안녕하세요! '땡세권 AI'입니다. 궁금하신 주소나 매물 위치를 말씀해주시면 MCP와 공공데이터를 기반으로 교통, 편의시설, 치안을 종합 분석해 드립니다.",
        },
      ] satisfies ContentBlock[],
      createdAt: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          })),
        }),
      });
      if (!response.ok) throw new Error("Chat request failed");
      const data: ChatApiResponse = await response.json();
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.blocks,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: [
            { type: "text", text: "분석 중 오류가 발생했습니다. 서버 연결 상태를 확인해주세요." },
          ] satisfies ContentBlock[],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Building2 width={20} height={20} color="#ffffff" />
          </div>
          <div>
            <h1 className={styles.headerTitle}>땡세권 AI (Ttaengsegwon)</h1>
            <p className={styles.headerSubtitle}>Next.js + MCP Realtime Living Quality Intelligence</p>
          </div>
        </div>
        <div className={styles.statusBadge}>
          <span className={styles.statusDot}></span>
          <span>MCP Server Connected</span>
        </div>
      </header>

      <div className={styles.messageList}>
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`${styles.messageRow} ${isUser ? styles.messageRowUser : styles.messageRowAi}`}>
              <div className={`${styles.avatar} ${isUser ? styles.avatarUser : styles.avatarAi}`}>
                {isUser ? "나" : "AI"}
              </div>
              <div className={`${styles.bubble} ${isUser ? styles.bubbleUser : styles.bubbleAi}`}>
                {typeof m.content === "string"
                  ? m.content
                  : (m.content as ContentBlock[]).map((block, i) => renderBlock(block, i))}
              </div>
            </div>
          );
        })}
        {isLoading && (
          <div className={styles.loadingRow}>
            <div className={`${styles.avatar} ${styles.avatarAi}`}>AI</div>
            <div className={styles.loadingBubble}>
              <Sparkles width={16} height={16} color="#3b82f6" className={styles.spinIcon} />
              <span>MCP를 통해 위치 데이터 및 지표를 분석 중입니다...</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputRow}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="분석하고 싶은 주소나 지역을 입력하세요 (예: 서울시 강남구 역삼동, 판교역 인근)"
            className={styles.textInput}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={styles.sendButton}
          >
            <Send width={16} height={16} />
          </button>
        </div>
      </form>
    </div>
  );
};
