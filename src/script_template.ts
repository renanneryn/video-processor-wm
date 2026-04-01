export const getPythonScript = (config: { watermark: string, opacity: number, motionEnabled: boolean, watermarkEnabled: boolean }) => `import json
import random
import subprocess
import sys
from pathlib import Path

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================
FFMPEG = Path(r"C:\\ffmpeg\\bin\\ffmpeg.exe")
FFPROBE = Path(r"C:\\ffmpeg\\bin\\ffprobe.exe")
BASE_DIR = Path(__file__).resolve().parent
RAW_FOLDER = BASE_DIR / "raw" if (BASE_DIR / "raw").exists() else BASE_DIR
OUT = BASE_DIR / "ready"
TARGET_WIDTH = 720
TARGET_HEIGHT = 1280
BLACK_PAD_SECONDS = 0.5

# MARCA D'ÁGUA DISCRETA
WATERMARK_ENABLED = ${config.watermarkEnabled ? 'True' : 'False'}
WATERMARK_TEXT = "${config.watermark}"
WATERMARK_OPACITY = ${config.opacity}  # Opacidade (quase invisível)
WATERMARK_SIZE = 18       # Tamanho da fonte
WATERMARK_MOTION = ${config.motionEnabled ? 'True' : 'False'}   # Se True, a marca d'água muda de posição periodicamente
# =============================================================================

OUT.mkdir(exist_ok=True)


def run_command(cmd):
    subprocess.run(cmd, check=True)


def probe_media(path):
    cmd = [
        str(FFPROBE),
        "-v",
        "error",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
        str(path),
    ]
    raw = subprocess.check_output(cmd).decode("utf-8", errors="replace")
    info = json.loads(raw)
    streams = info.get("streams", [])
    return {
        "video": next((s for s in streams if s.get("codec_type") == "video"), None),
        "audio": next((s for s in streams if s.get("codec_type") == "audio"), None),
        "format": info.get("format", {}),
    }


def get_metadata_fix_bsf(video_stream):
    bad_values = {"reserved", "unknown"}
    has_bad_metadata = any(
        video_stream.get(field) in bad_values
        for field in ("color_space", "color_transfer", "color_primaries")
    )
    if not has_bad_metadata:
        return None

    codec_name = (video_stream.get("codec_name") or "").lower()
    if codec_name == "h264":
        return (
            "h264_metadata="
            "video_full_range_flag=0:"
            "colour_primaries=1:"
            "transfer_characteristics=1:"
            "matrix_coefficients=1"
        )
    if codec_name == "hevc":
        return (
            "hevc_metadata="
            "video_full_range_flag=0:"
            "colour_primaries=1:"
            "transfer_characteristics=1:"
            "matrix_coefficients=1"
        )
    return None


def sanitize_source(path, media_info):
    bsf = get_metadata_fix_bsf(media_info["video"])
    if not bsf:
        return path, None, media_info

    temp_input = OUT / f"{path.stem}_sourcefix_{random.randint(100, 999)}.mp4"
    cmd = [
        str(FFMPEG),
        "-y",
        "-i",
        str(path),
        "-map",
        "0",
        "-c",
        "copy",
        "-bsf:v",
        bsf,
        "-color_primaries",
        "bt709",
        "-color_trc",
        "bt709",
        "-colorspace",
        "bt709",
        "-color_range",
        "tv",
        "-movflags",
        "+faststart",
        str(temp_input),
    ]
    run_command(cmd)
    return temp_input, temp_input, probe_media(temp_input)


def build_filter_chain():
    zoom = 1 + random.randint(1, 3) / 100
    
    filters = [
        "fps=30000/1001",
        f"scale={TARGET_WIDTH}:{TARGET_HEIGHT}:force_original_aspect_ratio=increase",
        f"crop={TARGET_WIDTH}:{TARGET_HEIGHT}",
        "setsar=1",
        "eq=saturation=1.08:contrast=1.05",
        f"scale=iw*{zoom}:ih*{zoom}",
        f"crop={TARGET_WIDTH}:{TARGET_HEIGHT}",
        "setsar=1",
        (
            f"tpad=start_duration={BLACK_PAD_SECONDS}:start_mode=add:"
            f"stop_duration={BLACK_PAD_SECONDS}:stop_mode=add:color=black"
        ),
    ]

    if WATERMARK_ENABLED:
        # Lógica de posicionamento (Estática ou Dinâmica)
        if WATERMARK_MOTION:
            # Muda de canto a cada 7 segundos para dificultar remoção automática
            pos_x = "if(lt(mod(t,14),7),20,w-tw-20)"
            pos_y = "if(lt(mod(t,28),14),h-th-20,20)"
        else:
            pos_x = "w-tw-20"
            pos_y = "h-th-20"

        # Filtro de marca d'água discreta
        watermark_filter = (
            f"drawtext=text='{WATERMARK_TEXT}':"
            f"fontcolor=white@{WATERMARK_OPACITY}:"
            f"fontsize={WATERMARK_SIZE}:"
            f"x={pos_x}:y={pos_y}:"
            f"shadowcolor=black@0.05:shadowx=1:shadowy=1"
        )
        filters.append(watermark_filter)

    filters.append("format=yuv420p")
    return ",".join(filters)


def transcode_video(source_path, output_path, include_audio):
    cmd = [
        str(FFMPEG),
        "-y",
        "-fflags",
        "+genpts",
        "-i",
        str(source_path),
        "-vf",
        build_filter_chain(),
        "-map",
        "0:v:0",
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "21",
        "-maxrate",
        "3200k",
        "-bufsize",
        "6400k",
        "-pix_fmt",
        "yuv420p",
        "-profile:v",
        "high",
        "-level:v",
        "4.0",
        "-color_primaries",
        "bt709",
        "-color_trc",
        "bt709",
        "-colorspace",
        "bt709",
        "-color_range",
        "tv",
        "-video_track_timescale",
        "30k",
        "-movflags",
        "+faststart",
    ]

    if include_audio:
        cmd.extend(
            [
                "-map",
                "0:a:0",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-ac",
                "2",
            ]
        )
    else:
        cmd.append("-an")

    cmd.append(str(output_path))
    run_command(cmd)


def build(file_path):
    media_info = probe_media(file_path)
    if not media_info["video"]:
        raise ValueError("arquivo sem stream de video")

    out_file = OUT / f"{file_path.stem}_ready{random.randint(100, 999)}.mp4"
    temp_out_file = out_file.with_suffix(".tmp.mp4")
    temp_input = None

    try:
        work_file, temp_input, media_info = sanitize_source(file_path, media_info)
        include_audio = media_info["audio"] is not None

        try:
            transcode_video(work_file, temp_out_file, include_audio=include_audio)
        except subprocess.CalledProcessError:
            if temp_out_file.exists():
                temp_out_file.unlink()
            if not include_audio:
                raise
            print(f"  Aviso: audio problematico em {file_path.name}. Tentando sem audio...")
            transcode_video(work_file, temp_out_file, include_audio=False)

        temp_out_file.replace(out_file)
        return out_file
    finally:
        if temp_out_file.exists():
            temp_out_file.unlink()
        if temp_input and temp_input.exists():
            temp_input.unlink()


def iter_input_files():
    for path in sorted(RAW_FOLDER.iterdir()):
        if path.is_file() and path.resolve() != Path(__file__).resolve():
            yield path


def main():
    for tool in (FFMPEG, FFPROBE):
        if not tool.exists():
            print(f"Ferramenta nao encontrada: {tool}")
            return 1

    if not RAW_FOLDER.exists():
        print(f"Pasta de entrada nao encontrada: {RAW_FOLDER}")
        return 1

    processed = []
    failed = []
    skipped = []

    for item in iter_input_files():
        try:
            media_info = probe_media(item)
        except Exception:
            skipped.append((item.name, "nao parece ser video"))
            continue

        if not media_info["video"]:
            skipped.append((item.name, "sem stream de video"))
            continue

        print(f"Processando {item.name}")
        try:
            out_file = build(item)
            processed.append((item.name, out_file.name))
            print(f"  OK -> {out_file.name}")
        except Exception as exc:
            failed.append((item.name, str(exc)))
            print(f"  ERRO -> {item.name}: {exc}")

    print()
    print(f"Concluido. OK: {len(processed)} | Erros: {len(failed)} | Ignorados: {len(skipped)}")

    if processed:
        print("Saidas:")
        for _, output_name in processed:
            print(f"  - {output_name}")

    if failed:
        print("Falhas:")
        for input_name, message in failed:
            print(f"  - {input_name}: {message}")

    if skipped:
        print("Ignorados:")
        for input_name, reason in skipped:
            print(f"  - {input_name}: {reason}")

    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
`;
