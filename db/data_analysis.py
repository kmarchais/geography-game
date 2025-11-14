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


@app.cell(hide_code=True)
def _(mo):
    dropdown = mo.ui.dropdown(options=["LOCAL", "RAILWAY"], value="LOCAL", label="Choose database:")
    dropdown
    return (dropdown,)


@app.cell(hide_code=True)
def _(dropdown):
    import os
    import sqlalchemy
    from dotenv import load_dotenv
    from urllib.parse import urlparse

    load_dotenv()

    if dropdown.value == "LOCAL":
        host = os.getenv("DB_HOST")
        port = os.getenv("DB_PORT")
        database_name = os.getenv("DB_NAME")
        user = os.getenv("DB_USER")
        password = os.getenv("DB_PASSWORD")

    elif dropdown.value == "RAILWAY":
        host = os.getenv("RAILWAY_HOST")
        port = os.getenv("RAILWAY_PORT")
        database_name = os.getenv("RAILWAY_DATABASE")
        user = os.getenv("RAILWAY_USER")
        password = os.getenv("RAILWAY_PASSWORD")

        if not all([host, port, database_name, user, password]):
            raise ValueError("Missing Railway database credentials")

    engine = sqlalchemy.create_engine(f"postgresql://{user}:{password}@{host}:{port}/{database_name}")
    conn = engine.connect()
    print('Connected to database successfully!')
    return (conn,)


@app.cell
def _(conn, pd):
    users_df = pd.read_sql("SELECT * FROM users", conn)
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
