"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { savePendingRecommendation } from "@/lib/pendingRecommendation";
import styles from "./page.module.css";

const GENDER_OPTIONS = ["여성", "남성"];
const DISTRICT_OPTIONS = ["전체", "북구", "남구"];
const DONG_OPTIONS_BY_DISTRICT: Record<string, string[]> = {
  북구: [
    "중앙동",
    "양학동",
    "죽도동",
    "용흥동",
    "우창동",
    "두호동",
    "장량동",
    "환여동",
  ],
  남구: ["상대동", "해도동", "송도동", "청림동", "제철동", "효곡동", "대이동"],
};

function getDongOptions(district: string): string[] {
  if (district === "전체") {
    return [
      "전체",
      ...DONG_OPTIONS_BY_DISTRICT["북구"],
      ...DONG_OPTIONS_BY_DISTRICT["남구"],
    ];
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

  const [district, setDistrict] = useState("전체");
  const [dong, setDong] = useState("전체");

  const [openDropdown, setOpenDropdown] = useState<Dropdown>(null);
  const selectorsRef = useRef<HTMLDivElement>(null);

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!openDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        selectorsRef.current &&
        !selectorsRef.current.contains(e.target as Node)
      ) {
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    setError(null);
    const saved = savePendingRecommendation({
      prompt: prompt.trim(),
      age: age || "20",
      gender,
      district,
      dong,
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
    <main className={styles.main}>
      {/* Main Content Area */}
      <div
        className={`${styles.content} ${step === 2 ? styles.promptContent : ""}`}
      >
        {/* Profile Avatar */}
        <Image
          src="/images/figma/home-logo.svg"
          alt="땡세권 로고"
          width={121}
          height={121}
          className={`${styles.avatar} ${step === 2 ? styles.promptAvatar : ""}`}
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
                  onChange={(e) =>
                    setAge(e.target.value.replace(/[^0-9]/g, ""))
                  }
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
                  onClick={() =>
                    setOpenDropdown((open) =>
                      open === "gender" ? null : "gender"
                    )
                  }
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "gender"}
                >
                  <span className={styles.ageText}>{gender}</span>
                  <span className={styles.homeDropdownIcon}>
                    <Image
                      src="/images/figma/home-dropdown-arrow.svg"
                      alt=""
                      width={15}
                      height={8}
                    />
                  </span>
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
              <span className={styles.nextIcon}>
                <Image
                  src="/images/figma/home-next-arrow.svg"
                  alt=""
                  width={15}
                  height={8}
                />
              </span>
            </button>
          </>
        ) : (
          <>
            {/* Selectors */}
            <div
              className={`${styles.selectors} ${styles.promptSelectors}`}
              ref={selectorsRef}
            >
              <span className={styles.promptCityLabel}>포항시</span>

              <div className={styles.dropdownGroup}>
                <button
                  type="button"
                  className={`${styles.pillButton} ${styles.pillButtonWithIcon} ${styles.promptPillButton}`}
                  onClick={() =>
                    setOpenDropdown((open) =>
                      open === "district" ? null : "district"
                    )
                  }
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "district"}
                >
                  <span className={styles.ageText}>{district}</span>
                  <span className={styles.promptDropdownIcon}>
                    <Image
                      src="/images/figma/dropdown-arrow.svg"
                      alt=""
                      width={15}
                      height={8}
                    />
                  </span>
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
                  className={`${styles.pillButton} ${styles.pillButtonWithIcon} ${styles.promptPillButton}`}
                  onClick={() =>
                    setOpenDropdown((open) => (open === "dong" ? null : "dong"))
                  }
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === "dong"}
                >
                  <span className={styles.ageText}>{dong}</span>
                  <span className={styles.promptDropdownIcon}>
                    <Image
                      src="/images/figma/dropdown-arrow.svg"
                      alt=""
                      width={15}
                      height={8}
                    />
                  </span>
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
              <div className={styles.promptRow}>
                <div className={styles.promptInputWrapper}>
                  <Image
                    src="/images/aiChatBar.png"
                    alt=""
                    width={60}
                    height={61}
                    className={styles.promptSwatch}
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="원하는 동네 조건을 입력해 주세요"
                    className={styles.promptInput}
                    disabled={loading}
                    aria-label="원하는 동네 조건 입력"
                  />
                  {prompt && (
                    <button
                      type="button"
                      className={styles.promptClearButton}
                      onClick={() => setPrompt("")}
                      disabled={loading}
                      aria-label="입력 내용 지우기"
                    >
                      <Image
                        src="/images/figma/prompt-close.svg"
                        alt=""
                        width={12}
                        height={12}
                      />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  className={styles.promptSubmitButton}
                  disabled={!prompt.trim() || loading}
                  aria-label="추천 요청 보내기"
                >
                  <Image
                    src="/images/figma/prompt-submit-arrow.svg"
                    alt=""
                    width={15}
                    height={8}
                    className={styles.promptSubmitIcon}
                  />
                </button>
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
      <div
        className={`${styles.semicircle} ${step === 2 ? styles.promptSemicircle : ""}`}
      >
        <div className={styles.joyrideContainer}>
          <div
            className={`${styles.joyrideLogo} ${step === 2 ? styles.promptJoyrideLogo : ""}`}
            role="img"
            aria-label="Joyride"
          >
            <Image
              src="/images/figma/home-joyride-symbol.svg"
              alt=""
              width={71}
              height={42}
              className={styles.joyrideSymbol}
            />
            <Image
              src="/images/figma/home-joyride-wordmark.svg"
              alt=""
              width={145}
              height={16}
              className={styles.joyrideWordmark}
            />
            <Image
              src="/images/figma/home-joyride-dot.svg"
              alt=""
              width={6}
              height={3}
              className={styles.joyrideDot}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
