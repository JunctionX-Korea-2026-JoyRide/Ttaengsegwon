# ⚡ 땡세권 (Ttaengsegwon)

> **LLM & Model Context Protocol(MCP) 기반 차세대 실시간 생활권 입지 분석 AI 서비스**

땡세권은 사용자가 주소나 매물 위치를 입력하면, 대중교통 접근성, 치안 지표(CCTV, 파출소 거리, 안심 가로등), 편의시설 인프라 등을 종합 분석하여 직관적인 점수와 카드 형태로 제공하는 AI 챗봇 서비스입니다.

---

## 📌 핵심 기능 (Key Features)

- 💬 **자연어 기반 생활권 대화형 질의**: 특정 지번, 건물명, 지하철역 인근 위치에 대한 자유로운 질의응답
- 🚇 **대중교통 접근성 분석**: 인근 지하철역/버스 정류장과의 도보 소요 시간, 거리 및 접근성 점수 산출
- 🛡️ **치안/안심 지표 제공**: 반경 내 CCTV 수, 경찰서/파출소 거리, 안심가로등 밀집도 분석
- 🏪 **생활 편의시설 인프라 검색**: 카페, 마트, 병원, 헬스장, 약국 등 카테고리별 주요 시설 거리 및 정보 탐색
- 🔌 **Model Context Protocol (MCP) 연동**: 표준화된 MCP 클라이언트를 통한 외부 데이터/API 도구 호출
- 🛡️ **오프라인 Fallback 지원**: 외부 MCP 서버나 공공데이터 API 장애 시에도 안전한 Fallback 핸들러 동작

---

## 🏛️ 아키텍처 (Architecture)

```text
[ 브라우저 (React UI) ]
         │
         ▼ (HTTP POST /api/chat)
[ Next.js 서버 (App Router / Route Handler) ]
         │
         ├───▶ [ LLM Orchestrator (Solar / OpenAI) ]
         │              │
         │              ▼ (Tool Call Request)
         └───▶ [ MCP Client / Tool Router ]
                        │
                        ▼ (MCP / REST API)
               [ 공공데이터 & 외부 서비스 ]
```

> **보안 원칙**: 모든 LLM 오케스트레이션, MCP 통신, API 키 및 민감 데이터는 서버 사이드에서만 처리되며 브라우저에 노출되지 않습니다.

---

## 🛠️ 기술 스택 (Tech Stack)

- **Framework**: Next.js 15 (App Router)
- **UI & Styling**: React 19, TypeScript, Tailwind CSS, Lucide React
- **AI & Protocol**: Model Context Protocol (`@modelcontextprotocol/sdk`), LLM API
- **Code Quality**: ESLint, Prettier, Git Pre-commit Hook (`.githooks`)
- **Package Manager**: pnpm

---

## 📂 프로젝트 구조 (Project Structure)

```text
Ttaengsegwon/
├── app/
│   ├── api/
│   │   └── chat/route.ts        # LLM & MCP 오케스트레이션 서버 Route Handler
│   ├── globals.css              # Tailwind 기반 글로벌 스타일
│   ├── layout.tsx               # Root Layout
│   └── page.tsx                 # 메인 화면
├── components/
│   ├── AreaScoreCard.tsx        # 입지 지표(교통, 치안, 편의시설) 시각화 카드
│   └── ChatInterface.tsx        # 실시간 AI 채팅 인터페이스
├── lib/
│   ├── llm/
│   │   └── client.ts            # LLM API 호출 클라이언트
│   ├── mcp/
│   │   └── client.ts            # MCP SSE 클라이언트 관리
│   └── tools/
│       ├── definitions.ts       # 도메인 도구 명세 (facilities, transport, safety)
│       └── router.ts            # MCP 및 Fallback 도구 디스패처
├── types/
│   └── index.ts                 # 메시지, 도구, 분석 지표 공통 타입
├── .env.example                 # 환경 변수 템플릿
├── .eslintrc.json               # ESLint 설정
├── .githooks/                   # Git Pre-commit 훅
├── .prettierrc                  # Prettier 설정
└── package.json                 # 의존성 및 실행 스크립트
```

---

## 🚀 시작하기 (Getting Started)

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env.example` 파일을 복사하여 `.env.local`을 생성하고 필요한 키를 입력합니다.

```bash
cp .env.example .env.local
```

```env
# LLM API 설정
LLM_API_KEY=your_llm_api_key
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o

# 공공데이터 및 외부 서비스
PUBLIC_DATA_API_KEY=your_public_data_key

# MCP 서버 설정
MCP_SERVER_URL=
MCP_CLIENT_ID=
MCP_CLIENT_SECRET=
```

### 3. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

---

## 📜 주요 스크립트 (Scripts)

| 명령어              | 설명                                       |
| ------------------- | ------------------------------------------ |
| `pnpm dev`          | 개발 서버 실행                             |
| `pnpm build`        | 프로덕션 빌드 생성                         |
| `pnpm start`        | 프로덕션 서버 실행                         |
| `pnpm lint`         | ESLint 검사 수행                           |
| `pnpm type-check`   | TypeScript 타입 검사 수행 (`tsc --noEmit`) |
| `pnpm format`       | Prettier 코드 자동 포매팅                  |
| `pnpm format:check` | Prettier 포매팅 상태 검사                  |

---

## 🔒 Git 워크플로우 & 커밋 컨벤션

- **Commit convention**: `feat: implement code`
- **Branch strategy**: `feat/connect-mcp`
- **Pre-commit Hook**: 커밋 시 포매팅(Prettier), 린트(ESLint), 타입 검사(TypeScript)가 자동 실행됩니다.
