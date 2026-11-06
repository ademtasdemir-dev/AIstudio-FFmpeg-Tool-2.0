import os
import threading
from tkinter import filedialog, messagebox
import customtkinter as ctk

from core.executor import FFmpegExecutor, FFmpegExecutionError
from core.hardware import HardwareAccelerator
from modules.all_categories import (
    ExtractFramesModule,
    GenerateGifModule,
    ThumbnailModule,
    TrimModule,
    ScaleModule,
    CropModule,
    ConcatModule,
    CrfCompressionModule,
    FormatRemuxModule,
    ExtractAudioModule,
    MuteVideoModule,
    VisualEffectsModule,
    RotateFlipModule,
    PlaybackSpeedModule,
    SocialAutoBlurModule,
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
                ThumbnailModule(),
                TrimModule(),
                ScaleModule(),
                CropModule(),
                ConcatModule(),
                CrfCompressionModule(),
                FormatRemuxModule(),
                ExtractAudioModule(),
                MuteVideoModule(),
                VisualEffectsModule(),
                RotateFlipModule(),
                PlaybackSpeedModule(),
                SocialAutoBlurModule(),
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
            self.executor.run(args, log_callback=lambda l: self.log_view.insert("end", l + "\n"))
            messagebox.showinfo("Erfolg", "Videoverarbeitung abgeschlossen!")
        except FFmpegExecutionError as err:
            messagebox.showerror("FFmpeg Fehler", str(err))
        finally:
            self.run_btn.configure(state="normal")


if __name__ == "__main__":
    FFmpegStudioApp().mainloop()
