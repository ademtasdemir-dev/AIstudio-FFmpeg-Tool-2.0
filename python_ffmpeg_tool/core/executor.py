import subprocess
import shutil
from typing import List, Callable, Optional


class FFmpegExecutionError(Exception):
    """Spezifischer Fehler für fehlgeschlagene FFmpeg-Aufrufe inklusive Log-Ausgabe."""
    def __init__(self, message: str, returncode: int, stderr_log: str):
        super().__init__(f"{message} (Exit-Code: {returncode})")
        self.returncode = returncode
        self.stderr_log = stderr_log


class FFmpegExecutor:
    """Führt FFmpeg-Befehle sicher, modular und nicht-blockierend über subprocess aus."""

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
                    stderr_log="\n".join(stderr_lines)
                )
            return True

        except subprocess.SubprocessError as exc:
            raise FFmpegExecutionError(
                message=f"Systemfehler beim Starten des Subprozesses: {exc}",
                returncode=-1,
                stderr_log=""
            )
