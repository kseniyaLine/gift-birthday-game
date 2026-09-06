import { useRef, useEffect, useState } from 'react';
import bgImage from './background.png';
import coinImgSrc from './coin.png'; 
import playerSpriteSrc from './panda.png';
import obstacleSpriteSrc from './wolf.png';
import wallImgSrc from './wall-bg.avif';
import magnetImgSrc from './magnit.png';
import x2ImgSrc from './x2.jpg'; 

// --- НАСТРОЙКИ ИГРОКА (4x4) ---
const PLAYER_COLS = 4;
const PLAYER_ROWS = 4;
const PLAYER_TOTAL_FRAMES = 15;
const PLAYER_ANIM_SPEED = 6;

// --- НАСТРОЙКИ ПРЕПЯТСТВИЯ (8x9, 70 кадров) ---
const OBS_ROWS = 8;
const OBS_COLS = 9;
const OBS_TOTAL_FRAMES = 70;
const OBS_ANIM_SPEED = 6;
const OBS_SIZE = 40;
const OBS_HITBOX_RADIUS = 16;
const OBS_SPAWN_RATE = 95; 

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const BASE_WALL = 60;
const PROTRUSION_WALL = 90;
const SEGMENT_HEIGHT = 60;
const JUMP_SPEED = 14;
const TARGET_SCROLL_SPEED = 5;

const COIN_SIZE = 32;
const COIN_HITBOX = 14;

// --- НАСТРОЙКИ МАГНИТА ---
const MAGNET_SIZE = 45;
const MAGNET_HITBOX = 16;
const MAGNET_DURATION = 10;
const MAGNET_PULL_SPEED = 10;
const MAGNET_RADIUS = 180;

// --- НАСТРОЙКИ Х2 ---
const X2_SIZE = 45;
const X2_HITBOX = 16;
const X2_DURATION = 10;

const App = () => {
  const canvasRef = useRef(null);
  const coinImageRef = useRef(null);
  const bgImageRef = useRef(null);
  const playerSpriteRef = useRef(null);
  const obstacleSpriteRef = useRef(null);
  const wallImageRef = useRef(null);
  const magnetImageRef = useRef(null);
  const x2ImageRef = useRef(null);
  
  const animTickRef = useRef(0);
  const lastTimeRef = useRef(0);
  const spawnTimerRef = useRef(0);

  const [isLoading, setIsLoading] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const gameStateRef = useRef({
    gameOver: false,
    score: 0,
    gameTime: 0,
    magnetTimer: 0,
    x2Timer: 0,
    player: {
      y: 460,
      width: 32,
      height: 32,
      x: BASE_WALL,
      side: 'left',
      isJumping: false,
      vx: 0,
    },
    segments: [],
    coins: [],
    obstacles: [],
    magnets: [],
    x2Items: [],
  });

  useEffect(() => {
    const assets = [
      { ref: coinImageRef, src: coinImgSrc },
      { ref: bgImageRef, src: bgImage },
      { ref: playerSpriteRef, src: playerSpriteSrc },
      { ref: obstacleSpriteRef, src: obstacleSpriteSrc },
      { ref: wallImageRef, src: wallImgSrc },
      { ref: magnetImageRef, src: magnetImgSrc },
      { ref: x2ImageRef, src: x2ImgSrc },
    ];

    let loadedCount = 0;

    assets.forEach(({ ref, src }) => {
      const img = new Image();
      ref.current = img;

      const handleLoad = () => {
        img.onload = null;
        img.onerror = null;
        loadedCount += 1;
        if (loadedCount === assets.length) {
          setIsLoading(false);
        }
      };

      img.onload = handleLoad;
      img.onerror = handleLoad;
      img.src = src;

      if (img.complete && img.naturalWidth !== 0) {
        handleLoad();
      }
    });
  }, []);

  const restartGame = () => {
    const initialSegments = [];
    for (let i = 0; i < 8; i++) {
      initialSegments.push({
        y: 600 - i * SEGMENT_HEIGHT,
        height: SEGMENT_HEIGHT,
        leftWidth: BASE_WALL,
        rightWidth: BASE_WALL,
      });
    }

    gameStateRef.current = {
      gameOver: false,
      score: 0,
      gameTime: 0,
      magnetTimer: 0,
      x2Timer: 0,
      player: {
        y: 460,
        width: 32,
        height: 32,
        x: BASE_WALL,
        side: 'left',
        isJumping: false,
        vx: 0,
      },
      segments: initialSegments,
      coins: [],
      obstacles: [],
      magnets: [],
      x2Items: [],
    };

    animTickRef.current = 0;
    spawnTimerRef.current = 0;
    lastTimeRef.current = performance.now();
    setScore(0);
    setGameOver(false);
  };

  useEffect(() => {
    if (isLoading) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    restartGame();

    let animationFrameId;

    const handleCanvasClick = (e) => {
      e.preventDefault();
      const state = gameStateRef.current;
      if (state.gameOver) return;

      const { player } = state;
      if (!player.isJumping) {
        player.isJumping = true;
        if (player.side === 'left') {
          player.side = 'right';
          player.vx = JUMP_SPEED;
        } else {
          player.side = 'left';
          player.vx = -JUMP_SPEED;
        }
      }
    };

    canvas.addEventListener('pointerdown', handleCanvasClick);

    const render = (currentTime) => {
      if (!lastTimeRef.current) lastTimeRef.current = currentTime;

      const delta = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;
      const baseTimeScale = Math.min(delta * 60, 2);

      const state = gameStateRef.current;

      if (!state.gameOver) {
        state.gameTime += delta;
        
        const currentScrollSpeed = Math.min(TARGET_SCROLL_SPEED, 2.0 + state.gameTime * 0.6);
        const player = state.player;

        if (state.x2Timer > 0) {
          state.x2Timer -= delta;
          if (state.x2Timer < 0) state.x2Timer = 0;
        }

        const gameSpeedMultiplier = state.x2Timer > 0 ? 2 : 1;
        const timeScale = baseTimeScale * gameSpeedMultiplier;

        if (state.magnetTimer > 0) {
          state.magnetTimer -= delta;
          if (state.magnetTimer < 0) state.magnetTimer = 0;
        }

        const stepMovement = currentScrollSpeed * timeScale;

        state.segments.forEach((seg) => (seg.y += stepMovement));
        state.magnets.forEach((mag) => (mag.y += stepMovement));
        state.x2Items.forEach((x2) => (x2.y += stepMovement));
        
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

        state.coins.forEach((coin) => {
          coin.y += stepMovement;
          coin.angle += 0.08 * timeScale;

          if (state.magnetTimer > 0) {
            const dx = playerCenterX - coin.x;
            const dy = playerCenterY - coin.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 0 && dist <= MAGNET_RADIUS) {
              coin.x += (dx / dist) * MAGNET_PULL_SPEED * timeScale;
              coin.y += (dy / dist) * MAGNET_PULL_SPEED * timeScale;
            }
          }
        });

        state.obstacles.forEach((obs) => {
          obs.y += (currentScrollSpeed + obs.speed) * timeScale;
        });

        const currentSeg = state.segments.find(
          (seg) => player.y + player.height / 2 >= seg.y && player.y + player.height / 2 <= seg.y + seg.height
        );
        const currentLeftW = currentSeg ? currentSeg.leftWidth : BASE_WALL;
        const currentRightW = currentSeg ? currentSeg.rightWidth : BASE_WALL;

        if (player.isJumping) {
          player.x += player.vx * timeScale;

          if (player.vx > 0) {
            const rightBoundary = CANVAS_WIDTH - currentRightW - player.width;
            if (player.x >= rightBoundary) {
              player.x = rightBoundary;
              player.isJumping = false;
              player.vx = 0;
            }
          } else if (player.vx < 0) {
            const leftBoundary = currentLeftW;
            if (player.x <= leftBoundary) {
              player.x = leftBoundary;
              player.isJumping = false;
              player.vx = 0;
            }
          }
        } else {
          if (player.side === 'left') {
            player.x = currentLeftW;
          } else {
            player.x = CANVAS_WIDTH - currentRightW - player.width;
          }
        }

        // Генерация новых секций
        const topSegment = state.segments[state.segments.length - 1];
        if (topSegment && topSegment.y >= -SEGMENT_HEIGHT) {
          const newY = topSegment.y - SEGMENT_HEIGHT;
          const rand = Math.random();
          let leftW = BASE_WALL;
          let rightW = BASE_WALL;

          if (rand < 0.4) {
            leftW = PROTRUSION_WALL;
          } else if (rand < 0.7) {
            rightW = PROTRUSION_WALL;
          }

          state.segments.push({
            y: newY,
            height: SEGMENT_HEIGHT,
            leftWidth: leftW,
            rightWidth: rightW,
          });

          const freeLeft = leftW + 30;
          const freeRight = CANVAS_WIDTH - rightW - 30;

          const itemRoll = Math.random();
          if (itemRoll < 0.01) {
            const magX = freeLeft + Math.random() * (freeRight - freeLeft);
            state.magnets.push({
              x: magX,
              y: newY + SEGMENT_HEIGHT / 2,
            });
          } else if (itemRoll < 0.02) {
            const x2X = freeLeft + Math.random() * (freeRight - freeLeft);
            state.x2Items.push({
              x: x2X,
              y: newY + SEGMENT_HEIGHT / 2,
            });
          } else if (itemRoll < 0.75) {
            const coinCount = Math.random() < 0.35 ? 2 : 1;
            for (let c = 0; c < coinCount; c++) {
              const coinX = freeLeft + Math.random() * (freeRight - freeLeft);
              state.coins.push({
                x: coinX,
                y: newY + (SEGMENT_HEIGHT / (coinCount + 1)) * (c + 1),
                angle: Math.random() * Math.PI * 2,
                collected: false,
              });
            }
          }
        }

        // Подбор магнита
        for (let i = state.magnets.length - 1; i >= 0; i--) {
          const mag = state.magnets[i];
          if (
            player.x < mag.x + MAGNET_HITBOX &&
            player.x + player.width > mag.x - MAGNET_HITBOX &&
            player.y < mag.y + MAGNET_HITBOX &&
            player.y + player.height > mag.y - MAGNET_HITBOX
          ) {
            state.magnetTimer = MAGNET_DURATION;
            state.magnets.splice(i, 1);
          } else if (mag.y > CANVAS_HEIGHT) {
            state.magnets.splice(i, 1);
          }
        }

        // Подбор x2
        for (let i = state.x2Items.length - 1; i >= 0; i--) {
          const x2 = state.x2Items[i];
          if (
            player.x < x2.x + X2_HITBOX &&
            player.x + player.width > x2.x - X2_HITBOX &&
            player.y < x2.y + X2_HITBOX &&
            player.y + player.height > x2.y - X2_HITBOX
          ) {
            state.x2Timer = X2_DURATION;
            state.x2Items.splice(i, 1);
          } else if (x2.y > CANVAS_HEIGHT) {
            state.x2Items.splice(i, 1);
          }
        }

        // Спавн летящих препятствий
        spawnTimerRef.current += timeScale;
        if (spawnTimerRef.current >= OBS_SPAWN_RATE) {
          spawnTimerRef.current %= OBS_SPAWN_RATE;
          
          const minCorridorX = PROTRUSION_WALL + OBS_SIZE / 2;
          const maxCorridorX = CANVAS_WIDTH - PROTRUSION_WALL - OBS_SIZE / 2;

          let spawnX;
          if (Math.random() < 0.4) {
            spawnX = Math.min(Math.max(playerCenterX, minCorridorX), maxCorridorX);
          } else {
            spawnX = minCorridorX + Math.random() * (maxCorridorX - minCorridorX);
          }

          state.obstacles.push({
            x: spawnX,
            y: -OBS_SIZE,
            speed: 2.5 + Math.random() * 1.5,
          });
        }

        if (state.segments[0] && state.segments[0].y > CANVAS_HEIGHT) {
          state.segments.shift();
        }

        // Сбор монеток
        for (let i = state.coins.length - 1; i >= 0; i--) {
          const coin = state.coins[i];
          if (
            !coin.collected &&
            player.x < coin.x + COIN_HITBOX &&
            player.x + player.width > coin.x - COIN_HITBOX &&
            player.y < coin.y + COIN_HITBOX &&
            player.y + player.height > coin.y - COIN_HITBOX
          ) {
            coin.collected = true;
            state.score += 1;
            setScore(state.score);
            state.coins.splice(i, 1);
          } else if (coin.y > CANVAS_HEIGHT) {
            state.coins.splice(i, 1);
          }
        }

        // Столкновение с летящим препятствием
        for (let i = state.obstacles.length - 1; i >= 0; i--) {
          const obs = state.obstacles[i];
          const dist = Math.hypot(playerCenterX - obs.x, playerCenterY - obs.y);

          if (dist < OBS_HITBOX_RADIUS + player.width / 3) {
            state.gameOver = true;
            setGameOver(true);
            break;
          }

          if (obs.y > CANVAS_HEIGHT + OBS_SIZE) {
            state.obstacles.splice(i, 1);
          }
        }

        animTickRef.current += timeScale;
      }

      // --- ОТРИСОВКА ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const bgImg = bgImageRef.current;
      if (bgImg && bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      const wallImg = wallImageRef.current;
      state.segments.forEach((seg) => {
        if (wallImg && wallImg.complete) {
          ctx.drawImage(wallImg, 0, seg.y, seg.leftWidth, seg.height);
          ctx.drawImage(wallImg, CANVAS_WIDTH - seg.rightWidth, seg.y, seg.rightWidth, seg.height);
        } else {
          ctx.fillStyle = '#2b2d42';
          ctx.lineWidth = 2;

          ctx.fillRect(0, seg.y, seg.leftWidth, seg.height);
          ctx.strokeRect(0, seg.y, seg.leftWidth, seg.height);

          ctx.fillRect(CANVAS_WIDTH - seg.rightWidth, seg.y, seg.rightWidth, seg.height);
          ctx.strokeRect(CANVAS_WIDTH - seg.rightWidth, seg.y, seg.rightWidth, seg.height);
        }
      });

      const magnetImg = magnetImageRef.current;
      state.magnets.forEach((mag) => {
        if (magnetImg && magnetImg.complete) {
          ctx.drawImage(
            magnetImg,
            mag.x - MAGNET_SIZE / 2,
            mag.y - MAGNET_SIZE / 2,
            MAGNET_SIZE,
            MAGNET_SIZE
          );
        }
      });

      const x2Img = x2ImageRef.current;
      state.x2Items.forEach((x2) => {
        if (x2Img && x2Img.complete) {
          ctx.drawImage(
            x2Img,
            x2.x - X2_SIZE / 2,
            x2.y - X2_SIZE / 2,
            X2_SIZE,
            X2_SIZE
          );
        }
      });

      const coinImg = coinImageRef.current;
      state.coins.forEach((coin) => {
        if (!coin.collected) {
          ctx.save();
          ctx.translate(coin.x, coin.y);
          const scaleX = Math.cos(coin.angle);
          ctx.scale(scaleX, 1);

          if (coinImg && coinImg.complete) {
            ctx.drawImage(
              coinImg,
              -COIN_SIZE / 2,
              -COIN_SIZE / 2,
              COIN_SIZE,
              COIN_SIZE
            );
          }
          ctx.restore();
        }
      });

      const obsImg = obstacleSpriteRef.current;
      if (obsImg && obsImg.complete) {
        const obsFrameWidth = obsImg.naturalWidth / OBS_COLS;
        const obsFrameHeight = obsImg.naturalHeight / OBS_ROWS;

        const currentObsFrame = Math.floor(animTickRef.current / OBS_ANIM_SPEED) % OBS_TOTAL_FRAMES;
        const obsCol = currentObsFrame % OBS_COLS;
        const obsRow = Math.floor(currentObsFrame / OBS_COLS);

        const obsSx = obsCol * obsFrameWidth;
        const obsSy = obsRow * obsFrameHeight;

        state.obstacles.forEach((obs) => {
          ctx.save();
          ctx.translate(obs.x, obs.y);
          ctx.rotate((-90 * Math.PI) / 180);
          ctx.drawImage(
            obsImg,
            obsSx, obsSy, obsFrameWidth, obsFrameHeight,
            -OBS_SIZE / 2, -OBS_SIZE / 2, OBS_SIZE, OBS_SIZE
          );
          ctx.restore();
        });
      }

      const p = state.player;
      const spriteImg = playerSpriteRef.current;

      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      if (p.side === 'right') {
        ctx.rotate((-90 * Math.PI) / 180);
      } else {
        ctx.rotate((90 * Math.PI) / 180);
      }

      if (spriteImg && spriteImg.complete) {
        const frameWidth = spriteImg.naturalWidth / PLAYER_COLS;
        const frameHeight = spriteImg.naturalHeight / PLAYER_ROWS;

        const currentFrame = Math.floor(animTickRef.current / PLAYER_ANIM_SPEED) % PLAYER_TOTAL_FRAMES;
        const col = currentFrame % PLAYER_COLS;
        const row = Math.floor(currentFrame / PLAYER_COLS);

        const sx = col * frameWidth;
        const sy = row * frameHeight;

        ctx.drawImage(
          spriteImg,
          sx, sy, frameWidth, frameHeight,
          -p.width / 2, -p.height / 2, p.width, p.height
        );
      }
      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      canvas.removeEventListener('pointerdown', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isLoading]);

  if (isLoading) {
    return (
      <div style={{
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
        backgroundColor: '#121212',
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        fontFamily: 'sans-serif'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', touchAction: 'none' }}>
      <canvas
        ref={canvasRef}
        style={{
          touchAction: 'none',
          cursor: 'pointer',
          display: 'block'
        }}
      />
      {gameOver && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          fontSize: '24px',
          fontWeight: 'bold',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '10px',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          userSelect: 'none'
        }}>
          <p style={{ margin: 0 }}>Game Over</p>
          <p style={{ fontSize: '18px', margin: 0 }}>{score} Huba Bubas</p>
          <button
            onClick={restartGame}
            onTouchStart={(e) => {
              e.preventDefault();
              restartGame();
            }}
            style={{
              padding: '12px 28px',
              fontSize: '18px',
              backgroundColor: '#2b2d42',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
              touchAction: 'manipulation'
            }}
          >
            Restart
          </button>
        </div>
      )}
    </div>
  );
};

export default App;