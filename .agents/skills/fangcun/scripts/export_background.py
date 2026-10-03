"""C40: export only a background's dependency closure, never a presentation."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil

SKILL = Path(__file__).resolve().parents[1]
PROJECT = SKILL.parents[2]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--background', choices=['koi-ocean', 'waves'], required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        parser.error('Output exists; select a fresh directory. Nothing overwritten.')
    runtime = SKILL / 'assets/styles/ocean'
    if args.background == 'koi-ocean':
        files = {p: p.relative_to(runtime) for p in (runtime / 'media/ocean').rglob('*') if p.is_file()}
        for relative in ['vendor/three.module.min.js', 'vendor/three.core.min.js', 'vendor/THREE-LICENSE.txt', 'brand/pointer.svg', 'THIRD-PARTY-NOTICES.txt']:
            files[runtime / relative] = Path(relative)
        title = '锦鲤海洋动态背景'
        content = '<iframe src="media/ocean/index.html?logo=0&amp;interactive=1" title="海岸、沙滩和三条锦鲤动态背景"></iframe>'
        extra = '移动鼠标产生轻波，点击水面产生强波，三条锦鲤随波前避让。没有钓竿或捕鱼玩法。'
    else:
        private = PROJECT / '.private-assets/waves'
        files = {private / 'background.mp4': Path('media/background.mp4'), private / 'poster.png': Path('media/poster.png')}
        title = '默认海浪动态背景'
        content = '<video muted autoplay loop playsinline poster="media/poster.png" src="media/background.mp4"></video>'
        extra = '这是本机可选示例媒体，公开再分发权未确认，不进入 GitHub。减弱动效时暂停视频，保留后备图。'
    missing = [str(p) for p in files if not p.is_file()]
    if missing:
        parser.error('Missing optional dependencies: ' + ', '.join(missing))
    output.mkdir(parents=True)
    for source, relative in files.items():
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
    html = f'''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="icon" href="data:,"><title>{title}</title><style>html,body{{margin:0;width:100%;height:100%;overflow:hidden;background:#dcebef}}iframe,video{{display:block;width:100%;height:100%;border:0;object-fit:cover}}</style></head><body>{content}<script>if(matchMedia('(prefers-reduced-motion:reduce)').matches)document.querySelector('video')?.pause();</script></body></html>'''
    (output / 'index.html').write_text(html, encoding='utf-8')
    shutil.copy2(SKILL / 'scripts/serve.py', output / 'serve.py')
    (output / '启动背景.bat').write_text('@echo off\nchcp 65001 >nul\ncd /d "%~dp0"\npython --version >nul 2>&1\nif errorlevel 1 (py -3 serve.py) else (python serve.py)\npause\n', encoding='utf-8')
    (output / 'README.md').write_text(f'''# {title}

这是单独背景资源，不是一份 PPT，没有正文、封面或翻页。
Python 3.10+：双击「启动背景.bat」或执行 `python serve.py`，只绑定本机并自动打开浏览器；Ctrl+C 关闭。
资源完全本地化，不需互联网、npm 或原工作目录；不要用 file:// 双击 HTML。
{extra}

维护源为方寸 skill 中登记的背景资产及 export_background.py；此目录是生成副本，修改源后重新导出到新目录。
来源 SHA-256 见 manifest.json；许可证独立保留。锦鲤/海岸为原项目确认的生成素材，公开分发前复核用途。
''', encoding='utf-8')
    manifest = {'background': args.background, 'entry': 'index.html', 'sources': {str(rel).replace('\\', '/'): hashlib.sha256(p.read_bytes()).hexdigest() for p, rel in files.items()}}
    (output / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print(output)


if __name__ == '__main__':
    main()
