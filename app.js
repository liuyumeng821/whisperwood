/**
 * WhisperWood v5.0 — 盲目迷雾 · Level System
 * Gothic Dark Fairytale · 四关+Boss · Mirror/Counter/Chain
 * gesture.js UNTOUCHED (md5: 94571cbf...)
 */

import { GestureEngine, GESTURE_TYPES } from './gesture.js';
import { sfxSuccess, sfxCombo, sfxMiss, sfxDemonHeartbeat, sfxMirrorActivate, sfxClick, sfxTick, sfxFinalTick, sfxTransition, sfxWhisper, sfxWaveClear, sfxBattleStart, sfxBattleStop, setVolume, getVolume } from './sfx.js';
import { bgmStart, bgmStop, setBgmVolume, getBgmVolume, bgmRetryOnTap } from './bgm.js';
import { createRuleEngine, LEVELS, GESTURE_LIST, MIRROR_MAP, COUNTER_MAP, gestureIdToKey } from './ruleEngine.js';

const $ = id => document.getElementById(id);

// ==================== Game State ====================
const gameState = {
    health: 3,
    maxHealth: 3,
    score: 0,
    currentLevel: 1,
    levelTimeLeft: 0,
    levelTimerInterval: null,
    isActive: false,
    gestureStats: {},
    consecutiveMisses: 0,
    heartbeatInterval: null,
    gestureCooldownUntil: 0,
};

let ruleEngine = null;
let currentLevelConfig = null;
let demonEyeTick = 0;
let demonEyeTimer = null;

function updateDemonEye() {
    const el = $('demon-eye-overlay');
    const img = $('demon-eye-img');
    if (!el || !img) return;
    const show = (demonEyeTick % 10 < 3);
    el.style.display = show ? 'block' : 'none';
    if (show) { img.src = ''; img.src = './demon_eye.webp?v=' + Date.now(); }
}

// ==================== Gesture Stats (6 gestures) ====================
function initGestureStats() {
    const stats = {};
    for (const [key, g] of Object.entries(GESTURE_LIST)) {
        stats[g.id] = { hit: 0, miss: 0, key };
    }
    return stats;
}

// ==================== Engine ====================
const engine = new GestureEngine();
let modelReady = false;

function goToPage(pageName) {
    try {
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const t = $(`page-${pageName}`);
        if (t) { t.classList.add('active'); console.log('[Nav] →', pageName); }
    } catch(e) { console.error('[Nav]', e); }
    if (pageName !== 'landing') { try { sfxTransition(); } catch(e) {} }
}

// ==================== Init (with safety wrappers) ====================
function initLandingSafe() {
    const btn = $('btn-enter-forest');
    if (!btn) return console.warn('[Init] btn-enter-forest not found');
    btn.addEventListener('click', () => { sfxClick(); goToPage('camera'); });
}
function initCameraSafe() {
    const btn = $('btn-allow-camera');
    if (!btn) return console.warn('[Init] btn-allow-camera not found');
    btn.addEventListener('click', async () => {
        sfxClick();
        const success = await engine.startCamera($('webcam'), $('camera-preview'));
        if (success) {
            bgmStart();
            const pv = $('camera-preview'); if (pv) pv.style.opacity = '1';
            const icon = $('camera-hand-icon'); if (icon) icon.style.display = 'none';
            if (!modelReady) engine.init().then(() => { modelReady = true; });
            setTimeout(() => { goToPage('level-select'); }, 2000);
        } else { alert('无法访问摄像头，请检查权限设置'); }
    });
}
function initWhisperSafe() {
    const btn = $('btn-retry');
    if (!btn) return console.warn('[Init] btn-retry not found');
    btn.addEventListener('click', () => {
        sfxClick(); stopHeartbeat();
        const won = gameState.score >= (currentLevelConfig?.targetScore || 9999);
        if (won && gameState.currentLevel < 5) {
            gameState.currentLevel++;
            goToPage('level-select');
            updateLevelInfo(gameState.currentLevel);
            const sel = $('level-selector'); if (sel) sel.value = gameState.currentLevel;
        } else if (won && gameState.currentLevel >= 5) {
            goToPage('result'); showResult();
        } else {
            goToPage('countdown'); startCountdown();
        }
    });
}
function initResultSafe() {
    const rp = $('btn-replay'); const lv = $('btn-leave');
    if (rp) rp.addEventListener('click', () => { sfxClick(); bgmStart(); goToPage('countdown'); startCountdown(); });
    if (lv) lv.addEventListener('click', () => { sfxClick(); bgmStop(); goToPage('landing'); });
}
function initSoundToggleSafe() {
    const sBtn = $('btn-sfx-toggle'); const bBtn = $('btn-bgm-toggle');
    if (sBtn) { sBtn.addEventListener('click', (e) => { e.stopPropagation(); sfxOn = !sfxOn; setVolume(sfxOn ? 0.7 : 0); sBtn.querySelector('.material-symbols-outlined').textContent = sfxOn ? 'volume_up' : 'volume_off'; }); }
    if (bBtn) { bBtn.addEventListener('click', (e) => { e.stopPropagation(); bgmOn = !bgmOn; setBgmVolume(bgmOn ? 0.3 : 0); bBtn.querySelector('.material-symbols-outlined').textContent = bgmOn ? 'music_note' : 'music_off'; if (bgmOn) bgmStart(); }); }
}
function initLevelSelectSafe() {
    const btn = $('btn-start-level'); const sel = $('level-selector');
    if (btn) btn.addEventListener('click', () => { sfxClick(); gameState.currentLevel = parseInt(sel?.value || 1); goToPage('countdown'); startCountdown(); });
    if (sel) sel.addEventListener('change', () => { updateLevelInfo(parseInt(sel.value)); });
    updateLevelInfo(1);
}
function initParticles() {
    const container = $('particles-container');
    for (let i = 0; i < 25; i++) {
        const p = document.createElement('div');
        p.classList.add('ash-particle');
        const size = Math.random() * 3 + 1;
        p.style.width = `${size}px`; p.style.height = `${size}px`;
        p.style.left = `${Math.random() * 100}%`;
        p.style.animationDuration = `${Math.random() * 6 + 6}s`;
        p.style.animationDelay = `${Math.random() * 6}s`;
        if (Math.random() > 0.6) p.style.backgroundColor = 'rgba(255, 179, 181, 0.4)';
        container.appendChild(p);
    }
}

// ==================== Magic Trail System ====================
let trailCanvas = null, trailCtx = null;
let magicParticles = [], burstParticles = [], runeGlyphs = [], trailHistory = [];
const RUNE_CHARS = ['⚶', '᛭', '✦', '⟡', '◈', '⬡', '✧', '⊛', '⟐', '◆'];

function initTrailCanvas() {
    trailCanvas = $('motion-trail-canvas');
    if (trailCanvas) { trailCtx = trailCanvas.getContext('2d'); resizeTrailCanvas(); window.addEventListener('resize', resizeTrailCanvas); }
    startTrailAnim();
}
function resizeTrailCanvas() { if (!trailCanvas) return; trailCanvas.width = trailCanvas.parentElement.clientWidth; trailCanvas.height = trailCanvas.parentElement.clientHeight; }

function getTrailColor(state, speed) { if (state === 'tracking') return {r:255,g:200,b:100}; if (speed > 0.15) return {r:153,g:240,b:252}; return {r:142,g:229,b:240}; }

function drawTrail(trailData) {
    if (!trailCtx || !trailCanvas) return;
    const { points, state, speed } = trailData;
    if (points.length < 2) return;
    const w = trailCanvas.width, h = trailCanvas.height;
    const color = getTrailColor(state, speed);
    trailHistory = points.map(p => ({ x: (1 - p.x) * w, y: p.y * h }));
    if (points.length > 2 && speed > 0.03) {
        const last = points[points.length - 1];
        const px = (1 - last.x) * w, py = last.y * h;
        for (let i = 0; i < Math.min(3, Math.floor(speed * 15)); i++) spawnMagicParticle(px, py, color, speed);
        if (speed > 0.1 && Math.random() > 0.5) spawnMagicParticle(px, py, {r:255,g:179,b:181}, speed * 0.7);
        if (speed > 0.12 && Math.random() > 0.85) spawnRuneGlyph(px, py, color);
    }
}

let trailAnimRunning = false;
function animateTrail() {
    if (!trailAnimRunning) return;
    if (!trailCtx || !trailCanvas) { requestAnimationFrame(animateTrail); return; }
    trailCtx.clearRect(0, 0, trailCanvas.width, trailCanvas.height);
    drawInkRibbon();
    updateMagicParticles(); drawMagicParticles();
    updateRuneGlyphs(); drawRuneGlyphs();
    updateBurstParticles(); drawBurstParticles();
    requestAnimationFrame(animateTrail);
}
function startTrailAnim() { if (!trailAnimRunning) { trailAnimRunning = true; requestAnimationFrame(animateTrail); } }
function stopTrailAnim() { trailAnimRunning = false; }

function drawInkRibbon() {
    if (trailHistory.length < 3) return;
    const pts = trailHistory, len = pts.length;
    trailCtx.save(); trailCtx.lineCap = 'round'; trailCtx.lineJoin = 'round';
    for (let pass = 0; pass < 3; pass++) {
        const [pa, pw] = [[0.12,10],[0.07,20],[0.04,30]][pass];
        for (let i = 1; i < len; i += 2 + pass) {
            const t = i / len, pt = pts[i], prev = pts[Math.max(0, i - 2)];
            trailCtx.beginPath(); trailCtx.moveTo(prev.x, prev.y); trailCtx.lineTo(pt.x, pt.y);
            trailCtx.strokeStyle = `rgba(142,229,240,${t * pa})`; trailCtx.lineWidth = 3 + t * pw; trailCtx.stroke();
        }
    }
    for (let i = 1; i < len; i++) {
        const t = i / len, pt = pts[i], prev = pts[i - 1];
        const dx = pt.x - prev.x, dy = pt.y - prev.y;
        const thick = Math.max(0.3, 1 - Math.sqrt(dx * dx + dy * dy) * 0.02);
        const cw = (1.5 + t * 4) * thick;
        trailCtx.beginPath(); trailCtx.moveTo(prev.x, prev.y); trailCtx.lineTo(pt.x, pt.y);
        trailCtx.strokeStyle = `rgba(142,229,240,${t * 0.85})`; trailCtx.lineWidth = cw; trailCtx.stroke();
        if (t > 0.5) { trailCtx.beginPath(); trailCtx.moveTo(prev.x, prev.y); trailCtx.lineTo(pt.x, pt.y); trailCtx.strokeStyle = `rgba(255,255,255,${(t - 0.5) * 0.6})`; trailCtx.lineWidth = cw * 0.3; trailCtx.stroke(); }
    }
    if (len > 0) {
        const h = pts[len - 1];
        trailCtx.beginPath(); trailCtx.arc(h.x, h.y, 16, 0, Math.PI * 2); trailCtx.strokeStyle = 'rgba(142,229,240,0.06)'; trailCtx.lineWidth = 8; trailCtx.stroke();
        trailCtx.beginPath(); trailCtx.arc(h.x, h.y, 10, 0, Math.PI * 2); trailCtx.strokeStyle = 'rgba(142,229,240,0.12)'; trailCtx.lineWidth = 4; trailCtx.stroke();
        trailCtx.beginPath(); trailCtx.arc(h.x, h.y, 7, 0, Math.PI * 2); trailCtx.strokeStyle = 'rgba(142,229,240,0.3)'; trailCtx.lineWidth = 2; trailCtx.stroke();
        trailCtx.beginPath(); trailCtx.arc(h.x, h.y, 4, 0, Math.PI * 2); trailCtx.fillStyle = 'rgba(142,229,240,0.8)'; trailCtx.fill();
        trailCtx.beginPath(); trailCtx.arc(h.x, h.y, 2, 0, Math.PI * 2); trailCtx.fillStyle = 'rgba(255,255,255,0.9)'; trailCtx.fill();
    }
    trailCtx.restore();
}

function spawnMagicParticle(x, y, color, speed) {
    const a = Math.random()*Math.PI*2, v = 0.5+Math.random()*2+speed*3;
    magicParticles.push({ x, y, vx: Math.cos(a)*v, vy: Math.sin(a)*v, life:1, decay:0.015+Math.random()*0.02, size:1+Math.random()*3, color, type: Math.random()>0.7?'star':'circle' });
    if (magicParticles.length > 60) magicParticles.shift();
}
function updateMagicParticles() { for (let i=magicParticles.length-1;i>=0;i--) { const p=magicParticles[i]; p.x+=p.vx; p.y+=p.vy; p.vx*=0.97; p.vy*=0.97; p.vy+=0.02; p.life-=p.decay; if(p.life<=0) magicParticles.splice(i,1); } }
function drawMagicParticles() {
    if (!trailCtx) return; trailCtx.save(); trailCtx.shadowBlur = 0;
    for (const p of magicParticles) {
        const a=p.life*0.8, s=p.size*p.life; trailCtx.globalAlpha=a;
        if (p.type==='star') { trailCtx.beginPath(); trailCtx.fillStyle=`rgba(${p.color.r},${p.color.g},${p.color.b},${a})`; trailCtx.moveTo(p.x,p.y-s); trailCtx.lineTo(p.x+s*0.3,p.y-s*0.3); trailCtx.lineTo(p.x+s,p.y); trailCtx.lineTo(p.x+s*0.3,p.y+s*0.3); trailCtx.lineTo(p.x,p.y+s); trailCtx.lineTo(p.x-s*0.3,p.y+s*0.3); trailCtx.lineTo(p.x-s,p.y); trailCtx.lineTo(p.x-s*0.3,p.y-s*0.3); trailCtx.closePath(); trailCtx.fill(); }
        else { trailCtx.beginPath(); trailCtx.arc(p.x,p.y,s,0,Math.PI*2); trailCtx.fillStyle=`rgba(${p.color.r},${p.color.g},${p.color.b},${a})`; trailCtx.fill(); }
    }
    trailCtx.restore();
}

function spawnRuneGlyph(x, y, color) {
    runeGlyphs.push({ x:x+(Math.random()-0.5)*30, y:y+(Math.random()-0.5)*30, char:RUNE_CHARS[Math.floor(Math.random()*RUNE_CHARS.length)], life:1, decay:0.01+Math.random()*0.01, size:10+Math.random()*8, rotation:Math.random()*Math.PI*2, rotSpeed:(Math.random()-0.5)*0.05, vy:-0.3-Math.random()*0.5, color });
    if (runeGlyphs.length > 15) runeGlyphs.shift();
}
function updateRuneGlyphs() { for (let i=runeGlyphs.length-1;i>=0;i--) { const r=runeGlyphs[i]; r.y+=r.vy; r.rotation+=r.rotSpeed; r.life-=r.decay; if(r.life<=0) runeGlyphs.splice(i,1); } }
function drawRuneGlyphs() {
    if (!trailCtx) return; trailCtx.save(); trailCtx.shadowBlur = 0;
    for (const r of runeGlyphs) { const a=r.life*0.7; trailCtx.globalAlpha=a; trailCtx.font=`${r.size*r.life}px serif`; trailCtx.textAlign='center'; trailCtx.textBaseline='middle'; trailCtx.fillStyle=`rgba(${r.color.r},${r.color.g},${r.color.b},${a})`; trailCtx.save(); trailCtx.translate(r.x,r.y); trailCtx.rotate(r.rotation); trailCtx.fillText(r.char,0,0); trailCtx.restore(); }
    trailCtx.restore();
}

function spawnBurst(x, y, color, count) {
    for (let i=0;i<count;i++) { const a=(Math.PI*2/count)*i+Math.random()*0.4, s=3+Math.random()*6; burstParticles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,decay:0.015+Math.random()*0.015,size:2+Math.random()*4,color,trail:[]}); }
    for (let i=0;i<3;i++) spawnRuneGlyph(x,y,color);
}
function updateBurstParticles() { for (let i=burstParticles.length-1;i>=0;i--) { const p=burstParticles[i]; p.trail.push({x:p.x,y:p.y}); if(p.trail.length>6)p.trail.shift(); p.x+=p.vx; p.y+=p.vy; p.vx*=0.94; p.vy*=0.94; p.life-=p.decay; if(p.life<=0)burstParticles.splice(i,1); } }
function drawBurstParticles() {
    if (!trailCtx) return; trailCtx.save();
    for (const p of burstParticles) { const a=p.life; if (p.trail.length>1) { for (let i=1;i<p.trail.length;i++) { const t=i/p.trail.length; trailCtx.beginPath(); trailCtx.moveTo(p.trail[i-1].x,p.trail[i-1].y); trailCtx.lineTo(p.trail[i].x,p.trail[i].y); trailCtx.strokeStyle=`rgba(${p.color.r},${p.color.g},${p.color.b},${t*a*0.4})`; trailCtx.lineWidth=p.size*p.life*t*0.5; trailCtx.stroke(); } }
    trailCtx.beginPath(); trailCtx.arc(p.x,p.y,p.size*p.life,0,Math.PI*2); trailCtx.fillStyle=`rgba(${p.color.r},${p.color.g},${p.color.b},${a})`; trailCtx.fill(); }
    trailCtx.restore();
}

function triggerTrailBurst() {
    if (!trailCanvas) return;
    const w=trailCanvas.width, h=trailCanvas.height;
    const td = engine.motionTracker ? engine.motionTracker.getTrailData() : null;
    if (td && td.points.length > 0) { const l=td.points[td.points.length-1]; const x=(1-l.x)*w, y=l.y*h; spawnBurst(x,y,{r:153,g:240,b:252},25); spawnBurst(x,y,{r:255,g:179,b:181},12); }
}

// ==================== Full-screen FX ====================
function triggerSuccessFX() {
    const el = $('fx-success'); if (!el) return;
    el.classList.remove('fade-out'); el.classList.add('active');
    setTimeout(() => { el.classList.add('fade-out'); setTimeout(() => el.classList.remove('active', 'fade-out'), 400); }, 700);
}
function triggerFailureFX() {
    const el = $('fx-failure'), main = $('battle-main'); if (!el) return;
    el.classList.remove('fade-out'); el.classList.add('active');
    if (main) { main.classList.remove('demon-distort'); void main.offsetWidth; main.classList.add('demon-distort'); }
    setTimeout(() => {
        el.classList.add('fade-out'); setTimeout(() => el.classList.remove('active', 'fade-out'), 500);
        if (main) setTimeout(() => main.classList.remove('demon-distort'), 600);
    }, 900);
}

// ==================== BLIND MIST ====================
function setBlindMist(active) {
    const main = $('battle-main');
    if (!main) return;
    if (active) main.classList.add('blind-mist');
    else main.classList.remove('blind-mist');
}

// ==================== Camera Mirror ====================
function setupCameraMirror() {
    const mv = $('battle-camera-feed');
    if (mv && engine.stream) { mv.srcObject = engine.stream; mv.play().catch(()=>{}); }
}

// ==================== Init wrappers (see safe versions above L54-106) ====================


// ==================== Level Info (used by safe init) ====================

function updateLevelInfo(levelId) {
    const lv = LEVELS[levelId - 1];
    $('level-name').textContent = `第${lv.id}关 · ${lv.name}`;
    $('level-tagline').textContent = lv.tagline;
    $('level-target').textContent = lv.targetScore;
    $('level-safe').textContent = `${lv.bossSafe/1000}s`;
    $('level-watch').textContent = `${lv.bossWatch/1000}s`;
    $('level-time').textContent = `${lv.timeLimit}s`;
    $('level-score').textContent = lv.baseScore;
    const mechs = [];
    if (lv.mirror) mechs.push('🪞 镜像');
    if (lv.counter) mechs.push('💭 复现克制');
    if (lv.chainPenalty) mechs.push('⛓️ 连锁惩罚');
    $('level-mechanics').textContent = mechs.length > 0 ? mechs.join(' · ') : '基础跟做';
}

// ==================== Countdown ====================
function startCountdown() {
    let count = 3; $('countdown-number').textContent = count; sfxTick();
    const iv = setInterval(() => { count--; if (count > 0) { $('countdown-number').textContent = count; sfxTick(); } else { clearInterval(iv); sfxFinalTick(); goToPage('battle'); startBattle(); } }, 1000);
}

// ==================== Battle (v5.0 Level System) ====================
function startBattle() {
    currentLevelConfig = LEVELS[gameState.currentLevel - 1];
    ruleEngine = createRuleEngine(currentLevelConfig);

    gameState.health = 3;
    gameState.score = 0;
    gameState.isActive = true;
    gameState.consecutiveMisses = 0;
    gameState.levelTimeLeft = currentLevelConfig.timeLimit;
    gameState.gestureStats = initGestureStats();
    stopHeartbeat();

    // Wire rule engine to boss state → blind mist
    ruleEngine.setOnBossStateChange((state, prompt) => {
        if (state === 'watching') {
            setBlindMist(true);
            $('battle-gesture-svg').innerHTML = '';
            $('battle-gesture-name').textContent = '请复现上一个';
            $('battle-gesture-hint').textContent = '迷雾中……';
            $('curse-name').textContent = '凝视压制';
        } else {
            setBlindMist(false);
            if (prompt) updateGestureDisplay(prompt);
        }
    });

    // === Demon Eye: 每10s出现3s，第0-2s可见，第3-9s隐藏 ===
    demonEyeTick = 0;
    $('demon-eye-overlay').style.display = 'none';
    demonEyeTimer = setInterval(() => {
        demonEyeTick++;
        updateDemonEye();
    }, 1000);

    // Start level timer
    clearInterval(gameState.levelTimerInterval);
    gameState.levelTimerInterval = setInterval(() => {
        gameState.levelTimeLeft--;
        updateLevelTimerUI();
        if (gameState.levelTimeLeft <= 0) {
            clearInterval(gameState.levelTimerInterval);
            endBattle(false);
        }
    }, 1000);

    initTrailCanvas();
    setupCameraMirror();
    updateBattleUI();
    updateLevelTimerUI();
    $('level-indicator').textContent = `第${currentLevelConfig.id}关 · ${currentLevelConfig.name}`;

    engine.onGesture = handleBattleGesture;
    engine.onTrailUpdate = drawTrail;
    engine.startRecognition();

    // Start boss cycle
    ruleEngine.startBossCycle();
}

function updateGestureDisplay(prompt) {
    const gInfo = GESTURE_LIST[prompt.displayedGesture];
    if (!gInfo) return;
    $('battle-gesture-svg').innerHTML = gInfo.svg;
    $('battle-gesture-name').textContent = gInfo.name;
    $('battle-gesture-hint').textContent = gInfo.hint;
    $('curse-name').textContent = prompt.hint || gInfo.curse;

    const ti = $('gesture-type-indicator');
    if (ti) {
        if (currentLevelConfig.mirror) {
            ti.textContent = '🪞 镜像';
            ti.className = 'font-body text-[11px] px-2 py-0.5 rounded border border-secondary/50 text-secondary bg-secondary/10 animate-pulse';
        } else if (gInfo.type === 'static') {
            ti.textContent = '✋ 静态';
            ti.className = 'font-body text-[11px] px-2 py-0.5 rounded border border-primary/30 text-primary/70 bg-primary/5';
        } else {
            ti.textContent = '⚡ 动态';
            ti.className = 'font-body text-[11px] px-2 py-0.5 rounded border border-secondary/30 text-secondary/70 bg-secondary/5 animate-pulse';
        }
    }
}

function updateLevelTimerUI() {
    const pct = Math.max(0, (gameState.levelTimeLeft / currentLevelConfig.timeLimit) * 100);
    $('level-timer-bar').style.width = `${pct}%`;
    $('level-timer-text').textContent = `${gameState.levelTimeLeft}s`;
    if (gameState.levelTimeLeft <= 15) {
        $('level-timer-bar').classList.add('bg-error');
        $('level-timer-bar').classList.remove('bg-primary');
    } else {
        $('level-timer-bar').classList.remove('bg-error');
        $('level-timer-bar').classList.add('bg-primary');
    }
}

function handleBattleGesture(gesture, type) {
    if (!gameState.isActive || !ruleEngine) return;
    if (Date.now() < gameState.gestureCooldownUntil) return;

    // Demon eye: 每10s的前3s（tick%10<3）禁止动作
    if (demonEyeTick % 10 < 3) {
        handleMiss();
        return;
    }

    const bossState = ruleEngine.getBossState();
    const grace = ruleEngine.getWatchingGrace();
    if (bossState === 'watching') {
        // Early grace period: player was mid-gesture when boss blinked → ignore
        if (grace) { gameState.consecutiveMisses = 0; stopHeartbeat(); return; }
        // After grace, any movement = failure
        handleMiss();
        return;
    }

    const gk = gestureIdToKey(gesture);
    if (!gk) return;

    const result = ruleEngine.validate(gk);
    if (result.valid) {
        handleHit(result);
    } else {
        handleMiss();
    }
}

function handleHit(result) {
    gameState.consecutiveMisses = 0;
    stopHeartbeat();

    const main = $('battle-main');
    if (main) main.classList.remove('miss-streak-2', 'miss-streak-3');

    gameState.score += result.score;

    // Track gesture stats
    const prompt = ruleEngine.getCurrentPrompt();
    if (prompt && prompt.expectedGesture) {
        const gl = GESTURE_LIST[prompt.expectedGesture];
        if (gl && gameState.gestureStats[gl.id]) gameState.gestureStats[gl.id].hit++;
    }

    const ce = $('combo-counter');
    ce.textContent = `+${result.score}`;
    ce.classList.remove('combo-pop'); void ce.offsetWidth; ce.classList.add('combo-pop');

    triggerTrailBurst();
    triggerSuccessFX();
    sfxSuccess();
    gameState.gestureCooldownUntil = Date.now() + 1800;

    if (result.multiplier < 1) {
        // Chain penalty active — show warning color
        ce.classList.add('text-secondary');
    } else {
        ce.classList.remove('text-secondary');
    }

    updateBattleUI();

    // 命中后换手势
    if (ruleEngine) {
        const nextPrompt = ruleEngine.generatePrompt();
        if (nextPrompt) updateGestureDisplay(nextPrompt);
    }

    // Check level complete
    if (result.levelComplete) {
        gameState.isActive = false;
        engine.stopRecognition();
        stopTrailAnim();
        ruleEngine.stopBossCycle();
        setBlindMist(false);
        clearInterval(gameState.levelTimerInterval);
        sfxWaveClear();
        endBattle(true);
        return;
    }
}

function handleMiss() {
    gameState.consecutiveMisses++;
    sfxMiss();
    escalateHeartbeat();

    // Track stats
    const prompt = ruleEngine.getCurrentPrompt();
    if (prompt && prompt.expectedGesture) {
        const gl = GESTURE_LIST[prompt.expectedGesture];
        if (gl && gameState.gestureStats[gl.id]) gameState.gestureStats[gl.id].miss++;
    }

    const main = $('battle-main'), flash = $('hit-flash');
    main.classList.remove('miss-streak-2', 'miss-streak-3', 'screen-shake');
    if (gameState.consecutiveMisses >= 3) main.classList.add('miss-streak-3');
    else if (gameState.consecutiveMisses >= 2) main.classList.add('miss-streak-2');
    void main.offsetWidth;
    main.classList.add('screen-shake');
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 150);
    setTimeout(() => main.classList.remove('screen-shake'), 400);

    updateBattleUI();
    gameState.gestureCooldownUntil = Date.now() + 1000;

}

function endBattle(won) {
    gameState.isActive = false;
    engine.stopRecognition();
    stopTrailAnim();
    ruleEngine.stopBossCycle();
    setBlindMist(false);
    clearInterval(demonEyeTimer);
    $('demon-eye-overlay').style.display = 'none';
    clearInterval(gameState.levelTimerInterval);

    if (won) {
        // Level completed
        if (gameState.currentLevel < 5) {
            $('whisper-text').innerHTML = `第${currentLevelConfig.id}关<br/>诅咒已破`;
            $('whisper-insight').textContent = currentLevelConfig.tagline;
        } else {
            $('whisper-text').innerHTML = '所有诅咒<br/>尽归尘土';
            $('whisper-insight').textContent = '暗黑之主的低语终于沉默了。';
        }
    } else {
        $('whisper-text').innerHTML = '时间耗尽了……<br/>迷雾吞没了一切';
        $('whisper-insight').textContent = '你没能在这片森林的注视下完成封印。';
    }
    goToPage('whisper');
}

// ==================== Heartbeat Escalation ====================
function escalateHeartbeat() {
    const level = gameState.consecutiveMisses;
    clearInterval(gameState.heartbeatInterval);
    const interval = level === 1 ? 1200 : level === 2 ? 800 : 500;
    const main = $('battle-main');

    gameState.heartbeatInterval = setInterval(() => {
        if (!gameState.isActive) { stopHeartbeat(); return; }
        sfxDemonHeartbeat(level >= 2);
        if (main) { main.classList.add('heartbeat-pulse'); setTimeout(() => main.classList.remove('heartbeat-pulse'), 150); }
    }, interval);
}

function stopHeartbeat() { clearInterval(gameState.heartbeatInterval); gameState.heartbeatInterval = null; }

function updateBattleUI() {
    const re = $('health-roses'); re.innerHTML = '';
    for (let i = 0; i < gameState.maxHealth; i++) {
        const s = document.createElement('span');
        s.className = 'material-symbols-outlined text-xl ' + (i < gameState.health ? 'text-secondary drop-shadow-[0_0_6px_rgba(255,179,181,0.6)] heartbeat' : 'text-outline-variant/30');
        s.style.fontVariationSettings = i < gameState.health ? "'FILL' 1" : "'FILL' 0";
        s.textContent = 'local_florist';
        re.appendChild(s);
    }
    $('combo-counter').textContent = `${gameState.score}`;
    $('erosion-bar').style.width = `${Math.min(100, (gameState.score / currentLevelConfig.targetScore) * 100)}%`;
    $('erosion-percent').textContent = `${Math.round(Math.min(100, (gameState.score / currentLevelConfig.targetScore) * 100))}%`;
}


// ==================== Sound State ====================
let sfxOn = true, bgmOn = true;

// ==================== Init ====================
function init() {
    console.log('[Init] WhisperWood starting...');
    initParticles();
    initLandingSafe();
    initCameraSafe();
    initWhisperSafe();
    initResultSafe();
    initSoundToggleSafe();
    initLevelSelectSafe();
    try { bgmRetryOnTap(); } catch(e) { console.warn('[Init] BGM retry failed', e); }
    goToPage('landing');
    console.log('[Init] Ready'); window.__appReady = true;
}
setTimeout(init, 100);
