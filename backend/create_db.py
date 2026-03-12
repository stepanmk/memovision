

from sqlalchemy import create_engine, text

admin_engine = create_engine(
    "postgresql+psycopg://stepan:pswd123@127.0.0.1:5432/postgres",
    isolation_level="AUTOCOMMIT",
)

with admin_engine.connect() as conn:
    # terminate existing connections
    conn.execute(
        text(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = :dbname
              AND pid <> pg_backend_pid();
            """
        ),
        {"dbname": "memovision"},
    )

    # drop & create
    conn.execute(text(f'DROP DATABASE IF EXISTS "memovision"'))
    conn.execute(text(f'CREATE DATABASE "memovision"'))

admin_engine.dispose()
