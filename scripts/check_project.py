"""Validate portable references, source hashes and Git publication boundaries."""
from pathlib import Path
import hashlib
import json
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / '.agents/skills/fangcun'


def check():
    problems = []
    registry = json.loads((SKILL / 'references/styles/registry.json').read_text(encoding='utf-8'))
    ids = set()
    code = (SKILL / 'references/code-reference.md').read_text(encoding='utf-8')
    for entry in registry['styles']:
        if entry['id'] in ids:
            problems.append('Duplicate style: ' + entry['id'])
        ids.add(entry['id'])
        if not (SKILL / entry['reference']).is_file():
            problems.append('Missing style reference: ' + entry['reference'])
        for ref in entry['codeRefs']:
            if f'## {ref}｜' not in code:
                problems.append('Missing code: ' + ref)
    for doc in [ROOT / 'README.md', *list((ROOT / 'docs').glob('*.md')), *list(SKILL.rglob('*.md'))]:
        source = doc.read_text(encoding='utf-8')
        for link in re.findall(r'\[[^\]]+\]\(([^)]+)\)', source):
            if ':' in link or '*' in link or link.startswith('#'):
                continue
            if not (doc.parent / link.split('#')[0]).exists():
                problems.append(f'Broken link {doc.relative_to(ROOT)}: {link}')
    record = json.loads((SKILL / 'references/provenance.json').read_text(encoding='utf-8'))
    for name, data in record['files'].items():
        file = SKILL / name
        if not file.is_file() or hashlib.sha256(file.read_bytes()).hexdigest() != data['snapshotSHA256']:
            problems.append('Snapshot changed without provenance update: ' + name)
    saved = record.get('twoToneCodeSHA256')
    if saved:
        duo = code[code.index('## C23'):code.index('## C29')].strip()
        if hashlib.sha256(duo.encode()).hexdigest() != saved:
            problems.append('C23–C28 changed')
    runtime = SKILL / 'assets/styles/ocean'
    for file in runtime.rglob('*'):
        if not file.is_file() or file.suffix not in ('.html', '.css', '.js', '.py', '.json', '.svg') or 'vendor' in file.parts:
            continue
        source = file.read_text(encoding='utf-8')
        if re.search(r'CSSC|中国船舶集团|cadwright|D:[/\\]', source):
            problems.append('Runtime identity/absolute path: ' + str(file.relative_to(ROOT)))
    config = json.loads((runtime / 'deck.json').read_text(encoding='utf-8'))
    if config.get('background') != 'none' or config.get('model') != 'none':
        problems.append('Implicit media defaults')
    if not (runtime / 'fonts/OFL.txt').exists() or not (runtime / 'vendor/THREE-LICENSE.txt').exists():
        problems.append('Missing third-party licenses')
    git = subprocess.run(['git', 'ls-files', '-z'], cwd=ROOT, capture_output=True)
    if git.returncode == 0:
        for name in git.stdout.decode('utf-8').split('\0'):
            if not name:
                continue
            parts = Path(name).parts
            if any(p in ('.private-assets', 'decks', 'backgrounds', '成品', 'node_modules', '.qa') for p in parts) or Path(name).name.startswith('.env'):
                problems.append('Private/generated resource tracked: ' + name)
            if (ROOT / name).stat().st_size >= 50_000_000:
                problems.append('Large tracked asset: ' + name)
    if problems:
        raise SystemExit('\n'.join(problems))
    print('PASS: references, defaults, fingerprints, C23–C28 and Git boundaries')


if __name__ == '__main__':
    check()
