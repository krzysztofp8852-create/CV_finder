.PHONY: install dev-backend dev-frontend test

install:
	python3 -m venv backend/.venv
	backend/.venv/bin/pip install -r backend/requirements-dev.txt
	cd frontend && npm ci

# Backend FastAPI na :8000; frontend przekierowuje do niego /api/* (frontend/next.config.mjs).
dev-backend:
	cd backend && .venv/bin/uvicorn app.main:app --reload --port 8000 --env-file ../.env.local

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && .venv/bin/python -m pytest
	cd frontend && npx tsc --noEmit
