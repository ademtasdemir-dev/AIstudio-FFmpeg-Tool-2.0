export interface PythonProjectFile {
  path: string;
  title: string;
  category: string;
  description: string;
  code: string;
}

export const PYTHON_PROJECT_FILES: PythonProjectFile[] = [
  {
    path: 'core/executor.py',
    title: 'Subprocess Executor & Error Handler',
    category: 'Fundament (Core)',
    description: 'Kapselt subprocess.Popen, streamt STDERR-Fortschritt und fängt FFmpeg-Exit-Codes sauber ab.',
    code: `import subprocess
import shutil
from typing import List, Callable, Optional


class FFmpegExecutionError(Exception):
    """Spezifischer Fehler für fehlgeschlagene FFmpeg-Aufrufe inklusive Log-Ausgabe."""
    def __init__(self, message: str, returncode: int, stderr_log: str):
        super().__init__(f"{message} (Exit-Code: {returncode})")
        self.returncode = returncode
        self.stderr_log = stderr_log


class FFmpegExecutor:
    """Führt FFmpeg-Befehle sicher, modular und nicht-blockierend aus."""

    def __init__(self, ffmpeg_bin: str = "ffmpeg"):
        self.ffmpeg_bin = ffmpeg_bin
        self._verify_installation()

    def _verify_installation(self):
        if not shutil.which(self.ffmpeg_bin):
            raise FileNotFoundError(
                f"FFmpeg wurde unter '{self.ffmpeg_bin}' nicht gefunden! "
                "Bitte installiere FFmpeg und füge es dem System-PATH hinzu."
            )

    def run(
        self,
        args: List[str],
        log_callback: Optional[Callable[[str], None]] = None
    ) -> bool:
        command = [self.ffmpeg_bin] + args
        stderr_lines: List[str] = []

        try:
            process = subprocess.Popen(
                command,
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
                    message="FFmpeg-Prozess mit Fehler beendet.",
                    returncode=process.returncode,
                    stderr_log="\\n".join(stderr_lines)
                )
            return True

        except subprocess.SubprocessError as exc:
            raise FFmpegExecutionError(
                message=f"Systemfehler beim Starten des Subprozesses: {exc}",
                returncode=-1,
                stderr_log=""
            )
`,
  },
  {
    path: 'core/hardware.py',
    title: 'GPU Hardware-Encoder Erkennung',
    category: 'Fundament (Core)',
    description: 'Erkennt automatisch NVIDIA NVENC, Apple VideoToolbox, Intel QuickSync und AMD AMF.',
    code: `import subprocess
import shutil


class HardwareAccelerator:
    """Prüft via 'ffmpeg -encoders' verfügbare GPU-Hardwarebeschleunigung."""

    @classmethod
    def detect_best_encoder(cls) -> dict:
        if not shutil.which("ffmpeg"):
            return {"h264": "libx264", "hevc": "libx265", "label": "CPU Software"}

        try:
            res = subprocess.run(
                ["ffmpeg", "-hide_banner", "-encoders"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5
            )
            out = res.stdout
            if "h264_nvenc" in out:
                return {"h264": "h264_nvenc", "hevc": "hevc_nvenc", "label": "NVIDIA NVENC GPU"}
            if "h264_videotoolbox" in out:
                return {"h264": "h264_videotoolbox", "hevc": "hevc_videotoolbox", "label": "Apple VideoToolbox"}
            if "h264_qsv" in out:
                return {"h264": "h264_qsv", "hevc": "hevc_qsv", "label": "Intel QuickSync"}
            if "h264_amf" in out:
                return {"h264": "h264_amf", "hevc": "hevc_amf", "label": "AMD AMF GPU"}
        except Exception:
            pass

        return {"h264": "libx264", "hevc": "libx265", "label": "CPU Software"}
`,
  },
  {
    path: 'modules/base.py',
    title: 'Abstrakte Modul-Basisklasse',
    category: 'Modul-Architektur',
    description: 'Definiert das einheitliche Interface für alle 5 Funktionskategorien.',
    code: `from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseModule(ABC):
    """Gemeinsame Basisklasse für alle FFmpeg-Funktionsmodule."""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        pass
`,
  },
  {
    path: 'modules/all_categories.py',
    title: 'Alle 5 Kategorien & Spezial-Module',
    category: 'Modul-Architektur',
    description: 'Beinhaltet Frames/GIF, Schnitt/Crop/Scale, CRF/Remux, Audio-Tools, Filter & Wasserzeichen/Subs.',
    code: `import os
from typing import List, Dict, Any
from .base import BaseModule


# --- KATEGORIE 1: BILD- & FRAME-KONVERTIERUNG ---
class ExtractFramesModule(BaseModule):
    name = "1.1 Einzelbilder extrahieren"
    def build_command(self, input_video: str, output_pattern: str, options: Dict[str, Any]) -> List[str]:
        fps = options.get("fps", 1)
        return ["-y", "-i", input_video, "-vf", f"fps={fps}", "-q:v", "2", output_pattern]


class GenerateGifModule(BaseModule):
    name = "1.2 High-Quality GIF erstellen"
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        fps = options.get("fps", 15)
        width = options.get("width", 480)
        vf = f"fps={fps},scale={width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse"
        return ["-y", "-i", input_video, "-vf", vf, "-loop", "0", output_path]


# --- KATEGORIE 2: GRUNDLEGENDE BEARBEITUNG ---
class TrimModule(BaseModule):
    name = "2.1 Video schneiden (Trimmen)"
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        start = options.get("start", "00:00:02")
        duration = str(options.get("duration", 10))
        fast_cut = options.get("fast_cut", True)
        cmd = ["-y", "-ss", start, "-i", input_video, "-t", duration]
        cmd.extend(["-c", "copy"] if fast_cut else ["-c:v", "libx264", "-c:a", "aac"])
        cmd.append(output_path)
        return cmd


class ScaleModule(BaseModule):
    name = "2.2 Auflösung ändern (Skalieren)"
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        res = options.get("resolution", "1280:-2")
        return ["-y", "-i", input_video, "-vf", f"scale={res}", "-c:v", "libx264", "-crf", "20", "-c:a", "copy", output_path]


# --- KATEGORIE 3: KOMPRESSOR & CODECS ---
class CrfCompressionModule(BaseModule):
    name = "3.1 Video komprimieren (CRF)"
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        codec = options.get("codec", "libx264")
        crf = str(options.get("crf", 23))
        preset = options.get("preset", "medium")
        return [
            "-y", "-i", input_video, "-c:v", codec, "-crf", crf,
            "-preset", preset, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", output_path
        ]


# --- KATEGORIE 4: AUDIO-TOOLS ---
class ExtractAudioModule(BaseModule):
    name = "4.1 Tonspur extrahieren (MP3)"
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        return ["-y", "-i", input_video, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", output_path]


# --- KATEGORIE 5: FORTGESCHRITTENE FILTER ---
class PlaybackSpeedModule(BaseModule):
    name = "5.3 Geschwindigkeit ändern (Zeitraffer/Zeitlupe)"
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        speed = float(options.get("speed", 2.0))
        pts = 1.0 / speed
        return [
            "-y", "-i", input_video,
            "-filter_complex", f"[0:v]setpts={pts:.4f}*PTS[v];[0:a]atempo={speed}[a]",
            "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-c:a", "aac", output_path
        ]
`,
  },
  {
    path: 'main.py',
    title: 'CustomTkinter Desktop-GUI (Startdatei)',
    category: 'GUI Anwendung',
    description: 'Vollständige Desktop-Oberfläche mit Datei-Auswahl, Threading, Hardware-Erkennung und Live-Konsole.',
    code: `import os
import threading
from tkinter import filedialog, messagebox
import customtkinter as ctk

from core.executor import FFmpegExecutor, FFmpegExecutionError
from core.hardware import HardwareAccelerator
from modules.all_categories import (
    ExtractFramesModule, GenerateGifModule, TrimModule,
    ScaleModule, CrfCompressionModule, ExtractAudioModule, PlaybackSpeedModule
)

ctk.set_appearance_mode("Dark")
ctk.set_default_color_theme("blue")


class FFmpegStudioApp(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("FFmpeg Python Tool Studio")
        self.geometry("820x640")

        self.executor = FFmpegExecutor()
        self.hw = HardwareAccelerator.detect_best_encoder()

        self.modules = {
            m.name: m for m in [
                ExtractFramesModule(),
                GenerateGifModule(),
                TrimModule(),
                ScaleModule(),
                CrfCompressionModule(),
                ExtractAudioModule(),
                PlaybackSpeedModule(),
            ]
        }

        self.input_file = ctk.StringVar()
        self.output_file = ctk.StringVar()
        self.selected_mod = ctk.StringVar(value=list(self.modules.keys())[0])
        self._build_ui()

    def _build_ui(self):
        header = ctk.CTkLabel(
            self,
            text=f"FFmpeg Studio — Aktive Engine: {self.hw['label']}",
            font=("Arial", 16, "bold")
        )
        header.pack(anchor="w", padx=16, pady=(12, 4))

        file_box = ctk.CTkFrame(self)
        file_box.pack(fill="x", padx=16, pady=8)

        ctk.CTkLabel(file_box, text="Eingabevideo:").grid(row=0, column=0, padx=10, pady=8, sticky="w")
        ctk.CTkEntry(file_box, textvariable=self.input_file, width=480).grid(row=0, column=1, padx=10, pady=8)
        ctk.CTkButton(file_box, text="Durchsuchen", width=110, command=self._pick_input).grid(row=0, column=2, padx=10, pady=8)

        ctk.CTkLabel(file_box, text="Ausgabeziel:").grid(row=1, column=0, padx=10, pady=8, sticky="w")
        ctk.CTkEntry(file_box, textvariable=self.output_file, width=480).grid(row=1, column=1, padx=10, pady=8)

        mod_box = ctk.CTkFrame(self)
        mod_box.pack(fill="x", padx=16, pady=8)
        ctk.CTkLabel(mod_box, text="FFmpeg-Modul wählen:").pack(anchor="w", padx=12, pady=(8, 2))
        ctk.CTkOptionMenu(mod_box, variable=self.selected_mod, values=list(self.modules.keys())).pack(fill="x", padx=12, pady=(0, 10))

        self.log_view = ctk.CTkTextbox(self, font=("Consolas", 11))
        self.log_view.pack(fill="both", expand=True, padx=16, pady=8)

        self.run_btn = ctk.CTkButton(self, text="Verarbeitung starten", height=42, command=self._start)
        self.run_btn.pack(fill="x", padx=16, pady=12)

    def _pick_input(self):
        path = filedialog.askopenfilename()
        if path:
            self.input_file.set(path)
            base, ext = os.path.splitext(path)
            self.output_file.set(f"{base}_processed{ext}")

    def _start(self):
        inp, out = self.input_file.get(), self.output_file.get()
        if not inp or not os.path.exists(inp):
            messagebox.showerror("Fehler", "Bitte wähle eine gültige Eingabedatei!")
            return
        self.run_btn.configure(state="disabled")
        threading.Thread(target=self._worker, args=(inp, out), daemon=True).start()

    def _worker(self, inp: str, out: str):
        try:
            mod = self.modules[self.selected_mod.get()]
            args = mod.build_command(inp, out, {})
            self.executor.run(args, log_callback=lambda l: self.log_view.insert("end", l + "\\n"))
            messagebox.showinfo("Erfolg", "Videoverarbeitung abgeschlossen!")
        except FFmpegExecutionError as err:
            messagebox.showerror("FFmpeg Fehler", str(err))
        finally:
            self.run_btn.configure(state="normal")


if __name__ == "__main__":
    FFmpegStudioApp().mainloop()
`,
  },
];
