import React, { useState } from 'react';
import GameEngine from './components/GameEngine';
import UIOverlay from './components/UIOverlay';
import { GameState } from './types';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [accuracy, setAccuracy] = useState(0);
  const [ammo, setAmmo] = useState(0);

  // Reset stats when starting new game
  const handleSetGameState = (newState: GameState) => {
    if (newState === GameState.PLAYING && gameState !== GameState.PAUSED) {
        setScore(0);
        setLives(3);
        setAccuracy(0);
        setAmmo(0);
    }
    setGameState(newState);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neon-dark">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{
             backgroundImage: `linear-gradient(#00f3ff 1px, transparent 1px), linear-gradient(90deg, #00f3ff 1px, transparent 1px)`,
             backgroundSize: '50px 50px'
           }}>
      </div>
      
      <GameEngine 
        gameState={gameState} 
        setGameState={handleSetGameState}
        onScoreUpdate={setScore}
        onLivesUpdate={setLives}
        onAccuracyUpdate={setAccuracy}
        onAmmoUpdate={setAmmo}
      />
      
      <UIOverlay 
        gameState={gameState} 
        setGameState={handleSetGameState}
        score={score}
        lives={lives}
        accuracy={accuracy}
        ammo={ammo}
      />
    </div>
  );
};

export default App;