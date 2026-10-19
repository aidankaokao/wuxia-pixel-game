# 江湖行（像素武俠 RPG）

整體規劃與里程碑見 `PLAN.md`，開始新階段前先讀它。

## 指令

- `npm run dev`：開發伺服器（http://localhost:5180）。
- 開發用網址參數：`?zoom=1` 看整張地圖；`?map=canglan&at=15,11` 從指定地圖與位置開始；`?flags=q_bandits:1,bandit_scouts:1` 預設劇情旗標。帶這些參數時會跳過標題畫面、且不自動存檔。開發模式下 `window.__wuxia` 可讀主角位置、NPC 位置與狀態，`__wuxia.battle('dog')` 可直接開打指定的遭遇戰、`__wuxia.warp('qingzhu', 26, 22)` 可瞬間移動、`__wuxia.state().passTime(8)` 可讓時間往前走幾刻（給自動化測試用）。
- 操作：方向鍵/WASD 移動、Shift 奔跑、E（或 Space/Enter）對話與確認、X/Esc 選單；Ctrl/⌘+S 即時存檔、F9 讀取即時存檔；戰鬥中 Q 切換自動戰鬥。
- `npm run typecheck`、`npm run build`

## 與使用者合作的約定

- 使用者說「commit」就代表 commit 後接著 push 到 origin（main），不用另外問。
- 戰鬥平衡模擬每種組合預設跑 300 場；使用者要求時才加量。
- 回覆與文件一律使用繁體中文。
- 每次改完功能，直接一併更新 CLAUDE.md（新的慣例）、PLAN.md（設計、數值、里程碑）與 README.md（目前進度），不用等使用者提醒。

## 慣例

- 技術：Phaser 3 負責地圖與人物，React 負責所有文字介面（對話、選單、HUD、戰鬥指令），兩邊透過 `src/state/store.ts`（Zustand）溝通。Phaser 裡不畫文字（戰鬥傷害數字用自己畫的像素數字）。
- 美術全部在 `src/game/art/` 以程式逐像素繪製，不使用外部圖檔。瓦片 16px、人物 16×24，畫面只用整數倍放大。
- 地圖是字元陣列（格式見 `src/game/maps/types.ts`）。建築、告示、NPC、出入口另外列在地圖定義裡，不寫進字元。
- 劇情一律寫成 async 腳本（`src/game/events.ts` 的 `Script`），放在 `src/game/story/`；劇情進度存成旗標（`flags`），NPC／物件用 `when` 依旗標出現或消失。旗標清單寫在該劇情檔開頭的註解。
- 戰鬥分三層：規則 `battle/engine.ts`、出手順序 `battle/controller.ts`、畫面 `scenes/BattleScene.ts` + `ui/BattleUI.tsx`。之後的半即時制只新增一個控制器，規則層共用。自動戰鬥的選招在 `battle/auto.ts`。遭遇戰可設 `spar`（點到為止，輸了不送回村裡）、`noItems`（不許用藥，物品照帶）；同門過招的對手由 `setupDrill` 依主角數值產生。
- 存檔在 `src/game/save.ts`（localStorage，即時存檔＋自動存檔＋三欄手動）；快捷鍵在 `session.ts` 的 `bindHotkeys`；開新遊戲／讀檔／回標題在 `src/game/session.ts`。角色資料結構有變動時，記得讓 `restoreHero` 能補上舊存檔缺的欄位，必要時遞增存檔 `VERSION` 並在 `migrate()` 裡轉換舊檔。
- 房產在 `src/game/home.ts`（等級、家具、配置圖與風格）、`maps/home.ts`（依房產產生室內地圖與村裡的房子）、`story/estate.ts`（木牌、木匠、貨郎、家具腳本）。房產與日子存在 store 的 `world`。新增配置圖後要確認家具不重疊、都走得到。
- 門派：共用核心在 `src/game/sect.ts`（`SectDef` 規矩：收徒、身分、脫離、兵器、門規、本門武功；玩家狀態在 `world.sect`），各門派的人物與劇情在 `story/sect_*.ts`，以 `registerSect` 註冊。一個人只能拜一個門派；規矩依門派大小而不同。門派裡的人都要有名字，記在 `SectDef.members`（弟子名冊），不要用「XX弟子」當 NPC 名字。
- 時間：`src/game/time.ts`（刻、時辰、日夜、天氣、NPC 作息）。做事要花時間就在腳本裡呼叫 `ctx.pass(刻數)`，場景內走動與交談不花時間；練功類的事用 `exert()` 花體力，不要再加「每天一次」的限制（只有作物生長、晨課這種自然限制才用 `useDaily`）。NPC 作息用 `allDay`、`work`、`night`，要固定出門時間（例如帶晨課的人）用 `out`（白天、夜裡兩份填一樣）；照作息出門、回來的人會自己走到門口或從門口走回原位（`MapScene` 的找路），新 NPC 的位置要能從門口走到。
- 選單裡內容多、要分類的頁面用 `ui/Browser.tsx` 的分層瀏覽（分類 → 清單 → 細節，只靠方向鍵與 E／X），例如「人物」「門派」「交遊」；一人一列的名單用 `ledger`（名冊式表格，紙色底、直線分欄），例如弟子名冊。
- 行囊 36 格、每格疊 99 個（`character.ts` 的 `bagCapacity`，`bagExtra` 留給之後擴增行囊的道具）。給物品一律走 `giveItem`（裝不下會回提示而不給）；商店等要先算數量的地方用 `holdable`／`canHold`。
- 日期用 `time.ts` 的 `dateText(day)` 顯示（遊戲從二月初一開始，一月 30 天），節慶在 `FESTIVALS`；不要再寫「第 N 日」。
- 生活技能（烹飪、紡織、學識、琴棋書畫）在 `src/game/crafts.ts`：技能 0–10 級，底下的項目（例如每道菜）熟練度 1–5 級；跟武功分開。門派生活的整體規劃見 PLAN.md 4.7。裝備欄位是 `GEAR_SLOTS`。
- 烹飪：食材與菜餚在 `src/game/cooking.ts`（菜的三種品質是三個物品：`菜id`、`菜id_2`、`菜id_3`，由 `FOOD_ITEMS` 產生併入 `ITEMS`），做菜與學菜的腳本在 `story/cooking.ts`（`cookAt`、`teachDishes`）。菜餚跟藥品一樣平時、戰鬥中都能吃（戰鬥中能用的看 `usableInBattle`：能回氣血或內力的；行囊裡能用的看 `usable`）。
- 人際關係：核心數值在 `src/game/social.ts`，人物檔案（提升方式、各階段台詞、稱呼、事件）在 `story/people.ts`，互動流程在 `story/social.ts`。NPC 加 `person` 就接上人際系統；人物檔案要填 `place`（在哪認識，交遊頁依此分類）與 `role`（身分）；台詞可用 {稱}、{姓}、{名}。
- 沒有人物等級：五維 ＝ 擲骰底值 ＋ 武功的永久成長 ＋ 裝備中武功的加成，其他數值由五維與裝備的武功推算（`src/game/character.ts`，設計見 PLAN.md 第四節）。新增武功要填品階、裝備加成、永久成長；新增武功要寫招式表（第一招為初始招，其餘標重數門檻與悟出後的永久加成），招式名稱盡量四個字、意思貼近武功；新增物品要填分類與圖示（`art/items.ts`），秘笈是帶 `manual` 的物品。
- 世界觀、人名、門派、武功名稱一律自創，不沿用既有武俠作品的名字。
- 程式註解與介面文字使用繁體中文。
