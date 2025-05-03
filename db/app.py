# app.py
import os

# Import your database utility functions
# Adjust the import path if db_utils.py is in a subdirectory like 'db'
# from db import db_utils
# Assuming db_utils is in the same directory or configured in PYTHONPATH
import db_utils
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS  # Import CORS
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

# Load environment variables (especially for local development)
load_dotenv()

app = Flask(__name__)

# --- CORS Configuration ---
# Define the origins allowed to access your backend API

# Your frontend URL on GitHub Pages
PRODUCTION_FRONTEND_URL = "https://kmarchais.github.io"

# Your local development frontend URL (adjust port if necessary, e.g., 5173)
LOCAL_FRONTEND_URL = os.getenv("LOCAL_FRONTEND_URL", "http://localhost:3000")

# List of allowed origins
allowed_origins = [
    LOCAL_FRONTEND_URL,
    PRODUCTION_FRONTEND_URL,
    # You can add more origins here if needed (e.g., staging environment)
]

# Apply CORS to the Flask app, specifically for routes under /api/
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
    ],  # Explicitly list allowed methods
    allow_headers=["Content-Type", "Authorization"],  # Explicitly list allowed headers
    supports_credentials=True,  # Allows cookies/auth headers to be sent
)

print(f"CORS enabled for origins: {allowed_origins}")
# --- End CORS Configuration ---


# Get Google Client ID from environment
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
if not GOOGLE_CLIENT_ID:
    # Use raise instead of print for critical configuration errors
    raise ValueError(
        "FATAL ERROR: GOOGLE_CLIENT_ID not found in environment variables."
    )
else:
    print("GOOGLE_CLIENT_ID loaded successfully.")


@app.route(
    "/api/auth/google", methods=["POST", "OPTIONS"]
)  # Add OPTIONS method for preflight requests
def auth_google():
    """
    Receives Google ID token from frontend, verifies it,
    and adds/updates the user in the database.
    """
    # Handle CORS preflight requests (OPTIONS method)
    if request.method == "OPTIONS":
        # The CORS extension usually handles this, but being explicit can sometimes help
        # You might not strictly need this if CORS() is configured correctly above
        response = app.make_default_options_response()
        # You could potentially add headers here if flask_cors wasn't handling it
        # but flask_cors should add Access-Control-Allow-Methods, etc.
        return response

    # Handle the actual POST request
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    print("Received token for verification...")  # Log receipt

    try:
        # --- Verify the ID token ---
        # Specify the audience (your client ID) during verification
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
        # Include user info in the response for the frontend
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
        # Invalid token (verification failed)
        print(f"Token verification failed: {e}")
        return jsonify({"error": "Invalid token", "details": str(e)}), 401
    except Exception as e:
        # Catch other potential errors
        print(f"An unexpected error occurred during Google auth: {e}")
        # Consider logging the full traceback in production
        # import traceback
        # traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route(
    "/api/users", methods=["GET", "OPTIONS"]
)  # Add OPTIONS method for preflight requests
def get_users():
    """
    API endpoint to retrieve a list of all users from the database.
    **WARNING:** This endpoint is currently unprotected. Add authentication/authorization
                 in a real application to restrict access (e.g., only for admins).
    """
    if request.method == "OPTIONS":
        return app.make_default_options_response()

    print("Request received for /api/users")  # Log request
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
        # import traceback
        # traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


# Optional: Add a simple health check endpoint (useful for Railway)
@app.route("/health", methods=["GET"])
def health_check():
    # You could add a quick DB connection check here if desired
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Railway provides the PORT environment variable
    port = int(os.environ.get("PORT", 5000))  # Default to 5000 if not set
    # Use 0.0.0.0 to listen on all available network interfaces within the container
    host = "0.0.0.0"
    print(f"Starting Flask server on {host}:{port}...")
    # Set debug=False for production on Railway
    # Use a production WSGI server like Gunicorn instead of app.run for production
    app.run(debug=False, host=host, port=port)
