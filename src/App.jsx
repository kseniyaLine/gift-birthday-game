import { useRef, useEffect, useState } from 'react';
import bgImage from './background.png';
import coinImgSrc from './coin.png'; 
import playerSpriteSrc from './panda.png';
import obstacleSpriteSrc from './wolf.png';

// --- НАСТРОЙКИ ИГРОКА (4x4) ---
const PLAYER_COLS = 4;
const PLAYER_ROWS = 4;
const PLAYER_TOTAL_FRAMES = 15;
const PLAYER_ANIM_SPEED = 4;

// --- НАСТРОЙКИ ПРЕПЯТСТВИЯ (8x9, 70 кадров) ---
const OBS_ROWS = 8;
const OBS_COLS = 9;
const OBS_TOTAL_FRAMES = 70;
const OBS_ANIM_SPEED = 1.5;
const OBS_SIZE = 40;
const OBS_HITBOX_RADIUS = 16;
const OBS_SPAWN_RATE = 240; // Увеличено: спавн реже (каждые ~4 секунды)

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const BASE_WALL = 60;
const PROTRUSION_WALL = 90;
const SEGMENT_HEIGHT = 60;
const JUMP_SPEED = 14;
const SCROLL_SPEED = 2;

const COIN_SIZE = 32;
const COIN_HITBOX = 14;

const App = () => {
  const canvasRef = useRef(null);
  const coinImageRef = useRef(null);
  const bgImageRef = useRef(null);
  const playerSpriteRef = useRef(null);
  const obstacleSpriteRef = useRef(null);
  const animTickRef = useRef(0);

  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const gameStateRef = useRef({
    isPaused: false,
    gameOver: false,
    score: 0,
    player: {
      y: 460,
      width: 32,
      height: 32,
      x: 60,
      side: 'left',
      isJumping: false,
      vx: 0,
    },
    segments: [],
    coins: [],
    obstacles: [],
  });

  useEffect(() => {
    const img = new Image();
    img.src = coinImgSrc;
    coinImageRef.current = img;

    const bgImg = new Image();
    bgImg.src = bgImage;
    bgImageRef.current = bgImg;

    const spriteImg = new Image();
    spriteImg.src = playerSpriteSrc;
    playerSpriteRef.current = spriteImg;

    const obsImg = new Image();
    obsImg.src = obstacleSpriteSrc;
    obstacleSpriteRef.current = obsImg;
  }, []);

  useEffect(() => {
    gameStateRef.current.isPaused = isPaused;
  }, [isPaused]);

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
      isPaused: false,
      gameOver: false,
      score: 0,
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
    };

    animTickRef.current = 0;
    setScore(0);
    setGameOver(false);
    setIsPaused(false);
  };

  useEffect(() => {
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
      if (state.isPaused || state.gameOver) return;

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

    const render = () => {
      const state = gameStateRef.current;

      if (!state.isPaused && !state.gameOver) {
        const player = state.player;

        // Движение мира и монеток
        state.segments.forEach((seg) => (seg.y += SCROLL_SPEED));
        state.coins.forEach((coin) => {
          coin.y += SCROLL_SPEED;
          coin.angle += 0.08;
        });

        // Полет препятствий сверху вниз
        state.obstacles.forEach((obs) => {
          obs.y += obs.speed;
        });

        const currentSeg = state.segments.find(
          (seg) => player.y + player.height / 2 >= seg.y && player.y + player.height / 2 <= seg.y + seg.height
        );
        const currentLeftW = currentSeg ? currentSeg.leftWidth : BASE_WALL;
        const currentRightW = currentSeg ? currentSeg.rightWidth : BASE_WALL;

        // Перемещение игрока
        if (player.isJumping) {
          player.x += player.vx;

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

        // Генерация новых секций и монеток
        const topSegment = state.segments[state.segments.length - 1];
        if (topSegment && topSegment.y >= -SEGMENT_HEIGHT) {
          const newY = topSegment.y - SEGMENT_HEIGHT;
          const rand = Math.random();
          let leftW = BASE_WALL;
          let rightW = BASE_WALL;

          if (rand < 0.35) {
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

          if (Math.random() < 0.5) {
            const freeLeft = leftW + 30;
            const freeRight = CANVAS_WIDTH - rightW - 30;
            const coinX = freeLeft + Math.random() * (freeRight - freeLeft);
            state.coins.push({
              x: coinX,
              y: newY + SEGMENT_HEIGHT / 2,
              angle: Math.random() * Math.PI * 2,
              collected: false,
            });
          }
        }

        // Спавн препятствий сверху в открытом коридоре
        if (animTickRef.current % OBS_SPAWN_RATE === 0) {
          const minCorridorX = PROTRUSION_WALL + OBS_SIZE / 2;
          const maxCorridorX = CANVAS_WIDTH - PROTRUSION_WALL - OBS_SIZE / 2;

          let spawnX;
          if (Math.random() < 0.4) {
            const playerCenterX = player.x + player.width / 2;
            spawnX = Math.min(Math.max(playerCenterX, minCorridorX), maxCorridorX);
          } else {
            spawnX = minCorridorX + Math.random() * (maxCorridorX - minCorridorX);
          }

          state.obstacles.push({
            x: spawnX,
            y: -OBS_SIZE,
            speed: 6 + Math.random() * 3,
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

        // Столкновение с препятствием (Game Over)
        const playerCenterX = player.x + player.width / 2;
        const playerCenterY = player.y + player.height / 2;

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

        animTickRef.current += 1;
      }

      // --- ОТРИСОВКА ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Фон
      const bgImg = bgImageRef.current;
      if (bgImg && bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // 2. Стены
      state.segments.forEach((seg) => {
        ctx.fillStyle = '#2b2d42';
        ctx.strokeStyle = '#4a4e69';
        ctx.lineWidth = 2;

        ctx.fillRect(0, seg.y, seg.leftWidth, seg.height);
        ctx.strokeRect(0, seg.y, seg.leftWidth, seg.height);

        ctx.fillRect(CANVAS_WIDTH - seg.rightWidth, seg.y, seg.rightWidth, seg.height);
        ctx.strokeRect(CANVAS_WIDTH - seg.rightWidth, seg.y, seg.rightWidth, seg.height);
      });

      // 3. Монетки
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

      // 4. Летящие препятствия (развернуты на 90°)
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

      // 5. Игрок
      const p = state.player;
      const spriteImg = playerSpriteRef.current;

      ctx.save();
      ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
      ctx.rotate((90 * Math.PI) / 180);

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

    render();

    return () => {
      canvas.removeEventListener('pointerdown', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          border: '3px solid #333',
          borderRadius: '12px',
          backgroundColor: '#121212',
          touchAction: 'none',
          cursor: 'pointer',
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
            gap: '5px',
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}>
           <p>Game over</p>       
           <p style={{
            fontSize: '18px',
          }}>{score} Huba Bubas</p>
                  <button
          onClick={restartGame}
          style={{
            padding: '12px 28px',
            fontSize: '18px',
            backgroundColor: '#2b2d42',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
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