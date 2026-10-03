"""C29/C35: build a new topic from data; Python 3.10+, no npm or source-workspace dependency."""
from pathlib import Path
from html import escape
import json
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent

def text(value):
    return escape(str(value), quote=True)

def local_path(value):
    value = str(value)
    if Path(value).is_absolute() or '..' in Path(value).parts or ':' in value:
        raise ValueError(f'Use a local relative asset path: {value}')
    path = (ROOT/value).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        raise ValueError(f'Asset must exist inside this deck: {value}')
    return value

def build():
    config = json.loads((ROOT/'deck.json').read_text(encoding='utf-8'))
    background = config.get('background', 'none')
    if background not in ('none', 'ocean', 'video'):
        raise ValueError('background: none | ocean | video')
    model = config.get('model', 'none')
    if model not in ('none', 'carrier'):
        raise ValueError('model: none | carrier')
    logo = config.get('logo', 'brand/fangcun-logo.svg')
    if logo:
        local_path(logo)
    brand = f'<img class="brand" src="{text(logo)}" alt="{text(config.get("brand", "方寸 FANGCUN"))}">' if logo else ''
    homepage = config.get('homepage', 'particles')
    if homepage not in ('particles', 'cover', 'none'):
        raise ValueError('homepage: particles | cover | none')
    entries = [item for item in config['slides']
               if not (homepage != 'particles' and item['type'] == 'prologue')
               and not (homepage == 'none' and item['type'] == 'cover')]
    if not entries:
        raise ValueError('At least one slide is required')
    sections = []
    ocean_src = 'media/ocean/index.html?logo=0&amp;interactive=0&amp;paused=1'
    for i, item in enumerate(entries):
        kind = item['type']
        if kind not in ('prologue','cover','chapter','cards','process','closing'):
            raise ValueError(f'Unsupported slide type: {kind}')
        title = text(item['title'])
        eyebrow = text(item.get('eyebrow', ''))
        bg = background if kind in ('cover','cards','process') else 'none'
        classes = f'slide {kind} ' + ('light' if bg=='none' else '')
        content = ''
        if kind == 'prologue':
            word = str(config.get('particleText', 'FANGCUN')).strip()
            if not word or len(word)>12:
                raise ValueError('particleText must contain 1–12 characters')
            content = f'<iframe class="particle-frame" data-src="media/particles/index.html?logo=0&amp;embed=1&amp;text={quote(word)}" title="粒子交互开场"></iframe><div class="opening-copy"><p>{eyebrow}</p><h1>{title}</h1></div><div class="opening-hint">移动鼠标弯曲 · 单击散开 · 聚合后进入</div>'
            content += '<button class="opening-skip" data-skip>跳过开场 →</button>'
        elif kind == 'cover':
            content = f'<div class="cover-copy"><p class="eyebrow">{eyebrow}</p><h1>{title}</h1><p class="subtitle">{text(item.get("subtitle", ""))}</p></div><button class="cover-next" data-next>进入下一章 <i>→</i></button>'
        elif kind == 'chapter':
            content = f'<div class="chapter-no">{text(item.get("number", "01"))}</div><div class="chapter-copy"><p>{eyebrow}</p><h2>{title}</h2></div><div class="chapter-tech-note"><span>⊕</span><i></i><div><b>本章目标</b><small>{text(item.get("goal", ""))}</small></div></div>'
            if model == 'carrier':
                local_path('media/carrier/poster.webp')
                for sheet in range(15):
                    local_path(f'media/carrier/sprites/sheet-{sheet:02}.webp')
                classes += ' carrier-slide'
                content += '<div class="carrier-stage chapter-carrier" aria-hidden="true"><img src="media/carrier/poster.webp" alt=""><canvas width="1120" height="630"></canvas></div>'
        elif kind in ('cards','process'):
            cards = item.get('items', [])
            if not 1<=len(cards)<=4:
                raise ValueError('Use 1–4 items per slide; split rather than shrink')
            content = f'<h2 class="page-title">{title}</h2><div class="card-grid {kind}-grid" style="--columns:{len(cards)}">'
            for n, card in enumerate(cards, 1):
                contrast = 'light' if (n-.5)/len(cards)>.65 else 'dark'
                content += f'<article class="glass content-card" data-contrast="{contrast}" data-build><span class="card-number">{n:02}</span><h3>{text(card["title"])}</h3><p>{text(card.get("body", ""))}</p></article>'
            content += '</div>'
            if item.get('conclusion'):
                content += f'<p class="statement" data-build>{text(item["conclusion"])}</p>'
        else:
            if background == 'ocean':
                content += f'<div class="closing-ocean-shell"><iframe class="closing-ocean" data-src="{ocean_src}" title="海洋背景" tabindex="-1" aria-hidden="true"></iframe></div>'
            content += f'<div class="closing-copy"><p class="eyebrow">{eyebrow}</p><h2>{title}</h2><div class="closing-actions">'
            for n, card in enumerate(item.get('items', [])[:3], 1):
                content += f'<div data-build><span>{n:02}</span><b>{text(card["title"])}</b><p>{text(card.get("body", ""))}</p></div>'
            content += f'</div><p class="closing-line">{text(item.get("conclusion", ""))}</p></div>'
        sections.append(f'<section class="{classes}" data-page="{i}" data-background="{bg}" aria-label="{title}">{brand}{content}<div class="folio">{i:02} / {len(entries)-1:02}</div><div class="build-progress" aria-live="polite"></div></section>')
    backdrop = ''
    if background == 'ocean':
        backdrop = f'<iframe id="globalOcean" class="global-ocean" data-src="{ocean_src}" title="海洋背景" tabindex="-1" aria-hidden="true"></iframe>'
    elif background == 'video':
        video, poster = local_path(config['video']), local_path(config['poster'])
        backdrop = f'<video class="global-video" muted loop playsinline preload="metadata" poster="{text(poster)}" src="{text(video)}"></video>'
    html = (ROOT/'template.html').read_text(encoding='utf-8')
    for key, value in {'TITLE':text(config['title']), 'VIEWPORT':(ROOT/'viewport-base.css').read_text(encoding='utf-8'), 'THEME':(ROOT/'theme.css').read_text(encoding='utf-8'), 'BACKGROUND':backdrop, 'SLIDES':'\n'.join(sections)}.items():
        html = html.replace('<!-- '+key+' -->', value)
    (ROOT/'index.html').write_text(html, encoding='utf-8')
    print(f'Built {len(entries)} slides: {ROOT / "index.html"}')

if __name__ == '__main__':
    build()
