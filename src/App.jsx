import React, { useRef, useEffect, useState } from 'react';
import bgImage from './background.png';
import coinImgSrc from './coin.png'; 

const CANVAS_WIDTH = window.innerWidth;
const CANVAS_HEIGHT = window.innerHeight;
const BASE_WALL = 60;
const PROTRUSION_WALL = 110;
const SEGMENT_HEIGHT = 100;
const JUMP_SPEED = 14;
const SCROLL_SPEED = 3;

const COIN_SIZE = 32;
const COIN_HITBOX = 14; // Радиус зоны подбора

const App = () => {
  const canvasRef = useRef(null);
  const coinImageRef = useRef(null);
  const bgImageRef = useRef(null)
  const [isPaused, setIsPaused] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);

  const gameStateRef = useRef({
    isPaused: false,
    gameOver: false,
    score: 0,
    player: {
      y: 460,
      width: 24,
      height: 24,
      x: 60,
      side: 'left',
      isJumping: false,
      vx: 0,
    },
    segments: [],
    coins: [],
  });

  // Предзагрузка изображения монетки при монтировании
  useEffect(() => {
    const img = new Image();
    img.src = coinImgSrc;
    coinImageRef.current = img;

    const bgImg = new Image();
    bgImg.src = bgImage;
    bgImageRef.current = bgImg;
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
        width: 24,
        height: 24,
        x: BASE_WALL,
        side: 'left',
        isJumping: false,
        vx: 0,
      },
      segments: initialSegments,
      coins: [],
    };

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

        state.segments.forEach((seg) => (seg.y += SCROLL_SPEED));
        
        // Обновляем позицию и угол вращения каждой монетки
        state.coins.forEach((coin) => {
          coin.y += SCROLL_SPEED;
          coin.angle += 0.08; // Скорость вращения
        });

        const currentSeg = state.segments.find(
          (seg) => player.y + player.height / 2 >= seg.y && player.y + player.height / 2 <= seg.y + seg.height
        );
        const currentLeftW = currentSeg ? currentSeg.leftWidth : BASE_WALL;
        const currentRightW = currentSeg ? currentSeg.rightWidth : BASE_WALL;

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

          if (Math.random() < 0.6) {
            const freeLeft = leftW + 30;
            const freeRight = CANVAS_WIDTH - rightW - 30;
            const coinX = freeLeft + Math.random() * (freeRight - freeLeft);
            state.coins.push({
              x: coinX,
              y: newY + SEGMENT_HEIGHT / 2,
              angle: Math.random() * Math.PI * 2, // Случайный начальный угол
              collected: false,
            });
          }
        }

        if (state.segments[0] && state.segments[0].y > CANVAS_HEIGHT) {
          state.segments.shift();
        }

        // Проверка столкновений с монеткой
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
      }

      // --- ОТРИСОВКА ---
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. Отрисовка фона
      const bgImg = bgImageRef.current;
      if (bgImg && bgImg.complete) {
        ctx.drawImage(bgImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        // Затемнение поверх фона
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      } else {
        // Темный цвет по умолчанию, пока картинка загружается
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // Отрисовка серых стен
      state.segments.forEach((seg) => {
        ctx.fillStyle = '#2b2d42';
        ctx.strokeStyle = '#4a4e69';
        ctx.lineWidth = 2;

        ctx.fillRect(0, seg.y, seg.leftWidth, seg.height);
        ctx.strokeRect(0, seg.y, seg.leftWidth, seg.height);

        ctx.fillRect(CANVAS_WIDTH - seg.rightWidth, seg.y, seg.rightWidth, seg.height);
        ctx.strokeRect(CANVAS_WIDTH - seg.rightWidth, seg.y, seg.rightWidth, seg.height);
      });

      // Отрисовка монеток-картинок с вращением
      const coinImg = coinImageRef.current;
      state.coins.forEach((coin) => {
        if (!coin.collected) {
          ctx.save();
          // Переносим точку отсчета в центр монетки
          ctx.translate(coin.x, coin.y);

          // Вращение вокруг вертикальной оси Y (сжатие по X создает эффект 3D-вращения)
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

      // Отрисовка игрока
      ctx.fillStyle = state.gameOver ? '#d90429' : '#00f5d4';
      ctx.fillRect(state.player.x, state.player.y, state.player.width, state.player.height);

      if (state.gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ИГРА ОКОНЧЕНА', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

        ctx.font = '16px sans-serif';
        ctx.fillText(`Счет: ${state.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      canvas.removeEventListener('pointerdown', handleCanvasClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif' }}>
      <h2>Ninja Maze Runner</h2>
      <div style={{ marginBottom: 10, fontWeight: 'bold', fontSize: '18px' }}>
        💰 Монеты / Счет: {score}
      </div>

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

      <div style={{ marginTop: 15, display: 'flex', gap: '10px' }}>
        {gameOver ? (
          <button
            onClick={restartGame}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: '#00f5d4',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
            }}
          >
            🔄 Начать заново
          </button>
        ) : (
          <button
            onClick={() => setIsPaused((prev) => !prev)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: 'bold',
              cursor: 'pointer',
              backgroundColor: isPaused ? '#2a9d8f' : '#e76f51',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
            }}
          >
            {isPaused ? '▶ Продолжить' : '⏸ Пауза'}
          </button>
        )}
      </div>
    </div>
  );
};

export default App;