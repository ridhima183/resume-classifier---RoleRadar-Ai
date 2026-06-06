@echo off
echo Starting Resume Classifier Application...
echo.

echo Step 1: Training ML Model...
python scripts/train_model.py
if %errorlevel% neq 0 (
    echo ❌ Model training failed!
    pause
    exit /b 1
)
echo ✅ ML Model trained successfully!

echo.
echo Step 2: Starting Backend API...
start "Backend API" cmd /k "uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000"

echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

echo.
echo Step 3: Starting Frontend...
cd frontend
start "Frontend" cmd /k "npm run dev"

echo.
echo 🚀 Application is starting!
echo Backend: http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo API Docs: http://127.0.0.1:8000/docs
echo.
echo Press any key to exit this launcher...
pause >nul
