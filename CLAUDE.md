# 江湖行（像素武俠 RPG）

整體規劃與里程碑見 `PLAN.md`，開始新階段前先讀它。

## 指令

- `npm run dev`：開發伺服器（http://localhost:5180）。網址加 `?zoom=1` 可看整張地圖。
- 操作：方向鍵/WASD 移動、Shift 奔跑、E（或 Space/Enter）對話與確認、X/Esc 選單。
- `npm run typecheck`、`npm run build`

## 慣例

- 技術：Phaser 3 負責地圖與人物，React 負責所有文字介面（對話、選單、HUD），兩邊透過 `src/state/store.ts`（Zustand）溝通。Phaser 裡不畫文字。
- 美術全部在 `src/game/art/` 以程式逐像素繪製，不使用外部圖檔。瓦片 16px、人物 16×24，畫面只用整數倍放大。
- 地圖是字元陣列（格式見 `src/game/maps/types.ts`）。建築、告示、NPC、出入口另外列在地圖定義裡，不寫進字元。
- 沒有人物等級：數值一律由五維與武功境界推算（`src/game/character.ts`）。
- 世界觀、人名、門派、武功名稱一律自創，不沿用既有武俠作品的名字。
- 程式註解與介面文字使用繁體中文。
