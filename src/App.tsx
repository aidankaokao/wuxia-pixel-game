import { GameCanvas } from './game/GameCanvas';
import { BattleUI } from './ui/BattleUI';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { CreateScreen } from './ui/CreateScreen';
import { DialogBox } from './ui/DialogBox';
import { GameMenu } from './ui/GameMenu';
import { HomePanel } from './ui/HomePanel';
import { Hud } from './ui/Hud';
import { LocationBanner } from './ui/LocationBanner';
import { MorningBrief } from './ui/MorningBrief';
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
      <ThoughtBubble />
      <Hud />
      <LocationBanner />
      <DialogBox />
      <GameMenu />
      <BattleUI />
      <ShopPanel />
      <HomePanel />
      <SchedulePanel />
      <MorningBrief />
      <TitleScreen />
      <CreateScreen />
      <ConfirmDialog />
      <WorkAnim />
      <Toast />
    </div>
  );
}
