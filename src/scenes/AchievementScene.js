import { Scene } from 'phaser';
import { ACHIEVEMENTS, getUnlockedIds, getUnlockedCount } from '../game/AchievementManager.js';
import { GameSDK } from '../game/GameSDK.js';
import {
  UIConfig,
  applyTextPop,
  getTextStyle,
  getTitleStyle,
  drawPanelWithShadow,
} from '../ui/UIConfig.js';
import { isMobile, vibrate } from '../utils/mobile.js';

const PANEL_WIDTH = 520;
const CARD_SIZE = 100;
const CARD_GAP = 12;
const COLS = 4;
const HEADER_H = 72;
const SCROLL_H = 480;
const SLIDE_DURATION = 280;
const TOOLTIP_HOVER_DELAY = 120;

/** Achievements menu: slide-in from right, grid of cards, tooltip on hover. */
export default class AchievementScene extends Scene {
  constructor() {
    super({ key: 'Achievements' });
  }

  create() {
    GameSDK.gameplayStop();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    this._isMobile = isMobile();
    const mobile = this._isMobile;
    const panelW = mobile
      ? Math.min(w - 28, 400)
      : PANEL_WIDTH + 16;
    const panelH = mobile
      ? Math.min(h - 30, HEADER_H + Math.floor(h * 0.52) + 20)
      : HEADER_H + SCROLL_H + 24;
    const scrollH = mobile
      ? Math.max(180, panelH - HEADER_H - 24)
      : SCROLL_H;
    this._cols = mobile ? 3 : COLS;
    const gap = mobile ? 8 : CARD_GAP;
    const usableW = panelW - gap * 2 - 8;
    this._cardGap = gap;
    this._cardSize = mobile
      ? Phaser.Math.Clamp(
          Math.floor((usableW - gap * (this._cols - 1)) / this._cols),
          56,
          80
        )
      : CARD_SIZE;

    const startX = w + panelW / 2 + 40;
    const endX = w - panelW / 2 - UIConfig.padding.screen;
    this._panelOffscreenX = startX;

    this.panelContainer = this.add.container(startX, h / 2);
    this.panelContainer.setScrollFactor(0);

    this._panelW = panelW;
    this._panelH = panelH;
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
    this.panelContainer.add(g);

    const backBtn = this.createArcadeButton(
      -panelW / 2 + 44,
      -panelH / 2 + 36,
      80,
      this._isMobile ? 52 : 36,
      0x7b1fa2,
      'Back',
      () => this.close()
    );
    backBtn.list[1].setFontSize(14);
    this.panelContainer.add(backBtn);

    const title = this.add
      .text(0, -panelH / 2 + 36, 'Achievements', {
        ...getTitleStyle(),
        fontSize: mobile ? 22 : 26,
      })
      .setOrigin(0.5, 0.5);
    applyTextPop(title);
    this.panelContainer.add(title);

    const bonusPct = getUnlockedCount() * 2;
    this.bonusText = this.add
      .text(0, -panelH / 2 + 68, `Total Achievement Bonus: +${bonusPct}% Income`, {
        ...getTextStyle(),
        fontSize: mobile ? 12 : 14,
        color: UIConfig.colors.primaryButtonHex ?? '#FFB347',
      })
      .setOrigin(0.5, 0.5);
    this.panelContainer.add(this.bonusText);

    const scrollY = -panelH / 2 + HEADER_H + 8;

    const list = this.add.container(0, scrollY);
    list.setDepth(1);
    this.panelContainer.add(list);
    this.achievementList = list;

    const unlockedSet = new Set(getUnlockedIds());
    const rows = Math.ceil(ACHIEVEMENTS.length / this._cols);
    const contentH = rows * (this._cardSize + this._cardGap) + this._cardGap;
    this.achievementScrollStartY = list.y;
    this.achievementMaxScroll = Math.max(0, contentH - scrollH);
    this.achievementScrollOffset = 0;

    let cardIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < this._cols; col++) {
        if (cardIndex >= ACHIEVEMENTS.length) break;
        const a = ACHIEVEMENTS[cardIndex];
        const isUnlocked = unlockedSet.has(a.id);
        const cardX = -panelW / 2 + this._cardGap
          + (this._cardSize + this._cardGap) * col + this._cardSize / 2;
        const cardY = this._cardGap + (this._cardSize + this._cardGap) * row + this._cardSize / 2;
        const card = this.createAchievementCard(a, isUnlocked, cardX, cardY);
        list.add(card);
        cardIndex++;
      }
    }

    this.input.on('wheel', (pointer, go, dx, dy) => {
      this.achievementScrollOffset = Phaser.Math.Clamp(
        this.achievementScrollOffset + dy,
        0,
        this.achievementMaxScroll
      );
      list.y = this.achievementScrollStartY - this.achievementScrollOffset;
    });

    this.tweens.add({
      targets: this.panelContainer,
      x: endX,
      duration: SLIDE_DURATION,
      ease: 'Cubic.easeOut',
    });

    const bg = this.add
      .rectangle(w / 2, h / 2, w, h, 0x000000, 0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0);
    bg.setDepth(-1);
    bg.on('pointerdown', (pointer) => {
      const px = this.panelContainer.x;
      const py = this.panelContainer.y;
      const hw = this._panelW / 2;
      const hh = this._panelH / 2;
      if (pointer.x >= px - hw && pointer.x <= px + hw
          && pointer.y >= py - hh && pointer.y <= py + hh) {
        return;
      }
      this.close();
    });
    this.panelContainer.setDepth(0);
  }

  createAchievementCard(achievement, isUnlocked, x, y) {
    const card = this.add.container(x, y);
    const size = this._cardSize ?? CARD_SIZE;
    const half = size / 2;
    const borderColor = isUnlocked ? 0x4caf50 : 0x6b5b95;
    const bgColor = isUnlocked ? 0x2d2345 : 0x1e1629;
    const glowG = this.add.graphics();
    if (isUnlocked) {
      glowG.fillStyle(0x4caf50, 0.35);
      glowG.fillRoundedRect(-half - 4, -half - 4, size + 8, size + 8, 10);
    }
    glowG.fillStyle(bgColor, 1);
    glowG.fillRoundedRect(-half, -half, size, size, 8);
    glowG.lineStyle(3, borderColor, 1);
    glowG.strokeRoundedRect(-half, -half, size, size, 8);
    card.add(glowG);

    const icon = this.drawMedalIcon(achievement, isUnlocked);
    icon.setPosition(0, -8);
    card.add(icon);

    const nameText = this.add
      .text(0, half - 18, achievement.name, {
        ...getTextStyle(),
        fontSize: this._isMobile ? 10 : 11,
        color: isUnlocked ? '#ffffff' : '#b0a0c0',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    nameText.setWordWrapWidth(size - 8);
    card.add(nameText);

    if (!isUnlocked) {
      const lockG = this.add.graphics();
      lockG.fillStyle(0x000000, 0.55);
      lockG.fillRoundedRect(-half, -half, size, size, 8);
      lockG.fillStyle(0x9e9e9e, 1);
      lockG.fillRect(-8, -14, 16, 12);
      lockG.fillStyle(0x757575, 1);
      lockG.fillCircle(0, 2, 6);
      card.add(lockG);
    }

    const zone = this.add.zone(0, 0, size, size).setInteractive();
    zone.setOrigin(0.5);
    zone.on('pointerover', () => this.scheduleTooltip(achievement, card));
    zone.on('pointerout', () => this.hideTooltip());
    zone.on('pointerdown', (pointer, localX, localY, ev) => {
      if (ev && typeof ev.stopPropagation === 'function') {
        ev.stopPropagation();
      }
    });
    card.add(zone);

    card.setSize(size, size);
    card.achievementData = achievement;
    return card;
  }

  drawMedalIcon(achievement, isUnlocked) {
    const container = this.add.container(0, 0);
    const g = this.add.graphics();
    const alpha = isUnlocked ? 1 : 0.3;
    g.fillStyle(0x000000, 0.4 * alpha);
    g.fillCircle(2, 2, 20);
    g.fillStyle(0xffd700, alpha);
    g.fillCircle(0, 0, 18);
    g.lineStyle(2, 0xb8860b, alpha);
    g.strokeCircle(0, 0, 18);
    g.lineStyle(3, 0x8b6914, alpha);
    g.beginPath();
    g.moveTo(-6, 3);
    g.lineTo(0, -8);
    g.lineTo(6, 3);
    g.strokePath();
    container.add(g);
    return container;
  }

  scheduleTooltip(achievement, card) {
    this.hideTooltip();
    this._tooltipShowTimer = this.time.delayedCall(TOOLTIP_HOVER_DELAY, () => {
      this._tooltipShowTimer = null;
      this.showTooltip(achievement, card);
    });
  }

  hideTooltip() {
    if (this._tooltipShowTimer) {
      this._tooltipShowTimer.remove();
      this._tooltipShowTimer = null;
    }
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  showTooltip(achievement, card) {
    if (this.tooltip) this.tooltip.destroy();
    const msg = `${achievement.name}: ${achievement.lore}`;
    const style = {
      ...getTextStyle(),
      fontSize: 12,
      color: UIConfig.colors.textPrimary,
      wordWrap: { width: 220 },
      align: 'center',
    };
    const txt = this.add.text(0, 0, msg, style).setOrigin(0.5, 0.5);
    const pad = 10;
    const bg = this.add.graphics();
    const bw = txt.width + pad * 2;
    const bh = txt.height + pad * 2;
    bg.fillStyle(0x1a0a2e, 0.95);
    bg.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 6);
    bg.lineStyle(2, UIConfig.colors.primaryButton ?? 0xffb347, 1);
    bg.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 6);

    const size = this._cardSize ?? CARD_SIZE;
    const ty = this.achievementList.y + card.y - size / 2 - 50;
    this.tooltip = this.add.container(card.x, ty);
    this.tooltip.setScrollFactor(0);
    this.tooltip.add(bg);
    this.tooltip.add(txt);
    this.panelContainer.add(this.tooltip);
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
        fontSize: 16,
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

  close() {
    this.tweens.add({
      targets: this.panelContainer,
      x: this._panelOffscreenX ?? (this.cameras.main.width + this._panelW / 2 + 40),
      duration: SLIDE_DURATION,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.scene.stop('Achievements');
        GameSDK.gameplayStart();
      },
    });
  }
}
