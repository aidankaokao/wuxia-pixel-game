## 野獸：撞上或對著按空白鍵就開打（grid_scene._fight_beast）。打贏了牠消失，過 respawn 秒（真實時間）才重生；
## 逃走、輸了牠還在（回來的頭幾秒不會又撞上，見 G.beast_grace）。


static func fight(ctx: Ctx) -> void:
	var def: Dictionary = ctx.extra.get("def", {})
	var key: String = ctx.scene.beast_key(def)
	var r := await ctx.battle(def.encounter)
	if r == "win":
		G.respawn_at[key] = Time.get_ticks_msec() / 1000.0 + float(def.get("respawn", 60))
		ctx.refresh()
