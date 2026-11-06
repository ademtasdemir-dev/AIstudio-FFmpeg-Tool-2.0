export type CategoryId =
  | 'cat1_frames'
  | 'cat2_basic'
  | 'cat3_codecs'
  | 'cat4_audio'
  | 'cat5_filters'
  | 'cat6_special';

export type HardwareType = 'cpu' | 'nvenc' | 'qsv' | 'amf' | 'videotoolbox';

export interface ParamExplanation {
  flag: string;
  value: string;
  title: string;
  description: string;
}

export interface ModuleField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'range';
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  options?: { value: string; label: string }[];
}

export interface FFmpegModuleDef {
  id: string;
  code: string;
  name: string;
  categoryId: CategoryId;
  categoryLabel: string;
  shortDesc: string;
  outputExt: string;
  outputSuffix: string;
  supportsHardwareAccel: boolean;
  fields: ModuleField[];
}

export interface CommandBuildResult {
  executable: string;
  args: string[];
  fullCommandString: string;
  outputPath: string;
  explanations: ParamExplanation[];
  pythonFunctionCode: string;
}

export const CATEGORIES: { id: CategoryId; title: string; count: number }[] = [
  { id: 'cat1_frames', title: '1. Bild- & Frame-Konvertierung', count: 3 },
  { id: 'cat2_basic', title: '2. Grundlegende Bearbeitung', count: 4 },
  { id: 'cat3_codecs', title: '3. Kompressor & Codecs', count: 3 },
  { id: 'cat4_audio', title: '4. Audio-Tools', count: 3 },
  { id: 'cat5_filters', title: '5. Fortgeschrittene Filter', count: 4 },
  { id: 'cat6_special', title: '6. Spezial (Logo, Subs & GPU)', count: 3 },
];

export const HARDWARE_ENCODERS: Record<
  HardwareType,
  { label: string; h264: string; hevc: string; desc: string }
> = {
  cpu: {
    label: 'CPU Software (libx264 / libx265)',
    h264: 'libx264',
    hevc: 'libx265',
    desc: 'Maximale Kompatibilität und beste Kompressionseffizienz pro Bit.',
  },
  nvenc: {
    label: 'NVIDIA GPU (h264_nvenc / hevc_nvenc)',
    h264: 'h264_nvenc',
    hevc: 'hevc_nvenc',
    desc: '5-10x schnelleres Encoding über dedizierte NVIDIA NVENC-Kerne.',
  },
  videotoolbox: {
    label: 'Apple Silicon (h264_videotoolbox)',
    h264: 'h264_videotoolbox',
    hevc: 'hevc_videotoolbox',
    desc: 'Hardware-Media-Engine für M1/M2/M3/M4 Macs.',
  },
  qsv: {
    label: 'Intel QuickSync (h264_qsv)',
    h264: 'h264_qsv',
    hevc: 'hevc_qsv',
    desc: 'Integrierte Intel-GPU-Beschleunigung.',
  },
  amf: {
    label: 'AMD Radeon (h264_amf)',
    h264: 'h264_amf',
    hevc: 'hevc_amf',
    desc: 'Hardware-Encoding für AMD Radeon GPUs.',
  },
};

export const FFMPEG_MODULES: FFmpegModuleDef[] = [
  // KATEGORIE 1: Bild- & Frame-Konvertierung
  {
    id: 'extract_frames',
    code: '1.1',
    name: 'Video in Einzelbilder zerlegen',
    categoryId: 'cat1_frames',
    categoryLabel: '1. Bild- & Frame-Konvertierung',
    shortDesc: 'Extrahiert durchnummerierte Einzelbilder (PNG/JPG) mit frei wählbarer Framerate.',
    outputExt: 'png',
    outputSuffix: '_frame_%04d',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'fps',
        label: 'Bilder pro Sekunde (FPS)',
        type: 'range',
        defaultValue: 1,
        min: 1,
        max: 30,
        step: 1,
        unit: 'fps',
      },
      {
        key: 'imageFormat',
        label: 'Bildformat',
        type: 'select',
        defaultValue: 'png',
        options: [
          { value: 'png', label: 'PNG (Verlustfrei)' },
          { value: 'jpg', label: 'JPG (Kompakt, -q:v 2)' },
        ],
      },
    ],
  },
  {
    id: 'gif_creator',
    code: '1.2',
    name: 'High-Quality GIF erstellen',
    categoryId: 'cat1_frames',
    categoryLabel: '1. Bild- & Frame-Konvertierung',
    shortDesc: 'Berechnet eine optimale 256-Farben-Palette (palettegen & paletteuse) gegen Farbrauschen.',
    outputExt: 'gif',
    outputSuffix: '_anim',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'fps',
        label: 'GIF Framerate',
        type: 'range',
        defaultValue: 15,
        min: 5,
        max: 30,
        step: 1,
        unit: 'fps',
      },
      {
        key: 'width',
        label: 'Zielbreite (Pixel)',
        type: 'select',
        defaultValue: '480',
        options: [
          { value: '320', label: '320 px (Kompakt)' },
          { value: '480', label: '480 px (Standard Web)' },
          { value: '640', label: '640 px (HD GIF)' },
          { value: '800', label: '800 px (Groß)' },
        ],
      },
      {
        key: 'loop',
        label: 'Endlosschleife (-loop 0)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'thumbnail_gen',
    code: '1.3',
    name: 'Thumbnail / Vorschaubild generieren',
    categoryId: 'cat1_frames',
    categoryLabel: '1. Bild- & Frame-Konvertierung',
    shortDesc: 'Springt per Fast-Seek zum gewünschten Zeitstempel und speichert exakt 1 Frame.',
    outputExt: 'jpg',
    outputSuffix: '_thumb',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'timestamp',
        label: 'Zeitstempel (HH:MM:SS)',
        type: 'text',
        defaultValue: '00:00:03',
      },
      {
        key: 'quality',
        label: 'JPEG Qualitätsstufe (1=Beste, 31=Schlechteste)',
        type: 'range',
        defaultValue: 2,
        min: 1,
        max: 15,
        step: 1,
      },
    ],
  },

  // KATEGORIE 2: Grundlegende Bearbeitung
  {
    id: 'trim_video',
    code: '2.1',
    name: 'Video schneiden (Trimmen)',
    categoryId: 'cat2_basic',
    categoryLabel: '2. Grundlegende Bearbeitung',
    shortDesc: 'Schneidet Start- und Endzeitpunkt verlustfrei (Stream-Copy) oder frame-genau.',
    outputExt: 'mp4',
    outputSuffix: '_cut',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'startTime',
        label: 'Startzeit (-ss)',
        type: 'text',
        defaultValue: '00:00:02',
      },
      {
        key: 'duration',
        label: 'Dauer in Sekunden (-t)',
        type: 'number',
        defaultValue: 10,
        min: 1,
        max: 3600,
        unit: 's',
      },
      {
        key: 'fastCut',
        label: 'Verlustfreier Schnitt (-c copy, ohne Re-Encoding)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'scale_video',
    code: '2.2',
    name: 'Auflösung ändern (Skalieren)',
    categoryId: 'cat2_basic',
    categoryLabel: '2. Grundlegende Bearbeitung',
    shortDesc: 'Passt die Videoauflösung proportional an und garantiert gerade Pixelwerte (-2).',
    outputExt: 'mp4',
    outputSuffix: '_scaled',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'resolution',
        label: 'Zielauflösung',
        type: 'select',
        defaultValue: '1280:-2',
        options: [
          { value: '3840:-2', label: '4K UHD (3840px Breite)' },
          { value: '1920:-2', label: '1080p Full HD (1920px Breite)' },
          { value: '1280:-2', label: '720p HD (1280px Breite)' },
          { value: '854:-2', label: '480p SD (854px Breite)' },
        ],
      },
      {
        key: 'crf',
        label: 'Qualitätsfaktor (CRF)',
        type: 'range',
        defaultValue: 20,
        min: 16,
        max: 30,
        step: 1,
      },
    ],
  },
  {
    id: 'crop_video',
    code: '2.3',
    name: 'Bildausschnitt zuschneiden (Crop)',
    categoryId: 'cat2_basic',
    categoryLabel: '2. Grundlegende Bearbeitung',
    shortDesc: 'Schneidet das Videobild auf 1:1 Quadrat, 9:16 Vertikal oder benutzerdefinierte Maße zu.',
    outputExt: 'mp4',
    outputSuffix: '_crop',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'cropPreset',
        label: 'Ausschnitt-Modus',
        type: 'select',
        defaultValue: 'square_center',
        options: [
          { value: 'square_center', label: '1:1 Quadrat (Zentriert)' },
          { value: 'vertical_9_16', label: '9:16 Vertikal (Zentriert)' },
          { value: 'cinema_21_9', label: '21:9 Cinema Widescreen' },
          { value: 'custom_80pct', label: '80% Zentrum (Ränder entfernen)' },
        ],
      },
    ],
  },
  {
    id: 'concat_videos',
    code: '2.4',
    name: 'Videos zusammenfügen (Concatenate)',
    categoryId: 'cat2_basic',
    categoryLabel: '2. Grundlegende Bearbeitung',
    shortDesc: 'Verbindet mehrere Videoclips über das FFmpeg Concat-Demuxer-Protokoll.',
    outputExt: 'mp4',
    outputSuffix: '_merged',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'secondVideo',
        label: 'Zweite Videodatei (Pfad)',
        type: 'text',
        defaultValue: 'clip_part2.mp4',
      },
      {
        key: 'thirdVideo',
        label: 'Optional dritte Videodatei',
        type: 'text',
        defaultValue: '',
      },
    ],
  },

  // KATEGORIE 3: Kompressor & Codecs
  {
    id: 'crf_compressor',
    code: '3.1',
    name: 'Video verkleinern (CRF H.264 / H.265)',
    categoryId: 'cat3_codecs',
    categoryLabel: '3. Kompressor & Codecs',
    shortDesc: 'Reduziert die Dateigröße drastisch bei konstanter visueller Qualität (CRF).',
    outputExt: 'mp4',
    outputSuffix: '_compressed',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'codecFamily',
        label: 'Video-Standard',
        type: 'select',
        defaultValue: 'h264',
        options: [
          { value: 'h264', label: 'H.264 / AVC (Universelle Kompatibilität)' },
          { value: 'hevc', label: 'H.265 / HEVC (Bis zu 45% kleinere Datei)' },
        ],
      },
      {
        key: 'crf',
        label: 'CRF-Wert (Niedriger = Besser, Höher = Kleiner)',
        type: 'range',
        defaultValue: 23,
        min: 16,
        max: 34,
        step: 1,
      },
      {
        key: 'preset',
        label: 'Encoder-Preset (Geschwindigkeit vs. Effizienz)',
        type: 'select',
        defaultValue: 'medium',
        options: [
          { value: 'ultrafast', label: 'ultrafast (Maximales Tempo)' },
          { value: 'fast', label: 'fast (Schnell)' },
          { value: 'medium', label: 'medium (Ausgewogen - Standard)' },
          { value: 'slow', label: 'slow (Hohe Kompression)' },
        ],
      },
      {
        key: 'faststart',
        label: 'Web-Streaming Optimierung (-movflags +faststart)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'remux_container',
    code: '3.2',
    name: 'Format konvertieren (MKV / MOV ➔ MP4)',
    categoryId: 'cat3_codecs',
    categoryLabel: '3. Kompressor & Codecs',
    shortDesc: 'Verlustfreies Umpatchen (Remuxing) des Containers in Sekundenbruchteilen.',
    outputExt: 'mp4',
    outputSuffix: '_remux',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'targetContainer',
        label: 'Ziel-Containerformat',
        type: 'select',
        defaultValue: 'mp4',
        options: [
          { value: 'mp4', label: 'MP4 (.mp4) - Web & Mobil Standard' },
          { value: 'mkv', label: 'Matroska (.mkv) - Multi-Stream Container' },
          { value: 'mov', label: 'QuickTime (.mov) - Apple / ProRes Schnitt' },
        ],
      },
      {
        key: 'faststart',
        label: 'MP4 Header an Dateianfang setzen (+faststart)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'target_size_mb',
    code: '3.3',
    name: 'Zielgröße in MB einhalten (Bitraten-Rechner)',
    categoryId: 'cat3_codecs',
    categoryLabel: '3. Kompressor & Codecs',
    shortDesc: 'Berechnet exakt die maximale Video-Bitrate für Limits (z. B. 10 MB / 25 MB Discord/Mail).',
    outputExt: 'mp4',
    outputSuffix: '_fitmb',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'targetMb',
        label: 'Maximale Dateigröße (MB)',
        type: 'number',
        defaultValue: 25,
        min: 1,
        max: 2000,
        unit: 'MB',
      },
      {
        key: 'durationSec',
        label: 'Videolänge in Sekunden',
        type: 'number',
        defaultValue: 60,
        min: 1,
        max: 7200,
        unit: 's',
      },
      {
        key: 'audioKbps',
        label: 'Reservierte Audio-Bitrate',
        type: 'select',
        defaultValue: '128',
        options: [
          { value: '96', label: '96 kbit/s (Sprache)' },
          { value: '128', label: '128 kbit/s (Standard)' },
          { value: '192', label: '192 kbit/s (Musik)' },
        ],
      },
    ],
  },

  // KATEGORIE 4: Audio-Tools
  {
    id: 'extract_audio',
    code: '4.1',
    name: 'Tonspur extrahieren (MP3 / AAC / WAV)',
    categoryId: 'cat4_audio',
    categoryLabel: '4. Audio-Tools',
    shortDesc: 'Deaktiviert die Video-Pipeline (-vn) und speichert die reine Audiospur.',
    outputExt: 'mp3',
    outputSuffix: '_audio',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'audioFormat',
        label: 'Audio-Zielformat',
        type: 'select',
        defaultValue: 'mp3',
        options: [
          { value: 'mp3', label: 'MP3 (libmp3lame)' },
          { value: 'aac', label: 'AAC (.m4a / .aac)' },
          { value: 'wav', label: 'WAV 16-Bit PCM (Unkomprimiert)' },
        ],
      },
      {
        key: 'bitrate',
        label: 'Audio-Bitrate',
        type: 'select',
        defaultValue: '192k',
        options: [
          { value: '128k', label: '128 kbit/s' },
          { value: '192k', label: '192 kbit/s (Empfohlen)' },
          { value: '320k', label: '320 kbit/s (Maximum MP3)' },
        ],
      },
    ],
  },
  {
    id: 'mute_video',
    code: '4.2',
    name: 'Audio stummschalten (Tonspur entfernen)',
    categoryId: 'cat4_audio',
    categoryLabel: '4. Audio-Tools',
    shortDesc: 'Entfernt alle Tonspuren (-an) bei 1:1 Kopie des Videostreams (-c:v copy).',
    outputExt: 'mp4',
    outputSuffix: '_muted',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'keepMetadata',
        label: 'Container-Metadaten beibehalten',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },
  {
    id: 'replace_audio',
    code: '4.3',
    name: 'Neue Tonspur hinzufügen / ersetzen',
    categoryId: 'cat4_audio',
    categoryLabel: '4. Audio-Tools',
    shortDesc: 'Routet Video aus Datei 0 und neues Audio aus Datei 1 zusammen (-map 0:v:0 -map 1:a:0).',
    outputExt: 'mp4',
    outputSuffix: '_newaudio',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'externalAudio',
        label: 'Externe Audiodatei',
        type: 'text',
        defaultValue: 'soundtrack.mp3',
      },
      {
        key: 'volume',
        label: 'Lautstärke-Faktor (1.0 = 100%)',
        type: 'range',
        defaultValue: 1.0,
        min: 0.2,
        max: 2.0,
        step: 0.1,
        unit: 'x',
      },
      {
        key: 'shortest',
        label: 'Auf kürzeren Stream begrenzen (-shortest)',
        type: 'boolean',
        defaultValue: true,
      },
    ],
  },

  // KATEGORIE 5: Fortgeschrittene Filter
  {
    id: 'visual_effects',
    code: '5.1',
    name: 'Farbfilter & Bildeffekte (SW, Blur, Sepia)',
    categoryId: 'cat5_filters',
    categoryLabel: '5. Fortgeschrittene Filter',
    shortDesc: 'Wendet Videofilter (-vf) wie Monochrom, Boxblur, Unsharp-Mask oder Sepia an.',
    outputExt: 'mp4',
    outputSuffix: '_fx',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'effectType',
        label: 'Visueller Filter',
        type: 'select',
        defaultValue: 'grayscale',
        options: [
          { value: 'grayscale', label: 'Schwarz-Weiß (hue=s=0)' },
          { value: 'blur', label: 'Weichzeichner / Unschärfe (boxblur)' },
          { value: 'sharpen', label: 'Kanten schärfen (unsharp=5:5:1.2)' },
          { value: 'sepia', label: 'Vintage Sepia-Look (colorchannelmixer)' },
          { value: 'vibrant', label: 'Kräftige Farben & Kontrast (eq)' },
        ],
      },
      {
        key: 'blurRadius',
        label: 'Blur-Radius (nur bei Weichzeichner aktiv)',
        type: 'range',
        defaultValue: 10,
        min: 2,
        max: 30,
        step: 2,
        unit: 'px',
      },
    ],
  },
  {
    id: 'rotate_flip',
    code: '5.2',
    name: 'Video rotieren & spiegeln',
    categoryId: 'cat5_filters',
    categoryLabel: '5. Fortgeschrittene Filter',
    shortDesc: 'Dreht das Video um 90°/180° (transpose) oder spiegelt es horizontal/vertikal.',
    outputExt: 'mp4',
    outputSuffix: '_rotated',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'transformMode',
        label: 'Rotations- / Spiegelmodus',
        type: 'select',
        defaultValue: '90_cw',
        options: [
          { value: '90_cw', label: '90° im Uhrzeigersinn (transpose=1)' },
          { value: '90_ccw', label: '90° gegen Uhrzeigersinn (transpose=2)' },
          { value: '180', label: '180° Drehung (transpose=1,transpose=1)' },
          { value: 'hflip', label: 'Horizontal spiegeln (hflip)' },
          { value: 'vflip', label: 'Vertikal spiegeln (vflip)' },
        ],
      },
    ],
  },
  {
    id: 'playback_speed',
    code: '5.3',
    name: 'Geschwindigkeit ändern (Zeitraffer / Zeitlupe)',
    categoryId: 'cat5_filters',
    categoryLabel: '5. Fortgeschrittene Filter',
    shortDesc: 'Skaliert Video-Zeitstempel (setpts) und kaskadiert Audio-Tempo (atempo) ohne Pitch-Fehler.',
    outputExt: 'mp4',
    outputSuffix: '_speed',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'speedFactor',
        label: 'Wiedergabe-Faktor (0.25x = Zeitlupe, 4.0x = Zeitraffer)',
        type: 'select',
        defaultValue: '2.0',
        options: [
          { value: '0.25', label: '0.25x (Extreme Zeitlupe)' },
          { value: '0.5', label: '0.5x (Halbes Tempo / Slow-Mo)' },
          { value: '1.5', label: '1.5x (Leichter Zeitraffer)' },
          { value: '2.0', label: '2.0x (Doppelte Geschwindigkeit)' },
          { value: '4.0', label: '4.0x (4-fach Zeitraffer)' },
        ],
      },
    ],
  },
  {
    id: 'social_9_16',
    code: '5.4',
    name: 'Social Media 9:16 Auto-Blur (Shorts / Reels)',
    categoryId: 'cat5_filters',
    categoryLabel: '5. Fortgeschrittene Filter',
    shortDesc: 'Verwandelt 16:9-Videos in 1080x1920 Hochformat mit unscharfem Ambient-Hintergrund.',
    outputExt: 'mp4',
    outputSuffix: '_shorts_9x16',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'bgBlur',
        label: 'Hintergrund-Unschärfe',
        type: 'range',
        defaultValue: 35,
        min: 10,
        max: 60,
        step: 5,
        unit: 'px',
      },
    ],
  },

  // KATEGORIE 6: Spezial-Optionen
  {
    id: 'watermark_overlay',
    code: '6.1',
    name: 'Wasserzeichen / Logo einblenden',
    categoryId: 'cat6_special',
    categoryLabel: '6. Spezial (Logo, Subs & GPU)',
    shortDesc: 'Skaliert ein transparentes PNG-Logo und platziert es exakt in einer Ecke.',
    outputExt: 'mp4',
    outputSuffix: '_watermarked',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'logoPath',
        label: 'Logo-Datei (PNG)',
        type: 'text',
        defaultValue: 'brand_logo.png',
      },
      {
        key: 'position',
        label: 'Position im Video',
        type: 'select',
        defaultValue: 'bottom_right',
        options: [
          { value: 'bottom_right', label: 'Unten Rechts (W-w-20:H-h-20)' },
          { value: 'top_right', label: 'Oben Rechts (W-w-20:20)' },
          { value: 'bottom_left', label: 'Unten Links (20:H-h-20)' },
          { value: 'top_left', label: 'Oben Links (20:20)' },
          { value: 'center', label: 'Zentriert ((W-w)/2:(H-h)/2)' },
        ],
      },
      {
        key: 'logoWidth',
        label: 'Logo-Breite in Pixel',
        type: 'range',
        defaultValue: 180,
        min: 60,
        max: 400,
        step: 20,
        unit: 'px',
      },
    ],
  },
  {
    id: 'subtitle_burn',
    code: '6.2',
    name: 'Untertitel fest einbrennen (Hardcode SRT)',
    categoryId: 'cat6_special',
    categoryLabel: '6. Spezial (Logo, Subs & GPU)',
    shortDesc: 'Rendert .srt Untertitel mit anpassbarer Schriftgröße direkt in die Videopixel.',
    outputExt: 'mp4',
    outputSuffix: '_subbed',
    supportsHardwareAccel: true,
    fields: [
      {
        key: 'srtPath',
        label: 'Untertiteldatei (.srt)',
        type: 'text',
        defaultValue: 'untertitel_de.srt',
      },
      {
        key: 'fontSize',
        label: 'Schriftgröße (FontSize)',
        type: 'range',
        defaultValue: 22,
        min: 14,
        max: 36,
        step: 2,
        unit: 'pt',
      },
    ],
  },
  {
    id: 'subtitle_soft',
    code: '6.3',
    name: 'Untertitel als Spur einbetten (Soft-Subs)',
    categoryId: 'cat6_special',
    categoryLabel: '6. Spezial (Logo, Subs & GPU)',
    shortDesc: 'Fügt .srt als schaltbare Textspur hinzu (mov_text / srt) ohne Video-Neukodierung.',
    outputExt: 'mp4',
    outputSuffix: '_softsubs',
    supportsHardwareAccel: false,
    fields: [
      {
        key: 'srtPath',
        label: 'Untertiteldatei (.srt)',
        type: 'text',
        defaultValue: 'untertitel_de.srt',
      },
      {
        key: 'languageCode',
        label: 'Sprach-Metadaten (ISO 639-2)',
        type: 'select',
        defaultValue: 'ger',
        options: [
          { value: 'ger', label: 'Deutsch (ger)' },
          { value: 'eng', label: 'Englisch (eng)' },
          { value: 'fra', label: 'Französisch (fra)' },
          { value: 'spa', label: 'Spanisch (spa)' },
        ],
      },
    ],
  },
];

export function buildCascadedAtempo(speed: number): string {
  const filters: string[] = [];
  let remaining = speed;
  while (remaining > 2.0) {
    filters.push('atempo=2.0');
    remaining /= 2.0;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining /= 0.5;
  }
  filters.push(`atempo=${Number(remaining.toFixed(4))}`);
  return filters.join(',');
}

export function calculateTargetBitrateKbps(
  targetMb: number,
  durationSec: number,
  audioKbps: number
): number {
  const safeDuration = Math.max(1, durationSec);
  const totalKilobits = targetMb * 8192;
  const totalRateKbps = totalKilobits / safeDuration;
  return Math.max(100, Math.floor(totalRateKbps - audioKbps));
}

export function deriveOutputFilename(
  inputFilename: string,
  mod: FFmpegModuleDef,
  values: Record<string, any>
): string {
  const dotIdx = inputFilename.lastIndexOf('.');
  const base = dotIdx > 0 ? inputFilename.slice(0, dotIdx) : inputFilename;

  let ext = mod.outputExt;
  if (mod.id === 'extract_frames') {
    ext = String(values.imageFormat || 'png');
  } else if (mod.id === 'remux_container') {
    ext = String(values.targetContainer || 'mp4');
  } else if (mod.id === 'extract_audio') {
    ext = String(values.audioFormat || 'mp3');
  }

  return `${base}${mod.outputSuffix}.${ext}`;
}

export function buildFFmpegCommand(
  mod: FFmpegModuleDef,
  inputFilename: string,
  values: Record<string, any>,
  hardware: HardwareType = 'cpu'
): CommandBuildResult {
  const cleanInput = inputFilename.trim() || 'input_video.mp4';
  const outputPath = deriveOutputFilename(cleanInput, mod, values);
  const hw = HARDWARE_ENCODERS[hardware] || HARDWARE_ENCODERS.cpu;
  const videoCodec = hw.h264;

  const args: string[] = ['-y'];
  const explanations: ParamExplanation[] = [
    {
      flag: '-y',
      value: '(Global)',
      title: 'Zieldatei automatisch überschreiben',
      description: 'Verhindert interaktive Rückfragen im Hintergrund-Subprozess (vermeidet Deadlocks).',
    },
  ];

  switch (mod.id) {
    case 'extract_frames': {
      const fps = Number(values.fps || 1);
      args.push('-i', cleanInput, '-vf', `fps=${fps}`, '-q:v', '2', outputPath);
      explanations.push(
        {
          flag: '-i',
          value: cleanInput,
          title: 'Eingabedatei',
          description: 'Pfad zur Quell-Videodatei.',
        },
        {
          flag: '-vf',
          value: `fps=${fps}`,
          title: 'Framerate-Filter',
          description: `Extrahiert genau ${fps} Einzelbild(er) pro Video-Sekunde.`,
        },
        {
          flag: '-q:v',
          value: '2',
          title: 'Bildqualitäts-Stufe',
          description: 'Qualitätsskala 1–31 (2 = visuell verlustfreie Einzelbilder).',
        }
      );
      break;
    }

    case 'gif_creator': {
      const fps = Number(values.fps || 15);
      const width = String(values.width || '480');
      const loopVal = values.loop === false ? '1' : '0';
      const vf = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`;
      args.push('-i', cleanInput, '-vf', vf, '-loop', loopVal, outputPath);
      explanations.push(
        {
          flag: '-vf',
          value: 'palettegen & paletteuse',
          title: '2-Phasen Farbpaletten-Generator',
          description: 'Berechnet eine maßgeschneiderte 256-Farben-Palette mit Lanczos-Skalierung gegen GIF-Pixelrauschen.',
        },
        {
          flag: '-loop',
          value: loopVal,
          title: 'Schleifen-Steuerung',
          description: loopVal === '0' ? 'Endlose Wiederholung des GIFs.' : 'Einmaliger Durchlauf.',
        }
      );
      break;
    }

    case 'thumbnail_gen': {
      const ts = String(values.timestamp || '00:00:03');
      const qv = String(values.quality || 2);
      args.push('-ss', ts, '-i', cleanInput, '-frames:v', '1', '-q:v', qv, outputPath);
      explanations.push(
        {
          flag: '-ss (vor -i)',
          value: ts,
          title: 'Fast Input Seek',
          description: 'Springt vor dem Dekodieren direkt zum Keyframe bei diesem Zeitstempel.',
        },
        {
          flag: '-frames:v',
          value: '1',
          title: 'Einzelbild-Limit',
          description: 'Beendet FFmpeg sofort, nachdem exakt 1 Frame geschrieben wurde.',
        }
      );
      break;
    }

    case 'trim_video': {
      const start = String(values.startTime || '00:00:02');
      const duration = String(values.duration || 10);
      const fastCut = Boolean(values.fastCut);
      args.push('-ss', start, '-i', cleanInput, '-t', duration);
      explanations.push(
        {
          flag: '-ss',
          value: start,
          title: 'Startzeitpunkt',
          description: 'Setzt den Startpunkt des Ausschnitts.',
        },
        {
          flag: '-t',
          value: `${duration}s`,
          title: 'Cliplänge',
          description: `Schneidet exakt ${duration} Sekunden ab Startzeitpunkt aus.`,
        }
      );
      if (fastCut) {
        args.push('-c', 'copy');
        explanations.push({
          flag: '-c copy',
          value: 'Stream-Copy',
          title: 'Verlustfreier Direkt-Kopiermodus',
          description: 'Kopiert Video- und Audiopakete 1:1 ohne Neukodierung (extrem schnell, 0% Qualitätsverlust).',
        });
      } else {
        args.push('-c:v', videoCodec, '-crf', '18', '-c:a', 'aac');
        explanations.push({
          flag: `-c:v ${videoCodec}`,
          value: 'CRF 18',
          title: 'Frame-genaues Re-Encoding',
          description: 'Kodiert Zwischenbilder exakt am gewünschten Frame neu.',
        });
      }
      args.push(outputPath);
      break;
    }

    case 'scale_video': {
      const res = String(values.resolution || '1280:-2');
      const crf = String(values.crf || 20);
      args.push('-i', cleanInput, '-vf', `scale=${res}`, '-c:v', videoCodec);
      if (hardware === 'cpu') {
        args.push('-crf', crf);
      } else {
        args.push('-cq', crf);
      }
      args.push('-c:a', 'copy', outputPath);
      explanations.push(
        {
          flag: '-vf',
          value: `scale=${res}`,
          title: 'Proportionale Skalierung (-2)',
          description: 'Berechnet die Höhe im exakten Seitenverhältnis und rundet auf eine durch 2 teilbare Pixelzahl.',
        },
        {
          flag: `-c:v ${videoCodec}`,
          value: `Qualität ${crf}`,
          title: 'Video-Encoder',
          description: hw.desc,
        },
        {
          flag: '-c:a copy',
          value: 'Audio Copy',
          title: 'Unangetastete Tonspur',
          description: 'Übernimmt den Originalton 1:1 ohne Neukodierung.',
        }
      );
      break;
    }

    case 'crop_video': {
      const preset = String(values.cropPreset || 'square_center');
      const cropMap: Record<string, string> = {
        square_center: 'crop=min(iw\\,ih):min(iw\\,ih):(iw-ow)/2:(ih-oh)/2',
        vertical_9_16: 'crop=ih*9/16:ih:(iw-ow)/2:0',
        cinema_21_9: 'crop=iw:iw*9/21:0:(ih-oh)/2',
        custom_80pct: 'crop=iw*0.8:ih*0.8:iw*0.1:ih*0.1',
      };
      const vf = cropMap[preset] || cropMap.square_center;
      args.push('-i', cleanInput, '-vf', vf, '-c:v', videoCodec, '-c:a', 'copy', outputPath);
      explanations.push({
        flag: '-vf crop',
        value: vf,
        title: 'Geometrischer Bildausschnitt',
        description: 'Schneidet das ausgewählte Seitenverhältnis dynamisch aus den Eingangsmaßen (iw, ih) aus.',
      });
      break;
    }

    case 'concat_videos': {
      args.push('-f', 'concat', '-safe', '0', '-i', 'concat_manifest.txt', '-c', 'copy', outputPath);
      explanations.push(
        {
          flag: '-f concat -safe 0',
          value: 'concat_manifest.txt',
          title: 'Concat Demuxer',
          description: 'Liest alle Einzelclips aus einer temporären Textliste und erlaubt beliebige Dateipfade.',
        },
        {
          flag: '-c copy',
          value: 'Lossless Merge',
          title: 'Nahtloses Zusammenfügen',
          description: 'Verbindet die Streams ohne Qualitätsverlust und ohne Re-Encoding.',
        }
      );
      break;
    }

    case 'crf_compressor': {
      const family = String(values.codecFamily || 'h264');
      const selectedCodec = family === 'hevc' ? hw.hevc : hw.h264;
      const crf = String(values.crf || 23);
      const preset = String(values.preset || 'medium');
      args.push('-i', cleanInput, '-c:v', selectedCodec);
      if (hardware === 'cpu') {
        args.push('-crf', crf, '-preset', preset);
      } else {
        args.push('-cq', crf);
      }
      args.push('-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k');
      if (values.faststart !== false) {
        args.push('-movflags', '+faststart');
      }
      args.push(outputPath);
      explanations.push(
        {
          flag: '-c:v',
          value: selectedCodec,
          title: 'Video-Encoder',
          description: family === 'hevc' ? 'H.265 / HEVC für höchste Datenreduktion.' : 'H.264 / AVC für universelle Abspielbarkeit.',
        },
        {
          flag: hardware === 'cpu' ? '-crf' : '-cq',
          value: crf,
          title: 'Constant Rate / Quality Factor',
          description: `Steuert die konstante wahrnehmbare Bildqualität (Wert ${crf}).`,
        },
        {
          flag: '-pix_fmt',
          value: 'yuv420p',
          title: 'Farb-Subsampling 4:2:0',
          description: 'Garantiert Abspielbarkeit in Browsern, QuickTime und auf Smartphones.',
        },
        {
          flag: '-movflags',
          value: '+faststart',
          title: 'Web-Streaming Optimierung',
          description: 'Verschiebt das MP4 moov-Atom an den Dateianfang für sofortigen Start im Browser.',
        }
      );
      break;
    }

    case 'remux_container': {
      args.push('-i', cleanInput, '-c', 'copy');
      if (values.faststart !== false && outputPath.endsWith('.mp4')) {
        args.push('-movflags', '+faststart');
      }
      args.push(outputPath);
      explanations.push({
        flag: '-c copy',
        value: 'Container Remux',
        title: '1:1 Bitstream-Transfer',
        description: 'Tauscht lediglich die Container-Hülle (z. B. MKV zu MP4) ohne Neukodierung der Video-/Audiodaten.',
      });
      break;
    }

    case 'target_size_mb': {
      const targetMb = Number(values.targetMb || 25);
      const durationSec = Number(values.durationSec || 60);
      const audioKbps = Number(values.audioKbps || 128);
      const vBitrate = calculateTargetBitrateKbps(targetMb, durationSec, audioKbps);
      const maxRate = Math.floor(vBitrate * 1.4);
      const bufSize = Math.floor(vBitrate * 2.0);
      args.push(
        '-i',
        cleanInput,
        '-c:v',
        videoCodec,
        '-b:v',
        `${vBitrate}k`,
        '-maxrate',
        `${maxRate}k`,
        '-bufsize',
        `${bufSize}k`,
        '-pix_fmt',
        'yuv420p',
        '-c:a',
        'aac',
        '-b:a',
        `${audioKbps}k`,
        outputPath
      );
      explanations.push(
        {
          flag: '-b:v',
          value: `${vBitrate}k`,
          title: 'Berechnete Ziel-Videobitrate',
          description: `Exakt kalkuliert für max. ${targetMb} MB bei ${durationSec} Sekunden Laufzeit.`,
        },
        {
          flag: '-maxrate & -bufsize',
          value: `${maxRate}k / ${bufSize}k`,
          title: 'VBV Rate-Control Puffer',
          description: 'Deckelt Bitraten-Spitzen zuverlässig, damit das Größenlimit nicht überschritten wird.',
        }
      );
      break;
    }

    case 'extract_audio': {
      const fmt = String(values.audioFormat || 'mp3');
      const br = String(values.bitrate || '192k');
      args.push('-i', cleanInput, '-vn');
      if (fmt === 'mp3') {
        args.push('-c:a', 'libmp3lame', '-b:a', br);
      } else if (fmt === 'aac') {
        args.push('-c:a', 'aac', '-b:a', br);
      } else {
        args.push('-c:a', 'pcm_s16le');
      }
      args.push(outputPath);
      explanations.push(
        {
          flag: '-vn',
          value: 'Video None',
          title: 'Videoverarbeitung abschalten',
          description: 'Verwirft den Videostream komplett für maximale Geschwindigkeit beim Audio-Export.',
        },
        {
          flag: '-c:a',
          value: fmt === 'mp3' ? 'libmp3lame' : fmt === 'aac' ? 'aac' : 'pcm_s16le',
          title: 'Audio-Encoder',
          description: `Kodiert die Tonspur im gewählten ${fmt.toUpperCase()}-Format.`,
        }
      );
      break;
    }

    case 'mute_video': {
      args.push('-i', cleanInput, '-an', '-c:v', 'copy', outputPath);
      explanations.push(
        {
          flag: '-an',
          value: 'Audio None',
          title: 'Tonspuren restlos entfernen',
          description: 'Schließt sämtliche Audio-Streams vom Ziel-Container aus.',
        },
        {
          flag: '-c:v copy',
          value: 'Video Stream Copy',
          title: 'Verlustfreie Bildübernahme',
          description: 'Das Videobild wird ohne Qualitätsverlust in unter 1 Sekunde kopiert.',
        }
      );
      break;
    }

    case 'replace_audio': {
      const extAudio = String(values.externalAudio || 'soundtrack.mp3');
      const vol = Number(values.volume ?? 1.0);
      args.push('-i', cleanInput, '-i', extAudio, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy');
      if (Math.abs(vol - 1.0) > 0.01) {
        args.push('-filter:a', `volume=${vol}`);
      }
      args.push('-c:a', 'aac', '-b:a', '192k');
      if (values.shortest !== false) {
        args.push('-shortest');
      }
      args.push(outputPath);
      explanations.push(
        {
          flag: '-map 0:v:0 -map 1:a:0',
          value: 'Stream-Routing',
          title: 'Gezielte Kanal-Zuweisung',
          description: 'Verbindet das Bild aus Input 0 (Video) mit dem Ton aus Input 1 (Audiodatei).',
        },
        {
          flag: '-shortest',
          value: 'Stream-Sync',
          title: 'Automatische Längenbegrenzung',
          description: 'Stoppt den Export, sobald der kürzere Stream (Video oder Musik) endet.',
        }
      );
      break;
    }

    case 'visual_effects': {
      const fx = String(values.effectType || 'grayscale');
      const radius = Number(values.blurRadius || 10);
      const fxMap: Record<string, string> = {
        grayscale: 'hue=s=0',
        blur: `boxblur=${radius}:1`,
        sharpen: 'unsharp=5:5:1.2:5:5:0.0',
        sepia: 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131',
        vibrant: 'eq=contrast=1.15:saturation=1.35:brightness=0.02',
      };
      const vf = fxMap[fx] || 'hue=s=0';
      args.push('-i', cleanInput, '-vf', vf, '-c:v', videoCodec, '-c:a', 'copy', outputPath);
      explanations.push({
        flag: '-vf',
        value: vf,
        title: 'Visueller Pixel-Filtergraph',
        description: `Wendet den gewählten Filter (${fx}) Frame für Frame auf den Videostream an.`,
      });
      break;
    }

    case 'rotate_flip': {
      const mode = String(values.transformMode || '90_cw');
      const modeMap: Record<string, string> = {
        '90_cw': 'transpose=1',
        '90_ccw': 'transpose=2',
        '180': 'transpose=1,transpose=1',
        hflip: 'hflip',
        vflip: 'vflip',
      };
      const vf = modeMap[mode] || 'transpose=1';
      args.push('-i', cleanInput, '-vf', vf, '-c:v', videoCodec, '-c:a', 'copy', outputPath);
      explanations.push({
        flag: '-vf',
        value: vf,
        title: 'Geometrische Transformation',
        description: 'Rotiert oder spiegelt die Videomatrix und aktualisiert die Container-Orientierung.',
      });
      break;
    }

    case 'playback_speed': {
      const speed = Number(values.speedFactor || 2.0);
      const pts = (1.0 / speed).toFixed(4);
      const atempo = buildCascadedAtempo(speed);
      const fc = `[0:v]setpts=${pts}*PTS[v];[0:a]${atempo}[a]`;
      args.push(
        '-i',
        cleanInput,
        '-filter_complex',
        fc,
        '-map',
        '[v]',
        '-map',
        '[a]',
        '-c:v',
        videoCodec,
        '-c:a',
        'aac',
        outputPath
      );
      explanations.push(
        {
          flag: 'setpts',
          value: `${pts}*PTS`,
          title: 'Presentation Timestamp Skalierung',
          description: `Multipliziert die Anzeigezeitstempel jedes Frames mit ${pts} für ${speed}x Tempo.`,
        },
        {
          flag: 'atempo',
          value: atempo,
          title: 'Kaskadierter Audio-Pitch-Filter',
          description: 'Passt das Audiotempo synchron an, ohne die Stimmhöhe zu verzerren.',
        }
      );
      break;
    }

    case 'social_9_16': {
      const blur = Number(values.bgBlur || 35);
      const fc = `[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=${blur}:5[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`;
      args.push('-i', cleanInput, '-filter_complex', fc, '-c:v', videoCodec, '-c:a', 'copy', outputPath);
      explanations.push({
        flag: '-filter_complex',
        value: '[bg][fg]overlay',
        title: '9:16 Split-Screen Blur-Hintergrund',
        description: 'Erzeugt aus dem Video einen unscharfen 1080x1920 Hintergrund und legt das scharfe Original mittig darüber.',
      });
      break;
    }

    case 'watermark_overlay': {
      const logo = String(values.logoPath || 'brand_logo.png');
      const pos = String(values.position || 'bottom_right');
      const w = Number(values.logoWidth || 180);
      const posMap: Record<string, string> = {
        bottom_right: 'W-w-20:H-h-20',
        top_right: 'W-w-20:20',
        bottom_left: '20:H-h-20',
        top_left: '20:20',
        center: '(W-w)/2:(H-h)/2',
      };
      const coords = posMap[pos] || posMap.bottom_right;
      const fc = `[1:v]scale=${w}:-1[logo];[0:v][logo]overlay=${coords}`;
      args.push('-i', cleanInput, '-i', logo, '-filter_complex', fc, '-c:v', videoCodec, '-c:a', 'copy', outputPath);
      explanations.push({
        flag: 'overlay',
        value: coords,
        title: 'Dynamisches PNG-Wasserzeichen',
        description: `Skaliert das Logo auf ${w}px Breite und blendet es mit Alphakanal bei ${coords} ein.`,
      });
      break;
    }

    case 'subtitle_burn': {
      const srt = String(values.srtPath || 'untertitel_de.srt');
      const fontSize = Number(values.fontSize || 22);
      const vf = `subtitles='${srt}':force_style='FontSize=${fontSize},PrimaryColour=&H00FFFFFF,Outline=1'`;
      args.push('-i', cleanInput, '-vf', vf, '-c:v', videoCodec, '-c:a', 'copy', outputPath);
      explanations.push({
        flag: '-vf subtitles',
        value: `FontSize=${fontSize}`,
        title: 'Hardcode Untertitel-Renderer',
        description: 'Zeichnet die SRT-Zeitstempel dauerhaft und auf jedem Player sichtbar ins Bild.',
      });
      break;
    }

    case 'subtitle_soft': {
      const srt = String(values.srtPath || 'untertitel_de.srt');
      const lang = String(values.languageCode || 'ger');
      args.push(
        '-i',
        cleanInput,
        '-i',
        srt,
        '-map',
        '0:v',
        '-map',
        '0:a',
        '-map',
        '1:0',
        '-c:v',
        'copy',
        '-c:a',
        'copy',
        '-c:s',
        'mov_text',
        '-metadata:s:s:0',
        `language=${lang}`,
        outputPath
      );
      explanations.push({
        flag: '-c:s mov_text',
        value: `language=${lang}`,
        title: 'Einbettung als Soft-Subtitle-Spur',
        description: 'Speichert die Untertitel als ein-/ausschaltbare Textspur ohne Video-Neukodierung.',
      });
      break;
    }
  }

  const formattedArgs = args
    .map((a) => (a.includes(' ') || a.includes(';') || a.includes(':') ? `"${a}"` : a))
    .join(' ');

  const pythonArgsList = args.map((a) => `        ${JSON.stringify(a)},`).join('\n');

  const pythonFunctionCode = `import subprocess
import shutil
from pathlib import Path
from typing import List, Optional, Callable


class FFmpegExecutionError(Exception):
    """Fehlerklasse für abgebrochene FFmpeg-Subprozesse."""
    def __init__(self, message: str, returncode: int, stderr_log: str):
        super().__init__(f"{message} (Exit-Code: {returncode})")
        self.returncode = returncode
        self.stderr_log = stderr_log


def run_${mod.id}(
    input_video: str = ${JSON.stringify(cleanInput)},
    output_path: str = ${JSON.stringify(outputPath)},
    log_callback: Optional[Callable[[str], None]] = None
) -> Path:
    """
    Modul ${mod.code}: ${mod.name}
    ${mod.shortDesc}
    """
    if not shutil.which("ffmpeg"):
        raise FileNotFoundError("FFmpeg wurde nicht im System-PATH gefunden!")

    cmd: List[str] = [
        "ffmpeg",
${pythonArgsList}
    ]
    # Ersetze Ein- und Ausgabepfad dynamisch
    cmd[cmd.index(${JSON.stringify(cleanInput)})] = input_video
    cmd[-1] = output_path

    stderr_lines: List[str] = []
    try:
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            universal_newlines=True,
            encoding="utf-8",
            errors="replace"
        )
        if process.stderr:
            for line in process.stderr:
                clean_line = line.strip()
                stderr_lines.append(clean_line)
                if log_callback:
                    log_callback(clean_line)

        process.wait()
        if process.returncode != 0:
            raise FFmpegExecutionError(
                message="FFmpeg-Verarbeitung fehlgeschlagen",
                returncode=process.returncode,
                stderr_log="\\n".join(stderr_lines)
            )
        return Path(output_path)

    except subprocess.SubprocessError as exc:
        raise FFmpegExecutionError(f"Subprocess-Startfehler: {exc}", -1, "")


if __name__ == "__main__":
    try:
        result = run_${mod.id}(log_callback=lambda msg: print(f"[FFmpeg] {msg}"))
        print(f"Erfolgreich gespeichert unter: {result.resolve()}")
    except FFmpegExecutionError as err:
        print(f"[FEHLER] {err}\\nDetails:\\n{err.stderr_log}")
`;

  return {
    executable: 'ffmpeg',
    args,
    fullCommandString: `ffmpeg ${formattedArgs}`,
    outputPath,
    explanations,
    pythonFunctionCode,
  };
}
