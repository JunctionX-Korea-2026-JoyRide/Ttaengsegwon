import React from "react";
import { AnalysisResult } from "@/types";
import { Shield, Train, MapPin, CheckCircle2 } from "lucide-react";

interface AreaScoreCardProps {
  data: AnalysisResult;
}

export const AreaScoreCard: React.FC<AreaScoreCardProps> = ({ data }) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4 my-2 text-left">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            ⚡
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              땡세권 종합 분석 지표
            </h4>
            <p className="text-xs text-slate-500">{data.summary}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-blue-600">
            {data.score}
          </span>
          <span className="text-xs font-semibold text-slate-400">/100점</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {data.transport && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center text-xs font-bold text-slate-700">
                <Train className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                대중교통 접근성
              </span>
              <span className="text-xs font-bold text-blue-600">
                {data.transport.score}점
              </span>
            </div>
            <ul className="space-y-1">
              {data.transport.nearestStations.map((station, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-600 flex items-center justify-between"
                >
                  <span>
                    {station.stationName} ({station.line})
                  </span>
                  <span className="text-slate-400 font-medium">
                    도보 {station.walkingMinutes}분 ({station.distanceMeter}m)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.safety && (
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center text-xs font-bold text-slate-700">
                <Shield className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                안심/치안 지표
              </span>
              <span className="text-xs font-bold text-emerald-600">
                {data.safety.safetyScore}점
              </span>
            </div>
            <div className="text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>인근 CCTV 수</span>
                <span className="font-medium text-slate-700">
                  {data.safety.cctvCount}대
                </span>
              </div>
              <div className="flex justify-between">
                <span>경찰서/파출소 거리</span>
                <span className="font-medium text-slate-700">
                  {data.safety.policeStationDistanceMeter}m
                </span>
              </div>
              <div className="flex justify-between">
                <span>안심가로등 밀집도</span>
                <span className="font-medium text-emerald-600">
                  {data.safety.streetLightDensity === "high"
                    ? "높음 (안전)"
                    : "보통"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.facilities && data.facilities.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-500 mb-2 flex items-center">
            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
            주요 인근 편의시설
          </span>
          <div className="flex flex-wrap gap-1.5">
            {data.facilities.map((fac, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs"
              >
                <CheckCircle2 className="w-3 h-3 mr-1 text-blue-500" />
                {fac.name} ({fac.distanceMeter}m)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
