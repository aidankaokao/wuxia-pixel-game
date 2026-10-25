extends Node
## 開發用的自動操作與截圖（給自動化測試；平常玩不會用到）。
## 在指令列 -- 後面帶參數：--scene=plain --time=2 --weather=rain
##   --do="wait:60;warp:33,22;face:-1,0;key:E;wait:20;shot:a.png;key:Down;click:5,3;quit"
## warp／face 只在青竹村有用；click 是點戰場上的格子（欄,列）。

var _steps: PackedStringArray


static func args() -> Dictionary:
	var out := {}
	for a in OS.get_cmdline_user_args():
		if a.begins_with("--") and a.contains("="):
			var kv := a.substr(2).split("=", true, 1)
			out[kv[0]] = kv[1]
	return out


func _ready() -> void:
	var a := args()
	if not a.has("do"):
		return
	_steps = (a["do"] as String).split(";", false)
	_run.call_deferred()


func _main() -> Node:
	return get_tree().current_scene


func _press(name: String) -> void:
	# 可以帶修飾鍵，例如 key:Ctrl+S
	var ctrl := name.begins_with("Ctrl+")
	var code := OS.find_keycode_from_string(name.trim_prefix("Ctrl+"))
	for down in [true, false]:
		var e := InputEventKey.new()
		e.keycode = code
		e.physical_keycode = code
		e.ctrl_pressed = ctrl
		e.pressed = down
		Input.parse_input_event(e)
		await get_tree().process_frame


func _run() -> void:
	for s in _steps:
		var p := s.split(":", true, 1)
		var cmd := p[0]
		var arg := p[1] if p.size() > 1 else ""
		match cmd:
			"wait":
				for i in int(arg):
					await get_tree().process_frame
			"key":
				await _press(arg)
				for i in 6:
					await get_tree().process_frame
			"hold":
				# hold:Right,30 按住幾格畫面
				var kv := arg.split(",")
				var code := OS.find_keycode_from_string(kv[0])
				var e := InputEventKey.new()
				e.keycode = code
				e.pressed = true
				Input.parse_input_event(e)
				for i in int(kv[1]):
					await get_tree().process_frame
				e = e.duplicate()
				e.pressed = false
				Input.parse_input_event(e)
			"yaw":
				# 鏡頭轉到幾度（0 是從正南方看）
				var rg = _main().rig
				rg.yaw = deg_to_rad(float(arg))
				rg.yaw_goal = rg.yaw
			"warp":
				var xy := arg.split(",")
				var v = _main().scene
				if v is GridScene:
					v.hero.position = v.w3(int(xy[0]), int(xy[1]))
					v.rig.position = v.hero.position
			"tread":
				# tread:15,10 站到那一格並當成踩上去（觸發 triggers）
				var xy2 := arg.split(",")
				var v2 = _main().scene
				if v2 is GridScene:
					v2.hero.position = v2.w3(int(xy2[0]), int(xy2[1]))
					v2.rig.position = v2.hero.position
					v2._trigger(Vector2i(int(xy2[0]), int(xy2[1])))
			"meet":
				# meet:liu 站到這個人旁邊、面對他
				var v3 = _main().scene
				if v3 is GridScene:
					for w in v3.walkers:
						if w.get("id", "") == arg:
							w.goal = null
							w.fixed = true
							var at: Vector3 = w.f.position + Vector3(0, 0, 1.0)
							v3.hero.position = at
							v3.hero.face(w.f.position - at)
							v3.rig.position = at
			"day":
				# day:10,60 跳到第幾天的第幾刻（不經過中間的日子）
				var dp := arg.split(",")
				G.day = int(dp[0])
				if dp.size() > 1:
					G.time = int(dp[1])
				G.weather = "clear"
				G.time_changed.emit()
				if _main().scene is GridScene:
					_main().scene.refresh()
			"bmode":
				# bmode:wait／live／round 設定戰鬥模式（下一場起）
				if not G.life.has("settings"):
					G.life.settings = {}
				G.life.settings.battle = arg
			"seed":
				# seed:1 固定存檔的亂數種子（到處翻找藏東西的地方跟著它）
				G.life.seed = int(arg)
			"aff":
				# aff:bu,15 把某人的熟悉度設成多少
				var af := arg.split(",")
				Social._mut(af[0]).aff = int(af[1])
			"sect":
				# sect:mingquan 直接拜入某個門派（記名弟子）；sect:mingquan,1,200 指定身分、功績（入門與升級都當成 90 天前）
				var sp := arg.split(",")
				Sect.join(sp[0])
				G.sect.rank = int(sp[1]) if sp.size() > 1 else 0
				G.sect.merit = int(sp[2]) if sp.size() > 2 else 0
				G.sect.joined = G.day - 90
				G.sect.rank_day = G.day - 90
				G.flags["mq_join"] = 1
				# 第四個是真傳弟子的師父：sect:mingquan,3,0,su,hantan
				if sp.size() > 4:
					G.sect.master = sp[3]
					G.sect.master_skill = sp[4]
			"learn":
				# learn:mingquan,4 學會（或直接練到）某門武功的第幾重
				var lp := arg.split(",")
				Hero.learn(G.hero, lp[0], int(lp[1]) if lp.size() > 1 else 1)
				var ls := Hero.find_skill(G.hero, lp[0])
				ls.level = maxi(int(ls.level), int(lp[1]) if lp.size() > 1 else 1)
			"craft":
				# craft:weaving,2 把某項生活技能設成第幾級
				var cp := arg.split(",")
				if not G.hero.has("crafts"):
					G.hero.crafts = {}
				G.hero.crafts[cp[0]] = {"level": int(cp[1]), "exp": 0}
			"flag":
				# flag:bandit_boss=1
				var kv2 := arg.split("=")
				G.flags[kv2[0]] = int(kv2[1]) if kv2.size() > 1 else 1
				if _main().scene is GridScene:
					_main().scene.refresh()
			"sim":
				# sim 或 sim:300 跑戰鬥平衡模擬（印在主控台，見 scripts/sim.gd）
				if arg == "boss":
					Sim.boss()
				elif arg.begins_with("atb"):
					# sim:atb 頭目與石岳：回合制、半即時各跑一次對照；sim:atb,基礎值,速度係數 只跑半即時（調公式用）
					var ap := arg.split(",")
					if ap.size() > 2:
						Sim.atb_base = float(ap[1])
						Sim.atb_per = float(ap[2])
					else:
						print("--- 回合制 ---")
						Sim.boss()
					Sim.atb = true
					print("--- 半即時（%s + 速度×%s）---" % [Sim.atb_base, Sim.atb_per])
					Sim.boss()
					Sim.atb = false
				elif arg.begins_with("one"):
					var t0 := Time.get_ticks_msec()
					var c := Sim.fresh(false)
					var r := Sim.one(c, arg.split(",")[1], {"jinchuang": 3})
					print("SIM one ", r.result, " rounds ", r.rounds, " ms ", Time.get_ticks_msec() - t0)
				else:
					Sim.report(int(arg) if arg != "" else 300)
			"give":
				# give:manual_qingzhu 或 give:jinchuang,3 放進行囊
				var gv := arg.split(",")
				G.bag[gv[0]] = int(G.bag.get(gv[0], 0)) + (int(gv[1]) if gv.size() > 1 else 1)
			"mount":
				# mount:jujube 給一匹馬（州圖上就騎著）
				G.hero.mount = arg
				var ms = _main().scene
				if ms and ms.has_method("mount_up"):
					ms.mount_up()
			"run":
				# run:road/ev_peddler 在現在的場景跑一個劇情腳本（不等它跑完）
				var sc = _main().scene
				if sc is GridScene:
					Story.run(arg, sc, {"road": "沿江大道", "near": ["qingzhu", "biyi"]})
			"fishbot":
				# fishbot:perfect／ok／late 釣魚的小遊戲自己玩（空的就關掉）
				FishGame.bot = arg
			"readbot":
				# readbot:perfect／readbot:good 研讀的小遊戲自己玩（空的就關掉）
				ReadGame.bot = arg
			"autobattle":
				# autobattle:camp,10 在六角格戰場上用自動戰鬥連打幾場（加速），印出勝負（跟 sim 的規則層模擬對照）
				var ab := arg.split(",")
				var wins := 0
				var n := int(ab[1]) if ab.size() > 1 else 5
				Engine.time_scale = 12.0
				# 結算的對話自動按掉
				var tick := Timer.new()
				tick.wait_time = 0.4
				add_child(tick)
				tick.timeout.connect(func() -> void:
					var hb2 = _main().scene
					if hb2 is HexBattle:
						hb2.auto = true
					elif _main().ui._open:
						_main().ui._key.emit("ok"))
				tick.start()
				for i in n:
					Hero.restore_all(G.hero)
					G.bag["jinchuang"] = 3
					var r: String = await _main().battle(ab[0], "hill")
					if r == "win":
						wins += 1
					print("AUTO ", ab[0], " #", i + 1, " ", r, " 剩血 ", G.hero.hp)
					_main().ui._close()
				tick.queue_free()
				Engine.time_scale = 1.0
				print("AUTO ", ab[0], " 勝 ", wins, "/", n)
			"fx":
				# fx:slash 在戰場上讓主角對第一個敵人演一次特效（看特效用）
				var hb = _main().scene
				if hb is HexBattle:
					var a: Dictionary = hb._body_id("hero")
					var t: Dictionary = hb.bodies.filter(func(o): return o.u.side == "enemy")[0]
					BattleFx.hit(hb, arg, a.f.position + Vector3(0, 0.75, 0), t.f.position + Vector3(0, 0.75, 0), false)
			"god":
				# 把主角五維拉高、補滿（測打贏之後的劇情）
				for k in G.hero.base:
					G.hero.base[k] = 60
				Hero.restore_all(G.hero)
			"go":
				# go:plain 跟按左上的按鈕一樣
				_main().go(arg)
			"battle":
				# battle:scouts 或 battle:dog,river 直接開打（不等它打完）
				var bp := arg.split(",")
				_main().battle(bp[0], bp[1] if bp.size() > 1 else "")
			"size":
				# size:60 鏡頭拉遠（正交鏡頭的大小）
				var rg = _main().rig
				rg.size_max = maxf(rg.size_max, float(arg))
				rg.size = float(arg)
			"face":
				var d := arg.split(",")
				var v = _main().scene
				if v is GridScene:
					v.hero.face(Vector3(float(d[0]), 0, float(d[1])))
			"click":
				var cr := arg.split(",")
				var b = _main().scene
				if b is HexBattle:
					b.click(Vector2i(int(cr[0]), int(cr[1])))
			"shot":
				await RenderingServer.frame_post_draw
				var img := get_viewport().get_texture().get_image()
				img.save_png(arg if arg.is_absolute_path() else OS.get_environment("SHOT_DIR").path_join(arg))
			"pos":
				# 印出現在的地圖與主角站的格子
				var vp = _main().scene
				if vp is GridScene:
					print("POS ", vp.get("map_id") if vp.get("map_id") else vp.get("room_id"), " ", vp._grid(vp.hero.position))
			"print":
				print("INFO ", _main().ui.info.text.replace("\n", " | "), " | 旗標 ", G.flags, " | 行囊 ", G.bag, " | 交情 ", G.relations.keys().map(func(k): return "%s:%d" % [k, int(G.relations[k].aff)]))
			"dlg":
				# 印出對話框、商店上的字
				var texts := []
				for n in _main().ui.find_children("*", "Label", true, false):
					if n != _main().ui.info and n != _main().ui.help and n.is_visible_in_tree():
						texts.append(n.text)
				print("DLG ", " | ".join(texts))
			"hide":
				# 自動測試時把視窗縮到 Dock，不打擾使用者（畫面照樣畫得出來就能截圖）
				get_window().mode = Window.MODE_MINIMIZED
			"nooutline":
				for c in _main().rig.cam.get_children():
					c.visible = false
			"noshadow":
				_main().sun.shadow_enabled = false
			"shadowdist":
				_main().sun.directional_shadow_max_distance = float(arg)
			"winpos":
				print("WIN ", get_window().position, " SCREEN ", DisplayServer.screen_get_size())
			"quit":
				get_tree().quit()
