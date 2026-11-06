from abc import ABC, abstractmethod
from typing import List, Dict, Any


class BaseModule(ABC):
    """Gemeinsame abstrakte Basisklasse für alle FFmpeg-Funktionsmodule."""

    @property
    @abstractmethod
    def name(self) -> str:
        pass

    @abstractmethod
    def build_command(self, input_video: str, output_path: str, options: Dict[str, Any]) -> List[str]:
        pass
