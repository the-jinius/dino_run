/* =========================================================
   HOO's Dino Run — full rebuild
   - delta-time loop
   - smooth physics (coyote time, jump buffer, variable jump)
   - procedural pixel-art rendering (works without sprites)
   - optional sprite override: drop PNGs in /sprites
   - keyboard + touch controls
   - parallax background (sky, volcano, hills, palms)
   ========================================================= */
(() => {
'use strict';

/* ---------- DOM ---------- */
const canvas       = document.getElementById('gameCanvas');
const ctx          = canvas.getContext('2d');
const miniCanvas   = document.getElementById('miniMap');
const miniCtx      = miniCanvas.getContext('2d');

const healthFillEl = document.getElementById('healthFill');
const heartsEl     = document.getElementById('hearts');
const eggCountEl   = document.getElementById('eggCount');
const eggProgEl    = document.getElementById('eggProgress');
const timerEl      = document.getElementById('timer');
const scoreEl      = document.getElementById('score');
const stageTextEl  = document.getElementById('stageText');
const messageEl    = document.getElementById('message');
const bestScoreEl  = document.getElementById('bestScore');

const startBtn     = document.getElementById('startBtn');
const pauseBtn     = document.getElementById('pauseBtn');
const restartBtn   = document.getElementById('restartBtn');
const difficultySel= document.getElementById('difficultySelect');
const soundToggle  = document.getElementById('soundToggle');

const resultPanel  = document.getElementById('resultPanel');
const resultTitle  = document.getElementById('resultTitle');
const resultStage  = document.getElementById('resultStage');
const resultTime   = document.getElementById('resultTime');
const resultScore  = document.getElementById('resultScore');
const resultDiff   = document.getElementById('resultDifficulty');
const resultRestart= document.getElementById('resultRestartBtn');
const resultNext   = document.getElementById('resultNextBtn');

ctx.imageSmoothingEnabled = false;
miniCtx.imageSmoothingEnabled = false;

/* ---------- Constants ---------- */
const VIEW_W = 960, VIEW_H = 540;          // logical pixels (canvas internal)
const GRAVITY      = 1700;                  // px/s^2
const MOVE_ACCEL   = 1800;                  // px/s^2
const MOVE_DECEL   = 2200;                  // px/s^2 (when no input)
const MAX_RUN_SPD  = 280;                   // px/s
const JUMP_VEL     = -560;                  // initial jump impulse
const JUMP_CUT     = 0.45;                  // % of vy retained when jump released early
const COYOTE_MS    = 110;                   // ground-leave grace
const JUMP_BUF_MS  = 130;                   // jump pre-press grace
const HIT_INVULN_MS= 1100;
const FINAL_STAGE  = 3;
const MAX_LIVES    = 5;
const STORAGE_KEY  = 'hoo_dino_run_v2';

const DIFFICULTY = {
  easy:   { time: 150, enemyScale: 0.8 },
  normal: { time: 120, enemyScale: 1.0 },
  hard:   { time: 90,  enemyScale: 1.3 },
};

/* ---------- Stage data (kept compatible with the old design) ---------- */
const STAGES = {
  1: {
    worldWidth: 2600, groundY: 470, checkpointX: 1300,
    enemy: { x: 980,  width: 56, height: 36, vx: 95,  left: 860,  right: 1180 },
    gate:  { x: 2200, width: 36, height: 110 },
    cave:  { x: 2420, width: 130, height: 100 },
    platforms: [
      { x: 250, y: 390, width: 170, height: 18 }, { x: 540, y: 340, width: 150, height: 18 },
      { x: 840, y: 300, width: 170, height: 18 }, { x: 1180, y: 360, width: 180, height: 18 },
      { x: 1540, y: 320, width: 170, height: 18 }, { x: 1920, y: 280, width: 190, height: 18 },
    ],
    eggs: [
      { x: 300, y: 355 }, { x: 600, y: 300 }, { x: 900, y: 260 },
      { x: 1220, y: 320 }, { x: 1580, y: 275 }, { x: 1960, y: 235 },
    ],
  },
  2: {
    worldWidth: 3000, groundY: 470, checkpointX: 1600,
    enemy: { x: 1450, width: 56, height: 36, vx: 120, left: 1300, right: 1700 },
    gate:  { x: 2570, width: 36, height: 110 },
    cave:  { x: 2790, width: 140, height: 100 },
    platforms: [
      { x: 280, y: 400, width: 120, height: 18 }, { x: 500, y: 340, width: 140, height: 18 },
      { x: 770, y: 290, width: 170, height: 18 }, { x: 1100, y: 350, width: 150, height: 18 },
      { x: 1400, y: 300, width: 180, height: 18 }, { x: 1780, y: 360, width: 160, height: 18 },
      { x: 2100, y: 300, width: 180, height: 18 }, { x: 2420, y: 250, width: 180, height: 18 },
    ],
    eggs: [
      { x: 320, y: 365 }, { x: 540, y: 305 }, { x: 820, y: 255 },
      { x: 1140, y: 315 }, { x: 1440, y: 265 }, { x: 1810, y: 325 },
      { x: 2140, y: 265 }, { x: 2460, y: 215 },
    ],
  },
  3: {
    worldWidth: 3400, groundY: 470, checkpointX: 1900,
    enemy: { x: 2000, width: 56, height: 36, vx: 140, left: 1850, right: 2300 },
    gate:  { x: 2950, width: 36, height: 110 },
    cave:  { x: 3180, width: 150, height: 100 },
    platforms: [
      { x: 260, y: 410, width: 120, height: 18 }, { x: 430, y: 350, width: 120, height: 18 },
      { x: 640, y: 290, width: 140, height: 18 }, { x: 900, y: 250, width: 150, height: 18 },
      { x: 1200, y: 320, width: 180, height: 18 }, { x: 1530, y: 280, width: 180, height: 18 },
      { x: 1870, y: 350, width: 180, height: 18 }, { x: 2220, y: 300, width: 180, height: 18 },
      { x: 2580, y: 260, width: 200, height: 18 },
    ],
    eggs: [
      { x: 280, y: 370 }, { x: 460, y: 310 }, { x: 680, y: 250 },
      { x: 930, y: 210 }, { x: 1240, y: 280 }, { x: 1560, y: 240 },
      { x: 1910, y: 310 }, { x: 2260, y: 260 }, { x: 2620, y: 220 },
    ],
  },
};

/* ---------- Sprite override system ---------- */
/* If a file at sprites/<name>.png exists, we use it; otherwise we draw procedurally.
   Provide whichever ones you have — the rest fall back automatically. */
const SPRITE_MAP = {
  player_idle: 'sprites/player_idle.png',
  player_run1: 'sprites/player_run1.png',
  player_run2: 'sprites/player_run2.png',
  player_jump: 'sprites/player_jump.png',
  enemy1:      'sprites/enemy1.png',
  enemy2:      'sprites/enemy2.png',
  egg:         'sprites/egg.png',
  cave:        'sprites/cave.png',
  banner:      'sprites/banner.png',
  torch:       'sprites/torch.png',
};
const sprites = {};
function loadSprite(key, src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => { sprites[key] = img; resolve(); };
    img.onerror = () => { resolve(); }; // missing file is fine — we fallback
    img.src = src;
  });
}
function loadAllSprites() {
  return Promise.all(Object.entries(SPRITE_MAP).map(([k, src]) => loadSprite(k, src)));
}

/* ---------- Sound (WebAudio beeps) ---------- */
let audioCtx = null;
let soundOn = true;
function beep(freq = 440, dur = 0.08, type = 'square', vol = 0.05) {
  if (!soundOn) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch {}
}

/* ---------- Persisted settings ---------- */
let bestScore = 0;
let difficulty = 'normal';
function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.difficulty && DIFFICULTY[data.difficulty]) {
      difficulty = data.difficulty;
      difficultySel.value = data.difficulty;
    }
    if (typeof data.soundOn === 'boolean') {
      soundOn = data.soundOn; soundToggle.checked = data.soundOn;
    }
    if (typeof data.bestScore === 'number') bestScore = data.bestScore;
  } catch {}
  bestScoreEl.textContent = bestScore.toLocaleString();
}
function saveSettings() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ difficulty, soundOn, bestScore })); } catch {}
}

/* ---------- World state ---------- */
let currentStage = 1;
let worldWidth   = STAGES[1].worldWidth;
let groundY      = STAGES[1].groundY;
let platforms = [], eggsInLevel = [], totalEggs = 0;
let gate = null, cave = null, enemy = null;
let checkpoint = { x: 120, y: 240, activated: false, markerX: 120 };

let cameraX = 0;
let score = 0, eggs = 0, timeLeft = 120;
let lives = MAX_LIVES;
let running = false, paused = false, gameWon = false, autoNextAt = 0;

const player = {
  x: 120, y: 240, width: 30, height: 48,
  vx: 0, vy: 0, onGround: false,
  health: 100, maxHealth: 100,
  facing: 1,                      // 1 right, -1 left
  invulnUntil: 0,
  // physics helpers
  lastGroundedAt: -1e9,
  jumpPressedAt:  -1e9,
  isJumping: false,
  // anim
  animTime: 0,
};

/* ---------- Input ---------- */
const input = { left: false, right: false, jump: false, jumpHeld: false };

function pressLeft(v)  { input.left = v; }
function pressRight(v) { input.right = v; }
function pressJump(v)  {
  if (v && !input.jump) player.jumpPressedAt = performance.now();
  input.jump = v; input.jumpHeld = v;
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')  pressLeft(true);
  if (e.key === 'ArrowRight'|| e.key === 'd' || e.key === 'D')  pressRight(true);
  if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
    pressJump(true); e.preventDefault();
  }
  if (e.key === 'p' || e.key === 'P') togglePause();
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A')  pressLeft(false);
  if (e.key === 'ArrowRight'|| e.key === 'd' || e.key === 'D')  pressRight(false);
  if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') pressJump(false);
});

// Touch controls
document.querySelectorAll('.touch-btn').forEach((btn) => {
  const key = btn.dataset.key;
  const set = (v, ev) => {
    ev.preventDefault();
    if (key === 'left')  pressLeft(v);
    if (key === 'right') pressRight(v);
    if (key === 'jump')  pressJump(v);
  };
  btn.addEventListener('touchstart', (e) => set(true, e),  { passive: false });
  btn.addEventListener('touchend',   (e) => set(false, e), { passive: false });
  btn.addEventListener('touchcancel',(e) => set(false, e), { passive: false });
  btn.addEventListener('mousedown',  (e) => set(true, e));
  btn.addEventListener('mouseup',    (e) => set(false, e));
  btn.addEventListener('mouseleave', (e) => set(false, e));
});

startBtn.addEventListener('click', () => {
  applyDifficulty();
  if (gameWon && currentStage < FINAL_STAGE) { loadStage(currentStage + 1, false); return; }
  if (!running) loadStage(currentStage, false);
});
pauseBtn.addEventListener('click', togglePause);
restartBtn.addEventListener('click', () => { applyDifficulty(); restartCurrentStage(); });
resultRestart.addEventListener('click', () => { applyDifficulty(); restartCurrentStage(); });
resultNext.addEventListener('click', () => {
  if (currentStage < FINAL_STAGE) loadStage(currentStage + 1, false);
});
soundToggle.addEventListener('change', () => { soundOn = soundToggle.checked; saveSettings(); });
difficultySel.addEventListener('change', () => { difficulty = difficultySel.value; saveSettings(); });

function applyDifficulty() { difficulty = difficultySel.value; soundOn = soundToggle.checked; }

/* ---------- Geometry helpers ---------- */
function rectOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}
function circleRectOverlap(c, r) {
  const nx = Math.max(r.x, Math.min(c.x, r.x + r.width));
  const ny = Math.max(r.y, Math.min(c.y, r.y + r.height));
  const dx = c.x - nx, dy = c.y - ny;
  return dx * dx + dy * dy < c.r * c.r;
}

/* ---------- Stage / lifecycle ---------- */
function loadStage(stageNumber, resetScore) {
  const s = STAGES[stageNumber];
  const diff = DIFFICULTY[difficulty];

  currentStage = stageNumber;
  worldWidth = s.worldWidth;
  groundY = s.groundY;

  platforms = s.platforms.map(p => ({ ...p }));
  eggsInLevel = s.eggs.map(e => ({ x: e.x, y: e.y, r: 11, collected: false, bob: Math.random() * Math.PI * 2 }));
  totalEggs = eggsInLevel.length;
  eggs = 0;

  gate = { x: s.gate.x, y: groundY - s.gate.height, width: s.gate.width, height: s.gate.height, isOpen: false };
  cave = { x: s.cave.x, y: groundY - s.cave.height, width: s.cave.width, height: s.cave.height };

  enemy = {
    x: s.enemy.x, y: groundY - s.enemy.height,
    width: s.enemy.width, height: s.enemy.height,
    vx: s.enemy.vx * diff.enemyScale,
    patrolLeft: s.enemy.left, patrolRight: s.enemy.right,
    facing: 1, animTime: 0,
  };

  checkpoint = { x: 120, y: groundY - player.height, activated: false, markerX: s.checkpointX };

  player.x = 120; player.y = groundY - player.height;
  player.vx = 0; player.vy = 0; player.onGround = false; player.facing = 1;
  player.health = player.maxHealth; player.invulnUntil = 0;
  player.isJumping = false;

  if (resetScore) score = 0;
  timeLeft = diff.time;
  gameWon = false; autoNextAt = 0; paused = false; running = true;
  cameraX = 0; lives = MAX_LIVES;

  stageTextEl.textContent = String(currentStage);
  messageEl.textContent = `STAGE ${currentStage} 시작! (${difficulty.toUpperCase()})`;
  pauseBtn.textContent = '⏸ 일시정지';
  hideResult();
  canvas.focus();
}
function restartCurrentStage() { loadStage(currentStage, true); }

function togglePause() {
  if (!running) return;
  paused = !paused;
  pauseBtn.textContent = paused ? '▶ 계속하기' : '⏸ 일시정지';
  messageEl.textContent = paused ? '일시정지' : `STAGE ${currentStage} 진행중`;
}

function respawnAtCheckpoint() {
  lives -= 1;
  if (lives <= 0) {
    running = false;
    messageEl.textContent = '라이프를 모두 잃었습니다!';
    showResult('실패 (라이프 0)');
    beep(160, 0.25, 'sawtooth', 0.07);
    return;
  }
  player.x = checkpoint.activated ? checkpoint.x : 120;
  player.y = groundY - player.height;
  player.vx = 0; player.vy = 0;
  player.health = player.maxHealth;
  player.invulnUntil = performance.now() + 800;
  timeLeft = Math.max(0, timeLeft - 5);
  messageEl.textContent = `리스폰! 라이프 ${lives}/${MAX_LIVES}, 시간 -5s`;
  beep(260, 0.1, 'square', 0.05);
  if (timeLeft <= 0) { running = false; showResult('시간 초과'); }
}

function showResult(title) {
  if (score > bestScore) { bestScore = Math.floor(score); bestScoreEl.textContent = bestScore.toLocaleString(); saveSettings(); }
  resultTitle.textContent = title;
  resultStage.textContent = String(currentStage);
  resultTime.textContent = String(Math.ceil(timeLeft));
  resultScore.textContent = String(Math.floor(score));
  resultDiff.textContent = difficulty;
  resultPanel.classList.remove('hidden');
  resultNext.disabled = currentStage >= FINAL_STAGE || !gameWon;
}
function hideResult() { resultPanel.classList.add('hidden'); }

/* ---------- Update ---------- */
function updatePlayer(dt) {
  const now = performance.now();

  // horizontal motion
  if (input.left)  { player.vx -= MOVE_ACCEL * dt; player.facing = -1; }
  if (input.right) { player.vx += MOVE_ACCEL * dt; player.facing = 1; }
  if (!input.left && !input.right) {
    const sign = Math.sign(player.vx);
    const dec = MOVE_DECEL * dt;
    if (Math.abs(player.vx) <= dec) player.vx = 0;
    else player.vx -= sign * dec;
  }
  player.vx = Math.max(-MAX_RUN_SPD, Math.min(MAX_RUN_SPD, player.vx));

  // jump (with coyote + buffer + variable height)
  const sinceGround = now - player.lastGroundedAt;
  const sinceJumpPress = now - player.jumpPressedAt;
  const canCoyote = sinceGround <= COYOTE_MS;
  const buffered  = sinceJumpPress <= JUMP_BUF_MS;

  if (buffered && (player.onGround || canCoyote)) {
    player.vy = JUMP_VEL;
    player.onGround = false;
    player.isJumping = true;
    player.jumpPressedAt = -1e9;
    player.lastGroundedAt = -1e9;
    beep(620, 0.08, 'square', 0.04);
  }
  // Variable jump: cut velocity if released early
  if (player.isJumping && !input.jumpHeld && player.vy < 0) {
    player.vy *= JUMP_CUT;
    player.isJumping = false;
  }

  // gravity
  player.vy += GRAVITY * dt;
  if (player.vy > 1200) player.vy = 1200;

  // integrate
  player.x += player.vx * dt;
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + player.width > worldWidth) { player.x = worldWidth - player.width; player.vx = 0; }

  player.y += player.vy * dt;
  let landed = false;

  // ground
  if (player.y + player.height >= groundY) {
    player.y = groundY - player.height;
    player.vy = 0;
    landed = true;
  }

  // platforms (top-only)
  for (const p of platforms) {
    if (player.vy >= 0 &&
        player.x + player.width > p.x && player.x < p.x + p.width) {
      const prevBottom = player.y + player.height - player.vy * dt;
      if (prevBottom <= p.y + 1 && player.y + player.height >= p.y) {
        player.y = p.y - player.height;
        player.vy = 0;
        landed = true;
      }
    }
  }

  if (landed) {
    player.onGround = true;
    player.lastGroundedAt = now;
    player.isJumping = false;
  } else {
    player.onGround = false;
  }

  // gate blocks
  if (gate && !gate.isOpen && rectOverlap(player, gate)) {
    if (player.vx > 0) player.x = gate.x - player.width;
    else if (player.vx < 0) player.x = gate.x + gate.width;
    player.vx = 0;
  }

  // checkpoint
  if (!checkpoint.activated && player.x >= checkpoint.markerX) {
    checkpoint.activated = true;
    checkpoint.x = checkpoint.markerX;
    checkpoint.y = groundY - player.height;
    messageEl.textContent = '체크포인트 활성화!';
    beep(880, 0.12, 'square', 0.04);
    beep(1100, 0.12, 'square', 0.04);
  }

  // animation
  player.animTime += dt;
}

function updateEnemy(dt) {
  enemy.x += enemy.vx * dt;
  if (enemy.x <= enemy.patrolLeft)  { enemy.x = enemy.patrolLeft;  enemy.vx = Math.abs(enemy.vx); enemy.facing =  1; }
  if (enemy.x + enemy.width >= enemy.patrolRight) { enemy.x = enemy.patrolRight - enemy.width; enemy.vx = -Math.abs(enemy.vx); enemy.facing = -1; }
  enemy.y = groundY - enemy.height;
  enemy.animTime += dt;
}

function updateCombat() {
  const now = performance.now();
  if (rectOverlap(player, enemy) && now > player.invulnUntil) {
    player.health = Math.max(0, player.health - 25);
    player.invulnUntil = now + HIT_INVULN_MS;
    // knockback
    player.vx = (player.x < enemy.x) ? -260 : 260;
    player.vy = -260;
    beep(180, 0.15, 'sawtooth', 0.06);
    if (player.health <= 0) respawnAtCheckpoint();
  }
}

function updateEggs(dt) {
  for (const egg of eggsInLevel) {
    if (egg.collected) continue;
    egg.bob += dt * 4;
    const pBox = { x: player.x + 4, y: player.y + 4, width: player.width - 8, height: player.height - 8 };
    if (circleRectOverlap({ x: egg.x, y: egg.y, r: egg.r }, pBox)) {
      egg.collected = true;
      eggs += 1;
      score += 150;
      beep(660, 0.07, 'square', 0.04);
      beep(880, 0.07, 'square', 0.04);
      if (eggs === totalEggs) {
        gate.isOpen = true;
        messageEl.textContent = '알 전부 수집! 🚪 게이트 OPEN';
        beep(980, 0.18, 'square', 0.05);
      }
    }
  }
}

function updateGoal() {
  if (gate.isOpen && rectOverlap(player, cave)) {
    running = false;
    gameWon = true;
    score += 1000;
    beep(980, 0.2, 'square', 0.06);
    if (currentStage < FINAL_STAGE) {
      messageEl.textContent = `STAGE ${currentStage} 클리어! 3초 뒤 자동 진행`;
      showResult(`STAGE ${currentStage} 클리어`);
      autoNextAt = performance.now() + 3000;
    } else {
      messageEl.textContent = '🏆 최종 클리어! 축하합니다!';
      showResult('최종 클리어');
    }
  }
}

function updateCamera(dt) {
  // look-ahead toward facing direction
  const lookAhead = player.vx * 0.3;
  const targetX = player.x + player.width / 2 - VIEW_W / 2 + lookAhead;
  const k = 1 - Math.exp(-dt * 6);
  cameraX += (targetX - cameraX) * k;
  cameraX = Math.max(0, Math.min(worldWidth - VIEW_W, cameraX));
}

/* ---------- Drawing ---------- */
/* Sky gradient + sun */
function drawSky() {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, '#1a2150');
  g.addColorStop(0.4, '#cc5a4a');
  g.addColorStop(0.7, '#f4a261');
  g.addColorStop(1, '#f7c290');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // sun
  const sunX = VIEW_W * 0.72, sunY = VIEW_H * 0.52;
  const sg = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 80);
  sg.addColorStop(0, '#fff3c4');
  sg.addColorStop(0.5, '#ffb14a');
  sg.addColorStop(1, 'rgba(255,160,80,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 80, sunY - 80, 160, 160);

  // hint of clouds
  ctx.fillStyle = 'rgba(255,220,180,0.35)';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 230 - cameraX * 0.05) % (VIEW_W + 200)) - 100;
    const cy = 40 + (i * 19) % 80;
    ctx.fillRect(cx, cy, 80, 8);
    ctx.fillRect(cx + 12, cy - 6, 50, 6);
  }
}

/* Far parallax: volcano + mountains */
function drawFarBackground() {
  const px = -cameraX * 0.15;

  // distant mountains
  ctx.fillStyle = '#3b2a4a';
  for (let i = 0; i < 6; i++) {
    const baseX = px + i * 220 - 200;
    drawMountain(baseX, 360, 240, 130);
  }

  // volcano (centered roughly mid-stage)
  const vx = px + worldWidth * 0.20;
  drawVolcano(vx, 380);

  // closer mountain silhouette
  ctx.fillStyle = '#2a1f3c';
  const px2 = -cameraX * 0.25;
  for (let i = 0; i < 8; i++) {
    drawMountain(px2 + i * 180 - 100, 400, 200, 110);
  }
}

function drawMountain(x, baseY, w, h) {
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + w / 2, baseY - h);
  ctx.lineTo(x + w, baseY);
  ctx.closePath();
  ctx.fill();
}

function drawVolcano(x, baseY) {
  // body
  ctx.fillStyle = '#3d2236';
  ctx.beginPath();
  ctx.moveTo(x, baseY);
  ctx.lineTo(x + 90, baseY - 170);
  ctx.lineTo(x + 130, baseY - 170);
  ctx.lineTo(x + 220, baseY);
  ctx.closePath();
  ctx.fill();
  // lava streaks
  ctx.fillStyle = '#ff6b35';
  ctx.fillRect(x + 100, baseY - 165, 4, 80);
  ctx.fillRect(x + 115, baseY - 160, 3, 100);
  // crater glow
  const cgx = x + 110, cgy = baseY - 165;
  const grd = ctx.createRadialGradient(cgx, cgy, 2, cgx, cgy, 40);
  grd.addColorStop(0, '#fff7c2');
  grd.addColorStop(0.4, '#ffb14a');
  grd.addColorStop(1, 'rgba(255,80,30,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(cgx - 40, cgy - 40, 80, 80);
  // smoke plume
  ctx.fillStyle = 'rgba(60,40,50,0.4)';
  for (let i = 0; i < 5; i++) {
    const sy = cgy - 30 - i * 18;
    const sw = 22 + i * 4;
    ctx.fillRect(cgx - sw / 2, sy, sw, 12);
  }
}

/* Mid parallax: hills with vegetation */
function drawMidBackground() {
  const px = -cameraX * 0.45;
  // jungle silhouette band
  ctx.fillStyle = '#1d3a2a';
  ctx.fillRect(0, 360, VIEW_W, 120);
  // trees
  for (let i = 0; i < 30; i++) {
    const tx = px + i * 110;
    const ty = 360;
    if (tx > -40 && tx < VIEW_W + 40) drawPalm(tx, ty, 0.8);
  }
}

function drawPalm(x, y, scale = 1) {
  const s = scale;
  // trunk
  ctx.fillStyle = '#4a3422';
  ctx.fillRect(x, y - 70 * s, 6 * s, 70 * s);
  ctx.fillStyle = '#2f2014';
  ctx.fillRect(x, y - 70 * s, 2 * s, 70 * s);
  // fronds
  ctx.fillStyle = '#2e6b3a';
  for (let f = 0; f < 6; f++) {
    const ang = (f / 6) * Math.PI * 2;
    const fx = x + 3 * s + Math.cos(ang) * 16 * s;
    const fy = y - 70 * s + Math.sin(ang) * 10 * s;
    ctx.fillRect(fx - 6 * s, fy - 2, 14 * s, 4 * s);
  }
  ctx.fillStyle = '#3f9054';
  ctx.fillRect(x - 2 * s, y - 76 * s, 12 * s, 6 * s);
}

/* Ground (with vines, grass, stones) */
function drawGround() {
  // dirt
  ctx.fillStyle = '#5a3e2f';
  ctx.fillRect(0, groundY, VIEW_W, VIEW_H - groundY);
  // brick pattern (offset by camera)
  ctx.fillStyle = '#3e2920';
  const brickH = 14, brickW = 32;
  const startCol = Math.floor(cameraX / brickW);
  for (let row = 0; row * brickH + groundY + 14 < VIEW_H; row++) {
    const yy = groundY + 14 + row * brickH;
    const offset = (row % 2 === 0) ? 0 : brickW / 2;
    for (let col = -1; col < (VIEW_W / brickW) + 2; col++) {
      const xx = (startCol + col) * brickW + offset - cameraX;
      ctx.fillRect(xx, yy, brickW - 2, brickH - 2);
    }
  }
  // grass strip
  ctx.fillStyle = '#4d7b3d';
  ctx.fillRect(0, groundY - 10, VIEW_W, 10);
  ctx.fillStyle = '#5fa052';
  for (let x = -((cameraX) % 8); x < VIEW_W; x += 8) {
    ctx.fillRect(x, groundY - 12, 4, 2);
  }
  // hanging vines
  ctx.fillStyle = '#3a6b3a';
  const vineSpacing = 220;
  const vStart = Math.floor(cameraX / vineSpacing);
  for (let i = -1; i < (VIEW_W / vineSpacing) + 2; i++) {
    const wx = (vStart + i) * vineSpacing + 60;
    const sx = wx - cameraX;
    if (sx > -20 && sx < VIEW_W + 20) {
      ctx.fillRect(sx, 0, 3, 20 + ((wx * 7) % 30));
    }
  }
}

/* Platforms */
function drawPlatforms() {
  for (const p of platforms) {
    const sx = p.x - cameraX;
    if (sx + p.width < 0 || sx > VIEW_W) continue;
    // wooden plank
    ctx.fillStyle = '#7c5a36';
    ctx.fillRect(sx, p.y, p.width, p.height);
    // top grass
    ctx.fillStyle = '#4d7b3d';
    ctx.fillRect(sx, p.y - 4, p.width, 4);
    ctx.fillStyle = '#5fa052';
    for (let gx = 0; gx < p.width; gx += 6) ctx.fillRect(sx + gx, p.y - 6, 3, 2);
    // wood grain
    ctx.fillStyle = '#5a3e25';
    for (let lx = 4; lx < p.width; lx += 14) ctx.fillRect(sx + lx, p.y + 4, 2, p.height - 8);
  }
}

/* Checkpoint flag */
function drawCheckpoint() {
  const x = checkpoint.markerX - cameraX;
  if (x < -40 || x > VIEW_W + 40) return;
  const y = groundY - 60;
  // pole
  ctx.fillStyle = '#dddddd';
  ctx.fillRect(x, y, 3, 60);
  // flag
  ctx.fillStyle = checkpoint.activated ? '#62c462' : '#b84c4c';
  ctx.fillRect(x + 3, y, 22, 14);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 7, y + 4, 14, 6);
  if (checkpoint.activated) {
    // sparkle
    const t = performance.now() / 200;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x + 14 + Math.sin(t) * 10, y - 6, 2, 2);
  }
}

/* Eggs */
function drawEggs() {
  for (const egg of eggsInLevel) {
    if (egg.collected) continue;
    const sx = egg.x - cameraX;
    if (sx < -20 || sx > VIEW_W + 20) continue;
    const sy = egg.y + Math.sin(egg.bob) * 3;

    if (sprites.egg) {
      ctx.drawImage(sprites.egg, sx - 12, sy - 14, 24, 28);
    } else {
      // procedural egg (cream + brown spots)
      ctx.fillStyle = '#f3e8c8';
      ctx.beginPath();
      ctx.ellipse(sx, sy, 9, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a07a3a';
      ctx.fillRect(sx - 4, sy - 2, 3, 3);
      ctx.fillRect(sx + 1, sy + 2, 3, 2);
      ctx.fillRect(sx - 1, sy - 6, 2, 2);
      // shine
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillRect(sx - 5, sy - 7, 2, 4);
    }
  }
}

/* Cave + gate (bone gate) */
function drawCaveAndGate() {
  // cave
  const cx = cave.x - cameraX;
  if (cx + cave.width >= 0 && cx <= VIEW_W) {
    if (sprites.cave) {
      ctx.drawImage(sprites.cave, cx, cave.y, cave.width, cave.height);
    } else {
      // outer rocks
      ctx.fillStyle = '#7a6b5d';
      ctx.fillRect(cx, cave.y, cave.width, cave.height);
      // inner blackness arch
      ctx.fillStyle = '#0a0808';
      ctx.beginPath();
      ctx.ellipse(cx + cave.width / 2, cave.y + cave.height * 0.6,
                  cave.width / 2 - 14, cave.height * 0.55, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(cx + 14, cave.y + cave.height * 0.55, cave.width - 28, cave.height);
      // rock dabs
      ctx.fillStyle = '#544a40';
      for (let i = 0; i < 8; i++) ctx.fillRect(cx + 6 + i * 14, cave.y + 6 + (i % 3) * 10, 6, 5);
      // green moss top
      ctx.fillStyle = '#4d7b3d';
      ctx.fillRect(cx, cave.y, cave.width, 4);
    }
  }
  // gate (bone gate)
  const gx = gate.x - cameraX;
  if (gx + gate.width >= 0 && gx <= VIEW_W) {
    const op = gate.isOpen ? 0.25 : 1;
    ctx.globalAlpha = op;
    // posts
    ctx.fillStyle = '#5a3a22';
    ctx.fillRect(gx - 6, gate.y, 6, gate.height);
    ctx.fillRect(gx + gate.width, gate.y, 6, gate.height);
    // bones across
    ctx.fillStyle = '#efe7d0';
    for (let i = 0; i < 5; i++) {
      const by = gate.y + 8 + i * 22;
      ctx.fillRect(gx, by, gate.width, 6);
      ctx.beginPath(); ctx.arc(gx, by + 3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx + gate.width, by + 3, 4, 0, Math.PI * 2); ctx.fill();
    }
    // skull
    ctx.fillStyle = '#fff7e0';
    const sx = gx + gate.width / 2 - 7, sy = gate.y - 4;
    ctx.fillRect(sx, sy, 14, 12);
    ctx.fillStyle = '#000';
    ctx.fillRect(sx + 3, sy + 4, 3, 3);
    ctx.fillRect(sx + 8, sy + 4, 3, 3);
    ctx.globalAlpha = 1;
  }
}

/* Decorative: torch + banner near spawn */
function drawDecor() {
  // torch at x=140
  const tx = 140 - cameraX;
  if (tx > -30 && tx < VIEW_W) {
    if (sprites.torch) {
      ctx.drawImage(sprites.torch, tx - 12, groundY - 70, 24, 70);
    } else {
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(tx, groundY - 50, 4, 50);
      ctx.fillRect(tx - 4, groundY - 54, 12, 6);
      // flame (animated)
      const t = performance.now() / 80;
      ctx.fillStyle = '#ff7b1c';
      ctx.fillRect(tx - 3, groundY - 64 + Math.sin(t) * 1, 10, 12);
      ctx.fillStyle = '#ffd400';
      ctx.fillRect(tx - 1, groundY - 60 + Math.sin(t * 1.3) * 1, 6, 6);
    }
  }
  // banner at x=70
  const bx = 70 - cameraX;
  if (bx > -50 && bx < VIEW_W) {
    if (sprites.banner) {
      ctx.drawImage(sprites.banner, bx - 30, groundY - 90, 60, 90);
    } else {
      // posts
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(bx - 30, groundY - 90, 4, 90);
      ctx.fillRect(bx + 26, groundY - 90, 4, 90);
      ctx.fillRect(bx - 30, groundY - 90, 60, 4);
      // cloth
      ctx.fillStyle = '#e8d2a8';
      ctx.fillRect(bx - 26, groundY - 86, 52, 50);
      // dino silhouette
      ctx.fillStyle = '#7a3a22';
      ctx.fillRect(bx - 14, groundY - 70, 20, 8);
      ctx.fillRect(bx + 4, groundY - 78, 8, 12);
      ctx.fillRect(bx - 14, groundY - 60, 4, 10);
      ctx.fillRect(bx + 2, groundY - 60, 4, 10);
    }
  }
}

/* ---------- Player drawing (procedural pixel art) ---------- */
function drawPlayer() {
  const sx = player.x - cameraX;
  const sy = player.y;
  const blink = player.invulnUntil > performance.now() && Math.floor(performance.now() / 80) % 2 === 0;
  if (blink) return;

  // Try sprite first
  let used = false;
  if (player.onGround) {
    const moving = Math.abs(player.vx) > 25;
    if (moving) {
      const frame = Math.floor(player.animTime * 8) % 2;
      const img = (frame === 0 ? sprites.player_run1 : sprites.player_run2);
      if (img) { drawSpriteFlipped(img, sx - 8, sy - 6, 46, 60, player.facing); used = true; }
    } else if (sprites.player_idle) {
      drawSpriteFlipped(sprites.player_idle, sx - 8, sy - 6, 46, 60, player.facing);
      used = true;
    }
  } else if (sprites.player_jump) {
    drawSpriteFlipped(sprites.player_jump, sx - 8, sy - 6, 46, 60, player.facing);
    used = true;
  }

  if (!used) drawProceduralBoy(sx, sy);
}

function drawSpriteFlipped(img, x, y, w, h, facing) {
  if (facing >= 0) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.save();
    ctx.translate(x + w, y);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.restore();
  }
}

/* Procedural pixel-art boy in white shirt + blue pants (matches your sprite style).
   We draw at "logical" positions; pixel size is 2x2 so the look stays chunky. */
function drawProceduralBoy(sx, sy) {
  // animation state
  const moving = Math.abs(player.vx) > 25 && player.onGround;
  const inAir  = !player.onGround;
  const phase  = (player.animTime * 9) % (Math.PI * 2);
  const bounce = moving ? Math.sin(phase) * 1 : 0;
  const armA = moving ? Math.sin(phase) * 6 : 0;
  const armB = moving ? -Math.sin(phase) * 6 : 0;
  const legA = moving ? Math.sin(phase) * 4 : 0;
  const legB = moving ? -Math.sin(phase) * 4 : 0;
  const jumpPose = inAir;

  const f = player.facing;
  ctx.save();
  ctx.translate(sx + player.width / 2, sy + bounce);
  if (f < 0) ctx.scale(-1, 1);

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-12, player.height - 2, 24, 3);

  // legs (blue pants)
  ctx.fillStyle = '#2543a3';
  if (jumpPose) {
    ctx.fillRect(-9, player.height - 18, 8, 16);
    ctx.fillRect( 1, player.height - 18, 8, 16);
  } else {
    ctx.fillRect(-9 + legA, player.height - 18, 8, 16);
    ctx.fillRect( 1 + legB, player.height - 18, 8, 16);
  }
  // shoes
  ctx.fillStyle = '#f0f0f0';
  if (jumpPose) {
    ctx.fillRect(-10, player.height - 4, 9, 4);
    ctx.fillRect(  1, player.height - 4, 9, 4);
  } else {
    ctx.fillRect(-10 + legA, player.height - 4, 9, 4);
    ctx.fillRect(  1 + legB, player.height - 4, 9, 4);
  }

  // shirt (white)
  ctx.fillStyle = '#f5f1e0';
  ctx.fillRect(-12, 16, 24, 18);
  ctx.fillStyle = '#e0d8c0';
  ctx.fillRect(-12, 32, 24, 2);
  // CENTRAL letters (red)
  ctx.fillStyle = '#cc2436';
  ctx.fillRect(-9, 22, 18, 4);
  ctx.fillStyle = '#f5f1e0';
  ctx.fillRect(-8, 23, 1, 2);
  ctx.fillRect(-5, 23, 1, 2);
  ctx.fillRect(-2, 23, 1, 2);
  ctx.fillRect( 1, 23, 1, 2);
  ctx.fillRect( 4, 23, 1, 2);
  ctx.fillRect( 7, 23, 1, 2);

  // arms
  ctx.fillStyle = '#f5f1e0';
  if (jumpPose) {
    ctx.fillRect(-16, 14, 5, 14);   // raised back
    ctx.fillRect( 11, 14, 5, 14);   // raised front
  } else {
    ctx.fillRect(-16, 18 + armA, 5, 12);
    ctx.fillRect( 11, 18 + armB, 5, 12);
  }
  // hand peeks
  ctx.fillStyle = '#f2cfaa';
  if (jumpPose) {
    ctx.fillRect(-16, 26, 5, 4);
    ctx.fillRect( 11, 26, 5, 4);
  } else {
    ctx.fillRect(-16, 28 + armA, 5, 3);
    ctx.fillRect( 11, 28 + armB, 5, 3);
  }

  // head (skin)
  ctx.fillStyle = '#f2cfaa';
  ctx.fillRect(-9, 0, 18, 16);
  // hair
  ctx.fillStyle = '#1f1408';
  ctx.fillRect(-10, -2, 20, 7);
  ctx.fillRect(-9,  3, 4, 3);
  ctx.fillRect( 5,  3, 4, 3);
  // eyes
  ctx.fillStyle = '#1f1408';
  ctx.fillRect(-5, 8, 2, 3);
  ctx.fillRect( 3, 8, 2, 3);
  // smile
  ctx.fillStyle = '#7a3a22';
  ctx.fillRect(-2, 13, 4, 1);

  ctx.restore();
}

/* ---------- Enemy drawing ---------- */
function drawEnemy() {
  const sx = enemy.x - cameraX;
  const sy = enemy.y;
  if (sx + enemy.width < 0 || sx > VIEW_W) return;

  if (sprites.enemy1) {
    const frame = Math.floor(enemy.animTime * 6) % 2;
    const img = (frame === 0 || !sprites.enemy2) ? sprites.enemy1 : sprites.enemy2;
    drawSpriteFlipped(img, sx, sy - 8, enemy.width, enemy.height + 8, enemy.facing);
    return;
  }
  drawProceduralRaptor(sx, sy);
}

function drawProceduralRaptor(sx, sy) {
  const f = enemy.facing;
  ctx.save();
  ctx.translate(sx + enemy.width / 2, sy);
  if (f < 0) ctx.scale(-1, 1);

  const phase = (enemy.animTime * 7) % (Math.PI * 2);
  const legA = Math.sin(phase) * 4;
  const legB = -Math.sin(phase) * 4;

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-26, enemy.height - 2, 52, 3);

  // tail
  ctx.fillStyle = '#a76a2a';
  ctx.fillRect(-30, 12, 12, 6);
  ctx.fillRect(-22, 8, 10, 6);

  // body
  ctx.fillStyle = '#c98a36';
  ctx.fillRect(-18, 8, 30, 16);
  // belly
  ctx.fillStyle = '#e6b663';
  ctx.fillRect(-16, 18, 26, 6);
  // back stripes
  ctx.fillStyle = '#7a4818';
  ctx.fillRect(-12, 8, 4, 2);
  ctx.fillRect( -2, 8, 4, 2);
  ctx.fillRect(  8, 8, 4, 2);

  // legs
  ctx.fillStyle = '#a76a2a';
  ctx.fillRect(-6 + legA, 22, 5, 12);
  ctx.fillRect( 4 + legB, 22, 5, 12);
  // claws
  ctx.fillStyle = '#3a2510';
  ctx.fillRect(-7 + legA, 32, 7, 3);
  ctx.fillRect( 3 + legB, 32, 7, 3);

  // arm
  ctx.fillStyle = '#a76a2a';
  ctx.fillRect(8, 16, 6, 3);
  ctx.fillStyle = '#3a2510';
  ctx.fillRect(13, 17, 3, 2);

  // head
  ctx.fillStyle = '#c98a36';
  ctx.fillRect(10, 0, 22, 14);
  // jaw
  ctx.fillStyle = '#a76a2a';
  ctx.fillRect(14, 12, 18, 4);
  // teeth
  ctx.fillStyle = '#fff';
  ctx.fillRect(16, 12, 2, 2);
  ctx.fillRect(20, 12, 2, 2);
  ctx.fillRect(24, 12, 2, 2);
  ctx.fillRect(28, 12, 2, 2);
  // eye
  ctx.fillStyle = '#fff';
  ctx.fillRect(22, 4, 4, 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(24, 5, 2, 3);

  ctx.restore();
}

/* ---------- Overlays ---------- */
function drawHUDOverlays() {
  if (!running && gameWon && currentStage >= FINAL_STAGE) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ffe082';
    ctx.font = 'bold 48px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('THE END', VIEW_W / 2, VIEW_H / 2 - 10);
    ctx.font = '18px "VT323", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('모든 스테이지를 클리어했습니다!', VIEW_W / 2, VIEW_H / 2 + 30);
    ctx.textAlign = 'left';
  }
  if (paused && running) {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    ctx.font = '14px "VT323", monospace';
    ctx.fillText('P 키 또는 일시정지 버튼으로 계속', VIEW_W / 2, VIEW_H / 2 + 30);
    ctx.textAlign = 'left';
  }
  if (!running && !gameWon && lives <= 0) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#ff5b6e';
    ctx.font = 'bold 38px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', VIEW_W / 2, VIEW_H / 2);
    ctx.textAlign = 'left';
  }
}

/* ---------- Mini map ---------- */
function drawMiniMap() {
  miniCtx.clearRect(0, 0, miniCanvas.width, miniCanvas.height);
  miniCtx.fillStyle = '#0a1a22';
  miniCtx.fillRect(0, 0, miniCanvas.width, miniCanvas.height);

  const scaleX = miniCanvas.width / worldWidth;
  const baseY = miniCanvas.height - 18;

  // ground
  miniCtx.fillStyle = '#4d7b3d';
  miniCtx.fillRect(0, baseY, miniCanvas.width, 6);

  // platforms
  miniCtx.fillStyle = '#7c5a36';
  for (const p of platforms) {
    miniCtx.fillRect(p.x * scaleX, baseY - (groundY - p.y) * 0.2, Math.max(2, p.width * scaleX), 2);
  }

  // eggs
  for (const egg of eggsInLevel) {
    miniCtx.fillStyle = egg.collected ? '#444' : '#f6c667';
    miniCtx.fillRect(egg.x * scaleX, baseY - 12, 2, 2);
  }

  // gate, cave
  miniCtx.fillStyle = gate.isOpen ? '#62c462' : '#b84c4c';
  miniCtx.fillRect(gate.x * scaleX, baseY - 10, Math.max(2, gate.width * scaleX), 8);
  miniCtx.fillStyle = '#7a6b5d';
  miniCtx.fillRect(cave.x * scaleX, baseY - 14, Math.max(3, cave.width * scaleX), 14);

  // checkpoint
  miniCtx.fillStyle = checkpoint.activated ? '#62c462' : '#d1a34a';
  miniCtx.fillRect(checkpoint.markerX * scaleX, baseY - 16, 2, 14);

  // enemy
  miniCtx.fillStyle = '#ff8c2c';
  miniCtx.fillRect(enemy.x * scaleX, baseY - 6, 4, 4);

  // viewport rectangle
  miniCtx.strokeStyle = 'rgba(255,255,255,0.45)';
  miniCtx.lineWidth = 1;
  miniCtx.strokeRect(cameraX * scaleX, 4, VIEW_W * scaleX, miniCanvas.height - 8);

  // player
  miniCtx.fillStyle = '#fff';
  miniCtx.fillRect(player.x * scaleX, baseY - 6, 3, 5);
}

/* ---------- HUD ---------- */
function pad(n, w) { const s = String(n); return s.length >= w ? s : '0'.repeat(w - s.length) + s; }
function updateHUD(dt) {
  if (running && !paused) {
    timeLeft -= dt;
    if (timeLeft <= 0) {
      timeLeft = 0; running = false;
      messageEl.textContent = '시간 종료!';
      showResult('시간 초과');
      beep(180, 0.25, 'sawtooth', 0.06);
    }
    score += dt * 10;
  }
  healthFillEl.style.width = `${(player.health / player.maxHealth) * 100}%`;
  heartsEl.textContent = '❤'.repeat(Math.max(0, lives)) + '♡'.repeat(MAX_LIVES - Math.max(0, lives));
  eggCountEl.textContent = `${eggs}/${totalEggs}`;
  eggProgEl.style.width = `${totalEggs > 0 ? (eggs / totalEggs) * 100 : 0}%`;
  timerEl.textContent = Math.ceil(timeLeft);
  scoreEl.textContent = pad(Math.floor(score), 7);
  stageTextEl.textContent = String(currentStage);
}

/* ---------- Main loop ---------- */
let lastTime = performance.now();
function frame(now) {
  let dt = (now - lastTime) / 1000;
  lastTime = now;
  if (dt > 0.05) dt = 0.05; // clamp on lag
  if (running && !paused) {
    updatePlayer(dt);
    updateEnemy(dt);
    updateCombat();
    updateEggs(dt);
    updateGoal();
    updateCamera(dt);
  }
  if (!running && gameWon && currentStage < FINAL_STAGE && autoNextAt > 0 && performance.now() >= autoNextAt) {
    loadStage(currentStage + 1, false);
  }

  // draw
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawSky();
  drawFarBackground();
  drawMidBackground();
  drawGround();
  drawDecor();
  drawCheckpoint();
  drawPlatforms();
  drawCaveAndGate();
  drawEggs();
  drawEnemy();
  drawPlayer();
  drawHUDOverlays();

  drawMiniMap();
  updateHUD(dt);

  requestAnimationFrame(frame);
}

/* ---------- Boot ---------- */
loadSettings();
loadAllSprites().then(() => {
  loadStage(1, true);
  running = false;
  messageEl.textContent = '난이도를 고른 뒤 ▶ 시작 버튼을 눌러보세요.';
  requestAnimationFrame(frame);
});
})();
