/**
 * ArcaneFX Showcase JavaScript
 * Interactive showcase for the ArcaneFX VFX library
 * Author: MiniMax Agent
 */

// Import ArcaneFX from the single file
import { ArcaneFX, SEQUENCE_COMMANDS } from './ArcaneFX.js';

let engine = null;

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

let isInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
        engine = new ArcaneFX();

        // --- ROBUSTLY GET/CREATE CONTROLS CONTAINER ---
        let controls = document.getElementById('controls');
        if (!controls) {
                controls = document.createElement('div');
                controls.id = 'controls';
                Object.assign(controls.style, {
                        padding: '20px',
                        textAlign: 'center',
                        backgroundColor: '#1e1e1e',
                        marginBottom: '20px'
                });
                document.body.prepend(controls);
        }
        // ------------------------------------------------

        const grid = document.getElementById('effectsGrid');

        // Helper to call the correct spawn method (Local vs Global)
        const spawnEffect = (effect, target) => {
                if (target && target.tagName) {
                        engine.spawn(effect, target); // Local Spawn (HTMLElement)
                } else {
                        engine.spawn(effect, target.x, target.y); // Global Spawn (Coordinates)
                }
        };

        // The specific list you requested
        const effects = [
                'fire_engulf', 'fire_burst', 'fire_spiral',
                'water_bubble', 'water_splash', 'water_vortex',
                'wind_gust', 'wind_swirl', 'wind_cutter',
                'earth_crumble', 'earth_spike', 'earth_shield',
                'anime_cut', 'hit_impact', 'flash_step'
        ];

        // --- 1. Generate Effect Cards (Local Spawn) ---
        effects.forEach(effect => {
                const card = document.createElement('div');
                card.className = 'effect-card';
                card.innerHTML = `<h4>${effect.replace('_', ' ').toUpperCase()}</h4>`;
                card.style.position = 'relative';

                card.addEventListener('click', () => {
                        spawnEffect(effect, card);
                });

                grid.appendChild(card);
        });

        // --- 2. Add HTML Animation Demo Button (Updated for better demo) ---

        const htmlAnimButton = document.createElement('button');
        htmlAnimButton.id = 'htmlAnimButton'; // Give it an ID to exclude it from its own target list
        htmlAnimButton.innerText = 'DEMO: All Elements Move (Elastic & Spin)';
        htmlAnimButton.style.cssText = 'padding: 15px; margin-right: 15px; background: #FFD700; border: none; color: black; cursor: pointer; font-weight: bold;';

        htmlAnimButton.addEventListener('click', () => {
                // Target all cards and other buttons, excluding itself
                document.querySelectorAll('.effect-card, button:not(#htmlAnimButton)').forEach(el => {
                        const duration = 500 + Math.random() * 500;
                        const moveX = (Math.random() - 0.5) * 50; // -25 to 25px
                        const moveY = (Math.random() - 0.5) * 50;
                        const rotate = 720 + Math.random() * 360; // Spin 2-3 times
                        const scale = 110 + Math.random() * 20; // 110% to 130%

                        // Animate Out with a snappy, non-linear effect
                        engine.animateHTML(el, {
                                duration: duration,
                                easing: 'easeOutElastic',
                                move: { x: moveX, y: moveY },
                                scale: `${scale}%`,
                                rotate: rotate,
                                opacity: 0.8,
                                onComplete: () => {
                                        // Animate Back In smoothly
                                        engine.animateHTML(el, {
                                                duration: 500,
                                                easing: 'easeOutBack',
                                                move: { x: 0, y: 0 },
                                                scale: '100%',
                                                rotate: 0,
                                                opacity: 1,
                                        });
                                }
                        });
                });
        });
        controls.appendChild(htmlAnimButton);


        // --- 3. Add Full Sequence Demo Button (Updated for sustained black and shadows) ---

        const sequenceButton = document.createElement('button');
        sequenceButton.innerText = 'Run FULL GLOBAL IMPACT SEQUENCE (Sustained Black/Shadows)';
        sequenceButton.style.cssText = 'padding: 15px; background: #800080; border: none; color: white; cursor: pointer; font-weight: bold;';

        // Format: [COMMAND, duration_ms, arg2, arg3, arg4]
        const ULTIMATE_SEQUENCE = [
                // 1. Initial Blackout (Sets background to black and holds the state until cleared)
                ['IMPACT_FRAME', 1, 'black', 'none'],
                ['WAIT', 100], // Wait for the transition to complete

                // 2. Shadows appear briefly during the blackout
                // SHADOW: [SHADOW, duration_ms, selector, color]
                ['SHADOW', 500, '.effect-card, button', '#FF00FF'],

                // 3. Pre-Impact Slashing (Hidden under opacity layer, but visible now if other content exists)
                // VFX format: [VFX, duration_ms, effect_name, x, y, options]
                ['VFX', 100, 'anime_cut', '20%', '30%', {}],
                ['VFX', 100, 'anime_cut', '80%', '70%', {}],
                ['WAIT', 200],

                // 4. The Impact Frame (Quick shake and white flash over the sustained black)
                ['IMPACT_FRAME', 50, 'transparent', 'shake'], // Temporarily clear black overlay, apply shake
                ['VFX', 1, 'impact_flash_white', '50%', '50%', {}], // Spawn white flash effect
                ['WAIT', 300], // Wait for the shake to finish

                // 5. Cleanup: The SequenceRunner's final cleanup will clear the overlay
                // back to transparent automatically, removing the sustained black.
        ];

        sequenceButton.addEventListener('click', () => {
                engine.runSequence(ULTIMATE_SEQUENCE, '50%', '50%');
        });

        controls.appendChild(sequenceButton);


        // --- 4. Click Handler for Global Effects ---

        document.addEventListener('click', (e) => {
                if (e.target.closest('.effect-card') || e.target.closest('#controls')) return;

                const randomEffect = effects[Math.floor(Math.random() * effects.length)];

                // Global Spawn at Mouse Coordinates
                spawnEffect(randomEffect, { x: e.clientX, y: e.clientY });
        });
});

function setupUI() {
        const grid = document.getElementById('effectsGrid');
        const select = document.getElementById('effectSelect');

        if (!grid || !engine) return;

        grid.innerHTML = '';
        select.innerHTML = '';

        // 1. Register Regular Effects
        const regularEffects = Array.from(engine.effects.keys());

        // 2. Register Ultimates (if they exist)
        const ultimates = engine.ultimates ? Object.keys(engine.ultimates) : [];

        const allEffects = [...regularEffects, ...ultimates];

        allEffects.forEach(key => {
                // Dropdown Option
                const opt = document.createElement('option');
                opt.value = key;
                opt.innerText = key.replace(/([A-Z])/g, ' $1').trim();
                select.appendChild(opt);

                // Grid Card
                const card = document.createElement('div');
                card.className = 'effect-card';

                // Special styling for Ultimates
                if (key.startsWith('ultimate')) {
                        card.style.border = '1px solid #ffcc00';
                        card.style.background = 'linear-gradient(45deg, #221100, #111)';
                }

                card.innerHTML = `
            <div class="effect-card-content">
                <h4 class="effect-name" style="${key.startsWith('ultimate') ? 'color:#ffcc00' : ''}">
                    ${key.replace(/([A-Z])/g, ' $1').trim()}
                </h4>
                <p class="effect-description">
                    ${key.startsWith('ultimate') ? '⚠️ ULTIMATE SKILL' : 'Click to Spawn'}
                </p>
                <div class="effect-demo">✨</div>
            </div>
        `;

                card.addEventListener('click', (e) => {
                        e.stopPropagation();

                        // If it's an ultimate, spawn in center. Regulars spawn on card.
                        if (key.startsWith('ultimate')) {
                                engine.spawn(key, { x: '50%', y: '50%' });
                        } else {
                                engine.spawnOnElement(key, card);
                        }

                        card.style.transform = 'scale(0.95)';
                        setTimeout(() => card.style.transform = '', 100);
                });

                grid.appendChild(card);
        });

        // Buttons
        document.getElementById('spawnEffect')?.addEventListener('click', () => {
                const val = document.getElementById('effectSelect').value;
                engine.spawn(val, { x: '50%', y: '50%' });
        });

        document.getElementById('clearEffects')?.addEventListener('click', () => {
                engine.runningEffects.clear();
                engine.ctx.clearRect(0, 0, engine.canvas.width, engine.canvas.height);
        });
}

function setupInteraction() {
        document.addEventListener('click', (e) => {
                if (e.target.closest('.effect-card') || e.target.closest('.controls-area')) return;
                const val = document.getElementById('effectSelect')?.value || 'impactShockwave';

                // Don't spawn Ultimates on click (too chaotic)
                if (val.startsWith('ultimate')) {
                        engine.spawn(val, { x: '50%', y: '50%' });
                } else {
                        engine.spawn(val, { x: e.clientX, y: e.clientY });
                }
        });
}

function startStats() {
        const fpsEl = document.getElementById('fpsCounter');
        const partEl = document.getElementById('totalParticles');
        setInterval(() => {
                if (!engine) return;
                let count = 0;
                engine.runningEffects.forEach(eff => count += eff.particles.length);
                if (partEl) partEl.innerText = count;
                if (fpsEl) fpsEl.innerText = '60';
        }, 500);
}

function clearAllEffects() {
        if (!arcaneFX) return;

        console.log('🧹 Clearing all effects...');

        // Clear running effects
        arcaneFX.runningEffects.clear();

        // Clear canvas
        if (ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        console.log('✅ All effects cleared');
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

document.addEventListener('keydown', (event) => {
        if (!isInitialized) return;

        // Number keys 1-9 for quick effect spawning
        if (event.key >= '1' && event.key <= '9') {
                const effectIndex = parseInt(event.key) - 1;
                const effects = arcaneFX ? Array.from(arcaneFX.effects.keys()) : [];
                if (effects[effectIndex]) {
                        spawnEffectAtRandom(effects[effectIndex]);
                }
        }

        // Space bar for random effect
        if (event.code === 'Space') {
                event.preventDefault();
                const effects = arcaneFX ? Array.from(arcaneFX.effects.keys()) : [];
                if (effects.length > 0) {
                        const randomEffect = effects[Math.floor(Math.random() * effects.length)];
                        spawnEffectAtRandom(randomEffect);
                }
        }

        // C key for clear
        if (event.key.toLowerCase() === 'c') {
                clearAllEffects();
        }
});