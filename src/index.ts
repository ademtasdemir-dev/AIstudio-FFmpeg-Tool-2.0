import {
  CATEGORIES,
  CategoryId,
  FFMPEG_MODULES,
  FFmpegModuleDef,
  HARDWARE_ENCODERS,
  HardwareType,
  buildFFmpegCommand,
} from './utils/ffmpegEngine';
import { PYTHON_PROJECT_FILES } from './utils/pythonTemplates';
import { StudioVideoPreview } from './components/videoPreview';

type ActiveView = 'workspace' | 'python_code' | 'architecture' | 'error_lab';

class FFmpegStudioController {
  private activeView: ActiveView = 'workspace';
  private selectedCategory: CategoryId | 'all' = 'all';
  private searchQuery = '';
  private selectedModule: FFmpegModuleDef = FFMPEG_MODULES[0];
  private moduleValues: Record<string, Record<string, any>> = {};
  private hardware: HardwareType = 'cpu';
  private inputFilename = 'studio_showreel_1080p.mp4';
  private simulateErrorMode = false;
  private selectedProjectFileIdx = 0;

  private isRunningJob = false;
  private jobProgress = 0;
  private terminalLines: string[] = [
    '[Bereit] FFmpegExecutor initialisiert (subprocess.Popen mit universal_newlines=True).',
    '[Info] Wähle links ein FFmpeg-Modul und passe die Parameter an.',
  ];
  private copyStatusText = '';

  private previewInstance: StudioVideoPreview | null = null;

  constructor() {
    // Initialize default values for all 20 modules
    for (const mod of FFMPEG_MODULES) {
      this.moduleValues[mod.id] = {};
      for (const field of mod.fields) {
        this.moduleValues[mod.id][field.key] = field.defaultValue;
      }
    }
    this.mount();
  }

  private getCurrentValues(): Record<string, any> {
    return this.moduleValues[this.selectedModule.id] || {};
  }

  private mount(): void {
    const root = document.getElementById('root');
    if (!root) return;

    root.innerHTML = `
      <!-- Top Bar following strict 3-zone contract -->
      <header class="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
        <a href="#workspace" id="brand-link" class="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          FFmpeg Python Studio
        </a>

        <nav aria-label="Hauptnavigation" class="flex items-center gap-6 text-sm font-medium text-slate-400 overflow-x-auto">
          <button type="button" data-nav="workspace" class="nav-tab py-1 transition-colors whitespace-nowrap shrink-0 text-white border-b-2 border-sky-400">
            Workspace &amp; Module
          </button>
          <button type="button" data-nav="python_code" class="nav-tab py-1 transition-colors whitespace-nowrap shrink-0 hover:text-slate-200">
            Python Subprocess Code
          </button>
          <button type="button" data-nav="architecture" class="nav-tab py-1 transition-colors whitespace-nowrap shrink-0 hover:text-slate-200">
            Projekt-Architektur (5 Blöcke)
          </button>
          <button type="button" data-nav="error_lab" class="nav-tab py-1 transition-colors whitespace-nowrap shrink-0 hover:text-slate-200">
            Fehlerbehandlung &amp; Diagnose
          </button>
        </nav>

        <div class="flex items-center gap-3 shrink-0">
          <button type="button" id="btn-download-suite" class="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-400 rounded-lg hover:bg-sky-300 transition-colors whitespace-nowrap shrink-0">
            Python-Projekt (.py) herunterladen
          </button>
        </div>
      </header>

      <!-- Main Body Workspace -->
      <div class="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden bg-slate-950">
        <!-- Left Sidebar: Categories & 20 FFmpeg Modules -->
        <aside aria-label="FFmpeg Funktionsmodule" class="w-full lg:w-80 max-h-72 lg:max-h-none bg-slate-900/60 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col shrink-0">
          <div class="p-4 border-b border-slate-800 space-y-3">
            <div>
              <label for="module-search" class="block text-xs font-medium text-slate-400 mb-1.5">
                Modul oder FFmpeg-Filter suchen
              </label>
              <input
                id="module-search"
                type="search"
                placeholder="z.B. CRF, Trimmen, GIF, Audio, 9:16..."
                class="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label for="category-select" class="block text-xs font-medium text-slate-400 mb-1.5">
                Kategorie-Block filtern
              </label>
              <select
                id="category-select"
                class="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="all">Alle 6 Blöcke anzeigen (20 Module)</option>
                ${CATEGORIES.map(
                  (c) => `<option value="${c.id}">${c.title}</option>`
                ).join('')}
              </select>
            </div>
          </div>

          <div id="module-list-container" class="flex-1 overflow-y-auto p-3 space-y-1.5" role="listbox" aria-label="Verfügbare FFmpeg Module">
          </div>
        </aside>

        <!-- Right Dynamic Content Viewport -->
        <main id="main-viewport" class="flex-1 lg:overflow-y-auto p-4 sm:p-6">
          <!-- Workspace View -->
          <div id="view-workspace" class="max-w-6xl mx-auto space-y-6">
            <!-- Top Row: Video Input & Live Preview Canvas + Module Parameters -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <!-- Video Input & Preview Column (7 cols) -->
              <section aria-labelledby="video-section-heading" class="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
                <div class="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h1 id="video-section-heading" class="text-base font-semibold text-slate-100">
                      Eingabevideo &amp; Live-Filter-Vorschau
                    </h1>
                    <p id="video-meta-line" class="text-xs text-slate-400 tabular-nums mt-0.5">
                      studio_showreel_1080p.mp4 · 1920x1080 · 60 fps · h264 · 68.4 MB
                    </p>
                  </div>

                  <div class="flex items-center gap-2">
                    <label
                      for="video-upload-input"
                      class="cursor-pointer px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Videodatei wählen
                    </label>
                    <input id="video-upload-input" type="file" accept="video/*" class="hidden" />
                    <button
                      type="button"
                      id="btn-play-preview"
                      class="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Vorschau abspielen
                    </button>
                    <button
                      type="button"
                      id="btn-snapshot-png"
                      class="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                    >
                      Frame speichern
                    </button>
                  </div>
                </div>

                <!-- HTML5 Canvas for Live Filter & Overlay Preview -->
                <div class="relative bg-slate-950 border border-slate-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
                  <canvas id="studio-preview-canvas" width="640" height="360" class="w-full h-full object-contain"></canvas>
                </div>

                <!-- Input File Path & Hardware Encoder Bar -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label for="input-filename-field" class="block text-xs font-medium text-slate-400 mb-1">
                      Eingabedatei (Pfad für Python / CLI)
                    </label>
                    <input
                      id="input-filename-field"
                      type="text"
                      value="${this.inputFilename}"
                      class="w-full px-3 py-2 text-xs font-mono-code bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label for="hardware-select" class="block text-xs font-medium text-slate-400 mb-1">
                      Hardware-Beschleunigung (GPU / CPU)
                    </label>
                    <select
                      id="hardware-select"
                      class="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-sky-500"
                    >
                      ${Object.entries(HARDWARE_ENCODERS)
                        .map(
                          ([k, v]) =>
                            `<option value="${k}">${v.label}</option>`
                        )
                        .join('')}
                    </select>
                  </div>
                </div>
              </section>

              <!-- Active Module Configuration Column (5 cols) -->
              <section aria-labelledby="module-config-heading" class="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-5">
                <div class="space-y-4">
                  <div class="border-b border-slate-800 pb-3.5">
                    <div id="active-module-category" class="text-xs font-medium text-sky-400">
                      1. Bild- &amp; Frame-Konvertierung
                    </div>
                    <h2 id="module-config-heading" class="text-lg font-bold text-slate-100 mt-0.5">
                      1.1 Video in Einzelbilder zerlegen
                    </h2>
                    <p id="active-module-desc" class="text-xs text-slate-400 mt-1 leading-relaxed">
                      Extrahiert durchnummerierte Einzelbilder (PNG/JPG) mit frei wählbarer Framerate.
                    </p>
                  </div>

                  <!-- Dynamic Form Fields -->
                  <div id="dynamic-module-fields" class="space-y-4"></div>

                  <!-- Live Python Subprocess Argument Array Preview -->
                  <div class="pt-2">
                    <div class="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>Python <code class="font-mono-code text-slate-300">subprocess</code> Argument-Liste:</span>
                      <span id="inline-hw-indicator" class="font-mono-code text-slate-400">CPU</span>
                    </div>
                    <pre id="inline-python-cmd-list" class="p-3 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono-code text-slate-300 overflow-x-auto max-h-28 leading-relaxed"></pre>
                  </div>
                </div>

                <!-- Output Path & Subprocess Trigger -->
                <div class="pt-4 border-t border-slate-800 space-y-3">
                  <div class="flex items-center justify-between text-xs">
                    <span class="text-slate-400">Generierte Zieldatei:</span>
                    <span id="derived-output-label" class="font-mono-code text-sky-300 tabular-nums"></span>
                  </div>

                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-run-subprocess"
                      class="flex-1 py-2.5 px-4 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Subprocess-Ausführung starten
                    </button>
                    <button
                      type="button"
                      id="btn-reset-module"
                      class="py-2.5 px-3 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Standardwerte
                    </button>
                  </div>
                </div>
              </section>
            </div>

            <!-- Middle Row: Live Generated FFmpeg Command + Parameter Explanations Table -->
            <section aria-labelledby="cli-explanation-heading" class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 id="cli-explanation-heading" class="text-sm font-semibold text-slate-100">
                    Generierter FFmpeg-Befehl &amp; Parameter-Erklärung
                  </h2>
                  <p class="text-xs text-slate-400 mt-0.5">
                    Jeder Parameter wird sicher als Listen-Element an <code class="font-mono-code text-slate-300">subprocess.Popen(cmd)</code> übergeben.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span id="copy-feedback" class="text-xs text-emerald-400 font-medium"></span>
                  <button
                    type="button"
                    id="btn-copy-cli"
                    class="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    FFmpeg-Befehl kopieren
                  </button>
                  <button
                    type="button"
                    id="btn-open-py-tab"
                    class="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    Python-Modulcode ansehen
                  </button>
                </div>
              </div>

              <!-- Command Display Box -->
              <div class="p-3.5 bg-slate-950 border border-slate-800 rounded-lg overflow-x-auto">
                <code id="ffmpeg-cli-string" class="text-xs font-mono-code text-emerald-400 whitespace-nowrap"></code>
              </div>

              <!-- Parameter Explanations Table -->
              <div class="overflow-x-auto border border-slate-800 rounded-lg">
                <table class="w-full text-left border-collapse">
                  <thead>
                    <tr class="border-b border-slate-800 bg-slate-950/60 text-xs text-slate-400">
                      <th class="py-2.5 px-4 font-medium w-44">FFmpeg-Parameter</th>
                      <th class="py-2.5 px-4 font-medium w-48">Aktueller Wert</th>
                      <th class="py-2.5 px-4 font-medium w-56">Bezeichnung</th>
                      <th class="py-2.5 px-4 font-medium">Technische Erklärung</th>
                    </tr>
                  </thead>
                  <tbody id="param-explanation-tbody" class="divide-y divide-slate-800/70 text-xs">
                  </tbody>
                </table>
              </div>
            </section>

            <!-- Bottom Row: Subprocess Execution Console & Progress Bar -->
            <section aria-labelledby="terminal-heading" class="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div class="flex items-center gap-4">
                  <h2 id="terminal-heading" class="text-sm font-semibold text-slate-100">
                    Python <code class="font-mono-code text-sky-400">subprocess.Popen</code> Live-Konsole (STDERR Stream)
                  </h2>
                  <span id="job-status-label" class="text-xs text-slate-400 tabular-nums">
                    Status: Bereit · Fortschritt: 0%
                  </span>
                </div>

                <div class="flex items-center gap-3">
                  <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input type="checkbox" id="chk-simulate-error" class="rounded border-slate-700 bg-slate-950 text-sky-500" />
                    <span>Fehlerfall testen (Exit-Code 1 &amp; FFmpegExecutionError)</span>
                  </label>
                  <button
                    type="button"
                    id="btn-clear-log"
                    class="px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-md transition-colors whitespace-nowrap"
                  >
                    Log leeren
                  </button>
                </div>
              </div>

              <!-- Progress Bar -->
              <div class="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div id="job-progress-bar" class="h-full bg-sky-400 transition-transform duration-150 origin-left" style="transform: scaleX(0)"></div>
              </div>

              <!-- Console Output -->
              <pre id="terminal-log-box" class="p-3.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono-code text-slate-300 h-40 overflow-y-auto leading-relaxed"></pre>
            </section>
          </div>

          <!-- View 2: Python Subprocess Code Generator -->
          <div id="view-python-code" class="max-w-5xl mx-auto space-y-5 hidden">
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h1 id="py-code-heading" class="text-lg font-bold text-slate-100">
                    Generierter Python-Code (subprocess &amp; Fehlerbehandlung)
                  </h1>
                  <p class="text-xs text-slate-400 mt-1">
                    Sauber gekapselte Funktion mit <code class="font-mono-code text-slate-300">subprocess.Popen</code>, Echtzeit-Log-Streaming und eigener <code class="font-mono-code text-slate-300">FFmpegExecutionError</code>-Klasse.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-copy-python"
                    class="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Python-Code kopieren
                  </button>
                  <button
                    type="button"
                    id="btn-download-single-py"
                    class="px-3.5 py-2 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Als Modul (.py) speichern
                  </button>
                </div>
              </div>

              <pre id="python-code-viewer" class="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono-code text-slate-200 overflow-x-auto leading-relaxed"></pre>
            </div>
          </div>

          <!-- View 3: Modular Python Project Architecture (5 Categories + Core + GUI) -->
          <div id="view-architecture" class="max-w-6xl mx-auto space-y-6 hidden">
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h1 class="text-lg font-bold text-slate-100">
                    Modulare Python-Projektarchitektur (CustomTkinter GUI + 5 Funktionsblöcke)
                  </h1>
                  <p class="text-xs text-slate-400 mt-1">
                    Wähle eine Datei aus dem Projektbaum, um den Quellcode zu inspizieren oder herunterzuladen.
                  </p>
                </div>
                <button
                  type="button"
                  id="btn-download-selected-arch"
                  class="px-3.5 py-2 text-xs font-semibold bg-sky-400 hover:bg-sky-300 text-slate-950 rounded-lg transition-colors whitespace-nowrap"
                >
                  Aktuelle Datei herunterladen
                </button>
              </div>

              <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div id="arch-file-list" class="lg:col-span-4 space-y-2"></div>
                <div class="lg:col-span-8 space-y-3">
                  <div class="flex items-center justify-between px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg">
                    <span id="arch-file-title" class="text-xs font-mono-code text-sky-400 font-semibold"></span>
                    <span id="arch-file-desc" class="text-xs text-slate-400"></span>
                  </div>
                  <pre id="arch-code-box" class="p-4 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono-code text-slate-200 overflow-x-auto h-[460px] leading-relaxed"></pre>
                </div>
              </div>
            </div>
          </div>

          <!-- View 4: Error Handling & Subprocess Diagnostics -->
          <div id="view-error-lab" class="max-w-5xl mx-auto space-y-6 hidden">
            <div class="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
              <div class="border-b border-slate-800 pb-4">
                <h1 class="text-lg font-bold text-slate-100">
                  Fehlerbehandlung &amp; Diagnose in Python subprocess
                </h1>
                <p class="text-xs text-slate-400 mt-1">
                  Warum <code class="font-mono-code text-slate-300">subprocess.Popen</code> mit eigener Fehlerklasse sicherer ist als ungeprüfte Wrapper.
                </p>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div class="text-xs font-semibold text-sky-400">01. Vorab-Prüfung (shutil.which)</div>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Prüft vor jedem Start, ob die <code class="font-mono-code">ffmpeg</code>-Binary im System-PATH installiert ist, und wirft einen klaren <code class="font-mono-code">FileNotFoundError</code> mit Installationshinweis.
                  </p>
                </div>
                <div class="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div class="text-xs font-semibold text-sky-400">02. Kein Shell-Injection Risiko</div>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Parameter werden als typisierte Python-Liste (<code class="font-mono-code">List[str]</code>) ohne <code class="font-mono-code">shell=True</code> übergeben. Dateinamen mit Leerzeichen oder Sonderzeichen funktionieren fehlerfrei.
                  </p>
                </div>
                <div class="p-4 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                  <div class="text-xs font-semibold text-sky-400">03. STDERR &amp; Exit-Code Analyse</div>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    FFmpeg gibt Logs auf <code class="font-mono-code">stderr</code> aus. Bei <code class="font-mono-code">returncode != 0</code> wird der gesamte Fehler-Stack in <code class="font-mono-code">FFmpegExecutionError</code> gekapselt.
                  </p>
                </div>
              </div>

              <div class="border border-slate-800 rounded-lg overflow-hidden">
                <table class="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr class="bg-slate-950 border-b border-slate-800 text-slate-400">
                      <th class="py-2.5 px-4 font-medium">Typischer FFmpeg-Fehler</th>
                      <th class="py-2.5 px-4 font-medium">Ursache</th>
                      <th class="py-2.5 px-4 font-medium">Automatische Lösung in unserem Python-Code</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-800 bg-slate-900/40 text-slate-300">
                    <tr>
                      <td class="py-3 px-4 font-mono-code text-rose-400">width/height not divisible by 2</td>
                      <td class="py-3 px-4">H.264/H.265 verweigert ungerade Pixelzahlen beim Skalieren.</td>
                      <td class="py-3 px-4">Verwendung von <code class="font-mono-code text-emerald-400">scale=1280:-2</code> rundet automatisch auf gerade Pixelwerte.</td>
                    </tr>
                    <tr>
                      <td class="py-3 px-4 font-mono-code text-rose-400">File already exists. Overwrite? [y/N]</td>
                      <td class="py-3 px-4">FFmpeg wartet im Hintergrund auf Tastatureingabe, GUI friert ein.</td>
                      <td class="py-3 px-4">Globales <code class="font-mono-code text-emerald-400">-y</code> Flag erzwingt sofortiges Überschreiben ohne Blockade.</td>
                    </tr>
                    <tr>
                      <td class="py-3 px-4 font-mono-code text-rose-400">atempo filter value out of range [0.5, 2.0]</td>
                      <td class="py-3 px-4">Audio-Filter bricht bei 4x Zeitraffer oder 0.25x Zeitlupe ab.</td>
                      <td class="py-3 px-4">Automatische Kaskadierung: <code class="font-mono-code text-emerald-400">atempo=2.0,atempo=2.0</code>.</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>
    `;

    // Initialize video preview canvas
    const canvas = document.getElementById('studio-preview-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.previewInstance = new StudioVideoPreview(canvas, (meta) => {
        this.inputFilename = meta.filename;
        const inpField = document.getElementById('input-filename-field') as HTMLInputElement;
        if (inpField) inpField.value = meta.filename;
        const metaLine = document.getElementById('video-meta-line');
        if (metaLine) {
          metaLine.textContent = `${meta.filename} · ${meta.width}x${meta.height} · ${meta.fps} fps · ${meta.codec} · ${meta.sizeMb} MB`;
        }
        this.refreshWorkspaceOutputs();
      });
    }

    this.bindGlobalEvents();
    this.renderSidebarModules();
    this.renderModuleConfigForm();
    this.refreshWorkspaceOutputs();
    this.renderArchitectureView();
    this.renderTerminal();
  }

  private bindGlobalEvents(): void {
    // Top Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).getAttribute('data-nav') as ActiveView;
        if (target) this.switchView(target);
      });
    });

    document.getElementById('brand-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.switchView('workspace');
    });

    // Search & Category Filter
    const searchInput = document.getElementById('module-search') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.searchQuery = searchInput.value.trim().toLowerCase();
      this.renderSidebarModules();
    });

    const catSelect = document.getElementById('category-select') as HTMLSelectElement;
    catSelect?.addEventListener('change', () => {
      this.selectedCategory = catSelect.value as CategoryId | 'all';
      this.renderSidebarModules();
    });

    // Input Filename & Hardware Selector
    const inpField = document.getElementById('input-filename-field') as HTMLInputElement;
    inpField?.addEventListener('input', () => {
      this.inputFilename = inpField.value || 'input_video.mp4';
      this.refreshWorkspaceOutputs();
    });

    const hwSelect = document.getElementById('hardware-select') as HTMLSelectElement;
    hwSelect?.addEventListener('change', () => {
      this.hardware = hwSelect.value as HardwareType;
      this.refreshWorkspaceOutputs();
    });

    // Video Upload & Preview Controls
    const fileInput = document.getElementById('video-upload-input') as HTMLInputElement;
    fileInput?.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file && this.previewInstance) {
        this.previewInstance.loadUserVideoFile(file);
      }
    });

    const playBtn = document.getElementById('btn-play-preview');
    playBtn?.addEventListener('click', () => {
      if (!this.previewInstance) return;
      const playing = this.previewInstance.togglePlay();
      playBtn.textContent = playing ? 'Vorschau pausieren' : 'Vorschau abspielen';
    });

    document.getElementById('btn-snapshot-png')?.addEventListener('click', () => {
      const canvas = document.getElementById('studio-preview-canvas') as HTMLCanvasElement;
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `ffmpeg_preview_${this.selectedModule.id}.png`;
      a.click();
    });

    // Subprocess Execution & Reset
    document.getElementById('btn-run-subprocess')?.addEventListener('click', () => {
      this.runSubprocessSimulation();
    });

    document.getElementById('btn-reset-module')?.addEventListener('click', () => {
      for (const field of this.selectedModule.fields) {
        this.moduleValues[this.selectedModule.id][field.key] = field.defaultValue;
      }
      this.renderModuleConfigForm();
      this.refreshWorkspaceOutputs();
    });

    // Copy & View Switch Buttons
    document.getElementById('btn-copy-cli')?.addEventListener('click', () => {
      const built = buildFFmpegCommand(
        this.selectedModule,
        this.inputFilename,
        this.getCurrentValues(),
        this.hardware
      );
      this.copyToClipboard(built.fullCommandString, 'FFmpeg-Befehl kopiert!');
    });

    document.getElementById('btn-open-py-tab')?.addEventListener('click', () => {
      this.switchView('python_code');
    });

    document.getElementById('btn-copy-python')?.addEventListener('click', () => {
      const built = buildFFmpegCommand(
        this.selectedModule,
        this.inputFilename,
        this.getCurrentValues(),
        this.hardware
      );
      this.copyToClipboard(built.pythonFunctionCode, 'Python-Code kopiert!');
    });

    document.getElementById('btn-download-single-py')?.addEventListener('click', () => {
      const built = buildFFmpegCommand(
        this.selectedModule,
        this.inputFilename,
        this.getCurrentValues(),
        this.hardware
      );
      this.downloadTextFile(`module_${this.selectedModule.id}.py`, built.pythonFunctionCode);
    });

    document.getElementById('btn-download-suite')?.addEventListener('click', () => {
      const allCode = PYTHON_PROJECT_FILES.map(
        (f) => `# ==========================================\n# DATEI: ${f.path} (${f.title})\n# ==========================================\n\n${f.code}`
      ).join('\n\n');
      this.downloadTextFile('ffmpeg_python_studio_complete.py', allCode);
    });

    document.getElementById('btn-download-selected-arch')?.addEventListener('click', () => {
      const file = PYTHON_PROJECT_FILES[this.selectedProjectFileIdx];
      if (file) {
        const filename = file.path.replace('/', '_');
        this.downloadTextFile(filename, file.code);
      }
    });

    // Terminal controls
    const errChk = document.getElementById('chk-simulate-error') as HTMLInputElement;
    errChk?.addEventListener('change', () => {
      this.simulateErrorMode = errChk.checked;
    });

    document.getElementById('btn-clear-log')?.addEventListener('click', () => {
      this.terminalLines = ['[Konsole geleert] Bereit für nächsten FFmpeg-Subprozess.'];
      this.jobProgress = 0;
      this.renderTerminal();
    });
  }

  private switchView(view: ActiveView): void {
    this.activeView = view;
    const views: Record<ActiveView, string> = {
      workspace: 'view-workspace',
      python_code: 'view-python-code',
      architecture: 'view-architecture',
      error_lab: 'view-error-lab',
    };

    for (const [k, id] of Object.entries(views)) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.toggle('hidden', k !== view);
      }
    }

    document.querySelectorAll('.nav-tab').forEach((btn) => {
      const navKey = btn.getAttribute('data-nav');
      if (navKey === view) {
        btn.className =
          'nav-tab py-1 transition-colors whitespace-nowrap shrink-0 text-white border-b-2 border-sky-400';
      } else {
        btn.className =
          'nav-tab py-1 transition-colors whitespace-nowrap shrink-0 text-slate-400 hover:text-slate-200';
      }
    });
  }

  private renderSidebarModules(): void {
    const container = document.getElementById('module-list-container');
    if (!container) return;

    const filtered = FFMPEG_MODULES.filter((m) => {
      const matchesCat =
        this.selectedCategory === 'all' || m.categoryId === this.selectedCategory;
      const matchesQuery =
        !this.searchQuery ||
        m.name.toLowerCase().includes(this.searchQuery) ||
        m.shortDesc.toLowerCase().includes(this.searchQuery) ||
        m.code.toLowerCase().includes(this.searchQuery);
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center space-y-3">
          <p class="text-xs text-slate-400">Keine Module für „${this.searchQuery}“ gefunden.</p>
          <button type="button" id="btn-reset-filter" class="px-3 py-1.5 text-xs font-medium bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700">
            Filter zurücksetzen
          </button>
        </div>
      `;
      document.getElementById('btn-reset-filter')?.addEventListener('click', () => {
        this.searchQuery = '';
        this.selectedCategory = 'all';
        const sInp = document.getElementById('module-search') as HTMLInputElement;
        if (sInp) sInp.value = '';
        const cSel = document.getElementById('category-select') as HTMLSelectElement;
        if (cSel) cSel.value = 'all';
        this.renderSidebarModules();
      });
      return;
    }

    let html = '';
    let lastCat = '';
    for (const mod of filtered) {
      if (mod.categoryLabel !== lastCat) {
        lastCat = mod.categoryLabel;
        html += `<div class="pt-3 pb-1 px-2 text-[11px] font-semibold text-slate-400">${lastCat}</div>`;
      }
      const isSelected = mod.id === this.selectedModule.id;
      html += `
        <button
          type="button"
          data-mod-id="${mod.id}"
          role="option"
          aria-selected="${isSelected}"
          class="mod-item w-full text-left px-3 py-2.5 rounded-lg transition-colors flex flex-col gap-0.5 ${
            isSelected
              ? 'bg-sky-500/15 text-white border border-sky-500/40'
              : 'text-slate-300 hover:bg-slate-800/70 border border-transparent'
          }"
        >
          <div class="text-xs font-semibold leading-snug">
            <span class="font-mono-code text-sky-400 mr-1">${mod.code}</span>
            <span>${mod.name}</span>
          </div>
          <div class="text-[11px] text-slate-400 line-clamp-1">${mod.shortDesc}</div>
        </button>
      `;
    }

    container.innerHTML = html;

    container.querySelectorAll('.mod-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-mod-id');
        const found = FFMPEG_MODULES.find((m) => m.id === id);
        if (found) {
          this.selectedModule = found;
          this.renderSidebarModules();
          this.renderModuleConfigForm();
          this.refreshWorkspaceOutputs();
        }
      });
    });
  }

  private renderModuleConfigForm(): void {
    const mod = this.selectedModule;
    const catEl = document.getElementById('active-module-category');
    const titleEl = document.getElementById('module-config-heading');
    const descEl = document.getElementById('active-module-desc');
    const fieldsContainer = document.getElementById('dynamic-module-fields');

    if (catEl) catEl.textContent = mod.categoryLabel;
    if (titleEl) titleEl.textContent = `${mod.code} ${mod.name}`;
    if (descEl) descEl.textContent = mod.shortDesc;
    if (!fieldsContainer) return;

    const currentVals = this.getCurrentValues();

    fieldsContainer.innerHTML = mod.fields
      .map((field) => {
        const val = currentVals[field.key];
        const fieldId = `field-${mod.id}-${field.key}`;

        if (field.type === 'select' && field.options) {
          return `
            <div>
              <label for="${fieldId}" class="block text-xs font-medium text-slate-300 mb-1.5">
                ${field.label}
              </label>
              <select
                id="${fieldId}"
                data-field-key="${field.key}"
                class="dyn-field w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
              >
                ${field.options
                  .map(
                    (o) =>
                      `<option value="${o.value}" ${
                        String(val) === o.value ? 'selected' : ''
                      }>${o.label}</option>`
                  )
                  .join('')}
              </select>
            </div>
          `;
        }

        if (field.type === 'range') {
          return `
            <div>
              <div class="flex items-center justify-between text-xs mb-1.5">
                <label for="${fieldId}" class="font-medium text-slate-300">${field.label}</label>
                <span id="${fieldId}-val" class="font-mono-code text-sky-400 tabular-nums">${val}${
                  field.unit ? ' ' + field.unit : ''
                }</span>
              </div>
              <input
                id="${fieldId}"
                type="range"
                data-field-key="${field.key}"
                data-unit="${field.unit || ''}"
                min="${field.min ?? 0}"
                max="${field.max ?? 100}"
                step="${field.step ?? 1}"
                value="${val}"
                class="dyn-field w-full accent-sky-400 cursor-pointer"
              />
            </div>
          `;
        }

        if (field.type === 'boolean') {
          return `
            <label for="${fieldId}" class="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer pt-1">
              <input
                id="${fieldId}"
                type="checkbox"
                data-field-key="${field.key}"
                ${val ? 'checked' : ''}
                class="dyn-field rounded border-slate-700 bg-slate-950 text-sky-500"
              />
              <span>${field.label}</span>
            </label>
          `;
        }

        return `
          <div>
            <label for="${fieldId}" class="block text-xs font-medium text-slate-300 mb-1.5">
              ${field.label}
            </label>
            <input
              id="${fieldId}"
              type="${field.type === 'number' ? 'number' : 'text'}"
              data-field-key="${field.key}"
              value="${val}"
              ${field.min !== undefined ? `min="${field.min}"` : ''}
              ${field.max !== undefined ? `max="${field.max}"` : ''}
              class="dyn-field w-full px-3 py-2 text-xs font-mono-code bg-slate-950 border border-slate-800 rounded-lg text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        `;
      })
      .join('');

    fieldsContainer.querySelectorAll('.dyn-field').forEach((inputEl) => {
      const handler = (e: Event) => {
        const el = e.currentTarget as HTMLInputElement;
        const key = el.getAttribute('data-field-key');
        if (!key) return;
        let parsed: any = el.value;
        if (el.type === 'checkbox') {
          parsed = el.checked;
        } else if (el.type === 'number' || el.type === 'range') {
          parsed = Number(el.value);
          const valSpan = document.getElementById(`${el.id}-val`);
          const unit = el.getAttribute('data-unit') || '';
          if (valSpan) valSpan.textContent = `${parsed}${unit ? ' ' + unit : ''}`;
        }
        this.moduleValues[mod.id][key] = parsed;
        this.refreshWorkspaceOutputs();
      };
      inputEl.addEventListener('input', handler);
      inputEl.addEventListener('change', handler);
    });
  }

  private refreshWorkspaceOutputs(): void {
    const vals = this.getCurrentValues();
    const built = buildFFmpegCommand(
      this.selectedModule,
      this.inputFilename,
      vals,
      this.hardware
    );

    const outLabel = document.getElementById('derived-output-label');
    if (outLabel) outLabel.textContent = built.outputPath;

    const cliEl = document.getElementById('ffmpeg-cli-string');
    if (cliEl) cliEl.textContent = built.fullCommandString;

    const tbody = document.getElementById('param-explanation-tbody');
    if (tbody) {
      tbody.innerHTML = built.explanations
        .map(
          (exp) => `
          <tr class="hover:bg-slate-800/40">
            <td class="py-2.5 px-4 font-mono-code text-sky-400 font-medium whitespace-nowrap">${exp.flag}</td>
            <td class="py-2.5 px-4 font-mono-code text-slate-300 tabular-nums">${exp.value}</td>
            <td class="py-2.5 px-4 font-medium text-slate-200">${exp.title}</td>
            <td class="py-2.5 px-4 text-slate-400 leading-relaxed">${exp.description}</td>
          </tr>
        `
        )
        .join('');
    }

    const pyCodeViewer = document.getElementById('python-code-viewer');
    if (pyCodeViewer) {
      pyCodeViewer.textContent = built.pythonFunctionCode;
    }

    const pyHeading = document.getElementById('py-code-heading');
    if (pyHeading) {
      pyHeading.textContent = `Python Subprocess Modul — ${this.selectedModule.code} ${this.selectedModule.name}`;
    }

    const inlineCmdList = document.getElementById('inline-python-cmd-list');
    if (inlineCmdList) {
      inlineCmdList.textContent = `cmd = [\n  "ffmpeg",\n  ${built.args.map((a) => JSON.stringify(a)).join(', ')}\n]`;
    }

    const inlineHw = document.getElementById('inline-hw-indicator');
    if (inlineHw) {
      inlineHw.textContent = `Encoder: ${HARDWARE_ENCODERS[this.hardware].h264}`;
    }

    this.previewInstance?.updateFilterState(this.selectedModule, vals);
  }

  private renderArchitectureView(): void {
    const listEl = document.getElementById('arch-file-list');
    const titleEl = document.getElementById('arch-file-title');
    const descEl = document.getElementById('arch-file-desc');
    const codeEl = document.getElementById('arch-code-box');
    if (!listEl || !titleEl || !descEl || !codeEl) return;

    listEl.innerHTML = PYTHON_PROJECT_FILES.map((file, idx) => {
      const active = idx === this.selectedProjectFileIdx;
      return `
        <button
          type="button"
          data-arch-idx="${idx}"
          class="arch-btn w-full text-left p-3 rounded-lg border transition-colors ${
            active
              ? 'bg-sky-500/15 border-sky-500/40 text-white'
              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
          }"
        >
          <div class="text-xs font-mono-code font-semibold text-sky-400">${file.path}</div>
          <div class="text-xs font-medium text-slate-200 mt-0.5">${file.title}</div>
          <div class="text-[11px] text-slate-400 mt-0.5">${file.category}</div>
        </button>
      `;
    }).join('');

    const selected = PYTHON_PROJECT_FILES[this.selectedProjectFileIdx];
    titleEl.textContent = selected.path;
    descEl.textContent = selected.description;
    codeEl.textContent = selected.code;

    listEl.querySelectorAll('.arch-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = Number((e.currentTarget as HTMLElement).getAttribute('data-arch-idx'));
        this.selectedProjectFileIdx = idx;
        this.renderArchitectureView();
      });
    });
  }

  private runSubprocessSimulation(): void {
    if (this.isRunningJob) return;
    this.isRunningJob = true;
    this.jobProgress = 0;

    const built = buildFFmpegCommand(
      this.selectedModule,
      this.inputFilename,
      this.getCurrentValues(),
      this.hardware
    );

    this.terminalLines = [
      `[Python] Starte FFmpegExecutor.run() im Hintergrund-Thread...`,
      `[Subprocess] Popen: ${JSON.stringify([built.executable, ...built.args])}`,
      `ffmpeg version 7.1-full_build Copyright (c) 2000-2026 the FFmpeg developers`,
      `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from '${this.inputFilename}':`,
      `  Stream #0:0(und): Video: h264 (High), yuv420p, 1920x1080, 60 fps`,
    ];

    document.getElementById('terminal-heading')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (this.simulateErrorMode) {
      this.terminalLines.push(
        `[STDERR] [error] Invalid argument or inaccessible output stream for '${built.outputPath}'`,
        `[FFmpegExecutionError] FFmpeg-Prozess mit Fehler beendet (Exit-Code: 1)`,
        `[Python try/except] Fehler sauber abgefangen! GUI bleibt reaktionsfähig.`
      );
      this.jobProgress = 100;
      this.isRunningJob = false;
      this.renderTerminal('Fehler abgefangen (Exit-Code 1)');
      return;
    }

    this.renderTerminal('Verarbeitet...');

    const steps = [
      { pct: 25, line: `frame=  310 fps=142 q=23.0 size=    2048kB time=00:00:05.16 bitrate=3248.1kbits/s speed=2.37x` },
      { pct: 55, line: `frame=  680 fps=148 q=23.0 size=    4608kB time=00:00:11.33 bitrate=3331.4kbits/s speed=2.46x` },
      { pct: 85, line: `frame= 1050 fps=151 q=22.0 size=    7168kB time=00:00:17.50 bitrate=3355.0kbits/s speed=2.51x` },
      {
        pct: 100,
        line: `[Erfolg] video:8420kB audio:640kB subtitle:0kB muxing overhead: 0.28%\n[Python] Fertig! Zieldatei geschrieben: ${built.outputPath} (Exit-Code: 0)`,
      },
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        this.jobProgress = step.pct;
        this.terminalLines.push(step.line);
        if (idx === steps.length - 1) {
          this.isRunningJob = false;
          this.renderTerminal(`Erfolgreich abgeschlossen (100%)`);
        } else {
          this.renderTerminal(`Rendert... (${step.pct}%)`);
        }
      }, (idx + 1) * 180);
    });
  }

  private renderTerminal(customStatus?: string): void {
    const logBox = document.getElementById('terminal-log-box');
    const statusLabel = document.getElementById('job-status-label');
    const progBar = document.getElementById('job-progress-bar');

    if (logBox) {
      logBox.textContent = this.terminalLines.join('\n');
      logBox.scrollTop = logBox.scrollHeight;
    }
    if (statusLabel) {
      statusLabel.textContent = customStatus
        ? `Status: ${customStatus}`
        : `Status: Bereit · Fortschritt: ${this.jobProgress}%`;
    }
    if (progBar) {
      progBar.style.transform = `scaleX(${this.jobProgress / 100})`;
      progBar.className = this.simulateErrorMode
        ? 'h-full bg-rose-500 transition-transform duration-150 origin-left'
        : 'h-full bg-sky-400 transition-transform duration-150 origin-left';
    }
  }

  private copyToClipboard(text: string, feedbackMessage: string): void {
    navigator.clipboard?.writeText(text).catch(() => {});
    const fb = document.getElementById('copy-feedback');
    if (fb) {
      fb.textContent = feedbackMessage;
      setTimeout(() => {
        fb.textContent = '';
      }, 2200);
    }
  }

  private downloadTextFile(filename: string, content: string): void {
    const blob = new Blob([content], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FFmpegStudioController();
});
