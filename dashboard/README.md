# Sakshi Dashboard (साक्षी)

> *"The powers of the mind are like the rays of the sun. When they are concentrated, they illumine."*  
> — Swami Vivekananda (*Raja Yoga*)

**Sakshi Dashboard** is a calm, contemplative web application designed as the companion reflection and setup interface for the Sakshi Chrome attention-tracking extension.

---

## 🧘‍♂️ Core Philosophy & Design Rationale

Unlike conventional productivity tools that deploy gamified leaderboards, punitive red warnings, guilt badges, or rigid website blockers, Sakshi is grounded in the psychological and spiritual insights of **Swami Vivekananda**:

1. **Concentration as the Essence of Education**  
   *"To me the very essence of education is concentration of mind, not the collecting of facts."*  
   The application measures and celebrates **Longest Unbroken Stretch** rather than superficial counts of visited websites. Mastery is the ability to sustain one uninterrupted flow of thought.

2. **The Mind as a Restless Monkey to be Witnessed and Trained**  
   Vivekananda likened the undisciplined mind to a monkey drunk on wine, stung by a scorpion. You do not tame a monkey by punishing it in anger; you sit quietly, observe its movements, and patiently call it back. Sakshi tracks **Return Time** (how quickly and gently the user returns after attention wanders) and celebrates fast returns instead of counting "distractions".

3. **Neutrality in Lapses ("Begin Again")**  
   Weak days and wandering thoughts are not met with shame or red warning alarms. Lapses are simply acknowledged neutrally with the invitation to **"Begin again."**

4. **Strength from Within & Gradual Practice (Abhyasa)**  
   Growth is reflected across the classical stages of yogic mental culture:
   - **Pratyahara**: Reducing external sensory chatter and closing distracting gates.
   - **Dharana**: Binding the mind to a single chosen intention (*Sankalpa*).
   - **Dhyana**: Effortless, continuous flow of unbroken attention.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+ or v20+)
- npm

### Installation & Running Locally
```bash
# Navigate to the project directory
cd /Users/harshityadav/.gemini/antigravity/scratch/sakshi-dashboard

# Install dependencies
npm install

# Start development server on port 5173
npm run dev
```

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🖥️ Screen Overview

1. **Onboarding (Saved locally)**:
   - Captures name, profession (Student, Developer, Designer, Teacher, Other), and micro-niches / hobbies via lightweight chip selectors.
2. **Home / Sankalpa**:
   - Single intention input (`"What is your one intention for this session?"`), duration selection (15/25/45/60 min), and an adjustable grace period slider (default 10 min) with the reminder: *"short slips never disturb you"*.
   - Automatically detects companion Chrome extension or runs cleanly standalone.
3. **Live Session (Minimal & Calm)**:
   - Single breathing circle, calm timer countdown, intention reminder, and serene status. No cluttered real-time charts.
4. **Samiksha (Session Reflection)**:
   - Metrics: Longest unbroken stretch & average return time.
   - Soft colored proportional timeline (Productive, Neutral, Distracting in calm pastel tones).
   - Domain list visited.
   - Gemini AI reflection (clearly labeled as AI-generated) asking one non-judgmental reflective question.
5. **Journey (Weekly Growth View)**:
   - Interactive Recharts trend lines for *Longest Stretch* and *Average Return Time*.
   - Positive, non-judgmental "This Week vs. Last Week" comparison.
   - Personalized Gemini AI weekly growth tip.
   - Progression indicator through *Pratyahara*, *Dharana*, and *Dhyana*.
6. **Teachings**:
   - Curated list of verified quotes from Swami Vivekananda (*Raja Yoga*, *Karma Yoga*, *Epistles*) with explicit citations.
   - Clearly differentiated from AI reflections.
7. **Privacy & Data Sovereignty**:
   - Plain-English explanation of local-first storage.
   - Transparent disclosure that only active session URLs are classified by Gemini.
   - One-click "Delete All My Data" button.
8. **Settings**:
   - Enter your personal Google Gemini API key (stored only in browser `localStorage`).
   - English / Hindi language toggle.
   - Light / Dark calm color scheme toggle.
   - **14-Day Realistic Demo Data toggle** (includes progressive improvement with a natural weaker day for hackathon presentations).

---

## 🔌 Extension Bridge Specification (`window.postMessage`)

Sakshi Dashboard communicates seamlessly with the companion Chrome extension using structured postMessage protocols:

- **Outgoing Message Format**:
  ```json
  { "source": "sakshi-dashboard", "type": "...", ... }
  ```
- **Incoming Extension Format**:
  ```json
  { "source": "sakshi-extension", "type": "...", ... }
  ```

| Event Type | Direction | Payload / Response |
| :--- | :--- | :--- |
| `PING` | Dashboard ➔ Extension | Wait for `{ type: "PONG", version: "1.0.0" }` |
| `START_SESSION` | Dashboard ➔ Extension | `{ payload: { intention, durationMin, graceMinutes, profile } }` ➔ Expects `{ type: "SESSION_STARTED", sessionId }` |
| `END_SESSION` | Dashboard ➔ Extension | `{ type: "END_SESSION" }` ➔ Expects `{ type: "SESSION_ENDED", summary }` |
| `GET_DATA` | Dashboard ➔ Extension | `{ type: "GET_DATA" }` ➔ Expects `{ type: "DATA", sessions, activeSession }` |

Wrapped in `/src/services/extensionBridge.js` with promise timeouts and local fallbacks.

---

## 🛠️ Tech Stack
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS v4 (with warm stone neutrals & amber accents)
- **Charts**: Recharts (`LineChart`, `ResponsiveContainer`)
- **Routing**: React Router v6
- **AI**: Google Gemini API (`gemini-2.0-flash`) with honest, rule-based local fallbacks
- **State**: React Context API + Browser `localStorage`
- **i18n**: English & Hindi
