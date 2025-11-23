
/**
 * ArcaneFX.js - Ultimate Anime VFX Library
 * Version: 5.0.0 (Ultimates, Cinema Mode, Sequencing)
 */

// ============================================================================
// 🧱 SEQUENCE COMMANDS
// ============================================================================
export const SEQUENCE_COMMANDS = {
        // [COMMAND, duration_ms, effect_name, x, y, options]
        VFX: 'VFX',
        // [COMMAND, duration_ms, color, htmlFx ('shake'|'blur'|'none')]
        IMPACT_FRAME: 'IMPACT_FRAME',
        // [COMMAND, duration_ms]
        WAIT: 'WAIT',
        // [COMMAND, duration_ms, selector, color]
        SHADOW: 'SHADOW'
};

// ============================================================================
// 🧠 CORE ENGINE
// ============================================================================

export class ArcaneFX {
        constructor() {
                this.effects = new Map();
                this.activeGlobalEffects = new Map();
                this.activeSequences = [];
                this.animations = new Map();
                this._animationLoopRunning = false;

                // Global DOM Elements
                this.canvas = null;
                this.ctx = null;
                this.overlay = null;
                this.shadows = null; // NEW: Layer for HTML shadows

                this.viewport = { width: window.innerWidth, height: window.innerHeight };
                this.dpr = window.devicePixelRatio || 1;

                this.init();
                this.registerEffects();
        }

        // --- INITIALIZATION ---
        init() {
                // Cleanup existing layers
                document.querySelectorAll('.arcanefx-layer').forEach(el => el.remove());

                // 1. Impact Frame Overlay (Max Z-Index for full-screen coverage)
                this.overlay = document.createElement('div');
                this.overlay.className = 'arcanefx-layer arcanefx-overlay';
                Object.assign(this.overlay.style, {
                        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                        pointerEvents: 'none', zIndex: '2147483640',
                        backgroundColor: 'transparent', transition: 'background-color 0.05s'
                });
                document.body.appendChild(this.overlay);

                // 2. HTML Shadow Layer (Below overlay, above page content)
                this.shadows = document.createElement('div');
                this.shadows.className = 'arcanefx-layer arcanefx-shadows';
                Object.assign(this.shadows.style, {
                        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                        pointerEvents: 'none', zIndex: '2147483639'
                });
                document.body.appendChild(this.shadows);


                // 3. Global Canvas (Max Z-Index + 1)
                this.canvas = document.createElement('canvas');
                this.canvas.className = 'arcanefx-layer arcanefx-canvas';
                Object.assign(this.canvas.style, {
                        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                        pointerEvents: 'none', zIndex: '2147483647'
                });
                this.ctx = this.canvas.getContext('2d');
                document.body.appendChild(this.canvas);

                this.updateCanvasSize();
                window.addEventListener('resize', () => this.updateCanvasSize());

                this._injectCSS();
                this._loop();
        }

        updateCanvasSize() {
                this.dpr = window.devicePixelRatio || 1;
                this.viewport = { width: window.innerWidth, height: window.innerHeight };
                this.canvas.width = this.viewport.width * this.dpr;
                this.canvas.height = this.viewport.height * this.dpr;
                this.ctx.scale(this.dpr, this.dpr);
        }

        _injectCSS() {
                if (document.getElementById('arcanefx-style')) return;
                const style = document.createElement('style');
                style.id = 'arcanefx-style';
                style.innerHTML = `
            @keyframes arcanefx-shake {
                0% { transform: translate(1px, 1px); } 10% { transform: translate(-1px, -2px); }
                20% { transform: translate(-3px, 0px); } 30% { transform: translate(3px, 2px); }
                40% { transform: translate(1px, -1px); } 50% { transform: translate(-1px, 2px); }
                60% { transform: translate(-3px, 1px); } 100% { transform: translate(0, 0); }
            }
        `;
                document.head.appendChild(style);
        }

        // --- HTMLAnimation Support ---
        _startAnimationLoop() {
                if (this._animationLoopRunning) return;
                this._animationLoopRunning = true;

                const loop = () => {
                        if (this.animations.size === 0) {
                                this._animationLoopRunning = false;
                                return;
                        }

                        this.animations.forEach((anim, id) => {
                                anim.update();
                                if (anim.completed) {
                                        this.animations.delete(id);
                                }
                        });

                        if (this._animationLoopRunning) {
                                requestAnimationFrame(loop);
                        }
                };
                requestAnimationFrame(loop);
        }

        toPixels(value) {
                if (typeof value === 'number') return value;
                if (typeof value === 'string') {
                        if (value.endsWith('px')) return parseFloat(value);
                        if (value.endsWith('%')) return (parseFloat(value) / 100) * this.viewport.width;
                }
                return parseFloat(value) || 0;
        }

        animateHTML(element, options) {
                const animation = new HTMLAnimation(element, options, this);
                animation.start();
                return animation;
        }
        // --- END HTMLAnimation Support ---

        // --- GLOBAL UTILITIES ---

        applyHtmlFx(type, duration_ms) {
                const body = document.body;
                body.style.transition = 'filter 0s, transform 0s, opacity 0s';

                switch (type) {
                        case 'blur':
                                body.style.filter = 'blur(5px)';
                                break;
                        case 'shake':
                                body.style.animation = 'arcanefx-shake 0.1s cubic-bezier(.36,.07,.19,.97) both';
                                break;
                        case 'zoom':
                                body.style.transform = 'scale(1.02)';
                                break;
                }

                setTimeout(() => {
                        body.style.filter = '';
                        body.style.animation = '';
                        body.style.transform = '';
                        body.style.transition = '';
                }, duration_ms);
        }

        setOverlay(color) {
                this.overlay.style.backgroundColor = color;
        }

        // NEW: HTML Shadow Clones
        createShadows(selector, color, duration_ms) {
                const shadowContainer = this.shadows;
                const clones = [];

                document.querySelectorAll(selector).forEach(original => {
                        const rect = original.getBoundingClientRect();
                        // Skip elements that are off-screen or too small
                        if (rect.width === 0 || rect.height === 0) return;

                        // 1. Create a clone with minimal structure
                        const clone = document.createElement('div');

                        // 2. Copy relevant styles for shape and position
                        const computedStyle = window.getComputedStyle(original);

                        Object.assign(clone.style, {
                                position: 'absolute',
                                top: `${rect.top}px`,
                                left: `${rect.left}px`,
                                width: `${rect.width}px`,
                                height: `${rect.height}px`,
                                margin: '0',
                                boxSizing: 'border-box',
                                pointerEvents: 'none',
                                // Copy shape properties
                                borderRadius: computedStyle.borderRadius,
                                transform: computedStyle.transform === 'none' ? '' : computedStyle.transform,
                                // Solid color fill (the "shadow")
                                backgroundColor: color,
                                // Add a glow/filter effect for better visibility
                                filter: `drop-shadow(0 0 5px ${color})`,
                                overflow: 'hidden',
                                transition: 'opacity 0.1s linear'
                        });

                        shadowContainer.appendChild(clone);
                        clones.push(clone);
                });

                // 3. Cleanup after duration
                setTimeout(() => {
                        clones.forEach(clone => {
                                clone.style.opacity = '0';
                                // Wait for opacity transition before removing
                                setTimeout(() => clone.remove(), 100);
                        });
                }, duration_ms);
        }

        // --- SPAWNING (THE HYBRID) ---

        spawn(name, targetOrX, y, options = {}) {
                let targetElement = null;
                let x = '50%', yCoord = '50%', opts = options;

                if (targetOrX instanceof HTMLElement) {
                        targetElement = targetOrX;
                        opts = y || {};
                        return this._spawnLocal(name, targetElement, opts);
                } else if (typeof targetOrX === 'string' || typeof targetOrX === 'number') {
                        x = targetOrX;
                        yCoord = y || '50%';
                        opts = options;
                        return this._spawnGlobal(name, x, yCoord, opts);
                }

                return this._spawnGlobal(name, x, yCoord, options);
        }

        _spawnGlobal(name, x, y, opts = {}) {
                const generator = this.effects.get(name);
                if (!generator) return console.warn(`Effect '${name}' not found.`);

                const parse = (v, max) => (typeof v === 'string' && v.includes('%')) ? (parseFloat(v) / 100) * max : parseFloat(v) || max / 2;

                const parsedX = parse(x, this.viewport.width);
                const parsedY = parse(y, this.viewport.height);

                const instance = new EffectInstance(this.ctx, this.viewport.width, this.viewport.height, null, parsedX, parsedY, opts);
                generator(instance);
                this.activeGlobalEffects.set(instance.id, instance);
                return instance;
        }

        _spawnLocal(name, element, opts = {}) {
                const generator = this.effects.get(name);
                if (!generator) return console.warn(`Effect '${name}' not found.`);

                const container = document.createElement('div');
                Object.assign(container.style, {
                        position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
                        pointerEvents: 'none', overflow: 'hidden', zIndex: '10',
                        borderRadius: window.getComputedStyle(element).borderRadius
                });
                if (window.getComputedStyle(element).position === 'static') element.style.position = 'relative';
                element.appendChild(container);

                const canvas = document.createElement('canvas');
                canvas.width = element.offsetWidth;
                canvas.height = element.offsetHeight;
                Object.assign(canvas.style, { width: '100%', height: '100%' });
                container.appendChild(canvas);

                const ctx = canvas.getContext('2d');
                // FIX: Set local origin to (0, 0) for correct particle positioning relative to top-left of element
                const instance = new EffectInstance(ctx, canvas.width, canvas.height, container, 0, 0, opts);

                generator(instance);
                instance.startLocalLoop();

                return instance;
        }

        // --- SEQUENCING ---

        runSequence(sequence, x = '50%', y = '50%') {
                const runner = new SequenceRunner(this, sequence, x, y);
                this.activeSequences.push(runner);
                runner.execute().then(() => {
                        this.activeSequences = this.activeSequences.filter(r => r !== runner);
                });
        }

        _loop() {
                const animate = () => {
                        this.ctx.clearRect(0, 0, this.viewport.width, this.viewport.height);
                        this.ctx.globalCompositeOperation = 'lighter';

                        this.activeGlobalEffects.forEach((eff, id) => {
                                const active = eff.update();
                                if (active) eff.render(this.ctx);
                                else this.activeGlobalEffects.delete(id);
                        });

                        this.ctx.globalCompositeOperation = 'source-over';
                        requestAnimationFrame(animate);
                };
                animate();
        }

        // --- EFFECT DEFINITIONS ---
        registerEffects() {

                // ============================ 🔥 FIRE ELEMENT ============================
                this.effects.set('fire_engulf', (fx) => {
                        fx.addCSS(`box-shadow: inset 0 -10px 20px rgba(255, 69, 0, 0.5);`, 1000);
                        fx.emitter = () => { fx.spawn({ x: Math.random() * fx.w, y: fx.h, vx: (Math.random() - 0.5) * 2, vy: -2 - Math.random() * 3, size: 6 + Math.random() * 8, color: '#ff4500', life: 40, shrink: true, type: 'circle' }); };
                });
                this.effects.set('fire_burst', (fx) => {
                        fx.flash('#ffaa00', 50);
                        for (let i = 0; i < 40; i++) { const a = Math.random() * 6.28; const s = 2 + Math.random() * 6; fx.spawn({ x: fx.w / 2, y: fx.h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 5, color: '#ffcc00', life: 30, shrink: true }); }
                });
                this.effects.set('fire_spiral', (fx) => {
                        let angle = 0; fx.emitter = () => { angle += 0.4; const radius = fx.w / 3; fx.spawn({ x: fx.w / 2 + Math.cos(angle) * radius, y: fx.h / 2 + Math.sin(angle) * radius, vx: 0, vy: -1, size: 8, color: '#ff0000', life: 25, shrink: true }); };
                });

                // ============================ 💧 WATER ELEMENT ============================
                this.effects.set('water_bubble', (fx) => {
                        fx.addCSS(`background: linear-gradient(0deg, rgba(0,200,255,0.2) 0%, transparent 100%);`, 1000);
                        // Coordinates now correctly use fx.w/fx.h because the instance origin is (0,0)
                        fx.emitter = () => { if (Math.random() > 0.3) return; fx.spawn({ x: Math.random() * fx.w, y: fx.h, vx: (Math.random() - 0.5) * 0.5, vy: -1 - Math.random(), size: 3 + Math.random() * 5, color: 'rgba(100,200,255,0.6)', life: 100, type: 'stroke' }); };
                });
                this.effects.set('water_splash', (fx) => {
                        for (let i = 0; i < 25; i++) { fx.spawn({ x: fx.w / 2, y: fx.h / 2, vx: (Math.random() - 0.5) * 10, vy: -3 - Math.random() * 5, size: 4, color: '#00ffff', life: 50, gravity: 0.4 }); }
                });
                this.effects.set('water_vortex', (fx) => {
                        for (let i = 0; i < 30; i++) { const a = Math.random() * 6.28; const dist = Math.random() * (fx.w / 2); fx.spawn({ x: fx.w / 2 + Math.cos(a) * dist, y: fx.h / 2 + Math.sin(a) * dist, vx: -Math.sin(a) * 4, vy: Math.cos(a) * 4, size: 3, color: '#0088ff', life: 40, shrink: true }); }
                });

                // ============================ 🍃 WIND ELEMENT ============================
                this.effects.set('wind_gust', (fx) => {
                        fx.emitter = () => { fx.spawn({ x: -20, y: Math.random() * fx.h, vx: 15 + Math.random() * 10, vy: 0, size: 2, color: 'rgba(255,255,255,0.8)', life: 30, type: 'line', length: 60 }); };
                });
                this.effects.set('wind_swirl', (fx) => {
                        fx.emitter = () => { const x = Math.random() * fx.w; const y = Math.random() * fx.h; fx.spawn({ x: x, y: y, vx: (fx.w / 2 - x) * 0.1, vy: (fx.h / 2 - y) * 0.1 - 2, size: 2, color: '#ccffcc', life: 40 }); };
                });
                this.effects.set('wind_cutter', (fx) => {
                        fx.spawn({ x: 0, y: fx.h / 2, vx: 10, vy: 0, size: 3, color: '#fff', life: 30, type: 'line', length: 150 });
                        for (let i = 0; i < 10; i++) { fx.spawn({ x: i * (fx.w / 10), y: fx.h - i * (fx.h / 10), vx: 1 + Math.random() * 2, vy: -1 - Math.random(), size: 2, color: '#fff', life: 40 }); }
                });

                // ============================ 🪨 EARTH ELEMENT ============================
                this.effects.set('earth_crumble', (fx) => {
                        fx.emitter = () => { fx.spawn({ x: Math.random() * fx.w, y: 0, vx: 0, vy: 2 + Math.random() * 4, size: 5 + Math.random() * 5, color: '#5d4037', life: 60, type: 'square' }); };
                });
                this.effects.set('earth_spike', (fx) => {
                        for (let i = 0; i < 5; i++) { fx.spawn({ x: fx.w * (0.2 + i * 0.15), y: fx.h, vx: 0, vy: -5 - Math.random() * 3, size: 15, color: '#3e2723', life: 40, type: 'triangle', gravity: 0.1 }); }
                        fx.addCSS(`border-bottom: 5px solid #3e2723;`, 320);
                });
                this.effects.set('earth_shield', (fx) => {
                        fx.addCSS(`border: 4px solid #795548; background: #3e2723; transform: scale(1.05); transition: transform 0.1s;`, 1000);
                });

                // ============================ ⚔️ ANIME COMBAT ============================
                this.effects.set('anime_cut', (fx) => {
                        fx.flash('rgba(255,255,255,0.8)', 50);
                        fx.spawn({ x: 0, y: fx.h / 2, vx: 25, vy: 0, size: 4, color: '#fff', life: 10, type: 'line', length: fx.w * 1.5 });
                });
                this.effects.set('hit_impact', (fx) => {
                        fx.addCSS('filter: invert(1);', 64);
                        for (let i = 0; i < 15; i++) { const a = Math.random() * 6.28; const s = 5 + Math.random() * 10; fx.spawn({ x: fx.w / 2, y: fx.h / 2, vx: Math.cos(a) * s, vy: Math.sin(a) * s, size: 2, color: '#ffff00', life: 20, type: 'line', length: 10 }); }
                        fx.spawn({ x: fx.w / 2, y: fx.h / 2, size: 5, color: '#fff', life: 15, growth: 10, type: 'stroke' });
                });
                this.effects.set('flash_step', (fx) => {
                        fx.addCSS('opacity: 0.5; transform: translateX(10px); filter: blur(2px);', 160);
                        for (let i = 0; i < 10; i++) { fx.spawn({ x: Math.random() * fx.w, y: Math.random() * fx.h, vx: 10, vy: 0, size: 1, color: '#fff', life: 20, type: 'line', length: 40 }); }
                });

                // NEW: Dedicated White Impact Effect for Blackout Sequence
                this.effects.set('impact_flash_white', (fx) => {
                        for (let i = 0; i < 50; i++) {
                                const angle = Math.random() * 6.28;
                                const speed = 4 + Math.random() * 8;
                                fx.spawn({
                                        x: fx.w / 2, y: fx.h / 2,
                                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
                                        size: 8, color: '#ffffff',
                                        life: 25, shrink: true
                                });
                        }
                        fx.spawn({
                                x: fx.w / 2, y: fx.h / 2,
                                size: 10, color: '#ffffff',
                                life: 15, growth: 15, type: 'stroke',
                                lineWidth: 5
                        });
                });
        }
}

// ============================================================================
// 🎬 SEQUENCE RUNNER (FIXED ARGUMENT PARSING)
// ============================================================================

class SequenceRunner {
        constructor(engine, sequence, targetX, targetY) {
                this.engine = engine;
                this.sequence = sequence;
                this.targetX = targetX;
                this.targetY = targetY;

                // Resolve global coordinates now
                this.resolvedX = this.engine.viewport.width * 0.5;
                this.resolvedY = this.engine.viewport.height * 0.5;

                const parse = (v, max) => (typeof v === 'string' && v.includes('%')) ? (parseFloat(v) / 100) * max : parseFloat(v) || max / 2;

                if (targetX) this.resolvedX = parse(targetX, this.engine.viewport.width);
                if (targetY) this.resolvedY = parse(targetY, this.engine.viewport.height);
        }

        async execute() {
                for (const step of this.sequence) {
                        const [command, ...args] = step;
                        const duration_ms = args[0] || 0;

                        switch (command) {
                                case SEQUENCE_COMMANDS.VFX:
                                        // args = [duration_ms, effect_name, x, y, options]
                                        const vfxName = args[1];
                                        const x = args[2];
                                        const y = args[3];
                                        const opts = args[4];

                                        this.engine._spawnGlobal(vfxName, x || this.resolvedX, y || this.resolvedY, opts);

                                        if (duration_ms > 0) await new Promise(r => setTimeout(r, duration_ms));
                                        break;

                                case SEQUENCE_COMMANDS.IMPACT_FRAME:
                                        // args = [duration_ms, color, htmlFx]
                                        const color = args[1];
                                        const htmlFx = args[2];

                                        if (htmlFx && htmlFx !== 'none') this.engine.applyHtmlFx(htmlFx, duration_ms);

                                        this.engine.setOverlay(color);
                                        await new Promise(r => setTimeout(r, duration_ms));
                                        // Critical for sustained black: only clear if we didn't set it to black (or a partial black)
                                        if (color !== 'black' && !color.startsWith('rgba(0,0,0')) {
                                                this.engine.setOverlay('transparent');
                                        }
                                        break;

                                // NEW: SHADOW command implementation
                                case SEQUENCE_COMMANDS.SHADOW:
                                        // args = [duration_ms, selector, color]
                                        const selector = args[1];
                                        const shadowColor = args[2];

                                        this.engine.createShadows(selector, shadowColor, duration_ms);
                                        if (duration_ms > 0) await new Promise(r => setTimeout(r, duration_ms));
                                        break;


                                case SEQUENCE_COMMANDS.WAIT:
                                        await new Promise(r => setTimeout(r, duration_ms));
                                        break;

                                default:
                                        console.warn(`Unknown sequence command: ${command}`);
                        }
                }
                // Final cleanup to ensure overlay is cleared after the entire sequence finishes
                this.engine.setOverlay('transparent');
        }
}

// ============================================================================
// 🎨 EFFECT INSTANCE (Shared by Global and Local Spawns)
// ============================================================================

class EffectInstance {
        constructor(ctx, w, h, container, x, y, options) {
                this.ctx = ctx; this.w = w; this.h = h; this.container = container;
                this.particles = [];
                this.x = x; this.y = y;
                this.life = 100;
                this.emitter = null;
                this.id = Math.random().toString(36).substr(2);
                this.isLocal = !!container;
                this.options = options || {};
        }

        startLocalLoop() {
                const loop = () => {
                        const active = this.update();
                        if (active) {
                                this.render(this.ctx);
                                requestAnimationFrame(loop);
                        } else if (this.container) {
                                this.container.remove();
                        }
                };
                requestAnimationFrame(loop);
        }

        addCSS(css, duration_ms) {
                if (!this.isLocal) return;
                const parent = this.container.parentElement;
                const oldStyle = parent.getAttribute('style') || '';
                parent.style.cssText += css;
                setTimeout(() => parent.setAttribute('style', oldStyle), duration_ms);
        }

        flash(color, duration_ms) {
                if (!this.isLocal) return;

                const f = document.createElement('div');
                Object.assign(f.style, {
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                        backgroundColor: color, mixBlendMode: 'screen', pointerEvents: 'none'
                });
                this.container.appendChild(f);
                setTimeout(() => f.remove(), duration_ms);
        }

        spawn(p) {
                // Particles now spawn relative to the instance's origin (0,0 for local,
                // global cursor/center for global).
                this.particles.push({
                        x: this.x + (p.x || 0), y: this.y + (p.y || 0), vx: p.vx || 0, vy: p.vy || 0,
                        life: p.life, maxLife: p.life,
                        size: p.size || 5, color: p.color,
                        gravity: p.gravity || 0, shrink: p.shrink || false, growth: p.growth || 0,
                        type: p.type || 'circle', length: p.length || 10,
                        lineWidth: p.lineWidth || 1
                });
        }

        update() {
                this.life--;
                if (this.isLocal) this.ctx.clearRect(0, 0, this.w, this.h);
                if (this.emitter && this.life > 0) this.emitter();

                this.particles = this.particles.filter(p => p.life > 0);
                this.particles.forEach(p => {
                        p.x += p.vx; p.y += p.vy; p.vy += p.gravity;
                        p.life--;
                        p.size += p.growth;
                        if (p.shrink) p.size *= 0.90;
                });

                if (this.isLocal && this.life <= -100 && this.particles.length === 0) return false;

                return this.particles.length > 0;
        }

        render(ctx) {
                this.particles.forEach(p => {
                        ctx.fillStyle = p.color;
                        ctx.strokeStyle = p.color;
                        ctx.globalAlpha = p.life / p.maxLife;

                        ctx.beginPath();
                        if (p.type === 'circle') {
                                ctx.arc(p.x, p.y, Math.max(0, p.size), 0, 6.28);
                                ctx.fill();
                        } else if (p.type === 'square') {
                                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
                        } else if (p.type === 'triangle') {
                                ctx.moveTo(p.x, p.y - p.size);
                                ctx.lineTo(p.x + p.size / 2, p.y + p.size / 2);
                                ctx.lineTo(p.x - p.size / 2, p.y + p.size / 2);
                                ctx.fill();
                        } else if (p.type === 'stroke') {
                                ctx.arc(p.x, p.y, Math.max(0, p.size), 0, 6.28);
                                ctx.lineWidth = p.lineWidth || 1;
                                ctx.stroke();
                        } else if (p.type === 'line') {
                                const angle = Math.atan2(p.vy, p.vx);
                                ctx.moveTo(p.x, p.y);
                                ctx.lineTo(p.x - Math.cos(angle) * p.length, p.y - Math.sin(angle) * p.length);
                                ctx.lineWidth = p.size;
                                ctx.stroke();
                        }
                });
        }
}

class Particle {
        constructor(ox, oy, p) {
                this.x = ox + (p.offsetX || 0); this.y = oy + (p.offsetY || 0);
                this.vx = p.vx || 0; this.vy = p.vy || 0;
                this.life = p.life || 60; this.maxLife = this.life;
                this.size = p.size || 5; this.type = p.type || 'circle';
                this.color = p.color || '#fff'; this.drag = p.drag || 1;
                this.gravity = p.gravity || 0; this.rotation = p.rotation || 0;

                // Specialized Props
                this.growth = p.growth || 0;
                this.width = p.width || 2;
                this.length = p.length || 20;
                this.points = p.points || 5; // For lightning
                this.curve = p.curve || 20; // For slash
                this.flipSpeed = p.flipSpeed || 0; // For cards
                this.flipVal = 0;
                this.freq = p.freq || 0.1; // Wave
                this.amp = p.amp || 5; // Wave
                this.initX = this.x; // For wave ref
        }

        update() {
                this.x += this.vx; this.y += this.vy;
                this.vx *= this.drag; this.vy *= this.drag; this.vy += this.gravity;

                this.size += this.growth;
                this.life--;
                this.flipVal += this.flipSpeed;

                if (this.type === 'wave') {
                        // Sine wave motion relative to initial X
                        this.x = this.initX + Math.sin((this.maxLife - this.life) * this.freq) * this.amp;
                }
        }

        render(ctx) {
                if (this.life <= 0) return;
                const progress = 1 - (this.life / this.maxLife);

                ctx.fillStyle = this.color;
                ctx.strokeStyle = this.color;
                ctx.globalAlpha = Math.min(1, this.life / 10);

                ctx.save();
                ctx.translate(this.x, this.y);

                // --- CUSTOM SHAPES ---

                if (this.type === 'flash') {
                        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for full screen
                        ctx.globalAlpha = this.life / this.maxLife;
                        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                }
                else if (this.type === 'lightning') {
                        // Fractal generation (Midpoint displacement simplified)
                        ctx.rotate(this.rotation);
                        ctx.beginPath();
                        ctx.moveTo(0, 0);
                        let cx = 0, cy = 0;
                        const segmentY = this.length / this.points; // actually uses 'spread' in spawn
                        // Just draw random jagged line
                        for (let i = 0; i < this.points; i++) {
                                cx += (Math.random() - 0.5) * 50;
                                cy += 30;
                                ctx.lineTo(cx, cy);
                        }
                        ctx.lineWidth = this.width;
                        ctx.stroke();
                }
                else if (this.type === 'card') {
                        // Simulate 3D rotation using scaleX
                        const scaleX = Math.cos(this.flipVal);
                        ctx.scale(scaleX, 1);
                        ctx.rotate(this.rotation);
                        ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size * 1.4);
                }
                else if (this.type === 'slash') {
                        // Bezier Curve Slash
                        ctx.rotate(this.rotation);
                        ctx.beginPath();
                        ctx.moveTo(-this.size, 0);
                        // Quadratic curve for the "swing" arc
                        ctx.quadraticCurveTo(0, this.curve, this.size, 0);

                        // Tapered ends (Simulate stroke width by drawing shape)
                        ctx.quadraticCurveTo(0, this.curve + this.width, -this.size, 0);
                        ctx.fill();
                }
                else if (this.type === 'wave') {
                        ctx.beginPath();
                        ctx.arc(0, 0, this.size, 0, 6.28);
                        ctx.globalAlpha = 0.3; // Smoke-like transparency
                        ctx.fill();
                }
                else if (this.type === 'triangle') {
                        ctx.rotate(this.rotation);
                        ctx.beginPath();
                        ctx.moveTo(0, -this.size);
                        ctx.lineTo(this.size, this.size);
                        ctx.lineTo(-this.size, this.size);
                        ctx.fill();
                }
                else {
                        // Standard Circle/Line
                        if (this.length > 0 && this.type === 'line') {
                                ctx.rotate(Math.atan2(this.vy, this.vx));
                                ctx.beginPath();
                                ctx.moveTo(0, 0); ctx.lineTo(this.length, 0);
                                ctx.lineWidth = this.width;
                                ctx.stroke();
                        } else {
                                ctx.beginPath();
                                ctx.arc(0, 0, Math.max(0, this.size), 0, 6.28);
                                ctx.fill();
                        }
                }

                ctx.restore();
        }
}

// ============================================================================
// HTML ANIMATION CLASS
// ============================================================================

class HTMLAnimation {
        constructor(element, options, arcaneFX) {
                this.element = element;
                this.options = options;
                this.arcaneFX = arcaneFX;
                this.id = Math.random().toString(36).substr(2, 9);
                this.startTime = 0;
                this.duration = options.duration || 1000;
                this.easing = options.easing || 'easeOutCubic';
                this.running = false;
                this.completed = false;

                this.initial = this.getElementState();
                this.target = this.calculateTarget();
        }

        getElementState() {
                const style = window.getComputedStyle(this.element);
                return {
                        x: 0,
                        y: 0,
                        scaleX: 1,
                        scaleY: 1,
                        rotation: 0,
                        opacity: parseFloat(style.opacity) || 1,
                };
        }

        calculateTarget() {
                const target = {};

                Object.keys(this.options).forEach(key => {
                        if (key === 'duration' || key === 'easing' || key === 'onComplete' || key === 'color') return;

                        const value = this.options[key];
                        if (typeof value === 'object' && value !== null) {
                                target[key] = {};
                                Object.keys(value).forEach(prop => {
                                        target[key][prop] = this.arcaneFX.toPixels(value[prop]);
                                });
                        } else if (key === 'scale') {
                                const pixelValue = this.arcaneFX.toPixels(value);
                                target[key] = { x: pixelValue, y: pixelValue };
                        } else if (key === 'rotate') {
                                target[key] = parseFloat(value);
                        } else {
                                target[key] = value;
                        }
                });

                return target;
        }

        getEasingFunction(name) {
                const easing = {
                        linear: t => t, easeInQuad: t => t * t, easeOutQuad: t => t * (2 - t),
                        easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
                        easeOutCubic: t => (--t) * t * t + 1,
                        easeOutBack: t => { const c1 = 1.70158; const c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
                        easeOutElastic: t => { const c4 = (2 * Math.PI) / 3; return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1; }
                };
                return easing[name] || easing.easeOutCubic;
        }

        update() {
                if (!this.running || this.completed) return;

                const elapsed = performance.now() - this.startTime;
                const progress = Math.min(elapsed / this.duration, 1);
                const easedProgress = this.getEasingFunction(this.easing)(progress);

                this.applyTransformation(easedProgress);

                if (progress >= 1) {
                        this.completed = true;
                        this.running = false;
                        this.arcaneFX.animations.delete(this.id);
                        if (this.options.onComplete) {
                                this.options.onComplete();
                        }
                }
        }

        applyTransformation(progress) {
                const transform = [];
                let newOpacity = this.initial.opacity;
                let newFilter = '';
                let newTextShadow = '';

                Object.keys(this.target).forEach(type => {
                        const targetValue = this.target[type];
                        const initialValue = this.initial[type] !== undefined ? this.initial[type] : null;

                        switch (type) {
                                case 'move':
                                        if (targetValue.x !== undefined) transform.push(`translateX(${targetValue.x * progress}px)`);
                                        if (targetValue.y !== undefined) transform.push(`translateY(${targetValue.y * progress}px)`);
                                        break;

                                case 'scale':
                                        if (targetValue.x !== undefined) {
                                                const targetScale = parseFloat(targetValue.x) / 100;
                                                const newScale = 1 + (targetScale - 1) * progress;
                                                transform.push(`scaleX(${newScale})`);
                                        }
                                        if (targetValue.y !== undefined) {
                                                const targetScale = parseFloat(targetValue.y) / 100;
                                                const newScale = 1 + (targetScale - 1) * progress;
                                                transform.push(`scaleY(${newScale})`);
                                        }
                                        break;

                                case 'rotate':
                                        const newRot = 0 + (targetValue - 0) * progress;
                                        transform.push(`rotate(${newRot}deg)`);
                                        break;

                                case 'opacity':
                                        const targetOpacity = targetValue;
                                        newOpacity = initialValue + (targetOpacity - initialValue) * progress;
                                        break;

                                case 'blur':
                                        const blurValue = targetValue * progress;
                                        newFilter += ` blur(${blurValue}px)`;
                                        break;

                                case 'glow':
                                        const glowValue = targetValue * progress;
                                        newTextShadow = `0 0 ${glowValue}px ${this.options.color || '#ff00ff'}`;
                                        break;

                                case 'skew':
                                        if (targetValue.x !== undefined) transform.push(`skewX(${targetValue.x * progress}deg)`);
                                        if (targetValue.y !== undefined) transform.push(`skewY(${targetValue.y * progress}deg)`);
                                        break;
                        }
                });

                // Apply
                this.element.style.transform = transform.join(' ');
                this.element.style.filter = newFilter.trim();
                this.element.style.textShadow = newTextShadow;
                this.element.style.opacity = newOpacity;
        }

        start() {
                this.startTime = performance.now();
                this.running = true;
                this.completed = false;

                this.arcaneFX.animations.set(this.id, this);
                if (!this.arcaneFX._animationLoopRunning) {
                        this.arcaneFX._startAnimationLoop();
                }
        }

        stop() {
                this.running = false;
                this.arcaneFX.animations.delete(this.id);
        }
}

// ============================================================================
// EFFECT REGISTRATION
// ============================================================================

ArcaneFX.prototype.registerAllEffects = function () {
        console.log('🔧 Registering all effects...');

        // Energy Effects
        this.effects.set('energyBurst', {
                config: { duration: 1500 },
                generateParticles: (x, y, effectInstance) => this.generateEnergyBurst(x, y, effectInstance)
        });

        this.effects.set('impactShockwave', {
                config: { duration: 1000 },
                generateParticles: (x, y, effectInstance) => this.generateImpactShockwave(x, y, effectInstance)
        });

        this.effects.set('animeExplosion', {
                config: { duration: 2000 },
                generateParticles: (x, y, effectInstance) => this.generateAnimeExplosion(x, y, effectInstance)
        });

        this.effects.set('magicSwirl', {
                config: { duration: 2500, loop: false },
                generateParticles: (x, y, effectInstance) => this.generateMagicSwirl(x, y, effectInstance)
        });

        this.effects.set('slashTrail', {
                config: { duration: 800 },
                generateParticles: (x, y, effectInstance) => this.generateSlashTrail(x, y, effectInstance)
        });

        this.effects.set('darkMatterImplosion', {
                config: { duration: 1800 },
                generateParticles: (x, y, effectInstance) => this.generateDarkMatterImplosion(x, y, effectInstance)
        });

        // Elemental Effects
        this.effects.set('fireSurge', {
                config: { duration: 2000 },
                generateParticles: (x, y, effectInstance) => this.generateFireSurge(x, y, effectInstance)
        });

        this.effects.set('iceShards', {
                config: { duration: 1500 },
                generateParticles: (x, y, effectInstance) => this.generateIceShards(x, y, effectInstance)
        });

        this.effects.set('lightningFork', {
                config: { duration: 600 },
                generateParticles: (x, y, effectInstance) => this.generateLightningFork(x, y, effectInstance)
        });

        this.effects.set('windSlash', {
                config: { duration: 1000 },
                generateParticles: (x, y, effectInstance) => this.generateWindSlash(x, y, effectInstance)
        });

        this.effects.set('earthSpikes', {
                config: { duration: 1800 },
                generateParticles: (x, y, effectInstance) => this.generateEarthSpikes(x, y, effectInstance)
        });

        // Distortion Effects
        this.effects.set('heatwave', {
                config: { duration: 3000, loop: true },
                generateParticles: (x, y, effectInstance) => this.generateHeatwave(x, y, effectInstance)
        });

        this.effects.set('rippleShockwave', {
                config: { duration: 2000 },
                generateParticles: (x, y, effectInstance) => this.generateRippleShockwave(x, y, effectInstance)
        });

        this.effects.set('flashWhiteout', {
                config: { duration: 300 },
                generateParticles: (x, y, effectInstance) => this.generateFlashWhiteout(x, y, effectInstance)
        });

        // Summoning Effects
        this.effects.set('portalRings', {
                config: { duration: 2500 },
                generateParticles: (x, y, effectInstance) => this.generatePortalRings(x, y, effectInstance)
        });

        this.effects.set('starfall', {
                config: { duration: 4000, loop: false },
                generateParticles: (x, y, effectInstance) => this.generateStarfall(x, y, effectInstance)
        });

        this.effects.set('cardMaterialization', {
                config: { duration: 1500 },
                generateParticles: (x, y, effectInstance) => this.generateCardMaterialization(x, y, effectInstance)
        });

        console.log(`✅ Registered ${this.effects.size} effects successfully!`);
};

// ============================================================================
// EFFECT GENERATION METHODS
// ============================================================================

ArcaneFX.prototype.generateEnergyBurst = function (x, y, effectInstance) {
        // Central energy core with pulsing effect
        for (let i = 0; i < 12; i++) {
                const particle = new Particle(x, y, {
                        size: 18 - i * 0.5,
                        color: '#00ffff',
                        life: 1200 - i * 40,
                        glow: 25,
                        blendMode: 'lighter',
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.3,
                        scale: 0.8 + Math.random() * 0.4,
                        opacity: 0.9
                });
                effectInstance.particles.push(particle);
        }

        // Energy burst particles with dynamic properties
        for (let i = 0; i < 45; i++) {
                const angle = (Math.PI * 2 * i) / 45;
                const speed = 2.5 + Math.random() * 5;

                const particle = new Particle(x, y, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 2 + Math.random() * 5,
                        color: Math.random() > 0.6 ? '#00ffff' : Math.random() > 0.5 ? '#ff00ff' : '#ffff00',
                        life: 800 + Math.random() * 700,
                        glow: 12,
                        blendMode: 'lighter',
                        trail: true,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.2,
                        scale: 0.6 + Math.random() * 0.8,
                        opacity: 0.8
                });
                effectInstance.particles.push(particle);
        }

        // Outer ring particles with dynamic effects
        for (let i = 0; i < 25; i++) {
                const angle = (Math.PI * 2 * i) / 25;
                const speed = 1.5 + Math.random() * 3.5;

                const particle = new Particle(x, y, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 1.5 + Math.random() * 4,
                        color: Math.random() > 0.4 ? '#ffffff' : Math.random() > 0.5 ? '#00ffff' : '#ff00ff',
                        life: 1000 + Math.random() * 500,
                        opacity: 0.6 + Math.random() * 0.4,
                        blendMode: 'lighter',
                        glow: 15,
                        trail: true,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.3,
                        scale: 0.5 + Math.random() * 1.0
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateMagicSwirl = function (x, y, effectInstance) {
        const colorPalette = ['#00ffff', '#ff00ff', '#ffff00', '#ffffff'];

        // Magic swirl particles with dynamic rotation and pulsing
        for (let i = 0; i < 50; i++) {
                const angle = (Math.PI * 2 * i) / 50;
                const radius = 15 + Math.random() * 100;
                const speed = 1.5 + Math.random() * 4;

                const particle = new Particle(
                        x + Math.cos(angle) * radius,
                        y + Math.sin(angle) * radius,
                        {
                                vx: -Math.sin(angle) * speed,
                                vy: Math.cos(angle) * speed,
                                size: 2.5 + Math.random() * 4,
                                color: colorPalette[i % colorPalette.length],
                                life: 1800 + Math.random() * 700,
                                glow: 10,
                                blendMode: 'lighter',
                                trail: true,
                                rotation: Math.random() * Math.PI * 2,
                                rotationSpeed: (Math.random() - 0.5) * 0.4,
                                scale: 0.6 + Math.random() * 0.8,
                                opacity: 0.7 + Math.random() * 0.3
                        }
                );
                effectInstance.particles.push(particle);
        }

        // Central vortex core with pulsing and rotation
        for (let i = 0; i < 18; i++) {
                const particle = new Particle(x, y, {
                        size: 10 - i * 0.4,
                        color: '#ffffff',
                        life: 1200 + Math.random() * 400,
                        glow: 25,
                        blendMode: 'lighter',
                        opacity: 0.8 + Math.random() * 0.2,
                        rotation: Math.random() * Math.PI * 2,
                        rotationSpeed: (Math.random() - 0.5) * 0.5,
                        scale: 0.7 + Math.random() * 0.6
                });
                effectInstance.particles.push(particle);
        }
};

// ============================================================================
// ADDITIONAL EFFECT IMPLEMENTATIONS
// ============================================================================

ArcaneFX.prototype.generateImpactShockwave = function (x, y, effectInstance) {
        // Central impact flash
        for (let i = 0; i < 15; i++) {
                const particle = new Particle(x, y, {
                        size: 20 - i,
                        color: '#ffff00',
                        life: 300 - i * 10,
                        glow: 15,
                        blendMode: 'lighter',
                        opacity: 1 - (i / 15) * 0.8
                });
                effectInstance.particles.push(particle);
        }

        // Shockwave ring particles
        for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 * i) / 20;
                const distance = 30 + Math.random() * 20;

                const particle = new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        {
                                size: 3 + Math.random() * 2,
                                color: '#ff4500',
                                life: 600,
                                glow: 8,
                                blendMode: 'lighter',
                                opacity: 0.9
                        }
                );
                effectInstance.particles.push(particle);
        }

        // Debris particles
        for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 5;
                const distance = Math.random() * 50;

                const particle = new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        {
                                vx: Math.cos(angle) * speed,
                                vy: Math.sin(angle) * speed - 2,
                                ax: 0,
                                ay: 0.3,
                                size: 2 + Math.random() * 3,
                                color: '#8B4513',
                                life: 1500,
                                gravity: 0.3,
                                shape: 'square'
                        }
                );
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateAnimeExplosion = function (x, y, effectInstance) {
        const colors = ['#ff0000', '#ff4500', '#ffa500', '#ffff00', '#ffffff'];

        // Multi-ring explosion
        for (let ring = 0; ring < 3; ring++) {
                setTimeout(() => {
                        const ringParticles = 40 - ring * 10;
                        for (let i = 0; i < ringParticles; i++) {
                                const angle = (Math.PI * 2 * i) / ringParticles;
                                const speed = 4 - ring * 0.5 + Math.random() * 2;

                                const particle = new Particle(x, y, {
                                        vx: Math.cos(angle) * speed,
                                        vy: Math.sin(angle) * speed,
                                        size: 4 - ring,
                                        color: colors[i % colors.length],
                                        life: 1200 - ring * 200,
                                        glow: 12 - ring * 2,
                                        blendMode: 'lighter',
                                        trail: true
                                });
                                effectInstance.particles.push(particle);
                        }
                }, ring * 100);
        }

        // Central bright core
        for (let i = 0; i < 20; i++) {
                const particle = new Particle(x, y, {
                        size: 10 - i * 0.3,
                        color: '#ffffff',
                        life: 600 - i * 20,
                        glow: 25,
                        blendMode: 'lighter',
                        opacity: 1
                });
                effectInstance.particles.push(particle);
        }

        // Fire particles
        for (let i = 0; i < 30; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1 + Math.random() * 4;

                const particle = new Particle(x, y, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed - 1,
                        size: 3 + Math.random() * 5,
                        color: ['#ff4500', '#ff0000', '#8B0000'][Math.floor(Math.random() * 3)],
                        life: 1500 + Math.random() * 1000,
                        gravity: -0.1,
                        glow: 5,
                        trail: true
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateSlashTrail = function (x, y, effectInstance) {
        // Horizontal slash particles
        for (let i = 0; i < 25; i++) {
                const offset = (i - 12) * 10;
                const spread = Math.random() * 20 - 10;

                const particle = new Particle(
                        x + offset,
                        y + spread,
                        {
                                size: 2 + Math.random() * 4,
                                color: i % 3 === 0 ? '#ffffff' : '#ff00ff',
                                life: 600 + Math.random() * 200,
                                glow: 10,
                                blendMode: 'lighter',
                                trail: true,
                                opacity: 0.8
                        }
                );
                effectInstance.particles.push(particle);
        }

        // Speed lines
        for (let i = 0; i < 15; i++) {
                const offset = (i - 7) * 15;
                const spread = Math.random() * 30 - 15;

                const particle = new Particle(
                        x + offset,
                        y + spread,
                        {
                                vx: 10,
                                vy: (Math.random() - 0.5) * 2,
                                size: 1,
                                color: '#00ffff',
                                life: 400,
                                opacity: 0.6,
                                trail: true
                        }
                );
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateDarkMatterImplosion = function (x, y, effectInstance) {
        // Dark energy particles moving inward
        for (let i = 0; i < 40; i++) {
                const angle = (Math.PI * 2 * i) / 40;
                const startRadius = 100 + Math.random() * 50;

                const particle = new Particle(
                        x + Math.cos(angle) * startRadius,
                        y + Math.sin(angle) * startRadius,
                        {
                                size: 3 + Math.random() * 2,
                                color: '#4B0082',
                                life: 1400,
                                glow: 15,
                                blendMode: 'source-over',
                                opacity: 0.7
                        }
                );

                // Animate inward movement
                const originalUpdate = particle.update;
                particle.update = function (deltaTime) {
                        const progress = (this.maxLife - this.life) / this.maxLife;
                        const currentRadius = startRadius + (10 - startRadius) * progress;
                        this.x = x + Math.cos(angle) * currentRadius;
                        this.y = y + Math.sin(angle) * currentRadius;
                        this.life -= deltaTime;
                        if (this.life <= 0) this.alive = false;
                        this.opacity = Math.max(0, this.life / this.maxLife) * 0.7;
                };

                effectInstance.particles.push(particle);
        }

        // Central void
        for (let i = 0; i < 20; i++) {
                const particle = new Particle(x, y, {
                        size: 15 - i * 0.5,
                        color: '#000000',
                        life: 1000 - i * 30,
                        opacity: 0.9 - i * 0.03,
                        blendMode: 'source-over'
                });
                effectInstance.particles.push(particle);
        }

        // Purple energy ring
        for (let i = 0; i < 30; i++) {
                const angle = (Math.PI * 2 * i) / 30;
                const particle = new Particle(
                        x + Math.cos(angle) * 60,
                        y + Math.sin(angle) * 60,
                        {
                                size: 2,
                                color: '#8A2BE2',
                                life: 1200,
                                glow: 8,
                                blendMode: 'lighter',
                                opacity: 0.6
                        }
                );
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateFireSurge = function (x, y, effectInstance) {
        // Rising fire particles
        for (let i = 0; i < 35; i++) {
                const offset = (Math.random() - 0.5) * 40;
                const particle = new Particle(x + offset, y, {
                        vx: (Math.random() - 0.5) * 2,
                        vy: -(3 + Math.random() * 4),
                        size: 4 + Math.random() * 6,
                        color: ['#ff4500', '#ff0000', '#ffa500', '#ffff00'][Math.floor(Math.random() * 4)],
                        life: 1500 + Math.random() * 500,
                        gravity: -0.2,
                        glow: 8,
                        trail: true
                });
                effectInstance.particles.push(particle);
        }

        // Fire burst at base
        for (let i = 0; i < 15; i++) {
                const angle = Math.PI + (Math.random() * Math.PI / 2);
                const speed = 1 + Math.random() * 3;

                const particle = new Particle(x, y, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 3 + Math.random() * 4,
                        color: '#ff4500',
                        life: 800,
                        gravity: -0.1,
                        glow: 6
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateIceShards = function (x, y, effectInstance) {
        // Ice shard projectiles
        for (let i = 0; i < 25; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 4 + Math.random() * 3;

                const particle = new Particle(x, y, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 3 + Math.random() * 4,
                        color: '#00BFFF',
                        life: 1200,
                        gravity: 0.2,
                        glow: 5,
                        shape: 'triangle',
                        trail: true
                });
                effectInstance.particles.push(particle);
        }

        // Ice burst particles
        for (let i = 0; i < 15; i++) {
                const angle = (Math.PI * 2 * i) / 15;
                const speed = 2 + Math.random() * 2;

                const particle = new Particle(x, y, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 2,
                        color: '#E0FFFF',
                        life: 600,
                        opacity: 0.8
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateLightningFork = function (x, y, effectInstance) {
        // Main lightning bolt
        const segments = 8;
        for (let i = 0; i < segments; i++) {
                const offset = i * 15;
                const spread = (Math.random() - 0.5) * 10;

                const particle = new Particle(
                        x + spread,
                        y - offset,
                        {
                                size: 2 + Math.random() * 2,
                                color: '#00FFFF',
                                life: 400 - i * 30,
                                glow: 12,
                                blendMode: 'lighter',
                                opacity: 1
                        }
                );
                effectInstance.particles.push(particle);
        }

        // Lightning branches
        for (let i = 0; i < 3; i++) {
                const branchStart = 2 + Math.random() * 4;
                const angle = (Math.random() - 0.5) * Math.PI / 3;
                const length = 3 + Math.random() * 3;

                for (let j = 0; j < length; j++) {
                        const offset = (branchStart + j) * 15;
                        const spread = Math.sin(angle) * offset;

                        const particle = new Particle(
                                x + spread,
                                y - offset,
                                {
                                        size: 1 + Math.random(),
                                        color: '#00FFFF',
                                        life: 300,
                                        glow: 8,
                                        blendMode: 'lighter',
                                        opacity: 0.7
                                }
                        );
                        effectInstance.particles.push(particle);
                }
        }

        // Electric sparks
        for (let i = 0; i < 10; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = 20 + Math.random() * 30;

                const particle = new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        {
                                size: 1,
                                color: '#FFFFFF',
                                life: 200,
                                glow: 6,
                                blendMode: 'lighter',
                                opacity: 0.8
                        }
                );
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateWindSlash = function (x, y, effectInstance) {
        // Wind trail particles
        for (let i = 0; i < 20; i++) {
                const offset = i * 8;
                const spread = (Math.random() - 0.5) * 15;

                const particle = new Particle(x - offset, y + spread, {
                        vx: 8,
                        vy: (Math.random() - 0.5) * 2,
                        size: 2 + Math.random() * 2,
                        color: '#E0FFFF',
                        life: 600,
                        opacity: 0.6,
                        trail: true
                });
                effectInstance.particles.push(particle);
        }

        // Air pressure waves
        for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 25;

                const particle = new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        {
                                size: 3 + Math.random() * 2,
                                color: '#B0E0E6',
                                life: 800,
                                opacity: 0.4,
                                glow: 3
                        }
                );
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateEarthSpikes = function (x, y, effectInstance) {
        // Earth spike projectiles
        for (let i = 0; i < 20; i++) {
                const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI / 3;
                const speed = 3 + Math.random() * 2;

                const particle = new Particle(x, y, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 4 + Math.random() * 3,
                        color: '#8B4513',
                        life: 1000,
                        gravity: 0.4,
                        shape: 'triangle'
                });
                effectInstance.particles.push(particle);
        }

        // Dust particles
        for (let i = 0; i < 25; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 30;

                const particle = new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        {
                                vx: (Math.random() - 0.5) * 2,
                                vy: -Math.random() * 2,
                                size: 1 + Math.random() * 2,
                                color: '#D2B48C',
                                life: 1200,
                                gravity: -0.1,
                                opacity: 0.6
                        }
                );
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateHeatwave = function (x, y, effectInstance) {
        // Rising heat particles
        for (let i = 0; i < 15; i++) {
                const offset = (Math.random() - 0.5) * 60;
                const particle = new Particle(x + offset, y, {
                        vx: (Math.random() - 0.5) * 0.5,
                        vy: -1 - Math.random() * 1,
                        size: 8 + Math.random() * 4,
                        color: 'rgba(255, 69, 0, 0.3)',
                        life: 2000,
                        gravity: -0.1,
                        blendMode: 'lighter'
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateRippleShockwave = function (x, y, effectInstance) {
        // Ripple rings
        for (let ring = 0; ring < 4; ring++) {
                setTimeout(() => {
                        for (let i = 0; i < 10; i++) {
                                const angle = (Math.PI * 2 * i) / 10;
                                const radius = 20 + ring * 15;

                                const particle = new Particle(
                                        x + Math.cos(angle) * radius,
                                        y + Math.sin(angle) * radius,
                                        {
                                                size: 3,
                                                color: '#00BFFF',
                                                life: 800,
                                                glow: 6,
                                                blendMode: 'lighter',
                                                opacity: 0.7
                                        }
                                );
                                effectInstance.particles.push(particle);
                        }
                }, ring * 200);
        }
};

ArcaneFX.prototype.generateFlashWhiteout = function (x, y, effectInstance) {
        // Bright flash particles
        for (let i = 0; i < 5; i++) {
                const particle = new Particle(x, y, {
                        size: 50 - i * 8,
                        color: '#FFFFFF',
                        life: 200 - i * 20,
                        glow: 30,
                        blendMode: 'lighter',
                        opacity: 1 - i * 0.2
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generatePortalRings = function (x, y, effectInstance) {
        // Portal ring particles
        for (let ring = 0; ring < 3; ring++) {
                setTimeout(() => {
                        for (let i = 0; i < 20; i++) {
                                const angle = (Math.PI * 2 * i) / 20;
                                const radius = 30 + ring * 20;

                                const particle = new Particle(
                                        x + Math.cos(angle) * radius,
                                        y + Math.sin(angle) * radius,
                                        {
                                                size: 2 + Math.random() * 2,
                                                color: ['#00FFFF', '#FF00FF', '#FFFF00'][ring],
                                                life: 1200,
                                                glow: 10,
                                                blendMode: 'lighter',
                                                trail: true
                                        }
                                );
                                effectInstance.particles.push(particle);
                        }
                }, ring * 300);
        }

        // Central portal energy
        for (let i = 0; i < 10; i++) {
                const particle = new Particle(x, y, {
                        size: 8 - i * 0.5,
                        color: '#FFFFFF',
                        life: 1500,
                        glow: 20,
                        blendMode: 'lighter',
                        opacity: 0.8
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateStarfall = function (x, y, effectInstance) {
        // Falling stars
        for (let i = 0; i < 30; i++) {
                const startX = x - 100 + Math.random() * 200;
                const startY = y - 200;
                const angle = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
                const speed = 5 + Math.random() * 3;

                const particle = new Particle(startX, startY, {
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 2 + Math.random() * 3,
                        color: '#FFD700',
                        life: 3000,
                        glow: 8,
                        blendMode: 'lighter',
                        trail: true
                });
                effectInstance.particles.push(particle);
        }
};

ArcaneFX.prototype.generateCardMaterialization = function (x, y, effectInstance) {
        // Card outline particles
        for (let i = 0; i < 20; i++) {
                const angle = (Math.PI * 2 * i) / 20;
                const radius = 25;

                const particle = new Particle(
                        x + Math.cos(angle) * radius,
                        y + Math.sin(angle) * radius,
                        {
                                size: 2,
                                color: '#FFD700',
                                life: 1000,
                                glow: 6,
                                blendMode: 'lighter',
                                opacity: 0.8
                        }
                );
                effectInstance.particles.push(particle);
        }

        // Materialization particles
        for (let i = 0; i < 15; i++) {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * 20;

                const particle = new Particle(
                        x + Math.cos(angle) * distance,
                        y + Math.sin(angle) * distance,
                        {
                                vx: (Math.random() - 0.5) * 2,
                                vy: (Math.random() - 0.5) * 2,
                                size: 1 + Math.random() * 2,
                                color: '#FFFFFF',
                                life: 800,
                                glow: 5,
                                blendMode: 'lighter',
                                opacity: 0.7
                        }
                );
                effectInstance.particles.push(particle);
        }
};

// Make available globally for backward compatibility
window.ArcaneFX = ArcaneFX;