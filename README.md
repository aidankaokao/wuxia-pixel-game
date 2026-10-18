# 江湖行 — 像素武俠 RPG

一款致敬掌機時代日式 RPG 的**像素風武俠遊戲**，在瀏覽器上執行。
目標是高自由度：在江湖裡四處遊歷、接支線、練武功、交朋友、結恩怨。世界觀、人物、門派與武功皆為原創。

![遊戲畫面：在青竹村與青衫客交談](docs/screenshots/gameplay.png)

## 目前進度

第一張地圖「**青竹村**」已經可以遊玩：

- 蒼嵐山腳的小村落，有山脈、河流、木橋、湖泊、竹林、農田與村落建築
- 格子移動（行走／奔跑）、碰撞、攝影機跟隨
- 7 位各有台詞的村民，對話會埋下江湖傳聞與劇情伏筆
- 告示欄、路牌、石碑等可查看的物件
- 地名橫幅、逐字對話框、狀態列（氣血／內力／體力）、系統選單
- **沒有人物等級**：數值由五維（勁力、身法、根骨、內息、悟性）與武功境界推算

<details>
<summary>青竹村全景</summary>

![青竹村全景](docs/screenshots/overview.png)

</details>

## 操作

| 按鍵 | 功能 |
| --- | --- |
| 方向鍵 / WASD | 移動 |
| Shift（按住） | 奔跑 |
| E / Space / Enter | 對話、查看、下一句 |
| X / Esc | 開關選單 |

## 開始

需要 Node.js 18 以上。

```bash
npm install
npm run dev        # http://localhost:5180
```

其他指令：

```bash
npm run typecheck  # 型別檢查
npm run build      # 打包到 dist/
```

開發小技巧：網址加上 `?zoom=1` 可以縮小看到整張地圖。

## 技術

- **Phaser 3**：地圖、人物與動畫
- **React 18**：所有文字介面（對話框、選單、狀態列）
- **Zustand**：遊戲與介面之間的共用狀態
- **Vite + TypeScript**
- 美術素材全部在遊戲啟動時**以程式逐像素繪製**，沒有外部圖檔；瓦片 16px，以整數倍放大保持像素銳利
- 地圖以字元陣列撰寫，方便直接修改（格式見 [`src/game/maps/types.ts`](src/game/maps/types.ts)）

## 專案結構

```
src/
  game/
    art/        程式繪製的地形、人物、建築與物件
    entities/   格子移動的人物
    maps/       地圖資料
    scenes/     Phaser 場景
    character.ts  五維、境界與武功的成長模型
  ui/           React 介面元件
  state/        共用狀態
```

完整的開發計畫與里程碑見 [PLAN.md](PLAN.md)。

## 授權

介面字型為 [俐方體 11 號（Cubic 11）](https://github.com/ACh-K/Cubic-11)，採 SIL Open Font License 授權，授權條款見 [`public/fonts/OFL.txt`](public/fonts/OFL.txt)。
