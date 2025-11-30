# FeedFlow 빠른 시작

## 필수 준비
- Node.js 18+ (권장 20), npm
- MySQL (DATABASE_URL에 맞는 DB/계정 준비)

## .env 예시
```bash
> .env 파일의 위치: 리포지토리 **루트**에 `.env` 파일을 두세요. 프론트/백엔드는 이 루트 `.env`를 참조합니다.
# 직접 채울 값
DATABASE_URL="mysql://<USER>:<PASSWORD>@<HOST>:3306/feedflow" 
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

## 설치
프론트/백엔드 각각 실행 전 의존성 설치:
```bash
# 터미널 1 (프론트)
cd frontend
npm install

# 터미널 2 (백엔드)
cd backend
npm install
```

## 실행 (터미널 2개)
### 프론트
```bash
cd frontend
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
npm run dev   # http://localhost:3000
```
### 백엔드
```bash
cd backend
python -m venv .venv && . .venv/bin/activate   # Windows: .venv\Scripts\activate
npm run dev   # 기본 4000
```

## 확인
- 프론트: http://localhost:3000/
- 백엔드 헬스체크: http://localhost:4000/api/health

## 참고
- 백엔드 기동 시 Prisma가 스키마를 DB에 동기화합니다(`DB_PUSH_ON_STARTUP=true`). DB 자체는 미리 만들어 둬야 합니다.
