# Yerevan Taxi Tycoon

Phaser 3 clicker game. Click the taxi to earn AMD; buy upgrades in the Shop.

## Run

- `npm install`
- `npm run dev` → http://localhost:5173
- `npm run build` → `dist/`

## Features

- **Boot / Preload / Main** scenes; placeholder taxi (circle); clicker + balance HUD
- **Shop** overlay: scrollable list, 3 upgrades (New Driver, Better Tires, Fuel Additive), price = Base × 1.15^Level
- **Juice**: taxi squash-and-stretch, particle burst on click, floating “+X AMD” text, milestone progress bar
- **Monetization**: Poki GameSDK wrapper; rewarded ad = 2× speed 60s; interstitial when opening Shop (throttled 3 min)
- **Save**: `localStorage`; offline earnings on return

## Poki

Load the Poki script in `index.html` when hosting on Poki. The game runs without it locally.
