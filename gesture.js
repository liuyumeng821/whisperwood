/**
 * WhisperWood - Dynamic Gesture Recognition Module v3.0
 *
 * Three-Layer Recognition System:
 *   Layer 1: Static gestures (finger position rules)
 *   Layer 2: Motion tracking (EMA smoothing + acceleration trigger + direction voting)
 *   Layer 3: Combo sequences (gesture chains within time window)
 *
 * v3.0: Complete rewrite of motion detection for precision
 *   - Exponential Moving Average (EMA) smoothing
 *   - Multi-point fusion tracking (wrist + palm center)
 *   - Acceleration-based start/stop detection
 *   - Direction voting along trajectory segments
 */

// ==================== Landmark Constants ====================
const WRIST = 0;
const THUMB_TIP = 4, THUMB_IP = 3, THUMB_MCP = 2;
const INDEX_MCP = 5, INDEX_PIP = 6, INDEX_TIP = 8;
const MIDDLE_MCP = 9, MIDDLE_PIP = 10, MIDDLE_TIP = 12;
const RING_MCP = 13, RING_PIP = 14, RING_TIP = 16;
const PINKY_MCP = 17, PINKY_PIP = 18, PINKY_TIP = 20;

// ==================== Gesture Definitions ====================
const GESTURE_TYPES = {
    CLOSED_FIST: 'Closed_Fist',
    OPEN_PALM: 'Open_Palm',
    THUMB_UP: 'Thumb_Up',
    VICTORY: 'Victory',
    SWIPE_UP: 'Swipe_Up',
    SWIPE_DOWN: 'Swipe_Down',
    SWIPE_LEFT: 'Swipe_Left',
    SWIPE_RIGHT: 'Swipe_Right',
    CIRCLE: 'Circle',
    BURST_RELEASE: 'Burst_Release',
    SEAL_LOCK: 'Seal_Lock',
    HEAVEN_EARTH: 'Heaven_Earth',
};

// ==================== Utility Functions ====================
function distance(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z || 0) - (b.z || 0)) ** 2);
}

function distance2D(a, b) {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function isFingerExtended(landmarks, tipIdx, pipIdx, mcpIdx) {
    const tip = landmarks[tipIdx];
    const pip = landmarks[pipIdx];
    const mcp = landmarks[mcpIdx];
    return tip.y < pip.y && distance(tip, mcp) > distance(pip, mcp) * 0.9;
}

function isThumbExtended(landmarks) {
    const tip = landmarks[THUMB_TIP];
    const ip = landmarks[THUMB_IP];
    const wrist = landmarks[WRIST];
    return distance(tip, wrist) > distance(ip, wrist) * 1.1;
}

function getFingerStates(landmarks) {
    return {
        thumb: isThumbExtended(landmarks),
        index: isFingerExtended(landmarks, INDEX_TIP, INDEX_PIP, INDEX_MCP),
        middle: isFingerExtended(landmarks, MIDDLE_TIP, MIDDLE_PIP, MIDDLE_MCP),
        ring: isFingerExtended(landmarks, RING_TIP, RING_PIP, RING_MCP),
        pinky: isFingerExtended(landmarks, PINKY_TIP, PINKY_PIP, PINKY_MCP),
    };
}

// ==================== Layer 1: Static Gesture Detection ====================
function detectStaticGesture(landmarks) {
    const fingers = getFingerStates(landmarks);
    const extendedCount = [fingers.index, fingers.middle, fingers.ring, fingers.pinky].filter(Boolean).length;

    if (extendedCount === 0 && !fingers.thumb) return GESTURE_TYPES.CLOSED_FIST;
    if (extendedCount === 4) return GESTURE_TYPES.OPEN_PALM;
    if (fingers.thumb && extendedCount === 0) return GESTURE_TYPES.THUMB_UP;
    if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) return GESTURE_TYPES.VICTORY;

    return '';
}

// ==================== EMA Smoother ====================
class EMASmoother {
    constructor(alpha = 0.4) {
        this.alpha = alpha; // Higher = more responsive, Lower = smoother
        this.value = null;
    }

    update(rawValue) {
        if (this.value === null) {
            this.value = { x: rawValue.x, y: rawValue.y };
        } else {
            this.value.x = this.alpha * rawValue.x + (1 - this.alpha) * this.value.x;
            this.value.y = this.alpha * rawValue.y + (1 - this.alpha) * this.value.y;
        }
        return { x: this.value.x, y: this.value.y };
    }

    reset() {
        this.value = null;
    }
}

// ==================== Layer 2: Motion Tracker v3 ====================
class MotionTracker {
    constructor() {
        // Smoothed position history
        this.positions = [];        // [{x, y, t, vx, vy, speed}, ...]
        this.MAX_POSITIONS = 60;    // Keep more history for circle detection

        // EMA smoother for position
        this.smoother = new EMASmoother(0.35); // More smoothing to reduce jitter-induced false motion

        // Velocity history for acceleration calculation
        this.velocities = [];       // [{speed, angle, t}, ...]
        this.MAX_VELOCITIES = 10;

        // ===== Swipe Parameters (tolerance increased) =====
        this.SWIPE_SPEED_TRIGGER = 0.06;    // Lower trigger to catch slower starts
        this.SWIPE_SPEED_CONFIRM = 0.15;    // Lower confirmation for slower swipes
        this.SWIPE_MIN_DIST = 0.03;         // Smaller displacement accepted
        this.SWIPE_MAX_DURATION = 800;      // Max ms
        this.SWIPE_MIN_DURATION = 50;       // Min ms
        this.SWIPE_DIRECTNESS = 0.45;       // Allow more curved swipe paths
        this.SWIPE_DECEL_RATIO = 0.30;      // Speed must drop to this × peak to end

        // ===== Circle Parameters =====
        this.CIRCLE_MIN_POINTS = 15;
        this.CIRCLE_MIN_AREA = 0.0025;
        this.CIRCLE_MAX_OPEN = 0.20;        // More relaxed closure threshold

        // ===== State Machine =====
        this.state = 'idle'; // idle | triggered | tracking
        this.trackStart = 0; // index where tracking began
        this.peakSpeed = 0;
        this.reachedConfirmSpeed = false;

        // ===== Cooldown =====
        this.cooldownUntil = 0;
        this.COOLDOWN_MS = 350;

        // ===== Raw trail for visualization =====
        this.rawTrail = [];
        this.MAX_TRAIL = 40;
    }

    // Get fused tracking point from multiple landmarks
    getFusedPoint(landmarks) {
        // Fuse: wrist (30%) + middle MCP (40%) + index MCP (30%)
        const w = landmarks[WRIST];
        const m = landmarks[MIDDLE_MCP];
        const idx = landmarks[INDEX_MCP];
        return {
            x: w.x * 0.3 + m.x * 0.4 + idx.x * 0.3,
            y: w.y * 0.3 + m.y * 0.4 + idx.y * 0.3,
        };
    }

    addPoint(landmarks, timestamp) {
        // Get fused raw point
        const raw = this.getFusedPoint(landmarks);

        // Store raw trail for visualization
        this.rawTrail.push({ x: raw.x, y: raw.y, t: timestamp });
        if (this.rawTrail.length > this.MAX_TRAIL) this.rawTrail.shift();

        // Apply EMA smoothing
        const smoothed = this.smoother.update(raw);

        // Calculate velocity from last smoothed position
        let vx = 0, vy = 0, speed = 0;
        if (this.positions.length > 0) {
            const prev = this.positions[this.positions.length - 1];
            const dt = (timestamp - prev.t) / 1000; // seconds
            if (dt > 0 && dt < 0.2) { // Ignore gaps > 200ms
                vx = (smoothed.x - prev.x) / dt;
                vy = (smoothed.y - prev.y) / dt;
                speed = Math.sqrt(vx * vx + vy * vy);
            }
        }

        const point = { x: smoothed.x, y: smoothed.y, t: timestamp, vx, vy, speed };
        this.positions.push(point);
        if (this.positions.length > this.MAX_POSITIONS) {
            this.positions.shift();
            if (this.trackStart > 0) this.trackStart--;
        }

        // Store velocity for acceleration analysis
        if (speed > 0) {
            const angle = Math.atan2(-vy, vx) * (180 / Math.PI);
            this.velocities.push({ speed, angle, t: timestamp });
            if (this.velocities.length > this.MAX_VELOCITIES) this.velocities.shift();
        }
    }

    detect(timestamp) {
        if (timestamp < this.cooldownUntil) return null;
        if (this.positions.length < 4) return null;

        // Try circle detection (doesn't interfere with swipe state)
        const circle = this._detectCircle(timestamp);
        if (circle) {
            this._reset_state(timestamp);
            return circle;
        }

        // Swipe state machine
        return this._detectSwipe(timestamp);
    }

    _detectSwipe(timestamp) {
        const len = this.positions.length;
        const current = this.positions[len - 1];
        const currentSpeed = current.speed;

        switch (this.state) {
            case 'idle': {
                // Trigger: speed exceeds initial threshold
                if (currentSpeed > this.SWIPE_SPEED_TRIGGER) {
                    this.state = 'triggered';
                    this.trackStart = Math.max(0, len - 2);
                    this.peakSpeed = currentSpeed;
                    this.reachedConfirmSpeed = currentSpeed >= this.SWIPE_SPEED_CONFIRM;
                }
                return null;
            }

            case 'triggered': {
                // Wait for speed to reach confirm threshold, or timeout
                this.peakSpeed = Math.max(this.peakSpeed, currentSpeed);
                if (currentSpeed >= this.SWIPE_SPEED_CONFIRM) {
                    this.reachedConfirmSpeed = true;
                    this.state = 'tracking';
                }

                // Check if movement died before reaching confirm speed
                const triggerDuration = current.t - this.positions[this.trackStart].t;
                if (triggerDuration > 300 && !this.reachedConfirmSpeed) {
                    // Gave up — too slow
                    this.state = 'idle';
                    return null;
                }

                // If speed dropped back quickly without reaching confirm
                if (currentSpeed < this.SWIPE_SPEED_TRIGGER * 0.5 && !this.reachedConfirmSpeed) {
                    this.state = 'idle';
                    return null;
                }

                // If already reached confirm, fall through to tracking
                if (!this.reachedConfirmSpeed) return null;
                // else fall through
            }

            case 'tracking': {
                this.peakSpeed = Math.max(this.peakSpeed, currentSpeed);

                const start = this.positions[this.trackStart];
                const duration = current.t - start.t;

                // Too long — abort
                if (duration > this.SWIPE_MAX_DURATION) {
                    this.state = 'idle';
                    return null;
                }

                // Check if swipe ended: speed dropped significantly from peak
                const speedRatio = currentSpeed / this.peakSpeed;
                const hasDecelerated = speedRatio < this.SWIPE_DECEL_RATIO;

                // Also check: has enough time passed for a real swipe?
                const enoughTime = duration >= this.SWIPE_MIN_DURATION;

                if (hasDecelerated && enoughTime) {
                    return this._evaluateSwipe(timestamp);
                }

                return null;
            }
        }
        return null;
    }

    _evaluateSwipe(timestamp) {
        const start = this.positions[this.trackStart];
        const len = this.positions.length;
        const end = this.positions[len - 1];

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const totalDist = Math.sqrt(dx * dx + dy * dy);

        // Check minimum distance
        if (totalDist < this.SWIPE_MIN_DIST) {
            this.state = 'idle';
            return null;
        }

        // Check path directness
        let pathLength = 0;
        for (let i = this.trackStart; i < len - 1; i++) {
            pathLength += distance2D(this.positions[i], this.positions[i + 1]);
        }
        const directness = pathLength > 0 ? totalDist / pathLength : 0;

        if (directness < this.SWIPE_DIRECTNESS) {
            this.state = 'idle';
            return null;
        }

        // ===== Direction Voting =====
        // Instead of just start-to-end, vote on direction of each segment
        const votes = { up: 0, down: 0, left: 0, right: 0 };
        for (let i = this.trackStart; i < len - 1; i++) {
            const segDx = this.positions[i + 1].x - this.positions[i].x;
            const segDy = this.positions[i + 1].y - this.positions[i].y;
            const segDist = Math.sqrt(segDx * segDx + segDy * segDy);
            if (segDist < 0.001) continue;

            // Weight by segment length (longer segments get more vote)
            const segAngle = Math.atan2(-segDy, segDx) * (180 / Math.PI);
            const normAngle = ((segAngle % 360) + 360) % 360;

            if (normAngle >= 45 && normAngle < 135) votes.up += segDist;
            else if (normAngle >= 135 && normAngle < 225) votes.left += segDist;
            else if (normAngle >= 225 && normAngle < 315) votes.down += segDist;
            else votes.right += segDist;
        }

        // Find dominant direction
        const entries = Object.entries(votes);
        entries.sort((a, b) => b[1] - a[1]);
        const dominant = entries[0];
        const secondBest = entries[1];

        // Require dominant to be noticeably stronger than second (>= 1.3x),
        // otherwise discard to avoid wrong direction votes.
        if (dominant[1] < secondBest[1] * 1.3) {
            this._reset_state(timestamp);
            return null;
        }

        this._reset_state(timestamp);

        switch (dominant[0]) {
            case 'up': return GESTURE_TYPES.SWIPE_UP;
            case 'down': return GESTURE_TYPES.SWIPE_DOWN;
            case 'left': return GESTURE_TYPES.SWIPE_LEFT;
            case 'right': return GESTURE_TYPES.SWIPE_RIGHT;
        }
        return null;
    }

    _detectCircle(timestamp) {
        const len = this.positions.length;
        if (len < this.CIRCLE_MIN_POINTS) return null;

        // Check multiple window sizes for robustness
        const windowSizes = [this.CIRCLE_MIN_POINTS, Math.min(25, len), Math.min(40, len)];

        for (const winSize of windowSizes) {
            if (len < winSize) continue;
            const pts = this.positions.slice(-winSize);
            const first = pts[0];
            const last = pts[pts.length - 1];

            // Check closure
            const openDist = distance2D(first, last);
            if (openDist > this.CIRCLE_MAX_OPEN) continue;

            // Shoelace formula
            let area = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                area += pts[i].x * pts[i + 1].y - pts[i + 1].x * pts[i].y;
            }
            area = Math.abs(area) / 2;

            if (area < this.CIRCLE_MIN_AREA) continue;

            // Check path has meaningful length
            let pathLen = 0;
            for (let i = 0; i < pts.length - 1; i++) {
                pathLen += distance2D(pts[i], pts[i + 1]);
            }
            if (pathLen < 0.1) continue;

            // Check average speed during the circle was meaningful
            const duration = last.t - first.t;
            if (duration < 200 || duration > 2200) continue;

            return GESTURE_TYPES.CIRCLE;
        }
        return null;
    }

    _reset_state(timestamp) {
        this.state = 'idle';
        this.peakSpeed = 0;
        this.reachedConfirmSpeed = false;
        this.cooldownUntil = timestamp + this.COOLDOWN_MS;
        this.positions = [];
        this.velocities = [];
        this.smoother.reset();
    }

    reset() {
        this.positions = [];
        this.velocities = [];
        this.rawTrail = [];
        this.state = 'idle';
        this.peakSpeed = 0;
        this.reachedConfirmSpeed = false;
        this.cooldownUntil = 0;
        this.smoother.reset();
    }

    // For visualization — return raw unsmoothed trail with metadata
    getTrailData() {
        return {
            points: this.rawTrail.map(p => ({ x: p.x, y: p.y })),
            state: this.state,
            speed: this.positions.length > 0 ? this.positions[this.positions.length - 1].speed : 0,
            peakSpeed: this.peakSpeed,
        };
    }
}

// ==================== Layer 3: Combo Matcher ====================
class ComboMatcher {
    constructor() {
        this.history = [];
        this.COMBO_WINDOW = 2500;
        this.PATTERNS = [
            { sequence: [GESTURE_TYPES.CLOSED_FIST, GESTURE_TYPES.OPEN_PALM], output: GESTURE_TYPES.BURST_RELEASE },
            { sequence: [GESTURE_TYPES.OPEN_PALM, GESTURE_TYPES.CLOSED_FIST], output: GESTURE_TYPES.SEAL_LOCK },
            { sequence: [GESTURE_TYPES.SWIPE_UP, GESTURE_TYPES.SWIPE_DOWN], output: GESTURE_TYPES.HEAVEN_EARTH },
        ];
        this.lastComboTime = 0;
        this.COMBO_COOLDOWN = 700;
    }

    addGesture(gestureId, timestamp) {
        this.history.push({ id: gestureId, timestamp });
        this.history = this.history.filter(g => timestamp - g.timestamp < this.COMBO_WINDOW);
    }

    checkCombo(timestamp) {
        if (timestamp - this.lastComboTime < this.COMBO_COOLDOWN) return null;
        if (this.history.length < 2) return null;

        for (const pattern of this.PATTERNS) {
            const seqLen = pattern.sequence.length;
            if (this.history.length < seqLen) continue;

            const recent = this.history.slice(-seqLen);
            if (recent[recent.length - 1].timestamp - recent[0].timestamp > this.COMBO_WINDOW) continue;

            const match = pattern.sequence.every((g, i) => recent[i].id === g);
            if (match) {
                this.history = this.history.slice(0, -seqLen);
                this.lastComboTime = timestamp;
                return pattern.output;
            }
        }
        return null;
    }

    reset() {
        this.history = [];
        this.lastComboTime = 0;
    }
}

// ==================== GestureEngine ====================
class GestureEngine {
    constructor() {
        this.stream = null;
        this.video = null;
        this.gestureRecognizer = null;
        this.isRunning = false;
        this.onGesture = null;
        this.onTrailUpdate = null;      // Callback: (trailData) => void
        this.confirmFrames = 0;
        this.lastStaticGesture = '';
        this.CONFIRM_THRESHOLD = 2;
        this.animFrameId = null;
        this.isModelLoaded = false;

        this.motionTracker = new MotionTracker();
        this.comboMatcher = new ComboMatcher();

        this.lastOutputTime = 0;
        this.OUTPUT_COOLDOWN = 300;

        // Suppress static during/after motion
        this.motionSuppressUntil = 0;
        this.MOTION_SUPPRESS_MS = 350;
    }

    async init() {
        const { FilesetResolver, GestureRecognizer } = await import(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/vision_bundle.mjs'
        );

        const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );

        this.gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
                modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
                delegate: 'GPU'
            },
            runningMode: 'VIDEO',
            numHands: 1,
        });

        this.isModelLoaded = true;
        console.log('[GestureEngine v3.0] Model loaded — EMA + acceleration + direction voting');
    }

    async startCamera(videoElement, previewElement) {
        this.video = videoElement;
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
            });
            this.video.srcObject = this.stream;
            await this.video.play();
            if (previewElement) {
                previewElement.srcObject = this.stream;
                previewElement.play();
            }
            return true;
        } catch (err) {
            console.error('[GestureEngine] Camera error:', err);
            return false;
        }
    }

    startRecognition() {
        if (!this.gestureRecognizer || !this.video) return;
        this.isRunning = true;
        this.lastStaticGesture = '';
        this.confirmFrames = 0;
        this.motionTracker.reset();
        this.comboMatcher.reset();
        this._processFrame();
    }

    stopRecognition() {
        this.isRunning = false;
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
            this.animFrameId = null;
        }
    }

    _processFrame() {
        if (!this.isRunning) return;
        if (this.video.readyState >= 2) {
            const now = performance.now();
            const result = this.gestureRecognizer.recognizeForVideo(this.video, now);
            this._handleResult(result, now);
        }
        this.animFrameId = requestAnimationFrame(() => this._processFrame());
    }

    _handleResult(result, timestamp) {
        const { gestures, landmarks } = result;

        if (!landmarks || landmarks.length === 0) {
            if (this.onTrailUpdate) this.onTrailUpdate({ points: [], state: 'idle', speed: 0, peakSpeed: 0 });
            return;
        }

        const handLandmarks = landmarks[0];

        // ---- Layer 2: Feed motion tracker (multi-point fusion inside) ----
        this.motionTracker.addPoint(handLandmarks, timestamp);

        // Send trail data for visualization
        if (this.onTrailUpdate) {
            this.onTrailUpdate(this.motionTracker.getTrailData());
        }

        // Check for motion gesture
        const motionGesture = this.motionTracker.detect(timestamp);
        if (motionGesture && this._canOutput(timestamp)) {
            this._emitGesture(motionGesture, 'motion', timestamp);
            this.motionSuppressUntil = timestamp + this.MOTION_SUPPRESS_MS;
            return;
        }

        // ---- Layer 1: Static gesture (suppressed during/after motion) ----
        if (timestamp < this.motionSuppressUntil) return;
        if (this.motionTracker.state !== 'idle') return; // Don't detect static while tracking motion

        let staticDetected = '';

        if (gestures && gestures.length > 0) {
            const gesture = gestures[0][0];
            if (gesture.categoryName !== 'None' && gesture.score > 0.50) {
                staticDetected = this._mapMediaPipeGesture(gesture.categoryName);
            }
        }

        if (!staticDetected) {
            staticDetected = detectStaticGesture(handLandmarks);
        }

        // Stabilization
        if (staticDetected && staticDetected === this.lastStaticGesture) {
            this.confirmFrames++;
            if (this.confirmFrames >= this.CONFIRM_THRESHOLD) {
                if (this._canOutput(timestamp)) {
                    this._emitGesture(staticDetected, 'static', timestamp);
                }
                this.confirmFrames = 0;
            }
        } else {
            this.lastStaticGesture = staticDetected;
            this.confirmFrames = staticDetected ? 1 : 0;
        }
    }

    _mapMediaPipeGesture(categoryName) {
        const mapping = {
            'Closed_Fist': GESTURE_TYPES.CLOSED_FIST,
            'Open_Palm': GESTURE_TYPES.OPEN_PALM,
            'Thumb_Up': GESTURE_TYPES.THUMB_UP,
            'Victory': GESTURE_TYPES.VICTORY,
        };
        return mapping[categoryName] || '';
    }

    _canOutput(timestamp) {
        return timestamp - this.lastOutputTime >= this.OUTPUT_COOLDOWN;
    }

    _emitGesture(gestureId, type, timestamp) {
        this.lastOutputTime = timestamp;

        // Feed combo matcher
        this.comboMatcher.addGesture(gestureId, timestamp);
        const comboResult = this.comboMatcher.checkCombo(timestamp);

        if (comboResult) {
            console.log(`[Gesture] 🔥 COMBO: ${comboResult}`);
            if (this.onGesture) this.onGesture(comboResult, 'combo');
        } else {
            console.log(`[Gesture] ${type === 'motion' ? '⚡' : '✋'} ${type}: ${gestureId}`);
            if (this.onGesture) this.onGesture(gestureId, type);
        }
    }

    stopCamera() {
        this.stopRecognition();
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
    }
}

window.GestureEngine = GestureEngine;
window.GESTURE_TYPES = GESTURE_TYPES;
export { GestureEngine, GESTURE_TYPES };
