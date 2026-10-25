## 掌櫃代管與供應商（照網頁版 story/managers.ts、story/supplier.ts）：
## - manage_daily（每天半夜，shop.gd 結算、擲完事件以後呼叫）：照總號的方針替東家處理店裡的事（加薪、偷懶、地痞、大主顧、老饕）、
##   缺人補人、年度加薪的設定、櫃上留周轉金其餘交回總號帳房（不夠由帳房補）；大掌櫃另外管那座城租出去的房子（屋漏、手頭緊、收租交帳房）；
##   合約快到期就照原期限續約（簽約費從帳房付）。掌櫃的經驗、才幹、忠誠也在這裡長。做了什麼都記在那家店的帳本上。
## - 供應商要親自上門談才簽得了約：地圖上負責的人在自己的對話最前面呼叫 offer(ctx, 供應商 id)（有「東家」稱號、又有用得上的店才問）。
## - 萬通牙行的錢六介紹掌櫃（hire_talk，介紹費三十兩）。

static func _say(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


# ── 每天半夜 ────────────────────────────────────────────

static func _handle(s: Dictionary, id: String, m: Dictionary) -> void:
	var e: Dictionary = s.get("event", {})
	if e.is_empty() or int(e.day) > G.day:
		return
	var p: Dictionary = Biz.biz().policy
	var who := Biz.mgr_title(m)
	match e.kind:
		"raise":
			if p.raise == "agree":
				if not s.has("raises"):
					s.raises = {}
				s.raises[e.staff] = int(s.raises.get(e.staff, 0)) + 1
				Biz.add_morale(s, e.staff, 20)
				Biz.note(s, "%s答應給%s加薪一兩" % [who, e.staff])
			elif randf() < 0.5:
				Biz.drop_staff(s, e.staff)
				Biz.note(s, "%s沒答應加薪，%s辭工走了" % [who, e.staff])
			else:
				Biz.add_morale(s, e.staff, -15)
				Biz.note(s, "%s沒答應給%s加薪" % [who, e.staff])
		"slack":
			if p.slack == "fire":
				Biz.drop_staff(s, e.staff)
				Biz.note(s, "%s查出%s偷懶，把人辭了" % [who, e.staff])
			elif p.slack == "dock":
				s.till = float(s.till) + 10
				Biz.add_morale(s, e.staff, -15)
				Biz.note(s, "%s查出%s偷懶，扣了十兩工錢" % [who, e.staff])
			else:
				Biz.add_morale(s, e.staff, -5)
				Biz.note(s, "%s把偷懶的%s訓了一頓" % [who, e.staff])
		"ruffian":
			var here: Array = Biz.TOWN_GUARDS.get(Biz.shop_town(id), [])
			if p.ruffian == "pay":
				s.till = float(s.till) - 20
				Biz.note(s, "%s照方針給了蔡三二十兩保護費" % who)
			elif p.ruffian in here and not s.has("guard"):
				var g := Biz.guard_def(p.ruffian)
				s.guard = {"source": p.ruffian, "name": _free_guard(p.ruffian), "since": G.day}
				Biz.note(s, "%s請了%s的%s%s來坐鎮，蔡三見了就跑" % [who, g.from, g.title, s.guard.name])
			else:
				s.till = float(s.till) - 5
				Biz.note(s, "%s派人報官，捕快把蔡三趕走了" % who)
			s.safeUntil = G.day + 10
		"patron":
			var have := int(s.stock.get(e.item, 0))
			if p.patron == "accept" and have >= int(e.n):
				var pay := roundi(Biz.shop_price(s, e.item) * 1.5) * int(e.n)
				s.stock[e.item] = have - int(e.n)
				if int(s.stock[e.item]) <= 0:
					s.stock.erase(e.item)
				s.till = float(s.till) + pay
				Biz.note(s, "%s把%s×%d送到周府，收了 %d 兩" % [who, Ui.item_def(e.item).get("name", ""), int(e.n), pay])
			elif p.patron == "decline" or G.day > int(e.until):
				Biz.note(s, "%s回了周府的訂單" % who)
			else:
				# 貨還不夠，等到期限前看看
				return
		"critic":
			var dishes: Array = s.stock.keys().filter(func(k): return Ui.item_def(k).has("dish"))
			dishes.sort_custom(func(a, b): return _q(a) > _q(b))
			if dishes.size() > 0:
				var k: String = dishes[0]
				var q := _q(k)
				s.stock[k] = int(s.stock[k]) - 1
				if int(s.stock[k]) <= 0:
					s.stock.erase(k)
				s.buzz = {"until": G.day + 5, "mult": 1.25} if q == 3 else ({"until": G.day + 4, "mult": 1.1} if q == 2 else {"until": G.day + 3, "mult": 0.9})
				Biz.note(s, "%s端了%s給老饕郝一嚐，%s" % [who, Ui.item_def(k).name, "大受稱讚" if q == 3 else ("還算滿意" if q == 2 else "他搖搖頭走了")])
			else:
				Biz.note(s, "%s沒有菜可端，老饕郝一嚐走了" % who)
	s.erase("event")


static func _q(k: String) -> int:
	return 3 if k.ends_with("_3") else (2 if k.ends_with("_2") else 1)


## 同一家來源的人輪著派，別家店請走的不重複
static func _free_guard(source: String) -> String:
	var used := []
	for s in Biz.shops().values():
		if s.has("guard"):
			used.append(s.guard.name)
	for n in Biz.guard_def(source).names:
		if not n in used:
			return n
	return Biz.guard_def(source).names[0]


static func free_guard(source: String) -> String:
	return _free_guard(source)


static func _hire_if_short(s: Dictionary, m: Dictionary) -> void:
	if not Biz.biz().policy.hire or (s.staff as Array).size() >= int(Biz.level_def(s).staff):
		return
	var pool := Biz.hire_pool()
	if pool.is_empty():
		return
	Biz.hire_staff(s, pool[0].name)
	Biz.note(s, "%s從牙行雇了%s" % [Biz.mgr_title(m), pool[0].name])


## 大掌櫃管的城：租出去的房子
static func _manage_houses(m: Dictionary) -> void:
	var b := Biz.biz()
	var p: Dictionary = b.policy
	var mk := Biz.market()
	for id in mk.owned:
		var d := Biz.prop_def(id)
		if Biz.town_of_map(d.map) != m.get("town", ""):
			continue
		var o: Dictionary = mk.owned[id]
		var e: Dictionary = o.get("event", {})
		match e.get("kind", ""):
			"leak":
				var cost := maxi(8, roundi(float(d.rent) * 0.6))
				if cost <= int(p.repair) and int(b.vault) >= cost:
					b.vault = int(b.vault) - cost
					o.erase("event")
			"late":
				if p.late == "grace":
					o.event = {"kind": "gift", "day": G.day}
				elif p.late == "forgive":
					o.rentPaidTo = int(o.get("rentPaidTo", int(o.get("rentFrom", G.day)) + Biz.TENANT_DAYS)) + Biz.XUN
					o.erase("event")
				else:
					b.vault = int(b.vault) + roundi(float(d.rent) / 2.0)
					o.erase("event")
					if randf() < 0.3:
						o.rentFrom = G.day
			"gift":
				# 送的東西大掌櫃收下，放在帳房（不計）
				o.erase("event")
		var due := Biz.rent_due(d, o)
		if int(due[1]) > 0 and d.kind != "business":
			b.vault = int(b.vault) + int(due[0])
			o.rentPaidTo = int(o.get("rentPaidTo", int(o.rentFrom) + Biz.TENANT_DAYS)) + int(due[1]) * Biz.XUN


static func manage_daily() -> void:
	var b := Biz.biz()
	if (b.managers as Array).is_empty():
		return
	var p: Dictionary = b.policy
	for id in Biz.shops():
		var s: Dictionary = Biz.shops()[id]
		var m := Biz.manager_of(id)
		if m.is_empty():
			continue
		_handle(s, id, m)
		_hire_if_short(s, m)
		# 年度加薪照方針（shop_events 那邊照 s.yearly 加）
		s.yearly = int(p.yearly)
		# 櫃上留周轉金，多的交帳房，不夠由帳房補
		var fl := int(p.float)
		if float(s.till) > fl:
			b.vault = int(b.vault) + roundi(float(s.till) - fl)
			s.till = fl
		elif float(s.till) < 0 and int(b.vault) > 0:
			var n := mini(int(b.vault), roundi(-float(s.till)))
			b.vault = int(b.vault) - n
			s.till = float(s.till) + n
	for m in b.managers:
		var n2 := Biz.shops().keys().filter(func(k): return Biz.manager_of(k).get("id", "") == m.id).size()
		var town_boss: bool = int(m.rank) == 2 and m.get("town", "") != ""
		if town_boss:
			_manage_houses(m)
		if n2 == 0 and not town_boss:
			continue
		# 經驗與才幹
		var before := floori(float(m.exp) / 60.0)
		m.exp = float(m.exp) + maxi(1, n2)
		if floori(float(m.exp) / 60.0) > before and int(m.talent) < 10:
			m.talent = int(m.talent) + 1
		# 忠誠：薪水公道就慢慢長
		var fair: bool = int(m.salary) >= int(m.talent) + 2 or float(m.share) >= 0.1
		m.loyalty = clampf(float(m.loyalty) + (0.2 if fair else -0.3), 0.0, 100.0)
	# 合約快到期：照原期限續約，簽約費從帳房付
	if p.renew:
		for sup in b.contracts:
			var c: Dictionary = b.contracts[sup]
			if int(c.until) > G.day + 1:
				continue
			var t := Biz.term(c.term)
			if int(b.vault) < int(t.fee):
				continue
			b.vault = int(b.vault) - int(t.fee)
			c.until = maxi(int(c.until), G.day) + int(t.days)


# ── 供應商 ──────────────────────────────────────────────

## 這家供應商的貨，你的店用得上嗎
static func useful(sup: String) -> bool:
	for s in Biz.shops().values():
		for k in Ui.all_items():
			if not Biz.sup_goods(sup, k):
				continue
			if s.type == "restaurant" and Ui.item_def(k).category == "食材":
				return true
			if Biz.accepts(s.type, k):
				return true
	return false


## 簽約或續約（續約從原本的到期日往後接）：回傳一句話
static func sign_contract(sup: String, term_id: String) -> String:
	var t := Biz.term(term_id)
	if G.silver < int(t.fee):
		return "簽約費 %d 兩，身上不夠。" % t.fee
	G.silver -= int(t.fee)
	var b := Biz.biz()
	var old: Dictionary = b.contracts.get(sup, {})
	var live: bool = not old.is_empty() and int(old.until) >= G.day
	var from: int = int(old.until) if live else G.day
	b.contracts[sup] = {"term": term_id, "since": int(old.since) if live else G.day, "until": from + int(t.days)}
	if not sup in b.signed:
		b.signed.append(sup)
	return "跟%s簽了%s的約（到%s）%s。" % [Biz.supplier(sup).name, t.name, G.date_text(from + int(t.days)), "，進價再讓 %d%%" % roundi(float(t.disc) * 100) if float(t.disc) > 0 else ""]


static func contract_talk(ctx: Ctx, sup: String) -> void:
	var d := Biz.supplier(sup)
	var say := _say(d.contact)
	var samples := []
	for k in Ui.all_items():
		if Biz.sup_goods(sup, k):
			samples.append(ctx.item_name(k))
		if samples.size() >= 6:
			break
	var c: Dictionary = Biz.biz().contracts.get(sup, {})
	var lines := [say.call("%s供的是：%s%s。" % [d.name, "、".join(samples), "……" if samples.size() >= 6 else ""]),
		say.call("進價大約是行情的 %d%%%s；%s。" % [roundi(float(d.ratio) * 100), "，每件另加運費 %s 兩" % str(d.freight) if float(d.freight) > 0 else "", "從不誤事" if float(d.reliable) >= 0.95 else ("偶爾會晚" if float(d.reliable) >= 0.9 else "遇上壞天氣就斷貨")])]
	if not c.is_empty() and int(c.until) >= G.day:
		lines.append(say.call("咱們的約到%s。要續的話，從那天往後接。" % G.date_text(int(c.until))))
	await ctx.say(lines)
	var i := await ctx.ask(say.call("簽多久？簽得越久，價錢讓得越多。"), Biz.TERMS.map(func(t): return "%s（簽約費 %d 兩%s）" % [t.name, t.fee, "，再讓 %d%%" % roundi(float(t.disc) * 100) if float(t.disc) > 0 else ""]) + ["再想想"])
	if i >= Biz.TERMS.size():
		return
	var paid := G.silver >= int(Biz.TERMS[i].fee)
	var msg := sign_contract(sup, Biz.TERMS[i].id)
	if paid:
		await ctx.say([say.call("好！白紙黑字，按了手印就算數。往後每天半夜，貨照你店裡的單子送到。"), msg, "（到店裡的「經營管理」→「進貨」改成批貨、設定每樣補到幾件，貨才會送來）"])
	else:
		await ctx.say(msg)


## 地圖上的供應商：有「東家」的稱號、又有用得上的店，先問要不要談合約（談了回傳 true，不談就照原本的對話）
static func offer(ctx: Ctx, sup: String) -> bool:
	if not Biz.has_title() or not useful(sup):
		return false
	var d := Biz.supplier(sup)
	if await ctx.ask(_say(d.contact).call("%s東家來啦！是來談供貨的？" % G.hero.get("surname", "")), ["談供貨合約", "別的事"]) != 0:
		return false
	await contract_talk(ctx, sup)
	return true


# ── 掌櫃 ────────────────────────────────────────────────

static func pool() -> Array:
	return Biz.MANAGER_POOL.filter(func(p): return not Biz.biz().managers.any(func(m): return m.name == p.name))


static func hire_talk(ctx: Ctx) -> void:
	var say := _say("錢六")
	var list := pool()
	if list.is_empty():
		await ctx.say(say.call("城裡能當掌櫃的人，都讓您請走啦！"))
		return
	await ctx.say([say.call("要找掌櫃？有了好掌櫃，東家就不必事事操心。我這兒有幾個人，您挑挑。"), say.call("掌櫃管一家店；大掌櫃能把整座城的店與房子都管起來。薪水之外，照規矩還要分點紅。")])
	var i := await ctx.ask(say.call("看上哪一位？"), list.map(func(p): return "%s（%s・才幹 %d・日薪 %d・分紅 %d%%）：%s" % [p.name, "大掌櫃" if int(p.rank) == 2 else "掌櫃", p.talent, p.salary, roundi(float(p.share) * 100), p.desc]) + ["再想想"])
	if i >= list.size():
		return
	if await ctx.ask(say.call("介紹費 %d 兩。人我叫來，往後他的薪水從店裡出。" % Biz.HIRE_FEE), ["就他了", "算了"]) != 0:
		return
	if not ctx.pay(Biz.HIRE_FEE):
		await ctx.say(say.call("介紹費都拿不出來？那可不成。"))
		return
	var p: Dictionary = list[i].duplicate()
	var b := Biz.biz()
	p.id = "m%d_%d" % [G.day, (b.managers as Array).size()]
	p.since = G.day
	p.skim = 0
	p.exp = Biz.PROMOTE.exp if int(p.rank) == 2 else 0
	b.managers.append(p)
	await ctx.say([{"speaker": p.name, "text": "見過東家！往後店裡的事，交給在下就是。"}, "（雇了%s。到店裡櫃台的「總號帳簿」→「掌櫃」指派他管哪家店%s）" % [Biz.mgr_title(p), "或哪座城" if int(p.rank) == 2 else ""]])


# ── 今日事 ──────────────────────────────────────────────

static func tasks() -> Array:
	if not G.life.has("biz"):
		return []
	var b := Biz.biz()
	var out := []
	if int(b.vault) >= 50:
		out.append({"text": "總號帳房有 %d 兩可提" % int(b.vault), "state": "todo", "note": "自己任何一家店的櫃台"})
	for sup in b.contracts:
		var left := int(b.contracts[sup].until) - G.day
		if left < 0 or left > 3 or (b.policy.renew and (b.managers as Array).size() > 0):
			continue
		out.append({"text": "%s的供貨合約%s到期" % [Biz.supplier(sup).name, "%d 天後" % left if left > 0 else "今天"], "state": "todo", "note": "總號帳簿的「供應商」可以續約"})
	return out
