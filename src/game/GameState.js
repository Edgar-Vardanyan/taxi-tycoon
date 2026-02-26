import {
  getAchievementBonusMultiplier,
  getUnlockedIds,
  setUnlockedIds,
} from './AchievementManager.js';

const STORAGE_KEY = 'yerevan_taxi_tycoon_save';

/** Milestone thresholds (totalEarnings). 10 steps. */
export const MILESTONES = [
  1e3, 1e4, 5e4, 1e5, 2e5, 5e5, 1e6, 5e6, 1e7, 1e8, 1e9,
];

/** Upgrade definitions: id, title, basePrice, category, effect. */
export const SHOP_CATEGORIES = [
  { id: 'theStart', name: 'The Start', borderColor: 0x4caf50 },
  { id: 'oldSchool', name: 'The Old School', borderColor: 0x8d6e63 },
  { id: 'kentronKing', name: 'The Kentron King', borderColor: 0xffb347 },
  { id: 'techEra', name: 'The Tech Era', borderColor: 0x00bcd4 },
  { id: 'theMogul', name: 'The Mogul', borderColor: 0x9c27b0 },
  { id: 'theFuture', name: 'The Future', borderColor: 0x00f5ff },
  { id: 'theLegacy', name: 'The Legacy', borderColor: 0xffeb3b },
];

export const UPGRADES = {
  walking_map: {
    id: 'walking_map',
    title: 'Walking Map',
    basePrice: 10,
    category: 'theStart',
    amdPerSecond: 0.2,
  },
  comfortable_shoes: {
    id: 'comfortable_shoes',
    title: 'Comfortable Shoes',
    basePrice: 50,
    category: 'theStart',
    perClickBonus: 1,
  },
  bicycle_courier: {
    id: 'bicycle_courier',
    title: 'Bicycle Courier',
    basePrice: 150,
    category: 'theStart',
    amdPerSecond: 2,
  },
  old_zhiguli: {
    id: 'old_zhiguli',
    title: "Old Zhiguli",
    basePrice: 500,
    category: 'oldSchool',
    amdPerSecond: 8,
  },
  second_hand_gps: {
    id: 'second_hand_gps',
    title: 'Second-hand GPS',
    basePrice: 1200,
    category: 'oldSchool',
    perClickBonus: 5,
  },
  white_opel_astra: {
    id: 'white_opel_astra',
    title: 'White Opel Astra',
    basePrice: 3500,
    category: 'oldSchool',
    amdPerSecond: 25,
  },
  silver_yashik: {
    id: 'silver_yashik',
    title: "Silver 'Yashik' (G-Wagon)",
    basePrice: 10000,
    category: 'kentronKing',
    amdPerSecond: 75,
  },
  armenian_coffee: {
    id: 'armenian_coffee',
    title: 'Strong Armenian Coffee',
    basePrice: 25000,
    category: 'kentronKing',
    perClickBonus: 20,
  },
  vip_tinted_windows: {
    id: 'vip_tinted_windows',
    title: 'VIP Tinted Windows',
    basePrice: 60000,
    category: 'kentronKing',
    multiplierPercent: 0.15,
  },
  yandex_partnership: {
    id: 'yandex_partnership',
    title: 'Yandex/GG Partnership',
    basePrice: 150000,
    category: 'techEra',
    amdPerSecond: 400,
  },
  electric_scooter_fleet: {
    id: 'electric_scooter_fleet',
    title: 'Electric Scooter Fleet',
    basePrice: 400000,
    category: 'techEra',
    amdPerSecond: 1200,
  },
  tesla_model_s: {
    id: 'tesla_model_s',
    title: 'Tesla Model S Taxi',
    basePrice: 1000000,
    category: 'techEra',
    amdPerSecond: 3500,
  },
  zvartnots_permit: {
    id: 'zvartnots_permit',
    title: 'Zvartnots Airport Permit',
    basePrice: 2500000,
    category: 'theMogul',
    amdPerSecond: 10000,
  },
  private_bus_line: {
    id: 'private_bus_line',
    title: 'Private Bus Line',
    basePrice: 7000000,
    category: 'theMogul',
    amdPerSecond: 30000,
  },
  metro_upgrade: {
    id: 'metro_upgrade',
    title: 'Metro Station Upgrade',
    basePrice: 20000000,
    category: 'theMogul',
    amdPerSecond: 85000,
  },
  autonomous_driving: {
    id: 'autonomous_driving',
    title: 'Autonomous Self-Driving',
    basePrice: 60000000,
    category: 'theFuture',
    amdPerSecond: 250000,
  },
  flying_taxi_drone: {
    id: 'flying_taxi_drone',
    title: 'Flying Taxi Drone',
    basePrice: 150000000,
    category: 'theFuture',
    amdPerSecond: 650000,
  },
  hyperloop: {
    id: 'hyperloop',
    title: 'Hyperloop Yerevan-Tbilisi',
    basePrice: 500000000,
    category: 'theFuture',
    amdPerSecond: 2000000,
  },
  teleportation_hub: {
    id: 'teleportation_hub',
    title: 'Teleportation Hub',
    basePrice: 1500000000,
    category: 'theFuture',
    amdPerSecond: 7000000,
  },
  space_taxi: {
    id: 'space_taxi',
    title: 'Space Taxi to Mars',
    basePrice: 5000000000,
    category: 'theLegacy',
    amdPerSecond: 25000000,
  },
  time_travel: {
    id: 'time_travel',
    title: 'Time Travel Commute',
    basePrice: 20000000000,
    category: 'theLegacy',
    amdPerSecond: 100000000,
  },
  pashut_god: {
    id: 'pashut_god',
    title: 'The Pashut God',
    basePrice: 100000000000,
    category: 'theLegacy',
    amdPerSecond: 500000000,
  },
};

/** Ordered list of upgrade ids for the shop. */
export const SHOP_UPGRADE_IDS = [
  'walking_map', 'comfortable_shoes', 'bicycle_courier',
  'old_zhiguli', 'second_hand_gps', 'white_opel_astra',
  'silver_yashik', 'armenian_coffee', 'vip_tinted_windows',
  'yandex_partnership', 'electric_scooter_fleet', 'tesla_model_s',
  'zvartnots_permit', 'private_bus_line', 'metro_upgrade',
  'autonomous_driving', 'flying_taxi_drone', 'hyperloop',
  'teleportation_hub', 'space_taxi', 'time_travel', 'pashut_god',
];

const DEFAULT_UPGRADES = {};
SHOP_UPGRADE_IDS.forEach((id) => {
  DEFAULT_UPGRADES[id] = 0;
});

const DEFAULT_SAVE = {
  money: 0,
  totalEarnings: 0,
  totalClicks: 0,
  milestoneIndex: 0,
  prestige: 1,
  goldenLicenses: 0,
  upgrades: { ...DEFAULT_UPGRADES },
  lastUnixTime: Math.floor(Date.now() / 1000),
};

let save = { ...DEFAULT_SAVE };

export function loadSave() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      save = { ...DEFAULT_SAVE, ...parsed };
      save.upgrades = { ...DEFAULT_UPGRADES, ...(save.upgrades || {}) };
      if (typeof save.totalEarnings !== 'number') save.totalEarnings = 0;
      if (typeof save.totalClicks !== 'number') save.totalClicks = 0;
      if (typeof save.milestoneIndex !== 'number') save.milestoneIndex = 0;
      if (typeof save.lastUnixTime !== 'number') {
        save.lastUnixTime = Math.floor(Date.now() / 1000);
      }
      if (typeof save.goldenLicenses !== 'number') save.goldenLicenses = 0;
      if (parsed.achievementsUnlocked && Array.isArray(parsed.achievementsUnlocked)) {
        setUnlockedIds(parsed.achievementsUnlocked);
      }
    }
  } catch (_) {
    save = { ...DEFAULT_SAVE };
  }
  return save;
}

export function getSave() {
  return save;
}

export function getMoney() {
  return save.money;
}

export function getTotalEarnings() {
  return save.totalEarnings ?? 0;
}

export function getTotalClicks() {
  return save.totalClicks ?? 0;
}

export function getMilestoneIndex() {
  const idx = save.milestoneIndex ?? 0;
  return Math.min(idx, MILESTONES.length - 1);
}

/** Threshold for current milestone (totalEarnings target). */
export function getNextMilestoneTarget() {
  const idx = getMilestoneIndex();
  return MILESTONES[Math.min(idx, MILESTONES.length - 1)] ?? 1e9;
}

/** Previous milestone threshold (for progress bar range). */
export function getPrevMilestoneTarget() {
  const idx = getMilestoneIndex();
  if (idx <= 0) return 0;
  return MILESTONES[idx - 1] ?? 0;
}

/** Call when progress reaches 100%; advances to next milestone. */
export function advanceMilestone() {
  const idx = getMilestoneIndex();
  if (idx < MILESTONES.length - 1) {
    save.milestoneIndex = idx + 1;
    persist();
  }
}

/** Call on every taxi click. */
export function addClick() {
  save.totalClicks = (save.totalClicks ?? 0) + 1;
  persist();
}

export function getPrestige() {
  return save.prestige;
}

/** Golden Licenses from Rebirth (1 per 1M total AMD). +10% earnings each. */
export function getGoldenLicenses() {
  return save.goldenLicenses ?? 0;
}

export function getUpgradeLevel(id) {
  return save.upgrades[id] ?? 0;
}

/** Sum of all upgrade levels (for achievements). */
export function getLevelsBought() {
  let total = 0;
  for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
    total += getUpgradeLevel(SHOP_UPGRADE_IDS[i]);
  }
  return total;
}

/** Price = BasePrice * 1.15 ^ Level */
export function getUpgradePrice(id) {
  const cfg = UPGRADES[id];
  if (!cfg) return Infinity;
  const level = getUpgradeLevel(id);
  return Math.floor(cfg.basePrice * Math.pow(1.15, level));
}

/** Total cost for next `count` levels (geometric series). */
export function getBatchCost(id, count) {
  const cfg = UPGRADES[id];
  if (!cfg || count < 1) return 0;
  const level = getUpgradeLevel(id);
  const r = 1.15;
  const first = cfg.basePrice * Math.pow(r, level);
  const total = first * (Math.pow(r, count) - 1) / (r - 1);
  return Math.floor(total);
}

export function getUpgradeCategory(id) {
  const cfg = UPGRADES[id];
  return cfg ? cfg.category : null;
}

export function getCategoryBorderColor(id) {
  const cat = getUpgradeCategory(id);
  const c = SHOP_CATEGORIES.find((x) => x.id === cat);
  return c ? c.borderColor : 0x000000;
}

/** Index 0-6 of highest category that has at least one upgrade purchased. */
export function getHighestUnlockedTierIndex() {
  let maxIdx = -1;
  for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
    const id = SHOP_UPGRADE_IDS[i];
    if (getUpgradeLevel(id) > 0) {
      const cat = getUpgradeCategory(id);
      const idx = SHOP_CATEGORIES.findIndex((x) => x.id === cat);
      if (idx > maxIdx) maxIdx = idx;
    }
  }
  return maxIdx < 0 ? 0 : maxIdx;
}

/** Buy up to `count` levels; returns { bought, totalSpent }. */
export function buyUpgradeMultiple(id, count) {
  let bought = 0;
  let totalSpent = 0;
  for (let i = 0; i < count; i++) {
    const price = getUpgradePrice(id);
    if (save.money < price || !UPGRADES[id]) break;
    save.money -= price;
    totalSpent += price;
    save.upgrades[id] = (save.upgrades[id] ?? 0) + 1;
    bought += 1;
  }
  if (bought > 0) {
    save.lastUnixTime = Math.floor(Date.now() / 1000);
    persist();
  }
  return { bought, totalSpent };
}

/**
 * Base click value (before multiplier): 1 + sum of all perClickBonus.
 * Click value = (baseClick + bonuses) * multiplier.
 */
export function getClickValue() {
  let bonus = 0;
  for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
    const cfg = UPGRADES[SHOP_UPGRADE_IDS[i]];
    if (cfg && cfg.perClickBonus != null) {
      bonus += getUpgradeLevel(cfg.id) * cfg.perClickBonus;
    }
  }
  const mult = getMultiplier();
  const achievementMult = getAchievementBonusMultiplier();
  return (1 + bonus) * mult * getSpeedMultiplier() * achievementMult
    * getRushHourMultiplier();
}

/** Multiplier: prestige * (1 + goldenLicenses*0.10) * (1 + sum multiplierPercent). */
export function getMultiplier() {
  const goldenMult = 1 + (save.goldenLicenses ?? 0) * 0.1;
  let mult = goldenMult;
  for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
    const cfg = UPGRADES[SHOP_UPGRADE_IDS[i]];
    if (cfg && cfg.multiplierPercent != null) {
      mult += getUpgradeLevel(cfg.id) * cfg.multiplierPercent;
    }
  }
  return save.prestige * mult;
}

/** Temporary 2x from rewarded ad (0 = off). */
let speedBoostUntil = 0;

export function getSpeedMultiplier() {
  return Date.now() < speedBoostUntil ? 2 : 1;
}

export function setSpeedBoost(durationMs) {
  speedBoostUntil = Date.now() + durationMs;
}

/** Remaining ms of 2x boost, or 0 if inactive. */
export function getSpeedBoostRemainingMs() {
  if (Date.now() >= speedBoostUntil) return 0;
  return Math.max(0, speedBoostUntil - Date.now());
}

/** Rush Hour: 5x income for 30s. Triggered by clicking Golden Taxi event. */
let rushHourUntil = 0;

export function setRushHour(durationMs) {
  rushHourUntil = Date.now() + durationMs;
}

export function getRushHourMultiplier() {
  return Date.now() < rushHourUntil ? 5 : 1;
}

export function getRushHourRemainingMs() {
  if (Date.now() >= rushHourUntil) return 0;
  return Math.max(0, rushHourUntil - Date.now());
}

/** Idle AMD per second: sum of all amdPerSecond upgrades * multiplier. */
export function calculateIdleIncome() {
  const mult = getMultiplier() * getSpeedMultiplier() * getRushHourMultiplier();
  const achievementMult = getAchievementBonusMultiplier();
  let total = 0;
  for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
    const cfg = UPGRADES[SHOP_UPGRADE_IDS[i]];
    if (cfg && cfg.amdPerSecond != null) {
      total += getUpgradeLevel(cfg.id) * cfg.amdPerSecond * mult;
    }
  }
  return total * achievementMult;
}

/**
 * Add to balance and totalEarnings (earning only). Persist.
 * Use for clicks, idle, offline. Spending uses buyUpgrade (money only).
 * @param {number} amount - Must be >= 0 for earnings.
 * @returns {number} amount
 */
export function updateBalance(amount) {
  const amt = Math.max(0, amount);
  save.money = Math.max(0, save.money + amt);
  if (amt > 0) {
    save.totalEarnings = (save.totalEarnings ?? 0) + amt;
  }
  save.lastUnixTime = Math.floor(Date.now() / 1000);
  persist();
  return amt;
}

/**
 * Try to buy upgrade. Returns true if purchased.
 * @param {string} id - Upgrade id.
 * @returns {boolean}
 */
export function buyUpgrade(id) {
  const price = getUpgradePrice(id);
  if (save.money < price || !UPGRADES[id]) return false;
  save.money -= price;
  save.upgrades[id] = (save.upgrades[id] ?? 0) + 1;
  save.lastUnixTime = Math.floor(Date.now() / 1000);
  persist();
  return true;
}

function persist() {
  try {
    const toWrite = { ...save, achievementsUnlocked: getUnlockedIds() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toWrite));
  } catch (_) {}
}

/** Called by SaveService for auto-save. */
export function saveNow() {
  persist();
}

/** Last save time (Unix seconds) for offline catch-up. */
export function getLastSaveTimestamp() {
  return save.lastUnixTime ?? Math.floor(Date.now() / 1000);
}

/** Offline seconds since last save. */
export function getOfflineSeconds() {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, now - save.lastUnixTime);
}

/** Offline earnings: idleIncomePerSec * offlineSeconds (capped). */
export function getOfflineEarnings() {
  const incomePerSec = calculateIdleIncome();
  const seconds = getOfflineSeconds();
  return Math.floor(incomePerSec * seconds);
}

export function resetForPrestige() {
  save.money = 0;
  save.prestige = (save.prestige || 1) * 2;
  save.upgrades = { ...DEFAULT_UPGRADES };
  save.totalEarnings = 0;
  save.totalClicks = 0;
  save.milestoneIndex = 0;
  save.lastUnixTime = Math.floor(Date.now() / 1000);
  persist();
}

/** Rebirth at 1M total AMD: reset progress, grant 1 Golden License per 1M. */
export function canRebirth() {
  return (save.totalEarnings ?? 0) >= 1e6;
}

/**
 * Perform Rebirth. Call only when canRebirth().
 * @returns {number} Golden Licenses granted.
 */
export function resetForGoldenLicense() {
  const total = save.totalEarnings ?? 0;
  if (total < 1e6) return 0;
  const newLicenses = Math.floor(total / 1e6);
  save.money = 0;
  save.upgrades = { ...DEFAULT_UPGRADES };
  save.totalEarnings = 0;
  save.totalClicks = 0;
  save.milestoneIndex = 0;
  save.goldenLicenses = (save.goldenLicenses ?? 0) + newLicenses;
  save.lastUnixTime = Math.floor(Date.now() / 1000);
  persist();
  return newLicenses;
}

/** Billionaire = 1e9 AMD. */
export function isBillionaire() {
  return save.money >= 1e9;
}
