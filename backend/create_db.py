from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url

from memovision.app_config import Config

target_url = make_url(Config.SQLALCHEMY_DATABASE_URI)

admin_url = target_url.set(database="postgres")

admin_engine = create_engine(
    admin_url,
    isolation_level="AUTOCOMMIT",
)

with admin_engine.connect() as conn:
    conn.execute(
        text(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = :dbname
              AND pid <> pg_backend_pid();
            """
        ),
        {"dbname": target_url.database},
    )

    conn.execute(text(f'DROP DATABASE IF EXISTS "{target_url.database}"'))
    conn.execute(text(f'CREATE DATABASE "{target_url.database}"'))

admin_engine.dispose()