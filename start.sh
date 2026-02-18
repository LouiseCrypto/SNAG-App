#!/bin/bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

echo "🔧 SNAG — Starting up..."

# ─── Backend ───────────────────────────────────────────────────────────────
echo ""
echo "📦 Setting up Python backend..."
cd "$BACKEND"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "  Created virtual environment"
fi

source .venv/bin/activate
pip install -q -r requirements.txt
echo "  Dependencies installed"

python seed.py
echo "  Database seeded"

echo "  Starting FastAPI on http://localhost:8000"
uvicorn app:app --reload --port 8000 &
BACKEND_PID=$!

# ─── Frontend ──────────────────────────────────────────────────────────────
echo ""
echo "🖥  Setting up React frontend..."
cd "$FRONTEND"

if [ ! -d "node_modules" ]; then
  echo "  Installing npm packages..."
  npm install
fi

echo "  Starting Vite dev server on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!

# ─── Cleanup ───────────────────────────────────────────────────────────────
echo ""
echo "✅ SNAG is running!"
echo "   Frontend → http://localhost:5173"
echo "   Backend  → http://localhost:8000"
echo "   API Docs → http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop everything."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo 'Stopped.'" INT TERM
wait
