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
