import Link from "next/link";
import styles from "./modeSelectButton.module.css";

interface ModeSelectButtonProps {
  href: string;
  emoji: string;
  label: string;
  colorScheme: "blue" | "green";
}

export function ModeSelectButton({ href, emoji, label, colorScheme }: ModeSelectButtonProps) {
  return (
    <Link
      href={href}
      className={`${styles.button} ${styles[colorScheme]}`}
    >
      <span className={styles.emoji}>{emoji}</span>
      <span className={styles.label}>{label}</span>
    </Link>
  );
}
