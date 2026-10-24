class_name Practice
## 小遊戲的共用規則（研讀、釣魚，之後的琴棋書畫也照這套）：
## - 每一種玩法（id，例如 "read:stele"、"fish"）第一次一定要親自玩；
## - 之後每次可以選「親自」再玩一次，或「自動」：自動的成果是上一次親自玩的八成（AUTO_RATE）；
## - 親自玩得不好，隨時可以再親自玩，自動的成果照新的那一次算。
## 紀錄存在 G.hero.practice[id] = {last 上一次親自的成績, best 最好的一次, times 親自玩過幾次}；成績的意思由各玩法自己定（體會點數、上鉤的成色……）。

const AUTO_RATE := 0.8


static func rec(id: String) -> Dictionary:
	if not G.hero.has("practice"):
		G.hero.practice = {}
	if not G.hero.practice.has(id):
		G.hero.practice[id] = {"last": 0, "best": 0, "times": 0}
	return G.hero.practice[id]


static func tried(id: String) -> bool:
	return int(rec(id).times) > 0


## 上一次親自玩的成績
static func last(id: String) -> float:
	return float(rec(id).last)


## 自動的成果：上一次親自的八成
static func auto_value(id: String) -> float:
	return last(id) * AUTO_RATE


## 親自玩完記下成績
static func done(id: String, score: float) -> void:
	var r := rec(id)
	r.last = score
	r.best = maxf(float(r.best), score)
	r.times = int(r.times) + 1


## 問要親自還是自動：第一次只能親自。first 是第一次的選項文字，manual／auto 是之後的兩個選項文字。
## 回傳 0 親自、1 自動、-1 不做
static func choose(ctx: Ctx, id: String, prompt: String, first: String, manual: String, auto: String) -> int:
	if not tried(id):
		return 0 if await ctx.ask(prompt, [first, "算了"]) == 0 else -1
	var c := await ctx.ask(prompt, [manual, auto, "算了"])
	return c if c < 2 else -1
