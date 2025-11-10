"""Lightweight Flask backend for the adaptive math platform prototype."""
from __future__ import annotations

from datetime import datetime
import random
import uuid
from typing import Dict, List

from flask import Flask, jsonify, request, send_from_directory

app = Flask(__name__, static_folder="../frontend", static_url_path="")


# In-memory storage used for the prototype.
USERS: Dict[str, dict] = {
    "hana": {
        "name": "Hana Kim",
        "grade": "중학교 2학년",
        "features": {
            "calculation_speed": 0.65,
            "conceptual_understanding": 0.72,
            "carelessness": 0.43,
        },
    },
    "minsu": {
        "name": "Min-su Park",
        "grade": "초등학교 6학년",
        "features": {
            "calculation_speed": 0.55,
            "conceptual_understanding": 0.61,
            "carelessness": 0.28,
        },
    },
}

PROBLEM_BANK: Dict[str, List[dict]] = {
    "general": [
        {
            "id": "gen-1",
            "title": "분수의 덧셈",
            "description": "다음 분수들을 더하세요: 2/3 + 3/5",
            "difficulty": "중",
        },
        {
            "id": "gen-2",
            "title": "일차방정식",
            "description": "3x + 4 = 22 를 만족하는 x 를 구하세요.",
            "difficulty": "하",
        },
    ],
    "assignment": [
        {
            "id": "asg-1",
            "title": "피타고라스 정리",
            "description": "직각삼각형의 빗변의 길이를 구하세요 (다른 두 변은 5, 12).",
            "difficulty": "상",
        },
    ],

}

SNAPSHOT_HISTORY: Dict[str, List[dict]] = {
    "hana": [],
    "minsu": [],
}


# Helper utilities
def _generate_snapshot(username: str) -> dict:
    user = USERS[username]
    weaknesses = ["계산 정확도", "도형 이해", "함수 개념", "식 세우기", "문제 풀이 전략"]
    focus_area = random.choice(weaknesses)
    created_at = datetime.utcnow().isoformat() + "Z"
    score = round(random.uniform(60, 95), 1)

    snapshot = {
        "id": str(uuid.uuid4()),
        "created_at": created_at,
        "summary": f"최근 풀이 데이터를 기반으로 {focus_area} 영역을 강화하세요.",
        "score": score,
        "recommended_focus": focus_area,
    }
    SNAPSHOT_HISTORY[username].insert(0, snapshot)
    return snapshot


# Routes
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.post("/api/login")
def login():
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get("username", "").lower()

    if username not in USERS:
        return jsonify({"error": "존재하지 않는 사용자입니다."}), 404

    user = USERS[username]
    fake_token = f"token-{username}"

    history = SNAPSHOT_HISTORY[username]
    if not history:
        history.append(_generate_snapshot(username))

    return jsonify(
        {
            "token": fake_token,
            "user": {
                "username": username,
                "name": user["name"],
                "grade": user["grade"],
                "features": user["features"],
            },
            "latest_snapshot": history[0],
        }
    )


@app.get("/api/problems")
def list_problems():
    problem_type = request.args.get("type", "general")
    problems = PROBLEM_BANK.get(problem_type)
    if problems is None:
        return jsonify({"error": "알 수 없는 문제 유형입니다."}), 400
    return jsonify({"problems": problems})


@app.post("/api/snapshots")
def create_snapshot():
    payload = request.get_json(force=True, silent=True) or {}
    username = payload.get("username", "").lower()

    if username not in USERS:
        return jsonify({"error": "존재하지 않는 사용자입니다."}), 404

    snapshot = _generate_snapshot(username)
    return jsonify({"snapshot": snapshot})


@app.get("/api/snapshots")
def get_snapshots():
    username = request.args.get("username", "").lower()
    if username not in USERS:
        return jsonify({"error": "존재하지 않는 사용자입니다."}), 404
    return jsonify({"snapshots": SNAPSHOT_HISTORY[username]})


@app.get("/api/settings")
def get_settings():
    username = request.args.get("username", "").lower()
    if username not in USERS:
        return jsonify({"error": "존재하지 않는 사용자입니다."}), 404

    return jsonify(
        {
            "notifications": True,
            "ai_difficulty": "adaptive",
            "preferred_problem_types": ["fractions", "geometry"],
        }
    )


# 추가: Frontend → Backend 로그 전송 엔드포인트
@app.route("/api/word", methods=["POST", "OPTIONS"])
def receive_word():
    if request.method == "OPTIONS":
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    word = payload.get("word")

    if not word:
        return jsonify(error="Please include a word in the request body."), 400

    print(f"[LOG] Received word from frontend: {word}")
    return jsonify(reply=f"Backend received: {word}")


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
