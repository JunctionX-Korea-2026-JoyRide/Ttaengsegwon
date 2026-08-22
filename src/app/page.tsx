"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronRight, ChevronDown } from "lucide-react";
import { RecommendDongApiResponse } from "@/types";
import { saveRecommendCandidates } from "@/lib/recommendCandidates";
import styles from "./page.module.css";

const GENDER_OPTIONS = ["여성", "남성"];
const DISTRICT_OPTIONS = ["전체", "북구", "남구"];
const DONG_OPTIONS_BY_DISTRICT: Record<string, string[]> = {
  북구: ["중앙동", "양학동", "죽도동", "용흥동", "우창동", "두호동", "장량동", "환여동"],
  남구: ["상대동", "해도동", "송도동", "청림동", "제철동", "효곡동", "대이동"],
};

function getDongOptions(district: string): string[] {
  if (district === "전체") {
    return ["전체", ...DONG_OPTIONS_BY_DISTRICT["북구"], ...DONG_OPTIONS_BY_DISTRICT["남구"]];
  }
  return ["전체", ...DONG_OPTIONS_BY_DISTRICT[district]];
}

const EXAMPLE_PROMPTS = [
  "차 없는 70대가 살기 좋은 포항 근처 동네 찾아줘. 병원은 15분 이내, 버스는 하루 5회 이상, 시장도 가까웠으면 좋겠어.",
  "자차 있는 30대 여성이고, 치안 좋고(여성안심골목이 있거나) 근처에 대형마트, 스타벅스가 있는 동네 추천해줘.",
];

type Dropdown = "gender" | "district" | "dong" | null;

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);

  const [age, setAge] = useState("");
  const [gender, setGender] = useState("여성");

  const [district, setDistrict] = useState("북구");
  const [dong, setDong] = useState(DONG_OPTIONS_BY_DISTRICT["북구"][5]);

  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const selectorsRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorsRef.current && !selectorsRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const handleDistrictSelect = (option: string) => {
    setDistrict(option);
    setDong(getDongOptions(option)[0]);
    setOpenDropdown(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, age: age || "20", gender, district, dong }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "추천에 실패했습니다.");
      const result = data as RecommendDongApiResponse;
      if (result.candidates && result.candidates.length > 0) {
        saveRecommendCandidates(result.candidates);
      }
      const params = new URLSearchParams({
        dong: result.dong,
        district,
        address: result.address,
        lat: String(result.coordinates.lat),
        lng: String(result.coordinates.lng),
      });
      router.push(`/maps?${params.toString()}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "추천 중 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  return (
    <main className={styles.main}>
      {/* Main Content Area */}
      <div className={styles.content}>
        {/* Profile Avatar */}
        <Image
          src="/images/ttaengsaegwonLogo.png"
          alt="땡세권 로고"
          width={100}
          height={100}
          className={styles.avatar}
          priority
        />

        {step === 1 ? (
          <>
            {/* Welcome Text */}
            <div className={styles.welcomeText}>환영합니다</div>

            {/* Selectors */}
            <div className={styles.selectors} ref={selectorsRef}>
              <div className={styles.ageGroup}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/[^0-9]/g, ""))}
                  onFocus={(e) => e.target.select()}
                  placeholder="20"
                  className={`${styles.pillButton} ${styles.ageInput}`}
                  aria-label="나이"
                />
                <span className={styles.ageText}>대</span>
              </div>

              <div className={styles.dropdownGroup}>
                <button
                  type="button"
                  className={`${styles.pillButton} ${styles.pillButtonWithIcon}`}
                  onClick={() => setOpenDropdown((open) => (open === "gender" ? null : "gender"))}
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "gender"}
                >
                  <span className={styles.ageText}>{gender}</span>
                  <ChevronDown className={styles.icon} strokeWidth={2} />
                </button>

                {openDropdown === "gender" && (
                  <div className={styles.dropdownMenu} role="listbox">
                    {GENDER_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={gender === option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setGender(option);
                          setOpenDropdown(null);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Next Button */}
            <button
              type="button"
              className={styles.nextButton}
              onClick={() => setStep(2)}
              aria-label="다음"
            >
              <ChevronRight className={styles.nextIcon} strokeWidth={2} />
            </button>
          </>
        ) : (
          <>
            {/* Selectors */}
            <div className={styles.selectors} ref={selectorsRef}>
              <span className={styles.ageText}>포항시</span>

              <div className={styles.dropdownGroup}>
                <button
                  type="button"
                  className={`${styles.pillButton} ${styles.pillButtonWithIcon}`}
                  onClick={() => setOpenDropdown((open) => (open === "district" ? null : "district"))}
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "district"}
                >
                  <span className={styles.ageText}>{district}</span>
                  <ChevronDown className={styles.icon} strokeWidth={2} />
                </button>

                {openDropdown === "district" && (
                  <div className={styles.dropdownMenu} role="listbox">
                    {DISTRICT_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={district === option}
                        className={styles.dropdownOption}
                        onClick={() => handleDistrictSelect(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className={styles.dropdownGroup}>
                <button
                  type="button"
                  className={`${styles.pillButton} ${styles.pillButtonWithIcon}`}
                  onClick={() => setOpenDropdown((open) => (open === "dong" ? null : "dong"))}
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "dong"}
                >
                  <span className={styles.ageText}>{dong}</span>
                  <ChevronDown className={styles.icon} strokeWidth={2} />
                </button>

                {openDropdown === "dong" && (
                  <div className={styles.dropdownMenu} role="listbox">
                    {getDongOptions(district).map((option) => (
                      <button
                        key={option}
                        type="button"
                        role="option"
                        aria-selected={dong === option}
                        className={styles.dropdownOption}
                        onClick={() => {
                          setDong(option);
                          setOpenDropdown(null);
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prompt Input */}
            <form onSubmit={handleSubmit} className={styles.promptForm}>
              <div className={styles.promptInputWrapper}>
                <Image
                  src="/images/aiChatBar.png"
                  alt=""
                  width={50}
                  height={50}
                  className={styles.promptSwatch}
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="입력"
                  className={styles.promptInput}
                  disabled={loading}
                  aria-label="원하는 동네 조건 입력"
                />
              </div>
              {error && <p className={styles.promptError}>{error}</p>}
            </form>

            {/* Example Prompts */}
            <div className={styles.examples}>
              {EXAMPLE_PROMPTS.map((example) => (
                <p key={example} className={styles.exampleText}>
                  {example}
                </p>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Semicircle */}
      <div className={styles.semicircle}>
        <div className={styles.joyrideContainer}>
          <Image
            src="/images/joyrideLogo.png"
            alt="Joyride"
            width={120}
            height={55}
            className={styles.joyrideLogo}
          />
        </div>
      </div>
    </main>
  );
}
