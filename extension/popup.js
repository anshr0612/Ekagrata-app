/**
 * Sakshi - Popup Controller
 * Manages minimal idle and active session views.
 */

let countdownInterval = null;
let currentDashboardUrl = 'http://localhost:5173/';

document.addEventListener('DOMContentLoaded', async () => {
  const idleView = document.getElementById('idleView');
  const activeView = document.getElementById('activeView');
  const sessionForm = document.getElementById('sessionForm');
  const intentionInput = document.getElementById('intentionInput');
  const durationInput = document.getElementById('durationInput');
  const graceInput = document.getElementById('graceInput');
  const activeIntentionText = document.getElementById('activeIntentionText');
  const timerDisplay = document.getElementById('timerDisplay');
  const categoryDot = document.getElementById('categoryDot');
  const categoryLabel = document.getElementById('categoryLabel');
  const endBtn = document.getElementById('endBtn');
  const openDashboardLink = document.getElementById('openDashboardLink');

  // Gear menu & Demo elements
  const gearBtn = document.getElementById('gearBtn');
  const gearMenu = document.getElementById('gearMenu');
  const demoChip = document.getElementById('demoChip');
  const demoChipText = document.getElementById('demoChipText');
  const popupDemoModeCheckbox = document.getElementById('popupDemoModeCheckbox');
  const popupFocusModeCheckbox = document.getElementById('popupFocusModeCheckbox');
  const popupGraceSecondsInput = document.getElementById('popupGraceSecondsInput');
  const popupResetDemoBtn = document.getElementById('popupResetDemoBtn');

  // Helper to sync Demo chip and controls with settings
  function updateDemoUI(currSettings) {
    const isDemo = Boolean(currSettings?.demoMode);
    const sec = Number(currSettings?.graceSeconds) || 10;

    if (isDemo) {
      demoChip.classList.remove('hidden');
      demoChipText.textContent = `Demo mode: ${sec}s`;
    } else {
      demoChip.classList.add('hidden');
    }

    if (popupDemoModeCheckbox) {
      popupDemoModeCheckbox.checked = isDemo;
    }
    if (popupFocusModeCheckbox) {
      popupFocusModeCheckbox.checked = currSettings?.focusMode !== false;
    }
    if (popupGraceSecondsInput) {
      popupGraceSecondsInput.value = sec;
    }
  }

  // Load initial settings and active session
  const { activeSession, settings } = await chrome.storage.local.get(['activeSession', 'settings']);
  
  if (settings) {
    updateDemoUI(settings);
    if (settings.graceMinutes && graceInput) {
      graceInput.value = settings.graceMinutes;
    }
    if (settings.dashboardUrl) {
      currentDashboardUrl = settings.dashboardUrl;
    }
  }

  // Toggle Gear Menu
  gearBtn.addEventListener('click', () => {
    gearMenu.classList.toggle('hidden');
  });

  // Toggle Demo Mode in Popup
  popupDemoModeCheckbox.addEventListener('change', async () => {
    const { settings: s = {} } = await chrome.storage.local.get(['settings']);
    const updated = {
      ...s,
      demoMode: popupDemoModeCheckbox.checked,
      graceSeconds: Math.max(5, parseInt(popupGraceSecondsInput.value, 10) || 10)
    };
    await chrome.storage.local.set({ settings: updated });
    updateDemoUI(updated);
  });

  // Toggle Focus Mode in Popup
  if (popupFocusModeCheckbox) {
    popupFocusModeCheckbox.addEventListener('change', async () => {
      const { settings: s = {} } = await chrome.storage.local.get(['settings']);
      const updated = {
        ...s,
        focusMode: popupFocusModeCheckbox.checked
      };
      await chrome.storage.local.set({ settings: updated });
      updateDemoUI(updated);
    });
  }

  // Change Demo Grace Seconds in Popup
  popupGraceSecondsInput.addEventListener('change', async () => {
    const sec = Math.max(5, parseInt(popupGraceSecondsInput.value, 10) || 10);
    popupGraceSecondsInput.value = sec;
    const { settings: s = {} } = await chrome.storage.local.get(['settings']);
    const updated = {
      ...s,
      graceSeconds: sec
    };
    await chrome.storage.local.set({ settings: updated });
    updateDemoUI(updated);
  });

  // Reset Demo button
  popupResetDemoBtn.addEventListener('click', async () => {
    popupResetDemoBtn.disabled = true;
    popupResetDemoBtn.textContent = 'Resetting...';
    await chrome.runtime.sendMessage({ type: 'RESET_DEMO' });
    renderView(null);
    popupResetDemoBtn.disabled = false;
    popupResetDemoBtn.textContent = 'Reset demo';
    gearMenu.classList.add('hidden');
  });

  // Dashboard link handler
  openDashboardLink.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: currentDashboardUrl });
  });

  // Render current state
  renderView(activeSession);

  // Form submit: Start session
  sessionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const intention = intentionInput.value.trim();
    const durationMin = parseInt(durationInput.value, 10) || 25;
    const graceMinutes = Math.max(0.5, parseFloat(graceInput.value) || 10);

    const response = await chrome.runtime.sendMessage({
      type: 'START_SESSION',
      payload: {
        intention,
        durationMin,
        graceMinutes
      }
    });

    if (response && response.success) {
      const state = await chrome.storage.local.get(['activeSession']);
      renderView(state.activeSession);
    }
  });

  // End session button
  endBtn.addEventListener('click', async () => {
    endBtn.disabled = true;
    endBtn.textContent = 'Ending...';
    await chrome.runtime.sendMessage({ type: 'END_SESSION' });
    endBtn.disabled = false;
    endBtn.textContent = 'End Session';
    renderView(null);
  });

  // Watch for storage changes while popup is open
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.activeSession) {
        renderView(changes.activeSession.newValue);
      }
      if (changes.settings) {
        updateDemoUI(changes.settings.newValue);
        if (changes.settings.newValue?.dashboardUrl) {
          currentDashboardUrl = changes.settings.newValue.dashboardUrl;
        }
      }
    }
  });

  function renderView(session) {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }

    if (!session) {
      // Idle state
      idleView.classList.remove('hidden');
      activeView.classList.add('hidden');
      intentionInput.value = '';
    } else {
      // Active state
      idleView.classList.add('hidden');
      activeView.classList.remove('hidden');

      activeIntentionText.textContent = session.intention || 'Focused Work';
      updateCategoryBadge(session.currentTabInfo?.category);

      // Countdown loop
      const updateTimer = () => {
        const remainingMs = Math.max(0, session.scheduledEndAt - Date.now());
        const totalSec = Math.floor(remainingMs / 1000);
        const mins = Math.floor(totalSec / 60);
        const secs = totalSec % 60;
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (remainingMs <= 0) {
          timerDisplay.textContent = '00:00';
          clearInterval(countdownInterval);
        }
      };

      updateTimer();
      countdownInterval = setInterval(updateTimer, 1000);
    }
  }

  function updateCategoryBadge(category) {
    categoryDot.className = 'status-dot';
    if (!category) {
      categoryDot.classList.add('neutral');
      categoryLabel.textContent = 'Observing focus...';
      return;
    }

    categoryDot.classList.add(category);
    if (category === 'productive') {
      categoryLabel.textContent = 'Productive focus';
    } else if (category === 'distracting') {
      categoryLabel.textContent = 'Distracting content';
    } else {
      categoryLabel.textContent = 'Neutral / Reference';
    }
  }
});
