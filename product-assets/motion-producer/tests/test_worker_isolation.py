"""Unit tests for Windows Motion Worker Isolation and Security Gate."""

import json
from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[3]
SANDBOX_LAUNCHER = ROOT / "backend" / "motion" / "sandbox_launcher.py"


class TestWorkerIsolation(unittest.TestCase):
    def setUp(self):
        self.assertTrue(SANDBOX_LAUNCHER.is_file(), f"sandbox_launcher.py missing: {SANDBOX_LAUNCHER}")

    def test_01_security_evaluation_reports_accurate_status(self):
        """--check-security must return valid JSON reporting Job Object status and reasons blocked."""
        res = subprocess.run(
            [sys.executable, str(SANDBOX_LAUNCHER), "--check-security", "--runtime-root", str(ROOT / "runtime" / "motion")],
            capture_output=True,
            text=True,
        )
        self.assertIn(res.returncode, (0, 1))
        data = json.loads(res.stdout)
        self.assertIn("job_objects_available", data)
        self.assertIn("process_tree_containment", data)
        self.assertIn("memory_capping_supported", data)
        self.assertIn("ui_restrictions_supported", data)
        self.assertIn("isolation_status", data)
        self.assertIn("render_allowed", data)

        if sys.platform == "win32":
            self.assertTrue(data["job_objects_available"], "Job objects must be available on Windows")
            self.assertTrue(data["process_tree_containment"], "Process tree containment must be supported")

        # Because full OS filesystem & network isolation is not validated, render must be blocked
        self.assertFalse(data["render_allowed"], "Render must be blocked when isolation is not validated")
        self.assertGreater(len(data["reasons_blocked"]), 0)

    def test_02_refuses_unvalidated_worker_launch_exit_78(self):
        """Direct launch of worker executable must be refused with exit code 78."""
        res = subprocess.run(
            [
                sys.executable,
                str(SANDBOX_LAUNCHER),
                "--exe", sys.executable,
                "--allowed", str(ROOT),
                "--runtime-root", str(ROOT / "runtime" / "motion"),
                "--", "-c", "print('MALICIOUS_EXECUTION_SHOULD_NEVER_RUN')"
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(res.returncode, 78, f"Expected exit code 78, got {res.returncode}")
        self.assertNotIn("MALICIOUS_EXECUTION_SHOULD_NEVER_RUN", res.stdout)
        self.assertIn("Refusing to launch imported Motion code", res.stderr)
        self.assertIn("Secure rendering is not yet enabled", res.stderr)

    def test_03_job_object_class_win32_containment(self):
        """WindowsJobObject class must create, configure limits, and close cleanly on Windows."""
        if sys.platform != "win32":
            self.skipTest("Windows-only test")

        sys.path.insert(0, str(ROOT / "backend" / "motion"))
        from sandbox_launcher import WindowsJobObject

        job = WindowsJobObject(memory_limit_mb=512, max_processes=8)
        created = job.create()
        self.assertTrue(created, "Failed to create WindowsJobObject")
        self.assertIsNotNone(job.handle)
        job.close()
        self.assertIsNone(job.handle)


if __name__ == "__main__":
    unittest.main()
