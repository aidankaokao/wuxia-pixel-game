import type { Character } from './character';
import type { Script } from './events';
import type { World } from './home';
import type { Flags } from '../state/store';

/**
 * 官府的公告欄：三欄——重要大事、懸賞公告、日常公告。
 * 每一欄的告示由各處用 `registerNotices` 註冊（依狀態算出來，不存檔）：
 * - 重要大事：官府的消息、伏筆（story/yamen.ts）
 * - 懸賞公告：懸賞（story/linjiang_jianghu.ts）
 * - 日常公告：房屋、店鋪出售與招租（story/property.ts）
 * 告示可以帶一個動作（例如揭榜）：在公告欄上選了它，面板關起來後由腳本接著做（store 的 noticePick）。
 */

export type NoticeTab = 'big' | 'urgent' | 'daily';
export const NOTICE_TABS: { id: NoticeTab; name: string }[] = [
  { id: 'big', name: '重要大事' },
  { id: 'urgent', name: '懸賞公告' },
  { id: 'daily', name: '日常公告' },
];

export interface Notice {
  id: string;
  tab: NoticeTab;
  title: string;
  /** 告示內文（可以有好幾段） */
  text: string[];
  /** 落款，例如「臨江縣正堂」 */
  by?: string;
  /** 貼到哪天（日常公告的期限） */
  until?: number;
  /** 右下角的小字，例如「賞銀 30 兩」「要價 420 兩」 */
  tag?: string;
  /** 選了這張告示要做的事 */
  act?: { label: string; run: Script };
}

export interface NoticeView {
  hero: Character;
  flags: Flags;
  world: World;
}

type Provider = (v: NoticeView) => Notice[];
const PROVIDERS: Provider[] = [];
export const registerNotices = (p: Provider) => PROVIDERS.push(p);
export const allNotices = (v: NoticeView) => PROVIDERS.flatMap((p) => p(v));
