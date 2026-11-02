from pathlib import Path
import hashlib
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]

class Release014ContractTests(unittest.TestCase):
    def test_master_prompt_is_present_and_unchanged_reference_hash(self):
        prompt = ROOT / 'Master_promt.txt'
        self.assertTrue(prompt.is_file())
        digest = hashlib.sha256(prompt.read_bytes()).hexdigest()
        self.assertEqual(digest, '05a3422a5e47f1243e3a04f734044adc9c853c93e054c09a4d5d856de58212e3')

    def test_packaged_app_includes_master_prompt(self):
        package = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))
        resources = package['build']['extraResources']
        self.assertTrue(any(isinstance(x, dict) and x.get('from') == 'Master_promt.txt' for x in resources))
        self.assertEqual(package['version'], '0.1.4')
        legacy = (ROOT / 'backend/legacy_filmora_engine.py').read_text(encoding='utf-8')
        self.assertIn('APP_VERSION = \"0.1.4\"', legacy)

    def test_script_mapping_accepts_requested_formats_and_warns_about_thinking(self):
        html = (ROOT / 'src/renderer/index.html').read_text(encoding='utf-8')
        self.assertIn("extensions: ['txt', 'md', 'docx', 'pdf']", (ROOT / 'src/renderer/app.js').read_text(encoding='utf-8'))
        self.assertIn('Thinking or Think harder', html)
        self.assertIn('Extra High', html)
        self.assertIn('Do not use Instant mode', html)
        self.assertIn('FramePilot does not upload the script automatically', html)

    def test_output_actions_are_available_for_both_generated_file_types(self):
        html = (ROOT / 'src/renderer/index.html').read_text(encoding='utf-8')
        self.assertIn('data-output-copy="audio"', html)
        self.assertIn('data-output-reveal="audio"', html)
        self.assertIn('data-output-copy="wfp"', html)
        self.assertIn('data-output-reveal="wfp"', html)

    def test_timeline_progress_is_stage_based_and_not_circular(self):
        html = (ROOT / 'src/renderer/index.html').read_text(encoding='utf-8')
        self.assertIn('id="wfp-stage-list"', html)
        self.assertNotIn('id="wfp-progress-ring"', html)

if __name__ == '__main__':
    unittest.main()
