# app.py
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS  # Import CORS
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

# Import your database utility functions
# Adjust the import path if db_utils.py is in a subdirectory like 'db'
# from db import db_utils
from . import db_utils

# Load environment variables (including GOOGLE_CLIENT_ID and DB variables)
load_dotenv()

app = Flask(__name__)

# --- CORS Configuration ---
# Allow requests from your Vue frontend development server
# Make sure the origin matches where your Vue app is served (e.g., http://localhost:3000)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": [FRONTEND_URL, "YOUR_PRODUCTION_FRONTEND_URL_IF_DIFFERENT"]
        }
    },
    supports_credentials=True,
)
print(f"CORS enabled for origins: {FRONTEND_URL}")

# Get Google Client ID from environment
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    # Use raise instead of print for critical configuration errors
    raise ValueError(
        "FATAL ERROR: GOOGLE_CLIENT_ID not found in environment variables."
    )
else:
    print("GOOGLE_CLIENT_ID loaded successfully.")


@app.route("/api/auth/google", methods=["POST"])
def auth_google():
    """
    Receives Google ID token from frontend, verifies it,
    and adds/updates the user in the database.
    """
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    print("Received token for verification...")  # Log receipt

    try:
        # --- Verify the ID token ---
        id_info = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        print("Token verified successfully.")  # Log success

        # --- Extract user information from verified token ---
        google_id = id_info["sub"]
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")

        if not email:
            print("Error: Email not found in verified token.")
            return jsonify({"error": "Email not found in token"}), 400

        # --- Add or update user in the database ---
        print(f"Attempting to add/update user: {email}")
        user_db_id = db_utils.add_or_update_user(google_id, email, name, picture)

        if user_db_id is None:
            print("Error: Database operation failed during add/update user.")
            # db_utils function should log the specific DB error
            return jsonify({"error": "Database operation failed"}), 500

        # --- Return success response ---
        print(f"User processed successfully. DB ID: {user_db_id}")
        return jsonify({"status": "success", "user_id": user_db_id}), 200

    except ValueError as e:
        # Invalid token (verification failed)
        print(f"Token verification failed: {e}")
        return jsonify({"error": "Invalid token"}), 401
    except Exception as e:
        # Catch other potential errors
        print(f"An unexpected error occurred during Google auth: {e}")
        # Consider logging the full traceback in production
        # import traceback
        # traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/api/users", methods=["GET"])
def get_users():
    """
    API endpoint to retrieve a list of all users from the database.
    **WARNING:** This endpoint is currently unprotected. Add authentication/authorization
                 in a real application to restrict access (e.g., only for admins).
    """
    print("Request received for /api/users")  # Log request
    # TODO: Add authentication check here!
    # Example:
    # auth_header = request.headers.get('Authorization')
    # if not is_user_admin(auth_header):
    #     print("Unauthorized access attempt to /api/users")
    #     return jsonify({"error": "Unauthorized"}), 403

    try:
        users = db_utils.get_all_users()
        if users is None:
            # This means a database error occurred in get_all_users
            print(
                "Error: Failed to retrieve users from database (db_utils returned None)."
            )
            return jsonify({"error": "Failed to retrieve users from database"}), 500

        print(f"Successfully retrieved {len(users)} users.")
        # Return the list of users (will be an empty list if DB table is empty)
        return jsonify(users), 200
    except Exception as e:
        print(f"An unexpected error occurred in /api/users endpoint: {e}")
        # import traceback
        # traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


# Optional: Add a simple health check endpoint
@app.route("/health", methods=["GET"])
def health_check():
    # You could add a quick DB connection check here if desired
    # conn = db_utils.get_db_connection()
    # status = "ok" if conn else "unhealthy"
    # if conn: db_utils.release_db_connection(conn)
    # return jsonify({"status": status}), 200 if conn else 503
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Use 0.0.0.0 to make the server accessible externally (e.g., from host machine to container/VM)
    # The default port is 5000
    host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")
    port = int(os.getenv("FLASK_RUN_PORT", 5000))
    print(f"Starting Flask server on {host}:{port}...")
    # Turn off debug mode for production use! Use a WSGI server like Gunicorn or Waitress.
    app.run(debug=True, host=host, port=port)
