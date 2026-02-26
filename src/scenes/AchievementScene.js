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

    const startX = w + PANEL_WIDTH / 2 + 40;
    const endX = w - PANEL_WIDTH / 2 - UIConfig.padding.screen;

    this.panelContainer = this.add.container(startX, h / 2);
    this.panelContainer.setScrollFactor(0);

    const panelW = PANEL_WIDTH + 16;
    const panelH = HEADER_H + SCROLL_H + 24;
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
      36,
      0x7b1fa2,
      'Back',
      () => this.close()
    );
    backBtn.list[1].setFontSize(14);
    this.panelContainer.add(backBtn);

    const title = this.add
      .text(0, -panelH / 2 + 36, 'Achievements', {
        ...getTitleStyle(),
        fontSize: 26,
      })
      .setOrigin(0.5, 0.5);
    applyTextPop(title);
    this.panelContainer.add(title);

    const bonusPct = getUnlockedCount() * 2;
    this.bonusText = this.add
      .text(0, -panelH / 2 + 68, `Total Achievement Bonus: +${bonusPct}% Income`, {
        ...getTextStyle(),
        fontSize: 14,
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
    const rows = Math.ceil(ACHIEVEMENTS.length / COLS);
    const contentH = rows * (CARD_SIZE + CARD_GAP) + CARD_GAP;
    this.achievementScrollStartY = list.y;
    this.achievementMaxScroll = Math.max(0, contentH - SCROLL_H);
    this.achievementScrollOffset = 0;

    let cardIndex = 0;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < COLS; col++) {
        if (cardIndex >= ACHIEVEMENTS.length) break;
        const a = ACHIEVEMENTS[cardIndex];
        const isUnlocked = unlockedSet.has(a.id);
        const cardX = -PANEL_WIDTH / 2 + CARD_GAP
          + (CARD_SIZE + CARD_GAP) * col + CARD_SIZE / 2;
        const cardY = CARD_GAP + (CARD_SIZE + CARD_GAP) * row + CARD_SIZE / 2;
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
    const half = CARD_SIZE / 2;
    const borderColor = isUnlocked ? 0x4caf50 : 0x6b5b95;
    const bgColor = isUnlocked ? 0x2d2345 : 0x1e1629;
    const glowG = this.add.graphics();
    if (isUnlocked) {
      glowG.fillStyle(0x4caf50, 0.35);
      glowG.fillRoundedRect(-half - 4, -half - 4, CARD_SIZE + 8, CARD_SIZE + 8, 10);
    }
    glowG.fillStyle(bgColor, 1);
    glowG.fillRoundedRect(-half, -half, CARD_SIZE, CARD_SIZE, 8);
    glowG.lineStyle(3, borderColor, 1);
    glowG.strokeRoundedRect(-half, -half, CARD_SIZE, CARD_SIZE, 8);
    card.add(glowG);

    const icon = this.drawMedalIcon(achievement, isUnlocked);
    icon.setPosition(0, -8);
    card.add(icon);

    const nameText = this.add
      .text(0, half - 18, achievement.name, {
        ...getTextStyle(),
        fontSize: 11,
        color: isUnlocked ? '#ffffff' : '#b0a0c0',
        align: 'center',
      })
      .setOrigin(0.5, 0.5);
    nameText.setWordWrapWidth(CARD_SIZE - 8);
    card.add(nameText);

    if (!isUnlocked) {
      const lockG = this.add.graphics();
      lockG.fillStyle(0x000000, 0.55);
      lockG.fillRoundedRect(-half, -half, CARD_SIZE, CARD_SIZE, 8);
      lockG.fillStyle(0x9e9e9e, 1);
      lockG.fillRect(-8, -14, 16, 12);
      lockG.fillStyle(0x757575, 1);
      lockG.fillCircle(0, 2, 6);
      card.add(lockG);
    }

    const zone = this.add.zone(0, 0, CARD_SIZE, CARD_SIZE).setInteractive();
    zone.setOrigin(0.5);
    zone.on('pointerover', () => this.scheduleTooltip(achievement, card));
    zone.on('pointerout', () => this.hideTooltip());
    zone.on('pointerdown', (pointer, localX, localY, ev) => {
      if (ev && typeof ev.stopPropagation === 'function') {
        ev.stopPropagation();
      }
    });
    card.add(zone);

    card.setSize(CARD_SIZE, CARD_SIZE);
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

    const ty = this.achievementList.y + card.y - CARD_SIZE / 2 - 50;
    this.tooltip = this.add.container(card.x, ty);
    this.tooltip.setScrollFactor(0);
    this.tooltip.add(bg);
    this.tooltip.add(txt);
    this.panelContainer.add(this.tooltip);
  }

  createArcadeButton(x, y, width, height, color, label, callback) {
    const container = this.add.container(x, y);
    const s = UIConfig.panel.buttonShadowOffset ?? 4;
    const r = UIConfig.panel.borderRadius;
    const bw = UIConfig.panel.borderWidth;
    const shadowAlpha = UIConfig.panel.buttonShadowAlpha ?? 0.45;
    const g = this.add.graphics();
    g.fillStyle(0x000000, shadowAlpha);
    g.fillRoundedRect(-width / 2 + s, -height / 2 + s, width, height, r);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, r);
    g.lineStyle(bw, 0x000000, 1);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, r);
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
    container.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    container.setScrollFactor(0);
    container.on('pointerdown', () => {
      container.setScale(UIConfig.button.scaleDown);
      callback();
    });
    container.on('pointerup', () => container.setScale(1));
    container.on('pointerout', () => container.setScale(1));
    return container;
  }

  close() {
    const w = this.cameras.main.width;
    this.tweens.add({
      targets: this.panelContainer,
      x: w + PANEL_WIDTH / 2 + 40,
      duration: SLIDE_DURATION,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.scene.stop('Achievements');
        GameSDK.gameplayStart();
      },
    });
  }
}
