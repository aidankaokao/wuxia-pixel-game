class_name Quests
## 任務日誌（書本的「江湖事」）：每個任務的步驟都由劇情旗標算出來，不另外存。
## 新的任務：寫一個回傳 {id, title, giver, place, desc, done, steps: [[說明, 做到了沒]], reward} 的函式（還沒接的回傳空的），加進 all()。


static func all() -> Array:
	var out := []
	for q in [bandits(), xiaohu()]:
		if not q.is_empty():
			out.append(q)
	# 進行中的排前面
	out.sort_custom(func(a, b): return not a.done and b.done)
	return out


static func _f(k: String) -> int:
	return int(G.flags.get(k, 0))


## 蒼嵐山賊（story/qingzhu.gd 的 liu_talk、story/canglan.gd）
static func bandits() -> Dictionary:
	var q := _f("q_bandits")
	var boss := _f("bandit_boss")
	if q == 0 and boss == 0:
		return {}
	return {
		"id": "bandits", "title": "蒼嵐山賊", "giver": "柳承安", "place": "青竹村・蒼嵐山", "done": q == 3,
		"desc": "蒼嵐山上來了一夥自稱「斷崖寨」的山賊，寨主祁三刀三天兩頭下山搶糧。受青竹村村長柳承安所託，上山把他們趕走。" if q > 0 else "斷崖寨的山賊盤據蒼嵐山，你自己上山把他們挑了。",
		"steps": [
			["受村長柳承安所託", q > 0],
			["擊退山道上攔路的嘍囉", _f("bandit_scouts") > 0],
			["擊敗斷崖寨寨主祁三刀", boss > 0],
			["回青竹村向柳承安覆命", q == 3],
		],
		"reward": "銀兩 50、輕功「青竹步」與手札、名聲",
	}


## 小虎的木劍（人物檔案 xiaohu 的熟悉度事件與 on_gift，story/qingzhu.gd 的 xiaohu_gift）
static func xiaohu() -> Dictionary:
	var t := _f("xiaohu_tusk")
	if t == 0:
		return {}
	return {
		"id": "xiaohu", "title": "小虎的木劍", "giver": "石小虎", "place": "青竹村・石家鐵鋪", "done": t == 2,
		"desc": "石小虎想自己做一把木劍，劍柄要用山豬獠牙。蒼嵐山道上的山豬有時會掉獠牙，拿到後送給他（面對他按 G）。",
		"steps": [["答應石小虎", true], ["弄到一根山豬獠牙", t == 2 or int(G.bag.get("boar_tusk", 0)) > 0], ["把獠牙送給石小虎", t == 2]],
		"reward": "名聲、石岳肯理你了",
	}
