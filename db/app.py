import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from . import db_utils

load_dotenv()

app = Flask(__name__)

PRODUCTION_FRONTEND_URL = "https://kmarchais.github.io"

LOCAL_FRONTEND_URL = os.getenv("LOCAL_FRONTEND_URL", "http://localhost:3000")

allowed_origins = [
    LOCAL_FRONTEND_URL,
    PRODUCTION_FRONTEND_URL,
]

CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    methods=[
        "GET",
        "POST",
        "PUT",
        "PATCH",
        "DELETE",
        "OPTIONS",
    ],
    allow_headers=["Content-Type", "Authorization"],
    supports_credentials=True,
)

print(f"CORS enabled for origins: {allowed_origins}")


GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    raise ValueError(
        "FATAL ERROR: GOOGLE_CLIENT_ID not found in environment variables."
    )
else:
    print("GOOGLE_CLIENT_ID loaded successfully.")


@app.route("/api/auth/google", methods=["POST", "OPTIONS"])
def auth_google():
    """
    Receives Google ID token from frontend, verifies it,
    and adds/updates the user in the database.
    """
    if request.method == "OPTIONS":
        response = app.make_default_options_response()
        return response

    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    print("Received token for verification...")

    try:
        id_info = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        print("Token verified successfully.")

        google_id = id_info["sub"]
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")

        if not email:
            print("Error: Email not found in verified token.")
            return jsonify({"error": "Email not found in token"}), 400

        print(f"Attempting to add/update user: {email}")
        user_db_id = db_utils.add_or_update_user(google_id, email, name, picture)

        if user_db_id is None:
            print("Error: Database operation failed during add/update user.")
            return jsonify({"error": "Database operation failed"}), 500

        print(f"User processed successfully. DB ID: {user_db_id}")
        return jsonify(
            {
                "status": "success",
                "user": {
                    "id": user_db_id,
                    "google_id": google_id,
                    "email": email,
                    "name": name,
                    "picture": picture,
                },
            }
        ), 200

    except ValueError as e:
        print(f"Token verification failed: {e}")
        return jsonify({"error": "Invalid token", "details": str(e)}), 401
    except Exception as e:
        print(f"An unexpected error occurred during Google auth: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/api/users", methods=["GET", "OPTIONS"])
def get_users():
    """
    API endpoint to retrieve a list of all users from the database.
    **WARNING:** This endpoint is currently unprotected. Add authentication/authorization
                 in a real application to restrict access (e.g., only for admins).
    """
    if request.method == "OPTIONS":
        return app.make_default_options_response()

    print("Request received for /api/users")
    # TODO: Add authentication check here!

    try:
        users = db_utils.get_all_users()
        if users is None:
            print(
                "Error: Failed to retrieve users from database (db_utils returned None)."
            )
            return jsonify({"error": "Failed to retrieve users from database"}), 500

        print(f"Successfully retrieved {len(users)} users.")
        return jsonify(users), 200
    except Exception as e:
        print(f"An unexpected error occurred in /api/users endpoint: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    host = "0.0.0.0"
    print(f"Starting Flask server on {host}:{port}...")
    app.run(debug=False, host=host, port=port)
