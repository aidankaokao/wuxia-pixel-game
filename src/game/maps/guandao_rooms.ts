import { teahouseTalk } from '../story/ferry';
import { by, exitTo, room } from './rooms';
import type { MapDef } from './types';

/** 雲水茶棚：渡口西岸給旅人歇腳的茶棚，吃點東西、歇一晚。出口回到渡口的茶棚門口。 */
export const gdTeahouse: MapDef = {
  id: 'gd_teahouse',
  name: '雲水茶棚',
  subtitle: '雲水渡口・茶棚',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, script: teahouseTalk, label: '吃東西／歇腳' },
    { sprite: 'jars', x: 6, y: 1, w: 2, lines: [{ text: '一罈罈的醃菜和粗茶，罈口壓著石頭。' }] },
    { sprite: 'f_table_plain_1', x: 1, y: 4, w: 2, lines: [{ text: '桌上留著幾圈茶漬，不知道多少旅人在這兒等過船。' }] },
    { sprite: 'f_table_plain_1', x: 6, y: 4, w: 2, lines: [{ text: '有人在桌角刻了一行小字：「某年某月，等船三個時辰」。' }] },
  ],
  npcs: [
    { id: 'gdt_ji', allDay: true, name: '季秋娘', sprite: 'aunt', x: 2, y: 2, facing: 'down', script: teahouseTalk },
    {
      id: 'gdt_jiang', name: '蔣大川', sprite: 'farmer', x: 5, y: 3, facing: 'left',
      talks: [
        by('蔣大川')('我是挑夫，一天要過兩趟河。每趟兩兩銀子，一個月下來，船錢比飯錢還多！'),
        by('蔣大川')('要是這兒有座橋就好了。縣太爺說要蓋，說了三年也沒動靜。'),
      ],
    },
    {
      id: 'gdt_zhuo', name: '卓阿滿', sprite: 'girl', x: 7, y: 3, facing: 'down',
      talks: [
        by('卓阿滿')('我要去臨江城投靠親戚。這是我第一次出遠門呢。'),
        by('卓阿滿')('船家說河水看著平，底下的暗流可兇了，去年還翻過一條船。'),
      ],
    },
  ],
  exits: [exitTo('guandao', 11, 6, 4, 7)],
};
