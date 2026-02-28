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
import { getScaledFontSize } from '../utils/fontScale.js';

const CARD_HEIGHT = 98;
const CARD_HEIGHT_MOBILE = 110;
const CARD_PAD = 10;
const PANEL_WIDTH = 360;
const PANEL_HEIGHT = 440;
const BOTTOM_SHEET_RATIO = 0.5;
const LOCKED_MULTIPLIER = 2;
const SLIDE_UP_DURATION = 280;
const VISIBLE_CARDS_MOBILE = 3.5;
const CARD_WIDTH_PORTRAIT_RATIO = 0.95;
const SHOP_BTN_MIN_HEIGHT = 60;
const SCROLL_DRAG_THRESHOLD = 10;

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
    this._isPortrait = w < h;
    this._gameW = w;
    this._gameH = h;
    const useBottomSheet = this._isMobile;

    const bg = this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.7)
      .setInteractive({ useHandCursor: true, pixelPerfect: false })
      .setScrollFactor(0);
    bg.on('pointerdown', () => this.close());

    const panelW = this._isPortrait
      ? w * CARD_WIDTH_PORTRAIT_RATIO
      : Math.min(PANEL_WIDTH + 16, w - 32);
    const panelH = useBottomSheet
      ? Math.floor(h * BOTTOM_SHEET_RATIO)
      : PANEL_HEIGHT + 80;
    this._panelH = this._isPortrait
      ? Math.floor(h * 0.5)
      : (useBottomSheet ? Math.floor(h * BOTTOM_SHEET_RATIO) : panelH);
    const panelX = w / 2;
    const panelYEnd = useBottomSheet ? h - this._panelH / 2 : h / 2;
    const panelYStart = useBottomSheet ? h + this._panelH / 2 + 50 : panelYEnd;

    const cardH = this._isMobile ? CARD_HEIGHT_MOBILE : CARD_HEIGHT;
    const listWidth = this._isPortrait
      ? w * CARD_WIDTH_PORTRAIT_RATIO - 24
      : (this._isMobile ? w - 24 : Math.min(PANEL_WIDTH, w - 48));
    const visibleHeight = this._isPortrait
      ? this._panelH - 120
      : this._panelH - 100;
    const scrollHeight = visibleHeight;
    const contentHeight =
      SHOP_UPGRADE_IDS.length * (cardH + CARD_PAD) + CARD_PAD;
    const scrollY = -this._panelH / 2 + 100;

    const panelContainer = this.add.container(panelX, panelYStart);
    panelContainer.setScrollFactor(0);

    const g = this.add.graphics();
    drawPanelWithShadow(
      g,
      -panelW / 2,
      -this._panelH / 2,
      panelW,
      this._panelH,
      UIConfig.colors.glassPurple,
      UIConfig.colors.glassPurpleAlpha
    );
    g.setInteractive(
      new Phaser.Geom.Rectangle(-panelW / 2, -this._panelH / 2, panelW, this._panelH),
      Phaser.Geom.Rectangle.Contains,
      { pixelPerfect: false }
    );
    panelContainer.add(g);

    const titleY = -this._panelH / 2 + 28;
    const dims = { width: w, height: h };
    const titleFontSize = getScaledFontSize(0.045, 28, dims);
    const title = this.add
      .text(0, titleY, 'Shop', {
        ...getTitleStyle(),
        fontSize: titleFontSize,
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
    closeBtn.setDepth(100);
    closeBtn.setScrollFactor(0);

    const headerBlocker = this.add
      .rectangle(0, -this._panelH / 2 + 42, panelW + 20, 56, 0x000000, 0)
      .setInteractive({ useHandCursor: false, pixelPerfect: false })
      .setScrollFactor(0)
      .setDepth(9);
    panelContainer.add(headerBlocker);
    headerBlocker.on('pointerdown', () => {});

    panelContainer.add(closeBtn);

    if (canRebirth()) {
      const rebirthY = -this._panelH / 2 + 68;
      const licenses = Math.floor(getTotalEarnings() / 1e6);
      const btn = this.createArcadeButton(
        0,
        rebirthY,
        180,
        this._isMobile ? SHOP_BTN_MIN_HEIGHT : 36,
        0xffd700,
        `Rebirth (+${licenses} License)`,
        () => this.doRebirth()
      );
      btn.list[1].setFontSize(11);
      btn.setDepth(10);
      panelContainer.add(btn);
    }

    const listContainer = this.add.container(0, scrollY + CARD_PAD);
    listContainer.setDepth(0);
    const maskShape = this.make.graphics();
    maskShape.fillRect(
      panelX - listWidth / 2,
      panelYEnd + scrollY,
      listWidth,
      scrollHeight
    );
    const mask = maskShape.createGeometryMask();
    const list = this.add.container(0, 0);
    list.setMask(mask);
    listContainer.add(list);

    let cardY = 0;
    for (let i = 0; i < SHOP_UPGRADE_IDS.length; i++) {
      const card = this.createCard(
        SHOP_UPGRADE_IDS[i],
        cardY,
        listWidth - (this._isPortrait ? 16 : (this._isMobile ? 16 : 24)),
        cardH
      );
      list.add(card);
      cardY += cardH + CARD_PAD;
    }

    panelContainer.add(listContainer);

    if (this._isMobile) {
      const fadeH = 24;
      const topFade = this.add.graphics();
      topFade.fillStyle(0x1a0a2e, 0.9);
      topFade.fillRect(
        -listWidth / 2 - 10,
        -this._panelH / 2 + 100 - fadeH,
        listWidth + 20,
        fadeH
      );
      topFade.setScrollFactor(0);
      panelContainer.add(topFade);
      topFade.setDepth(5);

      const bottomFade = this.add.graphics();
      bottomFade.fillStyle(0x1a0a2e, 0.9);
      bottomFade.fillRect(
        -listWidth / 2 - 10,
        -this._panelH / 2 + 100 + scrollHeight,
        listWidth + 20,
        fadeH
      );
      bottomFade.setScrollFactor(0);
      panelContainer.add(bottomFade);
      bottomFade.setDepth(5);
    }

    this.panelContainer = panelContainer;
    this.list = list;
    this.listContainer = listContainer;
    this.listStartY = list.y;
    this.scrollOffset = 0;
    this.maxScroll = Math.max(0, contentHeight - scrollHeight);

    this.input.on('wheel', (p, go, dx, dy) => {
      this.scrollOffset = Phaser.Math.Clamp(
        this.scrollOffset + dy,
        0,
        this.maxScroll
      );
      list.y = this.listStartY - this.scrollOffset;
    });

    this._scrollPointerDown = false;
    this._scrollLastY = 0;
    this._scrollStartX = 0;
    this._scrollStartY = 0;
    this._isListDragging = false;
    this.input.on('pointerdown', (ptr) => {
      const px = ptr.x;
      const py = ptr.y;
      const inListX =
        px >= panelX - listWidth / 2 && px <= panelX + listWidth / 2;
      const inListY =
        py >= panelYEnd + scrollY && py <= panelYEnd + scrollY + scrollHeight;
      const inList = inListX && inListY;
      if (inList) {
        this._scrollPointerDown = true;
        this._isListDragging = false;
        this._scrollStartX = px;
        this._scrollStartY = py;
        this._scrollLastY = py;
      }
    });
    this.input.on('pointermove', (ptr) => {
      if (!this._scrollPointerDown || !ptr.isDown) return;
      const px = ptr.x;
      const py = ptr.y;
      const dragDx = px - this._scrollStartX;
      const dragDy = py - this._scrollStartY;
      if (!this._isListDragging) {
        const dist = Math.hypot(dragDx, dragDy);
        if (dist >= SCROLL_DRAG_THRESHOLD) this._isListDragging = true;
      }
      const dy = py - this._scrollLastY;
      this._scrollLastY = py;
      this.scrollOffset = Phaser.Math.Clamp(
        this.scrollOffset - dy,
        0,
        this.maxScroll
      );
      list.y = this.listStartY - this.scrollOffset;
    });
    this.input.on('pointerup', () => {
      this._scrollPointerDown = false;
      this.time.delayedCall(0, () => { this._isListDragging = false; });
    });
    this.input.on('pointerout', () => {
      this._scrollPointerDown = false;
      this._isListDragging = false;
    });

    this.add.existing(panelContainer);

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
    const compactBatchButton = this._isMobile
      && width <= 40
      && /^\d+$/.test(String(label));
    const minH = this._isMobile && !compactBatchButton
      ? (UIConfig.button.minHeightMobile ?? 48)
      : 0;
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
    });
    container.on('pointerup', () => {
      container.setScale(1);
      if (this._isListDragging) return;
      if (this._isMobile) vibrate(10);
      callback();
    });
    container.on('pointerout', () => container.setScale(1));
    return container;
  }

  createCard(id, y, cardW, cardH) {
    if (cardW == null) cardW = PANEL_WIDTH - 24;
    if (cardH == null) cardH = CARD_HEIGHT;
    const cfg = UPGRADES[id];
    const card = this.add.container(-cardW / 2, y);
    const dims = this._gameW != null
      ? { width: this._gameW, height: this._gameH }
      : null;
    const fsTitle = this._isMobile
      ? 11
      : (dims ? getScaledFontSize(0.028, 13, dims) : 13);
    const fsBonus = this._isMobile
      ? 9
      : (dims ? getScaledFontSize(0.024, 11, dims) : 11);
    const fsPrice = this._isMobile
      ? 10
      : (dims ? getScaledFontSize(0.026, 12, dims) : 12);
    const fsLock = dims ? getScaledFontSize(0.032, 14, dims) : 14;

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
    shadowG.fillRoundedRect(s, s, cardW, cardH, r);
    shadowG.fillStyle(UIConfig.colors.glassPurple, 0.35);
    shadowG.fillRoundedRect(0, 0, cardW, cardH, r);
    shadowG.lineStyle(bw, borderColor, 1);
    shadowG.strokeRoundedRect(0, 0, cardW, cardH, r);
    card.add(shadowG);

    const icon = this.createCardIcon(id, 34, cardH / 2);
    card.add(icon);

    const canAfford = money >= price;
    const progressToNext = price > 0 ? Math.min(1, money / price) : 1;

    const barW = cardW - 140;
    const barH = 5;
    const barX = 52;
    const barY = this._isMobile ? cardH - 66 : cardH - 28;
    const barBg = this.add.graphics();
    barBg.fillStyle(0x000000, 0.5);
    barBg.fillRoundedRect(barX, barY, barW, barH, 2);
    card.add(barBg);
    const barFill = this.add.graphics();
    barFill.fillStyle(UIConfig.colors.progressBar, 1);
    barFill.fillRoundedRect(barX, barY, barW * progressToNext, barH, 2);
    card.add(barFill);

    const maxTitleChars = this._isMobile ? 18 : 30;
    const titleValue = cfg.title.length > maxTitleChars
      ? `${cfg.title.slice(0, maxTitleChars - 1)}…`
      : cfg.title;
    const titleText = this.add.text(52, this._isMobile ? 6 : 8, titleValue, {
      ...getTextStyle(),
      fontSize: fsTitle,
      color: UIConfig.colors.textPrimary,
    });
    card.add(titleText);
    applyTextPop(titleText);

    const bonusText = this.getBonusText(id, level);
    const bonus = this.add.text(52, this._isMobile ? 20 : 26, bonusText, {
      ...getTextStyle(),
      fontSize: fsBonus,
      color: UIConfig.colors.textSecondary,
    });
    card.add(bonus);
    applyTextPop(bonus);

    const levelTxt = this.add.text(cardW - 8, 8, `Lv.${level}`, {
      ...getTextStyle(),
      fontSize: fsBonus,
      color: UIConfig.colors.textSecondary,
    });
    levelTxt.setOrigin(1, 0);
    card.add(levelTxt);
    applyTextPop(levelTxt);

    if (isLocked) {
      const lockTxt = this.add.text(cardW / 2, cardH / 2 - 6, 'Locked', {
        ...getTextStyle(),
        fontSize: fsLock,
        color: UIConfig.colors.textSecondary,
      }).setOrigin(0.5);
      card.add(lockTxt);
      const lockIcon = this.add.graphics();
      lockIcon.fillStyle(0x9e9e9e, 1);
      lockIcon.fillRect(-6, -8, 12, 10);
      lockIcon.fillStyle(0x757575, 1);
      lockIcon.fillCircle(0, 4, 5);
      lockIcon.setPosition(cardW / 2, cardH / 2 + 10);
      card.add(lockIcon);
      card.cardData = { id, isLocked: true };
      card.setSize(cardW, cardH);
      return card;
    }

    const priceTxt = this.add.text(
      52,
      this._isMobile ? cardH - 52 : cardH - 20,
      `${formatNumber(price)} AMD`,
      {
        ...getTextStyle(),
        fontSize: fsPrice,
        color: canAfford ? UIConfig.colors.primaryButtonHex : UIConfig.unaffordableHex,
      }
    );
    card.add(priceTxt);
    applyTextPop(priceTxt);

    const btnW = this._isMobile ? 36 : 34;
    const btnH = this._isMobile ? 34 : 20;
    const btnY = this._isMobile ? cardH - 22 : cardH - 16;
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
      btn.list[1].setFontSize(this._isMobile ? 8 : 10);
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
      new Phaser.Geom.Rectangle(0, 0, cardW, cardH),
      Phaser.Geom.Rectangle.Contains
    );
    shadowG.on('pointerdown', () => {
      if (isLocked) return;
      card.setScale(0.98);
    });
    shadowG.on('pointerup', () => {
      card.setScale(1);
      if (isLocked || this._isListDragging) return;
      this.tryBuy(id, card);
    });
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
    card.setSize(cardW, cardH);
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
