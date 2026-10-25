class_name Season
## 季節換色（照網頁版 art/season.ts）：不必每種地形、樹木各做四份，蓋場景時把顏色過一次 tint。
## 只動「偏綠」的顏色（草地、樹葉、田裡的苗、竹子），水、路、屋頂、石頭都不受影響。
## - 春：原樣。
## - 夏：綠得深一點、濃一點。
## - 秋：地上的草轉成枯黃；樹葉轉成橘紅（松樹、竹子這類常綠的不換，只暗一點）。
## - 冬：地上覆雪（淡藍白，保留一點明暗）；樹葉變得灰綠，樹梢頂上另外積一層雪（snow_cap）。
## 種類 kind："ground" 地面、"tree" 闊葉樹與灌木、"evergreen" 松竹。季節看 G.season_of()（0 春…3 冬）；
## 場景是進場時蓋的，換季後下次進場就換色。

const SNOW := Color("eef3f8")


static func now() -> int:
	return G.season_of()


static func _green(c: Color) -> bool:
	return c.g > c.r + 0.03 and c.g > c.b + 0.03


static func tint(c: Color, kind := "tree", season := -1) -> Color:
	var s := now() if season < 0 else season
	if s == 0 or not _green(c):
		return c
	var out := c
	match s:
		1:
			out = Color(c.r * 0.85, c.g * 0.92, c.b * 0.8)
		2:
			if kind == "evergreen":
				out = Color(c.r * 0.95, c.g * 0.88, c.b * 0.8)
			elif kind == "tree":
				out = Color(minf(1.0, c.g * 1.15), c.g * 0.62, c.b * 0.45)
			else:
				out = Color(minf(1.0, c.g * 0.98), c.g * 0.86, c.b * 0.55)
		3:
			if kind == "ground":
				var v := (205.0 + (c.g * 255.0 - 140.0) * 0.45) / 255.0
				out = Color(v, v + 0.024, v + 0.047)
			else:
				var a := (c.r + c.g + c.b) / 3.0
				out = Color(a * 0.8 + 0.04, a * 0.85 + 0.055, a * 0.85 + 0.07)
	out.a = c.a
	return out


## 冬天樹梢要不要積雪
static func snow_cap() -> bool:
	return now() == 3


## 野花：春夏開得多，秋天剩一半、只剩黃的白的，冬天不開
static func flower_ok(i: int, col: Color) -> bool:
	match now():
		2:
			return i % 2 == 0 and col.b < 0.5 or col.r > 0.9 and col.g > 0.9
		3:
			return false
	return true
