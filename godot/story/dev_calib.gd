## 開發用：有名有姓的對手改用人物表之後，校準遭遇戰的強弱倍數 scale（PLAN.md 4.40 第 5 步）。
## run:dev_calib/rates 印出每一組的勝率（各 300 場）；run:dev_calib/tune 對每一組二分搜尋 scale，讓勝率接近 TARGET。

## [說明, 連戰的遭遇戰, 主角的武功 {id: 重數}, 帶的金創藥]
const CASES := [
	["試劍顧小滿（剛出村）", ["trial_xiaoman"], {}, 0],
	["切磋柳青禾（剛出村）", ["spar_qinghe"], {}, 0],
	["切磋石岳（看過石碑）", ["spar_shiyue"], {"zhuying": 1}, 3],
	["正式考核連戰齊振遠、孟鐸（鳴泉4、吐納2）", ["exam_qi", "exam_meng"], {"mingquan": 4, "breathing": 2}, 0],
	["內門試劍何守一（鳴泉6、澄泉3、吐納3）", ["exam_he"], {"mingquan": 6, "chengquan": 3, "breathing": 3}, 0],
	["真傳試煉韓靖秋（鳴泉8、澄泉5、踏石3、吐納4）", ["trial_han"], {"mingquan": 8, "chengquan": 5, "tashi": 3, "breathing": 4}, 0],
	["寨主戰（初始）", ["camp"], {}, 3],
	["寨主戰（看過石碑）", ["camp"], {"zhuying": 1}, 3],
	["店裡的地痞（鳴泉3）", ["shop_ruffians"], {"mingquan": 3, "breathing": 2}, 0],
	["路上的甘十一（鳴泉3）", ["spar_wanderer"], {"mingquan": 3, "breathing": 2}, 0],
	# 煙州府城（4.42）：新的對手，目標是設計時定的難度
	["長風武館辛嵐（長風拳2、吐納2）", ["spar_xinlan"], {"changfeng": 2, "breathing": 2}, 0],
	["長風武館辛長風（長風拳6、吐納4）", ["spar_xinc"], {"changfeng": 6, "breathing": 4}, 0],
	["漕幫戴鐵肩（鳴泉3、吐納2）", ["berth_dai"], {"mingquan": 3, "breathing": 2}, 0],
	["青蚨會烏大烏二（鳴泉4、吐納2，帶藥）", ["berth_thugs"], {"mingquan": 4, "breathing": 2}, 3],
	# 潮信城（4.43）
	["鹽倉閻有方（鳴泉4、吐納2，帶藥）", ["salt_yan"], {"mingquan": 4, "breathing": 2}, 3],
	["巡鹽兵丁兩人（鳴泉3、吐納2）", ["salt_patrol"], {"mingquan": 3, "breathing": 2}, 0],
	# 回瀾刀門（4.44）
	["回瀾試刀林小漁（剛出村）", ["spar_hl_lin"], {}, 0],
	["回瀾正式考核郭長纜（回瀾4、觀潮2）", ["exam_hl_guo"], {"huilan_dao": 4, "guanchao": 2}, 0],
	["回瀾內門試刀蔚雲舒（回瀾6、觀潮3、踏浪2）", ["exam_hl_wei"], {"huilan_dao": 6, "guanchao": 3, "talang": 2}, 0],
	["回瀾大師兄雷震洋（回瀾6、觀潮3）", ["spar_hl_lei"], {"huilan_dao": 6, "guanchao": 3}, 0],
	["黑帆探子兩人（回瀾4、觀潮2）", ["hl_scouts"], {"huilan_dao": 4, "guanchao": 2}, 0],
	# 桑林城與千絲坊（4.45）
	["千絲試針苗阿蘿（剛出村）", ["spar_qs_miao"], {}, 0],
	["千絲繡手考核杜子衡（飛針4、纏絲2）", ["exam_qs_du"], {"feizhen": 4, "chansi": 2}, 0],
	["千絲金梭試喻小棠（飛針6、纏絲3、金梭2）", ["exam_qs_yu"], {"feizhen": 6, "chansi": 3, "jinsuo": 2}, 0],
	["千絲大師姊尹若絲（飛針6、纏絲3）", ["spar_qs_yinr"], {"feizhen": 6, "chansi": 3}, 0],
	["織造局廖貴與打手（鳴泉4、吐納2，帶藥）", ["sl_liao"], {"mingquan": 4, "breathing": 2}, 3],
	["夜巡地痞兩人（飛針4、纏絲2）", ["qs_night"], {"feizhen": 4, "chansi": 2}, 0],
	# 雲嶺、石壁村、霧鴉寨（4.46）
	["雲嶺山狼（剛出村）", ["wolf"], {}, 0],
	["雲嶺山狼群（鳴泉3、吐納2）", ["wolves"], {"mingquan": 3, "breathing": 2}, 0],
	["石壁村收稅嘍囉兩人（鳴泉3、吐納2）", ["wy_collectors"], {"mingquan": 3, "breathing": 2}, 0],
	["霧鴉寨哨兵兩人（鳴泉4、吐納2）", ["wy_sentries"], {"mingquan": 4, "breathing": 2}, 0],
	["霧鴉寨祁三刀與嘍囉（鳴泉4、吐納2，帶藥）", ["wy_qi"], {"mingquan": 4, "breathing": 2}, 3],
	["霧鴉寨寨主聶寒鴉（鳴泉5、吐納3，帶藥）", ["wy_nie"], {"mingquan": 5, "breathing": 3}, 3],
]
## 只校準這幾組（run:dev_calib/tune_new）
const NEW := ["雲嶺山狼（剛出村）", "雲嶺山狼群（鳴泉3、吐納2）", "石壁村收稅嘍囉兩人（鳴泉3、吐納2）", "霧鴉寨哨兵兩人（鳴泉4、吐納2）",
	"霧鴉寨祁三刀與嘍囉（鳴泉4、吐納2，帶藥）", "霧鴉寨寨主聶寒鴉（鳴泉5、吐納3，帶藥）"]
## 改之前（固定的遭遇戰）量到的勝率，tune 的目標；改之前就是九成五以上的只要求不要掉到九成五以下
const TARGET := {"試劍顧小滿（剛出村）": 0.80, "切磋柳青禾（剛出村）": 0.97, "切磋石岳（看過石碑）": 0.78, "正式考核連戰齊振遠、孟鐸（鳴泉4、吐納2）": 0.27,
	"內門試劍何守一（鳴泉6、澄泉3、吐納3）": 0.97, "真傳試煉韓靖秋（鳴泉8、澄泉5、踏石3、吐納4）": 0.26, "寨主戰（初始）": 0.40,
	"店裡的地痞（鳴泉3）": 0.97, "路上的甘十一（鳴泉3）": 0.97,
	"長風武館辛嵐（長風拳2、吐納2）": 0.6, "長風武館辛長風（長風拳6、吐納4）": 0.35, "漕幫戴鐵肩（鳴泉3、吐納2）": 0.7, "青蚨會烏大烏二（鳴泉4、吐納2，帶藥）": 0.6, "鹽倉閻有方（鳴泉4、吐納2，帶藥）": 0.6, "巡鹽兵丁兩人（鳴泉3、吐納2）": 0.7,
	"回瀾試刀林小漁（剛出村）": 0.75, "回瀾正式考核郭長纜（回瀾4、觀潮2）": 0.5, "回瀾內門試刀蔚雲舒（回瀾6、觀潮3、踏浪2）": 0.4, "回瀾大師兄雷震洋（回瀾6、觀潮3）": 0.3, "黑帆探子兩人（回瀾4、觀潮2）": 0.7,
	"千絲試針苗阿蘿（剛出村）": 0.75, "千絲繡手考核杜子衡（飛針4、纏絲2）": 0.5, "千絲金梭試喻小棠（飛針6、纏絲3、金梭2）": 0.4, "千絲大師姊尹若絲（飛針6、纏絲3）": 0.3,
	"織造局廖貴與打手（鳴泉4、吐納2，帶藥）": 0.6, "夜巡地痞兩人（飛針4、纏絲2）": 0.7,
	"雲嶺山狼（剛出村）": 0.85, "雲嶺山狼群（鳴泉3、吐納2）": 0.9, "石壁村收稅嘍囉兩人（鳴泉3、吐納2）": 0.75, "霧鴉寨哨兵兩人（鳴泉4、吐納2）": 0.75,
	"霧鴉寨祁三刀與嘍囉（鳴泉4、吐納2，帶藥）": 0.6, "霧鴉寨寨主聶寒鴉（鳴泉5、吐納3，帶藥）": 0.45}


## 主角：擲一個新角色，學會這些武功、練到這一重，重數到了的招式都悟出來（看過石碑的另外有竹影劍）
static func _hero(skills: Dictionary) -> Dictionary:
	var c := Sim.fresh(false)
	for sk in skills:
		Hero.learn(c, sk, skills[sk])
		var s := Hero.find_skill(c, sk)
		s.level = skills[sk]
		for mv in Hero.skill_def(sk).moves:
			if int(mv.get("level", 0)) <= int(skills[sk]) and not mv.id in s.moves:
				s.moves.append(mv.id)
	Hero.restore_all(c)
	return c


## 一組的勝率：每 10 場換一個新擲的角色（五維的差別很大，換少了雜訊大），連戰中間不補血
static func rate(case: Array, n := 300) -> float:
	var wins := 0
	for i in n:
		var c := _hero(case[2]) if i % 10 == 0 else c_cache
		if i % 10 == 0:
			c_cache = c
		var h: Dictionary = c.duplicate(true)
		Hero.restore_all(h)
		var ok := true
		for enc in case[1]:
			var r := Sim.one(h, enc, {"jinchuang": case[3]})
			if r.result != "win":
				ok = false
				break
			var u: Dictionary = (r.fight as Fight).unit("hero")
			h.hp = u.hp
			h.qi = u.qi
		if ok:
			wins += 1
	return float(wins) / n


static var c_cache := {}


## run:dev_calib/rates_new 只量 NEW 那幾組（沒名字的敵人沒有 scale，只能改數值後再量）
static func rates_new(ctx: Ctx) -> void:
	await rates(ctx, NEW)


static func rates(_ctx: Ctx, only: Array = []) -> void:
	var keep := {"bag": G.bag.duplicate(), "silver": G.silver}
	for cs in CASES:
		if only.size() > 0 and not cs[0] in only:
			continue
		print("CALIB %s：%d%%" % [cs[0], roundi(rate(cs) * 100)])
	G.bag = keep.bag
	G.silver = keep.silver


static func tune_new(ctx: Ctx) -> void:
	await tune(ctx, NEW)


## 對每一組二分搜尋遭遇戰的 scale（連戰的兩場用同一個倍數），印出結果
static func tune(_ctx: Ctx, only: Array = []) -> void:
	var keep := {"bag": G.bag.duplicate(), "silver": G.silver}
	var done := {}
	for cs in CASES:
		var target: float = TARGET.get(cs[0], -1.0)
		var key: String = cs[1][0]
		if target < 0 or done.has(key) or (only.size() > 0 and not cs[0] in only):
			continue
		# 改之前就很好打的：照原樣（scale 1）夠好打就不動
		if target >= 0.97:
			for e in cs[1]:
				Fight.encounter(e).scale = 1.0
			var r0 := rate(cs, 150)
			if r0 >= 0.95:
				print("CALIB %s：scale 1.00 → %d%%（不用調）" % [cs[0], roundi(r0 * 100)])
				done[key] = true
				continue
		var lo := 0.2
		var hi := 1.6
		var mid := 1.0
		for it in 8:
			mid = (lo + hi) / 2.0
			for e in cs[1]:
				Fight.encounter(e).scale = mid
			var r := rate(cs, 200)
			if r > target:
				lo = mid
			else:
				hi = mid
		for e in cs[1]:
			Fight.encounter(e).scale = snappedf(mid, 0.01)
		print("CALIB %s：scale %.2f → %d%%（目標 %d%%）" % [cs[0], mid, roundi(rate(cs) * 100), roundi(target * 100)])
		done[key] = true
	G.bag = keep.bag
	G.silver = keep.silver
