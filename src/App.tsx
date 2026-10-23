import { GameCanvas } from './game/GameCanvas';
import { BattleUI } from './ui/BattleUI';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { CreateScreen } from './ui/CreateScreen';
import { DialogBox } from './ui/DialogBox';
import { FishingGame } from './ui/FishingGame';
import { GameMenu } from './ui/GameMenu';
import { HomePanel } from './ui/HomePanel';
import { Hud } from './ui/Hud';
import { LocationBanner } from './ui/LocationBanner';
import { MapSigns } from './ui/MapSigns';
import { MorningBrief } from './ui/MorningBrief';
import { NoticeBoard } from './ui/NoticeBoard';
import { ShopManager } from './ui/ShopManager';
import { BizHQ } from './ui/BizHQ';
import { Handbook } from './ui/Handbook';
import { SchedulePanel } from './ui/SchedulePanel';
import { ShopPanel } from './ui/ShopPanel';
import { TitleScreen } from './ui/TitleScreen';
import { ThoughtBubble } from './ui/ThoughtBubble';
import { WorldOverlay } from './ui/WorldOverlay';
import { Toast } from './ui/Toast';
import { WorkAnim } from './ui/WorkAnim';

export function App() {
  return (
    <div className="stage">
      <GameCanvas />
      <WorldOverlay />
      <MapSigns />
      <ThoughtBubble />
      <Hud />
      <LocationBanner />
      <DialogBox />
      <GameMenu />
      <BattleUI />
      <ShopPanel />
      <HomePanel />
      <SchedulePanel />
      <NoticeBoard />
      <ShopManager />
      <BizHQ />
      <Handbook />
      <FishingGame />
      <MorningBrief />
      <TitleScreen />
      <CreateScreen />
      <ConfirmDialog />
      <WorkAnim />
      <Toast />
    </div>
  );
}
