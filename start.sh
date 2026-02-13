#!/bin/bash

# Start Python backend in background
echo "Starting Python FastAPI backend on port 8000..."
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
PYTHON_PID=$!

# Wait for Python backend to start
sleep 3

# Start Node.js frontend
echo "Starting Node.js frontend on port 5000..."
NODE_ENV=development npx tsx server/index.ts &
NODE_PID=$!

# Handle shutdown
trap "kill $PYTHON_PID $NODE_PID 2>/dev/null" EXIT

# Wait for both processes
wait
