import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as storage from '../services/storage';
import { calculateAllEarnedPoints } from '../data/rewards';
import { subscribeToExtension, pingExtension, getData, returnToWork, continueAnyway } from '../services/extensionBridge';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Profile state
  const [profile, setProfileState] = useState(() => storage.getProfile());
  const [onboarded, setOnboardedState] = useState(() => storage.isOnboarded());

  // Settings state
  const [settings, setSettingsState] = useState(() => ({
    geminiKey: '',
    theme: 'light',
    lang: 'en',
    demoMode: false,
    focusMode: true,
    ...storage.getSettings(),
  }));

  // Sessions state
  const [sessions, setSessions] = useState(() => storage.getSessions());
  const [activeSession, setActiveSessionState] = useState(() => storage.getActiveSession());

  // Extension state
  const [extensionConnected, setExtensionConnected] = useState(false);
  const [extensionVersion, setExtensionVersion] = useState(null);

  // Digital Wellbeing Focus Mode state
  const [focusMode, setFocusMode] = useState(() => settings.focusMode ?? true);
  const [turnedOffDomains, setTurnedOffDomains] = useState(() => activeSession?.turnedOffDomains || []);

  // Distraction Notification popup state
  const [distractionAlert, setDistractionAlert] = useState(null);

  // Rewards State (claimed goodies and custom points in localStorage)
  const [rewardsData, setRewardsDataState] = useState(() => storage.getRewardsData());

  // Theme effect: toggle dark class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [settings.theme]);

  // Sync with extension on mount
  useEffect(() => {
    let mounted = true;
    pingExtension(1500)
      .then((res) => {
        if (!mounted) return;
        setExtensionConnected(res.connected);
        if (res.version) setExtensionVersion(res.version);

        // If connected, sync stored data from extension
        if (res.connected && !settings.demoMode) {
          getData().then((data) => {
            if (!mounted) return;
            if (data?.sessions && Array.isArray(data.sessions) && data.sessions.length > 0) {
              setSessions(data.sessions);
              storage.saveSessions(data.sessions);
            }
            if (data?.activeSession) {
              setActiveSessionState(data.activeSession);
              storage.saveActiveSession(data.activeSession);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {
        if (mounted) setExtensionConnected(false);
      });

    return () => {
      mounted = false;
    };
  }, [settings.demoMode]);

  // Listen to extension events (e.g. DISTRACTION_DETECTED or DRIFT_DETECTED)
  useEffect(() => {
    const unsubscribe = subscribeToExtension((message) => {
      if (message.type === 'DISTRACTION_DETECTED' || message.type === 'DRIFT_DETECTED') {
        const domain = message.domain || message.payload?.domain || 'distracting website';
        setDistractionAlert({
          domain,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          message: `Attention drifted to ${domain}. Witness the thought calmly and return when ready.`
        });
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Save profile
  const setProfile = useCallback((p) => {
    storage.saveProfile(p);
    setProfileState(p);
  }, []);

  // Mark onboarded
  const completeOnboarding = useCallback(() => {
    storage.setOnboarded();
    setOnboardedState(true);
  }, []);

  // Update settings
  const updateSettings = useCallback((patch) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      storage.saveSettings(next);
      return next;
    });
  }, []);

  // Add a session
  const addSession = useCallback((session) => {
    setSessions(prev => {
      const next = [...prev, session];
      storage.saveSessions(next);
      return next;
    });
  }, []);

  // Replace all sessions (e.g. for demo data)
  const replaceSessions = useCallback((newSessions) => {
    storage.saveSessions(newSessions);
    setSessions(newSessions);
  }, []);

  // Active session management
  const setActiveSession = useCallback((session) => {
    if (session) {
      storage.saveActiveSession(session);
      setTurnedOffDomains(session.turnedOffDomains || []);
    } else {
      storage.clearActiveSession();
      setTurnedOffDomains([]);
    }
    setActiveSessionState(session);
  }, []);

  // Total points computed from completed sessions:
  // 1 point per 10 minutes unbroken productive stretch + bonus on return time improvement
  const totalEarnedPoints = useMemo(() => {
    const fromSessions = calculateAllEarnedPoints(sessions);
    return fromSessions + (rewardsData?.customEarnedPoints || 0);
  }, [sessions, rewardsData]);

  const spentPoints = useMemo(() => {
    const claimed = rewardsData?.claimedGoodies || [];
    return claimed.reduce((acc, g) => acc + (g.cost || g.points || 0), 0);
  }, [rewardsData]);

  const availablePoints = Math.max(0, totalEarnedPoints - spentPoints);

  // Claim a goodie
  const claimGoodie = useCallback((goodie) => {
    const cost = goodie.cost || goodie.points || 0;
    if (availablePoints < cost) return false;
    const nextClaimed = [
      ...(rewardsData.claimedGoodies || []),
      { ...goodie, cost, claimedAt: new Date().toISOString() }
    ];
    const nextData = { ...rewardsData, claimedGoodies: nextClaimed };
    storage.saveRewardsData(nextData);
    setRewardsDataState(nextData);
    return true;
  }, [availablePoints, rewardsData]);

  // Digital Wellbeing: Return to Work (closes tab & turns off domain until session end)
  const handleReturnToWork = useCallback((domain) => {
    const targetDomain = domain || distractionAlert?.domain || 'distracting site';
    if (focusMode && targetDomain) {
      setTurnedOffDomains((prev) => {
        if (!prev.includes(targetDomain)) {
          const next = [...prev, targetDomain];
          if (activeSession) {
            const updated = { ...activeSession, turnedOffDomains: next };
            setActiveSessionState(updated);
            storage.saveActiveSession(updated);
          }
          return next;
        }
        return prev;
      });
    }

    returnToWork({ domain: targetDomain, turnOff: focusMode });
    setDistractionAlert(null);
  }, [focusMode, distractionAlert, activeSession]);

  // Digital Wellbeing: Continue Anyway (permits continuing consciously)
  const handleContinueAnyway = useCallback(() => {
    continueAnyway();
    setDistractionAlert(null);
  }, []);

  // Simulate trigger distraction for testing without extension
  const triggerDistractionTest = useCallback((domain = 'instagram.com') => {
    setDistractionAlert({
      domain,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      message: `Attention drifted to ${domain}. Notice the pull without frustration, and gently steer back.`
    });
  }, []);

  const dismissDistractionAlert = useCallback(() => {
    setDistractionAlert(null);
  }, []);

  // Delete all data
  const deleteAllData = useCallback(() => {
    storage.deleteAllData();
    setProfileState(null);
    setSessions([]);
    setActiveSessionState(null);
    setOnboardedState(false);
    setTurnedOffDomains([]);
    setRewardsDataState({ claimedGoodies: [], customEarnedPoints: 0 });
    setSettingsState({ geminiKey: '', theme: 'light', lang: 'en', demoMode: false, focusMode: true });
  }, []);

  const value = {
    // Profile
    profile,
    setProfile,
    onboarded,
    completeOnboarding,
    // Settings
    settings,
    updateSettings,
    lang: settings.lang,
    theme: settings.theme,
    demoMode: settings.demoMode,
    // Focus Mode (Digital Wellbeing)
    focusMode,
    setFocusMode,
    turnedOffDomains,
    handleReturnToWork,
    handleContinueAnyway,
    // Sessions
    sessions,
    addSession,
    replaceSessions,
    activeSession,
    setActiveSession,
    // Extension
    extensionConnected,
    setExtensionConnected,
    extensionVersion,
    setExtensionVersion,
    // Distraction Notification Alert
    distractionAlert,
    triggerDistractionTest,
    dismissDistractionAlert,
    // Points & Goodies
    totalEarnedPoints,
    spentPoints,
    availablePoints,
    claimedGoodies: rewardsData?.claimedGoodies || [],
    claimGoodie,
    // Actions
    deleteAllData,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}

export default AppContext;
