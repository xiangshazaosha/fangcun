from pathlib import Path
import json
import os
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
EXPORTER = ROOT / '.agents/skills/fangcun/scripts/export_background.py'
os.environ['PYTHONUTF8'] = '1'


class BackgroundTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name)

    def export(self, output):
        return subprocess.run([sys.executable, str(EXPORTER), '--background', 'koi-ocean', '--output', str(output)], capture_output=True)

    def test_background_is_not_presentation(self):
        output = self.base / 'background'
        result = self.export(output)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse((output / 'deck.json').exists())
        self.assertFalse((output / 'deck.js').exists())
        html = (output / 'index.html').read_text(encoding='utf-8')
        self.assertNotIn('<section', html)
        self.assertIn('logo=0&amp;interactive=1', html)
        self.assertTrue((output / 'media/ocean/assets/koi-top-v1.png').is_file())
        self.assertTrue((output / 'vendor/three.core.min.js').is_file())
        self.assertTrue((output / 'brand/pointer.svg').is_file())
        self.assertTrue((output / '启动背景.bat').is_file())

    def test_no_overwrite(self):
        output = self.base / 'background'
        output.mkdir()
        marker = output / 'keep.txt'
        marker.write_text('keep')
        result = self.export(output)
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(marker.read_text(), 'keep')

    def test_manifest_covers_complete_closure(self):
        output = self.base / 'background'
        result = self.export(output)
        self.assertEqual(result.returncode, 0, result.stderr)
        record = json.loads((output / 'manifest.json').read_text(encoding='utf-8'))
        self.assertEqual(record['background'], 'koi-ocean')
        for key in ['media/ocean/main.js', 'media/ocean/index.html', 'media/ocean/style.css', 'media/ocean/assets/coast-base-v2.png', 'media/ocean/assets/koi-top-v1.png', 'vendor/THREE-LICENSE.txt']:
            self.assertIn(key, record['sources'])
            self.assertTrue((output / key).is_file())


if __name__ == '__main__':
    unittest.main()
