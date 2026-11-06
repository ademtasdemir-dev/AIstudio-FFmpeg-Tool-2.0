import subprocess
import shutil


class HardwareAccelerator:
    """Erkennt automatisch vorhandene GPU-Hardware-Encoder (NVIDIA, Apple, Intel, AMD)."""

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
