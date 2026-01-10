import CanvasKitInit from 'canvaskit-wasm';
import type { CanvasKit, Surface, Typeface } from 'canvaskit-wasm';
import { MenuCallbacks } from './SkiaMenu';
import { StarMapPixelStyle } from './StarMapPixelStyle';
import { strudelAudio } from './StrudelAudio';

// Load a font from Google Fonts
async function loadFont(url: string): Promise<ArrayBuffer> {
    const response = await fetch(url);
    return response.arrayBuffer();
}

const startGame = async (parent: string) => {
    const container = document.getElementById(parent);
    if (!container) return;

    // Clear container
    container.innerHTML = '';

    // Pre-start splash (guaranteed user gesture for audio unlock).
    // Load everything in the background; on Start, fade the splash to reveal the scene.
    let startRequested = false;
    let sceneReady = false;
    let splashOverlay: HTMLDivElement | null = null;
    let splashHint: HTMLDivElement | null = null;

    const audioInit = strudelAudio.init().catch((err) => console.warn('Audio init failed:', err));

    const startAudio = () => {
        strudelAudio.start();
        strudelAudio.setStyle('starmap-pixel');
        strudelAudio.unlock();
    };

    const tryRevealSplash = () => {
        if (!startRequested) return;
        if (!sceneReady) return;
        if (!splashOverlay) return;
        splashOverlay.style.transition = 'opacity 320ms ease';
        splashOverlay.style.opacity = '0';
        window.setTimeout(() => splashOverlay?.remove(), 340);
        splashOverlay = null;
    };

    const requestStart = () => {
        if (startRequested) return;
        startRequested = true;
        startAudio();
        if (splashHint) splashHint.textContent = sceneReady ? 'Starting…' : 'Loading…';
        tryRevealSplash();
    };

    {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            inset: 0;
            background: #000;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            user-select: none;
            opacity: 1;
        `;
        overlay.tabIndex = 0;
        splashOverlay = overlay;

        const panel = document.createElement('div');
        panel.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 18px;
            padding: 28px 24px;
            text-align: center;
        `;

        const mark = document.createElement('div');
        mark.style.cssText = `
            width: 124px;
            height: 124px;
            border: 2px solid rgba(255,255,255,0.18);
            border-radius: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 1px rgba(255,255,255,0.06) inset;
        `;
        mark.innerHTML = `
            <svg width="92" height="92" viewBox="0 0 92 92" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering:crispEdges;">
                <path d="M68 28c-9-10-25-10-36-2-9 7-14 21-8 31 6 11 22 16 33 10 10-6 14-20 11-27-2-5-7-8-12-8-6 0-11 4-11 9 0 4 3 7 7 7 3 0 6-2 6-5" stroke="white" stroke-width="3" stroke-linecap="square" stroke-linejoin="miter"/>
                <path d="M25 60c-4 4-9 7-14 9" stroke="white" stroke-width="3" stroke-linecap="square"/>
                <path d="M28 67c-5 5-11 9-18 12" stroke="white" stroke-width="3" stroke-linecap="square"/>
                <path d="M34 72c-3 4-8 7-14 10" stroke="white" stroke-width="3" stroke-linecap="square"/>
            </svg>
        `;

        const company = document.createElement('div');
        company.style.cssText = `
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            font-size: 26px;
            letter-spacing: 0.18em;
            color: rgba(255,255,255,0.92);
            text-transform: uppercase;
            padding-left: 0.18em;
        `;
        company.textContent = 'Shrimp Commando';

        const hint = document.createElement('div');
        hint.style.cssText = `
            font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
            font-size: 13px;
            letter-spacing: 0.08em;
            color: rgba(255,255,255,0.55);
            text-transform: uppercase;
            min-height: 18px;
        `;
        hint.textContent = 'Loading…';
        splashHint = hint;

        overlay.addEventListener(
            'pointerdown',
            (e) => {
                e.preventDefault();
                requestStart();
            },
            { passive: false }
        );
        overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                requestStart();
            }
        });

        panel.appendChild(mark);
        panel.appendChild(company);
        panel.appendChild(hint);
        overlay.appendChild(panel);
        container.appendChild(overlay);
        overlay.focus();
    }

    // Show loading message
    const loading = document.createElement('div');
    loading.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #fff;
        font-family: Helvetica Neue, Arial, sans-serif;
        font-size: 14px;
        opacity: 0.5;
    `;
    loading.textContent = 'Loading CanvasKit...';
    container.appendChild(loading);

    // Initialize CanvasKit
    let CanvasKit: CanvasKit;
    try {
        CanvasKit = await CanvasKitInit({
            locateFile: (file: string) => `https://unpkg.com/canvaskit-wasm@0.40.0/bin/${file}`
        });
    } catch (err) {
        loading.textContent = 'Failed to load CanvasKit';
        console.error(err);
        return;
    }

    // Load font from jsDelivr (Roboto TTF)
    loading.textContent = 'Loading fonts...';
    let typeface: Typeface | null = null;
    try {
        const fontData = await loadFont('https://cdn.jsdelivr.net/fontsource/fonts/roboto@latest/latin-400-normal.ttf');
        typeface = CanvasKit.Typeface.MakeTypefaceFromData(fontData);
        if (!typeface) {
            console.warn('Failed to create typeface from font data');
            typeface = CanvasKit.Typeface.GetDefault();
        }
    } catch (err) {
        console.warn('Failed to load font, using default', err);
        typeface = CanvasKit.Typeface.GetDefault();
    }

    // Remove loading message
    loading.remove();

    // Create canvas element
    const canvas = document.createElement('canvas');
    canvas.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    `;
    container.appendChild(canvas);

    // Set canvas size to match device pixels
    const dpr = window.devicePixelRatio || 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Create Skia surface
    let surface: Surface | null = CanvasKit.MakeWebGLCanvasSurface(canvas);
    if (!surface) {
        // Fallback to software rendering
        surface = CanvasKit.MakeSWCanvasSurface(canvas);
    }
    if (!surface) {
        console.error('Failed to create Skia surface');
        return;
    }

    // Scale for device pixel ratio
    surface.getCanvas().scale(dpr, dpr);

    let currentStyle: StarMapPixelStyle | null = null;

    const callbacks: MenuCallbacks = {
        onStartGame: () => {
            strudelAudio.triggerTransitionStart();
            console.log('Starting game...');
        },
        onOptions: () => {
            strudelAudio.triggerMenuSelect();
            console.log('Showing options...');
        }
    };

    const TOTAL_RIM_STEPS = 10;
    const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.floor(v)));
    let rimStep = clampInt(Number(localStorage.getItem('axiom.menu.rimStep') ?? 4), 1, TOTAL_RIM_STEPS);
    let orbitalLinesEnabled = true;

    const createStyle = (): StarMapPixelStyle => {
        // Create a new surface for the style (to reset scale)
        const styleSurface = CanvasKit.MakeWebGLCanvasSurface(canvas) ||
            CanvasKit.MakeSWCanvasSurface(canvas);
        if (!styleSurface) {
            throw new Error('Failed to create surface');
        }
        styleSurface.getCanvas().scale(dpr, dpr);
        return new StarMapPixelStyle(CanvasKit, styleSurface, callbacks, width, height, typeface);
    };

    const initStyle = () => {
        if (currentStyle) {
            currentStyle.destroy();
        }
        currentStyle = createStyle();
        currentStyle.init();

        // Apply persisted settings
        currentStyle.setShowOrbitalLines(orbitalLinesEnabled);
        currentStyle.setUnlockStep(rimStep, TOTAL_RIM_STEPS);

        // Request ambient audio (will only start once init is complete and not muted)
        strudelAudio.setStyle('starmap-pixel');
    };

    // Create bottom-right UI controls
    const controlsContainer = document.createElement('div');
    controlsContainer.style.cssText = `
        position: absolute;
        bottom: 20px;
        right: 20px;
        display: flex;
        gap: 12px;
        z-index: 10;
    `;
    container.appendChild(controlsContainer);

    // Center camera button
    const centerBtn = document.createElement('button');
    centerBtn.style.cssText = `
        width: 32px;
        height: 32px;
        background: transparent;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: rgba(255,255,255,0.6);
        transition: all 0.2s;
    `;
    centerBtn.innerHTML = '⌖';
    centerBtn.title = 'Center View (R)';
    centerBtn.addEventListener('mouseenter', () => {
        centerBtn.style.borderColor = 'rgba(255,255,255,0.6)';
        centerBtn.style.color = 'rgba(255,255,255,0.9)';
    });
    centerBtn.addEventListener('mouseleave', () => {
        centerBtn.style.borderColor = 'rgba(255,255,255,0.3)';
        centerBtn.style.color = 'rgba(255,255,255,0.6)';
    });
    centerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentStyle?.resetCamera(true);
    });
    controlsContainer.appendChild(centerBtn);

    // Music toggle button
    const musicBtn = document.createElement('button');
    musicBtn.style.cssText = `
        width: 32px;
        height: 32px;
        background: transparent;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: rgba(255,255,255,0.6);
        transition: all 0.2s;
    `;
    musicBtn.innerHTML = '♪';
    musicBtn.title = 'Toggle Music';
    musicBtn.addEventListener('mouseenter', () => {
        musicBtn.style.borderColor = 'rgba(255,255,255,0.6)';
        musicBtn.style.color = 'rgba(255,255,255,0.9)';
    });
    musicBtn.addEventListener('mouseleave', () => {
        musicBtn.style.borderColor = 'rgba(255,255,255,0.3)';
        musicBtn.style.color = strudelAudio.isMuted() ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)';
    });
    musicBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startAudio();
        const muted = strudelAudio.toggleMute();
        musicBtn.innerHTML = muted ? '♪̸' : '♪';
        musicBtn.style.color = muted ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.6)';
        musicBtn.style.textDecoration = muted ? 'line-through' : 'none';
    });
    controlsContainer.appendChild(musicBtn);

    // Soundtrack button
    const trackBtn = document.createElement('button');
    trackBtn.style.cssText = `
        height: 32px;
        padding: 0 12px;
        background: transparent;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-family: monospace;
        color: rgba(255,255,255,0.6);
        transition: all 0.2s;
        white-space: nowrap;
    `;
    trackBtn.textContent = strudelAudio.getSoundtrackName();
    trackBtn.title = 'Change Soundtrack';
    trackBtn.addEventListener('mouseenter', () => {
        trackBtn.style.borderColor = 'rgba(255,255,255,0.6)';
        trackBtn.style.color = 'rgba(255,255,255,0.9)';
    });
    trackBtn.addEventListener('mouseleave', () => {
        trackBtn.style.borderColor = 'rgba(255,255,255,0.3)';
        trackBtn.style.color = 'rgba(255,255,255,0.6)';
    });
    trackBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startAudio();
        const newName = strudelAudio.nextSoundtrack();
        trackBtn.textContent = newName;
    });

    // Keep the init promise alive (avoid unhandled rejection noise in case audio init fails)
    void audioInit;
    controlsContainer.appendChild(trackBtn);

    // Settings button and panel
    const settingsBtn = document.createElement('button');
    settingsBtn.style.cssText = `
        width: 32px;
        height: 32px;
        background: transparent;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        color: rgba(255,255,255,0.6);
        transition: all 0.2s;
    `;
    settingsBtn.innerHTML = '⚙';
    settingsBtn.title = 'Settings';

    // Settings panel
    const settingsPanel = document.createElement('div');
    settingsPanel.style.cssText = `
        position: absolute;
        bottom: 60px;
        right: 0;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px;
        padding: 12px 16px;
        min-width: 180px;
        display: none;
        flex-direction: column;
        gap: 10px;
        font-family: monospace;
        font-size: 12px;
        color: rgba(255,255,255,0.8);
    `;

    // Helper to create toggle option
    const createToggle = (label: string, initialState: boolean, onChange: (checked: boolean) => void) => {
        const row = document.createElement('label');
        row.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            cursor: pointer;
            padding: 4px 0;
        `;

        const text = document.createElement('span');
        text.textContent = label;

        const toggle = document.createElement('div');
        toggle.style.cssText = `
            width: 36px;
            height: 18px;
            background: ${initialState ? 'rgba(100, 200, 255, 0.6)' : 'rgba(255,255,255,0.2)'};
            border-radius: 9px;
            position: relative;
            transition: background 0.2s;
        `;

        const knob = document.createElement('div');
        knob.style.cssText = `
            width: 14px;
            height: 14px;
            background: white;
            border-radius: 50%;
            position: absolute;
            top: 2px;
            left: ${initialState ? '20px' : '2px'};
            transition: left 0.2s;
        `;
        toggle.appendChild(knob);

        let state = initialState;
        row.addEventListener('click', (e) => {
            e.stopPropagation();
            state = !state;
            toggle.style.background = state ? 'rgba(100, 200, 255, 0.6)' : 'rgba(255,255,255,0.2)';
            knob.style.left = state ? '20px' : '2px';
            onChange(state);
        });

        row.appendChild(text);
        row.appendChild(toggle);
        return row;
    };

    // Orbital Lines toggle
    const orbitalToggle = createToggle('Orbital Lines', orbitalLinesEnabled, (checked) => {
        orbitalLinesEnabled = checked;
        if (currentStyle) {
            currentStyle.setShowOrbitalLines(checked);
        }
    });
    settingsPanel.appendChild(orbitalToggle);

    // Rim unlock stepper (hard blackout radius)
    const rimRow = document.createElement('div');
    rimRow.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 4px 0;
    `;

    const rimLabel = document.createElement('span');
    rimLabel.textContent = 'Rim Unlock';

    const rimControls = document.createElement('div');
    rimControls.style.cssText = `display: flex; align-items: center; gap: 8px;`;

    const rimValue = document.createElement('span');
    rimValue.style.cssText = `
        min-width: 44px;
        text-align: right;
        opacity: 0.85;
    `;
    const updateRimValue = () => {
        rimValue.textContent = `${rimStep}/${TOTAL_RIM_STEPS}`;
    };
    updateRimValue();

    const makeMiniBtn = (text: string, title: string) => {
        const b = document.createElement('button');
        b.textContent = text;
        b.title = title;
        b.style.cssText = `
            width: 24px;
            height: 20px;
            padding: 0;
            background: transparent;
            border: 1px solid rgba(255,255,255,0.25);
            border-radius: 4px;
            cursor: pointer;
            color: rgba(255,255,255,0.7);
            font-family: monospace;
            font-size: 12px;
            line-height: 18px;
        `;
        b.addEventListener('mouseenter', () => (b.style.borderColor = 'rgba(255,255,255,0.5)'));
        b.addEventListener('mouseleave', () => (b.style.borderColor = 'rgba(255,255,255,0.25)'));
        return b;
    };

    const applyRimStep = () => {
        localStorage.setItem('axiom.menu.rimStep', String(rimStep));
        updateRimValue();
        currentStyle?.setUnlockStep(rimStep, TOTAL_RIM_STEPS);
    };

    const rimDown = makeMiniBtn('-', 'Reveal less');
    rimDown.addEventListener('click', (e) => {
        e.stopPropagation();
        rimStep = clampInt(rimStep - 1, 1, TOTAL_RIM_STEPS);
        applyRimStep();
    });

    const rimUp = makeMiniBtn('+', 'Reveal more');
    rimUp.addEventListener('click', (e) => {
        e.stopPropagation();
        rimStep = clampInt(rimStep + 1, 1, TOTAL_RIM_STEPS);
        applyRimStep();
    });

    rimControls.appendChild(rimDown);
    rimControls.appendChild(rimUp);
    rimControls.appendChild(rimValue);

    rimRow.appendChild(rimLabel);
    rimRow.appendChild(rimControls);
    settingsPanel.appendChild(rimRow);

    controlsContainer.appendChild(settingsPanel);

    let settingsOpen = false;
    settingsBtn.addEventListener('mouseenter', () => {
        settingsBtn.style.borderColor = 'rgba(255,255,255,0.6)';
        settingsBtn.style.color = 'rgba(255,255,255,0.9)';
    });
    settingsBtn.addEventListener('mouseleave', () => {
        if (!settingsOpen) {
            settingsBtn.style.borderColor = 'rgba(255,255,255,0.3)';
            settingsBtn.style.color = 'rgba(255,255,255,0.6)';
        }
    });
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsOpen = !settingsOpen;
        settingsPanel.style.display = settingsOpen ? 'flex' : 'none';
        settingsBtn.style.borderColor = settingsOpen ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)';
        settingsBtn.style.color = settingsOpen ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)';
    });

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (settingsOpen && !controlsContainer.contains(e.target as Node)) {
            settingsOpen = false;
            settingsPanel.style.display = 'none';
            settingsBtn.style.borderColor = 'rgba(255,255,255,0.3)';
            settingsBtn.style.color = 'rgba(255,255,255,0.6)';
        }
    });

    controlsContainer.appendChild(settingsBtn);

    // Menu navigation sounds
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'w' || e.key === 's') {
            strudelAudio.triggerMenuNav();
        } else if (e.key === 'Enter' || e.key === ' ') {
            strudelAudio.triggerMenuSelect();
        }
    });

    // Handle resize
    window.addEventListener('resize', () => {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        canvas.width = newWidth * dpr;
        canvas.height = newHeight * dpr;

        if (currentStyle) {
            currentStyle.onResize(newWidth, newHeight);
            initStyle();
        }
    });

	    // Start
	    initStyle();

	    sceneReady = true;
	    if (!startRequested) {
	        if (splashHint) splashHint.textContent = 'Click, tap, or press Enter to start';
	    }
	    tryRevealSplash();
	    void audioInit;
	};

export default startGame;
