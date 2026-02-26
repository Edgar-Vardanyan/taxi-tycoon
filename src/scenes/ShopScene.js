import { Scene } from 'phaser';
import {
  UPGRADES,
  SHOP_UPGRADE_IDS,
  getMoney,
  getUpgradeLevel,
  getUpgradePrice,
  getBatchCost,
  buyUpgrade,
  buyUpgradeMultiple,
  getMultiplier,
  getCategoryBorderColor,
  canRebirth,
  resetForGoldenLicense,
  getGoldenLicenses,
  getTotalEarnings,
} from '../game/GameState.js';
import { formatNumber } from '../utils/formatNumber.js';
import { GameSDK } from '../game/GameSDK.js';
import {
  UIConfig,
  applyTextPop,
  getTextStyle,
  getTitleStyle,
  drawPanelWithShadow,
} from '../ui/UIConfig.js';
import * as AudioManager from '../audio/AudioManager.js';
import { isMobile, vibrate } from '../utils/mobile.js';

const CARD_HEIGHT = 98;
const CARD_PAD = 10;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 440;
const BOTTOM_SHEET_RATIO = 0.6;
const LOCKED_MULTIPLIER = 2;
const SLIDE_UP_DURATION = 280;

/** Shop overlay. Neubrutalism Arcade – glass cards, per-card progress bar. */
export default class ShopScene extends Scene {
  constructor() {
    super({ key: 'Shop' });
  }

  create() {
    GameSDK.gameplayStop();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this._isMobile = isMobile();
    const useBottomSheet = this._isMobile;

    const bg = this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
      .setInteractive({ useHandCursor: true, pixelPerfect: false })
      .setScrollFactor(0);
    bg.on('pointerdown', () => this.close());

    const panelW = Math.min(PANEL_WIDTH + 16, w - 32);
    const panelH = useBottomSheet
      ? Math.floor(h * BOTTOM_SHEET_RATIO)
      : PANEL_HEIGHT + 80;
    const panelX = w / 2;
    const panelYEnd = useBottomSheet ? h - panelH / 2 : h / 2;
    const panelYStart = useBottomSheet ? h + panelH / 2 + 50 : panelYEnd;

    const panelContainer = this.add.container(panelX, panelYStart);
    panelContainer.setScrollFactor(0);

    const g = this.add.graphics();
    drawPanelWithShadow(
      g,
      -panelW / 2,
      -panelH / 2,
      panelW,
      panelH,
      UIConfig.colors.glassPurple,
      UIConfig.colors.glassPurpleAlpha
    );
    g.setInteractive(
      new Phaser.Geom.Rectangle(-panelW / 2, -panelH / 2, panelW, panelH),
      Phaser.Geom.Rectangle.Contains,
      { pixelPerfect: false }
    );
    panelContainer.add(g);

    const titleY = -panelH / 2 + 28;
    const title = this.add
      .text(0, titleY, 'Shop', {
        ...getTitleStyle(),
        fontSize: 28,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(10);
    panelContainer.add(title);

    const closeBtn = this.createArcadeButton(
      panelW / 2 - 24,
      titleY,
      48,
      48,
      0x7b1fa2,
      '×',
      () => this.close()
    );
    closeBtn.list[1].setFontSize(24);
    closeBtn.setDepth(10);
    panelContainer.add(closeBtn);

    const headerBlocker = this.add
      .rectangle(0, -panelH / 2 + 42, panelW + 20, 56, 0x000000, 0)
      .setInteractive({ useHandCursor: false, pixelPerfect: false })
      .setScrollFactor(0)
      .setDepth(9);
    panelContainer.add(headerBlocker);
    headerBlocker.on('pointerdown', () => {});

    if (canRebirth()) {
      const rebirthY = -panelH / 2 + 68;
      const licenses = Math.floor(getTotalEarnings() / 1e6);
      const btn = this.createArcadeButton(
        0,
        rebirthY,
        180,
        this._isMobile ? 52 : 36,
        0xffd700,
        `Rebirth (+${licenses} License)`,
        () => this.doRebirth()
      );
      btn.list[1].setFontSize(11);
      btn.setDepth(10);
      panelContainer.add(btn);
    }

    const scrollHeight = panelH - 100;
    const contentHeight =
      SHOP_UPGRADE_IDS.length * (CARD_HEIGHT + CARD_PAD) + CARD_PAD;
    const scrollY = -panelH / 2 + 100;
    const listWidth = Math.min(PANEL_WIDTH, w - 48);

    const maskShape = this.make.graphics();
    maskShape.fillRect(
      panelX - listWidth / 2,
      panelYEnd + scrollY,
      listWidth,
      scrollHeight
    );
    const mask = maskShape.createGeometryMask();

    const list = this.add.container(0, scrollY + CARD_PAD);
    list.setMask(mask);
    list.setDepth(0);

    let cardY = 0;
    for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
      const card = this.createCard(SHOP_UPGRADE_IDS[i], cardY, listWidth - 24);
      list.add(card);
      cardY += CARD_HEIGHT + CARD_PAD;
    }

    panelContainer.add(list);
    this.panelContainer = panelContainer;
    this.list = list;
    this.listStartY = list.y;
    this.scrollOffset = 0;
    this.maxScroll = Math.max(0, contentHeight - scrollHeight);

    this.input.on('wheel', (p, go, dx, dy) => {
      this.scrollOffset = Phaser.Math.Clamp(
        this.scrollOffset + dy,
        0,
        this.maxScroll
      );
      list.y = this.listStartY + CARD_PAD - this.scrollOffset;
    });

    this.input.on('pointermove', (ptr, x, y) => {
      if (!ptr.isDown) return;
      this.scrollOffset = Phaser.Math.Clamp(
        this.scrollOffset - ptr.velocity.y * 0.3,
        0,
        this.maxScroll
      );
      list.y = this.listStartY + CARD_PAD - this.scrollOffset;
    });

    this.add.existing(panelContainer);
    this._panelH = panelH;

    this.tweens.add({
      targets: panelContainer,
      y: panelYEnd,
      duration: SLIDE_UP_DURATION,
      ease: 'Cubic.easeOut',
    });
  }

  doRebirth() {
    const granted = resetForGoldenLicense();
    this.close();
    const main = this.scene.get('Main');
    if (main && typeof main.showRebirthToast === 'function') {
      main.showRebirthToast(granted);
    }
  }

  createArcadeButton(x, y, width, height, color, label, callback) {
    const pad = this._isMobile ? (UIConfig.button.hitAreaPadding ?? 12) : 0;
    const minH = this._isMobile ? (UIConfig.button.minHeightMobile ?? 48) : 0;
    const h = minH > 0 && height < minH ? minH : height;
    const rect = new Phaser.Geom.Rectangle(
      -width / 2 - pad,
      -h / 2 - pad,
      width + pad * 2,
      h + pad * 2
    );

    const container = this.add.container(x, y);
    const s = UIConfig.panel.buttonShadowOffset ?? 4;
    const r = UIConfig.panel.borderRadius;
    const bw = UIConfig.panel.borderWidth;
    const shadowAlpha = UIConfig.panel.buttonShadowAlpha ?? 0.45;
    const g = this.add.graphics();
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
        fontSize: 18,
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

  createCard(id, y, cardW) {
    if (cardW == null) cardW = PANEL_WIDTH - 24;
    const cfg = UPGRADES[id];
    const card = this.add.container(-cardW / 2, y);

    const level = getUpgradeLevel(id);
    const price = getUpgradePrice(id);
    const money = getMoney();
    const isLocked = price > LOCKED_MULTIPLIER * money && money < price;
    const borderColor = getCategoryBorderColor(id);

    const shadowG = this.add.graphics();
    const s = UIConfig.panel.shadowOffset;
    const r = UIConfig.panel.borderRadius;
    const bw = UIConfig.panel.borderWidth;
    shadowG.fillStyle(0x000000, 1);
    shadowG.fillRoundedRect(s, s, cardW, CARD_HEIGHT, r);
    shadowG.fillStyle(UIConfig.colors.glassPurple, 0.35);
    shadowG.fillRoundedRect(0, 0, cardW, CARD_HEIGHT, r);
    shadowG.lineStyle(bw, borderColor, 1);
    shadowG.strokeRoundedRect(0, 0, cardW, CARD_HEIGHT, r);
    card.add(shadowG);

    const icon = this.createCardIcon(id, 34, CARD_HEIGHT / 2);
    card.add(icon);

    const canAfford = money >= price;
    const progressToNext = price > 0 ? Math.min(1, money / price) : 1;

    const barW = cardW - 140;
    const barH = 5;
    const barX = 52;
    const barY = CARD_HEIGHT - 28;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.5);
    barBg.fillRoundedRect(barX, barY, barW, barH, 2);
    card.add(barBg);
    const barFill = this.add.graphics();
    barFill.fillStyle(UIConfig.colors.progressBar, 1);
    barFill.fillRoundedRect(barX, barY, barW * progressToNext, barH, 2);
    card.add(barFill);

    const titleText = this.add.text(52, 8, cfg.title, {
      ...getTextStyle(),
      fontSize: 13,
      color: UIConfig.colors.textPrimary,
    });
    card.add(titleText);
    applyTextPop(titleText);

    const bonusText = this.getBonusText(id, level);
    const bonus = this.add.text(52, 26, bonusText, {
      ...getTextStyle(),
      fontSize: 11,
      color: UIConfig.colors.textSecondary,
    });
    card.add(bonus);
    applyTextPop(bonus);

    const levelTxt = this.add.text(cardW - 8, 8, `Lv.${level}`, {
      ...getTextStyle(),
      fontSize: 11,
      color: UIConfig.colors.textSecondary,
    });
    levelTxt.setOrigin(1, 0);
    card.add(levelTxt);
    applyTextPop(levelTxt);

    if (isLocked) {
      const lockTxt = this.add.text(cardW / 2, CARD_HEIGHT / 2 - 6, 'Locked', {
        ...getTextStyle(),
        fontSize: 14,
        color: UIConfig.colors.textSecondary,
      }).setOrigin(0.5);
      card.add(lockTxt);
      const lockIcon = this.add.graphics();
      lockIcon.fillStyle(0x9e9e9e, 1);
      lockIcon.fillRect(-6, -8, 12, 10);
      lockIcon.fillStyle(0x757575, 1);
      lockIcon.fillCircle(0, 4, 5);
      lockIcon.setPosition(cardW / 2, CARD_HEIGHT / 2 + 10);
      card.add(lockIcon);
      card.cardData = { id, isLocked: true };
      card.setSize(cardW, CARD_HEIGHT);
      return card;
    }

    const priceTxt = this.add.text(52, CARD_HEIGHT - 20, `${formatNumber(price)} AMD`, {
      ...getTextStyle(),
      fontSize: 12,
      color: canAfford ? UIConfig.colors.primaryButtonHex : UIConfig.unaffordableHex,
    });
    card.add(priceTxt);
    applyTextPop(priceTxt);

    const btnW = this._isMobile ? 44 : 34;
    const btnH = this._isMobile ? 48 : 20;
    const btnY = CARD_HEIGHT - 16;
    const gap = 4;
    const x100 = cardW - 8 - btnW / 2;
    const x10 = x100 - btnW - gap;
    const x1 = x10 - btnW - gap;
    const batchConfig = [
      { x: x1, count: 1 },
      { x: x10, count: 10 },
      { x: x100, count: 100 },
    ];
    const batchButtons = [];
    for (let i = 0; i < batchConfig.length; i++) {
      const { x, count } = batchConfig[i];
      const cost = count === 1 ? price : getBatchCost(id, count);
      const afford = money >= cost;
      const btn = this.createArcadeButton(x, btnY, btnW, btnH,
        afford ? 0x4caf50 : 0x555555,
        String(count),
        () => this.tryBatchBuy(id, card, count)
      );
      btn.list[1].setFontSize(10);
      card.add(btn);
      batchButtons.push(btn);
    }

    if (!canAfford) {
      card.setAlpha(0.6);
      icon.setAlpha(0.7);
    } else {
      this.tweens.add({
        targets: icon,
        scale: 1.05,
        duration: 500,
        yoyo: true,
        ease: 'Sine.easeInOut',
        repeat: -1,
      });
    }

    shadowG.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, cardW, CARD_HEIGHT),
      Phaser.Geom.Rectangle.Contains
    );
    shadowG.on('pointerdown', () => {
      if (isLocked) return;
      card.setScale(0.98);
      this.tryBuy(id, card);
    });
    shadowG.on('pointerup', () => card.setScale(1));
    shadowG.on('pointerout', () => card.setScale(1));

    card.cardData = {
      id,
      priceTxt,
      bonus,
      levelTxt,
      icon,
      barFill,
      barW,
      barX,
      barY,
      barH,
      batchConfig,
      batchButtons,
      batchBtnY: btnY,
      batchBtnW: btnW,
      batchBtnH: btnH,
      isLocked: false,
    };
    card.setSize(cardW, CARD_HEIGHT);
    return card;
  }

  tryBatchBuy(id, card, count) {
    const money = getMoney();
    const cost = count === 1 ? getUpgradePrice(id) : getBatchCost(id, count);
    if (money < cost) return;
    const { bought, totalSpent } = buyUpgradeMultiple(id, count);
    if (bought === 0) return;
    AudioManager.playSFX('sfx_buy');
    this.refreshAllCards();
    this.scene.get('Main').events.emit('flashBackground');
    this.scene.get('Main').events.emit('spendAmd', totalSpent);
  }

  refreshAllCards() {
    const cards = this.list.list;
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      if (card.cardData && card.cardData.id != null) {
        this.refreshCard(card, card.cardData.id);
      }
    }
  }

  refreshCard(card, id) {
    const d = card.cardData;
    if (d.isLocked) return;
    const level = getUpgradeLevel(id);
    const price = getUpgradePrice(id);
    const money = getMoney();
    const canAfford = money >= price;
    const progressToNext = price > 0 ? Math.min(1, money / price) : 1;
    d.priceTxt.setText(`${formatNumber(price)} AMD`);
    d.priceTxt.setColor(
      canAfford ? UIConfig.colors.primaryButtonHex : UIConfig.unaffordableHex
    );
    d.bonus.setText(this.getBonusText(id, level));
    d.levelTxt.setText(`Lv.${level}`);
    d.barFill.clear();
    d.barFill.fillStyle(UIConfig.colors.progressBar, 1);
    d.barFill.fillRoundedRect(d.barX, d.barY, d.barW * progressToNext, d.barH, 2);

    for (let i = 0; i < d.batchButtons.length; i++) {
      d.batchButtons[i].destroy();
    }
    d.batchButtons.length = 0;
    for (let i = 0; i < d.batchConfig.length; i++) {
      const { x, count } = d.batchConfig[i];
      const cost = count === 1 ? price : getBatchCost(id, count);
      const afford = money >= cost;
      const btn = this.createArcadeButton(
        x,
        d.batchBtnY,
        d.batchBtnW,
        d.batchBtnH,
        afford ? 0x4caf50 : 0x555555,
        String(count),
        () => this.tryBatchBuy(id, card, count)
      );
      btn.list[1].setFontSize(10);
      card.add(btn);
      d.batchButtons.push(btn);
    }

    if (canAfford) {
      card.setAlpha(1);
      d.icon.setAlpha(1);
      if (!this.tweens.isTweening(d.icon)) {
        this.tweens.add({
          targets: d.icon,
          scale: 1.05,
          duration: 500,
          yoyo: true,
          ease: 'Sine.easeInOut',
          repeat: -1,
        });
      }
    } else {
      card.setAlpha(0.6);
      d.icon.setAlpha(0.7);
      this.tweens.killTweensOf(d.icon);
      d.icon.setScale(1);
    }
  }

  createCardIcon(id, x, y) {
    const container = this.add.container(x, y);
    const g = this.add.graphics();
    const color = getCategoryBorderColor(id);
    g.fillStyle(0x000000, 0.4);
    g.fillCircle(0, 2, 16);
    g.fillStyle(color, 1);
    g.fillCircle(0, 0, 14);
    g.lineStyle(2, 0x000000, 0.5);
    g.strokeCircle(0, 0, 14);
    container.add(g);
    return container;
  }

  getBonusText(id, level) {
    const cfg = UPGRADES[id];
    if (!cfg) return '';
    if (cfg.amdPerSecond != null) {
      const perSec = cfg.amdPerSecond * getMultiplier();
      return `${formatNumber(perSec * level)} AMD/sec`;
    }
    if (cfg.perClickBonus != null) {
      const perClick = cfg.perClickBonus * level;
      return `+${perClick} per click`;
    }
    if (cfg.multiplierPercent != null) {
      const mult = (1 + level * cfg.multiplierPercent).toFixed(2);
      return `×${mult} income`;
    }
    return '';
  }

  tryBuy(id, card) {
    const pricePaid = getUpgradePrice(id);
    if (!buyUpgrade(id)) return;
    AudioManager.playSFX('sfx_buy');
    this.refreshAllCards();
    this.scene.get('Main').events.emit('flashBackground');
    this.scene.get('Main').events.emit('spendAmd', pricePaid);
  }

  close() {
    if (this.panelContainer && this._isMobile && this._panelH) {
      const h = this.cameras.main.height;
      this.tweens.add({
        targets: this.panelContainer,
        y: h + this._panelH / 2 + 50,
        duration: SLIDE_UP_DURATION,
        ease: 'Cubic.easeIn',
        onComplete: () => this.scene.stop('Shop'),
      });
    } else {
      this.scene.stop('Shop');
    }
  }
}
