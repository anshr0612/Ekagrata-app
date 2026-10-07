/**
 * Sakshi - Pause Page Logic
 * Displays reflective moment and handles intentional return vs conscious continuation.
 * Features:
 * 1. Swami Vivekananda Praise Quotes when clicking "Return to my work"
 * 2. Swami Vivekananda Disciplined / Wake-Up Quotes when clicking "Continue anyway"
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
  const teachingBox = document.getElementById('teachingBox');

  // Check URL params for Digital Wellbeing paused state
  const params = new URLSearchParams(window.location.search);
  const isWellbeingPaused = params.get('paused') === 'true';
  const pausedDomain = params.get('domain') || '';
  const remainingMin = params.get('remaining') || '';

  // 1. Fetch current active session
  const { activeSession } = await chrome.storage.local.get(['activeSession']);
  const intention = activeSession && activeSession.intention ? activeSession.intention : 'Your focused practice';
  userIntentionEl.textContent = intention;

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
      returnBtn.textContent = '🦁 Return to my work';
    }
    if (continueBtn) {
      continueBtn.textContent = 'Continue anyway';
    }
    if (philosophyNote) {
      philosophyNote.textContent = 'Digital Wellbeing turns off distracting gates so your mind remains undivided.';
    }
  }

  // 2. Fetch teachings.json for praise and discipline collections
  let allTeachings = [];
  try {
    const response = await fetch(chrome.runtime.getURL('teachings.json'));
    allTeachings = await response.json();
  } catch (err) {
    console.error('Failed to load teachings:', err);
  }

  const praiseQuotes = allTeachings.filter(t => t.theme === 'praise');
  const disciplineQuotes = allTeachings.filter(t => t.theme === 'discipline');

  // Initial quote: Pick a concentration/praise reflection
  const initialTeachings = allTeachings.filter(t => t.verified === true);
  if (initialTeachings.length > 0) {
    const item = initialTeachings[Math.floor(Math.random() * initialTeachings.length)];
    teachingTextEl.textContent = `"${item.text}"`;
    teachingSourceEl.textContent = `— ${item.source}`;
    teachingSourceEl.style.display = 'block';
  } else {
    teachingTextEl.textContent = 'The powers of the mind are like the rays of the sun. When they are concentrated, they illumine.';
    teachingSourceEl.textContent = '— Swami Vivekananda · Raja Yoga';
    teachingSourceEl.style.display = 'block';
  }

  // 3. PRAISE FLOW: On clicking "Return to work"
  async function triggerReturnWithPraise() {
    returnBtn.disabled = true;
    continueBtn.disabled = true;

    const praiseItem = praiseQuotes.length > 0
      ? praiseQuotes[Math.floor(Math.random() * praiseQuotes.length)]
      : {
          title: 'Victory of the Mind! 🦁',
          text: 'He is the lion who conquers his own mind; the rest are mere beasts of burden. You have stepped forward as the lion today.',
          source: 'Swami Vivekananda · Raja Yoga'
        };

    if (pageEyebrow) pageEyebrow.textContent = '🏆 ' + (praiseItem.title || 'VICTORY OF THE MIND');
    if (intentionLabel) intentionLabel.textContent = 'Self-Mastery Win (+10 XP)';
    userIntentionEl.textContent = 'Restoring your single focus...';

    if (teachingBox) {
      teachingBox.style.borderLeftColor = '#10B981';
      teachingBox.style.background = 'rgba(16, 185, 129, 0.12)';
    }
    teachingTextEl.textContent = `"${praiseItem.text}"`;
    teachingSourceEl.textContent = `— ${praiseItem.source}`;
    teachingSourceEl.style.color = '#34D399';

    if (philosophyNote) {
      philosophyNote.textContent = '✨ You conquered the impulse. Returning to focus...';
      philosophyNote.style.color = '#6EE7B7';
    }

    returnBtn.textContent = 'Returning as the master...';

    setTimeout(async () => {
      await chrome.runtime.sendMessage({
        type: 'PAUSE_RETURN_TO_WORK',
        domain: pausedDomain || activeSession?.currentTabInfo?.domain,
        turnOff: true
      });
      window.close();
    }, 1800);
  }

  returnBtn.addEventListener('click', triggerReturnWithPraise);

  // 4. DISCIPLINE FLOW: On clicking "Continue anyway" -> Intervene with Vivekananda Wake-up Quote
  continueBtn.addEventListener('click', () => {
    const disciplineItem = disciplineQuotes.length > 0
      ? disciplineQuotes[Math.floor(Math.random() * disciplineQuotes.length)]
      : {
          title: 'Arise, Awake! ⚔️',
          text: 'Arise, awake, and stop not till the goal is reached! What! Are you going to sleep away this precious youth and divine energy in fleeting trifles?',
          source: 'Swami Vivekananda · Katha Upanishad Address',
          callToAction: 'Do not sleepwalk through the digital fog. Turn back right now and honor your vow.'
        };

    if (pageEyebrow) {
      pageEyebrow.textContent = '⚡ ' + (disciplineItem.title || 'ARISE, AWAKE!');
      pageEyebrow.style.color = '#F87171';
    }
    if (intentionLabel) {
      intentionLabel.textContent = 'Swami Vivekananda’s Call to Your Will:';
      intentionLabel.style.color = '#FCA5A5';
    }
    userIntentionEl.textContent = 'A moment before you break your resolve...';

    if (teachingBox) {
      teachingBox.style.borderLeftColor = '#EF4444';
      teachingBox.style.background = 'rgba(239, 68, 68, 0.12)';
    }
    teachingTextEl.textContent = `"${disciplineItem.text}"`;
    teachingSourceEl.textContent = `— ${disciplineItem.source}`;
    teachingSourceEl.style.color = '#F87171';

    if (philosophyNote) {
      philosophyNote.textContent = disciplineItem.callToAction || 'Minutes lost to algorithmic feeds never return. Your time on earth is finite and sacred.';
      philosophyNote.style.color = '#FECACA';
    }

    // Morph the buttons:
    returnBtn.textContent = '🦁 Arise & Return to Work!';
    returnBtn.style.background = 'linear-gradient(135deg, #DC2626, #B45309)';
    returnBtn.style.color = '#FFFFFF';
    returnBtn.onclick = triggerReturnWithPraise;

    continueBtn.textContent = 'Proceed to distraction';
    continueBtn.onclick = async () => {
      continueBtn.disabled = true;
      continueBtn.textContent = 'Continuing...';
      await chrome.runtime.sendMessage({
        type: 'PAUSE_CONTINUE_ANYWAY',
        domain: pausedDomain
      });
      window.close();
    };
  });
});
