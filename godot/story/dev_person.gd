## 人物核心的開發工具（scripts/person.gd）：run:dev_person/check 檢查人物表，run:dev_person/demo 印出幾個人的欄位、壽命與查詢結果。


static func check(_ctx: Ctx) -> void:
	Person.check_all()


static func demo(_ctx: Ctx) -> void:
	Person.check_all()
	for id in ["hero"] + Person.ids():
		var p := Person.of(id)
		var ls := Person.lifespan(id)
		var parts := []
		for x in ls.parts:
			parts.append("%s %+.1f" % [x[0], x[1]] if parts.size() > 0 else "%s %.0f" % [x[0], x[1]])
		print("PERSON %s %s %s %d 歲　門派 %s 位階 %d　實力 %.0f　壽命 %.1f（%s）%s" % [id, p.name, p.gender, Person.age(id), Person.sect(id), Person.rank(id), Person.power(id), ls.total, "、".join(parts), "　體衰" if Person.frail(id) else ""])
	print("PERSON 女子：", Person.find("gender == '女'"))
	print("PERSON 鳴泉正式弟子以上：", Person.find("sect == 'mingquan' and rank >= 1"))
	print("PERSON 主角條件 gender == '男'：", Story.cond("gender == '男'"))


## 同門對練的勝率：主角三種底子打記名、正式弟子（person:id），各 300 場
static func duel_sim(_ctx: Ctx) -> void:
	var keep := {"bag": G.bag.duplicate(), "silver": G.silver}
	var setups := [["剛出村", {}], ["拜入一個月（鳴泉3、吐納2）", {"mingquan": 3, "breathing": 2}], ["正式弟子（鳴泉5、澄泉3、吐納3）", {"mingquan": 5, "chengquan": 3, "breathing": 3}]]
	for st in setups:
		var line: String = st[0] + "："
		for id in ["gu", "bao", "tang", "cao", "he", "wei"]:
			var w := 0.0
			for k in 10:
				w += Sim.rate(load("res://story/dev_calib.gd")._hero(st[1]), "person:" + id, {"jinchuang": 0}, 30).win / 10.0
			line += "　%s %d%%" % [Person.full_name(id), roundi(w * 100)]
		print("DUEL ", line)
	G.bag = keep.bag
	G.silver = keep.silver


## 跑幾年的半夜（全部的 NEW_DAY_SCRIPTS）：鳴泉的名冊、職位、門派消息、過世的人（run:dev_person/years）
static func years(_ctx: Ctx) -> void:
	var mo: GDScript = load("res://story/mq_order.gd")
	for y in 4:
		for i in 360:
			G.day += 1
			for cb in G._new_day:
				cb.call()
		var rows: Array = load("res://story/mingquan.gd").roster().map(func(m): return "%s%s%d歲%.0f" % [Person.full_name(m[0]), m[1], Person.age(m[0]), mo.power_of(m[0])])
		print("YEARS 第 %d 年底：掌門 %s；職位 %s" % [y + 1, Person.full_name(mo.leader_key()), mo.POSTS.map(func(p): return "%s=%s" % [p[1], Person.full_name(mo.holder_of(p[0])) if mo.holder_of(p[0]) != "" else "空"])])
		print("YEARS 　", "、".join(rows))
	for n in load("res://story/life_mingquan.gd").state().news.slice(-12):
		print("YEARS NEWS ", n.day, " ", n.text)
	print("YEARS 過世：", G.persons.get("obits", []))


## 舊存檔的鳴泉狀態搬進人物狀態（G.life.mq 的 members.rank／power／master 與 ranks）
static func migrate(_ctx: Ctx) -> void:
	var lm: GDScript = load("res://story/life_mingquan.gd")
	var mo: GDScript = load("res://story/mq_order.gd")
	G.persons = {}
	G.life.mq = {"members": {"gu": {"power": 70.0, "rank": 2, "master": "hero"}, "bao": {"power": 30.0, "rank": 0, "away": {"until": G.day + 3, "why": "回鄉探親"}}},
		"news": [], "ranking": [], "ranks": {"lu": {"rank": "掌門", "role": "鳴泉劍派第八代掌門"}, "wen": {"rank": "太上長老", "role": "卸任的掌門，在後山清修"}}}
	lm.state()
	print("MIGRATE 顧小滿 ", mo.rank_now("gu"), " 師父 ", Person.of("gu").get("master", ""), "；包小川 ", mo.rank_now("bao"), " 下山 ", lm.away("bao"), "；陸鳴川 ", mo.rank_now("lu"), " ", mo.role_now("lu"), "；聞松年 ", mo.rank_now("wen"), "；掌門是 ", mo.leader_key(), "；舊欄位 ", G.life.mq.members, " ranks ", G.life.mq.has("ranks"))
	print("MIGRATE 名冊 ", load("res://story/mingquan.gd").roster().map(func(m): return "%s%s" % [Person.full_name(m[0]), m[1]]))


## 過世、存讀檔、女子稱呼（用開發的存檔欄位，跑完刪掉）
static func life(_ctx: Ctx) -> void:
	Person.new_day()
	print("PERSON 過世的消息：", G.persons.get("obits", []))
	Person.add_scar("t_a", "毒傷", -6.0, "中了蛇毒沒解乾淨")
	print("PERSON t_a 中毒後壽命 ", Person.lifespan("t_a").total)
	G.write_save("dev_person_test", {"name": "測試"})
	G.persons = {}
	G.apply_save(G.read_save("dev_person_test"))
	DirAccess.remove_absolute(ProjectSettings.globalize_path("user://save/dev_person_test.json"))
	print("PERSON 讀檔後：t_b 活著 ", Person.alive("t_b"), "、t_a 壽命 ", Person.lifespan("t_a").total, "、主角性別 ", G.hero.gender, " 生年 ", G.hero.born)
	G.hero.gender = "女"
	for t in ["{姓}少俠", "少俠", "{姓}賢侄", "年輕人", "{姓}大俠", "小兄弟"]:
		print("PERSON 女子稱呼 ", t, " → ", Social.gendered(Social._names(t)))
	G.hero.gender = "男"
