import { GameCanvas } from './game/GameCanvas';
import { DialogBox } from './ui/DialogBox';
import { GameMenu } from './ui/GameMenu';
import { Hud } from './ui/Hud';
import { LocationBanner } from './ui/LocationBanner';

export function App() {
  return (
    <div className="stage">
      <GameCanvas />
      <Hud />
      <LocationBanner />
      <DialogBox />
      <GameMenu />
    </div>
  );
}
