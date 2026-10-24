"""把網頁版匯出的人物檔案（tools/web_export/people.json）轉成 Godot 的格式，併進 data/people.json。
用法：python3 tools/conv_person.py 人物id [人物id…]；address、story、events 的腳本要另外補（網頁版是函式）。"""
import json, sys

def conv(p):
    out = {k: v for k, v in p.items() if not (isinstance(v, str) and v.startswith('<fn'))}
    if 'talk' in out:
        t = out['talk']; out['talk'] = {'gain': t['gain'], 'per_day': t.get('perDay', 1), 'after': t.get('after', 'chat')}
    evs = []
    for e in out.get('events', []):
        e = {k: v for k, v in e.items() if not (isinstance(v, str) and v.startswith('<fn'))}
        evs.append(e)
    if evs: out['events'] = evs
    return out

if __name__ == '__main__':
    web = json.load(open('tools/web_export/people.json'))
    mine = json.load(open('data/people.json'))
    for pid in sys.argv[1:]:
        mine[pid] = conv(web[pid])
        print(pid, list(mine[pid].keys()))
    json.dump(mine, open('data/people.json', 'w'), ensure_ascii=False, indent=1)
