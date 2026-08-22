"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import {
  Message,
  ContentBlock,
  ChatApiResponse,
  AnalysisBlock,
  MapBlock,
  PlaceListBlock,
  TextBlock,
} from "@/types";
import { AreaScoreCard } from "../areaScoreCard";
import { Send, Sparkles, Building2, MapPin } from "lucide-react";

// NaverMap은 SSR 비활성화 필요
const NaverMap = dynamic(() => import("@/components/naverMap"), { ssr: false });

// ============================================================
// ContentBlock 동적 렌더러
// ============================================================

function renderBlock(block: ContentBlock, index: number): React.ReactNode {
  switch (block.type) {
    case "text":
      return (
        <p key={index} className="whitespace-pre-wrap text-sm leading-relaxed">
          {(block as TextBlock).text}
        </p>
      );

    case "analysis": {
      const b = block as AnalysisBlock;
      return (
        <div key={index} className="mt-2">
          <AreaScoreCard data={b.result} />
        </div>
      );
    }

    case "map": {
      const b = block as MapBlock;
      const markers = b.markers.map((p) => ({
        id: p.id,
        coordinates: p.coordinates,
        label: p.name,
      }));
      return (
        <div key={index} className="mt-2 h-64 w-full rounded-xl overflow-hidden border border-slate-200">
          <NaverMap markers={markers} center={b.center} />
        </div>
      );
    }

    case "place_list": {
      const b = block as PlaceListBlock;
      return (
        <ul key={index} className="mt-2 space-y-2">
          {b.places.map((place) => (
            <li
              key={place.id}
              className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100 text-sm"
            >
              <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
              <div>
                <div className="font-semibold text-slate-800">{place.name}</div>
                {place.address && (
                  <div className="text-xs text-slate-500 mt-0.5">{place.address}</div>
                )}
                {place.distance !== undefined && (
                  <div className="text-xs text-blue-600 mt-0.5">{place.distance}m</div>
                )}
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

// ============================================================
// ChatInterface
// ============================================================

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
            // ContentBlock[] → 서버 전달 시 stringify
            content:
              typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Chat request failed");
      }

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
            {
              type: "text",
              text: "분석 중 오류가 발생했습니다. 서버 연결 상태를 확인해주세요.",
            },
          ] satisfies ContentBlock[],
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-100 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight">
              땡세권 AI (Ttaengsegwon)
            </h1>
            <p className="text-xs text-slate-400">
              Next.js + MCP Realtime Living Quality Intelligence
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>MCP Server Connected</span>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-semibold ${
                  isUser ? "bg-slate-800 text-white" : "bg-blue-600 text-white"
                }`}
              >
                {isUser ? "나" : "AI"}
              </div>
              <div
                className={`max-w-[80%] space-y-1 rounded-2xl px-4 py-3 ${
                  isUser
                    ? "bg-slate-900 text-white rounded-tr-none shadow-sm text-sm leading-relaxed whitespace-pre-wrap"
                    : "bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-xs"
                }`}
              >
                {/* user: 단순 string / assistant: ContentBlock[] 렌더러 */}
                {typeof m.content === "string"
                  ? m.content
                  : (m.content as ContentBlock[]).map((block, i) =>
                      renderBlock(block, i)
                    )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
              AI
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs text-slate-500 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-500 animate-spin" />
              <span>MCP를 통해 위치 데이터 및 지표를 분석 중입니다...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-4 bg-white border-t border-slate-100"
      >
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="분석하고 싶은 주소나 지역을 입력하세요 (예: 서울시 강남구 역삼동, 판교역 인근)"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
