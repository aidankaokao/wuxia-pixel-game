# 扶搖行：相忘江湖（像素武俠 RPG）

整體規劃與里程碑見 `PLAN.md`，開始新階段前先讀它。

## 指令

- `npm run dev`：開發伺服器（http://localhost:5180）。
- 開發用網址參數：`?zoom=1` 看整張地圖；`?map=canglan&at=15,11` 從指定地圖與位置開始；`?map=world&node=linjiang` 從大地圖的某個節點開始；`?flags=q_bandits:1,bandit_scouts:1` 預設劇情旗標。帶這些參數時會跳過標題畫面、且不自動存檔。開發模式下 `window.__wuxia` 可讀主角位置、NPC 位置與狀態，`__wuxia.battle('dog')` 可直接開打指定的遭遇戰、`__wuxia.warp('qingzhu', 26, 22)` 可瞬間移動、`__wuxia.state().passTime(8)` 可讓時間往前走幾刻（給自動化測試用）。
- 操作：方向鍵/WASD 移動、Shift 奔跑、E（或 Space/Enter）對話與確認、X/Esc 選單、面對人物時 F／G／R／T／H 切磋／贈禮／請教／交易／雅趣；Ctrl/⌘+S 即時存檔、F9 讀取即時存檔；戰鬥中 Q 切換自動戰鬥。
- `npm run typecheck`、`npm run build`

## 與使用者合作的約定

- 使用者說「commit」就代表 commit 後接著 push 到 origin（main），不用另外問。
- 戰鬥平衡模擬每種組合預設跑 300 場；使用者要求時才加量。
- 回覆與文件一律使用繁體中文。
- 每次改完功能，直接一併更新 CLAUDE.md（新的慣例）、PLAN.md（設計、數值、里程碑）與 README.md（目前進度），不用等使用者提醒。

## 慣例

- 技術：Phaser 3 負責地圖與人物，React 負責所有文字介面（對話、選單、HUD、戰鬥指令），兩邊透過 `src/state/store.ts`（Zustand）溝通。Phaser 裡不畫文字（戰鬥傷害數字用自己畫的像素數字）。
- 美術全部在 `src/game/art/` 以程式逐像素繪製，不使用外部圖檔（連分頁圖示也是，見 `art/favicon.ts`）。瓦片 16px、人物 16×24，畫面只用整數倍放大。
- 地圖是字元陣列（格式見 `src/game/maps/types.ts`）。建築、告示、NPC、出入口另外列在地圖定義裡，不寫進字元。
- 劇情一律寫成 async 腳本（`src/game/events.ts` 的 `Script`），放在 `src/game/story/`；劇情進度存成旗標（`flags`），NPC／物件用 `when` 依旗標出現或消失。旗標清單寫在該劇情檔開頭的註解。
- 戰鬥分三層：規則 `battle/engine.ts`、出手順序 `battle/controller.ts`、畫面 `scenes/BattleScene.ts` + `ui/BattleUI.tsx`。之後的半即時制只新增一個控制器，規則層共用。自動戰鬥的選招在 `battle/auto.ts`。遭遇戰可設 `spar`（點到為止，輸了不送回村裡）、`noItems`（不許用藥，物品照帶）；同門過招的對手由 `setupDrill` 依主角數值產生。
- 存檔在 `src/game/save.ts`（localStorage，即時存檔＋自動存檔＋十欄手動，`MANUAL_COUNT`；選單與標題畫面的存檔、讀檔都先 `askConfirm`）；快捷鍵在 `session.ts` 的 `bindHotkeys`；開新遊戲／讀檔／回標題在 `src/game/session.ts`。角色資料結構有變動時，記得讓 `restoreHero` 能補上舊存檔缺的欄位，必要時遞增存檔 `VERSION` 並在 `migrate()` 裡轉換舊檔。
- 房產在 `src/game/home.ts`（等級、家具、配置圖與風格）、`maps/home.ts`（依房產產生室內地圖與村裡的房子）、`story/estate.ts`（木牌、木匠、貨郎、家具腳本）。房產與日子存在 store 的 `world`。新增配置圖後要確認家具不重疊、都走得到。
- 門派：共用核心在 `src/game/sect.ts`（`SectDef` 規矩：收徒、身分、脫離、兵器、門規、本門武功；玩家狀態在 `world.sect`），各門派的人物與劇情在 `story/sect_*.ts`，以 `registerSect` 註冊。一個人只能拜一個門派；規矩依門派大小而不同。門派裡的人都要有名字，記在 `SectDef.members`（弟子名冊），不要用「XX弟子」當 NPC 名字。
- 時間：`src/game/time.ts`（刻、時辰、日夜、天氣、NPC 作息）。做事要花時間就在腳本裡呼叫 `ctx.pass(刻數)`，場景內走動與交談不花時間；練功類的事用 `exert()` 花體力，不要再加「每天一次」的限制（只有作物生長、晨課這種自然限制才用 `useDaily`）。NPC 作息用 `allDay`、`work`、`night`，要固定出門時間（例如帶晨課的人）用 `out`（白天、夜裡兩份填一樣）；照作息出門、回來的人會自己走到門口或從門口走回原位（`MapScene` 的找路），新 NPC 的位置要能從門口走到。
- 系統選單是一本書（`ui/GameMenu.tsx`）：上緣書籤是分頁，←→ 翻頁（`.tome-turn` 翻頁動畫：`LeafStrip` 巢狀紙條各彎一點做出弧度，角度在 `bend-next`／`bend-prev`），E／↓ 進入這一頁，頁裡 X 回到書籤，Tab／[ ] 隨時翻頁。每一頁用 `ui/Paper.tsx` 的 `Spread` 畫左右兩面的概覽，選中一項按 E 才把細節攤開成一張紙（`Paper`，從摺好的小方塊展開；`Sheet` 可以是說明加一排動作 `actions`、紙上的小型分層瀏覽 `browse`、名冊 `ledger`，或圖示格子 `grid`——一格一個 `IconCell`，左格右細節）。能用圖像就不用字：物品效果用 `ui/ItemEffects.tsx` 的小章，招式用卡片（`SkillDetail`），委託貼成告示；物品、菜、書、技能都用 `IconTile`（圖示＋右下角數字，沒有的變暗），圖示加在 `art/items.ts` 的 `ItemIcon`（不是物品的也可以，例如技能 `c_*`、書冊 `book_*`、坐騎 `horse`）。「人物」右頁是人形與裝備框（`CharacterPage` 的 `DOLL`，空框畫 `gear.ts` 的 `GEAR_ICON`）；生活技能與雅藝在「技能」頁（`ui/CraftsPage.tsx`，新技能的細目加在 `cellsFor`、圖示加在 `CRAFT_ICON`）。紙開著時，那一頁自己的按鍵要停（`useKeys(active && !open, …)`）。內容多、要分類的頁面用 `ui/Browser.tsx` 的分層瀏覽（書本模式：左頁上一層、右頁這一層，沒有下一層的項目攤開成紙），例如「門派」「交遊」；一人一列的名單用 `ledger`（名冊式表格），例如弟子名冊。紙與書頁是淺底深字，配色在 `.tome`／`.paper` 底下另外覆寫（`.muted`、`.tag`、品級顏色等）。
- 行囊 36 格、每格疊 99 個（`character.ts` 的 `bagCapacity`，`bagExtra` 留給之後擴增行囊的道具）。給物品一律走 `giveItem`（裝不下會回提示而不給）；商店等要先算數量的地方用 `holdable`／`canHold`。
- 日期用 `time.ts` 的 `dateText(day)` 顯示（遊戲從二月初一開始，一月 30 天），節慶在 `FESTIVALS`；不要再寫「第 N 日」。節慶活動在 `story/festival.ts`（掛在 NPC 的 `story` 或物件腳本前面，處理了就回傳 true），節令點心在 `festival.ts`；只在節慶出現的擺設用條件旗標 `festival`（今天第幾個節慶，平日 0）。
- 生活技能（烹飪、紡織、學識、琴棋書畫）在 `src/game/crafts.ts`：技能 0–10 級，底下的項目（例如每道菜）熟練度 1–5 級；跟武功分開。門派生活的整體規劃見 PLAN.md 4.7。裝備欄位是 `GEAR_SLOTS`。
- 烹飪：食材與菜餚在 `src/game/cooking.ts`（菜的三種品質是三個物品：`菜id`、`菜id_2`、`菜id_3`，由 `FOOD_ITEMS` 產生併入 `ITEMS`），做菜與學菜的腳本在 `story/cooking.ts`（`cookAt`、`teachDishes`）。菜餚跟藥品一樣平時、戰鬥中都能吃（戰鬥中能用的看 `usableInBattle`：能回氣血或內力的；行囊裡能用的看 `usable`）。
- 服飾：部位與品級在 `src/game/gear.ts`（數值查 `GEAR_TABLE`，新增服飾只填部位與品級），穿脫用 `character.ts` 的 `equipGear`／`unequipGear`，穿著的存在 `hero.gear`（不佔行囊），戰鬥數值在 `heroUnit` 加上 `gearStats`。門派發的服飾帶 `sect`（綁定），離開門派用 `takeSectGear` 收回。
- 兵器：`gear.ts` 的 `weapon(名稱, '劍'|'刀', 品級, 說明)`，攻擊力查表；外功招式拿錯兵器只有九成威力、拳掌空手多一成（`weaponFit`，戰鬥中是 `Unit.moveMult`）。新增外功種類（例如暗器）時，記得在 `WEAPON_FOR` 填它要拿什麼。
- 大地圖：地理、節點、道路在 `src/game/world/geo.ts`（新地方加進 `NODES`，填 `enter` 指到小地圖；還沒做好的標 `locked`；道路加進 `ROADS`），畫面是 `scenes/WorldScene.ts`（自己的劇情介面，只會說話、開戰、過時間）與 `ui/WorldOverlay.tsx`（地名與資訊卡）。每個節點是一個據點（一組小地圖），據點之間的小地圖不直接相連：出口填 `world: 節點id`、`worldFrom: 朝向哪個節點`；從哪條路來就從哪一側進去（節點的 `enterFrom`）；渡口類的節點標 `crossing`（大地圖上只能往回走，過河要進去坐船，見 `story/ferry.ts`）；長路中間放驛站節點（`kind: 'inn'`、填 `rest`，按 E 開歇腳選單，見 `story/waystation.ts`），道路填里數（`li`，一個時辰走一百二十里；山路加 `slow`），時間由里數算出（騎馬、輕功再加快，`travelKe`），單段路不超過三個時辰；同方向有兩條以上的路會跳出選項。戰敗送回的地方在 `scenes/defeat.ts`。開發用 `?map=world&node=linjiang`。路上的小事在 `story/road.ts`（`registerRoadEvent`，WorldScene 走到半路時呼叫 `rollRoadEvent`），新地區的小事就註冊在那裡，用 `when` 限定在哪幾條路。
- 做菜的師傅：`story/cooking.ts` 的 `teachDishes` 可以指定教哪些菜（`teaches`）、學費單位與金額；海鮮菜標 `sea`，只有大埠頭潘大娘教；湖鮮菜標 `lake`，只有碧漪湖喬嫂教（卜大勺兩種都不教）。
- 學識：書目在 `src/game/books.ts`（`BOOKS`、`readBook`，熟讀程度是 `learning:書id` 項目），書架腳本 `story/reading.ts` 的 `readingShelf`；學識的好處用 `learningDiscount`（商店折扣）與 `learningBonus`（研讀領悟）。
- 琴棋書畫：資料在 `src/game/arts.ts`，練習與對弈的腳本在 `story/arts.ts`（`practiceAt`、`playChess`）。NPC 的嗜好填在人物檔案的 `hobby`（哪一門、造詣、幾階起、棋風），互動是人際動作 `hobby`（按 H，名稱用 `actionName` 依嗜好顯示）。
- 紡織：樣式與材料在 `src/game/weaving.ts`（織出的服飾是 `w_樣式_品級`，數值照 `gear.ts` 查表），腳本 `story/weaving.ts`（`teachPatterns`、`loomAt`）。坐騎在 `src/game/mounts.ts`（`hero.mount`、`hero.riding`），買賣在 `story/stable.ts`；騎馬加速在 `MapScene` 主角走路那裡。
- 人際關係：核心數值在 `src/game/social.ts`，人物檔案（提升方式、各階段台詞、稱呼、事件）在 `story/people.ts`，互動流程在 `story/social.ts`。NPC 加 `person` 就接上人際系統；人物檔案要填 `place`（在哪認識，交遊頁依此分類）與 `role`（身分）；台詞可用 {稱}、{姓}、{名}。每個人物盡量填 `asks`（對方問你的問題，三選一、各有熟悉度增減），讓交談有來有往。
- 今日事：`src/game/daily.ts` 的 `registerDailyTasks` 註冊「今天能做／該做的事」（依狀態算，不存檔），早晨提要（`ui/MorningBrief.tsx`，開新遊戲、讀檔、睡到天亮時由 `showBrief()` 跳出）與選單「江湖事」的「今日」清單共用。新增每天一次的事（例如新的門派、新的作物）就順手註冊一個來源。
- 想法泡泡：要花時間、體力的腳本用 `events.ts` 的 `withCost` 標上代價（面對時主角頭上冒出「兩刻・體力 20」），包一層的腳本（例如 `moonAt`）要把裡面的代價傳出來（`scriptCost`）；時間或體力到某個點的自言自語用 `thought.ts` 的 `registerReminder`。一個時辰是 8 刻，寫「花了多久」時照 `ctx.pass` 的刻數寫（4 刻是半個時辰，可以用 `keText`）。
- 重複的事：練樁、打坐、研讀、讀書、練雅藝、織布這類可以連做的事，用 `estate.ts` 的 `askRounds` 問回數（一回／三回／做到體力剩三成），再依回數扣體力、過時間、加成長；結尾的說明用 `roundsNote`。
- 日課表：`src/game/schedule.ts`。新門派或新的固定作息要能照表做，就 `registerActivity`（`run` 只結算並回傳總結的話，不要問話；體力與時間由 `runSchedule` 扣）；有人找用 `registerInterrupt`；日常小事用 `registerDayEvent`（`after` 填場合，聊天是 `chat`，`with` 限定人物），由 `story/schedule.ts` 的 `maybeDayEvent` 觸發——新的做事腳本做完時也呼叫它（做事、聊天各一天最多一件，不要每天都有）。
- 用餐：午時、酉時（`isMealTime`）。要讓人到飯廳吃飯，就在飯廳加一份 `meal: 'eat'` 的 NPC，並把他平常那幾份標 `meal: 'away'`；人物檔案可填 `meal` 台詞，新的飯廳地圖加進 `story/social.ts` 的 `DINING`。
- 商店面板（`ctx.panel({ kind: 'shop', ... })`）：`stock` 賣的東西、`sellRate` 收購價比例（預設一半）、`buys` 只收哪些、`sellOnly` 只收不賣。臨江城的店家在 `story/linjiang_city.ts`，鏢局、縣衙懸賞、漕幫在 `story/linjiang_jianghu.ts`（懸賞目標是地圖上 `when: f.lj_b_<id> === 1` 的 NPC）。
- 隨劇情改變的地形用 `MapDef.patches`（`when` 成立時用幾列字元蓋掉原本的地形，空白不改），例如雲水渡口蓋好的橋；旗標變了要 `ctx.reload()` 才看得到。渡口在大地圖上能不能直接走過，用 `geo.ts` 的 `setCrossingOpen`（由劇情檔設定）。
- 大一點的城分成幾區（例如臨江城的城南 `linjiang`、城北 `lj_north`），每區一張地圖，相鄰兩區同寬（或同高）、城牆在同一欄，用 `maps/city.ts` 的 `seam` 接起來（走過去接到同一個位置、不花時間）。
- 天氣：地圖條件可讀 `rain`／`fog`／`clear`；雨天會重生的野獸約一半躲起來（`MapScene.refresh`）。做事受天氣影響時，代價（`withCost`）與日課表的體力（`stamina` 可以給函式）要一起算。
- 釣魚：魚與釣竿在 `src/game/fishing.ts`（`FISH` 的釣點 `spots`、喜好時辰天氣 `likes`、難度 `fight`），釣點是地圖上 `ripple` 擺設掛 `story/biyi.ts` 的 `fishAt(釣點, 描述)`；小遊戲是 store 的 `playFishing()`（`ui/FishingGame.tsx`，回傳 perfect／ok／miss）。魚譜是 works 的 `fishing:魚id`。湖邊做完事呼叫 `maybeDayEvent(ctx, 'lake')`，只會碰上湖邊的小事（門派的小事不會跑到湖邊）。
- 新地方的人物檔案若要放進 `PEOPLE`，資料寫在獨立的輕量檔（例如 `story/biyi_people.ts`，交談選單用 `await import('./biyi')` 動態載入腳本），不要讓 people.ts 直接引用會再引回 social／people 的劇情檔，免得循環引用時拿到 undefined。
- 生活技能訂單：`src/game/orders.ts`（下單的人 `GIVERS`、`newOrder`），腳本 `story/orders.ts` 的 `orderTalk`（人際系統的交談會自動呼叫；沒有人物檔案的人在自己的腳本開頭呼叫）。
- 到處翻找：`src/game/loot.ts`。只有描述（`lines`）、沒有 `script` 的擺設，以及花叢、石頭，每天隨機藏東西；不想讓人翻的擺設把貼圖名加進 `SKIP`。
- 所有 NPC 都要有名字（劇情上刻意隱藏身分的除外，例如青衫客），不要用「守城兵」「小販」這類稱呼當名字。
- 雜務都要順帶一點成長（`CHORE_DONE` 的 `grow`：裝備中的某類武功或某項生活技能）；有人交辦的先說 `intro` 再播動畫。
- 做事（雜務、做菜、織布、讀書等）在扣完體力後播過場動畫：`await ctx.work(種類, 說明)`，動畫在 `art/work.ts`（新增種類就加一組 4 格的畫法）。
- 地圖條件（`when`）除了劇情旗標，還能讀 `festival`（今天第幾個節慶）、`today`（今天第幾日）與 `xunxiu`（旬休那天是 1；旬休是每月初十、二十、三十，`time.ts` 的 `isXunxiu`，門派不上晨課、臨江城趕集，見 `story/market.ts`）；會再長出來的東西把採的日子記成旗標，`when: (f) => f.旗標 !== f.today`。
- 沒有人物等級：五維 ＝ 擲骰底值 ＋ 武功的永久成長 ＋ 裝備中武功的加成，其他數值由五維與裝備的武功推算（`src/game/character.ts`，設計見 PLAN.md 第四節）。新增武功要填品階、裝備加成、永久成長；新增武功要寫招式表（第一招為初始招，其餘標重數門檻與悟出後的永久加成），招式名稱盡量四個字、意思貼近武功；新增物品要填分類與圖示（`art/items.ts`），秘笈是帶 `manual` 的物品。
- 世界觀、人名、門派、武功名稱一律自創，不沿用既有武俠作品的名字。
- 程式註解與介面文字使用繁體中文。
