class_name Sect
## 門派的共用核心（照網頁版 sect.ts）：門派規矩（DEFS）與你在門派裡的狀態（G.sect，存檔）。
## - 狀態 G.sect：{id, rank 身分索引, joined 入門那天, rank_day 升到目前身分那天, contrib 貢獻（可以花）, merit 功績（只增不減）,
##   stipend_day 上次領月例那天（0 是還沒領過）, chore 手上接了還沒做的雜務}；沒拜師是空的。
## - 離開過的門派記在 G.flags 的 "<門派>_left"（不能再回來拜師）。
## 各門派的人物與劇情寫在 story/（鳴泉在 story/mingquan.gd）。

## 月例幾天領一次
const STIPEND_DAYS := 7

const DEFS := {
	"mingquan": {
		"name": "鳴泉劍派", "size": "小", "recruit": "隨時收徒：通過入門考驗就能拜師",
		"ranks": [
			{"name": "記名弟子", "dorm": "大通鋪", "perks": ["跟大師兄做晨課、在廣場的木樁練樁", "書房研讀、抄錄入門武功", "練功房的蒲團打坐", "任務榜的雜務與簡單的下山委託", "每 7 天到大殿領月例"],
				"stipend": {"silver": 5, "items": {"jinchuang": 1}}, "leave": [["free"]],
				"promote": {"days": 30, "merit": 150, "skills": [["mingquan", 4]], "test": "正式弟子考核（條件齊了就到練功房找傳功長老報考）", "test_done": "mq_exam >= 1"}},
			{"name": "正式弟子", "dorm": "弟子房（兩人一間）", "perks": ["練功房的鐵木人樁", "書房抄錄「踏石步」", "更多下山委託"],
				"stipend": {"silver": 12, "items": {"jinchuang": 2}}, "leave": [["fine", 500], ["trial", "泉音劍陣"]],
				"promote": {"days": 45, "merit": 400, "skills": [["mingquan", 6]], "test": "內門試劍（條件齊了就到練功房找傳功長老）", "test_done": "false"}},
			{"name": "內門弟子", "dorm": "弟子房（兩人一間）", "perks": ["門派年會上選舉長老、執事", "通過授徒考驗後可以收徒弟", "內門弟子的泉紋護腕"],
				"stipend": {"silver": 18, "items": {"jinchuang": 2}}, "leave": [["fine", 800], ["trial", "泉音劍陣"]],
				"promote": {"days": 60, "merit": 600, "skills": [["mingquan", 8], ["chengquan", 5]], "test": "真傳拜師試煉（條件齊了就去拜見掌門）", "test_done": "mq_master > 0"}},
			{"name": "真傳弟子", "dorm": "真傳弟子房（一人一間）", "perks": ["拜長老為師，學上乘武功", "每天向師父請教", "掌門傳位時有資格繼承"],
				"stipend": {"silver": 25, "items": {"jinchuang": 3}}, "leave": [["trial", "泉音劍陣"]]},
		],
		"rules": [
			["不得擅入禁地", "思過崖與掌門居所，未經許可不得擅入。"],
			["同門不得私鬥", "切磋點到為止，不得挾怨動手。"],
			["不得恃武欺人", "習武是為了護人，不得欺壓百姓、濫殺無辜。"],
			["典籍不得私攜", "書房的書不得帶出；借閱的秘笈須按期歸還。"],
			["本門武功不得外傳", "未經掌門允許，不得把本門武功傳給外人。"],
		],
		# 書房能抄錄的本門武功：[武功, 幾級身分起, 要花的貢獻]
		"skills": [["mingquan", 0, 0], ["chengquan", 0, 30], ["tashi", 1, 60]],
		"weapons": ["劍法", "拳掌"],
		# 弟子服：各身分該有的（服飾都帶 gear.sect，離開門派時收回）
		"uniforms": [["mq_robe_gray", "mq_sword_1"], ["mq_robe_white", "mq_boots", "mq_sword_2"], ["mq_robe_white", "mq_boots", "mq_sword_2", "mq_bracer"], ["mq_robe_blue", "mq_boots", "mq_sword_3", "mq_bracer"]],
	},
	# 回瀾刀門（story/huilan.gd，PLAN.md 4.44）
	"huilan": {
		"name": "回瀾刀門", "size": "中", "recruit": "每季頭十天（二、五、八、十一月初一到初十）與八月大潮之後（八月十六到廿五）收徒，要過入門考驗",
		"ranks": [
			{"name": "記名弟子", "dorm": "弟子房的大通鋪", "perks": ["崖下浪樁練刀（漲潮、滿潮經驗多）", "崖頂觀潮打坐", "乾潮時下礁石採珠", "執事派的雜務", "每 7 天到執事房領月例"],
				"stipend": {"silver": 6, "items": {"jinchuang": 1}}, "leave": [["free"]],
				"promote": {"days": 30, "merit": 150, "skills": [["huilan_dao", 4]], "test": "正式弟子考核（條件齊了到傳功堂找洪長老）", "test_done": "hl_exam >= 1"}},
			{"name": "正式弟子", "dorm": "弟子房", "perks": ["向傳功長老學踏浪步", "漲潮時可以獨自下崖", "巡海的差事"],
				"stipend": {"silver": 14, "items": {"jinchuang": 2}}, "leave": [["fine", 500]],
				"promote": {"days": 45, "merit": 400, "skills": [["huilan_dao", 6], ["guanchao", 3]], "test": "內門試刀（條件齊了，滿潮時到崖下浪樁找洪長老）", "test_done": "hl_inner >= 1"}},
			{"name": "內門弟子", "dorm": "弟子房", "perks": ["內門弟子的浪紋護腕", "八月大潮時跟門主一起下崖觀刀"],
				"stipend": {"silver": 20, "items": {"jinchuang": 2}}, "leave": [["fine", 800]],
				"promote": {"days": 60, "merit": 700, "skills": [["huilan_dao", 8], ["guanchao", 5]], "test": "真傳拜師（之後開放）", "test_done": "false"}},
			{"name": "真傳弟子", "dorm": "弟子房", "perks": ["拜門主或長老為師"],
				"stipend": {"silver": 28, "items": {"jinchuang": 3}}, "leave": [["trial", "回瀾刀陣"]]},
		],
		"rules": [
			["漲潮不得獨自下崖", "未成正式弟子，漲潮、滿潮時不得獨自下崖練刀。"],
			["同門不得私鬥", "切磋點到為止。"],
			["不得勾結海寇", "與黑帆船有往來者，逐出師門。"],
			["本門武功不得外傳", "未經門主允許，不得把本門武功傳給外人。"],
		],
		# 傳功長老能教的本門武功：[武功, 幾級身分起, 要花的貢獻]
		"skills": [["huilan_dao", 0, 0], ["guanchao", 0, 30], ["talang", 1, 60]],
		"weapons": ["刀法", "拳掌"],
		"uniforms": [["hl_robe_1", "hl_saber_1"], ["hl_robe_2", "hl_saber_2"], ["hl_robe_2", "hl_saber_2", "hl_bracer"], ["hl_robe_3", "hl_saber_3", "hl_bracer"]],
	},
}


static func def(id: String) -> Dictionary:
	return DEFS.get(id, {})


## 你是不是這個門派的弟子（不給 id 就是有沒有拜師）
static func member(id := "") -> bool:
	return not G.sect.is_empty() and (id == "" or G.sect.id == id)


static func rank_def(s := G.sect) -> Dictionary:
	return def(s.id).ranks[int(s.rank)]


static func rank_name(s := G.sect) -> String:
	return "" if s.is_empty() else rank_def(s).name


## 拜入門下：記名弟子
static func join(id: String) -> void:
	G.sect = {"id": id, "rank": 0, "joined": G.day, "rank_day": G.day, "contrib": 0, "merit": 0, "stipend_day": 0}


## 升一級身分（考核由各門派的劇情負責）
static func promote() -> void:
	G.sect.rank = int(G.sect.rank) + 1
	G.sect.rank_day = G.day


## 增加貢獻（同時累計功績）；回傳提示文字
static func add_contrib(n: int, merit := true) -> String:
	G.sect.contrib = int(G.sect.contrib) + n
	if merit:
		G.sect.merit = int(G.sect.merit) + n
	return "門派貢獻 +%d" % n


## 下一次能領月例是第幾天
static func next_stipend() -> int:
	var d := int(G.sect.get("stipend_day", 0))
	return d + STIPEND_DAYS if d > 0 else int(G.sect.joined)


## 晉升條件逐項：[[說明, 達成了沒]]；最高一級是空的
static func promotion_checks() -> Array:
	var p: Dictionary = rank_def().get("promote", {})
	if p.is_empty():
		return []
	var served := G.day - int(G.sect.rank_day)
	var out := [["以目前身分在門中滿 %d 天（目前 %d 天）" % [p.days, served], served >= int(p.days)],
		["累計功績 %d（目前 %d）" % [p.merit, G.sect.merit], int(G.sect.merit) >= int(p.merit)]]
	for k in p.skills:
		var s := Hero.find_skill(G.hero, k[0])
		var lv := int(s.level) if not s.is_empty() else 0
		out.append(["「%s」練到第 %d 重（目前 %d 重）" % [Hero.skill_def(k[0]).name, k[1], lv], lv >= int(k[1])])
	out.append(["通過%s" % p.test, Story.cond(p.get("test_done", "false"))])
	return out


static func leave_text(r: Array) -> String:
	match r[0]:
		"free":
			return "可以自由離開"
		"fine":
			return "繳納罰金 %d 兩" % r[1]
		"trial":
			return "闖過「%s」" % r[1]
	return "不准離開"


## 離開門派：狀態清掉、記下離開過，收回帶門派印記的服飾（身上穿的與行囊裡的）
static func leave() -> void:
	var id: String = G.sect.id
	G.flags[id + "_left"] = 1
	G.sect = {}
	take_gear(id)


## 收回某門派的服飾；keep 是要留著的（例如換新弟子服時腰牌留著）
static func take_gear(id: String, keep := []) -> void:
	var of_sect := func(it: String) -> bool:
		return Ui.item_def(it).get("gear", {}).get("sect", "") == id and not it in keep
	var gear: Dictionary = G.hero.get("gear", {})
	for slot in gear.keys():
		if of_sect.call(gear[slot]):
			gear.erase(slot)
	for it in G.bag.keys():
		if of_sect.call(it):
			G.bag.erase(it)
