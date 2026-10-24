# 扶搖江湖（像素武俠 RPG）

整體規劃與里程碑見 `PLAN.md`，開始新階段前先讀它。

## 指令

- `npm run dev`：開發伺服器（http://localhost:5180）。
- 開發用網址參數：`?zoom=1` 看整張地圖；`?map=canglan&at=15,11` 從指定地圖與位置開始；`?map=world&node=linjiang` 從大地圖的某個節點開始；`?flags=q_bandits:1,bandit_scouts:1` 預設劇情旗標。帶這些參數時會跳過標題畫面、且不自動存檔。開發模式下 `window.__wuxia` 可讀主角位置、NPC 位置與狀態，`__wuxia.battle('dog')` 可直接開打指定的遭遇戰、`__wuxia.warp('qingzhu', 26, 22)` 可瞬間移動、`__wuxia.state().passTime(8)` 可讓時間往前走幾刻（給自動化測試用）。
- 操作：方向鍵/WASD 移動、Shift 奔跑、E（或 Space/Enter）對話與確認、X/Esc 選單、面對人物時 F／G／R／T／H 切磋／贈禮／請教／交易／雅趣；Ctrl/⌘+S 即時存檔、F9 讀取即時存檔；戰鬥中 Q 切換自動戰鬥。
- `npm run typecheck`、`npm run build`
- Godot 版（4.35，正在評估改版）：專案在 `godot/`（Godot 4.3 起，GDScript，Forward+），執行 `/Applications/Godot.app/Contents/MacOS/Godot --path godot`，或用 Godot 編輯器匯入 `godot/project.godot`。資料在 `godot/data/*.json`（由 Godot 這邊維護；網頁版的資料要搬過來時，`npm run godot:data` 會匯出到 `godot/tools/web_export/` 當參考）。檢查腳本錯誤：`Godot --headless --path godot --quit-after 60 -- --scene=village`（`Parameter "m" is null` 是無畫面模式的雜訊，可以忽略）。自動操作與截圖：`SHOT_DIR=輸出資料夾 Godot --path godot -- --scene=plain "--do=wait:60;click:1,3;shot:a.png;quit"`（指令見 `scripts/dev_shot.gd`，會跳出視窗幾秒）。

## 與使用者合作的約定

- 使用者說「commit」就代表 commit 後接著 push 到 origin（main），不用另外問。
- 戰鬥平衡模擬每種組合預設跑 300 場；使用者要求時才加量。
- 回覆與文件一律使用繁體中文。
- 每次改完功能，直接一併更新 CLAUDE.md（新的慣例）、PLAN.md（設計、數值、里程碑）與 README.md（目前進度），不用等使用者提醒。

## 慣例

### Godot 版（godot/）

- 畫風是低多邊形加卡通描邊：模型全部用程式產生（`scripts/mk.gd` 的方塊、圓柱、圓錐、球、屋頂，成批的同款模型用 `Mk.Batch`／MultiMesh），材質一律用 `Mk.mat(顏色)`（Godot 的卡通明暗）；描邊是鏡頭底下的全畫面後製（`shaders/outline.gdshader`，要 Forward+）。半透明的東西（水、標記、字）會畫在描邊之後，不會被描邊。
- 人物是 `scripts/chibi.gd` 的 Q 版小人（面向 +Z，`face(方向)` 轉身，`walking` 控制走路動畫），配色照網頁版的人物貼圖名填在 `LOOKS`。
- 鏡頭 `scripts/cam.gd`：正交、固定俯角、永遠斜 45 度看（轉一次 90 度），方向鍵要用 `ground_dir` 換成地面方向。
- 室外地圖都用 `village.gd`（`open(地圖 id)`；做好的室外地圖列在 `Village.OUTDOOR`，出入口通到這些就換過去，其他出入口當成往大地圖）。地圖四周往外延伸 `M` 格的景（`_ring`，格子座標可以是負的，陣列一律用 `[y + M][x + M]`），只能看不能走。網頁版沒有對應貼圖的東西，用擺設的 `id`（例如土地公祠 `tudi`）或 `room.gd` 的 `LOOK_BY_ID`（例如和尚）另外指定 Godot 的做法。
- 出入大地圖一律先用 `ui.ask` 確認，再用 `main.travel(地圖 id, at)`（淡出、換場景、淡入）；同一個據點裡（村子裡進出屋子、村子與村北之間）不問，用 `main.hop(地圖 id, at)`：`ui.ink_in` 墨從四周暈進來蓋滿、換場景、`ui.ink_out` 從中間往外化開（`shaders/dissolve.gdshader`；轉場中 `ui.busy()` 為真）。不要改回拍下畫面定格的做法：讀畫面本身會頓，而且 Retina 上拍到的圖是兩倍大，字會放大。`main.go` 只給開發用的按鈕與 Tab。每次換到室外、室內或大地圖，`main.go` 會用 `ui.show_title` 在畫面上方淡入淡出地名（取地圖資料的 `name`）。
- 天下輿圖 `scripts/tianxia.gd`（場景 `tianxia`）讀 `data/tianxia.json`：這份是 Godot 這邊直接寫的資料（不是從網頁版匯出），座標是天下格（x 往東、y 往南，一格約十里），分層是天下 → 道 → 州 → 據點（見 PLAN.md 4.36）。新的城、關口、道路加在這裡；州圖之後照天下格切。網頁版先停，新的世界內容不用再寫進 TypeScript。
- 大地圖是一張張州圖：`scripts/world_map.gd` 顯示，`scripts/zhou_gen.gd`（`ZhouGen.build(州 id)`）照天下輿圖與 `data/zhou/<州 id>.json`（小河、小湖、小山、據點、小路、`skip_roads`）算出地形、據點、道路、出口。新的州：在 `tianxia.json` 的 `zhou` 加範圍，需要細節再寫 `data/zhou/<id>.json`（座標一律天下格）。`main.go("zhou:州id", {node, from} 或 {gx, gy})`；`"world"` 是預設的煙州。地形要改就改天下輿圖或州細節，不要手改產生出來的東西。走路速度、地面高度由 `GridScene` 的 `_speed_at`、`_ground_y` 鉤子決定。開發自動化可用 `size:95` 把鏡頭拉遠看整張州圖。
- 描邊的著色器在正交鏡頭時用近、遠平面換算線性深度、用 `px_world`（一個畫素幾個世界單位，鏡頭每格更新）判斷邊，不要改回相對深度差。
- 能走動的場景都繼承 `scripts/grid_scene.gd`（格子座標、擋路、主角走動、人物、面對時的「E 交談／查看」與對話；走到某格時呼叫 `_on_tile`）：村子 `village.gd`、室內 `room.gd`。換場景用 `main.go(地圖 id, {x, y, facing})`。
- 精細版房子在 `scripts/fine_house.gd`（`FineHouse.build`，瓦片屋頂用 `Mk.Batch` 的 `add_xf`＋`Mk.span` 沿著斜面排），新的建築樣式要在 `FineHouse.STYLE` 加一筆（柱色、彩繪色、牆色、門釘、春聯、屋頂高、額外擺設）。擺設的精細版在 `scripts/fine_props.gd`（水井、攤子、燈籠柱、告示欄）。
- 室內：地板與牆的樣式照網頁版的 `theme`（`room.gd` 的 `THEMES`：plain 木地板、scholar 深色木地板、stone 石板地）；擺在牆格（W）上的擺設（掛軸、門）由 `_wall_prop` 貼牆做、掛在那面牆的節點底下。讀 `data/<地圖 id>.json`（匯出腳本的 `exportRoom`），四面牆各掛在一個節點（`sides`），只立背對鏡頭的兩面；新的室內擺設在 `room.gd` 的 `_prop` 依網頁版的擺設名加一種做法；做好的房子要加進 `village.gd` 的 `ROOMS`。
- 交談與確認只用空白鍵（與 Enter），E 鍵留給之後別種互動，不要再拿來交談。互動提示是 `ui.show_hint(動作, 畫面座標)`（鍵帽圖示＋動作，不寫「空白鍵」）。
- 進出房子一律站在門口按空白鍵（門是 `props` 裡 `sprite: "door"` 的一筆，村子帶 `door`、室內帶 `exit`），不要做成走上去就自動進門。
- 村子的地面（`village.gd` 的 `_ground`）每格切 `SUB`×`SUB` 細網格，高度與顏色在格子之間平滑取值（`_bil`、`_blur`），讓河岸、小路是曲線；擋路仍照格子。
- 劇情腳本：GDScript 的 static 函式放在 `godot/story/<檔名>.gd`（參數 `ctx: Ctx`，能做的事見 `scripts/ctx.gd`），資料裡用 `"script": "檔名/函式名"` 指到它（擺設、`npcs`、`triggers`）；檔案開頭註解列出用到的旗標。出現條件 `when` 是運算式字串（見 `scripts/story.gd`），NPC 作息欄位 `all_day`／`work`／`night`／`out`／`meal`。`godot/data/` 的 JSON 由 Godot 這邊維護（直接改），`npm run godot:data` 只匯出到 `godot/tools/web_export/` 當參考，不要再拿匯出的檔案蓋掉 `godot/data/`。
- 角色：`scripts/hero.gd`（`Hero`，照網頁版 character.ts；主角是 `G.hero` 字典）。武功與招式在 `data/skills.json`（`tiers`、`skills`、`moves`），物品在 `data/items.json`（`Ui.item_def(id)`）；新增武功要填品階、裝備加成、永久成長、上限加成與招式表（第一招為初始招，其餘標重數與悟出後的加成），招式加在 `moves`。整頁的介面（標題、建立角色）在 `scripts/screens.gd`；系統選單是一本書 `scripts/book_menu.gd`（`BookMenu`：書籤分頁、繞書脊翻頁，每一頁左右兩面由 `_fill(面, 左右)` 依分頁填；武功細節是攤開的手卷 `_open_scroll`；數值盡量畫成長條、菱形格、雷達圖、卡片，小元件在檔案最後）。新的分頁加在 `TABS`／`TAB_COLORS` 與 `_fill`。存檔頁的欄位是 `SLOTS`；選單要 main 做的事（讀檔、回標題）放在 `result` 由 `BookMenu.open(ui, main.where())` 回傳，`main._menu()` 處理。
- 戰鬥：規則在 `scripts/fight.gd`（`Fight`，照網頁版 engine.ts，不管位置與動畫），六角格戰場 `scripts/battle.gd` 管位置、出手順序、選單與動畫（範圍：單打相鄰、打全部兩格、內功三格）。開戰一律 `await main.battle(遭遇戰 id, 地形)`／腳本 `await ctx.battle(...)`（只能從能走動的場景開戰：要記住回來的位置）；左上的戰場按鈕是開發測試用（`main.go` 開頭攔下 plain／river／hill）；敵人與遭遇戰在 `data/enemies.json`。畫面上的氣血要等出招打中的那一刻才扣（事件照順序演）。
- 野獸與任務：地圖上帶 `encounter` 的人物是野獸（`wander` 走動範圍、`respawn` 打倒後幾秒重生），撞上或按空白鍵開打（`story/beast.gd`，重生時間在 `G.respawn_at`，不存檔）。腳本 `await ctx.battle(...)` 之後 `ctx.scene` 已經換成打完回來的新場景；`ctx.chat()` 讓對著的人照平常聊（劇情處理完再交給它，顧攤子的會問要不要買賣）。村民（地圖的 `people`）也可以填 `script`。任務日誌在 `scripts/quests.gd`（步驟由旗標算，新任務加進 `all()`）。室外地圖外圍那圈景的寬度可以用資料的 `ring` 指定（預設 16）。開發自動化另有 `tread:x,y`、`meet:人物id`、`flag:旗標=值`、`god`。
- 自己過日子的人：排程核心 `scripts/life.gd`（`Life.now(群)`，每 4 刻一件事；事情在 `ACTS`：名字、頭上的小字、走動範圍、是否室外），一群人一個檔 `story/life_<群>.gd`（`group()` 回傳地點 spots、人物 npcs：床位 home、座位 seat、起床就寢、喜好 likes；`duty(id, 時刻, 下雨)` 回傳固定職責；`gossip(a, b)` 湊過去聽的閒話），新的群要加進 `Life.group_for` 的清單。場景在 `_people` 之後呼叫 `life_setup(地圖 id)`，並覆寫 `_gate(地圖)`（往那張地圖的門口）；在有作息的地圖上，同一個人不要在地圖檔裡再放一份。顧攤子的貨單是場景的 `stall_defs`。
- 人際關係：`scripts/social.gd`（熟悉度、階段、交談、問答、事件、贈禮、切磋、請教、交易），人物檔案在 `data/people.json`（條件一律是運算式字串，`address` 是 [條件, 稱呼]，條件可讀 `stage`、`fame`；劇情優先用 `story` 指到回傳 bool 的腳本，例如 `qingzhu/liu_story`；支線的收禮用 `on_gift`）。地圖上的人填 `person` 就接上（空白鍵交談，F／G／R／T 只在面對、而且這件事已開放時才攔下，否則照常是別的按鍵）。關係存在 `G.relations`。熟悉度一律用 `Social.add_aff`（會冒通知、說出跨階段）。
- 遊戲狀態在 autoload `G`（`scripts/game.gd`）：主角、銀兩 `G.silver`、行囊 `G.bag`、旗標 `G.flags`、日子與時間（`G.day`、`G.time` 是今天第幾刻）、天氣；時間只能用 `G.advance(刻)` 往前走（畫面接 `time_changed`），日期與時辰的文字用 `G.date_text()`、`G.time_text()`、`G.ke_text()`。存檔 `G.write_save(欄位, main.where())`／`G.read_save`／`G.apply_save`；場景的位置由 `GridScene.where_at()` 提供（州圖存天下格）。存檔格式改了要遞增 `SAVE_VERSION`。網頁版的設計搬過來的順序見 PLAN.md 4.38。
- 文字介面 `scripts/ui.gd`：`await ui.say([...])`、`await ui.ask(提問, 選項)`、`await ui.shop(標題, 貨單)`、`ui.toast(一行提示)`，開著時 `ui.busy()` 為真；對話逐字出現（`_type`，速度 `TYPE_SPEED`；沒出完按空白鍵整句出現，出完右下角 ▼ 閃，再按才下一句；`ask` 的問題出完選項才出現）。「剛剛做了什麼」（用了物品、裝備武功、修練結果）用 `ui.notify(文字, 顏色)`：右上角滑進來的小紙條，兩秒後滑走、最多疊四張；會用掉東西的動作先問一下（書本裡用 `BookMenu._confirm`）。中文字型用系統黑體（`Ui.font()`），3D 上的字用 `Mk.label`。
- 程式註解、介面文字一樣用繁體中文；GDScript 用 tab 縮排、型別推斷（`:=`）時遇到 Variant 要用 `maxf`／`minf` 這類有型別的函式。

### 網頁版

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
- 日期用 `time.ts` 的 `dateText(day)` 顯示（遊戲從二月初一開始，一月 30 天），節慶在 `FESTIVALS`；不要再寫「第 N 日」。節慶活動在 `story/festival.ts`（掛在 NPC 的 `story` 或物件腳本前面，處理了就回傳 true），節令點心在 `festival.ts`；只在節慶出現的擺設用條件旗標 `festival`（今天第幾個節慶，平日 0；用 `FEST.端午` 這種對照，新節慶接在 `FESTIVALS` 最後面，前面的序號不能動）。節慶前後的節期用 `period`（`festivePeriod`：1 年節、2 端午、3 中秋）與 `nianhuo`（年貨攤），燈籠用 `lanternTime`；室外門飾（春聯、艾草）與煙火在 MapScene 依節期自動畫。城裡（不分門派）的節慶活動在 `story/festival_city.ts`，節慶當天第一次跟人交談會先互道佳節（`festGreeting`，記在 relation.events 的 `fest:日`）。
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
- 自己過日子的 NPC：`life.ts`（排程核心：每個時段 4 刻排一件事、地點 `LifeSpot`、兩人聊天配對、下雨換室內）＋各門派的 `story/life_*.ts`（`registerLife`：人物的床位、飯廳座位、起床就寢、喜好 `likes`、差事 `duty`、依事情說的話 `talks`；地點；晨課 `lesson`）。MapScene 會自動把這群人放進他們活動範圍內的地圖（`maps`），照排程出現、走動、離開，頭上的小圖示在 `art/lifeicons.ts`。改成自己過日子的人，要把他原本散在各地圖的分身（白天、雨天、吃飯、夜裡那幾份）拿掉；新的地點要能從門口走到（可以用類似 check-life 的腳本檢查）。
- 自己過日子的進階：同門交情 `LifeGroup.bonds`（影響聊天配對、吵架）、門派活動 `LifeGroup.event`（回傳覆蓋的安排，例如比武小會、講武、守夜）、互動鉤子 `LifeGroup.hooks`（主持人 `talk`、一起練 `practiceWith`、一起打坐 `sitWith`、對練 `sparWith`、聽八卦 `listen`、能不能參加 `member`）。每人的實力、身分、下山、吵架、門派消息與比武名次存在 `world.life`（`LifeState`），每天半夜在各門派的 `story/life_*.ts` 用 `onNewDay` 更新；名冊上的變化用 `SectDef.memberNow`。看不到的地方（掌門居、長老居）用地圖 id `_away`。同門對練用 `setupDrill(..., power)` 的實力倍數。
- 門派秩序（鳴泉）：位階四級（記名 0、正式 1、內門 2、真傳 3；改位階時注意寫死的索引，存檔 v7 已把舊真傳移到 3）。年齡、職位、年會選舉、收徒、傳位在 `story/mq_order.ts`（`ageNow`、`heroAge`、`vigor`、`POSTS`、`holderOf`、年會 `setWenHook`、授徒考驗 `setTeachExamHook`、`SectDef.stipendBonus`／`heroRankNow`／`heroRoleNow`）；職位與位階的變化存在 `world.life.posts`／`ranks`，徒弟記在 `world.life.members[id].master = 'hero'`。sect_mingquan.ts 不能直接 import mq_order（會循環），要用鉤子。年會當天的站位在 `life_mingquan.ts` 的 `ANNUAL_SPOTS`（新增日常人物時一併排位置）；職位選舉用的實力一律走 `powerOf`（`world.life` 還沒記時退回日常人物的底值）。
- 職位的差事與掌門事務在 `story/mq_posts.ts`（值殿的「職位的差事」用 `setPostHook`、掌門座位用 `setChairHook`、典儀主持比武用 `life_mingquan.ts` 的 `setRiteHost`）；同一天只能做一次的差事記在 `world.daily`（`mq:post:*`）。年會由現任掌門主持（`leaderKey`；你是掌門就在掌門座位），新職位要在 `POSTS`、`POST_NOTE` 與 `postDuty` 一起加。掌門的門派方針 `world.life.policy` 在 `life_mingquan.ts` 的 `onNewDay` 生效。
- 門派公庫（4.31）：核心在 `src/game/sect_fund.ts`（`world.life.fund`；記帳一律用 `book(f, 'in'|'out', 項目, 兩)`，項目名稱在 `FUND_IN`／`FUND_OUT`，新的收支項目要加進去），鳴泉的每日結算、山田的活兒（甘伯禾）在 `story/mq_fund.ts`（數值在檔案開頭）。發給你的錢（月例等）要從公庫扣（`payRate` 見底只發一半）；`life_mingquan.ts` 不能 import mq_fund（會循環），甘伯禾的對話用 `setFarmTalk` 鉤子。改了收支數值要重跑四年模擬（`advance` 照常跑，300 局）：第二年起收支大致打平、不見底。
- 門派在山下的產業（4.32）在 `story/mq_trade.ts`：臨江城泉霧茶莊（梁敬亭；零賣一律用 `mq_fund.ts` 的 `shopSell`，數值在 `SHOP`）、青竹村祖田的收租（`fund.rentDue`，柳承安身上的選項掛在青竹村那群人的 `hooks.extra`，所以 mq_trade 要先 import life_towns）、外務執事的送茶差事（`life.errand.kind === 'tea'`）。`heroOut(w)` 判斷你是不是外務執事。
- 門派產業（4.33）在 `story/mq_industry.ts`：設施資料在 `sect_fund.ts` 的 `FACILITIES`（等級 `fund.fac`、營造中 `fund.build`、木料石料 `fund.wood`／`stone`、小事件 `fund.event`，用 `eventOn` 查），產出與賣出在 `mq_fund.ts` 的 `settleFund`；營造完工、小事件、NPC 掌門的決策、查帳用 `onSettle` 掛進每天的結算（模擬也跑得到）。南嶺地圖 `maps/mq_ridge.ts`，工頭與輪值幫工的同門在 `life_mingquan.ts`（`FOREMAN`、`crewOf`；工頭的對話用 `setForemanTalk` 鉤子）。掌門座位的「門派產業」是 `industryMenu`。新的小事件：擲事件、處理腳本、今日事三處一起加。
- 從 world 算出來的地圖條件（例如設施等級）用 `conds.ts` 的 `registerConds` 註冊，MapScene 與 `patches` 會跟旗標合在一起讀；不用為了地圖顯示另外存旗標。
- 城裡、漁村、港口、青竹村自己過日子的人在 `story/life_towns.ts`（臨江城、碧漪湖、大埠頭、青竹村各一群，由 `maps/index.ts` 載入）。一個人只能屬於一群；同名的人不要在別的地圖再放一份（例如秦老漢只在碧漪湖）。醒著沒事做的人排成 `home`（在家歇著，沒有圖示），只有真的睡覺才用 `sleep`。新地方要讓人自己過日子：照這個檔的寫法註冊一群（家在地圖外就用 `_away`；夜裡睡在路邊的人 `home` 直接放在地圖上），市井的事情用 `stall`、`beg`、`tea`、`chess`、`wash`、`boat`、`mend`、`haul`、`play`、`pray`、`study`、`farm`、`forge`、`carve`、`sew` 等（`life.ts` 的 `ACTS`，新事情要在 `art/lifeicons.ts` 補圖示），閒聊的內容在 `townGossip` 加；拿掉地圖檔裡原本那一份，再跑 check-life 確認地點走得到。
- 用餐：午時、酉時（`isMealTime`）。要讓人到飯廳吃飯，就在飯廳加一份 `meal: 'eat'` 的 NPC，並把他平常那幾份標 `meal: 'away'`；人物檔案可填 `meal` 台詞，新的飯廳地圖加進 `story/social.ts` 的 `DINING`。
- 商店面板（`ctx.panel({ kind: 'shop', ... })`）：`stock` 賣的東西、`sellRate` 收購價比例（預設一半）、`buys` 只收哪些、`sellOnly` 只收不賣。臨江城的店家在 `story/linjiang_city.ts`，鏢局、縣衙懸賞、漕幫在 `story/linjiang_jianghu.ts`（懸賞目標是地圖上 `when: f.lj_b_<id> === 1` 的 NPC）。
- 隨劇情改變的地形用 `MapDef.patches`（`when` 成立時用幾列字元蓋掉原本的地形，空白不改），例如雲水渡口蓋好的橋；旗標變了要 `ctx.reload()` 才看得到。渡口在大地圖上能不能直接走過，用 `geo.ts` 的 `setCrossingOpen`（由劇情檔設定）。
- 官府、大戶人家的院子：院牆用地形 `R`（朱紅牆、灰瓦牆帽，不可走）圍起來，城裡只畫外觀（大門可進，牆裡的廂房、大堂是裝飾，底下填 `X`），進門後的院子另做一張石板地圖，院裡的房子各自再有室內（例如臨江縣衙 `lj_yamen` 中庭 → 大堂、兩廂；建築樣式 `yamen_*`）。石板地上的出口 `E` 會畫成石板。
- 店家招牌：建築填 `sign`（門楣匾額，寫店名）與 `flag`（簷下幌子，寫一個字）；新的店、官府、祠堂都填上，讓人一眼看出是什麼地方。板子在 MapScene 畫，字在 `ui/MapSigns.tsx`。
- 公告欄：`notices.ts` 的 `registerNotices`（三欄：big 重要大事、urgent 懸賞公告（id 沿用 urgent）、daily 日常公告；依狀態算出來，不存檔）。要貼新的告示（懸賞、官府消息、招租）就註冊一個來源；告示可帶 `act`（在公告欄上按 E 執行）。打開公告欄用 `story/yamen.ts` 的 `noticeBoard(欄, 標題)`。
- 房產與經營：物件在 `property.ts` 的 `PROPERTIES`（民居 house、空店面 shop、照舊經營的老店 business；地圖上的哪棟建築用 map＋bx／by 對到），狀態在 world.property；師爺與牙人的選單在 `story/property.ts`。開店在 `shop.ts`（店種 `SHOP_TYPES`、等級、夥計、`settleDay`）與 `story/shop.ts`，狀態在 world.shops。房子裡面的地圖是 `prop:物件id`（`maps/property.ts`）。新的城要開放房產：在 `PROPERTIES` 加物件、在那個城的衙門放師爺。
- 經營管理：帳簿介面 `ui/ShopManager.tsx`（店裡櫃台的「經營管理」，panel kind `shopManage`），規則與數值在 `shop_manage.ts`（保鏢 `GUARDS`、各城請得到哪些 `TOWN_GUARDS`、批貨 `wholesale`、士氣、帳目），介面的操作在 `shop_admin.ts`（回傳 `{ ok, msg }`，直接改 store）。夥計進出一律用 `shop.ts` 的 `hireStaff`／`dropStaff`、士氣用 `addMorale`；結算 `settleDay` 會先批貨、再算客人、最後記每日／每月帳。新的城開放經營時，記得在 `TOWN_GUARDS` 填那裡有哪些保鏢來源。注意全域 CSS 已經有 `.cost` 等通用類名，新介面的類名都加前綴（例如 `biz-`）。
- 稱號與手冊：經營相關的功能（簽供應商、找掌櫃）要有稱號「東家」（`hasBizTitle`，第一次買下店面時 `story/shop.ts` 的 `grantBizTitle` 給，並翻開 `ui/Handbook.tsx` 的經營手冊）；身分稱號存在 `hero.titles`（之後別的身分稱號也放這裡，人物頁名片會顯示）。經營規則改了，手冊 `CHAPTERS` 的內容也要一起改。不經過腳本直接打開面板時（例如從選單），`close` 要自己把 `panel` 清成 null。
- 供應商與掌櫃：城在 `shop_manage.ts` 的 `TOWNS`（地圖 id 開頭對到城，進地圖就記進 `world.biz.visited`），供應商在 `SUPPLIERS`（新地方的供應商加在這裡，地圖上負責的人用 `story/supplier.ts` 的 `supplierTalk(id, 原本的腳本)` 包起來，才能親自上門簽約）；進貨來源一律用 `shop.ts` 的 `sourcesOf`（看合約、分號、掌櫃才幹）。掌櫃的資料在 `world.biz.managers`，每天的代管在 `story/managers.ts` 的 `manageDaily`（結算、擲事件之後），方針在 `Policy`；新增店裡的事件種類時，掌櫃的處理也要在 `handleEvent` 補上。總號帳簿是 `ui/BizHQ.tsx`（panel kind `bizHQ`）。經濟數值改了要重跑模擬：最好的情況一家批貨的店一個月淨賺一千兩上下（偶爾一千五、兩千可以），不要太誇張。
- 經營的小事件在 `story/shop_events.ts`：店的事記在 `ShopState.event`（對生意的影響寫在 `shop.ts` 的 `eventEffect`，節慶加成在 `festDraw`），房子的事記在 `Owned.event`（影響房租寫在 `rentDue`）；新增事件種類時，三處（擲事件、處理腳本、今日事）一起加。
- 每天半夜要做的事用 `time.ts` 的 `onNewDay`（例如店鋪結算、房產市場換告示）；只改 world，不要問話。
- 大一點的城分成幾區（例如臨江城的城南 `linjiang`、城北 `lj_north`），每區一張地圖，相鄰兩區同寬（或同高）、城牆在同一欄，用 `maps/city.ts` 的 `seam` 接起來（走過去接到同一個位置、不花時間）。
- 季節：`time.ts` 的 `seasonOf(day)`（春夏秋冬依月份）、`currentTerm`／`solarTermOf`（二十四節氣，每月初一、十六）。地圖條件可讀 `season`（0 春…3 冬）與 `spring`／`summer`／`autumn`／`winter`。畫面換色在 `art/season.ts`（只改偏綠的像素；室外地形 `seasonCanvas`，樹木 `seasonTextureKey`）。新玩法要隨季節變時，直接讀 `seasonOf(world.day)`；魚的季節喜好寫在 `FishDef.likes`／`hides`；路程的季節天氣倍數是 `geo.ts` 的 `roadFactor`（大地圖花的時間一律用 `roadKe`）。
- 天氣：地圖條件可讀 `rain`／`fog`／`clear`／`snow`（雪只在冬天）；雨天、雪天會重生的野獸約一半躲起來（`MapScene.refresh`）。做事受天氣影響時，代價（`withCost`）與日課表的體力（`stamina` 可以給函式）要一起算。
- 釣魚：魚與釣竿在 `src/game/fishing.ts`（`FISH` 的釣點 `spots`、喜好時辰天氣 `likes`、難度 `fight`），釣點是地圖上 `ripple` 擺設掛 `story/biyi.ts` 的 `fishAt(釣點, 描述)`；小遊戲是 store 的 `playFishing()`（`ui/FishingGame.tsx`，回傳 perfect／ok／miss）。魚譜是 works 的 `fishing:魚id`。湖邊做完事呼叫 `maybeDayEvent(ctx, 'lake')`，只會碰上湖邊的小事（門派的小事不會跑到湖邊）。
- 新地方的人物檔案若要放進 `PEOPLE`，資料寫在獨立的輕量檔（例如 `story/biyi_people.ts`，交談選單用 `await import('./biyi')` 動態載入腳本），不要讓 people.ts 直接引用會再引回 social／people 的劇情檔，免得循環引用時拿到 undefined。
- 生活技能訂單：`src/game/orders.ts`（下單的人 `GIVERS`、`newOrder`；訂單種類 dish 菜、woven 織品、goods 貨——望江樓收魚、魚乾、湖產），腳本 `story/orders.ts` 的 `orderTalk`（人際系統的交談會自動呼叫；沒有人物檔案的人在自己的腳本開頭呼叫）。
- 到處翻找：`src/game/loot.ts`。只有描述（`lines`）、沒有 `script` 的擺設，以及花叢、石頭，每天隨機藏東西；不想讓人翻的擺設把貼圖名加進 `SKIP`。
- 所有 NPC 都要有名字（劇情上刻意隱藏身分的除外，例如青衫客），不要用「守城兵」「小販」這類稱呼當名字。
- 雜務都要順帶一點成長（`CHORE_DONE` 的 `grow`：裝備中的某類武功或某項生活技能）；有人交辦的先說 `intro` 再播動畫。
- 做事（雜務、做菜、織布、讀書等）在扣完體力後播過場動畫：`await ctx.work(種類, 說明)`，動畫在 `art/work.ts`（新增種類就加一組 4 格的畫法）。
- 地圖條件（`when`）除了劇情旗標，還能讀 `festival`（今天第幾個節慶）、`today`（今天第幾日）與 `xunxiu`（旬休那天是 1；旬休是每月初十、二十、三十，`time.ts` 的 `isXunxiu`，門派不上晨課、臨江城趕集，見 `story/market.ts`）；會再長出來的東西把採的日子記成旗標，`when: (f) => f.旗標 !== f.today`。
- 沒有人物等級：五維 ＝ 擲骰底值 ＋ 武功的永久成長 ＋ 裝備中武功的加成，其他數值由五維與裝備的武功推算（`src/game/character.ts`，設計見 PLAN.md 第四節）。新增武功要填品階、裝備加成、永久成長；新增武功要寫招式表（第一招為初始招，其餘標重數門檻與悟出後的永久加成），招式名稱盡量四個字、意思貼近武功；新增物品要填分類與圖示（`art/items.ts`），秘笈是帶 `manual` 的物品。
- 世界觀、人名、門派、武功名稱一律自創，不沿用既有武俠作品的名字。
- 程式註解與介面文字使用繁體中文。
