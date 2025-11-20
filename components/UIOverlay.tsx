import React, { useEffect, useState } from 'react';
import { GameState, AIResponse } from '../types';
import { getMissionBriefing, getDailySpaceFact, analyzePerformance } from '../services/geminiService';
import { audioService } from '../services/audioService';

interface UIOverlayProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  score: number;
  lives: number;
  accuracy: number;
  ammo: number; // Spread shot ammo
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, 
  setGameState, 
  score, 
  lives,
  accuracy,
  ammo
}) => {
  const [briefing, setBriefing] = useState<string | null>(null);
  const [spaceNews, setSpaceNews] = useState<AIResponse | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [isMusicOn, setIsMusicOn] = useState(true);

  useEffect(() => {
    setIsMusicOn(audioService.isMusicOn());
    
    if (gameState === GameState.MENU) {
        audioService.init();
        // Fetch space news on load
        setIsLoadingAI(true);
        getDailySpaceFact().then(res => {
            setSpaceNews(res);
            setIsLoadingAI(false);
        });
    } else if (gameState === GameState.GAME_OVER) {
        // Analyze performance
        setIsLoadingAI(true);
        analyzePerformance(score, accuracy).then(res => {
            setAnalysis(res);
            setIsLoadingAI(false);
        });
    }
  }, [gameState, score, accuracy]);

  const handleStartGame = () => {
    setGameState(GameState.PLAYING);
  };

  const handleGetBriefing = async () => {
    setIsLoadingAI(true);
    const topics = ["Alien Ambush", "Asteroid Field Navigation", "Void Rescue", "Defend the Station"];
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    const res = await getMissionBriefing(randomTopic);
    setBriefing(res);
    setIsLoadingAI(false);
  };

  const toggleMusic = () => {
      audioService.toggleMusic();
      setIsMusicOn(audioService.isMusicOn());
  };

  // HUD during Play
  if (gameState === GameState.PLAYING) {
    return (
      <div className="fixed inset-0 pointer-events-none z-20 p-8 flex flex-col justify-between font-mono text-neon-blue">
        <div className="flex justify-between items-start">
            <div className="bg-black/50 p-4 border border-neon-blue shadow-[0_0_15px_rgba(0,243,255,0.3)]">
                <h2 className="text-2xl font-bold mb-2">SCORE: {score.toString().padStart(6, '0')}</h2>
                <div className="flex gap-2 items-center">
                    <span className="text-sm mr-2">HULL:</span>
                    {Array.from({length: Math.max(0, lives)}).map((_, i) => (
                        <div key={i} className="w-4 h-4 border border-neon-pink transform rotate-45 bg-neon-pink/20 shadow-[0_0_5px_#ff00ff]"></div>
                    ))}
                </div>
                {ammo > 0 && (
                    <div className="mt-2 text-orange-400 font-bold animate-pulse">
                        SPREAD SHOT: {ammo}
                    </div>
                )}
            </div>
            
            <div className="pointer-events-auto">
                <button 
                    onClick={toggleMusic}
                    className="p-2 border border-neon-blue bg-black/50 text-neon-blue hover:bg-neon-blue/20 transition-colors"
                    title="Toggle Music"
                >
                    {isMusicOn ? "♪ ON" : "♪ OFF"}
                </button>
            </div>
        </div>
        <div className="text-center opacity-50 text-sm">
            CONTROLS: ARROW KEYS TO MOVE | SPACE TO SHOOT
        </div>
      </div>
    );
  }

  // Start Menu
  if (gameState === GameState.MENU) {
    return (
      <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm font-mono">
        <div className="max-w-2xl w-full p-8 border-2 border-neon-blue shadow-[0_0_30px_rgba(0,243,255,0.2)] bg-black text-center">
            <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink mb-8 animate-pulse">
                NEON ASTEROIDS
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="text-left space-y-4">
                    <h3 className="text-xl text-neon-pink border-b border-neon-pink pb-2">PILOT INTERFACE</h3>
                    <button 
                        onClick={handleStartGame}
                        className="w-full py-3 px-6 bg-neon-blue/10 border border-neon-blue hover:bg-neon-blue hover:text-black transition-all duration-200 font-bold tracking-widest"
                    >
                        INITIATE LAUNCH
                    </button>
                    <button 
                        onClick={handleGetBriefing}
                        disabled={isLoadingAI}
                        className="w-full py-3 px-6 bg-neon-pink/10 border border-neon-pink hover:bg-neon-pink hover:text-black transition-all duration-200 font-bold text-sm"
                    >
                        {isLoadingAI ? "DECRYPTING..." : "REQUEST TACTICAL BRIEFING"}
                    </button>
                    <button 
                        onClick={toggleMusic}
                        className="w-full py-2 px-4 border border-gray-600 text-gray-400 hover:border-white hover:text-white text-xs"
                    >
                        MUSIC: {isMusicOn ? "ENABLED" : "DISABLED"}
                    </button>
                </div>

                <div className="text-left text-xs border border-gray-800 p-4 bg-gray-900/50 overflow-y-auto h-64">
                    <h3 className="text-green-400 mb-2 font-bold">> GALACTIC NETWORK FEED</h3>
                    {isLoadingAI && !spaceNews && <p className="text-gray-500 animate-pulse">Scanning frequencies...</p>}
                    
                    {spaceNews && (
                        <div className="space-y-4">
                            <p className="text-gray-300 leading-relaxed">{spaceNews.text}</p>
                            {spaceNews.sources && spaceNews.sources.length > 0 && (
                                <div className="mt-2">
                                    <p className="text-gray-500 uppercase mb-1">Signal Sources:</p>
                                    <ul className="list-disc pl-4 text-gray-400">
                                        {spaceNews.sources.map((s, i) => (
                                            <li key={i}><a href={s.uri} target="_blank" rel="noreferrer" className="hover:text-neon-blue underline truncate block">{s.title}</a></li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {briefing && (
                         <div className="mt-6 pt-4 border-t border-gray-700">
                            <h3 className="text-neon-pink mb-2 font-bold">> TACTICAL BRIEFING</h3>
                            <p className="text-neon-blue">{briefing}</p>
                         </div>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Game Over
  if (gameState === GameState.GAME_OVER) {
    return (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-red-900/20 backdrop-blur-md font-mono">
            <div className="max-w-lg w-full p-8 border-2 border-red-500 shadow-[0_0_50px_rgba(255,0,0,0.4)] bg-black text-center relative overflow-hidden">
                <h2 className="text-5xl text-red-500 font-bold mb-4 tracking-widest">CRITICAL FAILURE</h2>
                
                <div className="flex justify-around mb-6 text-xl">
                    <div>
                        <div className="text-gray-500 text-xs">FINAL SCORE</div>
                        <div className="text-white">{score}</div>
                    </div>
                    <div>
                        <div className="text-gray-500 text-xs">ACCURACY</div>
                        <div className="text-white">{accuracy}%</div>
                    </div>
                </div>

                <div className="border-t border-b border-red-900 py-4 mb-6 min-h-[100px]">
                    <p className="text-xs text-red-400 mb-2">AI PERFORMANCE ANALYSIS:</p>
                    {isLoadingAI ? (
                        <p className="text-red-500/50 animate-pulse">PROCESSING TELEMETRY...</p>
                    ) : (
                        <p className="text-sm text-gray-300 italic leading-relaxed">"{analysis}"</p>
                    )}
                </div>

                <button 
                    onClick={() => setGameState(GameState.MENU)}
                    className="w-full py-4 bg-white text-black font-bold hover:bg-gray-200"
                >
                    REBOOT SYSTEM
                </button>
            </div>
        </div>
    );
  }

  return null;
};

export default UIOverlay;