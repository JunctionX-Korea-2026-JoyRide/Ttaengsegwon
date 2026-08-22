import React from "react";
import { AnalysisResult } from "@/types";
import { Shield, Train, MapPin, CheckCircle2 } from "lucide-react";
import styles from "./areaScoreCard.module.css";

interface AreaScoreCardProps {
  data: AnalysisResult;
}

export const AreaScoreCard: React.FC<AreaScoreCardProps> = ({ data }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.iconBox}>⚡</div>
          <div className={styles.titleGroup}>
            <h4 className={styles.title}>땡세권 종합 분석 지표</h4>
            <p className={styles.summary}>{data.summary}</p>
          </div>
        </div>
        <div className={styles.scoreBox}>
          <span className={styles.scoreValue}>{data.score}</span>
          <span className={styles.scoreUnit}>/100점</span>
        </div>
      </div>

      <div className={styles.grid}>
        {data.transport && (
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardLabel}>
                <Train className={`${styles.infoCardLabelIcon} ${styles.iconBlue}`} />
                대중교통 접근성
              </span>
              <span className={styles.transportScore}>{data.transport.score}점</span>
            </div>
            <ul className={styles.stationList}>
              {data.transport.nearestStations.map((station, idx) => (
                <li key={idx} className={styles.stationItem}>
                  <span>{station.stationName} ({station.line})</span>
                  <span className={styles.stationDistance}>
                    도보 {station.walkingMinutes}분 ({station.distanceMeter}m)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {data.safety && (
          <div className={styles.infoCard}>
            <div className={styles.infoCardHeader}>
              <span className={styles.infoCardLabel}>
                <Shield className={`${styles.infoCardLabelIcon} ${styles.iconEmerald}`} />
                안심/치안 지표
              </span>
              <span className={styles.safetyScore}>{data.safety.safetyScore}점</span>
            </div>
            <div className={styles.safetyRows}>
              <div className={styles.safetyRow}>
                <span>인근 CCTV 수</span>
                <span className={styles.safetyRowValue}>{data.safety.cctvCount}대</span>
              </div>
              <div className={styles.safetyRow}>
                <span>경찰서/파출소 거리</span>
                <span className={styles.safetyRowValue}>{data.safety.policeStationDistanceMeter}m</span>
              </div>
              <div className={styles.safetyRow}>
                <span>안심가로등 밀집도</span>
                <span className={styles.safetyRowValueEmerald}>
                  {data.safety.streetLightDensity === "high" ? "높음 (안전)" : "보통"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {data.facilities && data.facilities.length > 0 && (
        <div className={styles.facilitiesSection}>
          <span className={styles.facilitiesLabel}>
            <MapPin className={`${styles.facilitiesLabelIcon} ${styles.iconSlate}`} />
            주요 인근 편의시설
          </span>
          <div className={styles.facilitiesList}>
            {data.facilities.map((fac, idx) => (
              <span key={idx} className={styles.facilityTag}>
                <CheckCircle2 className={`${styles.facilityTagIcon} ${styles.iconBlue}`} />
                {fac.name} ({fac.distanceMeter}m)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
