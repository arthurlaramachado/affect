# 🧠 Affect - AI-Powered Mental Health Monitoring Platform

<div align="center">

![Google Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql&logoColor=white)

**🏆 Built for the [Google Gemini 3 Hackathon 2026](https://gemini3.devpost.com/) 🏆**

*A privacy-first platform connecting mental health practitioners with their patients through AI-powered behavioral analysis.*

[Features](#-features) • [The Problem](#-the-problem) • [Our Solution](#-our-solution) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [License](#-license)

</div>

---

## 🎯 The Problem

Mental health professionals face a critical challenge: **the lack of continuous interaction with patients between consultations**.

### The Reality

- 🕐 **Time Gap**: Psychiatrists and psychologists typically see patients once every 2-4 weeks
- 👁️ **Blind Spots**: What happens between sessions often goes unnoticed
- 📊 **Bipolar Disorder**: The average time to correctly diagnose **Bipolar Type 1** (the easiest to identify) is approximately **10 years**
- 😔 **Depression**: Often masked or underreported during brief office visits
- 📈 **Growing Crisis**: Mental health issues are becoming increasingly prevalent in our society

### Why This Matters

Between appointments, patients experience fluctuations in mood, behavior, and mental state that practitioners never see. Critical warning signs can be missed, diagnoses delayed, and treatment adjustments come too late.

---

## 💡 Our Solution

**Affect** bridges the gap between consultations by providing continuous, AI-powered monitoring through daily video check-ins.

### How It Works

1. 📹 **Daily Video Journals**: Patients record brief video check-ins from the comfort of their homes
2. 🤖 **AI Analysis**: Google Gemini 3.0 Pro analyzes videos for behavioral biomarkers:
   - Speech patterns (latency, rate, tone)
   - Affect presentation (flat, blunted, labile)
   - Psychomotor indicators
   - Eye contact and engagement
   - Risk flags (suicidality, self-harm, severe distress)
3. 🔒 **Zero-Retention Privacy**: Videos are analyzed transiently and **immediately deleted** - never stored
4. 📊 **Longitudinal Insights**: Practitioners receive data-driven dashboards tracking patient progress over time

### Why Gemini?

Google's Gemini has proven to be exceptionally capable at **multimodal understanding** - interpreting video, audio, and text simultaneously. This makes it the ideal tool for:

- 🎬 Analyzing facial expressions and body language
- 🗣️ Evaluating speech patterns and emotional tone
- 📝 Generating clinical summaries
- ⚠️ Identifying risk factors in real-time

---

## ✨ Features

### For Patients 👤

- 🎥 Simple, calming video check-in interface
- 🔥 Streak tracking to encourage daily engagement
- 🔔 Notification system for follow-up requests
- 🛡️ Complete privacy - videos are never stored
- 📱 Mobile-first, accessible design

### For Practitioners 👨‍⚕️

- 📋 Patient roster with risk status indicators (🟢 Stable / 🟡 Drift / 🔴 Alert)
- 📈 Mood score trends over time (interactive charts)
- 🧠 Comprehensive Mental Status Examination (MSE) data
- 📄 PDF report generation for clinical records
- 🔍 AI-generated insights and pattern detection
- 🤝 Easy patient follow-up management

### Privacy Architecture 🔐

- **Transient Processing**: Videos uploaded → analyzed → deleted within seconds
- **No Cloud Storage**: Zero video retention policy
- **Data Minimization**: Only structured analysis data is stored
- **Patient Control**: Full transparency about what data is collected

---

## 🚀 Installation

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- PostgreSQL database (we recommend [Supabase](https://supabase.com))
- Google AI API Key ([Get one here](https://makersuite.google.com/app/apikey))

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/affect.git
cd affect
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Environment Setup

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Configure your environment variables:

```env
# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Authentication
BETTER_AUTH_SECRET=your-super-secret-key-at-least-32-characters
BETTER_AUTH_URL=http://localhost:3000

# Google AI (Gemini)
GOOGLE_API_KEY=your-google-api-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Step 4: Database Setup

Run database migrations:

```bash
pnpm db:push
```

### Step 5: Start Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser 🎉

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 16 (App Router), React, Tailwind CSS, Shadcn/UI |
| **Backend** | Next.js API Routes, Server Actions |
| **Database** | PostgreSQL (Supabase) |
| **ORM** | Drizzle ORM |
| **AI/ML** | Google Gemini 3.0 Pro |
| **Authentication** | Better-Auth |
| **Testing** | Vitest, Testing Library |
| **Language** | TypeScript |

---

## 📁 Project Structure

```
affect/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── api/               # API routes
│   │   ├── doctor/            # Doctor dashboard
│   │   └── patient/           # Patient dashboard
│   ├── components/            # React components
│   │   ├── doctor/           # Doctor-specific components
│   │   ├── patient/          # Patient-specific components
│   │   └── ui/               # Shadcn/UI components
│   ├── lib/
│   │   ├── auth/             # Authentication logic
│   │   ├── db/               # Database schema & repositories
│   │   └── services/         # Business logic services
│   └── types/                # TypeScript type definitions
├── drizzle/                  # Database migrations
└── public/                   # Static assets
```

---

## 🧪 Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

---

## 📜 License

### Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)

This project is licensed under the **CC BY-NC 4.0** license.

#### You are free to:

- ✅ **View** — Access and read all source code
- ✅ **Download** — Clone and fork this repository
- ✅ **Share** — Copy and redistribute the material in any medium or format
- ✅ **Adapt** — Remix, transform, and build upon the material

#### Under the following terms:

- 📛 **Attribution** — You must give appropriate credit, provide a link to the license, and indicate if changes were made
- 🚫 **NonCommercial** — You may **NOT** use the material for commercial purposes or resell this system

#### Full License Text

See the [LICENSE](LICENSE) file for the complete license text, or visit:
https://creativecommons.org/licenses/by-nc/4.0/

---

## 👥 Authors

Built with ❤️ for the **Google Gemini 3 Hackathon 2026**

---

## 🙏 Acknowledgments

- 🌟 [Google Gemini](https://deepmind.google/technologies/gemini/) for the incredible AI capabilities
- 🚀 [Vercel](https://vercel.com) for Next.js and hosting
- 💾 [Supabase](https://supabase.com) for the database platform
- 🎨 [Shadcn/UI](https://ui.shadcn.com) for the beautiful component library

---

<div align="center">

**🧠 Affect** — *Bridging the gap in mental healthcare, one check-in at a time.*

[⬆ Back to top](#-affect---ai-powered-mental-health-monitoring-platform)

</div>
