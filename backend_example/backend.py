from flask import Flask, jsonify, request

app = Flask(__name__)


@app.get("/api/greeting")
def greeting():
    """Return a simple JSON payload for the frontend."""
    response = jsonify(message="Hello from the backend!")
    return response


@app.route("/api/word", methods=["POST", "OPTIONS"])
def receive_word():
    """Accept JSON from the frontend and print the submitted word."""
    if request.method == "OPTIONS":
        # Reply early to preflight requests from the browser.
        return ("", 204)

    payload = request.get_json(silent=True) or {}
    word = payload.get("word")

    if not word:
        return jsonify(error="Please include a word in the request body."), 400

    print(f"Received word from frontend: {word}")
    return jsonify(reply=f"Backend received: {word}")


@app.after_request
def add_cors_headers(response):
    """Allow the static frontend to call these endpoints."""
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
