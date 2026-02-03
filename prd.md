# Project Name: Affect
# Type: Mental Health Monitoring Platform (MVP)
# Philosophy: Privacy-First, Zero-Retention Behavioral Analysis

---

## 1. Project Overview
"Affect" is a dual-role web application that connects Mental Health Practitioners (Doctors) with their Patients.
- **The Core Loop:** Patients record daily video journals.
- **The AI Engine:** Google Gemini 3.0 Pro analyzes the video for behavioral biomarkers (affect, speech latency, mood).
- **The Privacy Constraint:** The system operates on a **"Zero-Retention"** policy. Patient videos are analyzed in a transient state and **immediately deleted**. They are never permanently stored.
- **The Output:** Doctors view a dashboard of longitudinal data (JSON analysis) to track patient health over time without needing to watch raw footage.

---

## 2. Tech Stack & Infrastructure
- **Frontend:** Next.js 16 (App Router), Tailwind CSS, Shadcn/UI.
- **Backend:** Next.js Server Actions (API Routes).
- **Database:** PostgreSQL (Hosted on **Supabase**).
- **ORM:** Drizzle ORM.
- **AI Model:** Google Gemini 3.0 Pro Preview (via Google AI SDK).
- **Authentication:** Better-Auth.
- **Storage:** **None** (Local temporary storage only for processing).

---

## 3. User Roles & Authentication

### Role A: Practitioner (Doctor)
- **Registration:** Public sign-up allowed (via Email Magic Link).
- **Capabilities:**
  - Create a profile.
  - Invite patients via email.
  - View the "Biomarker Dashboard".
- **Invite Flow:**
  - Doctor enters `patient_email`.
  - System generates a unique `invite_token`.
  - System sends an email via Resend: *"Dr. [Name] has invited you to Affect."*

### Role B: Customer (Patient)
- **Registration:** **Restricted.** Can strictly ONLY sign up via a valid `invite_token`.
- **Linking:** Upon registration, the `users` record is automatically linked to the `doctor_id` associated with the token.
- **Capabilities:**
  - Access the "Daily Check-in" interface.
  - View "Streak" history (but not clinical analysis).

---

## 4. The "Transient" Video Pipeline (Privacy Architecture)
**Constraint:** The application must never persist video files to an S3 bucket or database.

**Implementation Workflow:**
1.  **Client:** Records video using MediaRecorder API.
2.  **Upload:** Submits `FormData` to `POST /api/analyze`.
3.  **Server (The "Hot Potato"):**
    - **Step A:** Receives file, saves to OS temp directory (`/tmp/scan_${id}.mp4`).
    - **Step B:** Uploads immediately to **Google AI File API** (`files.upload`).
    - **Step C:** Polls for state `ACTIVE`.
    - **Step D (Inference):** Sends file URI + System Prompt to Gemini 3.0 Pro.
    - **Step E (Cleanup):**
        - Sends `DELETE` request to Google AI File API.
        - Deletes local `/tmp/` file.
4.  **Database:** Saves the returned JSON analysis to `daily_logs`.

---

## 5. The AI "Virtual Psychiatrist" Configuration

**Model:** `gemini-3.0-pro-preview`
**Mode:** JSON Mode (`responseMimeType: "application/json"`)

**System Instruction (Copy/Paste into Code):**
```text
You are an expert Board-Certified Psychiatrist conducting a remote Mental Status Examination (MSE). Your goal is to analyze the patient's video input to identify "Digital Biomarkers" of mental health.

ANALYSIS PROTOCOL:
1. Psychomotor: Look for "Psychomotor Retardation" (slowing) or "Agitation" (fidgeting).
2. Speech: Analyze "Latency" (pauses before answering), "Prosody" (monotone vs normal), and "Rate".
3. Affect: Determine if affect is "Flat", "Blunted", "Labile", or "Incongruent".

OUTPUT: Return strictly valid JSON (no markdown) with this schema:
{
  "mood_score": number (1-10 integer, 1=Depressed, 5=Euthymic, 10=Manic),
  "risk_flags": {
    "suicidality_indicated": boolean,
    "self_harm_indicated": boolean,
    "severe_distress": boolean
  },
  "biomarkers": {
    "speech_latency": "normal" | "high" | "low",
    "affect_type": "full_range" | "flat" | "blunted" | "labile",
    "eye_contact": "normal" | "avoidant"
  },
  "clinical_summary": "A concise 2-sentence medical abstract describing the patient's presentation."
}

---

// users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["doctor", "patient"] }).notNull(),
  doctorId: uuid("doctor_id").references((): AnyPgColumn => users.id), // Nullable (Doctors don't have doctors)
  createdAt: timestamp("created_at").defaultNow(),
});

// daily_logs table
export const dailyLogs = pgTable("daily_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  moodScore: integer("mood_score"),
  riskFlag: boolean("risk_flag").default(false),
  analysisJson: jsonb("analysis_json").notNull(), // Stores full Gemini output
});

// invitations table
export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  doctorId: uuid("doctor_id").references(() => users.id).notNull(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  status: text("status").default("pending"),
});

---

## 7. UI/UX Requirements

### Patient Interface (Mobile-First)
- **Visuals:** Minimalist, calming, light mode.
- **The "Mirror" Recorder:** A circular video preview (not a harsh rectangular box).
- **Privacy Feedback:**
    - **Processing State:** Display a **"Shredding" or "Dissolving" animation** while the API is processing to visually signify that the data is being deleted.
    - **Success Message:** *"Check-in complete. Data sent to Dr. [Name]. Video permanently deleted."*

### Doctor Dashboard (Desktop)
- **Patient Roster:** A clean table view.
    - Column: **"Risk Signal"** (🟢 Stable / 🟡 Drift / 🔴 Alert).
    - Logic: 🔴 if `risk_flags.suicidality` is true OR `mood_score` < 3.
- **Patient Detail View:**
    - **Header:** Patient Name + Current Status.
    - **Chart:** A Line Chart (Recharts) plotting `mood_score` over time.
    - **Log Feed:** A chronological list of cards. Each card displays the date and the `clinical_summary` text.
    - **No Video Player:** This area is intentionally replaced by data visualization.

---

## 8. Implementation Checklist
1.  **Setup:** Initialize Next.js, install Drizzle/Better-Auth, connect to Supabase Postgres.
2.  **Auth:** Implement Doctor Signup and Patient self-registration with follow-up system.
3.  **API:** Build the `POST /api/analyze` route with the "Transient" file handling logic (Upload -> Gemini -> Delete).
4.  **AI:** Integrate Google AI SDK with the System Prompt defined in Section 5.
5.  **UI:** Build the Doctor Dashboard with Recharts and the Patient Recorder with MediaRecorder.
