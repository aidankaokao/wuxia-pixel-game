import { ITEMS } from '../game/character';

/**
 * 試作品的文字介面（純 HTML，疊在 3D 畫面上）：對話框、選項、商店。
 * 操作跟遊戲本體一樣：E／空白鍵確認、↑↓ 選擇、←→ 換分頁、X／Esc 關閉。介面開著時主角不會走動（busy）。
 */

export interface Line {
  speaker?: string;
  text: string;
}

/** 主角身上的銀兩與行囊（試作品自己記，不讀存檔） */
export const wallet = { silver: 120, bag: { boar_meat: 2, dog_pelt: 1, boar_tusk: 1, herb: 3, jinchuang: 1 } as Record<string, number> };

const root = document.createElement('div');
root.id = 'p-ui';
document.body.appendChild(root);
let handler: ((key: string) => void) | null = null;
export const busy = () => handler !== null;

addEventListener(
  'keydown',
  (e) => {
    if (!handler) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const k = e.key;
    handler(k === ' ' || k === 'Enter' || k.toLowerCase() === 'e' ? 'ok' : k === 'Escape' || k.toLowerCase() === 'x' ? 'back' : k);
  },
  true,
);

function render(html: string) {
  root.innerHTML = html;
}
const close = () => {
  handler = null;
  render('');
};

/** 一句一句說，按 E 下一句 */
export function say(...lines: Line[]): Promise<void> {
  return new Promise((done) => {
    let i = 0;
    const show = () => {
      const l = lines[i];
      render(`<div class="p-dialog">${l.speaker ? `<div class="p-speaker">${l.speaker}</div>` : ''}<div class="p-text">${l.text.replace(/\n/g, '<br>')}</div><div class="p-more">▼</div></div>`);
    };
    handler = (k) => {
      if (k !== 'ok' && k !== 'back') return;
      i++;
      if (i >= lines.length) {
        close();
        done();
      } else show();
    };
    show();
  });
}

/** 問一句、選一個；X 等於選最後一個 */
export function ask(prompt: Line, options: string[]): Promise<number> {
  return new Promise((done) => {
    let cur = 0;
    const show = () =>
      render(
        `<div class="p-dialog">${prompt.speaker ? `<div class="p-speaker">${prompt.speaker}</div>` : ''}<div class="p-text">${prompt.text}</div>
        <ul class="p-choices">${options.map((o, i) => `<li class="${i === cur ? 'on' : ''}">${i === cur ? '▶ ' : ''}${o}</li>`).join('')}</ul></div>`,
      );
    handler = (k) => {
      if (k === 'ArrowUp') cur = (cur + options.length - 1) % options.length;
      else if (k === 'ArrowDown') cur = (cur + 1) % options.length;
      else if (k === 'ok' || k === 'back') {
        close();
        return done(k === 'back' ? options.length - 1 : cur);
      }
      show();
    };
    show();
  });
}

/** 商店：買（stock）與賣（身上的東西，照半價收） */
export function shop(title: string, stock: string[], sellRate = 0.5): Promise<void> {
  return new Promise((done) => {
    let tab: 'buy' | 'sell' = 'buy';
    let cur = 0;
    let note = '';
    const list = () => (tab === 'buy' ? stock : Object.keys(wallet.bag).filter((id) => wallet.bag[id] > 0));
    const price = (id: string) => (tab === 'buy' ? ITEMS[id].price ?? 0 : Math.floor((ITEMS[id].price ?? 0) * sellRate));
    const show = () => {
      const items = list();
      cur = Math.min(cur, Math.max(0, items.length - 1));
      const sel = items[cur];
      render(`<div class="p-shop">
        <div class="p-shop-head"><b>${title}</b><span>銀兩 ${wallet.silver}</span></div>
        <div class="p-tabs"><span class="${tab === 'buy' ? 'on' : ''}">買</span><span class="${tab === 'sell' ? 'on' : ''}">賣</span><small>←→ 換分頁</small></div>
        <ul class="p-goods">${
          items.length
            ? items
                .map(
                  (id, i) =>
                    `<li class="${i === cur ? 'on' : ''}"><span>${i === cur ? '▶ ' : ''}${ITEMS[id].name}${tab === 'sell' ? `　×${wallet.bag[id]}` : wallet.bag[id] ? `<small>（身上 ${wallet.bag[id]}）</small>` : ''}</span><span>${price(id)} 兩</span></li>`,
                )
                .join('')
            : '<li class="muted">身上沒有可以賣的東西</li>'
        }</ul>
        <div class="p-desc">${sel ? ITEMS[sel].desc ?? '' : ''}</div>
        <div class="p-note">${note || 'E 買／賣一件　X 離開'}</div></div>`);
    };
    handler = (k) => {
      const items = list();
      if (k === 'ArrowUp') cur = (cur + items.length - 1) % Math.max(1, items.length);
      else if (k === 'ArrowDown') cur = (cur + 1) % Math.max(1, items.length);
      else if (k === 'ArrowLeft' || k === 'ArrowRight') {
        tab = tab === 'buy' ? 'sell' : 'buy';
        cur = 0;
        note = '';
      } else if (k === 'back') {
        close();
        return done();
      } else if (k === 'ok' && items[cur]) {
        const id = items[cur];
        const p = price(id);
        if (tab === 'buy') {
          if (wallet.silver < p) note = `銀兩不夠（要 ${p} 兩）`;
          else {
            wallet.silver -= p;
            wallet.bag[id] = (wallet.bag[id] ?? 0) + 1;
            note = `買了一件${ITEMS[id].name}（-${p} 兩）`;
          }
        } else {
          wallet.silver += p;
          wallet.bag[id] -= 1;
          if (!wallet.bag[id]) delete wallet.bag[id];
          note = `賣了一件${ITEMS[id].name}（+${p} 兩）`;
        }
      }
      show();
    };
    show();
  });
}
