"""
Integrated Flask Backend
- Features: Original prototype logic + MySQL Database connection
- Models: Member, Snapshot, Problem, ProblemSet, StudyLog
"""
from __future__ import annotations

import json
from datetime import datetime
import random
import uuid

from flask import Flask, jsonify, request, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.mysql import JSON, BIGINT, TIMESTAMP
from sqlalchemy.sql import func

app = Flask(__name__, static_folder="frontend", static_url_path="")

# ==========================================
# 1. 데이터베이스 설정
# ==========================================
# MySQL 접속 정보 (비밀번호나 설정이 다르면 수정하세요)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:1234@127.0.0.1:3306/math_platform_db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['JSON_AS_ASCII'] = False 

db = SQLAlchemy(app)

# ==========================================
# 2. 데이터베이스 모델 (테이블 정의)
# ==========================================

class Member(db.Model):
    __tablename__ = 'MEMBER'
    user_id = db.Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    student_id = db.Column(db.String(20), unique=True, nullable=False) # username (hana, minsu)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    grade = db.Column(db.String(20)) 
    initial_survey_data = db.Column(JSON) # features 저장용
    created_at = db.Column(TIMESTAMP, server_default=func.now())

    # 관계 설정
    snapshots = db.relationship('Snapshot', backref='member', lazy=True)

class Snapshot(db.Model):
    __tablename__ = 'SNAPSHOT'
    snapshot_id = db.Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    user_id = db.Column(BIGINT(unsigned=True), db.ForeignKey('MEMBER.user_id'), nullable=False)
    report_title = db.Column(db.String(255), nullable=False)
    summary = db.Column(db.Text)
    score = db.Column(db.Float)
    feature_scores = db.Column(JSON, nullable=False) # recommended_focus 등 저장
    generated_at = db.Column(TIMESTAMP, server_default=func.now())

    def to_dict(self):
        """API 응답용 변환"""
        return {
            "id": self.snapshot_id,
            "created_at": self.generated_at.isoformat() + "Z",
            "summary": self.summary,
            "score": self.score,
            "recommended_focus": self.feature_scores.get("recommended_focus", "종합"),
            "features": self.feature_scores
        }

class Problem(db.Model):
    __tablename__ = 'PROBLEM'
    problem_id = db.Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    # 기존 코드의 문제 유형(general, assignment)을 구분하기 위한 컬럼 추가
    problem_type = db.Column(db.String(50), nullable=False, default="general") 
    title = db.Column(db.String(100))
    description = db.Column(db.Text)
    difficulty = db.Column(db.String(10))
    correct_answer = db.Column(db.Text)
    
    def to_dict(self):
        return {
            "id": f"db-{self.problem_id}", # 프론트엔드 호환성을 위해 ID 포맷팅
            "title": self.title,
            "description": self.description,
            "difficulty": self.difficulty
        }

# (참고: 로그 기능 확장을 위해 남겨둠)
class StudyLog(db.Model):
    __tablename__ = 'STUDY_LOG'
    log_id = db.Column(BIGINT(unsigned=True), primary_key=True, autoincrement=True)
    user_id = db.Column(BIGINT(unsigned=True), db.ForeignKey('MEMBER.user_id'), nullable=False)
    log_data = db.Column(JSON)
    timestamp = db.Column(TIMESTAMP, server_default=func.now())


# ==========================================
# 3. 데이터 초기화 (기존 코드의 데이터를 DB로 이식)
# ==========================================
@app.get("/init-data")
def init_data():
    """기존 코드에 있던 Hana, Minsu 데이터와 문제들을 DB에 넣습니다."""
    try:
        # --- 1. 유저 데이터 이식 ---
        users_data = [
            {
                "id": "hana", "name": "Hana Kim", "grade": "중학교 2학년",
                "features": {"calculation_speed": 0.65, "conceptual_understanding": 0.72, "carelessness": 0.43}
            },
            {
                "id": "minsu", "name": "Min-su Park", "grade": "초등학교 6학년",
                "features": {"calculation_speed": 0.55, "conceptual_understanding": 0.61, "carelessness": 0.28}
            }
        ]

        for u in users_data:
            if not Member.query.filter_by(student_id=u["id"]).first():
                new_member = Member(
                    student_id=u["id"],
                    email=f"{u['id']}@test.com",
                    password_hash="pass1234",
                    name=u["name"],
                    grade=u["grade"],
                    initial_survey_data=u["features"]
                )
                db.session.add(new_member)
        
        db.session.commit() # 유저 저장

        # --- 2. 문제 데이터 이식 (General / Assignment) ---
        problems_data = [
            # General Problems
            {"type": "general", "title": "분수의 덧셈", "desc": "다음 분수들을 더하세요: 2/3 + 3/5", "diff": "중", "ans": "19/15"},
            {"type": "general", "title": "일차방정식", "desc": "3x + 4 = 22 를 만족하는 x 를 구하세요.", "diff": "하", "ans": "6"},
            # Assignment Problems
            {"type": "assignment", "title": "피타고라스 정리", "desc": "직각삼각형의 빗변의 길이를 구하세요 (다른 두 변은 5, 12).", "diff": "상", "ans": "13"}
        ]

        for p in problems_data:
            # 중복 방지: 같은 제목이 없으면 추가
            if not Problem.query.filter_by(title=p["title"]).first():
                new_prob = Problem(
                    problem_type=p["type"],
                    title=p["title"],
                    description=p["desc"],
                    difficulty=p["diff"],
                    correct_answer=p["ans"]
                )
                db.session.add(new_prob)

        db.session.commit() # 문제 저장

        return """
        <h1>데이터 초기화 완료!</h1>
        <p>Hana, Minsu 유저와 예제 문제들이 DB에 저장되었습니다.</p>
        <p><a href='/'>메인으로 돌아가기</a></p>
        """
    except Exception as e:
        db.session.rollback()
        return f"<h1>초기화 실패</h1><p>{str(e)}</p>"


# ==========================================
# 4. 라우트 (API) - 기존 기능 DB 연동 버전
# ==========================================

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

# --- 로그인 ---
@app.post("/api/login")
def login():
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get("username", "").lower()

    # [DB 연동] 유저 조회
    user = Member.query.filter_by(student_id=username).first()

    if not user:
        return jsonify({"error": "존재하지 않는 사용자입니다. (먼저 /init-data 에 접속해주세요)"}), 404

    # [DB 연동] 스냅샷 이력 조회
    history_objs = Snapshot.query.filter_by(user_id=user.user_id).order_by(Snapshot.generated_at.desc()).all()
    history_dicts = [h.to_dict() for h in history_objs]

    # 스냅샷이 하나도 없으면 하나 생성해줌 (기존 로직 유지)
    latest_snapshot = None
    if not history_dicts:
        # DB에 바로 스냅샷 하나 생성
        weaknesses = ["계산 정확도", "도형 이해", "함수 개념", "식 세우기", "문제 풀이 전략"]
        focus_area = random.choice(weaknesses)
        new_snap = Snapshot(
            user_id=user.user_id,
            report_title="초기 진단",
            summary=f"최근 풀이 데이터를 기반으로 {focus_area} 영역을 강화하세요.",
            score=round(random.uniform(60, 95), 1),
            feature_scores={"recommended_focus": focus_area}
        )
        db.session.add(new_snap)
        db.session.commit()
        latest_snapshot = new_snap.to_dict()
        history_dicts.append(latest_snapshot)
    else:
        latest_snapshot = history_dicts[0]

    return jsonify({
        "token": f"token-{user.student_id}",
        "user": {
            "username": user.student_id,
            "name": user.name,
            "grade": user.grade,
            "features": user.initial_survey_data or {}
        },
        "latest_snapshot": latest_snapshot
    })

# --- 문제 목록 (유형별 필터링 포함) ---
@app.get("/api/problems")
def list_problems():
    problem_type = request.args.get("type", "general")
    
    # [DB 연동] 해당 타입의 문제만 검색
    problems = Problem.query.filter_by(problem_type=problem_type).all()
    
    if not problems and problem_type not in ["general", "assignment"]:
        return jsonify({"error": "알 수 없는 문제 유형이거나 데이터가 없습니다."}), 400
        
    return jsonify({"problems": [p.to_dict() for p in problems]})

# --- 스냅샷 생성 ---
@app.post("/api/snapshots")
def create_snapshot():
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get("username", "").lower()

    user = Member.query.filter_by(student_id=username).first()
    if not user:
        return jsonify({"error": "존재하지 않는 사용자입니다."}), 404

    # [로직 유지] 랜덤 스냅샷 생성 로직
    weaknesses = ["계산 정확도", "도형 이해", "함수 개념", "식 세우기", "문제 풀이 전략"]
    focus_area = random.choice(weaknesses)
    score = round(random.uniform(60, 95), 1)

    new_snap = Snapshot(
        user_id=user.user_id,
        report_title=f"{datetime.now().strftime('%m월 %d일')} 추가 진단",
        summary=f"최근 풀이 데이터를 기반으로 {focus_area} 영역을 강화하세요.",
        score=score,
        feature_scores={"recommended_focus": focus_area}
    )
    
    db.session.add(new_snap)
    db.session.commit()

    return jsonify({"snapshot": new_snap.to_dict()})

# --- 스냅샷 목록 조회 ---
@app.get("/api/snapshots")
def get_snapshots():
    username = request.args.get("username", "").lower()
    
    user = Member.query.filter_by(student_id=username).first()
    if not user:
        return jsonify({"error": "존재하지 않는 사용자입니다."}), 404

    snaps = Snapshot.query.filter_by(user_id=user.user_id).order_by(Snapshot.generated_at.desc()).all()
    return jsonify({"snapshots": [s.to_dict() for s in snaps]})

# --- 설정 (기존 코드 기능 유지) ---
@app.get("/api/settings")
def get_settings():
    username = request.args.get("username", "").lower()
    
    # DB에 유저가 있는지 체크
    user = Member.query.filter_by(student_id=username).first()
    if not user:
        return jsonify({"error": "존재하지 않는 사용자입니다."}), 404

    # 설정값은 DB 컬럼이 없으므로 일단 고정값(Mock) 반환
    return jsonify({
        "notifications": True,
        "ai_difficulty": "adaptive",
        "preferred_problem_types": ["fractions", "geometry"],
    })

# --- 로그 전송 (기존 코드 기능 유지) ---
@app.route("/api/word", methods=["POST", "OPTIONS"])
def receive_word():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    word = payload.get("word")

    if not word:
        return jsonify(error="Please include a word in the request body."), 400

    print(f"[LOG] Received word from frontend: {word}")
    
    # DB에 로그 저장해보기 (선택사항)
    # db.session.add(StudyLog(user_id=1, log_data={"word": word}))
    # db.session.commit()

    return jsonify(reply=f"Backend received: {word}")

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        print(">> DB 연결 및 테이블 체크 완료")
    app.run(host="127.0.0.1", port=5000, debug=True)
