# ReflectAI - Intelligent Personal Journaling & Multi-Turn Reflection Assistant

ReflectAI is a production-ready, user-authenticated reflection and journaling web application built on **Google Cloud Run**, **Google Cloud Firestore**, **Firebase Authentication**, and the **Gemini 3.6 Flash API**.

---

## 🌟 Key Features

1. **Secure Federated Authentication**:
   - Google Sign-In via Firebase Authentication without managing or storing plaintext credentials.
2. **Private Multi-Turn Reflection**:
   - Write daily journal entries, reflections, and emotional check-ins.
   - Deep conversational dialogue, executive summaries, and creative brainstorming with the Gemini 3.6 Flash API.
3. **Owner-Bound Cloud Firestore Isolation**:
   - All reflections and multi-turn turns are saved to Firestore in `/users/{userId}/entries/{entryId}`.
   - Enforced by server-side Firebase Security Rules so no user can access another user's private data.
4. **Resilient AI Fallback Ladder**:
   - Seamless fallback architecture (`gemini-3.6-flash` &rarr; `gemini-3.1-flash-lite` &rarr; `gemini-flash-latest` &rarr; `gemini-3.7-flash`) with error status recovery (`503`, `429`, `500`).
5. **Zero Client-Side Secret Leakage**:
   - All Gemini API calls are strictly routed through backend `/api/gemini/reflect` endpoints.
  
---

## Unique Features (Beyond the Base Template)

- **Mood Trends Chart**: A visual breakdown on the entries view showing the 
  distribution of moods (Reflective, Calm, Grateful, Optimistic, Energized) 
  across all journal entries, with live percentages and click-to-filter 
  functionality — clicking a mood filters the entry list to just that mood.

- **Custom Purple UI Theme**: A calming, custom color palette 
  (`#50207A`, `#D6B9FC`, `#838CE5`) designed to give the app a distinct, 
  sanctuary-like feel rather than a generic default template look.
  
---

## 🏗️ Architecture & Security Threat Model

| Zone | Threat | Countermeasure |
| :--- | :--- | :--- |
| **Input Surfaces** | Malicious injection in prompt/journal inputs | Strict schema validation, type guarding, null-safe destructuring |
| **Planning & Reasoning** | System instruction bypass via reflection text | Strict role separation, treating journal text strictly as passive data |
| **Tool/API Execution** | Gemini API rate limiting or temporary outage | Automated resilient model fallback ladder |
| **Memory & State** | Cross-user data leakage in Firestore | Owner-bound security rules (`request.auth.uid == userId`) |
| **Inter-System / API Keys**| Leaking `GEMINI_API_KEY` to browser | Backend `/api/gemini/*` proxy routes in Express server |

---

## 🔒 Firestore Security Rules

Deploy the following security rules to ensure user data isolation:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /{allSubcollections=**} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

---

## 🚀 Deployment & Google Cloud Run Setup

### 1. Prerequisites
- [Google Cloud SDK (`gcloud`)](https://cloud.google.com/sdk/docs/install) installed and initialized.
- Enabled Cloud APIs:
  ```bash
  gcloud services enable run.googleapis.com \
    secretmanager.googleapis.com \
    firestore.googleapis.com \
    aiplatform.googleapis.com
  ```

### 2. Secret Manager Configuration

Securely store the `GEMINI_API_KEY` in Google Cloud Secret Manager:

```bash
# 1. Create and populate the secret
gcloud secrets create GEMINI_API_KEY --replication-policy="automatic"
echo -n "YOUR_GEMINI_API_KEY" | gcloud secrets versions add GEMINI_API_KEY --data-file=-

# 2. Grant the default Cloud Run service account access to read the secret
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding GEMINI_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 3. Deploy to Google Cloud Run

Deploy the container to Cloud Run with Secret Manager environment variable binding:

```bash
gcloud run deploy reflectai-app \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-secrets GEMINI_API_KEY=GEMINI_API_KEY:latest
```

### 4. Challenge Verification & Campaign Labeling

Apply the mandatory verification label to the deployed Cloud Run service:

```bash
gcloud run services update reflectai-app \
  --update-labels=dev-tutorial=cloud-run-ai-challenge \
  --region=us-central1
```

---

## 🧪 Functional Walkthrough & Test Guide

1. **Authentication Flow**:
   - Open the web application landing page.
   - Click **"Continue with Google"** (or **"Continue as Guest"** for quick sandbox mode).
   - Verify the dashboard loads with user profile and Firestore connection badge.
2. **Journaling & Reflection**:
   - Enter a reflection title and content in the editor canvas.
   - Select a mood tag (e.g. "Grateful", "Creative").
   - Click **"Deep Reflection"** or **"Summarize Takeaways"**.
   - Verify that Gemini returns structured, markdown-formatted insights and the save pill updates to **"Saved to Firestore"**.
3. **Multi-Turn Conversational Interaction**:
   - In the follow-up bar, type a follow-up question (e.g., "What are 3 small habits I can start tomorrow based on this?").
   - Click the send button and verify Gemini responds in context.
4. **History & Isolation**:
   - Create a second reflection entry using the **"New"** button in the sidebar.
   - Verify both entries appear in the sidebar with word counts, turn counts, and mood badges.
   - Use the search bar to filter entries by keyword or mood.
   - Sign out and sign in with a different user account; verify that entries from the first account are completely inaccessible.
