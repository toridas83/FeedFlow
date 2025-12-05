# FeedFlow 프로젝트 개요
맞춤형 수학 문제 풀이/진단 서비스의 프론트엔드(React/Vite)와 백엔드(Express/Prisma/MySQL)를 포함한 모노 리포입니다. 신규 사용자가 빠르게 설치·실행하고 구조를 이해할 수 있도록 핵심 정보만 정리했습니다.

## 목차
- [1) 주요 특징](#1-주요-특징)
- [2) 시스템 아키텍처](#2-시스템-아키텍처)
- [3) 기술 스택](#3-기술-스택)
- [4) 데이터베이스 개요](#4-데이터베이스-개요)
- [5) 환경 설정(.env)](#5-환경-설정-env)
- [6) 설치 및 실행(프론트백엔드)](#6-설치-및-실행)
- [7) 간단 사용 가이드](#7-간단-사용-가이드)

## 1) 주요 특징
- 12문항 문제 세트 생성(OpenAI Assistant 활용) 및 풀이/로그 수집
- 풀이 로그 기반 피처 추출(19개 로컬 + 11개 GPT)과 진단 리포트 생성
- 대시보드에서 최근 학습 상태, 리포트 조회, 새 문제 세트 생성
- Prisma로 모델/스키마 관리, MySQL 사용

## 2) 시스템 아키텍처
- 프론트엔드: `frontend/`에서 Vite Dev Server(기본 3000) 실행
- 백엔드: `backend/`에서 Express API(기본 4000) 실행, Prisma로 DB 접근
- 공통 `.env`를 루트에 두고 프론트/백엔드가 공유

## 3) 기술 스택
- Frontend: React, Vite, TypeScript, Tailwind(스타일 유틸)
- Backend: Node.js, Express, TypeScript, Prisma, MySQL
- AI: OpenAI Assistants API (문제 생성/피처 추출/리포트 생성)

## 4) 데이터베이스 개요 (Prisma schema)
- users, problem_sets, problems
- solve_attempts, solve_steps, solve_events
- problem_features, set_generation_plans

## 5) 환경 설정 (.env 예시)
```bash
# 직접 채울 값
DATABASE_URL="mysql://<USER>:<PASSWORD>@<HOST>:<PORT>/feedflow"
OPENAI_API_KEY="YOUR_OPENAI_KEY"

# 기본 값 (변경 불필요)
PORT=4000
NODE_ENV=development
DB_PUSH_ON_STARTUP=true
DB_ACCEPT_DATA_LOSS=true
OPENAI_ASSISTANT_ID_MATH_GRADE1="asst_lfGa7Yli1VT3dvgzPsTmW3T5"
OPENAI_ASSISTANT_ID_MATH_GRADE2="asst_NDYDLxr7m9u1AbK69qG5eHCm"
OPENAI_ASSISTANT_ID_MATH_GRADE3="asst_8uAWFfo3EMhfUR70BOCjlHZK"
OPENAI_ASSISTANT_ID_FEATURE_EXTRACT="asst_whLY3QzwziYiSJFSsq1llxxd"
OPENAI_ASSISTANT_ID_REPORT="asst_s3jApryjNZxkwyE8HyfGurqa"
```
> 위치: 리포지토리 **루트** 디렉토리에 `.env` 파일을 두세요. DB는 미리 생성되어 있어야 합니다.

## 6) 설치 및 실행

Node.js 18+ (권장 20) 설치

프론트/백엔드 각각 의존성 설치 후, 터미널 2개에서 실행하세요.
```bash
# 터미널 1 (프론트)
cd frontend
npm install
python -m venv .venv
.venv/bin/activate   # Window: .venv\Scripts\activate
npm run dev   # http://localhost:3000

# 터미널 2 (백엔드)
cd backend
npm install
python -m venv .venv
.venv/bin/activate   # Window: .venv\Scripts\activate
npm run dev   # 기본 4000
```
헬스체크: http://localhost:4000/api/health

## 7) 간단 사용 가이드
1. 백엔드 실행 → Prisma가 스키마를 DB에 동기화합니다(`DB_PUSH_ON_STARTUP=true`일 때).  
2. 프론트 실행 후 http://localhost:3000 접속  
3. 회원가입 시 문제 세트가 생성됨 → 풀이 진행 → 마지막 문제 제출 시 예상 점수 입력 → 피처 추출/진단 리포트 생성  
4. 대시보드에서 리포트 확인 및 새 문제 세트 생성 가능
