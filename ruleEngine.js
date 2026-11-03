/**
 * WhisperWood v5.1 — Rule Engine
 * 盲目迷雾 · 6 Gestures (3 static + 3 motion) · Mirror · Counter · Chain
 * gesture.js 完全不改
 */

// ====== 6 Gesture Definitions ======
// Three static (high accuracy) + Three motion (high variety)
// gesture.js Layer 1 (static) + Layer 2 (motion) → all mapped
export const GESTURE_LIST = {
    // === Static (Layer 1 — MediaPipe finger rules) ===
    fist: {
        id: 'Closed_Fist',
        name: '封印术',
        hint: '握紧手掌',
        type: 'static',
        curse: '枯骨荆棘',
        svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><path d="M40 20 Q50 10 60 20 Q70 30 65 50 Q75 45 80 55 Q85 65 75 80 Q60 90 40 85 Q20 80 25 60 Q20 40 40 20" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/><circle cx="42" cy="52" r="5" stroke-width="1.5" opacity="0.5"/><path d="M42 52 L42 58" stroke-width="1.5" opacity="0.4"/></svg>`
    },
    palm: {
        id: 'Open_Palm',
        name: '驱散术',
        hint: '张开手掌',
        type: 'static',
        curse: '女巫的黑雾',
        svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><path d="M50 85 L50 50 M50 50 L35 20 M50 50 L45 18 M50 50 L55 18 M50 50 L65 20 M30 50 L20 35" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"/><circle cx="50" cy="60" r="12" stroke-width="1.5" opacity="0.4" stroke-dasharray="3 3"/></svg>`
    },
    thumb: {
        id: 'Thumb_Up',
        name: '守护',
        hint: '竖起拇指',
        type: 'static',
        curse: '碎颅之锤',
        svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><path d="M50 80 L50 45 L45 20 Q50 10 55 20 L55 45" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"/><path d="M40 55 Q35 60 35 65 Q35 75 45 78 L55 78 Q65 75 65 65 Q65 60 60 55" stroke-linecap="round" stroke-width="2"/><path d="M40 60 L60 60 M40 67 L60 67" stroke-width="1.5" opacity="0.5"/></svg>`
    },
    // === Motion (Layer 2 — EMA + acceleration + direction voting) ===
    circle: {
        id: 'Circle',
        name: '结界术',
        hint: '画一个圆',
        type: 'motion',
        curse: '骸骨之环',
        svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="28" stroke-width="2.5" stroke-dasharray="6 4" opacity="0.7"/><circle cx="50" cy="50" r="18" stroke-width="1.5" opacity="0.4"/><circle cx="50" cy="50" r="5" stroke-width="2" opacity="0.8" fill="rgba(142,229,240,0.15)"/></svg>`
    },
    swipe_l: {
        id: 'Swipe_Left',
        name: '裂痕术',
        hint: '向左边挥',
        type: 'motion',
        curse: '影子猎犬',
        svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><path d="M80 50 L25 50" stroke-width="3" stroke-linecap="round"/><path d="M40 35 L20 50 L40 65" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="25" cy="50" r="4" stroke-width="1.5" opacity="0.6"/></svg>`
    },
    swipe_u: {
        id: 'Swipe_Up',
        name: '升腾术',
        hint: '向上挥起',
        type: 'motion',
        curse: '坠落的乌鸦群',
        svg: `<svg class="stroke-primary fill-transparent drop-shadow-[0_0_12px_rgba(142,229,240,0.8)]" height="100" width="100" viewBox="0 0 100 100"><path d="M50 80 L50 25" stroke-width="3" stroke-linecap="round"/><path d="M35 40 L50 20 L65 40" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="50" cy="85" r="4" stroke-width="2" opacity="0.4"/></svg>`
    },
};

// Speed lookup: gesture.js GESTURE_TYPES constant → our key
export function gestureIdToKey(id) {
    for (const [k, v] of Object.entries(GESTURE_LIST)) {
        if (v.id === id) return k;
    }
    return null;
}

// ====== Mirror map (6-cycle pairing) ======
export const MIRROR_MAP = {
    fist: 'palm',
    palm: 'fist',
    thumb: 'circle',
    circle: 'thumb',
    swipe_l: 'swipe_u',
    swipe_u: 'swipe_l',
};

// ====== Counter map (6-cycle rotation) ======
export const COUNTER_MAP = {
    fist: 'circle',
    circle: 'swipe_l',
    swipe_l: 'palm',
    palm: 'thumb',
    thumb: 'swipe_u',
    swipe_u: 'fist',
};

// ====== Level Config ======
export const LEVELS = [
    {
        id: 1,
        name: '迷雾初现',
        tagline: 'Boss的眼睛是迷雾之源',
        targetScore: 200,
        bossSafe: 7000,   // 安全时间 7s
        bossWatch: 3000,  // 恶魔睁眼 3s（10s/轮）
        timeLimit: 65,
        baseScore: 30,
        mirror: false,
        counter: false,
        chainPenalty: false,
    },
    {
        id: 2,
        name: '镜像迷途',
        tagline: '镜渊结界混入了迷雾',
        targetScore: 300,
        bossSafe: 7000,
        bossWatch: 3000,
        timeLimit: 60,
        baseScore: 30,
        mirror: true,
        counter: false,
        chainPenalty: false,
    },
    {
        id: 3,
        name: '残响追踪',
        tagline: 'Boss在迷雾中感知你的魔力残余',
        targetScore: 400,
        bossSafe: 7000,
        bossWatch: 3000,
        timeLimit: 55,
        baseScore: 35,
        mirror: false,
        counter: true,
        chainPenalty: false,
    },
    {
        id: 4,
        name: '衰减领域',
        tagline: '每次失败都在向Boss暴露你的频率',
        targetScore: 500,
        bossSafe: 7000,
        bossWatch: 3000,
        timeLimit: 50,
        baseScore: 40,
        mirror: false,
        counter: false,
        chainPenalty: true,
    },
    {
        id: 5,
        name: '全境压制',
        tagline: '四重诅咒同时降临',
        targetScore: 600,
        bossSafe: 7000,
        bossWatch: 3000,
        timeLimit: 45,
        baseScore: 50,
        mirror: true,
        counter: true,
        chainPenalty: true,
    },
];

const CHAIN_MULTIPLIER = [1.0, 0.7, 0.4];

// ====== Rule Engine Factory ======
export function createRuleEngine(levelConfig) {
    let failStreak = 0;
    let lastSuccessGesture = null;
    let lastExpectedGesture = null;
    let bossState = 'safe'; // 'safe' | 'watching'
    let bossTimerInterval = null;
    let targetScore = 0;
    let currentPrompt = null;
    let watchingGraceUntil = 0; // Grace period after boss blinks

    // Boss timer callbacks
    let onBossStateChange = null;
    let onTimeUpdate = null;

    // Random gesture pick (excluding the given gesture)
    function randomGesture(exclude) {
        const gestures = Object.keys(GESTURE_LIST);
        let pool = gestures;
        if (exclude) {
            pool = gestures.filter(g => g !== exclude);
            if (pool.length === 0) pool = gestures; // fallback if only 1 option
        }
        return pool[Math.floor(Math.random() * pool.length)];
    }

    function generatePrompt() {
        let actualTarget;

        if (levelConfig.counter && lastSuccessGesture) {
            actualTarget = COUNTER_MAP[lastSuccessGesture];
        } else {
            actualTarget = randomGesture(lastExpectedGesture);
        }

        lastExpectedGesture = actualTarget;

        let displayedGesture;
        let hint = null;

        if (levelConfig.mirror) {
            displayedGesture = Object.keys(MIRROR_MAP).find(k => MIRROR_MAP[k] === actualTarget);
            hint = '镜像';
        } else {
            displayedGesture = actualTarget;
        }

        if (levelConfig.counter && lastSuccessGesture) {
            const lastName = GESTURE_LIST[lastSuccessGesture]?.name || lastSuccessGesture;
            hint = (hint ? hint + ' · ' : '') + `残响:${lastName}→克它`;
        }

        currentPrompt = {
            displayedGesture,
            expectedGesture: actualTarget,
            hint,
            timestamp: Date.now(),
        };
        return currentPrompt;
    }

    function validate(gesture) {
        if (!gesture || !currentPrompt) {
            failStreak = Math.min(failStreak + 1, 2);
            return { valid: false, reason: 'no_gesture' };
        }

        if (gesture !== currentPrompt.expectedGesture) {
            failStreak = Math.min(failStreak + 1, 2);
            return { valid: false, reason: 'wrong' };
        }

        // Success
        const multiplier = levelConfig.chainPenalty
            ? CHAIN_MULTIPLIER[Math.min(failStreak, 2)]
            : 1.0;
        const score = Math.round(levelConfig.baseScore * multiplier);

        lastSuccessGesture = gesture;
        failStreak = 0;
        targetScore += score;

        return {
            valid: true,
            score,
            multiplier,
            targetScore,
            levelComplete: targetScore >= levelConfig.targetScore,
        };
    }

    // ===== Boss state machine =====
    function tickBoss() {
        if (bossState === 'safe') {
            bossState = 'watching';
            watchingGraceUntil = Date.now() + 600; // 600ms grace: ignore mid-gesture
            if (onBossStateChange) onBossStateChange('watching');
        } else {
            bossState = 'safe';
            // 迷雾归位：不换手势，重复上一个动作
            if (onBossStateChange) onBossStateChange('safe', currentPrompt);
        }

        const nextDelay = bossState === 'watching' ? levelConfig.bossWatch : levelConfig.bossSafe;
        bossTimerInterval = setTimeout(tickBoss, nextDelay);
    }

    function getWatchingGrace() {
        if (bossState !== 'watching') return false;
        return Date.now() < watchingGraceUntil;
    }

    function startBossCycle() {
        bossState = 'safe';
        generatePrompt();
        if (onBossStateChange) onBossStateChange('safe', currentPrompt);
        bossTimerInterval = setTimeout(tickBoss, levelConfig.bossSafe);
    }

    function stopBossCycle() {
        clearTimeout(bossTimerInterval);
        bossTimerInterval = null;
    }

    function getBossState() { return bossState; }
    function getFailStreak() { return failStreak; }
    function getLastSuccess() { return lastSuccessGesture; }
    function getCurrentPrompt() { return currentPrompt; }
    function getTargetScore() { return targetScore; }

    return {
        generatePrompt,
        validate,
        startBossCycle,
        stopBossCycle,
        getBossState,
        getFailStreak,
        getLastSuccess,
        getCurrentPrompt,
        getTargetScore,
        getWatchingGrace,
        setOnBossStateChange(fn) { onBossStateChange = fn; },
        setOnTimeUpdate(fn) { onTimeUpdate = fn; },
        reset() {
            failStreak = 0;
            lastSuccessGesture = null;
            lastExpectedGesture = null;
            targetScore = 0;
            currentPrompt = null;
            bossState = 'safe';
            watchingGraceUntil = 0;
        },
    };
}
