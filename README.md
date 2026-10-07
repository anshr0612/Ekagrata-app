# Ekāgratā (एकाग्रता) — Mindful Attention & Focus System
  Open http://localhost:5173 in your browser.
> *"Take up one idea. Make that one idea your life — think of it, dream of it, live on that idea."*  
> — **Swami Vivekananda** (*Raja Yoga*)

Ekāgratā is a human-crafted digital wellbeing and concentration architecture that helps individuals cultivate unbroken focus, witness the restless mind without guilt, and regain attention quickly through ancient Vedic mindfulness principles combined with modern cognitive science.

---

## 🌟 Hackathon Highlights & Core Features

### 1. 📊 Interactive Weekly Recovery Time (Return Latency) Analytics
- **Dual Visual Perspectives**: Daily Recovery Time in seconds paired with a Productivity vs. Non-Productivity (%) stacked breakdown in muted earth tones.
- **Dual-Axis Correlation View**: Directly shows how lowering recovery latency drives up unbroken flow ratio.
- **Day-Level Drill-Down**: Segmented session timeline strips, timestamped drift tables, and accessible table fallback with keyboard shortcuts (`←`, `→`, `Enter`, `Esc`).
- **One-Click CSV Export**: Download a full audit report of sessions and recovery latency for research.

### 2. 🛡️ Digital Wellbeing Focus Mode & Mindful Nudges
- **Persistent Distraction Alert**: Centered top-screen alert when wandering onto paused sites (e.g., YouTube Shorts, Instagram).
- **Hard Tab Interruption**: Choosing **"Return to work"** switches the tab and actively locks out the distracting site for the remainder of the session.
- **60-Second Neuro-Reset**: Expandable guidance featuring the neuroscience-backed **Physiological Double-Exhale** and the **Witness Attitude (साक्षी भाव)** to dissipate craving loops instantly.

### 3. 🎧 Procedural Web Audio Soundscapes (Zero-Dependency & Offline)
- Synthesizes infinite acoustic soundscapes in real-time in the browser via the **Web Audio API**:
  - **10Hz Binaural Alpha Waves**: Stereophonic sine frequencies stimulating relaxed, single-pointed attention.
  - **Brown Noise & Gentle Rain**: Soft acoustic masking to shield from ambient auditory disruptions.
  - **136.1Hz Tibetan OM Drone**: Harmonic overtone meditation resonance.
  - **528Hz Solfeggio Tibetan Chime**: For session entry, breath transitions, and endings.

### 4. 🌬️ Interactive Prāṇāyāma Breath Trainer (4-2-4-2)
- Visual animated orb guiding smooth **Inhale (4s) → Hold (2s) → Exhale (4s) → Rest (2s)** cycles with auditory bell chimes to quiet autonomic nervous system chatter before deep work.

### 5. 🎁 Goodies Shelf & Concentration Milestones
- Earn focus points exclusively from deep unbroken stretches and speed of gentle recovery (no vanity metrics).
- Unlock milestone achievements (*Sankalpa Initiate*, *The Steadfast Mind*, *Swift Recovery Master*, *Deep Dhyana Flow*).

---

## 📁 Repository Structure

```
Ekagrata-app/
├── dashboard/               # Vite + React Modern Web Dashboard
│   ├── src/
│   │   ├── components/      # RecoveryTimeChart, SoundscapeControl, PranayamaGuide, etc.
│   │   ├── pages/           # Home, LiveSession, Samiksha, Journey, Methods, Rewards...
│   │   ├── services/        # Web Audio Engine, Gemini AI Counsel, Extension Bridge
│   │   └── i18n/            # Full English & Hindi (Devanagari) localization
│   └── package.json
│
└── extension/               # Chrome MV3 Extension (Companion Sensor)
    ├── background.js        # Distraction alarms, tab monitoring, rules engine
    ├── content-banner.js    # Mindful distraction alert & digital wellbeing blocker
    ├── dashboard-bridge.js  # postMessage bridge between dashboard & extension
    └── manifest.json
```

---

## 🚀 Getting Started

### 1. Run the Dashboard
```bash
cd dashboard
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 2. Install the Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right toggle).
3. Click **Load unpacked** and select the `extension/` directory.
4. Pin the **Ekāgratā** extension to your toolbar.
