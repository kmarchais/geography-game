import logging
import os
from datetime import datetime, timedelta, timezone  # Added timezone
from functools import wraps

import jwt  # Import jwt
from dotenv import load_dotenv
from flask import Flask, g, jsonify, request  # Import g
from flask_cors import CORS
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

# Assuming db_utils is in the same directory or package
try:
    from . import db_utils  # Use relative import if in a package
except ImportError:
    import db_utils

load_dotenv()

app = Flask(__name__)

# --- Logging Setup ---
# Use Flask's built-in logger
logging.basicConfig(level=logging.INFO)
# You might want more sophisticated logging configuration for production
# Example: logging.FileHandler, logging.StreamHandler, formatters etc.
# ---------------------


# --- Configuration ---
LOCAL_FRONTEND_URL = os.getenv("LOCAL_FRONTEND_URL", "http://localhost:3000")
allowed_origins = [
    LOCAL_FRONTEND_URL,
    "https://kmarchais.github.io",
    "https://geography-game.up.railway.app",
    "https://geography-game-test.up.railway.app",
    "https://geography-game-geography-game-pr-22.up.railway.app",
]

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")  # Load JWT Secret

if not GOOGLE_CLIENT_ID:
    app.logger.critical(
        "FATAL ERROR: GOOGLE_CLIENT_ID not found in environment variables."
    )
    raise ValueError("Missing GOOGLE_CLIENT_ID")
else:
    app.logger.info("GOOGLE_CLIENT_ID loaded successfully.")

if not JWT_SECRET_KEY:
    app.logger.critical(
        "FATAL ERROR: JWT_SECRET_KEY not found in environment variables."
    )
    raise ValueError("Missing JWT_SECRET_KEY")
else:
    app.logger.info("JWT_SECRET_KEY loaded successfully.")
# ---------------------


# --- CORS Setup ---
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
    allow_headers=["Content-Type", "Authorization"],  # Ensure Authorization is allowed
    supports_credentials=True,
)
app.logger.info(f"CORS enabled for origins: {allowed_origins}")
# ---------------------


# --- JWT Authentication Decorator ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # --- Add this check at the beginning ---
        if request.method == "OPTIONS":
            # Allow CORS preflight requests to pass through without token check
            # We rely on Flask-CORS to handle the actual OPTIONS response later
            return f(
                *args, **kwargs
            )  # Or potentially just `return app.make_default_options_response()`
            # but letting it pass to the route which also checks OPTIONS is safer.
        # ---------------------------------------
        token = None
        # Check for Bearer token in Authorization header
        if "Authorization" in request.headers:
            auth_header = request.headers["Authorization"]
            parts = auth_header.split()
            if len(parts) == 2 and parts[0].lower() == "bearer":
                token = parts[1]
            else:
                app.logger.warning("Malformed Authorization header received.")
                return jsonify({"message": "Malformed token header"}), 401

        if not token:
            app.logger.warning("Missing token for protected route.")
            return jsonify({"message": "Token is missing!"}), 401

        try:
            # Verify and decode the token
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
            # Fetch user details from DB using ID stored in token
            # Store user info in Flask's 'g' object for access within the request context
            g.current_user = db_utils.get_user_by_id(data["user_id"])
            if not g.current_user:
                app.logger.error(
                    f"User ID {data['user_id']} from valid token not found in DB."
                )
                return jsonify(
                    {"message": "User not found"}
                ), 401  # Or 404? 401 seems better.

        except jwt.ExpiredSignatureError:
            app.logger.warning("Expired token received.")
            return jsonify({"message": "Token has expired!"}), 401
        except jwt.InvalidTokenError as e:
            app.logger.error(f"Invalid token received: {e}")
            return jsonify({"message": "Token is invalid!"}), 401
        except Exception as e:
            app.logger.error(f"Unexpected error during token verification: {e}")
            return jsonify({"message": "Error processing token"}), 500

        return f(*args, **kwargs)  # Proceed to the original route function

    return decorated


# ---------------------


# --- Routes ---
@app.route("/api/auth/google", methods=["POST", "OPTIONS"])
def auth_google():
    """
    Receives Google ID token, verifies it, adds/updates user,
    and returns user info along with a JWT access token.
    """
    if request.method == "OPTIONS":
        return app.make_default_options_response()

    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 415

    data = request.get_json()
    token = data.get("token")

    if not token:
        return jsonify({"error": "Missing token"}), 400

    app.logger.info("Received Google token for verification...")

    try:
        id_info = id_token.verify_oauth2_token(
            token, google_requests.Request(), GOOGLE_CLIENT_ID
        )
        app.logger.info("Google token verified successfully.")

        google_id = id_info["sub"]
        email = id_info.get("email")
        name = id_info.get("name")
        picture = id_info.get("picture")

        if not email:
            app.logger.error("Email not found in verified Google token.")
            return jsonify({"error": "Email not found in token"}), 400

        app.logger.info(f"Attempting to add/update user: {email}")
        user_db_id = db_utils.add_or_update_user(google_id, email, name, picture)

        if user_db_id is None:
            app.logger.error("Database operation failed during add/update user.")
            return jsonify({"error": "Database operation failed"}), 500

        # Fetch the full user data (including is_admin) after add/update
        user_data = db_utils.get_user_by_id(user_db_id)
        if not user_data:
            app.logger.error(
                f"Failed to retrieve user data for ID {user_db_id} after add/update."
            )
            return jsonify({"error": "Could not retrieve user data after login"}), 500

        # --- Generate JWT ---
        jwt_payload = {
            "user_id": user_db_id,
            "email": user_data["email"],  # Optional: include non-sensitive info
            "is_admin": user_data["is_admin"],  # Include admin status
            "exp": datetime.now(timezone.utc)
            + timedelta(hours=1),  # Token expires in 1 hour
            "iat": datetime.now(timezone.utc),  # Issued at time
        }
        access_token = jwt.encode(jwt_payload, JWT_SECRET_KEY, algorithm="HS256")
        # --------------------

        app.logger.info(
            f"User processed successfully. DB ID: {user_db_id}. JWT issued."
        )
        # Return user info AND the access token
        return jsonify(
            {
                "status": "success",
                "user": {  # Return user data from DB (includes is_admin)
                    "id": user_data["id"],
                    "google_id": user_data["google_id"],
                    "email": user_data["email"],
                    "name": user_data["name"],
                    "picture": user_data["profile_picture_url"],
                    "is_admin": user_data["is_admin"],
                },
                "access_token": access_token,  # Send token to client
            }
        ), 200

    except ValueError as e:
        # This catches id_token.verify_oauth2_token errors
        app.logger.error(f"Google token verification failed: {e}")
        return jsonify({"error": "Invalid Google token", "details": str(e)}), 401
    except Exception as e:
        app.logger.error(
            f"An unexpected error occurred during Google auth: {e}", exc_info=True
        )
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/api/users", methods=["GET", "OPTIONS"])
@token_required  # Apply the JWT verification decorator
def get_users():
    """
    API endpoint to retrieve a list of all users.
    Requires a valid JWT. Only allows access if the user is an admin.
    """
    if request.method == "OPTIONS":
        # OPTIONS requests are typically handled by CORS middleware or before decorators
        # If token_required blocks OPTIONS, adjust CORS or the decorator
        return app.make_default_options_response()

    # --- Authorization Check ---
    # The @token_required decorator already verified the token and put user data in g.current_user
    if not g.current_user or not g.current_user.get("is_admin"):
        app.logger.warning(
            f"Unauthorized attempt to access /api/users by user ID: {g.current_user.get('id') if g.current_user else 'Unknown'}"
        )
        return jsonify({"message": "Admin privileges required"}), 403  # Forbidden
    # ---------------------------

    app.logger.info(f"Admin user ID {g.current_user['id']} accessing /api/users")

    try:
        # Consider pagination here for large user bases
        users = db_utils.get_all_users()
        if users is None:
            # This indicates an error within db_utils.get_all_users
            app.logger.error(
                "Failed to retrieve users from database (db_utils returned None)."
            )
            # Don't expose internal details, keep error generic
            return jsonify({"error": "Failed to retrieve users"}), 500

        app.logger.info(f"Successfully retrieved {len(users)} users for admin.")
        # Convert Row objects to plain dicts if not already done by DictCursor
        # users_list = [dict(user) for user in users] # Already handled by DictCursor
        return jsonify(users), 200
    except Exception as e:
        app.logger.error(
            f"An unexpected error occurred in /api/users endpoint: {e}", exc_info=True
        )
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/health", methods=["GET"])
def health_check():
    # Could add a DB connection check here too
    return jsonify({"status": "ok"}), 200


if __name__ == "__main__":
    # Use waitress or gunicorn for production instead of app.run()
    port = int(os.environ.get("PORT", 5001))  # Changed default port slightly
    host = "0.0.0.0"
    app.logger.info(f"Starting Flask DEVELOPMENT server on {host}:{port}...")
    app.logger.warning("Do NOT use Flask's development server in production!")
    # For production use: gunicorn --bind 0.0.0.0:5001 app:app
    app.run(
        debug=False, host=host, port=port
    )  # debug=False is important for production-like testing
