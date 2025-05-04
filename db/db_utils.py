import logging
import os
import urllib.parse as urlparse

import psycopg2
from dotenv import load_dotenv
from psycopg2 import (
    extras,  # For dict cursor
    pool,
)

load_dotenv()

# --- Logging Setup ---
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
# ---------------------


DATABASE_URL = os.getenv("DATABASE_URL")
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD = None, None, None, None, None

# --- Database Connection Setup (using logger instead of print) ---
if DATABASE_URL:
    logger.info("Connecting using DATABASE_URL from environment.")
    try:
        url = urlparse.urlparse(DATABASE_URL)
        DB_NAME = url.path[1:]
        DB_USER = url.username
        DB_PASSWORD = url.password
        DB_HOST = url.hostname
        DB_PORT = url.port or 5432
        logger.info(f"  Parsed DB_HOST: {DB_HOST}")
        logger.info(f"  Parsed DB_PORT: {DB_PORT}")
        logger.info(f"  Parsed DB_NAME: {DB_NAME}")
        logger.info(f"  Parsed DB_USER: {DB_USER}")
        logger.info(f"  Parsed DB_PASSWORD is set: {bool(DB_PASSWORD)}")
    except Exception as parse_err:
        logger.error(f"!!! ERROR parsing DATABASE_URL: {parse_err} !!!")
        # Reset all on parse error
        DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD = None, None, None, None, None
else:
    logger.info("DATABASE_URL not found, falling back to individual DB_* variables.")
    DB_HOST = os.getenv("DB_HOST")
    DB_NAME = os.getenv("DB_NAME")
    DB_USER = os.getenv("DB_USER")
    DB_PORT = os.getenv("DB_PORT")
    DB_PASSWORD = os.getenv("DB_PASSWORD")

connection_pool = None
try:
    # Check if all necessary parameters were successfully determined
    if not all([DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD]):
        logger.error(
            "Error: Missing one or more required DB connection parameters. Cannot create pool."
        )
    else:
        logger.info(
            f"Attempting to create connection pool for {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
        )
        connection_pool = pool.SimpleConnectionPool(
            1,  # minconn
            10,  # maxconn - Consider making min/max pool size configurable
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT,
            cursor_factory=extras.DictCursor,  # Use DictCursor globally for connections from this pool
        )
        # Test connection immediately after pool creation
        conn = connection_pool.getconn()
        logger.info(
            f"Successfully connected to database '{conn.info.dbname}' as user '{conn.info.user}'."
        )
        connection_pool.putconn(conn)
        logger.info("Database connection pool created and tested successfully.")

except (Exception, psycopg2.OperationalError) as e:
    logger.error(f"Error creating connection pool: {e}")
    connection_pool = None  # Ensure pool is None if creation fails


def get_db_connection():
    """Gets a connection from the connection pool."""
    if connection_pool:
        try:
            return connection_pool.getconn()
        except Exception as e:
            logger.error(f"Error getting connection from pool: {e}")
            return None
    else:
        logger.warning("Connection pool is not available.")
        return None


def release_db_connection(conn):
    """Releases a connection back to the connection pool."""
    if connection_pool and conn:
        try:
            connection_pool.putconn(conn)
        except Exception as e:
            logger.error(f"Error releasing connection back to pool: {e}")


def add_or_update_user(google_id, email, name, profile_picture_url):
    """
    Adds a new user or updates an existing user based on google_id.
    Updates the last_login timestamp. Does NOT update is_admin on conflict.

    Args:
        google_id (str): The unique Google ID of the user.
        email (str): The user's email address.
        name (str): The user's full name.
        profile_picture_url (str): URL to the user's profile picture.

    Returns:
        int: The internal database ID of the user, or None if an error occurred.
    """
    # Qualify table name with 'public.' schema
    sql = """
    INSERT INTO public.users (google_id, email, name, profile_picture_url, last_login, is_admin)
    VALUES (%s, %s, %s, %s, NOW(), FALSE)
    ON CONFLICT (google_id) DO UPDATE
    SET email = EXCLUDED.email,
        name = EXCLUDED.name,
        profile_picture_url = EXCLUDED.profile_picture_url,
        last_login = NOW()
        -- is_admin = users.is_admin -- Retain existing value (comment remains correct)
    RETURNING id;
    """
    conn = None
    user_id = None
    try:
        conn = get_db_connection()
        if conn:
            # --- START DIAGNOSTIC BLOCK ---
            try:
                with conn.cursor() as diag_cur:  # Uses DictCursor from pool
                    diag_cur.execute("SELECT current_database();")
                    db_name = diag_cur.fetchone()["current_database"]
                    diag_cur.execute("SELECT current_schema();")
                    schema_name = diag_cur.fetchone()["current_schema"]
                    diag_cur.execute("SELECT current_user;")
                    user_name = diag_cur.fetchone()["current_user"]
                    diag_cur.execute("SHOW search_path;")  # Check active search path
                    search_path = diag_cur.fetchone()["search_path"]

                    # Check using information_schema
                    diag_cur.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM information_schema.tables
                            WHERE table_schema = 'public' AND table_name = 'users'
                        );
                    """)
                    info_schema_exists = diag_cur.fetchone()["exists"]

                    # Check using pg_class system catalog
                    diag_cur.execute("""
                        SELECT EXISTS (
                            SELECT 1 FROM pg_catalog.pg_class c
                            JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
                            WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind = 'r'
                        );
                    """)
                    pg_class_exists = diag_cur.fetchone()["exists"]

                    logger.info(
                        f"DIAGNOSTIC: Connected to DB='{db_name}', Schema='{schema_name}', User='{user_name}'"
                    )
                    logger.info(f"DIAGNOSTIC: Connection search_path: '{search_path}'")
                    logger.info(
                        f"DIAGNOSTIC: Table 'public.users' exists check (information_schema): {info_schema_exists}"
                    )
                    logger.info(
                        f"DIAGNOSTIC: Table 'public.users' exists check (pg_class): {pg_class_exists}"
                    )

                    if not info_schema_exists or not pg_class_exists:
                        logger.error(
                            "DIAGNOSTIC: 'public.users' table NOT FOUND by this connection via catalog/schema query!"
                        )
                    if db_name != DB_NAME:
                        logger.error(
                            f"DIAGNOSTIC: Connected to WRONG database '{db_name}'! Expected '{DB_NAME}'."
                        )

            except Exception as diag_err:
                logger.error(f"DIAGNOSTIC: Error during diagnostic queries: {diag_err}")
            # --- END DIAGNOSTIC BLOCK ---

            # Proceed with original operation
            with conn.cursor() as cur:  # Uses DictCursor from pool
                cur.execute(sql, (google_id, email, name, profile_picture_url))
                result = cur.fetchone()
                if result:
                    user_id = result["id"]  # Access by key with DictCursor
                conn.commit()
                logger.info(
                    f"User {email} (Google ID: {google_id}) added or updated using public.users. DB ID: {user_id}"
                )
        else:
            logger.error("Failed to get DB connection for add_or_update_user.")

    except (Exception, psycopg2.Error) as error:
        logger.error(
            f"Error interacting with database in add_or_update_user (using public.users): {error}"
        )
        if conn:
            try:
                conn.rollback()
            except Exception as rb_err:
                logger.error(f"Error during rollback: {rb_err}")
    finally:
        if conn:
            release_db_connection(conn)
    return user_id


def get_user_by_google_id(google_id):
    """
    Retrieves user data (including is_admin) from the database based on Google ID.

    Args:
        google_id (str): The Google ID of the user to retrieve.

    Returns:
        dict: A dictionary containing user data or None if not found/error.
    """
    # Qualify table name for consistency during debugging
    sql = "SELECT id, google_id, email, name, profile_picture_url, created_at, last_login, is_admin FROM public.users WHERE google_id = %s;"
    conn = None
    user_data = None
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:  # Assumes DictCursor from pool
                cur.execute(sql, (google_id,))
                user_data = cur.fetchone()
        else:
            logger.error("Failed to get DB connection for get_user_by_google_id.")
    except (Exception, psycopg2.Error) as error:
        logger.error(f"Error retrieving user by google_id: {error}")
    finally:
        if conn:
            release_db_connection(conn)
    return user_data


def get_user_by_id(user_id):
    """
    Retrieves user data (including is_admin) from the database based on internal ID.

    Args:
        user_id (int): The internal database ID of the user.

    Returns:
        dict: A dictionary containing user data or None if not found/error.
    """
    # Qualify table name for consistency during debugging
    sql = "SELECT id, google_id, email, name, profile_picture_url, created_at, last_login, is_admin FROM public.users WHERE id = %s;"
    conn = None
    user_data = None
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:  # Assumes DictCursor from pool
                cur.execute(sql, (user_id,))
                user_data = cur.fetchone()
        else:
            logger.error("Failed to get DB connection for get_user_by_id.")
    except (Exception, psycopg2.Error) as error:
        logger.error(f"Error retrieving user by id: {error}")
    finally:
        if conn:
            release_db_connection(conn)
    return user_data


def get_all_users():
    """
    Retrieves all users from the database, ordered by last login time.
    **Consider pagination for production.**

    Returns:
        list[dict]: A list of user dictionaries, or None if an error occurred.
    """
    # Qualify table name for consistency during debugging
    sql = """
        SELECT id, email, name, profile_picture_url, created_at, last_login, is_admin
        FROM public.users
        ORDER BY last_login DESC;
        """
    conn = None
    users_list = None  # Initialize as None to distinguish from empty list
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor(cursor_factory=extras.DictCursor) as cur:
                cur.execute(sql)
                users_list = cur.fetchall()  # Returns list of dicts or empty list
        else:
            logger.error("Failed to get DB connection for get_all_users.")

    except (Exception, psycopg2.Error) as error:
        logger.error(f"Error retrieving all users: {error}")
        return None  # Return None on error
    finally:
        if conn:
            release_db_connection(conn)
    return (
        users_list if users_list is not None else []
    )  # Return empty list if query succeeded but no users


def add_game_score(user_id, game_mode, score):
    """
    Adds a game score entry for a specific user.

    Args:
        user_id (int): The internal database ID of the user.
        game_mode (str): A string identifying the game mode.
        score (int): The score achieved by the user.

    Returns:
        int: The ID of the newly inserted score record, or None if an error occurred.
    """
    # Assuming game_scores is also in public schema, qualify if needed
    sql = """
    INSERT INTO public.game_scores (user_id, game_mode, score)
    VALUES (%s, %s, %s)
    RETURNING id;
    """
    conn = None
    score_id = None
    try:
        conn = get_db_connection()
        if conn:
            with conn.cursor() as cur:  # Assumes DictCursor from pool
                cur.execute(sql, (user_id, game_mode, score))
                result = cur.fetchone()
                if result:
                    score_id = result["id"]
                conn.commit()
                logger.info(
                    f"Score added for user ID {user_id} in mode '{game_mode}'. Score ID: {score_id}"
                )
        else:
            logger.error("Failed to get DB connection for add_game_score.")

    except (Exception, psycopg2.Error) as error:
        logger.error(f"Error adding game score: {error}")
        if isinstance(error, psycopg2.errors.ForeignKeyViolation):
            logger.warning(
                f"Attempted to add score for non-existent user ID {user_id}."
            )
        if conn:
            try:
                conn.rollback()
            except Exception as rb_err:
                logger.error(f"Error during rollback: {rb_err}")
    finally:
        if conn:
            release_db_connection(conn)
    return score_id


# --- Main block (for testing) ---
if __name__ == "__main__":
    logger.info("Testing database utilities...")

    if not connection_pool:
        logger.error("Exiting test due to connection pool initialization failure.")
    else:
        logger.info("\n--- Testing add_or_update_user ---")
        test_google_id = (
            f"test_google_id_{os.urandom(4).hex()}"  # Unique ID for testing
        )
        test_email = f"test.user.{os.urandom(4).hex()}@example.com"
        test_name = "Test User"
        test_pic = "https://example.com/profile.jpg"
        user_db_id = add_or_update_user(test_google_id, test_email, test_name, test_pic)

        if user_db_id:
            logger.info(
                f"User added/updated successfully. Internal DB ID: {user_db_id}"
            )

            logger.info("\n--- Testing get_user_by_google_id ---")
            retrieved_user = get_user_by_google_id(test_google_id)
            if retrieved_user:
                logger.info(
                    f"Retrieved user data by Google ID: {dict(retrieved_user)}"
                )  # Log as dict
            else:
                logger.error("Failed to retrieve user by Google ID.")

            logger.info("\n--- Testing get_user_by_id ---")
            retrieved_user_by_id = get_user_by_id(user_db_id)
            if retrieved_user_by_id:
                logger.info(
                    f"Retrieved user data by DB ID: {dict(retrieved_user_by_id)}"
                )
            else:
                logger.error("Failed to retrieve user by DB ID.")

            logger.info("\n--- Testing add_game_score ---")
            game_mode = "capital_quiz"
            score = 1500
            score_db_id = add_game_score(user_db_id, game_mode, score)
            if score_db_id:
                logger.info(f"Game score added successfully. Score ID: {score_db_id}")
            else:
                logger.error("Failed to add game score.")

            logger.info("\n--- Testing add_game_score for non-existent user ---")
            add_game_score(999999, "flag_match", 500)  # Use a clearly non-existent ID

            logger.info("\n--- Testing get_all_users ---")
            all_users = get_all_users()
            if all_users is not None:  # Check if None wasn't returned due to error
                logger.info(f"Retrieved {len(all_users)} users:")
                # Log first few users as dicts for readability
                for user in all_users[:3]:
                    logger.info(dict(user))
                if len(all_users) > 3:
                    logger.info("...")
            else:
                logger.error("Failed to retrieve all users (function returned None).")

        else:
            logger.error("Failed to add or update user during test.")

        # Close pool at the end of tests
        if connection_pool:
            connection_pool.closeall()
            logger.info("\nConnection pool closed.")
