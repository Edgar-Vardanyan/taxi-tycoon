import { Scene } from 'phaser';
import {
  getMoney,
  getClickValue,
  calculateIdleIncome,
  updateBalance,
  getOfflineEarnings,
  getOfflineSeconds,
  setSpeedBoost,
  getSpeedMultiplier,
  getSpeedBoostRemainingMs,
  getTotalEarnings,
  getTotalClicks,
  getMilestoneIndex,
  getNextMilestoneTarget,
  getPrevMilestoneTarget,
  advanceMilestone,
  addClick,
  getUpgradeLevel,
  getLevelsBought,
  getHighestUnlockedTierIndex,
  getGoldenLicenses,
  saveNow,
  setRushHour,
  getRushHourRemainingMs,
  SHOP_UPGRADE_IDS,
  MILESTONES,
} from '../game/GameState.js';
import { startAutoSave } from '../game/SaveService.js';
import { formatNumber } from '../utils/formatNumber.js';
import { GameSDK } from '../game/GameSDK.js';
import {
  UIConfig,
  applyTextPop,
  getTextStyle,
  drawPanelWithShadow,
} from '../ui/UIConfig.js';
import { createPopupText, createDeductionPopup } from '../ui/PopupText.js';
import { isMobile, isPortrait, vibrate } from '../utils/mobile.js';
import { getScaledFontSize } from '../utils/fontScale.js';
import TrafficManager from '../world/TrafficManager.js';
import { createLayeredBackground } from '../world/LayeredBackground.js';
import { createRoadLayer, updateRoadScroll } from '../world/roadLayer.js';
import {
  createCloudManager,
  updateClouds,
} from '../world/CloudManager.js';
import { createVignetteSprite } from '../world/vignette.js';
import * as AudioManager from '../audio/AudioManager.js';
import {
  trackClick,
  checkAndUnlock,
  getUnlockedCount,
} from '../game/AchievementManager.js';

const DEPTH = { background: -20, gameWorld: 0, ui: 100 };
const CAMERA_SWAY_AMOUNT = 2.5;
const CAMERA_SWAY_DURATION = 4000;
const PORTRAIT_TOP = 0.15;
const PORTRAIT_MID = 0.35;
const PORTRAIT_BOTTOM = 0.5;
const TAXI_VISUAL_RADIUS = 64;
const TIER_OVERLAY_COLORS = [
  0x2d0b5a,
  0x4caf50,
  0x8d6e63,
  0xffb347,
  0x00bcd4,
  0x9c27b0,
  0x00f5ff,
  0xffeb3b,
];

/** Primary gameplay. Neubrutalism Arcade style. */
export default class MainScene extends Scene {
  constructor() {
    super({ key: 'Main' });
  }

  create() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const cx = w / 2;
    this.camW = w;
    this.camH = h;
    this.firstClickDone = false;
    this.idleTimer = null;
    this.rewardCountdownText = null;
    this.sessionStartTime = Date.now();
    this._isMobile = isMobile();
    this._isPortrait = isPortrait();

    const roadY = h - h * 0.3;
    const taxiCy = this._isPortrait
      ? h * (PORTRAIT_TOP + PORTRAIT_MID / 2)
      : (this._isMobile ? h * 0.38 : roadY - 50);

    this.backgroundContainer = this.add.container(0, 0).setDepth(DEPTH.background);
    this.backgroundContainer.add(createLayeredBackground(this, w, h));
    if (this._isMobile && this.backgroundContainer.list.length >= 3) {
      this.backgroundContainer.list[1].setVisible(false);
      this.backgroundContainer.list[2].setVisible(false);
    }
    this.tierOverlay = this.add.rectangle(0, 0, w, h, 0x000000, 0);
    this.tierOverlay.setOrigin(0, 0);
    this.backgroundContainer.add(this.tierOverlay);

    this.gameWorldContainer = this.add.container(0, 0).setDepth(DEPTH.gameWorld);
    this.roadContainer = createRoadLayer(this, w, h);
    this.gameWorldContainer.add(this.roadContainer);
    this.trafficManager = new TrafficManager(
      this,
      this.gameWorldContainer,
      w,
      h
    );
    if (!this._isMobile) this.trafficManager.start();
    this.cloudContainer = createCloudManager(this, w, h);
    this.cloudContainer.setVisible(!this._isMobile);
    this.gameWorldContainer.add(this.cloudContainer);
    this.createTaxi(cx, taxiCy);
    this.gameWorldContainer.add(this.taxi);
    this.createParticleEmitter(cx, taxiCy);
    if (this.clickEmitter) this.gameWorldContainer.add(this.clickEmitter);

    this.uiContainer = this.add.container(0, 0).setDepth(DEPTH.ui);
    this.uiContainer.setScrollFactor(0);
    this.showOfflineEarnings();
    AudioManager.init(this);
    GameSDK.setMainScene(this);
    this.createInputShield(w, h);
    this.createHUD(w, h);
    this.createMilestoneBar(w, h);
    this.createStatsPanel(w, h);
    this.createNewsTicker(w, h);
    this.createAchievementsButton(w, h);
    this.createShopButton(w, h);
    this.createRewardedButton(w, h);
    const vignette = createVignetteSprite(this, w, h);
    this.uiContainer.add(vignette);
    this.createFlashOverlay(w, h);
    this.startIdleTimer();
    this.startRewardCountdownUpdate();
    this.startCameraSway();
    this.setupSpacebarInput();
    this.setupAudioUnlock();
    this.createSpaceHint(w, h);
    this.createExhaustEmitter();
    this.exhaustAccum = 0;

    startAutoSave(() => {
      if (this.createSavingIcon) this.createSavingIcon();
    });

    this.scheduleGoldenTaxiEvent();
    this.setupTabBlurMusic();
    this.setupResizeListener();
    this.createOrientationOverlay();

    this.events.on('flashBackground', this.runFlash, this);
    this.events.on('spendAmd', this.onSpendAmd, this);

    const shopScene = this.scene.get('Shop');
    if (shopScene) {
      shopScene.events.once('shutdown', () => {
        GameSDK.showAd();
        this.checkAchievements();
      });
    }

    this.applyMobileLayout();
    this.time.delayedCall(0, () => {
      this.camW = this.cameras.main.width;
      this.camH = this.cameras.main.height;
      this._isPortrait = isPortrait();
      this.applyMobileLayout();
    });
  }

  startCameraSway() {
    const cam = this.cameras.main;
    cam.scrollX = -CAMERA_SWAY_AMOUNT;
    cam.scrollY = -CAMERA_SWAY_AMOUNT * 0.6;
    this.tweens.add({
      targets: cam,
      scrollX: CAMERA_SWAY_AMOUNT,
      scrollY: CAMERA_SWAY_AMOUNT * 0.6,
      duration: CAMERA_SWAY_DURATION / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  update(time, delta) {
    if (this._volumeDragging && this._volumeSliderUpdate && this.input.activePointer) {
      const ptr = this.input.activePointer;
      const trackX = this._volumeSliderTrackX;
      const trackW = this._volumeSliderTrackW;
      const x = ptr.x - trackX;
      this._volumeSliderUpdate(x / trackW);
    }
    if (this.trafficManager) this.trafficManager.update(time, delta);
    updateClouds(this.cloudContainer, delta);
    updateRoadScroll(this.roadContainer, delta);
    if (this.tickerText) {
      this.tickerText.x -= (this.tickerSpeed * (delta || 16)) / 1000;
      if (this.tickerText.x < -((this.tickerWidth || 0) + 100)) {
        this.tickerText.x = this.camW + 50;
      }
    }
    this.updateSpaceHold(delta);
  }

  setupSpacebarInput() {
    const key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    key.on('down', (keyObj, event) => {
      if (event && event.repeat) return;
      if (GameSDK.isAdPlaying) return;
      AudioManager.unlock();
      this.performDriveAction(this.taxi);
    });
    key.on('up', () => {
      this.spaceHeld = false;
    });
    this.spaceKey = key;

    this._spacePrevent = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      e.preventDefault();
      if (e.repeat) return;
      if (GameSDK.isAdPlaying) return;
      AudioManager.unlock();
      if (
        this.scene.isActive('Main') &&
        !this.scene.isActive('Shop') &&
        this.taxi
      ) {
        this.performDriveAction(this.taxi);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('keydown', this._spacePrevent, true);
    }

    const canvas = this.sys.game.canvas;
    if (canvas && !canvas.hasAttribute('tabindex')) {
      canvas.setAttribute('tabindex', 1);
      canvas.focus();
    }
  }

  setupAudioUnlock() {
    this.input.once('pointerdown', () => AudioManager.unlock());
  }

  createSpaceHint(w, h) {
    const y = h - 52;
    this.spaceHintText = this.add
      .text(w / 2, y, '[SPACE] to Drive', {
        ...getTextStyle(),
        fontSize: 14,
        color: UIConfig.colors.textSecondary,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.uiContainer.add(this.spaceHintText);
    this.tweens.add({
      targets: this.spaceHintText,
      alpha: 0.5,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  createExhaustEmitter() {
    if (!this.textures.exists('particle_coin')) return;
    const taxi = this.taxi;
    if (!taxi) return;
    this.exhaustEmitter = this.add.particles(
      taxi.x,
      taxi.y + 40,
      'particle_coin',
      {
        lifespan: 400,
        frequency: -1,
        quantity: 1,
        scale: { start: 0.2, end: 0.4 },
        alpha: { start: 0.25, end: 0 },
        speedY: { min: -35, max: -15 },
        speedX: { min: -12, max: 12 },
        tint: 0x78909c,
      }
    );
    this.gameWorldContainer.add(this.exhaustEmitter);
  }

  updateSpaceHold(delta) {
    if (!this.spaceKey || !this.taxi) return;
    this.spaceHeld = this.spaceKey.isDown;
    if (!this.spaceHeld && this.taxi.defaultX !== undefined) {
      this.taxi.x = this.taxi.defaultX;
    }
  }

  runFlash() {
    if (!this.flashOverlay) return;
    this.flashOverlay.setAlpha(0.35);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 350,
    });
  }

  runLevelUpFlash() {
    if (!this.flashOverlay) return;
    this.flashOverlay.setAlpha(1);
    this.tweens.add({
      targets: this.flashOverlay,
      alpha: 0,
      duration: 100,
    });
  }

  onSpendAmd(amount) {
    const pad = UIConfig.padding.hud;
    const x = pad + 58 + 180;
    const y = pad + 18 + 12;
    const txt = createDeductionPopup(this, x, y, amount);
    this.uiContainer.add(txt);
    this.refreshHUD();
  }

  createFlashOverlay(w, h) {
    this.flashOverlay = this.add
      .rectangle(w / 2, h / 2, w, h, 0xffffff)
      .setScrollFactor(0)
      .setAlpha(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: false });
    this.uiContainer.add(this.flashOverlay);
  }

  showOfflineEarnings() {
    const earned = getOfflineEarnings();
    const seconds = getOfflineSeconds();
    if (earned <= 0 || seconds < 10) return;
    updateBalance(earned);
    const msg =
      'While you were stuck in Yerevan traffic (away), your drivers earned '
      + `you ${formatNumber(earned)} AMD!`;
    const t = this.add
      .text(this.camW / 2, 120, msg, {
        ...getTextStyle({ fontSize: 16 }),
        color: UIConfig.colors.primaryButtonHex,
        wordWrap: { width: this.camW - 80 },
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    applyTextPop(t);
    this.uiContainer.add(t);
    this.time.delayedCall(4500, () => t.destroy());
  }

  createInputShield(w, h) {
    // Invisible but blocks all clicks when visible. Depth 999999 so it steals events.
    // For Poki QA: set alpha to 0.5 to see semi-transparent grey; clicks do nothing.
    this.inputShield = this.add
      .rectangle(0, 0, w, h, 0x000000, 0.0001)
      .setOrigin(0, 0)
      .setDepth(999999)
      .setScrollFactor(0)
      .setVisible(false);
    this.inputShield.setInteractive({ useHandCursor: false });
  }

  createHUD(w, h) {
    const pad = UIConfig.padding.hud;
    const portrait = this._isPortrait;
    const dims = { width: w, height: h };
    const topZoneH = portrait ? h * PORTRAIT_TOP : pad + 80;
    const fs = getScaledFontSize(0.045, 26, dims);
    const fsSmall = getScaledFontSize(0.032, 16, dims);

    const pillW = portrait ? Math.min(w * 0.9, 400) : 300;
    const pillH = portrait ? 48 : 56;
    const topY = portrait ? h * 0.02 : pad + 4;
    const leftX = portrait ? w / 2 - pillW / 2 : pad + 4;

    const g = this.add.graphics().setScrollFactor(0);
    drawPanelWithShadow(
      g,
      leftX,
      topY,
      pillW,
      pillH,
      UIConfig.colors.glassPurple,
      UIConfig.colors.glassPurpleAlpha
    );
    this.uiContainer.add(g);

    const coinSize = portrait ? 22 : 28;
    const coinX = leftX + 20 + coinSize / 2;
    const coinY = topY + pillH / 2;
    const coinContainer = this.add.container(coinX, coinY);
    const coin = this.add.graphics();
    coin.fillStyle(0xffb347, 1);
    coin.fillCircle(0, 0, coinSize / 2 - 2);
    coin.lineStyle(2, 0xe65100, 1);
    coin.strokeCircle(0, 0, coinSize / 2 - 2);
    coinContainer.add(coin);
    coinContainer.setScrollFactor(0);
    this.uiContainer.add(coinContainer);
    this.coinIcon = coinContainer;

    this.tweens.add({
      targets: coinContainer,
      angle: 360,
      duration: 2000,
      repeat: -1,
      ease: 'Linear',
    });

    this.balanceText = this.add
      .text(leftX + 50, topY + (portrait ? 8 : 18), `Balance: ${formatNumber(getMoney())} AMD`, {
        ...getTextStyle(),
        fontSize: fs,
        color: UIConfig.colors.primaryButtonHex,
      })
      .setScrollFactor(0)
      .setOrigin(0, 0);
    applyTextPop(this.balanceText);
    this.uiContainer.add(this.balanceText);
    this.balancePillRight = leftX + pillW - 12;
    this.balanceTextLeft = leftX + 50;

    this.incomeText = this.add
      .text(leftX + 50, topY + (portrait ? 28 : 42), `${formatNumber(calculateIdleIncome())} AMD/sec`, {
        ...getTextStyle(),
        fontSize: fsSmall,
        color: UIConfig.colors.textSecondary,
      })
      .setScrollFactor(0)
      .setOrigin(0, 0);
    applyTextPop(this.incomeText);
    this.uiContainer.add(this.incomeText);

    const licenses = getGoldenLicenses();
    if (licenses > 0) {
      this.prestigeBadge = this.add
        .text(leftX + pillW + 10, topY + pillH / 2, `★ ${licenses}`, {
          ...getTextStyle(),
          fontSize: fsSmall,
          color: '#FFD700',
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0);
      this.uiContainer.add(this.prestigeBadge);
    }

    this.createSoundControls(w, h, pad);
  }

  createSavingIcon() {
    if (this.savingIcon) return;
    const pad = UIConfig.padding.screen;
    const x = this.camW - pad - 24;
    const y = pad + 24;
    const g = this.add.graphics().setScrollFactor(0).setDepth(1000);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(0, 0, 10);
    g.lineStyle(2, 0x4caf50, 1);
    g.strokeCircle(0, 0, 10);
    const container = this.add.container(x, y);
    container.add(g);
    this.uiContainer.add(container);
    this.savingIcon = container;
    this.savingIcon.setAlpha(1);
    this.tweens.add({
      targets: this.savingIcon,
      alpha: 0,
      duration: 1200,
      delay: 400,
      onComplete: () => {
        if (this.savingIcon) {
          this.savingIcon.destroy();
          this.savingIcon = null;
        }
      },
    });
  }

  createSoundControls(w, h, pad) {
    const portrait = this._isPortrait;
    const padRight = w - pad;
    const cy = portrait ? Math.floor(h * PORTRAIT_TOP + 26) : pad + 28;
    const trackW = 72;
    const trackH = 10;
    const btnW = 72;
    const gap = 16;
    const trackRight = padRight - 44 - btnW / 2 - gap;
    const trackX = trackRight - trackW;
    const trackY = cy - trackH / 2;

    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(0x000000, 0.4);
    g.fillRoundedRect(trackX, trackY, trackW, trackH, 4);
    g.fillStyle(UIConfig.colors.glassPurple ?? 0x4a148c, 0.8);
    const vol = AudioManager.getVolume();
    g.fillRoundedRect(trackX, trackY, trackW * vol, trackH, 4);
    this.uiContainer.add(g);

    const handle = this.add.graphics().setScrollFactor(0);
    const handleX = trackX + trackW * vol;
    handle.fillStyle(0xffb347, 1);
    handle.fillCircle(handleX, cy, 8);
    handle.lineStyle(2, 0x000000, 1);
    handle.strokeCircle(handleX, cy, 8);
    this.uiContainer.add(handle);

    const updateSlider = (v) => {
      const val = Math.max(0, Math.min(1, v));
      AudioManager.setVolume(val);
      g.clear();
      g.fillStyle(0x000000, 0.4);
      g.fillRoundedRect(trackX, trackY, trackW, trackH, 4);
      g.fillStyle(UIConfig.colors.glassPurple ?? 0x4a148c, 0.8);
      g.fillRoundedRect(trackX, trackY, trackW * val, trackH, 4);
      handle.clear();
      handle.fillStyle(0xffb347, 1);
      handle.fillCircle(trackX + trackW * val, cy, 8);
      handle.lineStyle(2, 0x000000, 1);
      handle.strokeCircle(trackX + trackW * val, cy, 8);
    };

    const hit = this.add.rectangle(
      trackX + trackW / 2,
      cy,
      trackW + 24,
      trackH + 24,
      0x000000,
      0
    ).setOrigin(0.5).setScrollFactor(0).setInteractive({ useHandCursor: true });
    this.uiContainer.add(hit);

    hit.on('pointerdown', (ptr) => {
      this._volumeDragging = true;
      const x = ptr.x - trackX;
      updateSlider(x / trackW);
    });

    this.input.on('pointerup', () => { this._volumeDragging = false; });
    this.input.on('pointerout', () => { this._volumeDragging = false; });

    this._volumeSliderTrackX = trackX;
    this._volumeSliderTrackW = trackW;
    this._volumeSliderUpdate = updateSlider;

    const muteX = padRight - 44;
    const updateLabel = (txt) => {
      txt.setText(AudioManager.isMuted() ? 'Unmute' : 'Mute');
    };
    const btn = this.createArcadeButton(
      muteX,
      cy,
      72,
      36,
      UIConfig.colors.glassPurple ?? 0x4a148c,
      AudioManager.isMuted() ? 'Unmute' : 'Mute',
      () => {
        AudioManager.toggleMute();
        updateLabel(btn.list[1]);
      }
    );
    btn.list[1].setFontSize(11);
    this.uiContainer.add(btn);
  }

  createMilestoneBar(w, h) {
    const pad = UIConfig.padding.hud;
    const portrait = this._isPortrait;
    const barY = portrait ? h * PORTRAIT_TOP - 8 : pad + 88;
    const barW = Math.min(300, w - pad * 2 - 20);
    const barH = UIConfig.bar.height;
    const prev = getPrevMilestoneTarget();
    const next = getNextMilestoneTarget();
    const total = getTotalEarnings();
    const progress =
      next > prev ? Math.min(1, Math.max(0, (total - prev) / (next - prev))) : 1;
    const fillW = (barW - 14) * progress;

    const g = this.add.graphics().setScrollFactor(0);
    drawPanelWithShadow(g, pad + 4, barY + 4, barW, barH, 0x1a0a30, 0.8);
    this.uiContainer.add(g);
    const fill = this.add.graphics();
    fill.fillStyle(UIConfig.colors.progressBar, 1);
    fill.fillRoundedRect(pad + 7, barY + 7, fillW, barH - 6, 4);
    fill.setScrollFactor(0);
    this.uiContainer.add(fill);

    this.milestoneBar = {
      fill,
      barW: barW - 14,
      barY: barY + 7,
      pad: pad + 7,
      barH: barH - 6,
    };
    const fsLabel = getScaledFontSize(0.028, 12, { width: w, height: h });
    this.milestoneBar.label = this.add
      .text(pad, barY - 2, `Next: ${formatNumber(next)} AMD`, {
        ...getTextStyle(),
        fontSize: fsLabel,
        color: UIConfig.colors.textSecondary,
      })
      .setScrollFactor(0);
    applyTextPop(this.milestoneBar.label);
    this.uiContainer.add(this.milestoneBar.label);

    const idx = getMilestoneIndex();
    const totalMilestones = MILESTONES.length;
    this.milestoneBar.counterText = this.add
      .text(pad + barW + 12, barY + barH / 2 - 2, `Milestone: ${idx + 1}/${totalMilestones}`, {
        ...getTextStyle(),
        fontSize: fsLabel,
        color: UIConfig.colors.textSecondary,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    applyTextPop(this.milestoneBar.counterText);
    this.uiContainer.add(this.milestoneBar.counterText);
  }

  createStatsPanel(w, h) {
    const pad = UIConfig.padding.hud;
    const left = pad;
    const top = this._isPortrait ? h * PORTRAIT_TOP + 20 : pad + 170;
    const panelW = 160;
    const panelH = 100;
    const g = this.add.graphics().setScrollFactor(0);
    drawPanelWithShadow(
      g,
      left,
      top,
      panelW,
      panelH,
      UIConfig.colors.glassPurple,
      UIConfig.colors.glassPurpleAlpha
    );
    this.uiContainer.add(g);
    g.setVisible(!this._isPortrait);
    this.statsPanelBg = g;

    const fs = getScaledFontSize(0.028, 12, { width: w, height: h });
    const style = {
      ...getTextStyle(),
      fontSize: fs,
      color: UIConfig.colors.textSecondary,
    };
    this.statsClicksText = this.add
      .text(left + 10, top + 12, `Clicks: ${formatNumber(getTotalClicks())}`, style)
      .setScrollFactor(0);
    this.statsClicksText.setVisible(!this._isPortrait);
    this.uiContainer.add(this.statsClicksText);
    this.statsUpgradesText = this.add
      .text(left + 10, top + 32, `Upgrades: ${getLevelsBought()}`, style)
      .setScrollFactor(0);
    this.statsUpgradesText.setVisible(!this._isPortrait);
    this.uiContainer.add(this.statsUpgradesText);
    this.statsEarningsText = this.add
      .text(left + 10, top + 52, `Lifetime: ${formatNumber(getTotalEarnings())} AMD`, style)
      .setScrollFactor(0);
    this.statsEarningsText.setVisible(!this._isPortrait);
    this.uiContainer.add(this.statsEarningsText);
    const bonusPct = getUnlockedCount() * 2;
    this.statsAchievementText = this.add
      .text(left + 10, top + 72, `Achievement: +${bonusPct}%`, style)
      .setScrollFactor(0);
    this.statsAchievementText.setVisible(!this._isPortrait);
    this.uiContainer.add(this.statsAchievementText);
  }

  createAchievementToast(achievement) {
    const w = this.cameras.main.width;
    const startY = -140;
    const showY = 88;
    const toastW = 320;
    const toastH = 72;
    const container = this.add.container(w / 2, startY);
    container.setScrollFactor(0).setDepth(10000);
    this.uiContainer.add(container);

    const bg = this.add.graphics();
    bg.fillStyle(0x1a0a2e, 0.95);
    bg.fillRoundedRect(-toastW / 2, 0, toastW, toastH, 12);
    bg.lineStyle(3, UIConfig.colors.primaryButton ?? 0xffb347, 1);
    bg.strokeRoundedRect(-toastW / 2, 0, toastW, toastH, 12);
    container.add(bg);

    const medalR = 22;
    const medalContainer = this.add.container(-toastW / 2 + 28, toastH / 2);
    const medal = this.add.graphics();
    medal.fillStyle(0x000000, 0.4);
    medal.fillCircle(2, 2, medalR + 2);
    medal.fillStyle(0xffd700, 1);
    medal.fillCircle(0, 0, medalR);
    medal.lineStyle(2, 0xb8860b, 1);
    medal.strokeCircle(0, 0, medalR);
    medal.lineStyle(4, 0x8b6914, 1);
    medal.beginPath();
    medal.moveTo(-8, 4);
    medal.lineTo(0, -10);
    medal.lineTo(8, 4);
    medal.strokePath();
    medalContainer.add(medal);
    container.add(medalContainer);

    const nameText = this.add
      .text(0, toastH / 2 - 10, achievement.name, {
        ...getTextStyle(),
        fontSize: 18,
        color: UIConfig.colors.primaryButtonHex ?? '#FFB347',
      })
      .setOrigin(0.5, 0.5);
    applyTextPop(nameText);
    container.add(nameText);

    const goalText = this.add
      .text(0, toastH / 2 + 14, achievement.goal, {
        ...getTextStyle(),
        fontSize: 12,
        color: UIConfig.colors.textSecondary,
      })
      .setOrigin(0.5, 0.5);
    container.add(goalText);

    AudioManager.playSFX('sfx_milestone');
    this.tweens.add({
      targets: medalContainer,
      scale: 1.2,
      angle: 360,
      duration: 500,
      ease: 'Back.easeOut',
    });
    this.tweens.add({
      targets: container,
      y: showY,
      duration: 400,
      ease: 'Back.easeOut',
    });
    this.time.delayedCall(3000, () => {
      this.tweens.add({
        targets: container,
        y: startY,
        duration: 350,
        ease: 'Back.easeIn',
        onComplete: () => container.destroy(),
      });
    });
  }

  createNewsTicker(w, h) {
    const headlines = [
      'Traffic jam at Republic Square!',
      'Gas prices down 5%!',
      'Best driver of the month: You!',
      'New taxi lane opens on Mashtots Ave.',
      'Passenger leaves 1000 AMD tip!',
      'Yerevan taxi app downloads surge.',
      'Driver of the day: anonymous hero.',
      'Free car wash at next milestone!',
    ];
    const tickerY = h - 20;
    const tickerH = 24;
    const g = this.add.graphics().setScrollFactor(0);
    g.fillStyle(0x000000, 0.5);
    g.fillRect(0, tickerY, w, tickerH);
    this.uiContainer.add(g);
    g.setVisible(!this._isPortrait);
    this.tickerBar = g;

    const fullText = headlines.join('    •    ');
    this.tickerText = this.add
      .text(w + 50, tickerY + tickerH / 2, fullText, {
        ...getTextStyle(),
        fontSize: 14,
        color: UIConfig.colors.textSecondary,
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0);
    this.tickerText.setVisible(!this._isPortrait);
    this.uiContainer.add(this.tickerText);
    this.tickerWidth = this.tickerText.width;
    this.tickerSpeed = 55;
  }

  getPrevMilestone() {
    const m = [0, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9];
    const money = getMoney();
    let prev = 0;
    for (let i = 0; i < m.length; i++) {
      if (money >= m[i]) prev = m[i];
    }
    return prev;
  }

  getNextMilestone() {
    const m = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10];
    const money = getMoney();
    for (let i = 0; i < m.length; i++) {
      if (money < m[i]) return m[i];
    }
    return 1e10;
  }

  createTaxi(cx, cy) {
    const radius = TAXI_VISUAL_RADIUS;
    const taxi = this.add.container(cx, cy);
    const gr = this.add.graphics();

    gr.fillStyle(0x000000, 0.5);
    gr.fillCircle(4, 6, radius + 6);
    gr.fillStyle(0xffb347, 1);
    gr.fillCircle(0, 0, radius);
    gr.fillStyle(0xffa726, 1);
    gr.fillCircle(0, -radius * 0.2, radius * 0.85);
    gr.lineStyle(3, 0xe65100, 1);
    gr.strokeCircle(0, 0, radius);
    gr.fillStyle(0x1a1a1a, 1);
    gr.fillRoundedRect(-22, 4, 44, 24, 4);
    gr.fillStyle(0x37474f, 1);
    gr.fillCircle(-14, 22, 10);
    gr.fillCircle(14, 22, 10);
    gr.lineStyle(2, 0x263238, 1);
    gr.strokeCircle(-14, 22, 10);
    gr.strokeCircle(14, 22, 10);

    taxi.add(gr);
    taxi.defaultX = cx;
    taxi.baseScale = 1;

    const hitRadius = this._isMobile ? radius + 24 : radius;
    gr.setInteractive(
      new Phaser.Geom.Circle(0, 0, hitRadius),
      Phaser.Geom.Circle.Contains,
      this._isMobile ? { pixelPerfect: false } : undefined
    );
    gr.on('pointerdown', () => this.performDriveAction(taxi));

    this.tweens.add({
      targets: taxi,
      y: cy + 3,
      duration: 2200,
      yoyo: true,
      ease: 'Sine.easeInOut',
      repeat: -1,
    });
    this.taxi = taxi;
  }

  createParticleEmitter(cx, cy) {
    if (!this.textures.exists('particle_coin')) return;
    const p = UIConfig.particles;
    this.clickEmitter = this.add.particles(cx, cy, 'particle_coin', {
      speed: { min: p.speed.min, max: p.speed.max },
      angle: { min: 0, max: 360 },
      scale: { start: p.scale.start, end: p.scale.end },
      lifespan: p.lifespan,
      frequency: -1,
      quantity: 1,
      gravityY: p.gravityY,
    });
  }

  createArcadeButton(x, y, width, height, color, label, callback) {
    const pad = this._isMobile ? (UIConfig.button.hitAreaPadding ?? 12) : 0;
    const minH = this._isMobile ? (UIConfig.button.minHeightMobile ?? 48) : 0;
    const h = minH > 0 && height < minH ? minH : height;
    const w = width + (pad * 2);
    const rect = new Phaser.Geom.Rectangle(-w / 2, -h / 2 - pad, w, h + pad * 2);

    const container = this.add.container(x, y);
    const g = this.add.graphics();
    const s = UIConfig.panel.buttonShadowOffset ?? 4;
    const r = UIConfig.panel.borderRadius;
    const bw = UIConfig.panel.borderWidth;
    const shadowAlpha = UIConfig.panel.buttonShadowAlpha ?? 0.45;
    g.fillStyle(0x000000, shadowAlpha);
    g.fillRoundedRect(-width / 2 + s, -h / 2 + s, width, h, r);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-width / 2, -h / 2, width, h, r);
    g.lineStyle(bw, 0x000000, 1);
    g.strokeRoundedRect(-width / 2, -h / 2, width, h, r);
    container.add(g);

    const txt = this.add
      .text(0, 0, label, {
        ...getTextStyle(),
        fontSize: UIConfig.font.buttonSize,
        color: '#ffffff',
      })
      .setOrigin(0.5);
    applyTextPop(txt);
    container.add(txt);

    container.setInteractive({
      hitArea: rect,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
      pixelPerfect: false,
    });
    container.setScrollFactor(0);

    const scaleDown = UIConfig.button.scaleDown ?? 0.95;
    container.on('pointerdown', () => {
      container.setScale(scaleDown);
      if (this._isMobile) vibrate(10);
      callback();
    });
    container.on('pointerup', () => container.setScale(1));
    container.on('pointerout', () => container.setScale(1));

    return container;
  }

  createShopButton(w, h) {
    const pad = UIConfig.padding.screen;
    const portrait = this._isPortrait;
    const btnH = this._isMobile ? 52 : 44;
    const y = portrait ? h * (1 - PORTRAIT_BOTTOM / 2) - 30 : h - pad - btnH / 2 - 12;
    const x = portrait ? w / 2 - 110 : w - pad - 55;
    const btn = this.createArcadeButton(
      x,
      y,
      100,
      btnH,
      UIConfig.colors.primaryButtonBright ?? UIConfig.colors.primaryButton,
      'Shop',
      () => this.scene.launch('Shop')
    );
    this.uiContainer.add(btn);
    this._shopBtn = btn;
  }

  createAchievementsButton(w, h) {
    const pad = UIConfig.padding.screen;
    const portrait = this._isPortrait;
    const btnH = this._isMobile ? 52 : 44;
    const y = portrait ? h * (1 - PORTRAIT_BOTTOM / 2) - 30 : h - pad - btnH / 2 - 12;
    const x = portrait ? w / 2 : w - pad - 170;
    const btn = this.createArcadeButton(
      x,
      y,
      100,
      btnH,
      UIConfig.colors.glassPurple ?? 0x4a148c,
      'Achievements',
      () => this.scene.launch('Achievements')
    );
    btn.list[1].setFontSize(12);
    this.uiContainer.add(btn);
    this._achievementsBtn = btn;
  }

  createRewardedButton(w, h) {
    const pad = UIConfig.padding.screen;
    const portrait = this._isPortrait;
    const btnH = this._isMobile ? 52 : 44;
    const yOff = portrait ? 0 : 68;
    const y = portrait ? h * (1 - PORTRAIT_BOTTOM / 2) + 25 : h - pad - 68 - btnH / 2;
    const x = portrait ? w / 2 + 110 : w - pad - 55;
    const btn = this.createArcadeButton(
      x,
      y,
      100,
      btnH,
      UIConfig.colors.primaryButtonBright ?? UIConfig.colors.primaryButton,
      '2x 60s',
      () => {
        GameSDK.rewardedAd().then((withReward) => {
          if (withReward) setSpeedBoost(60000);
        });
      }
    );
    this.uiContainer.add(btn);
    this._rewardedBtn = btn;
  }

  performDriveAction(taxi) {
    if (GameSDK.isAdPlaying) return;

    AudioManager.unlock();
    AudioManager.playSFX('sfx_click');

    trackClick(Date.now());

    if (!this.firstClickDone) {
      this.firstClickDone = true;
      GameSDK.gameplayStart();
    }

    addClick();
    const amount = getClickValue();
    updateBalance(amount);

    const p = UIConfig.particles;
    const useMobile = this._isMobile;
    const count = useMobile
      ? (p.countMinMobile !== undefined && p.countMaxMobile !== undefined
          ? p.countMinMobile +
            Math.floor(Math.random() * (p.countMaxMobile - p.countMinMobile + 1))
          : (p.countMobile ?? 3))
      : (p.countMin !== undefined && p.countMax !== undefined
          ? p.countMin +
            Math.floor(Math.random() * (p.countMax - p.countMin + 1))
          : p.count);
    if (this.clickEmitter) {
      this.clickEmitter.explode(count, taxi.x, taxi.y);
    }

    createPopupText(this, taxi.x, taxi.y - 15, amount);

    const fb = UIConfig.clickFeedback || {};
    const baseScale = taxi.baseScale ?? 1;
    taxi.setScale(
      baseScale * (fb.squashScaleX ?? 1.2),
      baseScale * (fb.squashScaleY ?? 0.8)
    );
    const rotDelta = (Math.random() * 2 - 1) * (fb.rotationRange ?? 5);
    const baseAngle = taxi.angle;
    taxi.angle = baseAngle + rotDelta;
    this.tweens.add({
      targets: taxi,
      scaleX: baseScale,
      scaleY: baseScale,
      angle: baseAngle,
      duration: fb.recoverDuration ?? 200,
      ease: fb.recoverEase ?? 'Expo.easeOut',
    });

    const flashDur = fb.flashDuration ?? 50;
    const flashAlpha = fb.flashAlpha ?? 0.8;
    const flashG = this.add.graphics();
    flashG.fillStyle(0xffffff, flashAlpha);
    flashG.fillCircle(0, 0, 72);
    flashG.setPosition(taxi.x, taxi.y);
    this.gameWorldContainer.add(flashG);
    this.tweens.add({
      targets: flashG,
      alpha: 0,
      duration: flashDur,
      onComplete: () => flashG.destroy(),
    });

    this.refreshHUD();
    this.checkAchievements();
  }

  getAchievementStats() {
    const upgradeLevels = {};
    for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
      const id = SHOP_UPGRADE_IDS[i];
      upgradeLevels[id] = getUpgradeLevel(id);
    }
    const sessionTimeSeconds = Math.floor(
      (Date.now() - (this.sessionStartTime || Date.now())) / 1000
    );
    return {
      totalClicks: getTotalClicks(),
      totalEarnings: getTotalEarnings(),
      levelsBought: getLevelsBought(),
      upgradeLevels,
      sessionTimeSeconds,
    };
  }

  checkAchievements() {
    const unlocked = checkAndUnlock(this.getAchievementStats());
    if (unlocked) {
      this.createAchievementToast(unlocked);
      this.refreshHUD();
    }
  }

  onTaxiClick(taxi) {
    this.performDriveAction(taxi);
  }

  startIdleTimer() {
    this.idleTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        const income = calculateIdleIncome();
        if (income > 0) updateBalance(income);
        this.refreshHUD();
        this.checkAchievements();
      },
      loop: true,
    });
  }

  startRewardCountdownUpdate() {
    this.time.addEvent({
      delay: 500,
      callback: () => this.updateRewardCountdown(),
      loop: true,
    });
  }

  updateRewardCountdown() {
    const remaining = getSpeedBoostRemainingMs();
    const rushRemaining = getRushHourRemainingMs();
    if (remaining <= 0 && rushRemaining <= 0) {
      if (this.rewardCountdownText) {
        this.rewardCountdownText.destroy();
        this.rewardCountdownText = null;
      }
      return;
    }
    const sec = remaining > 0
      ? Math.ceil(remaining / 1000)
      : Math.ceil(rushRemaining / 1000);
    const label = rushRemaining > 0
      ? `RUSH HOUR: ${sec}s`
      : `2x ${sec}s`;
    if (!this.rewardCountdownText) {
      this.rewardCountdownText = this.add
        .text(this.camW - UIConfig.padding.screen - 55, 98, label, {
          ...getTextStyle(),
          fontSize: rushRemaining > 0 ? 12 : 13,
          color: rushRemaining > 0 ? 0xffd700 : UIConfig.colors.progressBarHex,
        })
        .setOrigin(0.5)
        .setScrollFactor(0);
      applyTextPop(this.rewardCountdownText);
      this.uiContainer.add(this.rewardCountdownText);
    } else {
      this.rewardCountdownText.setText(label);
      this.rewardCountdownText.setColor(
        rushRemaining > 0 ? 0xffd700 : UIConfig.colors.progressBarHex
      );
    }
  }

  scheduleGoldenTaxiEvent() {
    const minMs = 2 * 60 * 1000;
    const maxMs = 4 * 60 * 1000;
    const delay = minMs + Math.random() * (maxMs - minMs);
    this.time.delayedCall(delay, () => {
      if (!this.scene.isActive('Main') || this.goldenTaxiSprite) return;
      this.spawnGoldenTaxi();
      this.scheduleGoldenTaxiEvent();
    });
  }

  spawnGoldenTaxi() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const y = h * 0.35 + Math.random() * (h * 0.3);
    const taxi = this.add.container(-80, y);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(2, 2, 28);
    g.fillStyle(0xffd700, 1);
    g.fillCircle(0, 0, 26);
    g.lineStyle(2, 0xb8860b, 1);
    g.strokeCircle(0, 0, 26);
    g.fillStyle(0x1a1a1a, 1);
    g.fillRoundedRect(-12, 2, 24, 14, 3);
    g.fillStyle(0x37474f, 1);
    g.fillCircle(-8, 18, 6);
    g.fillCircle(8, 18, 6);
    taxi.add(g);
    taxi.setScrollFactor(0).setDepth(500);
    taxi.setInteractive(new Phaser.Geom.Circle(0, 0, 30), Phaser.Geom.Circle.Contains);
    taxi.on('pointerdown', () => {
      setRushHour(30 * 1000);
      AudioManager.playSFX('sfx_milestone');
      if (this.goldenTaxiSprite) {
        this.goldenTaxiSprite.destroy();
        this.goldenTaxiSprite = null;
      }
      this.refreshHUD();
    });
    this.uiContainer.add(taxi);
    this.goldenTaxiSprite = taxi;
    this.tweens.add({
      targets: taxi,
      x: w + 100,
      duration: 6000,
      ease: 'Linear',
      onComplete: () => {
        if (this.goldenTaxiSprite === taxi) {
          this.goldenTaxiSprite.destroy();
          this.goldenTaxiSprite = null;
        }
      },
    });
  }

  setupTabBlurMusic() {
    if (typeof document === 'undefined') return;
    this._visibilityHandler = () => {
      if (document.hidden) {
        AudioManager.pauseMusic();
      } else {
        AudioManager.resumeMusic();
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }

  setupResizeListener() {
    this.scale.on('resize', () => {
      this.camW = this.cameras.main.width;
      this.camH = this.cameras.main.height;
      this._isPortrait = isPortrait();
      this.applyMobileLayout();
      this.updateOrientationOverlay();
    });
  }

  applyMobileLayout() {
    const w = this.camW;
    const h = this.camH;
    const pad = UIConfig.padding.screen;

    if (this._isPortrait) {
      const actionMidY = h * (PORTRAIT_TOP + PORTRAIT_MID / 2);
      if (this.taxi) {
        this.taxi.x = w / 2;
        this.taxi.defaultX = w / 2;
        this.taxi.y = actionMidY;
        const gamePortrait = w < h;
        const narrowMobile = gamePortrait && w <= 600;
        if (narrowMobile) {
          this.taxi.baseScale = 1;
        } else if (gamePortrait && w > 0) {
          const targetWidth = w * 0.8;
          const rawScale = targetWidth / (TAXI_VISUAL_RADIUS * 2);
          this.taxi.baseScale = Phaser.Math.Clamp(rawScale, 1, 1.15);
        } else {
          this.taxi.baseScale = 1;
        }
        this.taxi.setScale(this.taxi.baseScale);
      }
      if (this.clickEmitter) {
        this.clickEmitter.setPosition(w / 2, actionMidY);
      }
      const btnH = 52;
      const bottomZoneCenterY = h * (PORTRAIT_TOP + PORTRAIT_MID + PORTRAIT_BOTTOM / 2);
      if (this._shopBtn) {
        this._shopBtn.setPosition(w / 2 - 110, bottomZoneCenterY - 30);
      }
      if (this._achievementsBtn) {
        this._achievementsBtn.setPosition(w / 2, bottomZoneCenterY - 30);
      }
      if (this._rewardedBtn) {
        this._rewardedBtn.setPosition(w / 2 + 110, bottomZoneCenterY + 25);
      }
      if (this.milestoneBar && this.milestoneBar.label) {
        const barY = h * PORTRAIT_TOP - 8;
        this.milestoneBar.barY = barY + 7;
        this.milestoneBar.label.setY(barY - 2);
        this.milestoneBar.counterText.setY(barY + 4);
      }
      if (this.statsClicksText) {
        this.statsClicksText.setVisible(false);
        this.statsUpgradesText.setVisible(false);
        this.statsEarningsText.setVisible(false);
        this.statsAchievementText.setVisible(false);
      }
      if (this.statsPanelBg) this.statsPanelBg.setVisible(false);
      if (this.tickerText) this.tickerText.setVisible(false);
      if (this.tickerBar) this.tickerBar.setVisible(false);
      this.refreshHUD();
      return;
    }

    if (!this._isMobile) return;
    if (this.statsClicksText) {
      this.statsClicksText.setVisible(true);
      this.statsUpgradesText.setVisible(true);
      this.statsEarningsText.setVisible(true);
      this.statsAchievementText.setVisible(true);
    }
    if (this.statsPanelBg) this.statsPanelBg.setVisible(true);
    if (this.tickerText) this.tickerText.setVisible(true);
    if (this.tickerBar) this.tickerBar.setVisible(true);
    if (this.taxi) {
      this.taxi.x = w / 2;
      this.taxi.defaultX = w / 2;
      this.taxi.y = h * 0.38;
      this.taxi.baseScale = 1;
      this.taxi.setScale(this.taxi.baseScale);
    }
    if (this.clickEmitter) {
      this.clickEmitter.setPosition(w / 2, h * 0.38);
    }
    const btnH = 52;
    if (this._shopBtn) {
      this._shopBtn.setPosition(w - pad - 55, h - pad - btnH / 2 - 12);
    }
    if (this._achievementsBtn) {
      this._achievementsBtn.setPosition(w - pad - 170, h - pad - btnH / 2 - 12);
    }
    if (this._rewardedBtn) {
      this._rewardedBtn.setPosition(w - pad - 55, h - pad - 68 - btnH / 2);
    }
  }

  createOrientationOverlay() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this.orientationOverlay = this.add.container(0, 0).setDepth(10000);
    this.orientationOverlay.setScrollFactor(0);

    const bg = this.add
      .rectangle(w / 2, h / 2, w + 100, h + 100, 0x1a0a2e, 0.98);
    bg.setScrollFactor(0);
    this.orientationOverlay.add(bg);
    bg.setInteractive({ useHandCursor: false });
    bg.on('pointerdown', () => {});

    const icon = this.add.graphics();
    const cx = w / 2;
    const cy = h / 2 - 40;
    const phoneW = 48;
    const phoneH = 80;
    icon.lineStyle(4, 0xffb347, 1);
    icon.strokeRoundedRect(-phoneW / 2, -phoneH / 2, phoneW, phoneH, 8);
    icon.setPosition(cx, cy);
    this.orientationOverlay.add(icon);

    this.tweens.add({
      targets: icon,
      angle: 90,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const label = this.add
      .text(w / 2, h / 2 + 30, 'Please rotate to portrait', {
        ...getTextStyle(),
        fontSize: 20,
        color: UIConfig.colors.primaryButtonHex,
        align: 'center',
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    this.orientationOverlay.add(label);

    this.updateOrientationOverlay();
    if (typeof window !== 'undefined') {
      window.addEventListener('orientationchange', () => this.updateOrientationOverlay());
      window.addEventListener('resize', () => this.updateOrientationOverlay());
    }
  }

  updateOrientationOverlay() {
    const portrait = isPortrait();
    this.orientationOverlay.setVisible(this._isMobile && !portrait);
  }

  showRebirthToast(granted) {
    const msg = `Rebirth! +${granted} Golden License (permanent +${granted * 10}% income)`;
    const t = this.add
      .text(this.camW / 2, 100, msg, {
        ...getTextStyle(),
        fontSize: 18,
        color: 0xffd700,
      })
      .setOrigin(0.5)
      .setScrollFactor(0);
    applyTextPop(t);
    this.uiContainer.add(t);
    this.time.delayedCall(3500, () => t.destroy());
    this.refreshHUD();
  }

  refreshHUD() {
    this.balanceText.setText(`Balance: ${formatNumber(getMoney())} AMD`);
    const maxW = this.balancePillRight - this.balanceTextLeft;
    if (this.balanceText.width > maxW) {
      this.balanceText.setScale(maxW / this.balanceText.width);
    } else {
      this.balanceText.setScale(1);
    }

    const licenses = getGoldenLicenses();
    if (this.prestigeBadge) {
      this.prestigeBadge.setText(licenses > 0 ? `★ ${licenses}` : '');
      this.prestigeBadge.setVisible(licenses > 0);
    } else if (licenses > 0) {
      const pad = UIConfig.padding.hud;
      const pillH = 56;
      const pillW = 300;
      this.prestigeBadge = this.add
        .text(pad + 4 + pillW + 14, pad + pillH / 2 + 4, `★ ${licenses}`, {
          ...getTextStyle(),
          fontSize: 14,
          color: 0xffd700,
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0);
      this.uiContainer.add(this.prestigeBadge);
    }

    const tierIdx = getHighestUnlockedTierIndex();
    if (this.tierOverlay) {
      const color = TIER_OVERLAY_COLORS[Math.min(tierIdx, TIER_OVERLAY_COLORS.length - 1)];
      this.tierOverlay.setFillStyle(color, 0.02 + tierIdx * 0.012);
    }

    this.incomeText.setText(
      `${formatNumber(calculateIdleIncome())} AMD/sec`
    );

    if (this.statsClicksText) {
      this.statsClicksText.setText(`Clicks: ${formatNumber(getTotalClicks())}`);
      this.statsUpgradesText.setText(`Upgrades: ${getLevelsBought()}`);
      this.statsEarningsText.setText(
        `Lifetime: ${formatNumber(getTotalEarnings())} AMD`
      );
      const bonusPct = getUnlockedCount() * 2;
      this.statsAchievementText.setText(`Achievement: +${bonusPct}%`);
    }

    if (this.milestoneBar) {
      const prev = getPrevMilestoneTarget();
      const next = getNextMilestoneTarget();
      const total = getTotalEarnings();
      let progress =
        next > prev ? (total - prev) / (next - prev) : 1;
      progress = Math.max(0, Math.min(1, progress));

      const fillW = progress * this.milestoneBar.barW;
      this.milestoneBar.fill.clear();
      const isGlow = progress >= 0.9;
      this.milestoneBar.fill.fillStyle(
        UIConfig.colors.progressBar,
        isGlow ? 1 : 1
      );
      this.milestoneBar.fill.fillRoundedRect(
        this.milestoneBar.pad,
        this.milestoneBar.barY,
        fillW,
        this.milestoneBar.barH,
        4
      );
      if (isGlow && !this.milestoneBar.glowTween) {
        this.milestoneBar.glowTween = this.tweens.add({
          targets: this.milestoneBar.fill,
          alpha: 0.75,
          duration: 400,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });
      } else if (!isGlow && this.milestoneBar.glowTween) {
        this.milestoneBar.glowTween.remove();
        this.milestoneBar.glowTween = null;
        this.milestoneBar.fill.setAlpha(1);
      }

      this.milestoneBar.label.setText(`Next: ${formatNumber(next)} AMD`);
      const idx = getMilestoneIndex();
      this.milestoneBar.counterText.setText(
        `Milestone: ${idx + 1}/${MILESTONES.length}`
      );

      if (progress >= 1) {
        this.runLevelUpFlash();
        AudioManager.playSFX('sfx_milestone');
        do {
          advanceMilestone();
          const p = getPrevMilestoneTarget();
          const n = getNextMilestoneTarget();
          const tot = getTotalEarnings();
          progress = n > p ? (tot - p) / (n - p) : 0;
        } while (progress >= 1 && getMilestoneIndex() < MILESTONES.length - 1);
        this.refreshHUD();
      }
    }
  }
}
