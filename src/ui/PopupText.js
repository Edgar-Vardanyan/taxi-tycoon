import { applyTextPop, getTextStyle, UIConfig } from '../ui/UIConfig.js';
import { formatNumber } from '../utils/formatNumber.js';

/** Floating "+X AMD" text: Luckiest Guy, yellow, thick stroke; up 100px, fade 800ms, destroy. */
export function createPopupText(scene, x, y, amount) {
  const cfg = UIConfig.popupText;
  const txt = scene.add
    .text(x, y, `+${formatNumber(amount)} AMD`, {
      fontFamily: cfg.fontFamily || UIConfig.font.title,
      fontSize: cfg.fontSize || 22,
      color: cfg.color || '#FFD54F',
    })
    .setOrigin(0.5);
  txt.setStroke(UIConfig.stroke.textStroke, cfg.strokeThickness || 4);
  txt.setShadow(2, 2, UIConfig.stroke.shadowColor, 0);

  scene.tweens.add({
    targets: txt,
    y: y - (cfg.floatDistance ?? 100),
    alpha: 0,
    duration: cfg.duration ?? 800,
    ease: cfg.ease ?? 'Expo.easeOut',
    onComplete: () => {
      txt.destroy();
    },
  });

  return txt;
}

/** Red "-X AMD" near balance; fades out. */
export function createDeductionPopup(scene, x, y, amount) {
  const txt = scene.add
    .text(x, y, `-${formatNumber(amount)} AMD`, {
      ...getTextStyle(),
      fontSize: 18,
      color: '#ef5350',
    })
    .setOrigin(0, 0.5);
  applyTextPop(txt);

  scene.tweens.add({
    targets: txt,
    y: y - 30,
    alpha: 0,
    duration: 1200,
    ease: 'Sine.easeOut',
    onComplete: () => txt.destroy(),
  });

  return txt;
}
