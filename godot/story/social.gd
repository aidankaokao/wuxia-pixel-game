## 人際互動的腳本入口（grid_scene 面對有人物檔案的人時呼叫；細節在 scripts/social.gd）。ctx.extra：person 人物 id、stall 攤子的貨單


static func talk(ctx: Ctx) -> void:
	await Social.talk(ctx, ctx.extra.person)


static func gift(ctx: Ctx) -> void:
	await Social.gift(ctx, ctx.extra.person)


static func spar(ctx: Ctx) -> void:
	await Social.spar(ctx, ctx.extra.person)


static func teach(ctx: Ctx) -> void:
	await Social.teach(ctx, ctx.extra.person)


static func trade(ctx: Ctx) -> void:
	await Social.trade(ctx, ctx.extra.person, ctx.extra.get("stall", {}))


static func hobby(ctx: Ctx) -> void:
	await Social.hobby(ctx, ctx.extra.person)


## 湊過去聽兩個人聊天（extra.a、extra.b 是那兩個人）：聽一段閒話，有人物檔案的熟一點
static func listen(ctx: Ctx) -> void:
	var a: Dictionary = ctx.extra.a
	var b: Dictionary = ctx.extra.b
	var pool: Array = ctx.scene.life_group.script.call("gossip", a.name, b.name)
	await ctx.say(["你湊到%s和%s旁邊。" % [a.name, b.name]] + pool[randi() % pool.size()])
	for w in [a, b]:
		var pid: String = w.def.get("person", "")
		if pid != "":
			await Social.add_aff(ctx, Social.def(pid), 1)
