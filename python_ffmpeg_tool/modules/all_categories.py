import os
import tempfile
from typing import List, Dict, Any
from .base import BaseModule


# ==============================================================================
# KATEGORIE 1: BILD- & FRAME-KONVERTIERUNG
# ==============================================================================
class ExtractFramesModule(BaseModule):
    name = "1.1 Video in Einzelbilder zerlegen"

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


class ThumbnailModule(BaseModule):
    name = "1.3 Thumbnail / Vorschaubild erzeugen"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        timestamp = options.get("time", "00:00:03")
        return ["-y", "-ss", timestamp, "-i", input_video, "-frames:v", "1", "-q:v", "2", output_path]


# ==============================================================================
# KATEGORIE 2: GRUNDLEGENDE BEARBEITUNG
# ==============================================================================
class TrimModule(BaseModule):
    name = "2.1 Video schneiden (Trimmen)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        start = options.get("start", "00:00:02")
        duration = str(options.get("duration", 10))
        fast_cut = options.get("fast_cut", True)
        cmd = ["-y", "-ss", start, "-i", input_video, "-t", duration]
        cmd.extend(["-c", "copy"] if fast_cut else ["-c:v", "libx264", "-crf", "18", "-c:a", "aac"])
        cmd.append(output_path)
        return cmd


class ScaleModule(BaseModule):
    name = "2.2 Auflösung ändern (Skalieren)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        res = options.get("resolution", "1280:-2")
        return ["-y", "-i", input_video, "-vf", f"scale={res}", "-c:v", "libx264", "-crf", "20", "-c:a", "copy", output_path]


class CropModule(BaseModule):
    name = "2.3 Bildausschnitt zuschneiden (Crop)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        crop_filter = options.get("crop_filter", "crop=min(iw\\,ih):min(iw\\,ih):(iw-ow)/2:(ih-oh)/2")
        return ["-y", "-i", input_video, "-vf", crop_filter, "-c:v", "libx264", "-crf", "19", "-c:a", "copy", output_path]


class ConcatModule(BaseModule):
    name = "2.4 Videos zusammenfügen (Concatenate)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        additional_files = options.get("additional_files", [])
        all_files = [input_video] + additional_files
        temp_list = tempfile.NamedTemporaryFile(mode="w", suffix=".txt", delete=False, encoding="utf-8")
        with temp_list as f:
            for filepath in all_files:
                clean_path = os.path.abspath(filepath).replace("\\", "/")
                f.write(f"file '{clean_path}'\n")
        return ["-y", "-f", "concat", "-safe", "0", "-i", temp_list.name, "-c", "copy", output_path]


# ==============================================================================
# KATEGORIE 3: KOMPRESSOR & CODECS
# ==============================================================================
class CrfCompressionModule(BaseModule):
    name = "3.1 Video komprimieren (CRF H.264 / H.265)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        codec = options.get("codec", "libx264")
        crf = str(options.get("crf", 23))
        preset = options.get("preset", "medium")
        return [
            "-y", "-i", input_video, "-c:v", codec, "-crf", crf,
            "-preset", preset, "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart", output_path
        ]


class FormatRemuxModule(BaseModule):
    name = "3.2 Format konvertieren (Remuxing: MKV / MOV ➔ MP4)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        return ["-y", "-i", input_video, "-c", "copy", "-movflags", "+faststart", output_path]


# ==============================================================================
# KATEGORIE 4: AUDIO-TOOLS
# ==============================================================================
class ExtractAudioModule(BaseModule):
    name = "4.1 Tonspur extrahieren (MP3 / AAC / WAV)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        return ["-y", "-i", input_video, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", output_path]


class MuteVideoModule(BaseModule):
    name = "4.2 Video stummschalten (Audio entfernen)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        return ["-y", "-i", input_video, "-an", "-c:v", "copy", output_path]


# ==============================================================================
# KATEGORIE 5: FORTGESCHRITTENE FILTER & SPEZIAL-OPTIONEN
# ==============================================================================
class VisualEffectsModule(BaseModule):
    name = "5.1 Farbfilter & Bildeffekte (SW / Blur / Sepia)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        vf = options.get("vf", "hue=s=0")
        return ["-y", "-i", input_video, "-vf", vf, "-c:v", "libx264", "-crf", "20", "-c:a", "copy", output_path]


class RotateFlipModule(BaseModule):
    name = "5.2 Video rotieren & spiegeln"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        vf = options.get("vf", "transpose=1")
        return ["-y", "-i", input_video, "-vf", vf, "-c:v", "libx264", "-crf", "20", "-c:a", "copy", output_path]


class PlaybackSpeedModule(BaseModule):
    name = "5.3 Geschwindigkeit ändern (Zeitraffer / Zeitlupe)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        speed = float(options.get("speed", 2.0))
        pts = 1.0 / speed
        return [
            "-y", "-i", input_video,
            "-filter_complex", f"[0:v]setpts={pts:.4f}*PTS[v];[0:a]atempo={speed}[a]",
            "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-c:a", "aac", output_path
        ]


class SocialAutoBlurModule(BaseModule):
    name = "5.4 Social Media Format (16:9 zu 9:16 mit Blur-Rand)"

    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        fc = (
            "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920,boxblur=35:5[bg];"
            "[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
        return ["-y", "-i", input_video, "-filter_complex", fc, "-c:v", "libx264", "-crf", "21", "-c:a", "copy", output_path]
