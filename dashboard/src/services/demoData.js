// Simple mulberry32 for seeded random numbers
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

const random = mulberry32(12345); // Fixed seed for reproducible demo data

function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

const INTENTIONS = [
  'Study data structures',
  'Complete physics assignment',
  'Work on portfolio',
  'Read research paper',
  'Code React components',
  'Write blog post',
  'Learn TypeScript',
  'Prepare for interview'
];

const DOMAINS = {
  productive: [
    { domain: 'docs.python.org', title: 'Python Documentation' },
    { domain: 'github.com', title: 'GitHub' },
    { domain: 'notion.so', title: 'Notion Workspace' },
    { domain: 'coursera.org', title: 'Coursera Course' },
    { domain: 'stackoverflow.com', title: 'Stack Overflow' }
  ],
  neutral: [
    { domain: 'google.com', title: 'Google Search' },
    { domain: 'reddit.com', title: 'Reddit (r/programming)' }
  ],
  distracting: [
    { domain: 'instagram.com', title: 'Instagram' },
    { domain: 'youtube.com/shorts', title: 'YouTube Shorts' },
    { domain: 'youtube.com', title: 'YouTube' },
    { domain: 'twitter.com', title: 'X (Twitter)' },
    { domain: 'reddit.com', title: 'Reddit' }
  ]
};

export function generateDemoSessions(totalDays = 30) {
  const sessions = [];
  const now = new Date();
  
  // Go back totalDays
  const startDate = new Date(now.getTime() - (totalDays - 1) * 24 * 60 * 60 * 1000);
  startDate.setHours(9, 0, 0, 0); // Start around 9 AM

  let sessionId = 1;

  for (let day = 0; day < totalDays; day++) {
    const numSessions = randomInt(1, 3);
    const currentDate = new Date(startDate.getTime() + day * 24 * 60 * 60 * 1000);
    
    // Day 10 and Day 23 are natural human weaker days
    const isWeakerDay = day === 9 || day === 22;
    
    // Progress metrics with gentle upward trend in stretch and downward in return latency
    const progress = totalDays > 1 ? day / (totalDays - 1) : 0;
    const baseStretch = Math.round(8 + progress * 15); // 8 to 23 min
    const baseReturn = Math.round(180 - progress * 115); // 180s to 65s

    let sessionStartTime = new Date(currentDate);
    
    for (let s = 0; s < numSessions; s++) {
      // 25 to 60 minutes
      const durationMin = randomInt(25, 60);
      const intention = INTENTIONS[randomInt(0, INTENTIONS.length - 1)];
      
      let longestStretchMin = Math.min(durationMin, Math.max(2, baseStretch + randomInt(-2, 3)));
      let avgReturnSec = Math.max(30, baseReturn + randomInt(-20, 40));
      
      if (isWeakerDay) {
        longestStretchMin = Math.max(2, randomInt(3, 7));
        avgReturnSec = randomInt(200, 300);
      }
      
      // Calculate derived metrics based on stretch and return time
      // The lower the stretch, the more drifts
      const approxDrifts = Math.floor(durationMin / Math.max(2, longestStretchMin / 2));
      const driftCount = isWeakerDay ? randomInt(approxDrifts + 2, approxDrifts + 5) : randomInt(0, approxDrifts);
      
      const startedAt = new Date(sessionStartTime);
      const endedAt = new Date(startedAt.getTime() + durationMin * 60 * 1000);
      
      // Advance next session start time by duration + some break
      sessionStartTime = new Date(endedAt.getTime() + randomInt(15, 120) * 60 * 1000);
      
      // Generate timeline
      const timeline = [];
      let currentSegmentStart = new Date(startedAt);
      
      let prodMin = 0;
      let neutMin = 0;
      let distMin = 0;
      
      let remainingDurationSec = durationMin * 60;
      
      while (remainingDurationSec > 0) {
        const isProductive = random() > (isWeakerDay ? 0.4 : 0.2); // 60% prod on weak days, 80% otherwise
        
        let segmentSec = 0;
        let category = 'productive';
        
        if (isProductive) {
          // productive segment
          segmentSec = Math.min(remainingDurationSec, randomInt(5, longestStretchMin) * 60);
          category = 'productive';
        } else {
          // off-task
          segmentSec = Math.min(remainingDurationSec, avgReturnSec + randomInt(-20, 20));
          category = random() > 0.5 ? 'distracting' : 'neutral';
        }
        
        const segmentEnd = new Date(currentSegmentStart.getTime() + segmentSec * 1000);
        
        const domainPool = DOMAINS[category];
        const site = domainPool[randomInt(0, domainPool.length - 1)];
        
        timeline.push({
          start: currentSegmentStart.toISOString(),
          end: segmentEnd.toISOString(),
          category,
          domain: site.domain,
          title: site.title
        });
        
        const segmentMin = segmentSec / 60;
        if (category === 'productive') prodMin += segmentMin;
        else if (category === 'neutral') neutMin += segmentMin;
        else distMin += segmentMin;
        
        remainingDurationSec -= segmentSec;
        currentSegmentStart = segmentEnd;
      }
      
      sessions.push({
        id: `demo_session_${sessionId++}`,
        intention,
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMin,
        longestStretchMin,
        driftCount,
        avgReturnSec,
        minutes: {
          productive: Math.round(prodMin),
          neutral: Math.round(neutMin),
          distracting: Math.round(distMin)
        },
        timeline,
        isDemo: true
      });
    }
  }
  
  return sessions;
}
