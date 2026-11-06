import { FFmpegModuleDef } from '../utils/ffmpegEngine';

export interface VideoMetadata {
  filename: string;
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  codec: string;
  audioCodec: string;
  sizeMb: number;
  isCustomFile: boolean;
}

export class StudioVideoPreview {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private videoEl: HTMLVideoElement;
  private isPlaying = false;
  private simTime = 2.4;
  private lastTick = 0;
  private rafId: number | null = null;
  private currentModule: FFmpegModuleDef | null = null;
  private currentValues: Record<string, any> = {};
  private metadata: VideoMetadata = {
    filename: 'studio_showreel_1080p.mp4',
    width: 1920,
    height: 1080,
    durationSec: 42.5,
    fps: 60,
    codec: 'h264 (High)',
    audioCodec: 'aac (48 kHz, stereo)',
    sizeMb: 68.4,
    isCustomFile: false,
  };
  private onMetadataChange?: (meta: VideoMetadata) => void;

  constructor(canvas: HTMLCanvasElement, onMetadataChange?: (meta: VideoMetadata) => void) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D Canvas Context unavailable');
    this.ctx = ctx;
    this.onMetadataChange = onMetadataChange;

    this.videoEl = document.createElement('video');
    this.videoEl.muted = true;
    this.videoEl.loop = true;
    this.videoEl.playsInline = true;

    this.renderFrame();
  }

  public getMetadata(): VideoMetadata {
    return this.metadata;
  }

  public loadUserVideoFile(file: File): void {
    const url = URL.createObjectURL(file);
    this.videoEl.src = url;
    this.videoEl.onloadedmetadata = () => {
      const sizeMb = Number((file.size / (1024 * 1024)).toFixed(2));
      this.metadata = {
        filename: file.name,
        width: this.videoEl.videoWidth || 1920,
        height: this.videoEl.videoHeight || 1080,
        durationSec: Number((this.videoEl.duration || 30).toFixed(1)),
        fps: 30,
        codec: 'h264 / container stream',
        audioCodec: 'aac / stereo',
        sizeMb: Math.max(0.1, sizeMb),
        isCustomFile: true,
      };
      this.onMetadataChange?.(this.metadata);
      this.videoEl.currentTime = Math.min(1.0, this.videoEl.duration / 4);
      this.renderFrame();
    };
    this.videoEl.ontimeupdate = () => {
      if (!this.isPlaying) this.renderFrame();
    };
  }

  public updateFilterState(mod: FFmpegModuleDef, values: Record<string, any>): void {
    this.currentModule = mod;
    this.currentValues = { ...values };
    this.renderFrame();
  }

  public togglePlay(): boolean {
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      if (this.metadata.isCustomFile) {
        this.videoEl.play().catch(() => {});
      }
      this.lastTick = performance.now();
      this.loop(this.lastTick);
    } else {
      if (this.metadata.isCustomFile) {
        this.videoEl.pause();
      }
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      this.renderFrame();
    }
    return this.isPlaying;
  }

  public stepTime(deltaSec: number): void {
    this.simTime = Math.max(0, (this.simTime + deltaSec) % this.metadata.durationSec);
    if (this.metadata.isCustomFile && this.videoEl.duration) {
      this.videoEl.currentTime = this.simTime % this.videoEl.duration;
    }
    this.renderFrame();
  }

  private loop = (now: number) => {
    if (!this.isPlaying) return;
    const elapsed = (now - this.lastTick) / 1000;
    if (elapsed >= 1 / 20) {
      const speed =
        this.currentModule?.id === 'playback_speed'
          ? Number(this.currentValues.speedFactor || 1.0)
          : 1.0;
      this.simTime = (this.simTime + elapsed * speed) % this.metadata.durationSec;
      this.lastTick = now;
      this.renderFrame();
    }
    this.rafId = requestAnimationFrame(this.loop);
  };

  public renderFrame(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    const ctx = this.ctx;
    const modId = this.currentModule?.id || '';
    const vals = this.currentValues;

    ctx.save();
    ctx.clearRect(0, 0, w, h);

    // Apply CSS-equivalent canvas filter for visual effects
    let filterStr = 'none';
    if (modId === 'visual_effects') {
      const fx = String(vals.effectType || 'grayscale');
      const rad = Number(vals.blurRadius || 10);
      if (fx === 'grayscale') filterStr = 'grayscale(100%)';
      else if (fx === 'blur') filterStr = `blur(${Math.min(16, Math.round(rad / 2))}px)`;
      else if (fx === 'sepia') filterStr = 'sepia(95%) contrast(108%)';
      else if (fx === 'vibrant') filterStr = 'contrast(120%) saturate(145%) brightness(104%)';
      else if (fx === 'sharpen') filterStr = 'contrast(125%)';
    }
    ctx.filter = filterStr;

    // Handle geometric rotation/flip
    if (modId === 'rotate_flip') {
      const mode = String(vals.transformMode || '90_cw');
      ctx.translate(w / 2, h / 2);
      if (mode === '90_cw') ctx.rotate(Math.PI / 2);
      else if (mode === '90_ccw') ctx.rotate(-Math.PI / 2);
      else if (mode === '180') ctx.rotate(Math.PI);
      else if (mode === 'hflip') ctx.scale(-1, 1);
      else if (mode === 'vflip') ctx.scale(1, -1);
      ctx.translate(-w / 2, -h / 2);
    }

    // Draw base video content (either uploaded HTMLVideoElement or procedural cinema test card)
    if (modId === 'social_9_16') {
      // Draw blurred background full frame, then sharp 9:16 column in center
      ctx.save();
      ctx.filter = `blur(${Math.min(24, Number(vals.bgBlur || 35) / 2)}px) brightness(0.65)`;
      this.drawSourceScene(ctx, 0, 0, w, h);
      ctx.restore();

      const colW = Math.round(h * (9 / 16));
      const colX = Math.round((w - colW) / 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(colX, 0, colW, h);
      ctx.clip();
      const fgH = Math.round(colW * (9 / 16));
      const fgY = Math.round((h - fgH) / 2);
      this.drawSourceScene(ctx, colX, fgY, colW, fgH);
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.strokeRect(colX + 1, 1, colW - 2, h - 2);
      ctx.restore();
    } else {
      this.drawSourceScene(ctx, 0, 0, w, h);
    }

    ctx.restore();

    // Overlays that sit on top of the scene
    if (modId === 'crop_video') {
      this.drawCropOverlay(ctx, w, h, String(vals.cropPreset || 'square_center'));
    } else if (modId === 'watermark_overlay') {
      this.drawWatermarkOverlay(
        ctx,
        w,
        h,
        String(vals.position || 'bottom_right'),
        Number(vals.logoWidth || 180),
        String(vals.logoPath || 'brand_logo.png')
      );
    } else if (modId === 'subtitle_burn' || modId === 'subtitle_soft') {
      this.drawSubtitleOverlay(
        ctx,
        w,
        h,
        Number(vals.fontSize || 22),
        modId === 'subtitle_soft'
      );
    }

    // Timecode & telemetry HUD inside preview canvas
    ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
    ctx.fillRect(12, 12, 235, 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '500 12px "JetBrains Mono", monospace';
    const mins = Math.floor(this.simTime / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(this.simTime % 60)
      .toString()
      .padStart(2, '0');
    const ms = Math.floor((this.simTime % 1) * 100)
      .toString()
      .padStart(2, '0');
    ctx.fillText(`TC 00:${mins}:${secs}.${ms} · ${this.metadata.width}x${this.metadata.height}`, 20, 30);
  }

  private drawSourceScene(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    if (this.metadata.isCustomFile && this.videoEl.readyState >= 2) {
      ctx.drawImage(this.videoEl, x, y, w, h);
      return;
    }

    // Rich procedural studio cinema scene so preview works immediately without external assets
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(0.5, '#1e293b');
    grad.addColorStop(1, '#090d16');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    // Horizon grid & moving waveform / studio subject
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.14)';
    ctx.lineWidth = 1;
    const step = 40;
    for (let gx = x; gx < x + w; gx += step) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = y; gy < y + h; gy += step) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }

    // Animated color grading reference bars & motion orb
    const palette = ['#ef4444', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6'];
    const barW = Math.floor((w * 0.45) / palette.length);
    const startX = x + Math.floor(w * 0.275);
    const barY = y + Math.floor(h * 0.68);
    palette.forEach((col, idx) => {
      ctx.fillStyle = col;
      ctx.fillRect(startX + idx * barW, barY, barW - 4, 24);
    });

    // Moving camera subject
    const t = this.simTime;
    const cx = x + w * 0.5 + Math.cos(t * 1.1) * (w * 0.18);
    const cy = y + h * 0.42 + Math.sin(t * 1.7) * (h * 0.1);

    const orbGrad = ctx.createRadialGradient(cx - 8, cy - 8, 4, cx, cy, 42);
    orbGrad.addColorStop(0, '#38bdf8');
    orbGrad.addColorStop(0.6, '#0284c7');
    orbGrad.addColorStop(1, 'rgba(2, 132, 199, 0)');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fill();

    // Crisp center ring
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawCropOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    preset: string
  ): void {
    let cw = h;
    let ch = h;
    if (preset === 'vertical_9_16') {
      cw = Math.round(h * (9 / 16));
      ch = h;
    } else if (preset === 'cinema_21_9') {
      cw = w;
      ch = Math.round(w * (9 / 21));
    } else if (preset === 'custom_80pct') {
      cw = Math.round(w * 0.8);
      ch = Math.round(h * 0.8);
    }
    const cx = Math.round((w - cw) / 2);
    const cy = Math.round((h - ch) / 2);

    ctx.fillStyle = 'rgba(2, 6, 23, 0.65)';
    ctx.fillRect(0, 0, w, cy);
    ctx.fillRect(0, cy + ch, w, h - (cy + ch));
    ctx.fillRect(0, cy, cx, ch);
    ctx.fillRect(cx + cw, cy, w - (cx + cw), ch);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(cx, cy, cw, ch);
    ctx.setLineDash([]);
  }

  private drawWatermarkOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    position: string,
    logoW: number,
    label: string
  ): void {
    const scaledW = Math.min(220, Math.max(70, Math.round(logoW * 0.55)));
    const scaledH = 34;
    const margin = 16;
    let lx = w - scaledW - margin;
    let ly = h - scaledH - margin;
    if (position === 'top_right') {
      lx = w - scaledW - margin;
      ly = margin;
    } else if (position === 'bottom_left') {
      lx = margin;
      ly = h - scaledH - margin;
    } else if (position === 'top_left') {
      lx = margin;
      ly = margin;
    } else if (position === 'center') {
      lx = Math.round((w - scaledW) / 2);
      ly = Math.round((h - scaledH) / 2);
    }

    ctx.fillStyle = 'rgba(14, 165, 233, 0.85)';
    ctx.fillRect(lx, ly, scaledW, scaledH);
    ctx.strokeStyle = '#e0f2fe';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(lx, ly, scaledW, scaledH);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(`LOGO: ${label.slice(0, 14)}`, lx + 8, ly + 21);
  }

  private drawSubtitleOverlay(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    fontSize: number,
    isSoft: boolean
  ): void {
    const pxSize = Math.min(26, Math.max(12, Math.round(fontSize * 0.75)));
    ctx.font = `600 ${pxSize}px "Plus Jakarta Sans", sans-serif`;
    const text = isSoft
      ? '[Soft-Subtitle Spur: Deutsch (mov_text)]'
      : '„Saubere FFmpeg-Videoverarbeitung mit Python subprocess.“';
    const textWidth = ctx.measureText(text).width;
    const bx = Math.round((w - textWidth) / 2) - 12;
    const by = h - 46;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
    ctx.fillRect(bx, by, textWidth + 24, pxSize + 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, bx + 12, by + pxSize + 3);
  }
}
