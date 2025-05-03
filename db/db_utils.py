# db_utils.py

import os
import urllib.parse as urlparse

import psycopg2
from dotenv import load_dotenv
from psycopg2 import pool

# Optional: For dictionary cursor, but manual conversion is used below
# from psycopg2.extras import DictCursor

# Load environment variables from a .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")  # Check for Railway's variable first

if DATABASE_URL:
    print("Connecting using DATABASE_URL from environment.")  # Good log message
    url = urlparse.urlparse(DATABASE_URL)
    DB_NAME = url.path[1:]
    DB_USER = url.username
    DB_PASSWORD = url.password
    DB_HOST = url.hostname
    DB_PORT = url.port or 5432
else:
    # Fallback for local development (using .env)
    print("DATABASE_URL not found, falling back to individual DB_* variables.")
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_NAME = os.getenv("DB_NAME", "geography_game")
    DB_USER = os.getenv("DB_USER", "geography_game_user")
    DB_PASSWORD = os.getenv("DB_PASSWORD")
    DB_PORT = os.getenv("DB_PORT", "5432")

# --- Connection Pooling ---
connection_pool = None  # Initialize to None
try:
    if not DB_PASSWORD:
        print("Error: DB_PASSWORD environment variable not set.")
        print("Create a .env file or set environment variables.")
    else:
        connection_pool = pool.SimpleConnectionPool(
            1,  # minconn
            10,  # maxconn
            host=DB_HOST,
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            port=DB_PORT,
        )
        print("Database connection pool created successfully.")

except psycopg2.OperationalError as e:
    print(f"Error creating connection pool: {e}")
    print(
        "Please ensure the database is running and credentials in your .env file (or environment variables) are correct."
    )
    # connection_pool remains None


def get_db_connection():
    """Gets a connection from the connection pool."""
    if connection_pool:
        try:
            return connection_pool.getconn()
        except Exception as e:
            print(f"Error getting connection from pool: {e}")
            return None
    else:
        print("Connection pool is not available.")
        return None


def release_db_connection(conn):
    """Releases a connection back to the connection pool."""
    if connection_pool and conn:
        connection_pool.putconn(conn)


# --- User Functions ---


def add_or_update_user(google_id, email, name, profile_picture_url):
    """
    Adds a new user or updates an existing user based on google_id.
    Updates the last_login timestamp for both new and existing users.

    Args:
        google_id (str): The unique Google ID of the user.
        email (str): The user's email address.
        name (str): The user's full name.
        profile_picture_url (str): URL to the user's profile picture.

    Returns:
        int: The internal database ID of the user, or None if an error occurred.
    """
    sql = """
    INSERT INTO users (google_id, email, name, profile_picture_url, last_login)
    VALUES (%s, %s, %s, %s, NOW())
    ON CONFLICT (google_id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        profile_picture_url = EXCLUDED.profile_picture_url,
        last_login = NOW()
    RETURNING id;
    """
    conn = None
    user_id = None
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:
                cur.execute(sql, (google_id, email, name, profile_picture_url))
                user_id = cur.fetchone()[0]  # Get the returned id
                conn.commit()
                print(
                    f"User {email} (Google ID: {google_id}) added or updated. DB ID: {user_id}"
                )
    except (Exception, psycopg2.Error) as error:
        print(f"Error interacting with database in add_or_update_user: {error}")
        if conn:
            conn.rollback()  # Roll back changes on error
    finally:
        if conn:
            release_db_connection(conn)
    return user_id


def get_user_by_google_id(google_id):
    """
    Retrieves user data from the database based on their Google ID.

    Args:
        google_id (str): The Google ID of the user to retrieve.

    Returns:
        dict: A dictionary containing user data (id, google_id, email, name,
              profile_picture_url, created_at, last_login) or None if not found
              or an error occurred.
    """
    sql = "SELECT id, google_id, email, name, profile_picture_url, created_at, last_login FROM users WHERE google_id = %s;"
    conn = None
    user_data = None
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:
                cur.execute(sql, (google_id,))
                result = cur.fetchone()
                if result:
                    # Convert tuple result to a dictionary for easier access
                    columns = [desc[0] for desc in cur.description]
                    user_data = dict(zip(columns, result))
    except (Exception, psycopg2.Error) as error:
        print(f"Error retrieving user by google_id: {error}")
    finally:
        if conn:
            release_db_connection(conn)
    return user_data


def get_all_users():
    """
    Retrieves all users from the database, ordered by last login time (newest first).

    Returns:
        list[dict]: A list of dictionaries, where each dictionary contains user data
                    (id, email, name, profile_picture_url, created_at, last_login),
                    or None if an error occurred. Returns an empty list if no users exist.
    """
    # Select relevant fields, order by last_login descending
    sql = """
        SELECT id, email, name, profile_picture_url, created_at, last_login
        FROM users
        ORDER BY last_login DESC;
        """
    conn = None
    users_list = []
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:
                cur.execute(sql)
                results = cur.fetchall()
                if results:
                    # Get column names from cursor description
                    columns = [desc[0] for desc in cur.description]
                    # Convert list of tuples into list of dictionaries
                    users_list = [dict(zip(columns, row)) for row in results]

    except (Exception, psycopg2.Error) as error:
        print(f"Error retrieving all users: {error}")
        return None  # Indicate an error occurred
    finally:
        if conn:
            release_db_connection(conn)
    return users_list  # Return the list (could be empty if no users)


# --- Game Score Functions ---


def add_game_score(user_id, game_mode, score):
    """
    Adds a game score entry for a specific user.

    Args:
        user_id (int): The internal database ID of the user (from the users table).
        game_mode (str): A string identifying the game mode (e.g., 'capital_quiz', 'flag_match').
        score (int): The score achieved by the user in the game.

    Returns:
        int: The ID of the newly inserted score record, or None if an error occurred.
    """
    sql = """
    INSERT INTO game_scores (user_id, game_mode, score)
    VALUES (%s, %s, %s)
    RETURNING id;
    """
    conn = None
    score_id = None
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:
                cur.execute(sql, (user_id, game_mode, score))
                score_id = cur.fetchone()[0]  # Get the returned id
                conn.commit()
                print(
                    f"Score added for user ID {user_id} in mode '{game_mode}'. Score ID: {score_id}"
                )
    except (Exception, psycopg2.Error) as error:
        print(f"Error adding game score: {error}")
        # Check for foreign key violation (user_id doesn't exist)
        if isinstance(error, psycopg2.errors.ForeignKeyViolation):
            print(f"Error: User with ID {user_id} does not exist.")
        if conn:
            conn.rollback()
    finally:
        if conn:
            release_db_connection(conn)
    return score_id


# --- Example Usage (for testing this file directly) ---
if __name__ == "__main__":
    print("Testing database utilities...")

    if not connection_pool:
        print("Exiting due to connection pool initialization failure.")
    else:
        # Test adding/updating a user
        print("\nTesting add_or_update_user...")
        test_google_id = "test_google_id_12345"
        test_email = "test.user@example.com"
        test_name = "Test User"
        test_pic = "https://example.com/profile.jpg"
        user_db_id = add_or_update_user(test_google_id, test_email, test_name, test_pic)

        if user_db_id:
            print(f"User added/updated successfully. Internal DB ID: {user_db_id}")

            # Test retrieving the user
            print("\nTesting get_user_by_google_id...")
            retrieved_user = get_user_by_google_id(test_google_id)
            if retrieved_user:
                print("Retrieved user data:")
                print(retrieved_user)
            else:
                print("Failed to retrieve user.")

            # Test adding a game score
            print("\nTesting add_game_score...")
            game_mode = "capital_quiz"
            score = 1500
            score_db_id = add_game_score(user_db_id, game_mode, score)
            if score_db_id:
                print(f"Game score added successfully. Score ID: {score_db_id}")
            else:
                print("Failed to add game score.")

            # Test adding score for non-existent user (should fail gracefully)
            print("\nTesting add_game_score for non-existent user...")
            add_game_score(
                99999, "flag_match", 500
            )  # Assuming user 99999 doesn't exist

            # Test getting all users
            print("\nTesting get_all_users...")
            all_users = get_all_users()
            if all_users is not None:
                print(f"Retrieved {len(all_users)} users:")
                # Print first few users for brevity
                for user in all_users[:3]:
                    print(user)
                if len(all_users) > 3:
                    print("...")
            else:
                print("Failed to retrieve all users.")

        else:
            print("Failed to add or update user.")

        # Clean up the connection pool when the application exits
        if connection_pool:
            connection_pool.closeall()
            print("\nConnection pool closed.")
