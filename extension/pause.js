/**
 * Sakshi - Pause Page Logic
 * Displays reflective moment and handles intentional return vs conscious continuation.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const userIntentionEl = document.getElementById('userIntention');
  const teachingTextEl = document.getElementById('teachingText');
  const teachingSourceEl = document.getElementById('teachingSource');
  const returnBtn = document.getElementById('returnBtn');
  const continueBtn = document.getElementById('continueBtn');
  const pageEyebrow = document.getElementById('pageEyebrow');
  const intentionLabel = document.getElementById('intentionLabel');
  const wellbeingBanner = document.getElementById('wellbeingBanner');
  const wellbeingMessage = document.getElementById('wellbeingMessage');
  const wellbeingTimer = document.getElementById('wellbeingTimer');
  const philosophyNote = document.getElementById('philosophyNote');

  // Check URL params for Digital Wellbeing paused state
  const params = new URLSearchParams(window.location.search);
  const isWellbeingPaused = params.get('paused') === 'true';
  const pausedDomain = params.get('domain') || '';
  const remainingMin = params.get('remaining') || '';

  // 1. Fetch current active session
  const { activeSession } = await chrome.storage.local.get(['activeSession']);
  if (activeSession && activeSession.intention) {
    userIntentionEl.textContent = activeSession.intention;
  } else {
    userIntentionEl.textContent = 'Your focused practice';
  }

  if (isWellbeingPaused) {
    if (pageEyebrow) pageEyebrow.textContent = 'DIGITAL WELLBEING · FOCUS MODE';
    if (intentionLabel) intentionLabel.textContent = 'Your single focus:';
    if (wellbeingBanner) {
      wellbeingBanner.style.display = 'block';
      if (wellbeingMessage) {
        wellbeingMessage.innerHTML = `<strong>${pausedDomain || 'This site'}</strong> is turned off until your focus session finishes.`;
      }
      if (wellbeingTimer) {
        const minText = remainingMin ? `${remainingMin} mins remaining` : 'Until session completion';
        wellbeingTimer.textContent = `⏳ ${minText}`;
      }
    }
    if (returnBtn) {
      returnBtn.textContent = 'Return to my work';
    }
    if (continueBtn) {
      continueBtn.textContent = 'Unpause site for 5 min';
    }
    if (philosophyNote) {
      philosophyNote.textContent = 'Digital Wellbeing turns off distracting gates so your mind remains undivided.';
    }
  }

  // 2. Fetch teachings.json and check verification strictly
  try {
    const response = await fetch(chrome.runtime.getURL('teachings.json'));
    const teachings = await response.json();
    const verifiedTeachings = teachings.filter(t => t.verified === true);

    if (verifiedTeachings.length > 0) {
      // Pick random verified teaching
      const item = verifiedTeachings[Math.floor(Math.random() * verifiedTeachings.length)];
      teachingTextEl.textContent = `"${item.text}"`;
      teachingSourceEl.textContent = `— ${item.source}`;
      teachingSourceEl.style.display = 'block';
    } else {
      // Philosophy rule: if none verified, display neutral reflective question without inventing a quote
      teachingTextEl.textContent = 'What was your intention when you began? Take a slow breath and witness where your attention has rested.';
      teachingSourceEl.style.display = 'none';
    }
  } catch (err) {
    teachingTextEl.textContent = 'What was your intention when you began? Take a moment to witness your attention.';
    teachingSourceEl.style.display = 'none';
  }

  // 3. Button: Return to my work (turns off distracting tab and focuses work)
  returnBtn.addEventListener('click', async () => {
    returnBtn.disabled = true;
    returnBtn.textContent = 'Returning...';

    await chrome.runtime.sendMessage({
      type: 'PAUSE_RETURN_TO_WORK',
      domain: pausedDomain || activeSession?.currentTabInfo?.domain,
      turnOff: true
    });
    window.close();
  });

  // 4. Button: Continue anyway (logged with no shaming or points penalty)
  continueBtn.addEventListener('click', async () => {
    continueBtn.disabled = true;
    continueBtn.textContent = 'Continuing...';

    await chrome.runtime.sendMessage({
      type: 'PAUSE_CONTINUE_ANYWAY',
      domain: pausedDomain
    });
    window.close();
  });
});
