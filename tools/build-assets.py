#!/usr/bin/env python3
"""从上游 exercises-dataset 生成本站使用的数据与素材。

上游仓库通过 jsDelivr 分发，国内不可用，因此把素材落到本地同源目录：

    assets/images/*.jpg   动作缩略图（原样复制）
    assets/videos/*.webp  动作动画（GIF 转 animated WebP，体积约为原来的三分之一）
    data/exercises.json   仅保留 UI 用到的字段与中英文说明

用法：

    git clone --depth 1 https://github.com/hasaneyldrm/exercises-dataset /tmp/exercises-dataset
    python3 tools/build-assets.py --source /tmp/exercises-dataset

素材版权属于 Gym visual，详见 README 的「数据与媒体」一节。
"""

import argparse
import json
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

# app.js 实际读取的字段，其余（其他语种说明、secondary_muscles、created_at 等）一律丢弃
KEPT_FIELDS = ("id", "name", "body_part", "equipment", "target", "muscle_group", "image")
KEPT_LANGS = ("zh", "en")

WEBP_QUALITY = "75"


def convert_gif(job):
    source, target = job
    result = subprocess.run(
        ["gif2webp", "-lossy", "-q", WEBP_QUALITY, "-m", "6", str(source), "-o", str(target)],
        capture_output=True,
    )
    if result.returncode != 0:
        return f"{source.name}: {result.stderr.decode(errors='replace').strip()}"
    return None


def build_media(source_root, out_root, workers):
    images_out = out_root / "assets" / "images"
    videos_out = out_root / "assets" / "videos"
    images_out.mkdir(parents=True, exist_ok=True)
    videos_out.mkdir(parents=True, exist_ok=True)

    for jpg in sorted((source_root / "images").glob("*.jpg")):
        shutil.copy2(jpg, images_out / jpg.name)

    jobs = [
        (gif, videos_out / f"{gif.stem}.webp")
        for gif in sorted((source_root / "videos").glob("*.gif"))
    ]
    with ThreadPoolExecutor(max_workers=workers) as pool:
        failures = [message for message in pool.map(convert_gif, jobs) if message]
    if failures:
        print(f"  {len(failures)} 个 GIF 转换失败：", file=sys.stderr)
        for message in failures[:10]:
            print(f"    {message}", file=sys.stderr)
        raise SystemExit(1)
    return len(jobs)


def build_data(source_root, out_root):
    with (source_root / "data" / "exercises.json").open(encoding="utf-8") as handle:
        records = json.load(handle)

    trimmed = []
    for record in records:
        item = {field: record[field] for field in KEPT_FIELDS if record.get(field)}
        # 动画已转成 WebP，路径跟着换扩展名
        item["gif_url"] = record["gif_url"].rsplit(".", 1)[0] + ".webp"
        steps = record.get("instruction_steps") or {}
        item["instruction_steps"] = {
            lang: steps[lang] for lang in KEPT_LANGS if steps.get(lang)
        }
        trimmed.append(item)

    out_path = out_root / "data" / "exercises.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with out_path.open("w", encoding="utf-8") as handle:
        json.dump(trimmed, handle, ensure_ascii=False, separators=(",", ":"))
    return len(trimmed), out_path.stat().st_size


def directory_size(path):
    return sum(item.stat().st_size for item in path.rglob("*") if item.is_file())


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", required=True, type=Path, help="上游 exercises-dataset 仓库路径")
    parser.add_argument("--out", type=Path, default=Path(__file__).resolve().parent.parent, help="输出目录，默认为项目根目录")
    parser.add_argument("--workers", type=int, default=8, help="GIF 转换并发数")
    args = parser.parse_args()

    source_root = args.source.resolve()
    for required in ("data/exercises.json", "images", "videos"):
        if not (source_root / required).exists():
            parser.error(f"上游仓库缺少 {required}：{source_root}")

    if shutil.which("gif2webp") is None:
        parser.error("需要 gif2webp（Debian/Ubuntu: apt install webp，macOS: brew install webp）")

    out_root = args.out.resolve()

    print("转换素材……")
    count = build_media(source_root, out_root, args.workers)
    images_size = directory_size(out_root / "assets" / "images")
    videos_size = directory_size(out_root / "assets" / "videos")
    source_videos = directory_size(source_root / "videos")
    print(f"  缩略图 {images_size / 1048576:.1f} MB")
    print(f"  动画 {count} 个：{source_videos / 1048576:.1f} MB GIF → {videos_size / 1048576:.1f} MB WebP")

    print("裁剪数据……")
    records, size = build_data(source_root, out_root)
    source_size = (source_root / "data" / "exercises.json").stat().st_size
    print(f"  {records} 条：{source_size / 1048576:.1f} MB → {size / 1048576:.1f} MB")


if __name__ == "__main__":
    main()
