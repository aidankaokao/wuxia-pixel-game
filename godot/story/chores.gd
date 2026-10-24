## 青竹村的雜務（照網頁版鳴泉的雜務 CHORE_DONE：做事、順帶一點成長、一點酬勞）：
## 每件一天一次，花一個時辰、體力 15；做完拿一點銀兩或東西，順帶練到裝備中某一類武功（或某項生活技能），跟交辦的人熟一點。
## - 劈柴（杜大樑家門口的柴堆）：外功、4 兩
## - 挑水（老井，替竹風茶寮挑滿水缸，見 qingzhu/well_use）：輕功、3 兩、一包茶葉
## - 下田（田邊的鋤頭，幫阿牛）：烹飪、青菜兩把、蘿蔔一根、2 兩
## - 拉風箱（石家鐵鋪的爐子，幫石岳）：內功、4 兩
## 用到的旗標：chore_<雜務> 那天做過（記日子）

const KE := 8
const STAMINA := 15
const SLOT_NAME := {"outer": "外功", "inner": "內功", "light": "輕功"}

const Train := preload("res://story/train.gd")

const CHORES := {
	"chop": {"name": "劈柴", "who": "杜大樑", "person": "",
		"ask": "杜大樑家門口堆著一大落還沒劈的木頭。\n杜大樑：「後生，力氣用不完的話，幫我把這堆柴劈了？給你工錢。」",
		"lines": ["你掄起斧頭，一斧一斧把木頭劈開，再碼得整整齊齊。", "斧頭掄久了，手上的勁道越來越準。"],
		"silver": 4, "grow": {"slot": "outer", "exp": 10}},
	"water": {"name": "挑水", "who": "鍾嬸", "person": "zhong",
		"ask": "鍾嬸的茶寮一天要用好幾缸水。要替她挑水嗎？",
		"lines": ["你挑起扁擔，在井邊與茶寮之間來回了十幾趟，總算把水缸挑滿了。", "肩膀火辣辣地疼，腳步倒是越走越穩。", {"speaker": "鍾嬸", "text": "辛苦啦！這包茶葉你拿去。"}],
		"silver": 3, "items": {"tea": 1}, "grow": {"slot": "light", "exp": 10}},
	"farm": {"name": "下田", "who": "阿牛", "person": "",
		"ask": "田邊靠著一把鋤頭、一個竹簍。阿牛在田裡忙得滿頭大汗。\n要下去幫忙嗎？",
		"lines": ["你捲起褲管下了田，鋤草、培土、挑糞，一樣一樣跟著阿牛做。", "哪些菜該摘、哪些還得等，你也看出了一點門道。", {"speaker": "阿牛", "text": "幫大忙了！這幾把菜你拿回去吃。"}],
		"silver": 2, "items": {"greens": 2, "radish": 1}, "grow": {"craft": "cooking", "exp": 6}},
	"bellows": {"name": "拉風箱", "who": "石岳", "person": "shi",
		"ask": "爐火有點弱了。石岳頭也不抬：「閒著就來拉風箱。拉得勻，火才旺。」",
		"lines": ["你握住風箱的把手，一推一拉，爐膛裡的火苗跟著一起一伏。", "拉到後來，呼吸也跟著風箱勻了下來，丹田裡暖洋洋的。", {"speaker": "石岳", "text": "嗯，有點樣子。工錢拿去。"}],
		"silver": 4, "grow": {"slot": "inner", "exp": 10}},
}


static func chop(ctx: Ctx) -> void:
	await run(ctx, "chop")


static func farm(ctx: Ctx) -> void:
	# 阿牛不在田裡（下雨、夜裡、午飯）就沒人交辦
	var s := G.shichen_of()
	if G.weather in ["rain", "snow"] or s < 3 or s > 8 or s == 6:
		await ctx.say("田邊靠著一把鋤頭、一個竹簍。阿牛不在田裡。\n（阿牛平常卯時到午時、未時到酉時在田裡忙，下雨天不下田）")
		return
	await run(ctx, "farm")


static func bellows(ctx: Ctx) -> void:
	await run(ctx, "bellows", "一座燒得通紅的打鐵爐，旁邊連著一具大風箱。")


## 做一件雜務；look 是今天已經做過時的描述
static func run(ctx: Ctx, id: String, look := "") -> void:
	var d: Dictionary = CHORES[id]
	if ctx.flag("chore_" + id) == G.day:
		await ctx.say("%s\n（今天已經幫%s%s過了，明天再來吧）" % [look if look != "" else "這裡的活兒今天做完了。", d.who, d.name])
		return
	if await ctx.ask(d.ask, ["%s（一個時辰、體力 %d）" % [d.name, STAMINA], "算了"]) != 0:
		return
	if not await Train.exert(ctx, STAMINA, "累得手腳發軟，這活兒今天是幹不動了。"):
		return
	await ctx.work(id, "%s中……" % d.name)
	ctx.pass_time(KE)
	ctx.set_flag("chore_" + id, G.day)
	await ctx.say(d.lines + ["（做了一個時辰）"])
	var out := growth(d.grow)
	if int(d.get("silver", 0)) > 0:
		G.silver += int(d.silver)
		out.append("（%s給了你 %d 兩工錢）" % [d.who, d.silver])
	for it in d.get("items", {}):
		G.bag[it] = int(G.bag.get(it, 0)) + int(d.items[it])
		out.append("（得到了%s×%d）" % [ctx.item_name(it), d.items[it]])
	await ctx.say("\n".join(out))
	if d.person != "":
		await Social.add_aff(ctx, Social.def(d.person), 1)


## 雜務順帶的成長：武功挑裝備中、還沒到上限的那一門；生活技能直接加經驗
static func growth(g: Dictionary) -> Array:
	if g.has("craft"):
		var up := Crafts.gain(g.craft, int(g.exp))
		return ["（%s經驗 +%d）" % [Crafts.def(g.craft).name, g.exp]] + ([up] if up != "" else [])
	var list := Train.trainable(g.slot)
	if list.is_empty():
		return ["（裝備著還沒練到上限的%s，做這件雜務也能順便練一練）" % SLOT_NAME[g.slot]]
	return Train._exp_lines(list[0].id, int(g.exp), true)
