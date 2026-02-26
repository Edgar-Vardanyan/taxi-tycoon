/**
 * Neubrutalism Arcade – Poki/CrazyGames premium mobile-first style.
 */
export const UIConfig = {
  colors: {
    bg: 0x2d0b5a,
    bgHex: '#2D0B5A',
    primaryButton: 0xffb347,
    primaryButtonHex: '#FFB347',
    primaryButtonBright: 0xffc266,
    progressBar: 0x00f5ff,
    progressBarHex: '#00F5FF',
    panelBorder: 0x000000,
    hardShadow: 0x000000,
    glassPurple: 0x4a148c,
    glassPurpleAlpha: 0.4,
    textPrimary: '#ffffff',
    textSecondary: '#e0d0f0',
    unaffordableHex: '#64748b',
  },
  panel: {
    borderWidth: 3,
    borderRadius: 20,
    shadowOffset: 6,
    buttonShadowAlpha: 0.4,
    buttonShadowOffset: 4,
  },
  padding: {
    screen: 24,
    hud: 16,
    button: 12,
    card: 12,
  },
  font: {
    title: '"Luckiest Guy", cursive',
    ui: '"Bungee", cursive',
    balanceSize: 26,
    incomeSize: 16,
    labelSize: 14,
    buttonSize: 16,
    cardTitleSize: 16,
    cardBonusSize: 12,
  },
  stroke: {
    textStroke: '#000000',
    textStrokeThickness: 1,
    shadowOffsetX: 2,
    shadowOffsetY: 2,
    shadowColor: '#000000',
    shadowBlur: 0,
  },
  button: {
    scaleDown: 0.95,
  },
  bar: {
    height: 10,
  },
  taxi: {
    clickScale: 1.2,
    clickDuration: 100,
    floatAmount: 10,
    floatDuration: 2000,
  },
  popupText: {
    floatDistance: 100,
    duration: 800,
    ease: 'Expo.easeOut',
    fontFamily: '"Luckiest Guy", cursive',
    fontSize: 22,
    color: '#FFD54F',
    strokeThickness: 4,
  },
  particles: {
    count: 6,
    countMin: 5,
    countMax: 8,
    gravityY: 400,
    speed: { min: 150, max: 300 },
    lifespan: 600,
    scale: { start: 0.6, end: 0 },
  },
  clickFeedback: {
    squashScaleX: 1.2,
    squashScaleY: 0.8,
    recoverDuration: 200,
    recoverEase: 'Expo.easeOut',
    rotationRange: 5,
    flashDuration: 50,
    flashAlpha: 0.8,
  },
};

export function applyTextPop(text) {
  text.setStroke(UIConfig.stroke.textStroke, UIConfig.stroke.textStrokeThickness);
  text.setShadow(
    UIConfig.stroke.shadowOffsetX,
    UIConfig.stroke.shadowOffsetY,
    UIConfig.stroke.shadowColor,
    UIConfig.stroke.shadowBlur
  );
  return text;
}

export function getTextStyle(overrides = {}) {
  return {
    fontFamily: UIConfig.font.ui,
    fontSize: UIConfig.font.labelSize,
    color: UIConfig.colors.textPrimary,
    ...overrides,
  };
}

export function getTitleStyle(overrides = {}) {
  return {
    fontFamily: UIConfig.font.title,
    fontSize: 24,
    color: UIConfig.colors.textPrimary,
    ...overrides,
  };
}

/** Draw hard shadow (black rect offset behind). */
export function drawPanelWithShadow(g, x, y, w, h, fillColor, fillAlpha) {
  const s = UIConfig.panel.shadowOffset;
  const r = UIConfig.panel.borderRadius;
  const bw = UIConfig.panel.borderWidth;
  g.fillStyle(UIConfig.colors.hardShadow, 1);
  g.fillRoundedRect(x + s, y + s, w, h, r);
  g.fillStyle(fillColor, fillAlpha);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(bw, UIConfig.colors.panelBorder, 1);
  g.strokeRoundedRect(x, y, w, h, r);
}
