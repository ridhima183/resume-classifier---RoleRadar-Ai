#!/bin/bash

echo "Starting Resume Classifier Application..."
echo

echo "Step 1: Training ML Model..."
python scripts/train_model.py
if [ $? -ne 0 ]; then
    echo "❌ Model training failed!"
    exit 1
fi
echo "✅ ML Model trained successfully!"

echo
echo "Step 2: Starting Backend API..."
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

echo "Waiting for backend to start..."
sleep 5

echo
echo "Step 3: Starting Frontend..."
cd frontend
npm run dev &
FRONTEND_PID=$!

echo
echo "🚀 Application is starting!"
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://localhost:5173"
echo "API Docs: http://127.0.0.1:8000/docs"
echo
echo "Press Ctrl+C to stop all services"

# Wait for user interrupt
trap "echo 'Stopping services...'; kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
