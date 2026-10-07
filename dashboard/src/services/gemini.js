export async function generateReflection(sessionData, profile, apiKey) {
  if (!apiKey) return fallbackReflection(sessionData);
  
  const prompt = `Session Activity Analysis:
- Intention: "${sessionData.intention}"
- Longest continuous unbroken stretch: ${sessionData.longestStretchMin} minutes
- Total drifts/distractions: ${sessionData.driftCount}
- Average return latency: ${sessionData.avgReturnSec} seconds
- Time breakdown: Productive ${sessionData.minutes?.productive || 0}m, Neutral ${sessionData.minutes?.neutral || 0}m, Distracting ${sessionData.minutes?.distracting || 0}m
- Domains visited: ${(sessionData.timeline || []).map(t => t.domain).filter(Boolean).slice(0, 8).join(', ')}

User Profile:
- Name: ${profile.name || 'Friend'}
- Profession: ${profile.profession || 'Learner'}
- Key Interests: ${(profile.interests || []).join(', ')}

Task:
Analyze this user's focus patterns and provide a gentle reflection grounded in Swami Vivekananda's core teachings on concentration and mind training:
1. Reference his philosophy: either the restless monkey that must be witnessed without anger (Sakshi Bhava), the power of single unbroken focus (Ekagrata), sensory quietude (Pratyahara), or the strength to "Begin again" without remorse.
2. Give 1 practical, actionable suggestion directly linked to their activity metrics.
3. Finish with 1 introspective question to help them observe their mind.
Keep the tone encouraging, calm, respectful, and lucid (maximum 3-4 sentences total).`;

  return callGeminiAPI(prompt, apiKey, () => fallbackReflection(sessionData));
}

export async function generateWeeklyTip(weekData, profile, apiKey) {
  if (!apiKey) return fallbackWeeklyTip(weekData);

  const prompt = `User's 14-Day Attention Trend Analysis:
- Average unbroken stretch this week: ${weekData.avgStretch} minutes
- Average return time after drifting: ${weekData.avgReturnTime} seconds
- Overall trend: ${weekData.trend}
- Total focus sessions completed: ${weekData.sessions.length}

User Profile:
- Name: ${profile.name || 'Seeker'}
- Profession: ${profile.profession || 'Learner'}

Task:
Provide a personalized weekly concentration counsel inspired by Swami Vivekananda's teachings in "Raja Yoga" (especially the progression from Pratyahara to Dharana and Dhyana):
- Acknowledge their natural rhythms without judgment.
- Provide 1 deep yet practical guidance on building patience (Abhyasa) and strengthening will from within.
Max 2-3 sentences.`;

  return callGeminiAPI(prompt, apiKey, () => fallbackWeeklyTip(weekData));
}

async function callGeminiAPI(prompt, apiKey, fallbackFn) {
  const systemPrompt = `You are the Ekāgratā Reflection Guide, inspired by Swami Vivekananda's profound psychology of the mind from Raja Yoga and Karma Yoga. 
Your purpose is to help the user witness and train their attention with patience, compassion, and inner strength. 
Never shame or guilt the user for browsing distracting content or drifting. Acknowledge that the mind's nature is to wander like an excited monkey, and true mastery comes from calm witnessing (Sakshi) and gentle, persistent return (Abhyasa). 
Provide authentic, practical guidance rooted in Vivekananda's principles of concentration as the true essence of education.`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      })
    });
    
    if (!response.ok) throw new Error('API response was not ok');
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return fallbackFn();
  }
}

export function fallbackReflection(sessionData) {
  const stretch = sessionData.longestStretchMin || 0;
  const returnSec = sessionData.avgReturnSec || 45;
  return `Swami Vivekananda taught that the mind is like a restless monkey—when it wanders toward distraction, do not fight it with anger; simply witness it and draw it back gently. You held an unbroken stream for ${stretch} minutes and returned in ${returnSec} seconds. Notice: what was the trigger that drew your attention away, and what helped you return?`;
}

export function fallbackWeeklyTip(weekData) {
  return `As Vivekananda noted in Raja Yoga, "Concentration cannot be bought in a day. It comes through gentle perseverance." Practice pausing for three steady breaths before switching browser windows to strengthen your voluntary attention from within.`;
}
