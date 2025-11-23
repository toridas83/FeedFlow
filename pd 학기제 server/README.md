
## 맞춤형 수학 문제 플랫폼 프로토타입

이 저장소에는 팀 프로젝트용으로 간단히 구현한 맞춤형 수학 문제 생성 플랫폼의 프론트엔드와 백엔드 프로토타입이 포함되어 있습니다.

+### 구성
- **backend**: Flask 기반 API 서버. 진단 스냅샷, 문제 추천 등을 메모리 데이터로 제공하며 `frontend` 폴더의 정적 파일도 서빙합니다.
- **frontend**: 단일 HTML 페이지로 구성된 대시보드. 로그인 후 맞춤형 정보, 문제 리스트, 스냅샷 히스토리를 확인할 수 있습니다.

### 실행 방법
1. 가상환경을 생성하고 의존성을 설치합니다.
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # Windows에서는 .venv\\Scripts\\activate
   pip install -r requirements.txt
   ```
2. Flask 개발 서버를 실행합니다.
   ```bash
   flask --app app run --debug
   ```
3. 브라우저에서 [http://localhost:5000](http://localhost:5000)을 열어 프론트엔드를 확인합니다.

## DB연동 확인 방법
1. app.py를 실행 (기존에 실행된 파일이있으면 Ctrl+C로 초기화)
2. 기존에 실행한 쿼리문이있다면 DB상단 2줄만 실행시켜 데이터를 초기화해줍니다.
3. 브라우저에서 [http://127.0.0.1:5000/init-data] 를 열어 DB 연동을 확인합니다.

### 데모 계정
현재는 다음 두 명의 학습자를 데모 계정으로 제공합니다.
- `hana`
- `minsu`

해당 아이디로 로그인하면 AI 분석 결과와 맞춤형 문제 리스트, 스냅샷 히스토리를 확인할 수 있습니다.




