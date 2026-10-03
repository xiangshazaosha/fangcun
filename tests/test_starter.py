from pathlib import Path
import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / '.agents/skills/fangcun'
STARTER = SKILL / 'scripts/new_deck.py'
os.environ['PYTHONUTF8'] = '1'


class StarterTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)

    def create(self, *args, config=None, output=None):
        output = output or self.base / 'deck'
        command = [sys.executable, str(STARTER), '--style', 'ocean', '--output', str(output), *args]
        if config is not None:
            cfg = self.base / 'input.json'
            cfg.write_text(json.dumps(config, ensure_ascii=False), encoding='utf-8')
            command += ['--config', str(cfg)]
        return subprocess.run(command, capture_output=True, text=True, encoding='utf-8'), output

    def config(self):
        return json.loads((SKILL / 'assets/styles/ocean/deck.json').read_text(encoding='utf-8'))

    def test_defaults_and_safe_content(self):
        result, deck = self.create('--title', '能量 <script>alert(1)</script>', '--particle-text', '动能')
        self.assertEqual(result.returncode, 0, result.stderr)
        config = json.loads((deck / 'deck.json').read_text(encoding='utf-8'))
        self.assertEqual((config['background'], config['model']), ('none', 'none'))
        html = (deck / 'index.html').read_text(encoding='utf-8')
        self.assertNotIn('<script>alert(1)</script>', html)
        self.assertIn('&lt;script&gt;', html)
        self.assertNotIn('id="globalOcean"', html)
        self.assertNotIn('<div class="carrier-stage', html)
        self.assertIn('data-skip', html)
        self.assertIn('%E5%8A%A8%E8%83%BD', html)
        self.assertFalse((deck / 'media/carrier').exists())
        self.assertTrue((deck / 'THIRD-PARTY-NOTICES.txt').exists())
        self.assertEqual((deck / 'LICENSE').read_bytes(), (ROOT / 'LICENSE').read_bytes())
        self.assertTrue((deck / 'fonts/OFL.txt').is_file())
        self.assertTrue((deck / 'vendor/THREE-LICENSE.txt').is_file())

    def test_homepage_modes(self):
        for mode, count in [('particles', 6), ('cover', 5), ('none', 4)]:
            result, deck = self.create('--homepage', mode, output=self.base / mode)
            self.assertEqual(result.returncode, 0, result.stderr)
            html = (deck / 'index.html').read_text(encoding='utf-8')
            self.assertEqual(html.count('<section '), count)
            self.assertEqual('<iframe class="particle-frame"' in html, mode == 'particles')
            self.assertEqual('<section class="slide cover ' in html, mode != 'none')

    def test_no_overwrite(self):
        deck = self.base / 'deck'
        deck.mkdir()
        marker = deck / 'keep.txt'
        marker.write_text('untouched')
        result, _ = self.create()
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(marker.read_text(), 'untouched')

    def test_relative_custom_asset_and_no_logo(self):
        cfg = self.config()
        cfg.update(logo='', background='video', video='custom.mp4', poster='poster.png', homepage='cover')
        (self.base / 'custom.mp4').write_bytes(b'fixture: byte-copy validation, not playable media')
        (self.base / 'poster.png').write_bytes(b'fixture')
        result, deck = self.create(config=cfg)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((deck / 'custom.mp4').read_bytes(), (self.base / 'custom.mp4').read_bytes())
        html = (deck / 'index.html').read_text(encoding='utf-8')
        self.assertNotIn('<img class="brand"', html)
        self.assertIn('src="custom.mp4"', html)

    def test_asset_escape_rejected_before_output(self):
        for value in ['../escape.svg', str(SKILL / 'assets/brand/fangcun-logo.svg'), 'https://example.com/logo.svg']:
            cfg = self.config()
            cfg['logo'] = value
            result, deck = self.create(config=cfg)
            self.assertNotEqual(result.returncode, 0)
            self.assertFalse(deck.exists())

    def test_long_particle_word_rejected(self):
        result, deck = self.create('--particle-text', '这是超过十二个字符的完整长标题不要放粒子里')
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(deck.exists())

    def test_documented_style_not_fake_runtime(self):
        result = subprocess.run([sys.executable, str(STARTER), '--style', 'two-tone', '--output', str(self.base / 'deck')], capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.base / 'deck').exists())

    def test_clone_without_private_media(self):
        clone = self.base / 'clone'
        skill = clone / '.agents/skills/fangcun'
        shutil.copytree(SKILL, skill)
        shutil.copy2(ROOT / 'THIRD-PARTY-NOTICES.txt', clone / 'THIRD-PARTY-NOTICES.txt')
        cli = skill / 'scripts/new_deck.py'
        for args in [[], ['--background', 'waves'], ['--model', 'carrier']]:
            deck = clone / ('deck-' + str(len(args)) + ('model' if 'carrier' in args else ''))
            result = subprocess.run([sys.executable, str(cli), '--style', 'ocean', '--output', str(deck), *args], capture_output=True)
            if not args:
                self.assertEqual(result.returncode, 0, result.stderr)
                self.assertTrue((deck / 'index.html').is_file())
            else:
                self.assertNotEqual(result.returncode, 0)
                self.assertFalse(deck.exists())


if __name__ == '__main__':
    unittest.main()
