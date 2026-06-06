# How to Run the Resume Classifier Project

Complete guide to run the entire system with AI resume classifier, ML model, and LLM chat feature.

---

## 📋 System Overview

```
Resume Classifier System
├── Backend API (FastAPI)
│   ├── Resume Classification (ML Model)
│   ├── User Management & Auth
│   ├── LinkedIn Import
│   ├── Admin Dashboard
│   └── LLM Chat Service (NEW ✨)
├── Frontend (React + Vite)
│   └── Interactive UI
└── Database (SQLite)
    └── Auto-initialized
```

---

## ⚡ QUICK START (After Setup)

**Got 2 minutes? Start here:**

### Terminal 1: Backend
```bash
cd "e:\resume-classifier - Copy"
.\venv\Scripts\Activate.ps1
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
```

### Terminal 2: Frontend
```bash
cd "e:\resume-classifier - Copy\frontend"
npm run dev
```

**Then open:** http://localhost:5173 ✨

---

## ⚙️ Initial Setup (One Time Only)

### Step 1: Navigate to Project

```bash
cd "e:\resume-classifier - Copy"
```

### Step 2: Create Virtual Environment

```bash
python -m venv venv
```

Activate it:
- **PowerShell:** `.\venv\Scripts\Activate.ps1`
- **Command Prompt:** `venv\Scripts\activate.bat`

Expected: Prompt shows `(venv)`

### Step 3: Install All Dependencies

```bash
pip install -r requirements.txt
pip install -r backend/llm/requirements.txt
```

### Step 4: Configure Environment (.env)

```bash
copy .env.example .env
```

Edit `.env` and add:
```env
# Required for LLM Chat Feature
OPENAI_API_KEY=your_actual_openai_api_key_here

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Step 5: Train ML Model (First Time Only)

```bash
python -m backend.ml.train_model
```

**Expected Output:**
```
Training model...
Saving model...
✅ Model trained successfully!
Models: resume_classifier_model.pkl
Metrics: models/metrics.json
```

**Time:** ~1-2 minutes

**After this, you're done with setup! From now on, just use 2 terminals.**

---

## 🚀 Running the System (After Setup)

### Use 2 Terminal Windows

#### Terminal 1: Backend API

```bash
cd "e:\resume-classifier - Copy"
.\venv\Scripts\Activate.ps1
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000
```

**Expected Output:**
```
✅ Database awakened and ready!
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

**Keep this terminal running** ✓

#### Terminal 2: Frontend Dev Server

```bash
cd "e:\resume-classifier - Copy\frontend"
npm run dev
```

**Expected Output:**
```
VITE v5.x.x ready in xxx ms

➜  Local:   http://localhost:5173/
```

**Keep this terminal running** ✓

---

## 🌐 Access the Application

- **Frontend App:** http://localhost:5173
- **API Docs:** http://127.0.0.1:8000/docs

---

## 💬 AI Career Assistant Chatbot

### What is it?
A ChatGPT-like interface integrated into your resume classifier. Ask the AI for personalized career advice!

### How to Access
1. **Login/Signup** at http://localhost:5173
2. Look for the **floating chat button** at the bottom-right corner (purple gradient bubble)
3. Click it to open the **AI Career Assistant** page
4. Alternatively, click **"AI Assistant"** in the navigation menu

### Features
✨ **Smart Conversation Memory** - AI remembers previous messages for context
✨ **Persistent Chat History** - Saved locally in browser, survives page refresh
✨ **Suggested Questions** - Quick-start prompts on first visit
✨ **Typing Indicator** - See when AI is thinking
✨ **Structured Responses** - Answers formatted with bullet points
✨ **Clear Chat** - Wipe history and start fresh

### What Can You Ask?
- "How can I improve my ATS score?"
- "What skills should I develop for my target role?"
- "How to optimize my resume for LinkedIn?"
- "Interview preparation tips"
- "How to highlight achievements?"
- Any career development question!

### How It Works
1. **You send a message** → displayed instantly on the right
2. **Typing indicator appears** → AI processes your query with conversation context
3. **AI responds** → formatted message appears on the left
4. **Message saved** → automatically stored for context on next message
5. **All messages persist** → reload the page, history is still there

### Data Privacy
- Chat history stored **locally in your browser** (localStorage)
- NOT sent to OpenAI (only your query + brief context)
- Clear chat button to erase all messages anytime

---

## 🤖 Test LLM Chat Feature

### Method 1: In-App ChatGPT-like Interface (Recommended!)
1. Click the floating chat button (bottom-right, purple gradient)
2. Type your question
3. Chat persists across sessions
4. See suggested questions on first load
5. Press Enter to send, Shift+Enter for new line

### Method 2: Swagger UI (For Testing API)

1. Go to: http://127.0.0.1:8000/docs
2. Find: **POST /api/llm/chat**
3. Click "Try it out"
4. Paste this in the request body (first message):

```json
{
  "user_id": "user123",
  "query": "What skills should I develop to become a Data Scientist?",
  "history": []
}
```

5. Click "Execute"
6. See AI-generated response ✨

**For follow-up messages, include the history:**

```json
{
  "user_id": "user123",
  "query": "How long will it take?",
  "history": [
    {
      "role": "user",
      "content": "What skills should I develop to become a Data Scientist?"
    },
    {
      "role": "assistant",
      "content": "To become a Data Scientist, focus on: Python, Statistics, SQL..."
    }
  ]
}
```

### Method 3: PowerShell

```powershell
$body = @{
    user_id = "user123"
    query = "How can I improve my resume for an AI role?"
    history = @()
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://127.0.0.1:8000/api/llm/chat" `
    -Method POST `
    -ContentType "application/json" `
    -Body $body
```

### Method 4: Python

```python
import requests

# First message
response = requests.post(
    "http://127.0.0.1:8000/api/llm/chat",
    json={
        "user_id": "user123",
        "query": "What's the best way to highlight my skills?",
        "history": []
    }
)

print(response.json())

# Follow-up with history
response = requests.post(
    "http://127.0.0.1:8000/api/llm/chat",
    json={
        "user_id": "user123",
        "query": "Can you give examples?",
        "history": [
            {"role": "user", "content": "What's the best way to highlight my skills?"},
            {"role": "assistant", "content": response.json()["response"]}
        ]
    }
)

print(response.json())
```

### API Response
All three methods return:

```json
{
  "response": "Based on your resume data and ATS score, here are personalized recommendations: ..."
}
```

print(response.json())
```

---

## 📊 Main Features

### Resume Upload & Analysis
1. Login or sign up
2. Upload PDF or DOCX resume
3. View:
   - ATS Score
   - Missing Skills
   - Strengths Identified
   - Predicted Role
   - ML Confidence

### LinkedIn Import
1. Paste LinkedIn profile URL
2. Auto-extracts information
3. Creates resume from scraped data

### AI Career Assistant (LLM Chat)
1. Ask career development questions
2. Get personalized recommendations
3. Based on your resume profile

### Admin Dashboard
- User management
- System analytics
- Feedback review
- Model performance metrics

### Database Admin
View all recorded data:

```bash
python tools/db_admin.py
```

Shows:
- 👥 Users
- 📄 Uploaded Resumes
- 🎯 Predictions
- 💬 User Feedback
- 📋 System Logs
- 📊 Statistics

---

## 🔌 API Endpoints

### Resume Classification
- `POST /api/upload_resume` - Upload and analyze resume
- `GET /api/resume_history` - Get user's upload history
- `DELETE /api/resume/{id}` - Delete uploaded resume

### User Management
- `POST /api/signup` - Create account
- `POST /api/login` - Login
- `PUT /user/profile` - Update profile
- `GET /user/security-info` - Security settings
- `DELETE /user/account` - Delete account

### LinkedIn Import
- `POST /linkedin/upload` - Upload LinkedIn data
- `POST /linkedin/url-import` - Import from LinkedIn URL
- `GET /linkedin/history` - View import history

### LLM Chat (NEW)
- `POST /api/llm/chat` - Get AI career advice

### Admin Only
- `POST /admin/retrain_model` - Retrain ML model
- `GET /admin/stats` - System statistics
- `GET /admin/feedback` - User feedback

View all at: http://127.0.0.1:8000/docs

---

## ⚡ Quick Commands Reference

| Task | Command |
|------|---------|
| **Activate venv** | `.\venv\Scripts\Activate.ps1` |
| **Start Backend** | `uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000` |
| **Start Frontend** | `npm run dev` (from frontend folder) |
| **Train ML Model** (first time) | `python -m backend.ml.train_model` |
| **View Database** | `python tools/db_admin.py` |
| **View API Docs** | http://127.0.0.1:8000/docs |
| **View Frontend** | http://localhost:5173 |

---

## ❌ Troubleshooting

### Backend Issues

**"ModuleNotFoundError"**
```bash
pip install -r requirements.txt
pip install -r backend/llm/requirements.txt
```

**"OPENAI_API_KEY not set"**
1. Check `.env` file has `OPENAI_API_KEY`
2. Ensure no spaces around `=`
3. Restart backend

**"Port 8000 already in use"**
```bash
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8001
```

**Database connection errors**
```bash
python tools/db_admin.py
```

### Frontend Issues

**"npm not found" in PowerShell**

If Node.js is in `D:\Applications\nodejs`:
```powershell
$env:Path = "D:\Applications\nodejs;$env:Path"
npm run dev
```

**"Port 5173 already in use"**
Vite will automatically use next available port. Check terminal output.

**CORS errors in browser**

Add frontend URL to `.env`:
```env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### ML Model Issues

**"Model not found" on resume upload**
```bash
python -m backend.ml.train_model
```

**Check if model exists:**
```bash
dir models/
```

Should show:
- `resume_classifier_model.pkl`
- `metrics.json`

---

## 📁 Project Structure

```
project-root/
├── backend/
│   ├── api/
│   │   └── main.py (Start here)
│   ├── llm/
│   │   ├── routes/chat.py (Chat endpoints)
│   │   ├── services/llm_service.py (OpenAI integration)
│   │   ├── models/chat_model.py (Data models)
│   │   └── utils/prompt_builder.py (Prompt generation)
│   ├── ml/
│   │   ├── train_model.py (Model training)
│   │   └── predict.py (Make predictions)
│   └── database/
│       └── models.py (Database schema)
├── frontend/
│   ├── src/
│   │   ├── pages/ (React pages)
│   │   ├── components/ (React components)
│   │   └── services/ (API calls)
│   └── package.json
├── models/
│   ├── resume_classifier_model.pkl
│   └── metrics.json
├── .env (Create this)
├── requirements.txt
└── RUN.md (This file)
```

---

## 🎯 Common Workflows

### First Time Setup (One Time)
```bash
1. python -m venv venv
2. .\venv\Scripts\Activate.ps1
3. pip install -r requirements.txt
4. pip install -r backend/llm/requirements.txt
5. copy .env.example .env
6. (Edit .env - add OPENAI_API_KEY)
7. python -m backend.ml.train_model
```

### Daily Development (2 Terminals)
```
Terminal 1:
cd "e:\resume-classifier - Copy"
.\venv\Scripts\Activate.ps1
uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000

Terminal 2:
cd "e:\resume-classifier - Copy\frontend"
npm run dev
```

### Development Workflow
1. Start both terminals with commands above
2. Backend auto-reloads when you save Python files
3. Frontend auto-reloads when you save React files
4. Test in browser at http://localhost:5173
5. View API at http://127.0.0.1:8000/docs
6. Press CTRL+C in either terminal to stop

---

## ✅ Verification Checklist

- [ ] Python venv created and activated
- [ ] Dependencies installed (`pip list` shows fastapi, openai, etc.)
- [ ] `.env` file created with OPENAI_API_KEY
- [ ] ML model trained (`models/resume_classifier_model.pkl` exists)
- [ ] Backend running on http://127.0.0.1:8000 ✓
- [ ] Frontend running on http://localhost:5173 ✓
- [ ] Can upload resume and see predictions
- [ ] Can chat with AI assistant
- [ ] Database auto-initialized with data

---

## 📞 Support

**Backend not starting?**
- Check if port 8000 is available
- Verify OPENAI_API_KEY is set
- Run `pip list` to verify dependencies

**Frontend not loading?**
- Check if Node.js is installed
- Clear browser cache
- Check http://localhost:5173 (not http://127.0.0.1:5173)

**LLM Chat not working?**
- Verify OPENAI_API_KEY in `.env`
- Check backend logs for API errors
- Test endpoint at http://127.0.0.1:8000/docs

---

**Happy developing! 🚀**
```

---

### Step 5: Train the ML model (first time only)

From the **project root** (with `venv` active):

```bash
python -m backend.ml.train_model
```

Or, if you have a `train_model.py` in project root:

```bash
python train_model.py
```

**Expected:** Training logs and at the end something like “Best model: …” and a `models` folder with `resume_classifier_model.pkl` and `metrics.json`. This can take 1–2 minutes.

---

### Step 6: Start the backend API

Keep this terminal open. From the **project root**:

```bash
 
```

**Expected output:**

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process ...
INFO:     Started server process ...
INFO:     Waiting for application startup.
✅ Database awakened and ready!
INFO:     Application startup complete.
```

Leave this running. The API is at **http://127.0.0.1:8000**.  
Docs: **http://127.0.0.1:8000/docs**

---

### Step 7: Open a second terminal for the frontend

Open a **new** terminal. Go to the project and into the frontend folder:

```bash
cd "E:\resume-classifier - Copy\frontend"
```

---

### Step 8: Install frontend dependencies

```bash
npm install
```

**Expected:** Progress lines and at the end something like `added XXX packages`. No errors.

**If PowerShell says `npm` is not recognized:**

Node.js may already be installed but not added to your current terminal `Path`. If your Node.js files are in `D:\Applications\nodejs`, run:

```powershell
$env:Path = "D:\Applications\nodejs;$env:Path"
node -v
npm -v
```

Then run:

```bash
npm install
```

You can also run npm directly without changing `Path`:

```powershell
& "D:\Applications\nodejs\npm.cmd" install
```

**Permanent fix in Windows:**

1. Press `Windows` and search for `Environment Variables`.
2. Open `Edit the system environment variables`.
3. In the `System Properties` window, click `Environment Variables...`.
4. Under `User variables` for your account, select `Path` and click `Edit...`.
5. Click `New` and add:

```text
D:\Applications\nodejs
```

6. Click `OK` on all open windows to save.
7. Close and reopen PowerShell or restart VS Code.
8. Verify it worked:

```powershell
node -v
npm -v
```

---

### Step 9: Start the frontend dev server

```bash
npm run dev
```

**Expected output (similar to):**

```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

Leave this running. The app is at **http://localhost:5173** (or the URL Vite prints).

---

### Step 10: Use the app in the browser

1. Open **http://localhost:5173** (or the URL from Step 9).
2. Sign up with name, email, password.
3. Log in, then upload a PDF or DOCX resume.
4. View prediction, skills, and history.

---

## 🔍 DATABASE ADMINISTRATION

**View all database contents:**

```bash
python tools/db_admin.py
```

**What you'll see:**
- 👥 **User Logins:** All registered users, emails, account dates
- 📄 **Resumes:** Uploaded files with text previews
- 🎯 **Predictions:** ML results with confidence scores
- 💬 **Feedback:** User ratings and comments
- 📋 **System Logs:** Application errors and events
- 📊 **Statistics:** Total counts for all tables

**Note:** If you have not signed up, uploaded resumes, or used the app yet, it is normal for this tool to show `0` records for all tables.

**Database awakens automatically** when backend starts - no manual setup needed.

---

## Quick reference

| What        | Command / URL |
|------------|----------------|
| **Quick Start** | `tools/start_app.bat` (one-click) |
| **Database Admin** | `python tools/db_admin.py` |
| Backend    | Terminal 1: `uvicorn backend.api.main:app --reload --host 127.0.0.1 --port 8000` |
| Frontend   | Terminal 2: `cd frontend` then `npm run dev` |
| API docs   | http://127.0.0.1:8000/docs |
| App        | http://localhost:5173 (or the URL Vite shows) |

---

## Troubleshooting

- **“ModuleNotFoundError” when starting backend**  
  Activate the venv (Step 2) and run `pip install -r requirements.txt` again from the project root.

- **CORS errors in browser**  
  Add the frontend URL (e.g. `http://localhost:5173`) to `ALLOWED_ORIGINS` in `.env`.

- **“ML model not found” on upload**  
  Run Step 5 to train the model so `models/resume_classifier_model.pkl` exists.

- **Port 8000 or 5173 already in use**  
  Stop the other program using that port, or use a different port (e.g. `--port 8001` for uvicorn, or Vite’s `--port` option).

- **Database connection issues**  
  Database auto-initializes on startup. If issues persist, run `python tools/db_admin.py` to check connection.

- **`npm` is not recognized**  
  If Node.js is installed in `D:\Applications\nodejs`, run `$env:Path = "D:\Applications\nodejs;$env:Path"` in PowerShell, then check `node -v` and `npm -v`. After that, retry `npm install` or `npm run dev`. For a permanent fix, add `D:\Applications\nodejs` to your Windows `Path` and restart the terminal.
