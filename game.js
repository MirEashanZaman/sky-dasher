const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const W = 800, H = 480;
canvas.width = W;
canvas.height = H;

const startScreen = document.getElementById('start-screen');
const pauseScreen = document.getElementById('pause-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const settingsScreen = document.getElementById('settings-screen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score-display');
const livesDisplay = document.getElementById('lives-display');
const levelDisplay = document.getElementById('level-display');
const finalScore = document.getElementById('final-score');
const bestScoreEl = document.getElementById('best-score');

const powerupIcons = {
  speed: document.getElementById('powerup-speed'),
  jump: document.getElementById('powerup-jump'),
  shield: document.getElementById('powerup-shield'),
  magnet: document.getElementById('powerup-magnet')
};

const comboDisplay = document.getElementById('combo-display');
const comboEl = document.getElementById('hud-combo');

document.getElementById('start-btn').onclick = startGame;
document.getElementById('resume-btn').onclick = resumeGame;
document.getElementById('restart-btn').onclick = startGame;
document.getElementById('restart-pause-btn').onclick = startGame;
document.getElementById('settings-btn').onclick = () => {
  if (startScreen) startScreen.classList.add('hidden');
  if (settingsScreen) settingsScreen.classList.remove('hidden');
};
document.getElementById('settings-back-btn').onclick = () => {
  if (settingsScreen) settingsScreen.classList.add('hidden');
  if (startScreen) startScreen.classList.remove('hidden');
  saveSettings();
};

const GRAVITY = 0.55;
const JUMP_FORCE = -13;
const PLAYER_SPEED = 4.5;
const GROUND_Y = H - 60;

const POWERUP_TYPES = {
  SPEED: 'speed',
  JUMP: 'jump',
  SHIELD: 'shield',
  MAGNET: 'magnet'
};

const ENEMY_TYPES = {
  GROUND: 'ground',
  FLYING: 'flying',
  SPIKE: 'spike'
};

const WORLD_THEMES = {
  SKY: {
    sky1: '#0a0f2e', sky2: '#1a2055',
    ground: '#1e1e3a', groundTop: '#f7c948',
    platform: '#2a2a5a', platformTop: '#6bffb8',
    enemy: '#ff6b6b'
  },
  FOREST: {
    sky1: '#0a2e0a', sky2: '#1a551a',
    ground: '#2e1e0a', groundTop: '#8B4513',
    platform: '#2a5a2a', platformTop: '#32CD32',
    enemy: '#8B0000'
  },
  CAVE: {
    sky1: '#1a1a1a', sky2: '#2a2a2a',
    ground: '#3a3a3a', groundTop: '#666666',
    platform: '#4a4a4a', platformTop: '#FFD700',
    enemy: '#DC143C'
  }
};

let currentTheme = WORLD_THEMES.SKY;

function updateTheme() {
  const worldIndex = Math.floor((level - 1) / 5) % 3;
  switch (worldIndex) {
    case 0: currentTheme = WORLD_THEMES.SKY; break;
    case 1: currentTheme = WORLD_THEMES.FOREST; break;
    case 2: currentTheme = WORLD_THEMES.CAVE; break;
  }
  // Update COLORS object with current theme values
  COLORS.sky1 = currentTheme.sky1;
  COLORS.sky2 = currentTheme.sky2;
  COLORS.ground = currentTheme.ground;
  COLORS.groundTop = currentTheme.groundTop;
  COLORS.platform = currentTheme.platform;
  COLORS.platformTop = currentTheme.platformTop;
  COLORS.enemy = currentTheme.enemy;
}

const COLORS = {
  sky1: '#0a0f2e',
  sky2: '#1a2055',
  ground: '#1e1e3a',
  groundTop: '#f7c948',
  platform: '#2a2a5a',
  platformTop: '#6bffb8',
  player: '#f7c948',
  playerEye: '#0a0a1a',
  coin: '#ffd700',
  coinGlow: 'rgba(255,215,0,0.3)',
  enemy: '#ff6b6b',
  enemyEye: '#0a0a1a',
  star: '#ffffff',
  particle: ['#f7c948', '#ff6b6b', '#6bffb8', '#ffffff'],
  cloud: 'rgba(255,255,255,0.07)',
  accent: '#f7c948',
  accent2: '#ff6b6b',
  accent3: '#6bffb8'
};

const CHARACTER_TYPES = {
  CLASSIC: { name: 'Classic', color: '#f7c948', eyeColor: '#0a0a1a' },
  BLUE: { name: 'Blue Dasher', color: '#4a90e2', eyeColor: '#ffffff' },
  RED: { name: 'Red Dasher', color: '#e74c3c', eyeColor: '#ffffff' },
  GREEN: { name: 'Green Dasher', color: '#27ae60', eyeColor: '#ffffff' },
  PURPLE: { name: 'Purple Dasher', color: '#9b59b6', eyeColor: '#ffffff' }
};

let state, keys, cameraX, score, lives, level,
  platforms, coins, enemies, particles, stars,
  clouds, frameCount, bestScore, invincible,
  invincibleTimer, scrollSpeed, spawnTimer,
  gameRunning, gamePaused, animFrame, powerups,
  playerPowerups, combo, comboTimer, dashCooldown,
  isDashing, soundEnabled = true, difficulty = 'normal',
  selectedCharacter = 'CLASSIC';

function initKeys() {
  keys = { left: false, right: false, jump: false, jumpPressed: false, dash: false };
  window.onkeydown = e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !keys.jumpPressed) {
      keys.jump = true; keys.jumpPressed = true;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.dash = true;
    if (e.code === 'Escape' && gameRunning) togglePause();
    e.preventDefault();
  };
  window.onkeyup = e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      keys.jumpPressed = false;
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.dash = false;
  };
}

function createPlayer() {
  return {
    x: 120, y: GROUND_Y - 40,
    w: 32, h: 40,
    vx: 0, vy: 0,
    onGround: false,
    jumpsLeft: 2,
    facing: 1,
    frame: 0, frameTimer: 0,
    scaleX: 1, scaleY: 1,
  };
}
let player;

function createGround() {
  return { x: -200, y: GROUND_Y, w: 99999, h: H - GROUND_Y, isGround: true };
}

function spawnPlatform(x) {
  const w = 80 + Math.random() * 100;
  const y = 180 + Math.random() * (GROUND_Y - 220);
  return { x, y, w, h: 18, isGround: false, coinSpawned: false };
}

function spawnPowerup(x, y) {
  const types = Object.values(POWERUP_TYPES);
  return {
    x: x - 8, y: y - 30,
    w: 16, h: 16,
    type: types[Math.floor(Math.random() * types.length)],
    collected: false,
    bobTimer: Math.random() * Math.PI * 2
  };
}

function spawnEnemy(x, platY, platW, type = ENEMY_TYPES.GROUND) {
  const baseEnemy = {
    x: x + Math.random() * (platW - 30),
    y: platY - 30,
    w: 28, h: 28,
    vx: (Math.random() < 0.5 ? 1 : -1) * (1 + Math.random()),
    onGround: true,
    frame: 0, frameTimer: 0,
    startX: x, endX: x + platW - 28,
    alive: true,
    type: type
  };

  switch (type) {
    case ENEMY_TYPES.FLYING:
      baseEnemy.y = platY - 40 - Math.random() * 60;
      baseEnemy.vx = (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.4);
      baseEnemy.vy = Math.sin(Math.random() * Math.PI * 2) * 0.5;
      baseEnemy.onGround = false;
      baseEnemy.w = 24; baseEnemy.h = 20;
      break;
    case ENEMY_TYPES.SPIKE:
      baseEnemy.vx = 0; // Stationary
      baseEnemy.w = 20; baseEnemy.h = 35;
      break;
  }

  return baseEnemy;
}

function spawnCoin(x, y) {
  return { x, y, w: 16, h: 16, collected: false, bobTimer: Math.random() * Math.PI * 2 };
}

function burst(x, y, count = 8, color = null) {
  for (let i = 0; i < count; i++) {
    const ang = (Math.PI * 2 / count) * i + Math.random() * 0.5;
    const spd = 2 + Math.random() * 4;
    particles.push({
      x, y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 2,
      life: 1,
      decay: 0.03 + Math.random() * 0.03,
      r: 3 + Math.random() * 4,
      color: color || COLORS.particle[Math.floor(Math.random() * COLORS.particle.length)],
    });
  }
}

function activatePowerup(type) {
  const duration = 600; // 10 seconds at 60fps
  switch (type) {
    case POWERUP_TYPES.SPEED:
      playerPowerups.speedBoost = true;
      playerPowerups.speedBoostTimer = duration;
      break;
    case POWERUP_TYPES.JUMP:
      playerPowerups.extraJump = true;
      playerPowerups.extraJumpTimer = duration;
      player.jumpsLeft = Math.max(player.jumpsLeft, 3);
      break;
    case POWERUP_TYPES.SHIELD:
      playerPowerups.shield = true;
      playerPowerups.shieldTimer = duration;
      break;
    case POWERUP_TYPES.MAGNET:
      playerPowerups.magnet = true;
      playerPowerups.magnetTimer = duration;
      break;
  }
}

function saveProgress() {
  try {
    if (typeof localStorage !== 'undefined') {
      const totalCoins = parseInt(localStorage.getItem('skyDasherCoins') || '0') + Math.floor(score / 10);
      const playTime = parseInt(localStorage.getItem('skyDasherPlayTime') || '0') + Math.floor(frameCount / 60);
      const progress = {
        bestScore: bestScore,
        unlockedLevels: Math.max(1, Math.floor(bestScore / 500) + 1),
        totalCoins: totalCoins,
        playTime: playTime
      };
      localStorage.setItem('skyDasherProgress', JSON.stringify(progress));
    }
  } catch (e) {
    console.warn('Failed to save progress:', e);
  }
}

function loadProgress() {
  try {
    if (typeof localStorage !== 'undefined') {
      const progress = JSON.parse(localStorage.getItem('skyDasherProgress') || '{}');
      return {
        bestScore: progress.bestScore || 0,
        unlockedLevels: progress.unlockedLevels || 1,
        totalCoins: progress.totalCoins || 0,
        playTime: progress.playTime || 0
      };
    }
  } catch (e) {
    console.warn('Failed to load progress:', e);
  }
  return {
    bestScore: 0,
    unlockedLevels: 1,
    totalCoins: 0,
    playTime: 0
  };
}

function loadSettings() {
  try {
    if (typeof localStorage !== 'undefined') {
      const settings = JSON.parse(localStorage.getItem('skyDasherSettings') || '{}');
      soundEnabled = settings.soundEnabled !== false; // default true
      difficulty = settings.difficulty || 'normal'; // default normal
    }
  } catch (e) {
    console.warn('Failed to load settings:', e);
    // Keep defaults
  }
  // Only update DOM elements if they exist (for settings screen)
  const soundEl = document.getElementById('sound-enabled');
  const diffEl = document.getElementById('difficulty');
  if (soundEl) soundEl.checked = soundEnabled;
  if (diffEl) diffEl.value = difficulty;
}

function saveSettings() {
  try {
    const soundEl = document.getElementById('sound-enabled');
    const diffEl = document.getElementById('difficulty');
    if (soundEl) soundEnabled = soundEl.checked;
    if (diffEl) difficulty = diffEl.value;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skyDasherSettings', JSON.stringify({
        soundEnabled,
        difficulty
      }));
    }
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
}

// Audio functions
function playSound(frequency, duration, type = 'square') {
  if (!soundEnabled) return;
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Audio not supported or blocked
  }
}

function playJumpSound() { playSound(400, 0.1, 'square'); }
function playCoinSound() { playSound(800, 0.15, 'sine'); }
function playPowerupSound() { playSound(600, 0.2, 'triangle'); }
function playDeathSound() { playSound(200, 0.3, 'sawtooth'); }

function initStars() {
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * (H * 0.7), r: Math.random() * 1.5, twinkle: Math.random() * Math.PI * 2 });
  }
  clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({ x: Math.random() * W * 2, y: 40 + Math.random() * 180, w: 80 + Math.random() * 120, h: 30 + Math.random() * 30, speed: 0.15 + Math.random() * 0.2 });
  }
}

function startGame() {
  try {
    loadSettings();
  } catch (e) {
    console.warn('Failed to load settings:', e);
    // Use defaults
    soundEnabled = true;
    difficulty = 'normal';
  }
  const progress = loadProgress();
  bestScore = progress.bestScore;

  if (startScreen) startScreen.classList.add('hidden');
  if (pauseScreen) pauseScreen.classList.add('hidden');
  if (gameoverScreen) gameoverScreen.classList.add('hidden');
  if (hud) hud.classList.remove('hidden');

  // Apply difficulty settings
  let startLives = 3;
  switch (difficulty) {
    case 'easy': startLives = 5; break;
    case 'hard': startLives = 2; break;
  }

  score = 0; lives = startLives; level = 1; cameraX = 0; frameCount = 0;
  scrollSpeed = 2.5; spawnTimer = 0;
  invincible = false; invincibleTimer = 0;
  combo = 0; comboTimer = 0;
  dashCooldown = 0; isDashing = false;

  player = createPlayer();

  platforms = [createGround()];
  let px = 300;
  for (let i = 0; i < 12; i++) {
    const plat = spawnPlatform(px);
    platforms.push(plat);
    px += 160 + Math.random() * 120;
  }

  coins = [];
  enemies = [];
  particles = [];
  powerups = [];
  playerPowerups = {
    speedBoost: false,
    speedBoostTimer: 0,
    extraJump: false,
    extraJumpTimer: 0,
    shield: false,
    shieldTimer: 0,
    magnet: false,
    magnetTimer: 0
  };

  platforms.slice(1).forEach(p => {
    if (Math.random() < 0.6) {
      for (let c = 0; c < Math.floor(Math.random() * 3) + 1; c++) {
        coins.push(spawnCoin(p.x + c * 22 + 10, p.y - 22));
      }
    }
    if (Math.random() < 0.35 && p.w > 80) {
      const enemyTypes = Object.values(ENEMY_TYPES);
      const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push(spawnEnemy(p.x, p.y, p.w, enemyType));
    }
    if (Math.random() < 0.15) {
      powerups.push(spawnPowerup(p.x + p.w / 2, p.y));
    }
  });

  initStars();
  initKeys();

  gameRunning = true;
  gamePaused = false;
  updateHUD();

  if (animFrame) cancelAnimationFrame(animFrame);
  loop();
}

function togglePause() {
  gamePaused = !gamePaused;
  if (pauseScreen) {
    if (gamePaused) pauseScreen.classList.remove('hidden');
    else { pauseScreen.classList.add('hidden'); loop(); }
  }
}
function resumeGame() { togglePause(); }

function gameOver() {
  gameRunning = false;
  saveProgress();
  if (hud) hud.classList.add('hidden');
  if (score > bestScore) {
    bestScore = score;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('skyDasherBest', bestScore);
    }
  }
  if (finalScore) finalScore.textContent = `SCORE: ${score}`;
  if (bestScoreEl) bestScoreEl.textContent = `BEST: ${bestScore}`;
  if (gameoverScreen) gameoverScreen.classList.remove('hidden');
}

function updateHUD() {
  if (scoreDisplay) scoreDisplay.textContent = score;
  if (livesDisplay) livesDisplay.textContent = lives;
  if (levelDisplay) levelDisplay.textContent = level;

  // Update combo display
  if (combo > 1) {
    if (comboDisplay) comboDisplay.textContent = combo;
    if (comboEl) comboEl.classList.remove('hidden');
  } else {
    if (comboEl) comboEl.classList.add('hidden');
  }

  // Update powerup icons
  if (powerupIcons.speed) {
    if (playerPowerups.speedBoost) powerupIcons.speed.classList.remove('hidden'); else powerupIcons.speed.classList.add('hidden');
  }
  if (powerupIcons.jump) {
    if (playerPowerups.extraJump) powerupIcons.jump.classList.remove('hidden'); else powerupIcons.jump.classList.add('hidden');
  }
  if (powerupIcons.shield) {
    if (playerPowerups.shield) powerupIcons.shield.classList.remove('hidden'); else powerupIcons.shield.classList.add('hidden');
  }
  if (powerupIcons.magnet) {
    if (playerPowerups.magnet) powerupIcons.magnet.classList.remove('hidden'); else powerupIcons.magnet.classList.add('hidden');
  }
}

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y;
}

function update() {
  frameCount++;

  scrollSpeed = 2.5 + Math.floor(score / 300) * 0.4;
  const newLevel = 1 + Math.floor(score / 500);
  if (newLevel !== level) {
    level = newLevel;
    updateTheme();
  }

  cameraX += scrollSpeed;

  // Preliminary wall detection for wall jumping (before movement)
  let onWall = false;
  let wallDirection = 0;
  const pRect = { x: player.x, y: player.y, w: player.w, h: player.h };

  for (const plat of platforms) {
    if (!rectOverlap(pRect, plat)) continue;
    const overlapX = Math.min(pRect.x + pRect.w, plat.x + plat.w) - Math.max(pRect.x, plat.x);
    const overlapY = Math.min(pRect.y + pRect.h, plat.y + plat.h) - Math.max(pRect.y, plat.y);

    if (overlapX < overlapY && Math.abs(player.vx) > 0) {
      // Wall detected
      wallDirection = player.x < plat.x ? -1 : 1;
      onWall = true;
      break; // Just detect, don't resolve yet
    }
  }

  const currentSpeed = playerPowerups.speedBoost ? PLAYER_SPEED * 1.8 : PLAYER_SPEED;
  if (keys.left) { player.vx = -currentSpeed; player.facing = -1; }
  else if (keys.right) { player.vx = currentSpeed; player.facing = 1; }
  else player.vx *= 0.8;

  const maxJumps = playerPowerups.extraJump ? 3 : 2;
  if (keys.jump && player.jumpsLeft > 0) {
    if (onWall && !player.onGround) {
      // Wall jump
      player.vy = JUMP_FORCE * 0.9;
      player.vx = -wallDirection * currentSpeed * 0.8; // Bounce away from wall
      player.facing = -wallDirection;
      player.jumpsLeft--;
      playJumpSound();
      burst(player.x + player.w / 2, player.y + player.h, 5, COLORS.platformTop);
    } else {
      // Normal jump
      player.vy = JUMP_FORCE + (player.jumpsLeft === maxJumps ? 1.5 : 0);
      player.jumpsLeft--;
      playJumpSound();
      burst(player.x + player.w / 2, player.y + player.h, 5, COLORS.platformTop);
    }
    player.scaleX = 0.7; player.scaleY = 1.3;
    keys.jump = false;
  }

  // Dash logic
  if (keys.dash && dashCooldown <= 0 && !isDashing) {
    isDashing = true;
    dashCooldown = 180; // 3 seconds cooldown at 60fps
    const dashSpeed = player.facing * PLAYER_SPEED * 2.5;
    player.vx = dashSpeed;
    player.vy = Math.min(player.vy, -2); // Slight upward boost
    burst(player.x + player.w / 2, player.y + player.h / 2, 8, COLORS.star);
    // Invincible during dash
    invincible = true;
    invincibleTimer = 30; // 0.5 seconds
  }

  if (isDashing) {
    // Dash lasts for a short time
    if (Math.abs(player.vx) < PLAYER_SPEED * 0.5) {
      isDashing = false;
    }
  }

  if (dashCooldown > 0) dashCooldown--;

  // Reset player scale over time
  player.scaleX += (1 - player.scaleX) * 0.15;
  player.scaleY += (1 - player.scaleY) * 0.15;

  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  if (player.x < cameraX + 40) {
    player.x = cameraX + 40;
    player.vx = 0;
  }
  if (player.x > cameraX + W * 0.65) {
    player.x = cameraX + W * 0.65;
    player.vx = 0;
  }

  // Full collision detection and resolution (after movement)
  player.onGround = false;

  for (const plat of platforms) {
    if (!rectOverlap(pRect, plat)) continue;
    const overlapX = Math.min(pRect.x + pRect.w, plat.x + plat.w) - Math.max(pRect.x, plat.x);
    const overlapY = Math.min(pRect.y + pRect.h, plat.y + plat.h) - Math.max(pRect.y, plat.y);

    if (overlapY < overlapX && player.vy >= 0) {
      player.y = plat.y - player.h;
      player.vy = 0;
      player.onGround = true;
      player.jumpsLeft = playerPowerups.extraJump ? 3 : 2;
    } else if (overlapX < overlapY && Math.abs(player.vx) > 0) {
      // Wall collision resolution
      if (player.x < plat.x) {
        player.x = plat.x - player.w;
      } else {
        player.x = plat.x + plat.w;
      }
      player.vx = 0;
      player.jumpsLeft = Math.max(player.jumpsLeft, 1); // Allow wall jump
    }
  }

  if (Math.abs(player.vx) > 0.5 && player.onGround) {
    player.frameTimer++;
    if (player.frameTimer > 8) { player.frame = (player.frame + 1) % 4; player.frameTimer = 0; }
  } else if (!player.onGround) {
    player.frame = 2;
  }

  coins.forEach(c => {
    if (c.collected) return;
    c.bobTimer += 0.05;

    if (playerPowerups.magnet) {
      const dist = Math.sqrt((c.x - player.x) ** 2 + (c.y - player.y) ** 2);
      if (dist < 80) {
        const ang = Math.atan2(player.y - c.y, player.x - c.x);
        c.x += Math.cos(ang) * 3;
        c.y += Math.sin(ang) * 3;
      }
    }

    if (rectOverlap({ x: player.x, y: player.y, w: player.w, h: player.h }, { x: c.x, y: c.y + Math.sin(c.bobTimer) * 4, w: c.w, h: c.h })) {
      c.collected = true;
      score += 10;
      playCoinSound();
      burst(c.x + c.w / 2, c.y + c.h / 2, 6, COLORS.coin);
      updateHUD();
    }
  });

  powerups.forEach(p => {
    if (p.collected) return;
    p.bobTimer += 0.05;
    const pRect = { x: p.x, y: p.y + Math.sin(p.bobTimer) * 4, w: p.w, h: p.h };
    if (rectOverlap({ x: player.x, y: player.y, w: player.w, h: player.h }, pRect)) {
      p.collected = true;
      activatePowerup(p.type);
      playPowerupSound();
      burst(p.x + p.w / 2, p.y + p.h / 2, 8, COLORS.star);
    }
  });

  if (invincible) {
    invincibleTimer--;
    if (invincibleTimer <= 0) invincible = false;
  }

  // Update powerup timers
  Object.keys(playerPowerups).forEach(key => {
    if (key.includes('Timer') && playerPowerups[key] > 0) {
      playerPowerups[key]--;
      if (playerPowerups[key] <= 0) {
        const powerupType = key.replace('Timer', '');
        playerPowerups[powerupType] = false;
      }
    }
  });

  // Update combo timer
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer <= 0) combo = 0;
  }

  enemies.forEach(e => {
    if (!e.alive) return;

    switch (e.type) {
      case ENEMY_TYPES.GROUND:
        e.x += e.vx;
        if (e.x <= e.startX || e.x + e.w >= e.endX) e.vx *= -1;
        e.frameTimer++; if (e.frameTimer > 12) { e.frame = (e.frame + 1) % 2; e.frameTimer = 0; }
        break;
      case ENEMY_TYPES.FLYING:
        e.x += e.vx;
        e.y += e.vy;
        e.vy += Math.sin(frameCount * 0.05 + e.x * 0.01) * 0.02; // Gentle floating
        if (e.x <= e.startX || e.x + e.w >= e.endX) e.vx *= -1;
        e.frameTimer++; if (e.frameTimer > 15) { e.frame = (e.frame + 1) % 2; e.frameTimer = 0; }
        break;
      case ENEMY_TYPES.SPIKE:
        // Stationary, no movement
        break;
    }

    const eRect = { x: e.x, y: e.y, w: e.w, h: e.h };
    if (!invincible && !playerPowerups.shield && rectOverlap(pRect, eRect)) {
      if (e.type === ENEMY_TYPES.SPIKE) {
        die();
        combo = 0;
      } else if (player.vy > 0 && player.y + player.h < e.y + e.h * 0.6) {
        e.alive = false;
        combo++;
        comboTimer = 180; // 3 seconds at 60fps
        score += 50 + combo * 10;
        burst(e.x + e.w / 2, e.y + e.h / 2, 10, COLORS.enemy);
        player.vy = JUMP_FORCE * 0.7;
        updateHUD();
      } else {
        die();
        combo = 0;
      }
    }
  });

  const farthestPlat = platforms.reduce((m, p) => p.isGround ? m : Math.max(m, p.x + p.w), 0);
  if (farthestPlat < cameraX + W + 300) {
    const gap = 140 + Math.random() * 140;
    const newPlat = spawnPlatform(farthestPlat + gap);
    platforms.push(newPlat);
    if (Math.random() < 0.65) {
      const count = Math.floor(Math.random() * 4) + 1;
      for (let c = 0; c < count; c++) coins.push(spawnCoin(newPlat.x + c * 22 + 8, newPlat.y - 22));
    }
    if (Math.random() < 0.3 + level * 0.05 && newPlat.w > 80) {
      const enemyTypes = Object.values(ENEMY_TYPES);
      const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push(spawnEnemy(newPlat.x, newPlat.y, newPlat.w, enemyType));
    }
    if (Math.random() < 0.12) {
      powerups.push(spawnPowerup(newPlat.x + newPlat.w / 2, newPlat.y));
    }
  }

  if (frameCount % 30 === 0) { score += level; updateHUD(); }

  const cullX = cameraX - 200;
  platforms = platforms.filter(p => p.isGround || p.x + p.w > cullX);
  coins = coins.filter(c => c.x > cullX);
  enemies = enemies.filter(e => e.x + e.w > cullX);
  powerups = powerups.filter(p => p.x > cullX);


  particles.forEach(p => {
    p.x += p.vx; p.y += p.vy; p.vy += 0.15;
    p.life -= p.decay;
  });
  particles = particles.filter(p => p.life > 0);

  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x + c.w < 0) c.x = W + 50;
  });
  stars.forEach(s => s.twinkle += 0.03);
}

function die() {
  playDeathSound();
  burst(player.x + player.w / 2, player.y + player.h / 2, 14, COLORS.player);
  lives--;
  updateHUD();
  if (lives <= 0) { gameOver(); return; }
  player.x = cameraX + 100;
  player.y = GROUND_Y - 50;
  player.vx = 0; player.vy = 0;
  player.jumpsLeft = 2;
  invincible = true;
  invincibleTimer = 120;
}

function draw() {
  if (!ctx) return; // Safety check for canvas context

  ctx.clearRect(0, 0, W, H);

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, COLORS.sky1);
  grad.addColorStop(1, COLORS.sky2);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  stars.forEach(s => {
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(s.twinkle));
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });

  clouds.forEach(c => {
    ctx.fillStyle = COLORS.cloud;
    ctx.beginPath();
    ctx.ellipse(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.save();
  ctx.translate(-cameraX, 0);

  const ground = platforms.find(p => p.isGround);
  if (ground) {
    ctx.fillStyle = COLORS.ground;
    ctx.fillRect(cameraX - 50, ground.y, W + 100, H - ground.y);
    ctx.fillStyle = COLORS.groundTop;
    ctx.fillRect(cameraX - 50, ground.y, W + 100, 4);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let bx = Math.floor(cameraX / 40) * 40; bx < cameraX + W; bx += 40) {
      ctx.fillRect(bx, ground.y + 8, 2, 8);
    }
  }

  platforms.filter(p => !p.isGround).forEach(p => {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(p.x + 4, p.y + 8, p.w, p.h);
    ctx.fillStyle = COLORS.platform;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = COLORS.platformTop;
    ctx.fillRect(p.x, p.y, p.w, 4);
    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 1;
    for (let bx = p.x; bx < p.x + p.w; bx += 20) {
      ctx.strokeRect(bx, p.y, 20, p.h);
    }
  });

  coins.forEach(c => {
    if (c.collected) return;
    const cy = c.y + Math.sin(c.bobTimer) * 4;

    const grd = ctx.createRadialGradient(c.x + c.w / 2, cy + c.h / 2, 0, c.x + c.w / 2, cy + c.h / 2, 14);
    grd.addColorStop(0, COLORS.coinGlow);
    grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, cy + c.h / 2, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.ellipse(c.x + c.w / 2, cy + c.h / 2, c.w / 2, c.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(c.x + c.w / 2 - 2, cy + c.h / 2 - 3, 3, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
  });

  powerups.forEach(p => {
    if (p.collected || !p.x || !p.y || !p.w || !p.h || isNaN(p.x) || isNaN(p.y) || isNaN(p.w) || isNaN(p.h)) return;
    const py = p.y + Math.sin(p.bobTimer) * 4;

    // Draw powerup based on type
    let color;
    switch (p.type) {
      case POWERUP_TYPES.SPEED: color = COLORS.accent3; break; // green
      case POWERUP_TYPES.JUMP: color = COLORS.accent; break; // yellow
      case POWERUP_TYPES.SHIELD: color = COLORS.platformTop; break; // cyan
      case POWERUP_TYPES.MAGNET: color = COLORS.enemy; break; // red
    }

    if (!color) return; // Skip if no valid color

    try {
      const grd = ctx.createRadialGradient(p.x + p.w / 2, py + p.h / 2, 0, p.x + p.w / 2, py + p.h / 2, 16);
      grd.addColorStop(0, color + '80');
      grd.addColorStop(1, 'transparent');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, py + p.h / 2, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.fillRect(p.x, py, p.w, p.h);

      // Draw icon based on type
      ctx.fillStyle = '#ffffff';
      switch (p.type) {
        case POWERUP_TYPES.SPEED:
          // Lightning bolt
          ctx.fillRect(p.x + 4, py + 2, 2, 6);
          ctx.fillRect(p.x + 6, py + 4, 2, 4);
          ctx.fillRect(p.x + 8, py + 6, 2, 4);
          break;
        case POWERUP_TYPES.JUMP:
          // Up arrow
          ctx.fillRect(p.x + 6, py + 2, 2, 8);
          ctx.fillRect(p.x + 4, py + 8, 6, 2);
          ctx.fillRect(p.x + 2, py + 6, 2, 2);
          ctx.fillRect(p.x + 10, py + 6, 2, 2);
          break;
        case POWERUP_TYPES.SHIELD:
          // Shield
          ctx.fillRect(p.x + 6, py + 2, 2, 10);
          ctx.fillRect(p.x + 4, py + 4, 6, 2);
          ctx.fillRect(p.x + 2, py + 6, 2, 4);
          ctx.fillRect(p.x + 10, py + 6, 2, 4);
          break;
        case POWERUP_TYPES.MAGNET:
          // Horseshoe magnet
          ctx.fillRect(p.x + 4, py + 2, 6, 2);
          ctx.fillRect(p.x + 2, py + 4, 2, 6);
          ctx.fillRect(p.x + 10, py + 4, 2, 6);
          ctx.fillRect(p.x + 4, py + 10, 6, 2);
          break;
      }
    } catch (e) {
      console.warn('Error drawing powerup:', e);
    }
  });

  enemies.forEach(e => {
    if (!e.alive || !e.x || !e.y || !e.w || !e.h || isNaN(e.x) || isNaN(e.y) || isNaN(e.w) || isNaN(e.h)) return;

    try {
      switch (e.type) {
        case ENEMY_TYPES.GROUND:
          const dir = e.vx > 0 ? 1 : -1;
          ctx.fillStyle = COLORS.enemy;
          ctx.fillRect(e.x, e.y, e.w, e.h);
          const eyeX = dir > 0 ? e.x + e.w - 10 : e.x + 4;
          ctx.fillStyle = COLORS.enemyEye;
          ctx.fillRect(eyeX, e.y + 7, 6, 7);
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(eyeX + 1, e.y + 8, 2, 3);
          ctx.fillStyle = '#cc3333';
          const legOff = e.frame === 0 ? 0 : 4;
          ctx.fillRect(e.x + 4, e.y + e.h, 6, 4 + legOff);
          ctx.fillRect(e.x + e.w - 10, e.y + e.h, 6, 4 + (4 - legOff));
          ctx.fillStyle = '#ff9999';
          ctx.fillRect(e.x + 4, e.y - 6, 4, 6);
          ctx.fillRect(e.x + e.w - 8, e.y - 6, 4, 6);
          break;

        case ENEMY_TYPES.FLYING:
          ctx.fillStyle = '#ff9999'; // Lighter color for flying
          ctx.fillRect(e.x, e.y, e.w, e.h);
          ctx.fillStyle = COLORS.enemyEye;
          ctx.fillRect(e.x + e.w - 8, e.y + 4, 4, 4);
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(e.x + e.w - 7, e.y + 5, 2, 2);
          // Wings
          ctx.fillStyle = '#ffcccc';
          ctx.fillRect(e.x - 2, e.y + 2, 4, e.h - 4);
          ctx.fillRect(e.x + e.w - 2, e.y + 2, 4, e.h - 4);
          break;

        case ENEMY_TYPES.SPIKE:
          ctx.fillStyle = '#666666'; // Dark gray for spikes
          ctx.fillRect(e.x, e.y, e.w, e.h);
          // Spike details
          ctx.fillStyle = '#999999';
          for (let i = 0; i < 3; i++) {
            ctx.fillRect(e.x + 2 + i * 6, e.y + 2, 4, e.h - 4);
          }
          break;
      }
    } catch (e) {
      console.warn('Error drawing enemy:', e);
    }
  });

  drawPlayer();

  particles.forEach(p => {
    if (!p.x || !p.y || !p.r || isNaN(p.x) || isNaN(p.y) || isNaN(p.r)) return;
    try {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } catch (e) {
      console.warn('Error drawing particle:', e);
    }
  });

  ctx.restore();


  const vig = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

function drawPlayer() {
  const px = player.x + player.w / 2;
  const py = player.y + player.h;

  ctx.save();
  ctx.translate(px, py);
  ctx.scale(player.facing * player.scaleX, player.scaleY);


  if (invincible && Math.floor(invincibleTimer / 6) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  const pw = player.w, ph = player.h;

  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 4, pw / 2 - 2, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = COLORS.player;
  ctx.fillRect(-pw / 2, -ph, pw, ph * 0.7);


  ctx.fillStyle = '#ffd700';
  ctx.fillRect(-pw / 2 + 2, -ph - 6, pw - 4, ph * 0.4 + 4);


  ctx.fillStyle = COLORS.playerEye;
  ctx.fillRect(pw / 2 - 11, -ph + 4, 7, 7);

  ctx.fillStyle = '#f7c948';
  ctx.fillRect(pw / 2 - 9, -ph + 6, 2, 2);


  const legOff = player.onGround ? (player.frame % 2 === 0 ? 0 : 4) : 0;
  ctx.fillStyle = '#e0a020';
  ctx.fillRect(-pw / 2 + 2, -ph * 0.3, 10, ph * 0.3 + legOff);
  ctx.fillRect(pw / 2 - 12, -ph * 0.3, 10, ph * 0.3 + (4 - legOff));


  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(-pw / 2 + 2, -ph * 0.55, pw - 4, 6);

  ctx.restore();

  // Draw shield effect
  if (playerPowerups.shield) {
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(player.facing * player.scaleX, player.scaleY);
    ctx.strokeStyle = COLORS.platformTop;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.8 + 0.2 * Math.sin(frameCount * 0.1);
    ctx.beginPath();
    ctx.ellipse(0, -ph / 2, pw / 2 + 6, ph / 2 + 6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function loop() {
  if (!gameRunning || gamePaused) return;
  update();
  draw();
  animFrame = requestAnimationFrame(loop);
}
