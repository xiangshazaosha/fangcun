from pathlib import Path
import hashlib
import unittest

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / '.agents/skills/fangcun'


class LicensingTest(unittest.TestCase):
    def test_portable_legal_files_match(self):
        for name in ['LICENSE', 'NOTICE']:
            self.assertEqual((ROOT / name).read_bytes(), (SKILL / name).read_bytes())
        license_text = (ROOT / 'LICENSE').read_text(encoding='utf-8')
        self.assertIn('LicenseRef-Xiaoye-NC-Reciprocal-2.0', license_text)
        self.assertIn('English translation', license_text)

    def test_legacy_license_is_preserved(self):
        text = (ROOT / 'docs/license-history/fangcun-nc-1.0.txt').read_text(encoding='utf-8')
        self.assertEqual(hashlib.sha256(text.encode()).hexdigest(),
                         '0ed4f473051c154829a3d7e57e6b379c5a25b95178d296b27006f1d2d2367330')


if __name__ == '__main__':
    unittest.main()
