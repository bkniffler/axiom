import { initStrudel } from '@strudel/web';
import { getAudioContext } from '@strudel/webaudio';

// Declare global Strudel functions that become available after initStrudel()
interface StrudelPattern {
  slow: (n: number) => StrudelPattern;
  fast: (n: number) => StrudelPattern;
  gain: (n: number) => StrudelPattern;
  room: (n: number) => StrudelPattern;
  lpf: (n: number) => StrudelPattern;
  hpf: (n: number) => StrudelPattern;
  delay: (n: number) => StrudelPattern;
  pan: (n: number) => StrudelPattern;
  sound: (synth: string) => StrudelPattern;
  s: (synth: string) => StrudelPattern;
  play: () => void;
}

declare global {
  function s(pattern: string): StrudelPattern;
  function note(pattern: string): StrudelPattern;
  function stack(...patterns: StrudelPattern[]): StrudelPattern;
  function hush(): void;
}

type AudioStyle = 'starmap-pixel' | null;

type SoundtrackId = 'first-light';

const SOUNDTRACKS: { id: SoundtrackId; name: string }[] = [
  { id: 'first-light', name: 'First Light' },
];

class StrudelAudioManager {
  private initialized = false;
  private started = false;
  private startRequested = false;
  private unlocked = false;
  private currentStyle: AudioStyle = null;
  private muted = false;
  private currentSoundtrack: SoundtrackId = 'first-light';
  private onMuteChange: ((muted: boolean) => void) | null = null;
  private onSoundtrackChange: ((name: string) => void) | null = null;

  async init(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Strudel (synths + scheduler). Avoid loading large sample packs here so
      // ambient music can start quickly; sample loading can be added later if needed.
      await initStrudel();
      this.initialized = true;
      console.log('Strudel audio initialized');

      if (this.startRequested) {
        await this.start();
      }

      if (this.currentStyle && !this.muted) {
        this.startAmbient(this.currentStyle);
      }
    } catch (err) {
      console.warn('Failed to initialize Strudel:', err);
    }
  }

  async start(): Promise<void> {
    this.startRequested = true;
    if (this.started) return;
    if (!this.initialized) return;
    this.started = true;
  }

  async setStyle(style: AudioStyle): Promise<void> {
    if (style === this.currentStyle) return;

    this.currentStyle = style;

    if (!this.initialized) return;

    // Stop current ambient
    this.stopAmbient();

    if (!style) return;
    if (this.muted) return;

    // Start ambient pattern for the style
    this.startAmbient(style);
  }

  async unlock(): Promise<boolean> {
    try {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.unlocked = ctx.state === 'running';
      return this.unlocked;
    } catch {
      return false;
    }
  }

  isUnlocked(): boolean {
    return this.unlocked;
  }

  private startAmbient(style: AudioStyle): void {
    if (!style || typeof stack !== 'function') return;

    try {
      switch (this.currentSoundtrack) {
        case 'first-light':
          // ═══════════════════════════════════════════════════════════════
          // FIRST LIGHT - The moment of dawn from orbit
          // Inspired by: Star Citizen's majestic moments, Interstellar
          // Key: Eb Major (bright, hopeful, cinematic)
          // ═══════════════════════════════════════════════════════════════
          stack(
            // === BASS: 64-beat epic progression ===
            // Eb → Bb → Cm → Ab → Eb → Bb → Gm → Ab (classic cinematic)
            note(
              'eb1 ~ ~ ~ ~ ~ ~ ~ bb0 ~ ~ ~ ~ ~ ~ ~ c1 ~ ~ ~ ~ ~ ~ ~ ab0 ~ ~ ~ ~ ~ ~ ~ eb1 ~ ~ ~ ~ ~ ~ ~ bb0 ~ ~ ~ ~ ~ ~ ~ g1 ~ ~ ~ ~ ~ ~ ~ ab0 ~ ~ ~ ~ ~ ~ ~'
            )
              .slow(64)
              .sound('sawtooth')
              .lpf(90)
              .gain(0.13),

            // === PAD: Rich orchestral chords (48-beat, phases beautifully) ===
            // Full triads with 7ths - warm and enveloping
            note(
              'eb3 g3 bb3 ~ ~ ~ ~ ~ ~ ~ ~ ~ bb2 d3 f3 ~ ~ ~ ~ ~ ~ ~ ~ ~ c3 eb3 g3 ~ ~ ~ ~ ~ ~ ~ ~ ~ ab2 c3 eb3 ~ ~ ~ ~ ~ ~ ~ ~ ~'
            )
              .slow(48)
              .sound('triangle')
              .lpf(900)
              .gain(0.04)
              .room(0.88),

            // === MAIN MELODY: The singable theme (32-beat phrase) ===
            // A true melody with tension, climax, and resolution
            // Rises through the first half, peaks on the high Eb, gently descends
            note(
              '~ ~ ~ ~ eb4 ~ g4 ~ bb4 ~ ~ ab4 g4 ~ eb4 ~ ~ ~ f4 ~ g4 ~ ab4 ~ bb4 ~ ~ c5 ~ bb4 ~ ab4 g4 ~'
            )
              .slow(32)
              .sound('triangle')
              .lpf(2200)
              .gain(0.045)
              .room(0.82)
              .delay(0.15),

            // === COUNTER MELODY: Answers the main theme (37-beat prime) ===
            // Weaves around the melody, creating call and response
            note(
              '~ ~ bb4 ~ ~ ~ ~ c5 ~ ~ ~ ~ ~ bb4 ~ ~ ~ ab4 ~ ~ ~ ~ ~ ~ g4 ~ ~ ~ ~ ~ ~ f4 ~ ~ ~ ~ ~ ~'
            )
              .slow(37)
              .sound('sine')
              .lpf(2800)
              .gain(0.025)
              .room(0.85)
              .pan(0.65),

            // === HIGH STRINGS: Soaring sustains (29-beat prime) ===
            // Long held notes that add grandeur
            note(
              '~ ~ ~ ~ ~ ~ ~ ~ ~ ~ eb5 ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ bb4 ~ ~ ~'
            )
              .slow(29)
              .sound('sine')
              .lpf(3200)
              .gain(0.018)
              .room(0.92)
              .delay(0.3),

            // === MIDDLE VOICE: Harmonic fill (19-beat prime) ===
            note('g4 ~ ~ ~ ~ ~ ab4 ~ ~ ~ ~ ~ ~ ~ bb4 ~ ~ ~ ~')
              .slow(19)
              .sound('triangle')
              .lpf(1600)
              .gain(0.02)
              .room(0.8)
              .pan(0.35),

            // === BASS PULSE: Gentle rhythmic foundation (8-beat) ===
            note('eb2 ~ ~ ~ bb1 ~ ~ ~')
              .slow(8)
              .sound('sine')
              .lpf(150)
              .gain(0.06)
              .room(0.7),

            // === SHIMMER: Highest register sparkle (23-beat prime) ===
            note('~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~ g5 ~ ~ ~ ~ ~ ~ bb5 ~ ~')
              .slow(23)
              .sound('sine')
              .lpf(4500)
              .gain(0.008)
              .room(0.95)
              .delay(0.45)
          ).play();
          break;
      }
    } catch (err) {
      console.warn('Failed to start ambient audio:', err);
    }
  }

  private stopAmbient(): void {
    if (typeof hush === 'function') {
      try {
        hush();
      } catch (e) {
        // Ignore stop errors
      }
    }
  }

  // Reactive triggers - using Web Audio API for instant one-shot sounds
  private audioCtx: AudioContext | null = null;

  private ensureAudioContext(): AudioContext | null {
    if (!this.audioCtx) {
      try {
        this.audioCtx = new AudioContext();
      } catch (e) {
        return null;
      }
    }
    // Resume if suspended (autoplay policy)
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  private playTone(frequency: number, duration: number, volume = 0.1): void {
    const ctx = this.ensureAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.value = frequency;

    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  triggerTransitionStart(): void {
    // Descending sweep - instant
    this.playTone(523, 0.08, 0.12);
    setTimeout(() => this.playTone(392, 0.08, 0.1), 30);
    setTimeout(() => this.playTone(262, 0.1, 0.08), 60);
  }

  triggerMenuSelect(): void {
    // Quick ascending blip
    this.playTone(660, 0.06, 0.1);
    setTimeout(() => this.playTone(880, 0.08, 0.1), 30);
  }

  triggerMenuNav(): void {
    // Single instant blip
    this.playTone(440, 0.03, 0.08);
  }

  stop(): void {
    this.stopAmbient();
    this.started = false;
    this.currentStyle = null;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopAmbient();
    } else if (this.currentStyle) {
      this.startAmbient(this.currentStyle);
    }
    this.onMuteChange?.(this.muted);
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setOnMuteChange(callback: (muted: boolean) => void): void {
    this.onMuteChange = callback;
  }

  setOnSoundtrackChange(callback: (name: string) => void): void {
    this.onSoundtrackChange = callback;
  }

  nextSoundtrack(): string {
    const currentIndex = SOUNDTRACKS.findIndex(
      (s) => s.id === this.currentSoundtrack
    );
    const nextIndex = (currentIndex + 1) % SOUNDTRACKS.length;
    this.currentSoundtrack = SOUNDTRACKS[nextIndex].id;

    // Restart ambient with new soundtrack if playing
    if (this.currentStyle && !this.muted) {
      this.stopAmbient();
      this.startAmbient(this.currentStyle);
    }

    const name = SOUNDTRACKS[nextIndex].name;
    this.onSoundtrackChange?.(name);
    return name;
  }

  getSoundtrackName(): string {
    const track = SOUNDTRACKS.find((s) => s.id === this.currentSoundtrack);
    return track?.name || 'Unknown';
  }
}

// Singleton instance
export const strudelAudio = new StrudelAudioManager();
