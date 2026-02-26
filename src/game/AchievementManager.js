/**
 * Yerevan Legends achievement definitions and persistence.
 * Tracks totalClicks, totalEarnings, levelsBought; persists unlocked in localStorage.
 */
const STORAGE_KEY = 'yerevan_achievements';

export const ACHIEVEMENTS = [
  {
    id: 'barev',
    name: 'Barev, Akhpers',
    goal: '100 Total Clicks',
    lore: "You've greeted your first 100 passengers.",
    goalType: 'totalClicks',
    target: 100,
  },
  {
    id: 'gas',
    name: 'Gas or Gasoline?',
    goal: 'Buy 5 Fuel Additives',
    lore: 'Every driver in Yerevan has an opinion on this.',
    goalType: 'levelsBought',
    target: 5,
  },
  {
    id: 'route100',
    name: 'Route 100',
    goal: 'Hire 10 Drivers',
    lore: "You're starting to dominate the public transport scene.",
    goalType: 'levelsBought',
    target: 10,
  },
  {
    id: 'kentron_king',
    name: 'The Kentron King',
    goal: 'Earn 1M Total AMD',
    lore: "You finally have enough for a coffee at Opera.",
    goalType: 'totalEarnings',
    target: 1e6,
  },
  {
    id: 'olympic_speed',
    name: 'Olympic Speed',
    goal: 'Reach 50 Clicks per Minute',
    lore: 'Your fingers are moving faster than a taxi at 2 AM.',
    goalType: 'clicksPerMinute',
    target: 50,
  },
  {
    id: 'legendary_astra',
    name: 'Legendary Astra',
    goal: 'Upgrade White Opel to Lvl 50',
    lore: "It's not just a car; it's an immortal chariot.",
    goalType: 'upgradeLevel',
    upgradeId: 'white_opel_astra',
    target: 50,
  },
  {
    id: 'no_traffic',
    name: 'No Traffic Today',
    goal: 'Play for 1 hour straight',
    lore: 'A rare phenomenon in Yerevan.',
    goalType: 'sessionTimeSeconds',
    target: 3600,
  },
];

const ROLLING_WINDOW_MS = 60 * 1000;

let unlockedIds = [];
let clickTimestamps = [];

function loadUnlocked() {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    unlockedIds = Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    unlockedIds = [];
  }
}

function saveUnlocked() {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlockedIds));
  } catch (_) {}
}

loadUnlocked();

/**
 * Call on each taxi click to compute clicks-per-minute.
 * @param {number} [now] - Timestamp (Date.now()).
 */
export function trackClick(now = Date.now()) {
  clickTimestamps.push(now);
  const cut = now - ROLLING_WINDOW_MS;
  while (clickTimestamps.length > 0 && clickTimestamps[0] < cut) {
    clickTimestamps.shift();
  }
}

/**
 * @returns {number} Clicks in the last 60 seconds.
 */
export function getClicksPerMinute() {
  const now = Date.now();
  const cut = now - ROLLING_WINDOW_MS;
  let n = 0;
  for (let i = clickTimestamps.length - 1; i >= 0; i--) {
    if (clickTimestamps[i] >= cut) n++;
    else break;
  }
  return n;
}

/**
 * Check progress and unlock any newly completed achievements.
 * @param {object} stats - { totalClicks, totalEarnings, levelsBought, upgradeLevels, sessionTimeSeconds }
 * @returns {object|null} Newly unlocked achievement or null.
 */
export function checkAndUnlock(stats) {
  const cpm = getClicksPerMinute();
  const sessionTimeSeconds = stats.sessionTimeSeconds ?? 0;

  for (let i = 0; i < ACHIEVEMENTS.length; i++) {
    const a = ACHIEVEMENTS[i];
    if (unlockedIds.includes(a.id)) continue;

    let met = false;
    if (a.goalType === 'totalClicks') {
      met = (stats.totalClicks ?? 0) >= a.target;
    } else if (a.goalType === 'totalEarnings') {
      met = (stats.totalEarnings ?? 0) >= a.target;
    } else if (a.goalType === 'levelsBought') {
      met = (stats.levelsBought ?? 0) >= a.target;
    } else if (a.goalType === 'clicksPerMinute') {
      met = cpm >= a.target;
    } else if (a.goalType === 'upgradeLevel' && a.upgradeId) {
      const levels = stats.upgradeLevels || {};
      met = (levels[a.upgradeId] ?? 0) >= a.target;
    } else if (a.goalType === 'sessionTimeSeconds') {
      met = sessionTimeSeconds >= a.target;
    }

    if (met) {
      unlockedIds.push(a.id);
      saveUnlocked();
      return a;
    }
  }
  return null;
}

export function getUnlockedIds() {
  return unlockedIds.slice();
}

/** Restore unlocked from save (SaveService). */
export function setUnlockedIds(ids) {
  unlockedIds = Array.isArray(ids) ? ids.slice() : [];
  saveUnlocked();
}

export function getUnlockedCount() {
  return unlockedIds.length;
}

/**
 * Permanent +2% global income per achievement.
 */
export function getAchievementBonusMultiplier() {
  return 1 + getUnlockedCount() * 0.02;
}
