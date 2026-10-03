"""C35/C38: create an independent deck; never overwrite or infer media consent."""
from pathlib import Path
import argparse
import json
import shutil
import subprocess
import sys

SKILL = Path(__file__).resolve().parents[1]
PROJECT = SKILL.parents[2]


def relative_file(base, value):
    relative = Path(value)
    if relative.is_absolute() or '..' in relative.parts or ':' in str(value):
        raise ValueError(f'Asset must be a deck-relative path: {value}')
    path = (base / relative).resolve()
    if not path.is_relative_to(base.resolve()) or not path.is_file():
        raise ValueError(f'Missing local asset: {value}')
    return path, relative


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--style', required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--title')
    parser.add_argument('--background', choices=['none', 'ocean', 'waves', 'video'], default=None)
    parser.add_argument('--model', choices=['none', 'carrier'], default=None)
    parser.add_argument('--particle-text')
    parser.add_argument('--homepage', choices=['particles', 'cover', 'none'])
    parser.add_argument('--config', type=Path, help='Full content config; assets relative to its parent.')
    args = parser.parse_args()
    registry = json.loads((SKILL / 'references/styles/registry.json').read_text(encoding='utf-8'))
    entry = next((s for s in registry['styles'] if s['id'] == args.style), None)
    if not entry:
        parser.error('Unknown style: ' + args.style)
    if not entry.get('runtime'):
        parser.error('Documented design, no prebuilt runtime: ' + entry['reference'])
    output = args.output.resolve()
    if output.exists():
        parser.error('Output exists; choose a fresh topic path. Nothing overwritten.')
    source = (SKILL / entry['runtime']).resolve()
    if not source.is_relative_to(SKILL):
        parser.error('Invalid runtime path')
    config = json.loads((args.config or source / 'deck.json').read_text(encoding='utf-8'))
    for field, value in [('background', args.background), ('model', args.model),
                         ('particleText', args.particle_text), ('homepage', args.homepage)]:
        if value is not None:
            config[field] = value
    if args.title:
        config['title'] = args.title
        for slide in config['slides']:
            if slide['type'] == 'cover':
                slide['title'] = args.title
    extras = []
    if config.get('background') == 'waves':
        for name in ['background.mp4', 'poster.png']:
            private = PROJECT / '.private-assets/waves' / name
            if not private.is_file():
                parser.error('Default waves are private optional assets, not bundled in Git; provide authorized media or use none.')
            extras.append((private, Path('media/waves') / name))
        config.update(background='video', video='media/waves/background.mp4', poster='media/waves/poster.png')
    if config.get('model') == 'carrier':
        carrier = PROJECT / '.private-assets/carrier'
        expected = [carrier / 'poster.webp'] + [carrier / 'sprites' / f'sheet-{i:02}.webp' for i in range(15)]
        if not all(p.is_file() for p in expected):
            parser.error('Carrier requires the complete private poster and 15 sheets; use none if unavailable.')
        extras.extend((p, Path('media/carrier') / p.relative_to(carrier)) for p in expected)
    if config.get('background') == 'video' and not all(config.get(k) for k in ('video', 'poster')):
        parser.error('Video mode requires video and poster in --config.')
    supplied = {str(rel).replace('\\', '/') for _, rel in extras}
    for key in ('logo', 'video', 'poster'):
        if key != 'logo' and config.get('background') != 'video':
            config.pop(key, None)
            continue
        value = config.get(key)
        if not value or value in supplied:
            continue
        try:
            if args.config:
                try:
                    extras.append(relative_file(args.config.resolve().parent, value))
                except ValueError:
                    relative_file(source, value)
            else:
                relative_file(source, value)
        except ValueError as error:
            parser.error(str(error))
    if config.get('homepage', 'particles') not in ('particles', 'cover', 'none'):
        parser.error('homepage: particles | cover | none')
    if not 1 <= len(str(config.get('particleText', 'FANGCUN')).strip()) <= 12:
        parser.error('particleText must have 1–12 characters; put full title in cover.')
    shutil.copytree(source, output, ignore=shutil.ignore_patterns('__pycache__', '*.pyc', 'asset-manifest.json'))
    for origin, relative in extras:
        (output / relative).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(origin, output / relative)
    (output / 'deck.json').write_text(json.dumps(config, ensure_ascii=False, indent=2), encoding='utf-8')
    shutil.copy2(SKILL / 'scripts/serve.py', output / 'serve.py')
    shutil.copy2(SKILL / 'LICENSE', output / 'LICENSE')
    shutil.copy2(SKILL / 'NOTICE', output / 'NOTICE')
    (output / '启动演示.bat').write_text('@echo off\nchcp 65001 >nul\ncd /d "%~dp0"\npython --version >nul 2>&1\nif errorlevel 1 (py -3 serve.py) else (python serve.py)\npause\n', encoding='utf-8')
    (output / 'README.md').write_text(f'''# {config['title']}

方寸 FANGCUN 独立网页演示。Python 3.10+：双击「启动演示.bat」或执行 `python serve.py`。
自动选择空闲端口并打开浏览器，只绑定本机；Ctrl+C 停止。不要以 file:// 双击 HTML。
内网共享必须明确选择 `python serve.py --bind 0.0.0.0 --port 4180`，按环境配置防火墙。

修改 deck.json（内容、Logo、background、homepage、particleText），运行 `python build_deck.py`。
生成器、数据、模板、主题、模块是维护源，不只改生成的 index.html。
资源均随本目录保存；播放不需要原仓库、Node/npm 或互联网。

单击/空格/PageDown/滚轮逐步推进，方向键切页，Home/End 首尾；控件操作不翻页。
粒子开场：鼠标弯曲、点击散开、聚合后进入；右下角可以跳过。封面用按钮进入。
普通海洋页水面点击既起波也推进，船模仅在明确选择时展示，左右浏览无悬停抬起。
重新进入页面重置推进步骤；实验页应另设重置按钮。?page=0 为第一页。

homepage=particles/cover/none 分别为粒子开场/简洁封面/直接正文；粒子短词 1–12 字符。
logo 为空字符串是不放标志。background=none/ocean/video，video 需相对路径 video 和 poster。
正文过多请拆页。黑屏检查本地服务、浏览器 WebGL；视频失败检查后备图和文件路径。
随包资源许可和私有媒体使用限制见 ASSETS.md。客户内容和本包不默认进入 GitHub。
本包含方寸非商业许可组件，未经另行书面授权不得商用。分发须保留 LICENSE 及第三方许可。
客户自己的文稿不因此归方寸所有；独立第三方部分仍按原许可使用。
对外分发或供人联网使用须公开涵盖部分的匹配版本对应源码，保留同一许可及 NOTICE。
源码包括本包内生成器/模板/脚本及其受限改动；独立客户内容、密钥和日志不用也不得因此公开。
''', encoding='utf-8')
    subprocess.run([sys.executable, str(output / 'build_deck.py')], check=True)
    print(output)


if __name__ == '__main__':
    main()
