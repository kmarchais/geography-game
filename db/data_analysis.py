import marimo

__generated_with = "0.13.6"
app = marimo.App(width="full")


@app.cell(hide_code=True)
def _(mo):
    mo.md(
        r"""
    # Game Data Analysis

    This notebook provides visualizations and analysis of your game data.
    """
    )
    return


@app.cell
def _():
    import pandas as pd
    import matplotlib.pyplot as plt
    return pd, plt


@app.cell
def _():
    DATABASE = "LOCAL" # "LOCAL" or "RAILWAY"
    return (DATABASE,)


@app.cell
def _(DATABASE):
    import os
    import sqlalchemy
    from dotenv import load_dotenv
    from urllib.parse import urlparse

    # Load environment variables
    load_dotenv()

    if DATABASE == "LOCAL":
        local_host = os.getenv("DB_HOST")
        local_port = os.getenv("DB_PORT")
        local_db = os.getenv("DB_NAME")
        local_user = os.getenv("DB_USER")
        local_password = os.getenv("DB_PASSWORD")

        # Create SQLAlchemy engine
        conn_str = f"postgresql://{local_user}:{local_password}@{local_host}:{local_port}/{local_db}"
        engine = sqlalchemy.create_engine(conn_str)
        conn = engine.connect()

    elif DATABASE == "RAILWAY":
        DATABASE_URL = os.getenv('DATABASE_URL')
        if DATABASE_URL:
            url = urlparse(DATABASE_URL)
            host = url.hostname
            port = url.port or 5432
            database = url.path[1:]
            user = url.username
            password = url.password

            # Create SQLAlchemy engine for Railway
            conn_str = f"postgresql://{user}:{password}@{host}:{port}/{database}"
            engine = sqlalchemy.create_engine(conn_str)
            conn = engine.connect()
            print('Connected to database successfully!')
        else:
            print('DATABASE_URL not found in environment variables')
            conn = None
    return (conn,)


@app.cell
def _(conn, pd):
    users_df = pd.read_sql("SELECT * FROM users", conn)
    print(users_df["profile_picture_url"][0])
    users_df
    return


@app.cell
def _(conn, pd):
    scores_df = pd.read_sql("SELECT * FROM game_scores", conn)
    scores_df
    return (scores_df,)


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## Score Distribution""")
    return


@app.cell
def _(plt, scores_df):
    plt.figure(figsize=(10, 6))
    plt.hist(scores_df['score'], bins=20, alpha=0.7)
    plt.title('Score Distribution')
    plt.xlabel('Score')
    plt.ylabel('Frequency')
    plt.grid(True)
    plt.show()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## Scores Over Time""")
    return


@app.cell
def _(plt, scores_df):
    plt.figure(figsize=(12, 6))
    plt.plot(scores_df['played_at'], scores_df['score'], 'o-', markersize=4)
    plt.title('Game Scores Over Time')
    plt.xlabel('Date')
    plt.ylabel('Score')
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.show()
    return


@app.cell(hide_code=True)
def _(mo):
    mo.md(r"""## User Performance""")
    return


@app.cell
def _(scores_df):
    user_performance = scores_df.groupby(['user_id', 'game_mode'])['score'].agg(['mean', 'count']).reset_index()
    user_performance = user_performance.rename(columns={'mean': 'average_score', 'count': 'games_played'})
    user_performance
    return


@app.cell
def _(conn):
    # Close database connection
    conn.close()
    return


@app.cell
def _():
    import marimo as mo
    return (mo,)


if __name__ == "__main__":
    app.run()
