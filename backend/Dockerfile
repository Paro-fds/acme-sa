# US-001 : image de l'API, la même sur Render (démonstrateur) et sur ECS Fargate (AWS).
# Toute la configuration passe par des variables d'environnement (voir backend/.env.example).
FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    ACME_DATA_DIR=/tmp/acme-data \
    AUTO_CREATE_SCHEMA=false \
    PORT=8000

WORKDIR /app
RUN useradd --create-home --uid 10001 portail

COPY pyproject.toml ./
COPY app ./app
# Installation « éditable » : le code reste dans /app, à côté de demo/ et migrations/.
RUN pip install -e .

COPY alembic.ini ./
COPY migrations ./migrations
COPY demo ./demo

USER portail
EXPOSE 8000

# Migrations, puis l'API. --proxy-headers : derrière Vercel/Render ou CloudFront, l'API voit le HTTPS
# d'origine (cookie de session « Secure ») et l'adresse du visiteur.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:create_app --factory --host 0.0.0.0 --port ${PORT} --proxy-headers --forwarded-allow-ips='*'"]
