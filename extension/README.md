# Sakshi (साक्षी) — Mindful Attention Witness

> *"The mind is like a lake; and every thought is like a ripple on its surface. When the mind is calm, we see what we really are."*
> — Inspired by Swami Vivekananda's teachings on concentration (*Raja Yoga*)

**Sakshi** is a Chrome extension (Manifest V3, plain JavaScript, no build step) designed to help you **witness and understand your own attention**.

---

## 🕊️ Philosophy (Non-Negotiable Principles)

- **Pure Awareness, Zero Force:** Sakshi NEVER blocks websites, never closes tabs, never locks your browser, and never uses points, streaks, or gamified punishment.
- **No Shaming:** Wandering attention is not a moral failure; it is simply what the untrained mind does. Sakshi observes with neutral, calm clarity.
- **Gentle Nudge Once:** Sakshi nudges gently only after you have stayed continuously on distracting content for longer than your grace period (default 10 minutes, configurable down to 1 minute for testing). Short or accidental switches never trigger anything.
- **Complete Privacy & Local Sovereignty:** All logs, timelines, and metrics remain exclusively on your device in `chrome.storage.local`. There are no screenshots, no screen captures, no keystroke tracking, and no external tracking servers. If configured with Gemini AI, only the URL and page title of ambiguous pages are sent to categorize them.

---

## 📦 Project Structure

```text
sakshi/
├── manifest.json         # Manifest V3 configuration with least-privilege permissions
├── background.js        # Background service worker with state machine & alarms
├── rules.js             # Static classification rules & domain matcher
├── content-youtube.js   # Reads YouTube watch metadata (title & channel)
├── dashboard-bridge.js  # window.postMessage bridge for the web dashboard
├── popup.html/css/js    # Minimal popup (idle intention setup & active focus state)
├── pause.html/css/js    # Serene pause page (intention, verified quote, return/continue)
├── options.html/css/js  # Settings (Gemini API key, grace period, domain lists, privacy)
├── teachings.json       # Swami Vivekananda teachings schema (unverified placeholders)
├── icons/               # Extension icons (16px, 48px, 128px)
└── README.md            # Documentation & testing checklist
```

---

## 🚀 How to Install (Load Unpacked in Chrome)

1. Open Google Chrome (or any Chromium browser like Brave or Edge).
2. Navigate to `chrome://extensions/`.
3. In the top-right corner, toggle **Developer mode** to **ON**.
4. In the top-left menu, click **Load unpacked**.
5. Select the project directory:
   `/Users/harshityadav/.gemini/antigravity/scratch/sakshi`
6. Sakshi will appear in your installed extensions list.
7. Click the extensions puzzle icon in Chrome's toolbar and **pin Sakshi** for easy access.

---

## ⚡ Quick Hackathon Verification: Demo Mode (10s Nudge)

Sakshi includes a dedicated **Demo Mode** designed for rapid live testing:
- **Grace Period:** 10 seconds (configurable `graceSeconds`, default 10s).
- **One-Shot Alarm:** Sets a precise `nudge-check` alarm at `distractingSince + 10s` (with a repeating 0.5m alarm as backup).
- **Reduced Cooldown:** Reduced from 15 minutes to **60 seconds** so demonstrations can be repeated immediately.
- **Visual Chip & Reset:** Shows a `Demo mode: 10s` chip in the popup, plus a **Reset demo** button in the popup gear menu and options page to clear state on demand.

### Quick Demo Walkthrough (10 Seconds):
1. In the Sakshi popup, click the ⚙️ gear icon and toggle **Demo mode** ON (or enable in **Options**).
2. Notice the yellow `Demo mode: 20s` chip appears in the popup header.
3. Start a focus session (e.g., Intention: `Hackathon Demo`).
4. Open `https://www.instagram.com` or `https://www.youtube.com/shorts`.
5. Observe the service worker console (`chrome://extensions/` ➔ *Inspect views: service worker*):
   `[Sakshi Nudge] Classification is distracting on instagram.com. Scheduled 'nudge-check' alarm for 20s from now.`
6. Stay on Instagram for 20 seconds.
7. The system notification **"Are you distracted?"** fires at 20s. Console logs:
   `[Sakshi Nudge] nudge fired after 20s on instagram.com`
8. Return to work (e.g. GitHub/LeetCode) or click **Reset demo** in the popup gear menu to instantly repeat.

---

## 🧪 Standard Verification Checklist (Normal Mode)

Follow this checklist to verify standard operation (e.g. 1-minute grace):

### Step 1: Set Grace Period & Test System Notifications
1. Right-click the Sakshi icon in the toolbar and select **Options** (or open `chrome-extension://<id>/options.html`).
2. Click the **Test notification** button.
   - A system notification titled **"Are you distracted?"** should appear immediately on your screen.
   - *Note:* If you do not see it, check your macOS / OS Notification Center settings to ensure Google Chrome is allowed to deliver notifications and is not muted by Focus or "Do Not Disturb".
3. Set **Grace Period (Minutes)** to **1** (or **0.5** min).
4. Click **Save Settings**.

### Step 2: Begin an Active Focus Session
1. Click the Sakshi extension icon in the toolbar to open `popup.html`.
2. Enter an Intention: e.g. `Solve algorithms on LeetCode`.
3. Set Duration: `25` min.
4. Set Grace: `1` min (or `0.5` min).
5. Click **Begin Session**.
6. The popup switches to the active focus state with a countdown timer.

### Step 3: Browse to Instagram (Distracting Content)
1. Open a new tab and navigate to `https://www.instagram.com` (or `instagram.com/reels`).
2. Open the Sakshi popup or inspect the service worker console:
   - Notice the status dot is amber: **Distracting content**.
   - In the service worker console, Sakshi logs:
     `[Sakshi Nudge] Classification is distracting. Set distractingSince to <timestamp>`

### Step 4: Stay on Instagram for the Grace Period (1 Minute)
1. Stay on the tab for 1 minute (or 0.5 minutes if set).
2. The active background alarm (`periodInMinutes: 0.5`) will inspect the elapsed time.
3. At the 1-minute mark, Sakshi fires **ONE** persistent system notification:
   - **Title:** `Are you distracted?`
   - **Message:** `You set out to: Solve algorithms on LeetCode` + `What was your intention when you began?`
   - `requireInteraction: true` keeps the notification visible until interacted with.

### Step 5: Troubleshooting via Service Worker Console
If you do not see the notification after 1 minute, open `chrome://extensions/`:
1. Find **Sakshi** and click **Inspect views: service worker** to open DevTools.
2. Filter the Console tab for `[Sakshi Nudge]`. You will see exact diagnostics logged on every alarm tick:
   - `[Sakshi Nudge] nudge fired` ➔ notification was sent to Chrome.
   - `[Sakshi Nudge] nudge skipped: reason (grace not reached: Xs elapsed < Ys required)` ➔ countdown still in progress.
   - `[Sakshi Nudge] nudge skipped: reason (cooldown: Xs remaining)` ➔ 15-minute cooldown active from a previous nudge.
   - `[Sakshi Nudge] nudge skipped: reason (not distracting)` ➔ current tab is not categorized as distracting.
   - `[Sakshi Nudge] nudge skipped: reason (no active session)` ➔ session has not been started.
3. Any notification creation errors (`chrome.runtime.lastError`) are printed with `[Sakshi Notification Error]`.

### Step 6: Test Notification Click & Digital Wellbeing Focus Mode
1. When wandering occurs, a mindful alert or notification appears asking: **"You are getting distracted from your task. Do you want to continue?"**
2. You can choose:
   - **Return to my work:**
     - Closes the distracting tab immediately.
     - **Digital Wellbeing Focus Mode:** Turns off / locks that distracting domain for the remainder of your active focus session (just like phone Digital Wellbeing app pauses).
     - Any subsequent attempt to open that site while the session is active displays the serene Digital Wellbeing paused screen showing the time remaining.
     - Refocuses your productive work tab or dashboard.
   - **Continue anyway:**
     - Allows conscious continuation without shame or penalty, logging the decision calmly in the timeline.

### Step 7: End Session & Compute Metrics
1. Open the popup and click **End Session** (or let the countdown reach zero).
2. The session summary is computed according to the contract:
   - `longestStretchMin`: unbroken productive duration
   - `driftCount`: count of transitions from productive to distracting
   - `avgReturnSec`: average seconds taken to return to productive work
   - `minutes`: `{ productive, neutral, distracting }`
   - `timeline`: array of `{ start, end, category, domain, title }`

---

## 🔌 Contract with the Web Dashboard

The extension injects `dashboard-bridge.js` onto `http://localhost:5173/*` and communicates via standard `window.postMessage`:

| Direction | Message Type | Payload / Details | Response from Sakshi (`source: "sakshi-extension"`) |
| :--- | :--- | :--- | :--- |
| **Page ➔ Ext** | `PING` | `{ source: "sakshi-dashboard", type: "PING" }` | `{ type: "PONG", version: "1.0.0" }` |
| **Page ➔ Ext** | `START_SESSION` | `{ source: "sakshi-dashboard", type: "START_SESSION", payload: { intention, durationMin, graceMinutes, profile } }` | `{ type: "SESSION_STARTED", sessionId: "..." }` |
| **Page ➔ Ext** | `END_SESSION` | `{ source: "sakshi-dashboard", type: "END_SESSION" }` | `{ type: "SESSION_ENDED", summary: { ... } }` |
| **Page ➔ Ext** | `GET_DATA` | `{ source: "sakshi-dashboard", type: "GET_DATA" }` | `{ type: "DATA", sessions: [...], activeSession: { ... } }` |

### Session Summary Schema
```json
{
  "id": "session_1730000000000_abc123",
  "intention": "Refactor state machine",
  "startedAt": 1730000000000,
  "endedAt": 1730001500000,
  "durationMin": 25.0,
  "longestStretchMin": 18.5,
  "driftCount": 2,
  "avgReturnSec": 45,
  "minutes": {
    "productive": 20.2,
    "neutral": 2.1,
    "distracting": 2.7
  },
  "timeline": [
    {
      "start": 1730000000000,
      "end": 1730001110000,
      "category": "productive",
      "domain": "github.com",
      "title": "Pull Requests · my-repo"
    }
  ]
}
```

---

## 📜 Teachings Verification Schema (`teachings.json`)

```json
[
  {
    "id": "teaching-concentration-1",
    "theme": "concentration",
    "text": "TODO: Verify exact quote regarding the power of concentration and gathering the scattered rays of the mind.",
    "source": "TODO: Verify against Raja Yoga, Chapter 1 / Complete Works Vol 1",
    "verified": false
  }
]
```

> **Verification Rule:** If `verified: false`, Sakshi never presents the text as an authentic quote and instead asks a neutral reflective question: *"What was your intention when you began?"*. Entries can be updated to `verified: true` only after verifying against *The Complete Works of Swami Vivekananda* and *Raja Yoga*.

---

## 🛡️ Manifest V3 & Security Practices

- **Service Worker Lifecycle:** Background state is stored in `chrome.storage.local`; `chrome.alarms` manages timers so sleep-wake cycles never corrupt active sessions.
- **Zero Third-Party CDNs:** Built with vanilla HTML/CSS/JavaScript with zero build tools or external script tags.
- **Least-Privilege Host Permissions:** Limited strictly to `http://localhost:5173/*` (dashboard) and `https://generativelanguage.googleapis.com/*` (Gemini API).
