# 江湖行（像素武俠 RPG）

整體規劃與里程碑見 `PLAN.md`，開始新階段前先讀它。

## 指令

- `npm run dev`：開發伺服器（http://localhost:5180）。
- 開發用網址參數：`?zoom=1` 看整張地圖；`?map=canglan&at=15,11` 從指定地圖與位置開始；`?flags=q_bandits:1,bandit_scouts:1` 預設劇情旗標。帶這些參數時會跳過標題畫面、且不自動存檔。開發模式下 `window.__wuxia` 可讀主角位置、NPC 位置與狀態（給自動化測試用）。
- 操作：方向鍵/WASD 移動、Shift 奔跑、E（或 Space/Enter）對話與確認、X/Esc 選單。
- `npm run typecheck`、`npm run build`

## 慣例

- 技術：Phaser 3 負責地圖與人物，React 負責所有文字介面（對話、選單、HUD、戰鬥指令），兩邊透過 `src/state/store.ts`（Zustand）溝通。Phaser 裡不畫文字（戰鬥傷害數字用自己畫的像素數字）。
- 美術全部在 `src/game/art/` 以程式逐像素繪製，不使用外部圖檔。瓦片 16px、人物 16×24，畫面只用整數倍放大。
- 地圖是字元陣列（格式見 `src/game/maps/types.ts`）。建築、告示、NPC、出入口另外列在地圖定義裡，不寫進字元。
- 劇情一律寫成 async 腳本（`src/game/events.ts` 的 `Script`），放在 `src/game/story/`；劇情進度存成旗標（`flags`），NPC／物件用 `when` 依旗標出現或消失。旗標清單寫在該劇情檔開頭的註解。
- 戰鬥分三層：規則 `battle/engine.ts`、出手順序 `battle/controller.ts`、畫面 `scenes/BattleScene.ts` + `ui/BattleUI.tsx`。之後的半即時制只新增一個控制器，規則層共用。
- 存檔在 `src/game/save.ts`（localStorage，自動存檔＋三欄手動）；開新遊戲／讀檔／回標題在 `src/game/session.ts`。角色資料結構有變動時，記得讓 `restoreHero` 能補上舊存檔缺的欄位，必要時遞增存檔 `VERSION` 並在 `migrate()` 裡轉換舊檔。
- 戰鬥平衡模擬每種組合預設跑 300 場。
- 沒有人物等級：五維 ＝ 擲骰底值 ＋ 武功的永久成長 ＋ 裝備中武功的加成，其他數值由五維與裝備的武功推算（`src/game/character.ts`，設計見 PLAN.md 第四節）。新增武功要填品階、裝備加成、永久成長；新增秘笈是帶 `manual` 的物品。
- 世界觀、人名、門派、武功名稱一律自創，不沿用既有武俠作品的名字。
- 程式註解與介面文字使用繁體中文。
