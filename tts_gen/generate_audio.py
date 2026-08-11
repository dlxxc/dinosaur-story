import os
import sys
import json
import subprocess
import tempfile

# ========== 配置 ==========
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STORIES_JS_PATH = os.path.join(PROJECT_ROOT, "src", "data", "stories.js")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "public", "audio")

# Kokoro 中文音色（可选：'zf_xiaobei' 女声 / 'zm_yunxi' 男声 / 'zf_xiaoxiao' 活泼女声）
DEFAULT_VOICE = "zf_xiaobei"
# 默认语速 1.0 = 适中
DEFAULT_SPEED = 1.0

# 确保输出目录存在
os.makedirs(OUTPUT_DIR, exist_ok=True)


def extract_stories_via_node():
    """通过 Node.js 执行 stories.js 并导出 JSON（最可靠，避免正则脆弱问题）"""
    print(f"📖 正在通过 Node.js 解析 {STORIES_JS_PATH} ...")

    # 构造一段 Node.js 脚本：读取 stories.js，去掉 export 语法，提取 stories 数组后 JSON 输出
    node_script = r"""
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const jsPath = process.argv[1];
const code = fs.readFileSync(jsPath, 'utf-8');

// 去掉 ES Module 的 `export const stories = ` 开头，保留数组本体
// 同时去掉 `export function ...` 结尾部分
const storiesMatch = code.match(/export\s+const\s+stories\s*=\s*(\[[\s\S]*?\n\])\s*\n/);
if (!storiesMatch) {
    console.error('ERROR: 未能找到 stories 数组');
    process.exit(1);
}

// 在 sandbox 中执行数组字面量，得到 JS 对象
const sandbox = {};
vm.createContext(sandbox);
const stories = vm.runInContext('(' + storiesMatch[1] + ')', sandbox);

// 只保留需要的字段
const result = stories.map(s => ({
    id: s.id,
    title: s.title,
    category: s.category,
    segments: s.segments.map(seg => ({
        image: seg.image,
        text: seg.text
    }))
}));

process.stdout.write(JSON.stringify(result, null, 2));
""".strip()

    try:
        result = subprocess.run(
            ["node", "-e", node_script, "--", STORIES_JS_PATH],
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=30,
        )
        if result.returncode != 0:
            print(f"❌ Node.js 执行失败:\n{result.stderr}")
            return None
        stories = json.loads(result.stdout)
        return stories
    except FileNotFoundError:
        print("❌ 未找到 node 命令，请确认已安装 Node.js 并加入 PATH")
        return None
    except Exception as e:
        print(f"❌ 解析失败: {e}")
        import traceback
        traceback.print_exc()
        return None


# ======== Kokoro 生成（适配 0.9.x API） ========
# 全局 pipeline 实例，避免每段都重新加载模型
_pipeline = None
KOKORO_SAMPLE_RATE = 24000  # Kokoro-82M 固定输出采样率


def get_pipeline(voice=DEFAULT_VOICE):
    """延迟初始化 Kokoro pipeline（只加载一次模型）"""
    global _pipeline
    if _pipeline is None:
        from kokoro import KPipeline
        # Kokoro 0.9.x: 使用 lang_code='z' (Mandarin Chinese)
        # 别名 'zh' 也可用，会自动映射到 'z'
        _pipeline = KPipeline(lang_code='z')
        print(f"     🎤 Kokoro 模型加载完成 (音色: {voice})")
    return _pipeline


def generate_audio_kokoro(text, output_path, voice=DEFAULT_VOICE, speed=DEFAULT_SPEED):
    """使用 Kokoro 82M 模型生成 WAV 音频（CPU 即可）"""
    try:
        import soundfile as sf
        import numpy as np
        import torch

        pipeline = get_pipeline(voice)

        # Kokoro 0.9.x: pipeline() 返回 generator，产出 KPipeline.Result 对象
        # Result 有 .audio 属性 (torch.Tensor)
        audio_chunks = []
        for result in pipeline(text, voice=voice, speed=speed):
            if result.audio is not None:
                # 转为 numpy 1D 数组
                audio_np = result.audio.cpu().numpy().reshape(-1)
                if len(audio_np) > 0:
                    audio_chunks.append(audio_np)

        if not audio_chunks:
            print(f"     ⚠️  未生成任何音频样本")
            return False

        audio_final = np.concatenate(audio_chunks)

        # 归一化到 [-1, 1] 防止爆音
        max_val = float(np.max(np.abs(audio_final)))
        if max_val > 0:
            audio_final = audio_final / max(max_val, 1e-6) * 0.95

        sf.write(output_path, audio_final.astype(np.float32), KOKORO_SAMPLE_RATE)
        return True
    except Exception as e:
        print(f"     ❌ 错误详情: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Kokoro TTS 批量音频生成器")
    parser.add_argument("-y", "--yes", action="store_true", help="跳过确认，直接开始生成")
    parser.add_argument("--voice", type=str, default=DEFAULT_VOICE, help=f"音色 (默认: {DEFAULT_VOICE})")
    parser.add_argument("--speed", type=float, default=DEFAULT_SPEED, help=f"语速 (默认: {DEFAULT_SPEED})")
    parser.add_argument("--story-id", type=str, default=None, help="只生成指定 story_id 的音频（调试用）")
    parser.add_argument("--regen", action="store_true", help="即使文件已存在也强制重新生成")
    args = parser.parse_args()

    print("=" * 60)
    print("🦖 恐龙教养故事 - Kokoro TTS 批量音频生成器")
    print("=" * 60)

    # -------- 1. 解析 stories.js --------
    print()
    stories = extract_stories_via_node()
    if stories is None:
        print("❌ 无法解析故事数据，终止")
        return

    # 可选：只生成单个故事
    if args.story_id:
        stories = [s for s in stories if s["id"] == args.story_id]
        if not stories:
            print(f"❌ 未找到 story_id={args.story_id}")
            return
        print(f"🎯 仅生成指定故事: {stories[0]['title']} ({stories[0]['id']})")

    total_segments = sum(len(s["segments"]) for s in stories)
    print(f"✅ 共解析到 {len(stories)} 篇故事，总计 {total_segments} 段文本")

    if total_segments == 0:
        print("❌ 没有提取到任何段落，终止")
        return

    # 打印第一段样本，供用户人工确认内容正确
    first = stories[0]
    seg0 = first["segments"][0]
    print(f"\n📝 样本校验：")
    print(f"   第1篇标题: {first['title']} (id={first['id']})")
    print(f"   第1段图片: {seg0['image']}")
    print(f"   第1段文本前60字: {seg0['text'][:60]}...")

    # -------- 2. 确认生成 --------
    print(f"\n🎯 输出目录: {OUTPUT_DIR}")
    print(f"🎤 音色: {args.voice}  |  语速: {args.speed}"
          + (f"  |  强制重生成: 是" if args.regen else ""))
    print(f"⚠️  首次运行会自动下载 Kokoro-82M 模型权重（约 80MB），请耐心等待")
    print(f"⚠️  预计生成 {total_segments} 个 wav 文件，每段约 5-30 秒，总共可能需要几分钟到十几分钟（取决于 CPU）")

    if not args.yes:
        try:
            confirm = input("\n按 Enter 键开始生成，或输入 'q' 退出: ")
        except EOFError:
            confirm = ""
        if confirm.lower() == "q":
            print("已取消")
            return
    else:
        print("\n✅ --yes 参数已启用，3 秒后自动开始生成...")
        import time
        time.sleep(3)

    # -------- 3. 批量生成 --------
    current = 0
    success_count = 0
    fail_count = 0
    skip_count = 0

    for story in stories:
        story_id = story["id"]
        story_dir = os.path.join(OUTPUT_DIR, story_id)
        os.makedirs(story_dir, exist_ok=True)

        print(f"\n{'─' * 50}")
        print(f"📚 [{success_count + fail_count + skip_count + 1}/{len(stories)}] "
              f"{story['title']} ({story_id})  -  {len(story['segments'])} 段")

        for seg in story["segments"]:
            current += 1
            # 文件名与图片一一对应: manner-001-1.jpg → manner-001-1.wav
            img_name = os.path.basename(seg["image"])
            audio_name = os.path.splitext(img_name)[0] + ".wav"
            output_path = os.path.join(story_dir, audio_name)

            # 跳过已存在（断点续跑），--regen 时强制重新生成
            if (not args.regen) and os.path.exists(output_path) and os.path.getsize(output_path) > 1024:
                skip_count += 1
                print(f"   ⏭️  [{current}/{total_segments}] 跳过(已存在): {audio_name}")
                continue

            print(f"   ▶️  [{current}/{total_segments}] 生成: {audio_name}")
            preview = seg["text"].replace("\n", " ")[:36]
            print(f"        文本: {preview}...")

            ok = generate_audio_kokoro(seg["text"], output_path, voice=args.voice, speed=args.speed)
            if ok:
                success_count += 1
                size_kb = os.path.getsize(output_path) // 1024
                print(f"        ✅ 成功 ({size_kb} KB)")
            else:
                fail_count += 1
                print(f"        ❌ 失败")

    # -------- 4. 完成统计 --------
    print()
    print("=" * 60)
    print("🎉 生成完成！")
    print(f"   ✅ 成功生成: {success_count} 段")
    print(f"   ⏭️  跳过(已存在): {skip_count} 段")
    print(f"   ❌ 失败: {fail_count} 段")
    print(f"   📊 合计: {success_count + skip_count + fail_count} / {total_segments} 段")
    print(f"\n📁 所有音频文件位于: {OUTPUT_DIR}")
    print("=" * 60)

    if fail_count > 0:
        print("\n💡 有失败的段落，可以直接重新运行本脚本（已成功的会自动跳过）")


if __name__ == "__main__":
    main()
