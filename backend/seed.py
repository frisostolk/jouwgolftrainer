"""Seed demo users and superuser."""
import asyncio
from database import AsyncSessionLocal, engine, Base
from models import user, exercise, session, video, coach, connection  # noqa: register models
from models.user import User
from auth.jwt import hash_password
from sqlalchemy import select


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Superuser
        existing_su = await db.execute(select(User).where(User.email == "friskoe.friso@gmail.com"))
        if not existing_su.scalar_one_or_none():
            db.add(User(
                email="friskoe.friso@gmail.com",
                name="Friso",
                hashed_password=hash_password("!Talma24"),
                role="superuser",
            ))
            await db.flush()
            print("Created superuser (friskoe.friso@gmail.com)")

        # Demo users (idempotent)
        existing = await db.execute(select(User).where(User.email == "admin@golf.app"))
        if not existing.scalar_one_or_none():
            db.add_all([
                User(
                    email="admin@golf.app",
                    name="Admin",
                    hashed_password=hash_password("Admin1234!"),
                    role="admin",
                ),
                User(
                    email="coach@golf.app",
                    name="Coach Sarah",
                    hashed_password=hash_password("Coach1234!"),
                    role="coach",
                ),
                User(
                    email="player@golf.app",
                    name="Demo Player",
                    hashed_password=hash_password("Player1234!"),
                    role="player",
                    handicap=18.0,
                ),
            ])
            await db.flush()
            print("Created demo users")

        await db.commit()
        print("Seed complete!")


if __name__ == "__main__":
    asyncio.run(main())
