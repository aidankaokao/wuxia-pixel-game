import { GameCanvas } from './game/GameCanvas';
import { BattleUI } from './ui/BattleUI';
import { CreateScreen } from './ui/CreateScreen';
import { DialogBox } from './ui/DialogBox';
import { GameMenu } from './ui/GameMenu';
import { Hud } from './ui/Hud';
import { LocationBanner } from './ui/LocationBanner';
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
      <TitleScreen />
      <CreateScreen />
      <Toast />
    </div>
  );
}
