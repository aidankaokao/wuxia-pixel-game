import { GameCanvas } from './game/GameCanvas';
import { BattleUI } from './ui/BattleUI';
import { ConfirmDialog } from './ui/ConfirmDialog';
import { CreateScreen } from './ui/CreateScreen';
import { DialogBox } from './ui/DialogBox';
import { GameMenu } from './ui/GameMenu';
import { HomePanel } from './ui/HomePanel';
import { Hud } from './ui/Hud';
import { LocationBanner } from './ui/LocationBanner';
import { ShopPanel } from './ui/ShopPanel';
import { TitleScreen } from './ui/TitleScreen';
import { Toast } from './ui/Toast';

export function App() {
  return (
    <div className="stage">
      <GameCanvas />
      <Hud />
      <LocationBanner />
      <DialogBox />
      <GameMenu />
      <BattleUI />
      <ShopPanel />
      <HomePanel />
      <TitleScreen />
      <CreateScreen />
      <ConfirmDialog />
      <Toast />
    </div>
  );
}
