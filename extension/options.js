/**
 * Sakshi - Options Page Logic
 * Manages user preferences, domain rules, API key validation, and data purging.
 */

document.addEventListener('DOMContentLoaded', async () => {
  const geminiApiKeyInput = document.getElementById('geminiApiKey');
  const toggleKeyVisibilityBtn = document.getElementById('toggleKeyVisibility');
  const testKeyBtn = document.getElementById('testKeyBtn');
  const testKeyResult = document.getElementById('testKeyResult');
  const graceMinutesInput = document.getElementById('graceMinutes');
  const testNotificationBtn = document.getElementById('testNotificationBtn');
  const testNotificationResult = document.getElementById('testNotificationResult');
  const productiveDomainsTextarea = document.getElementById('productiveDomains');
  const distractingDomainsTextarea = document.getElementById('distractingDomains');
  const resetProductiveBtn = document.getElementById('resetProductiveBtn');
  const resetDistractingBtn = document.getElementById('resetDistractingBtn');
  const dashboardUrlInput = document.getElementById('dashboardUrl');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');
  const clearDataBtn = document.getElementById('clearDataBtn');
  const demoModeCheckbox = document.getElementById('demoModeCheckbox');
  const focusModeCheckbox = document.getElementById('focusModeCheckbox');
  const graceSecondsInput = document.getElementById('graceSeconds');
  const resetDemoBtn = document.getElementById('resetDemoBtn');

  // Load saved settings
  const { settings } = await chrome.storage.local.get(['settings']);
  
  if (settings) {
    geminiApiKeyInput.value = settings.geminiApiKey || '';
    graceMinutesInput.value = settings.graceMinutes || 10;
    if (demoModeCheckbox) demoModeCheckbox.checked = Boolean(settings.demoMode);
    if (focusModeCheckbox) focusModeCheckbox.checked = settings.focusMode !== false;
    if (graceSecondsInput) graceSecondsInput.value = Number(settings.graceSeconds) || 10;
    
    const productiveList = settings.productiveDomains || SakshiRules.DEFAULT_PRODUCTIVE_DOMAINS;
    productiveDomainsTextarea.value = productiveList.join('\n');

    const distractingList = settings.distractingDomains || SakshiRules.DEFAULT_DISTRACTING_DOMAINS;
    distractingDomainsTextarea.value = distractingList.join('\n');

    dashboardUrlInput.value = settings.dashboardUrl || 'http://localhost:5173/';
  } else {
    productiveDomainsTextarea.value = SakshiRules.DEFAULT_PRODUCTIVE_DOMAINS.join('\n');
    distractingDomainsTextarea.value = SakshiRules.DEFAULT_DISTRACTING_DOMAINS.join('\n');
  }

  // Reset Demo button on options page
  if (resetDemoBtn) {
    resetDemoBtn.addEventListener('click', async () => {
      resetDemoBtn.disabled = true;
      resetDemoBtn.textContent = 'Resetting...';
      await chrome.runtime.sendMessage({ type: 'RESET_DEMO' });
      resetDemoBtn.disabled = false;
      resetDemoBtn.textContent = 'Reset demo';
      alert('Demo state reset: distracting timer, cooldown, and active session cleared.');
    });
  }

  // Toggle API key visibility
  toggleKeyVisibilityBtn.addEventListener('click', () => {
    if (geminiApiKeyInput.type === 'password') {
      geminiApiKeyInput.type = 'text';
      toggleKeyVisibilityBtn.textContent = 'Hide';
    } else {
      geminiApiKeyInput.type = 'password';
      toggleKeyVisibilityBtn.textContent = 'Show';
    }
  });

  // Test Gemini API key
  testKeyBtn.addEventListener('click', async () => {
    const key = geminiApiKeyInput.value.trim();
    if (!key) {
      testKeyResult.className = 'test-result error';
      testKeyResult.textContent = 'Please enter an API key first.';
      return;
    }

    testKeyBtn.disabled = true;
    testKeyResult.className = 'test-result';
    testKeyResult.textContent = 'Testing connection with Gemini 2.0 Flash...';

    try {
      const res = await chrome.runtime.sendMessage({
        type: 'TEST_GEMINI_KEY',
        apiKey: key
      });

      if (res && res.success) {
        testKeyResult.className = 'test-result success';
        testKeyResult.textContent = `✓ Gemini responded successfully: "${res.result.label}" (${res.result.reason})`;
      } else {
        testKeyResult.className = 'test-result error';
        testKeyResult.textContent = '✕ Connection failed. Please check that your key is valid and has Gemini API enabled.';
      }
    } catch (err) {
      testKeyResult.className = 'test-result error';
      testKeyResult.textContent = `✕ Test failed: ${err.message}`;
    } finally {
      testKeyBtn.disabled = false;
    }
  });

  // Test Notification button
  testNotificationBtn.addEventListener('click', () => {
    testNotificationResult.className = 'test-result';
    testNotificationResult.textContent = 'Triggering test notification...';

    chrome.notifications.create('sakshi_test_' + Date.now(), {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
      title: 'Are you distracted?',
      message: 'You set out to: Test focus session\n\nWhat was your intention when you began?',
      priority: 2,
      requireInteraction: true
    }, (createdId) => {
      if (chrome.runtime.lastError) {
        console.error('[Sakshi Options Error]', chrome.runtime.lastError.message);
        testNotificationResult.className = 'test-result error';
        testNotificationResult.textContent = '✕ Error: ' + chrome.runtime.lastError.message;
      } else {
        console.log('[Sakshi Options] Test notification created successfully:', createdId);
        testNotificationResult.className = 'test-result success';
        testNotificationResult.textContent = '✓ Notification created! Check your screen / Notification Center.';
        setTimeout(() => {
          testNotificationResult.textContent = '';
        }, 5000);
      }
    });
  });

  // Reset to default domain lists
  resetProductiveBtn.addEventListener('click', () => {
    productiveDomainsTextarea.value = SakshiRules.DEFAULT_PRODUCTIVE_DOMAINS.join('\n');
  });

  resetDistractingBtn.addEventListener('click', () => {
    distractingDomainsTextarea.value = SakshiRules.DEFAULT_DISTRACTING_DOMAINS.join('\n');
  });

  // Helper to parse textarea domains
  function parseDomains(text) {
    return text
      .split('\n')
      .map(line => line.trim().toLowerCase())
      .filter(line => line.length > 0 && !line.startsWith('#'));
  }

  // Save settings
  saveBtn.addEventListener('click', async () => {
    saveBtn.disabled = true;
    saveStatus.className = 'save-status';
    saveStatus.textContent = 'Saving...';

    const newSettings = {
      geminiApiKey: geminiApiKeyInput.value.trim(),
      graceMinutes: Math.max(0.5, parseFloat(graceMinutesInput.value) || 10),
      demoMode: demoModeCheckbox ? demoModeCheckbox.checked : false,
      focusMode: focusModeCheckbox ? focusModeCheckbox.checked : true,
      graceSeconds: graceSecondsInput ? Math.max(5, parseInt(graceSecondsInput.value, 10) || 10) : 10,
      productiveDomains: parseDomains(productiveDomainsTextarea.value),
      distractingDomains: parseDomains(distractingDomainsTextarea.value),
      dashboardUrl: dashboardUrlInput.value.trim() || 'http://localhost:5173/'
    };

    await chrome.storage.local.set({ settings: newSettings });

    saveStatus.className = 'save-status success';
    saveStatus.textContent = '✓ Settings saved successfully';
    saveBtn.disabled = false;

    setTimeout(() => {
      saveStatus.textContent = '';
    }, 3000);
  });

  // Clear all data
  clearDataBtn.addEventListener('click', async () => {
    const confirmed = confirm(
      'Are you sure you want to clear all recorded sessions and classification caches? Your settings will be preserved, but all past timeline data will be permanently wiped.'
    );

    if (confirmed) {
      await chrome.storage.local.set({
        sessions: [],
        classificationCache: {},
        activeSession: null
      });
      alert('All session history and classification cache have been wiped.');
    }
  });
});
