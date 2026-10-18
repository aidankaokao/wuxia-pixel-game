import { useGame } from '../state/store';

/** 畫面上方短暫浮現的提示（以 id 重新掛載來重播動畫） */
export function Toast() {
  const toast = useGame((s) => s.toast);
  if (!toast) return null;
  return (
    <div key={toast.id} className="toast pixel-frame">
      {toast.text}
    </div>
  );
}
