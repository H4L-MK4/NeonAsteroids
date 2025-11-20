import React, { useEffect, useRef, useCallback } from 'react';
import { GameState, Ship, Asteroid, GameObject, Point, Particle, Powerup } from '../types';
import { audioService } from '../services/audioService';

interface GameEngineProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onScoreUpdate: (score: number) => void;
  onLivesUpdate: (lives: number) => void;
  onAccuracyUpdate: (accuracy: number) => void;
  onAmmoUpdate: (ammo: number) => void;
}

const SHIP_SIZE = 15;
const ROTATION_SPEED = 0.08;
const THRUST = 0.15;
const FRICTION = 0.98; 
const MAX_SPEED = 6;
const BULLET_SPEED = 7;
const ASTEROID_SPEED_BASE = 1;
const SPREAD_AMMO_COUNT = 50;
const POWERUP_LIFETIME = 300; // 5 seconds at 60fps

const GameEngine: React.FC<GameEngineProps> = ({ 
  gameState, 
  setGameState, 
  onScoreUpdate, 
  onLivesUpdate,
  onAccuracyUpdate,
  onAmmoUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const scoreRef = useRef(0);
  const shotsFiredRef = useRef(0);
  const shotsHitRef = useRef(0);
  
  // Gameplay State Refs
  const waveCountRef = useRef(0);
  const spreadAmmoRef = useRef(0);
  const lastPowerupTimeRef = useRef(0);

  const shipRef = useRef<Ship>({
    id: 'player',
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    rotation: -Math.PI / 2,
    radius: SHIP_SIZE,
    type: 'ship',
    thrusting: false,
    invulnerable: 120,
    rotationSpeed: 0
  });
  
  const asteroidsRef = useRef<Asteroid[]>([]);
  const bulletsRef = useRef<GameObject[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const powerupsRef = useRef<Powerup[]>([]);
  const livesRef = useRef(3);
  
  const keys = useRef<{ [key: string]: boolean }>({});

  // --- Spawning Logic ---

  const spawnAsteroids = useCallback((count: number, width: number, height: number) => {
    const newAsteroids: Asteroid[] = [];
    const currentScore = scoreRef.current;

    for (let i = 0; i < count; i++) {
      let sizeClass: 1 | 2 | 3 | 4;
      const rand = Math.random();
      
      // Higher chance of big asteroids at higher scores
      if (currentScore > 5000 && rand < 0.1) sizeClass = 4;
      else if (rand < 0.25) sizeClass = 3;
      else if (rand < 0.6) sizeClass = 2;
      else sizeClass = 1;

      const radius = sizeClass * 18; // Slightly adjusted scale
      
      let x, y;
      do {
        x = Math.random() * width;
        y = Math.random() * height;
      } while (Math.hypot(x - width/2, y - height/2) < 150); // Safe zone center

      const vertices: Point[] = [];
      const numVerts = 8 + Math.floor(Math.random() * 5);
      for (let v = 0; v < numVerts; v++) {
        const angle = (v / numVerts) * Math.PI * 2;
        const r = radius * (0.8 + Math.random() * 0.4);
        vertices.push({
          x: Math.cos(angle) * r,
          y: Math.sin(angle) * r
        });
      }

      newAsteroids.push({
        id: `asteroid-${Date.now()}-${i}`,
        position: { x, y },
        velocity: { 
          x: (Math.random() - 0.5) * ASTEROID_SPEED_BASE * (5/sizeClass), 
          y: (Math.random() - 0.5) * ASTEROID_SPEED_BASE * (5/sizeClass) 
        },
        rotation: Math.random() * Math.PI * 2,
        radius,
        type: 'asteroid',
        sizeClass,
        vertices
      });
    }
    asteroidsRef.current = asteroidsRef.current.concat(newAsteroids);
  }, []);

  const spawnPowerup = (type: 'life' | 'spread', width: number, height: number) => {
    const x = Math.random() * (width - 40) + 20;
    const y = Math.random() * (height - 40) + 20;
    
    powerupsRef.current.push({
        id: `pu-${Date.now()}`,
        position: { x, y },
        velocity: { x: 0, y: 0 },
        radius: 15,
        type: 'powerup',
        kind: type,
        lifeTime: POWERUP_LIFETIME,
        rotation: 0
    });
    audioService.playPowerupSpawn();
  };

  const createParticles = (pos: Point, count: number, color: string) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        id: `p-${Date.now()}-${i}`,
        position: { ...pos },
        velocity: { 
          x: (Math.random() - 0.5) * 4, 
          y: (Math.random() - 0.5) * 4 
        },
        rotation: 0,
        radius: Math.random() * 2 + 1,
        type: 'particle',
        life: 30 + Math.random() * 20,
        maxLife: 50,
        color
      });
    }
  };

  const resetShip = (width: number, height: number) => {
    shipRef.current.position = { x: width / 2, y: height / 2 };
    shipRef.current.velocity = { x: 0, y: 0 };
    shipRef.current.rotation = -Math.PI / 2;
    shipRef.current.invulnerable = 180;
    shipRef.current.destroyed = false;
  };

  // --- Update Logic ---

  const handleInput = () => {
    if (shipRef.current.destroyed) {
        audioService.setThrust(false);
        return;
    }

    if (keys.current['ArrowLeft']) {
      shipRef.current.rotation -= ROTATION_SPEED;
    }
    if (keys.current['ArrowRight']) {
      shipRef.current.rotation += ROTATION_SPEED;
    }
    if (keys.current['ArrowUp']) {
      shipRef.current.thrusting = true;
      shipRef.current.velocity.x += Math.cos(shipRef.current.rotation) * THRUST;
      shipRef.current.velocity.y += Math.sin(shipRef.current.rotation) * THRUST;
    } else {
      shipRef.current.thrusting = false;
    }
    
    // Update engine sound based on thrust state
    audioService.setThrust(shipRef.current.thrusting);

    const speed = Math.hypot(shipRef.current.velocity.x, shipRef.current.velocity.y);
    if (speed > MAX_SPEED) {
      shipRef.current.velocity.x = (shipRef.current.velocity.x / speed) * MAX_SPEED;
      shipRef.current.velocity.y = (shipRef.current.velocity.y / speed) * MAX_SPEED;
    }
  };

  const updatePhysics = (width: number, height: number) => {
    const ship = shipRef.current;

    // Ship
    if (!ship.destroyed) {
      ship.position.x += ship.velocity.x;
      ship.position.y += ship.velocity.y;
      ship.velocity.x *= FRICTION;
      ship.velocity.y *= FRICTION;

      if (ship.position.x < 0) ship.position.x += width;
      if (ship.position.x > width) ship.position.x -= width;
      if (ship.position.y < 0) ship.position.y += height;
      if (ship.position.y > height) ship.position.y -= height;
      
      if (ship.invulnerable > 0) ship.invulnerable--;
    }

    // Bullets
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const b = bulletsRef.current[i];
      b.position.x += b.velocity.x;
      b.position.y += b.velocity.y;
      
      if (b.position.x < 0 || b.position.x > width || b.position.y < 0 || b.position.y > height) {
        bulletsRef.current.splice(i, 1);
        continue;
      }
    }

    // Asteroids
    asteroidsRef.current.forEach(a => {
      a.position.x += a.velocity.x;
      a.position.y += a.velocity.y;
      if (a.position.x < 0) a.position.x += width;
      if (a.position.x > width) a.position.x -= width;
      if (a.position.y < 0) a.position.y += height;
      if (a.position.y > height) a.position.y -= height;
    });

    // Powerups
    for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
        const p = powerupsRef.current[i];
        p.lifeTime--;
        if (p.lifeTime <= 0) {
            powerupsRef.current.splice(i, 1);
        }
    }

    // Particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.position.x += p.velocity.x;
      p.position.y += p.velocity.y;
      p.life--;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }
  };

  const checkCollisions = (width: number, height: number) => {
    const ship = shipRef.current;
    
    // Bullet vs Asteroid
    for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
      const b = bulletsRef.current[i];
      let hit = false;

      for (let j = asteroidsRef.current.length - 1; j >= 0; j--) {
        const a = asteroidsRef.current[j];
        const dist = Math.hypot(b.position.x - a.position.x, b.position.y - a.position.y);
        
        if (dist < a.radius) {
          hit = true;
          audioService.playExplosion(a.sizeClass === 4 ? 'massive' : a.sizeClass === 3 ? 'large' : 'small');
          createParticles(a.position, 5 + a.sizeClass * 2, '#00f3ff');
          shotsHitRef.current++;
          
          const points = a.sizeClass === 4 ? 15 : a.sizeClass === 3 ? 20 : a.sizeClass === 2 ? 50 : 100;
          scoreRef.current += points;
          onScoreUpdate(scoreRef.current);

          // Split Asteroid
          if (a.sizeClass > 1) {
            const newSize = (a.sizeClass - 1) as 1 | 2 | 3;
            for (let k = 0; k < 2; k++) {
               const vertices: Point[] = [];
               const numVerts = 6 + Math.floor(Math.random() * 4);
               const r = newSize * 18;
               for (let v = 0; v < numVerts; v++) {
                 const angle = (v / numVerts) * Math.PI * 2;
                 vertices.push({
                   x: Math.cos(angle) * r * (0.8 + Math.random() * 0.4),
                   y: Math.sin(angle) * r * (0.8 + Math.random() * 0.4)
                 });
               }

               asteroidsRef.current.push({
                id: `split-${Date.now()}-${k}`,
                position: { ...a.position },
                velocity: {
                  x: (Math.random() - 0.5) * 2.5 * (4/newSize), // Smaller bits faster
                  y: (Math.random() - 0.5) * 2.5 * (4/newSize)
                },
                rotation: Math.random() * 6,
                radius: r,
                type: 'asteroid',
                sizeClass: newSize,
                vertices
               });
            }
          }
          
          asteroidsRef.current.splice(j, 1);
          break; 
        }
      }
      
      if (hit) {
        bulletsRef.current.splice(i, 1);
      }
    }

    // Ship vs Asteroid
    if (!ship.destroyed && ship.invulnerable <= 0) {
      for (const a of asteroidsRef.current) {
        const dist = Math.hypot(ship.position.x - a.position.x, ship.position.y - a.position.y);
        if (dist < a.radius + ship.radius - 5) { 
          ship.destroyed = true;
          audioService.playExplosion('large');
          createParticles(ship.position, 20, '#ff00ff');
          livesRef.current--;
          onLivesUpdate(livesRef.current);
          
          // Lose powerup on death
          spreadAmmoRef.current = 0;
          onAmmoUpdate(0);

          if (livesRef.current <= 0) {
             setTimeout(() => {
                const acc = shotsFiredRef.current > 0 ? Math.round((shotsHitRef.current / shotsFiredRef.current) * 100) : 0;
                onAccuracyUpdate(acc);
                audioService.playGameOver();
                setGameState(GameState.GAME_OVER);
             }, 1000);
          } else {
            setTimeout(() => resetShip(width, height), 2000);
          }
          break;
        }
      }
    }

    // Ship vs Powerup
    if (!ship.destroyed) {
        for (let i = powerupsRef.current.length - 1; i >= 0; i--) {
            const p = powerupsRef.current[i];
            const dist = Math.hypot(ship.position.x - p.position.x, ship.position.y - p.position.y);
            if (dist < p.radius + ship.radius) {
                audioService.playPowerupCollect();
                if (p.kind === 'life') {
                    if (livesRef.current < 5) {
                        livesRef.current++;
                        onLivesUpdate(livesRef.current);
                    }
                } else if (p.kind === 'spread') {
                    spreadAmmoRef.current = SPREAD_AMMO_COUNT;
                    onAmmoUpdate(SPREAD_AMMO_COUNT);
                }
                powerupsRef.current.splice(i, 1);
                createParticles(p.position, 10, p.kind === 'life' ? '#00ff00' : '#ffaa00');
            }
        }
    }

    // Level Complete / Wave Clear
    if (asteroidsRef.current.length === 0 && GameState.PLAYING === gameState) {
        waveCountRef.current++;
        
        // Spawn new wave
        const difficultyMod = Math.floor(scoreRef.current / 800);
        spawnAsteroids(5 + difficultyMod, width, height);
        
        // Life Powerup Drop every 5 waves
        if (waveCountRef.current > 0 && waveCountRef.current % 5 === 0) {
            spawnPowerup('life', width, height);
        }
    }
  };

  // --- Timed Event Logic ---
  
  // Weapon Powerup Periodic Spawner
  useEffect(() => {
    if (gameState !== GameState.PLAYING) return;
    
    const interval = setInterval(() => {
        if (powerupsRef.current.length === 0) { 
            spawnPowerup('spread', canvasRef.current?.width || 800, canvasRef.current?.height || 600);
        }
    }, 45000); // Every 45 seconds

    return () => clearInterval(interval);
  }, [gameState]);


  const render = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.clearRect(0, 0, width, height);

    // Render Powerups
    powerupsRef.current.forEach(p => {
        const pulse = Math.sin(Date.now() / 100) * 2;
        ctx.save();
        ctx.translate(p.position.x, p.position.y);
        
        ctx.shadowBlur = 15;
        if (p.kind === 'life') {
            ctx.fillStyle = '#00ff00';
            ctx.shadowColor = '#00ff00';
            ctx.strokeStyle = '#00ff00';
            // Cross shape
            ctx.beginPath();
            ctx.moveTo(-5, -12); ctx.lineTo(5, -12); ctx.lineTo(5, -5); ctx.lineTo(12, -5);
            ctx.lineTo(12, 5); ctx.lineTo(5, 5); ctx.lineTo(5, 12); ctx.lineTo(-5, 12);
            ctx.lineTo(-5, 5); ctx.lineTo(-12, 5); ctx.lineTo(-12, -5); ctx.lineTo(-5, -5);
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 0.3;
            ctx.fill();
        } else {
            ctx.fillStyle = '#ff9900';
            ctx.shadowColor = '#ff9900';
            ctx.strokeStyle = '#ff9900';
            // Triangle / M shape
            ctx.beginPath();
            ctx.moveTo(0, -10 - pulse);
            ctx.lineTo(10 + pulse, 10);
            ctx.lineTo(0, 5);
            ctx.lineTo(-10 - pulse, 10);
            ctx.closePath();
            ctx.stroke();
            ctx.globalAlpha = 0.3;
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        // Countdown ring?
        ctx.strokeStyle = p.kind === 'life' ? '#00ff00' : '#ff9900';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 5, 0, (p.lifeTime / POWERUP_LIFETIME) * Math.PI * 2);
        ctx.stroke();

        ctx.restore();
    });

    // Render Ship
    const ship = shipRef.current;
    if (!ship.destroyed) {
      if (ship.invulnerable === 0 || Math.floor(Date.now() / 100) % 2 === 0) {
        ctx.save();
        ctx.translate(ship.position.x, ship.position.y);
        ctx.rotate(ship.rotation);
        
        ctx.strokeStyle = spreadAmmoRef.current > 0 ? '#ff9900' : '#00f3ff';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = spreadAmmoRef.current > 0 ? '#ff9900' : '#00f3ff';
        
        ctx.beginPath();
        ctx.moveTo(SHIP_SIZE, 0); 
        ctx.lineTo(-SHIP_SIZE / 1.5, SHIP_SIZE / 1.5); 
        ctx.lineTo(-SHIP_SIZE / 2, 0); 
        ctx.lineTo(-SHIP_SIZE / 1.5, -SHIP_SIZE / 1.5); 
        ctx.closePath();
        ctx.stroke();

        if (ship.thrusting) {
          ctx.strokeStyle = '#ff00ff';
          ctx.beginPath();
          ctx.moveTo(-SHIP_SIZE / 2, 0);
          ctx.lineTo(-SHIP_SIZE - Math.random() * 10, 0);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // Render Asteroids
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#aaa';
    
    asteroidsRef.current.forEach(a => {
      ctx.save();
      ctx.translate(a.position.x, a.position.y);
      ctx.rotate(a.rotation);
      
      // Big ones look meaner
      if (a.sizeClass === 4) {
          ctx.strokeStyle = '#ff0055';
          ctx.shadowColor = '#ff0055';
          ctx.lineWidth = 3;
      } else {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = '#aaa';
      }

      ctx.beginPath();
      if (a.vertices.length > 0) {
        ctx.moveTo(a.vertices[0].x, a.vertices[0].y);
        for (let i = 1; i < a.vertices.length; i++) {
          ctx.lineTo(a.vertices[i].x, a.vertices[i].y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    });

    // Render Bullets
    bulletsRef.current.forEach(b => {
      ctx.fillStyle = spreadAmmoRef.current > 0 && b.color === '#ff9900' ? '#ff9900' : '#ff00aa';
      ctx.shadowBlur = 8;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(b.position.x, b.position.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Render Particles
    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color || '#fff';
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.beginPath();
      ctx.arc(p.position.x, p.position.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  };

  const loop = useCallback((time: number) => {
    if (gameState !== GameState.PLAYING) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    handleInput();
    updatePhysics(canvas.width, canvas.height);
    checkCollisions(canvas.width, canvas.height);
    render(ctx, canvas.width, canvas.height);

    requestRef.current = requestAnimationFrame(loop);
  }, [gameState]); 

  // Input Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      
      if (e.code === 'Space' && gameState === GameState.PLAYING && !shipRef.current.destroyed) {
        
        const hasSpread = spreadAmmoRef.current > 0;
        const angles = hasSpread ? [0, -25 * (Math.PI / 180), 25 * (Math.PI / 180)] : [0];
        
        angles.forEach(angleOffset => {
            const angle = shipRef.current.rotation + angleOffset;
            bulletsRef.current.push({
                id: `bullet-${Date.now()}-${angleOffset}`,
                position: { ...shipRef.current.position },
                velocity: {
                  x: Math.cos(angle) * BULLET_SPEED,
                  y: Math.sin(angle) * BULLET_SPEED
                },
                rotation: 0,
                radius: 2,
                type: 'bullet',
                color: hasSpread ? '#ff9900' : '#ff00aa'
              });
        });

        if (hasSpread) {
            spreadAmmoRef.current--;
            onAmmoUpdate(spreadAmmoRef.current);
        }

        shotsFiredRef.current++;
        audioService.playShoot();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (gameState === GameState.PLAYING && asteroidsRef.current.length === 0) {
        // Initial Spawn
        spawnAsteroids(5, canvas.width, canvas.height);
        resetShip(canvas.width, canvas.height);
        audioService.startBGM();
        
        // Reset run specific refs
        waveCountRef.current = 0;
        spreadAmmoRef.current = 0;
        onAmmoUpdate(0);
        powerupsRef.current = [];
      }
    }
    
    if (gameState === GameState.PLAYING) {
      requestRef.current = requestAnimationFrame(loop);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      audioService.stopBGM();
      audioService.setThrust(false); // Stop engine sound
    }

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      audioService.stopBGM();
      audioService.setThrust(false); // Stop engine sound
    };
  }, [gameState, loop, spawnAsteroids]);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-0 bg-transparent"
    />
  );
};

export default GameEngine;