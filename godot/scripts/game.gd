extends Node
## 遊戲狀態（autoload：G）：主角、銀兩、行囊、劇情旗標、日子與時間、天氣，以及存檔。
## 時間照網頁版（time.ts）：最小單位是「刻」（15 分鐘），一個時辰 8 刻，一天 96 刻；time 是今天的第幾刻（0 是半夜 0 點）。
## - 只有做事才花時間（練功、雜務、睡覺、在州圖上趕路）；場景裡走動、交談、買賣不花時間。
## - 過了半夜就換日（day + 1），onNewDay 的事在這時做；天氣每天卯時擲一次，時辰交替時偶爾會變。
## 曆法：一年 12 個月、每月 30 天，第 1 日是二月初一；每月初一、十六交節氣；初十、二十、三十是旬休。

signal time_changed

const KE_PER_SHICHEN := 8
const KE_PER_DAY := 96
## 新遊戲從第一天辰時初（早上 7 點）開始
const START_TIME := 28
const SHICHEN_NAMES := ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
const KE_NAMES := ["初", "一刻", "二刻", "三刻", "四刻", "五刻", "六刻", "七刻"]
const MONTH_NAMES := ["正月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "臘月"]
const NUM := ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
const SOLAR_TERMS := [
	["立春", "雨水"], ["驚蟄", "春分"], ["清明", "穀雨"], ["立夏", "小滿"], ["芒種", "夏至"], ["小暑", "大暑"],
	["立秋", "處暑"], ["白露", "秋分"], ["寒露", "霜降"], ["立冬", "小雪"], ["大雪", "冬至"], ["小寒", "大寒"],
]
## 節慶（月份 0 起算；條件旗標 festival 是這裡的序號，新的接在最後面）
const FESTIVALS := [
	{"name": "過年", "month": 0, "date": 1}, {"name": "元宵", "month": 0, "date": 15}, {"name": "清明", "month": 2, "date": 5},
	{"name": "端午", "month": 4, "date": 5}, {"name": "中元", "month": 6, "date": 15}, {"name": "中秋", "month": 7, "date": 15},
	{"name": "掌門壽辰", "month": 9, "date": 12}, {"name": "冬至", "month": 10, "date": 16}, {"name": "除夕", "month": 11, "date": 30},
]
const SEASON_NAME := ["春", "夏", "秋", "冬"]
const WEATHER_NAME := {"clear": "晴", "cloudy": "陰", "rain": "雨", "fog": "霧", "snow": "雪"}
## 各季的天氣機率（晴、陰、雨或雪、霧）：夏天雨多，秋天晴多，冬天下的是雪
const WEATHER_ODDS := [[0.45, 0.22, 0.23, 0.1], [0.5, 0.15, 0.3, 0.05], [0.6, 0.2, 0.1, 0.1], [0.4, 0.28, 0.22, 0.1]]

const SAVE_VERSION := 2
## 手動存檔的欄位數
const MANUAL_COUNT := 10

var hero := {}
var silver := 0
var bag := {}
var flags := {}
var day := 1
var time := START_TIME
var weather := "clear"
var _new_day: Array[Callable] = []


func _ready() -> void:
	new_game({}, true)


## 開新遊戲：c 是建立好的角色（空的就用預設的「無名」）；dev 是開發測試用，多給一些錢和東西
func new_game(c: Dictionary, dev := false) -> void:
	hero = c if not c.is_empty() else Hero.new_hero()
	silver = 120 if dev else 12
	bag = {"boar_meat": 2, "dog_pelt": 1, "boar_tusk": 1, "herb": 3, "jinchuang": 2, "tea": 1} if dev else {}
	flags = {}
	day = 1
	time = START_TIME
	weather = "clear"
	time_changed.emit()


# ── 時辰與曆法 ──────────────────────────────────────────

## 時辰的索引（0 子時 … 11 亥時）。子時是 23 點到 1 點，所以要先位移一個小時
func shichen_of(t := -1) -> int:
	return ((time if t < 0 else t) + 4) % KE_PER_DAY / KE_PER_SHICHEN


## 例如「辰時三刻」「午時初」
func time_text(t := -1) -> String:
	var tt := time if t < 0 else t
	return "%s時%s" % [SHICHEN_NAMES[shichen_of(tt)], KE_NAMES[(tt + 4) % KE_PER_SHICHEN]]


## 現在是幾點（小數，給光線用）
func hour() -> float:
	return time / 4.0


## 卯時清晨、辰到申時白天、酉時黃昏、戌到寅時夜晚
func period_name() -> String:
	var s := shichen_of()
	return "清晨" if s == 3 else ("白天" if s >= 4 and s <= 8 else ("黃昏" if s == 9 else "夜晚"))


## 第幾日 → {year, month（0 起）, date（1 起）}
func date_of(d := -1) -> Dictionary:
	var n := (day if d < 0 else d) - 1 + 30
	return {"year": n / 360 + 1, "month": n / 30 % 12, "date": n % 30 + 1}


## 例如「二月初三」；第二年起加上年份
func date_text(d := -1) -> String:
	var dt := date_of(d)
	var dd: int = dt.date
	var name: String = ("初" + NUM[dd]) if dd <= 10 else (("十" + NUM[dd - 10]) if dd < 20 else ("二十" if dd == 20 else (("廿" + NUM[dd - 20]) if dd < 30 else "三十")))
	var y: int = dt.year
	return "%s%s%s" % [("第%s年" % (NUM[y] if y <= 10 else str(y))) if y > 1 else "", MONTH_NAMES[dt.month], name]


## 季節：0 春、1 夏、2 秋、3 冬
func season_of(d := -1) -> int:
	return date_of(d).month / 3


## 今天交什麼節氣（不是交節氣的日子是空字串）
func solar_term_of(d := -1) -> String:
	var dt := date_of(d)
	return SOLAR_TERMS[dt.month][0] if dt.date == 1 else (SOLAR_TERMS[dt.month][1] if dt.date == 16 else "")


## 現在落在哪個節氣裡
func current_term(d := -1) -> String:
	var dt := date_of(d)
	return SOLAR_TERMS[dt.month][1 if dt.date >= 16 else 0]


## 今天是什麼節日（沒有是空字串）
func festival_of(d := -1) -> String:
	var dt := date_of(d)
	for f in FESTIVALS:
		if f.month == dt.month and f.date == dt.date:
			return f.name
	return ""


## 旬休：每月初十、二十、三十
func is_xunxiu(d := -1) -> bool:
	return date_of(d).date % 10 == 0


# ── 時間流逝 ────────────────────────────────────────────

## 過了半夜要做的事（只改狀態、不問話）
func on_new_day(f: Callable) -> void:
	_new_day.append(f)


## 讓時間往前走幾刻：跨過半夜就換日，跨過時辰時天氣偶爾會變（起霧只在清晨，太陽出來就散）。回傳換了幾天
func advance(ke: int) -> int:
	var days := 0
	for i in ke:
		var before := shichen_of()
		time += 1
		if time >= KE_PER_DAY:
			time = 0
			day += 1
			days += 1
			for f in _new_day:
				f.call()
		var now := shichen_of()
		if now == before:
			continue
		if now == 3:
			weather = _roll_weather()
		elif weather == "fog" and now >= 5 and now <= 8:
			weather = "cloudy"
		elif randf() < 0.12:
			var next := _roll_weather()
			weather = "cloudy" if next == "fog" else next
	if ke > 0:
		time_changed.emit()
	return days


func _roll_weather() -> String:
	var s := season_of()
	var o: Array = WEATHER_ODDS[s]
	var r := randf()
	if r < o[0]:
		return "clear"
	if r < o[0] + o[1]:
		return "cloudy"
	if r < o[0] + o[1] + o[2]:
		return "snow" if s == 3 else "rain"
	return "fog"


## 從現在睡到下一個卯時初（早上 5 點）要幾刻
func ke_until_dawn() -> int:
	var dawn := 20
	return dawn - time if time < dawn else KE_PER_DAY - time + dawn


## 「兩刻」「半個時辰」「一個時辰又兩刻」
func ke_text(ke: int) -> String:
	var s := ke / KE_PER_SHICHEN
	var k := ke % KE_PER_SHICHEN
	if s == 0:
		return "半個時辰" if k == 4 else "%s刻" % NUM[k]
	return "%s個時辰%s" % ["一" if s == 1 else NUM[mini(s, 10)], ("又%s刻" % NUM[k]) if k > 0 else ""]


## 狀態列的一行：日期、時辰、天氣
func status_text() -> String:
	return "%s　%s・%s" % [date_text(), time_text(), WEATHER_NAME[weather]]


# ── 存檔 ────────────────────────────────────────────────
## 存在 user://save/<欄位>.json。欄位：quick 即時存檔、auto 自動存檔、"1"～"10" 手動。
## 位置 where = {scene: 場景 id, at: 進場景時的參數（main.go 的 at）}，由 main 提供。

func slot_name(slot: String) -> String:
	if slot == "quick":
		return "即時存檔"
	if slot == "auto":
		return "自動存檔"
	return "檔案" + "一二三四五六七八九十"[int(slot) - 1]


## 所有欄位與內容（沒有存檔的 data 是空的）
func list_saves() -> Array:
	var out := []
	for s in ["quick", "auto"] + range(1, MANUAL_COUNT + 1).map(func(i): return str(i)):
		out.append({"slot": s, "data": read_save(s)})
	return out


func _path(slot: String) -> String:
	return "user://save/%s.json" % slot


func write_save(slot: String, where: Dictionary) -> bool:
	DirAccess.make_dir_recursive_absolute("user://save")
	var d := {"version": SAVE_VERSION, "saved_at": Time.get_unix_time_from_system(), "where": where,
		"hero": hero, "silver": silver, "bag": bag, "flags": flags, "day": day, "time": time, "weather": weather}
	var f := FileAccess.open(_path(slot), FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(d, "\t"))
	return true


## 讀出存檔的內容（不套用）；沒有或壞掉回傳空的
func read_save(slot: String) -> Dictionary:
	var f := FileAccess.open(_path(slot), FileAccess.READ)
	if f == null:
		return {}
	var d = JSON.parse_string(f.get_as_text())
	if not (d is Dictionary) or int(d.get("version", 0)) != SAVE_VERSION:
		return {}
	return d


## 把存檔套用到狀態上（換場景由 main 做）；JSON 讀回來的數字都是小數，要轉回整數
func apply_save(d: Dictionary) -> void:
	hero = d.hero
	# JSON 讀回來的數字都是小數：角色身上的計數改回整數
	for k in ["fame", "age", "points", "bag_extra", "hp", "qi", "stamina"]:
		hero[k] = int(hero.get(k, 0))
	for s in hero.skills:
		for k in ["level", "exp", "fails"]:
			s[k] = int(s[k])
		if s.pos != null:
			s.pos = int(s.pos)
	silver = int(d.silver)
	bag = {}
	for k in d.bag:
		bag[k] = int(d.bag[k])
	flags = d.flags
	day = int(d.day)
	time = int(d.time)
	weather = d.weather
	time_changed.emit()


## 存檔的一行說明：「二月初三 辰時初・青竹村」
func save_summary(d: Dictionary) -> String:
	return "%s　%s %s・%s" % [d.hero.get("name", ""), date_text(int(d.day)), time_text(int(d.time)), d.where.get("name", "")]
