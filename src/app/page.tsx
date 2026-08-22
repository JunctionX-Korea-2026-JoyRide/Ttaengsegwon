import { ChevronRight, ChevronDown } from "lucide-react";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Main Content Area */}
      <div className={styles.content}>
        {/* Profile Avatar */}
        <div className={styles.avatar}></div>

        {/* Welcome Text */}
        <div className={styles.welcomeText}>환영합니다</div>

        {/* Selectors */}
        <div className={styles.selectors}>
          <div className={styles.ageGroup}>
            <button className={styles.pillButton}>
              20
            </button>
            <span className={styles.ageText}>대</span>
          </div>

          <button className={`${styles.pillButton} ${styles.pillButtonWithIcon}`}>
            <span className={styles.ageText}>여성</span>
            <ChevronDown className={styles.icon} strokeWidth={2} />
          </button>
        </div>

        {/* Next Button */}
        <button className={styles.nextButton}>
          <ChevronRight className={styles.nextIcon} strokeWidth={2} />
        </button>
      </div>

      {/* Semicircle */}
      <div className={styles.semicircle}>
        <div className={styles.joyrideContainer}>
          <span className={styles.joyrideText}>Joyride</span>
        </div>
      </div>
    </main>
  );
}
