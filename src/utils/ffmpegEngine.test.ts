import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FFMPEG_MODULES,
  buildCascadedAtempo,
  calculateTargetBitrateKbps,
  buildFFmpegCommand,
  deriveOutputFilename,
} from './ffmpegEngine';

test('all 6 categories have modules registered', () => {
  assert.equal(FFMPEG_MODULES.length, 20);
  const categories = new Set(FFMPEG_MODULES.map((m) => m.categoryId));
  assert.equal(categories.size, 6);
});

test('cascaded atempo handles extreme slow-mo and 4x fast-forward within 0.5-2.0 bounds', () => {
  assert.equal(buildCascadedAtempo(2.0), 'atempo=2');
  assert.equal(buildCascadedAtempo(4.0), 'atempo=2.0,atempo=2');
  assert.equal(buildCascadedAtempo(0.25), 'atempo=0.5,atempo=0.5');
});

test('target size MB bitrate calculation is accurate', () => {
  // 25 MB = 204,800 kilobits over 100s = 2048 kbps total; minus 128 kbps audio = 1920 kbps video
  const vBitrate = calculateTargetBitrateKbps(25, 100, 128);
  assert.equal(vBitrate, 1920);
});

test('CRF compressor builds CPU and NVIDIA NVENC commands with explanations', () => {
  const mod = FFMPEG_MODULES.find((m) => m.id === 'crf_compressor')!;
  const cpuRes = buildFFmpegCommand(
    mod,
    'demo_clip.mp4',
    { codecFamily: 'h264', crf: 22, preset: 'slow', faststart: true },
    'cpu'
  );
  assert.ok(cpuRes.args.includes('libx264'));
  assert.ok(cpuRes.args.includes('-crf'));
  assert.ok(cpuRes.args.includes('22'));
  assert.ok(cpuRes.args.includes('+faststart'));
  assert.equal(cpuRes.outputPath, 'demo_clip_compressed.mp4');
  assert.ok(cpuRes.explanations.length >= 4);
  assert.ok(cpuRes.pythonFunctionCode.includes('subprocess.Popen'));

  const nvencRes = buildFFmpegCommand(
    mod,
    'demo_clip.mp4',
    { codecFamily: 'hevc', crf: 26, preset: 'medium', faststart: true },
    'nvenc'
  );
  assert.ok(nvencRes.args.includes('hevc_nvenc'));
  assert.ok(nvencRes.args.includes('-cq'));
});

test('deriveOutputFilename respects dynamic extension changes', () => {
  const audioMod = FFMPEG_MODULES.find((m) => m.id === 'extract_audio')!;
  assert.equal(
    deriveOutputFilename('interview.mov', audioMod, { audioFormat: 'wav' }),
    'interview_audio.wav'
  );
});
