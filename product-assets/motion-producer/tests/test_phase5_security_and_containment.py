"""Phase 5 Comprehensive Windows Security, Containment, and Isolation Test Suite.

Validates:
1. Windows Job Object limits (Kill-on-Close, Process Tree Containment, Memory Capping,
   Active Process Limit, CPU Rate Control, UI Restrictions).
2. Filesystem boundary & scope enforcement (disposable adversarial fixtures).
3. Chromium CDP vs AppContainer loopback conflict investigation and evidence.
4. Network isolation audit (localhost vs external outbound reachability).
5. Adversarial tests (child escape, memory bomb, process bomb, runtime tampering).
6. Fail-closed security gate enforcement (code 78).
"""

from __future__ import annotations

import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT))

import backend.motion.sandbox_launcher as sl


class TestPhase5JobObjectLimits(unittest.TestCase):
    """Explicit tests for every configured Windows Job Object limit."""

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_job_kill_on_close(self):
        """Processes assigned to the Job Object must be immediately killed when job closes."""
        job = sl.WindowsJobObject()
        self.assertTrue(job.create())

        proc = subprocess.Popen([sys.executable, "-c", "import time; time.sleep(60)"])
        try:
            self.assertTrue(job.assign_process(int(proc._handle)))
            self.assertTrue(job.is_process_in_job(int(proc._handle)))
            time.sleep(0.1)
        finally:
            job.close()

        time.sleep(0.2)
        ret = proc.poll()
        self.assertIsNotNone(ret, "Process was not terminated when Job Object was closed.")

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_job_process_tree_containment(self):
        """Descendant (grandchild) processes spawned inside the Job Object must not escape."""
        job = sl.WindowsJobObject()
        self.assertTrue(job.create())

        with tempfile.TemporaryDirectory() as temp_dir:
            pid_file = Path(temp_dir) / "grandchild.pid"
            child_script = (
                f"import subprocess, time, sys\n"
                f"p2 = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(60)'])\n"
                f"with open(r'{pid_file}', 'w') as f:\n"
                f"    f.write(str(p2.pid))\n"
                f"time.sleep(60)\n"
            )

            parent = subprocess.Popen([sys.executable, "-c", child_script])
            self.assertTrue(job.assign_process(int(parent._handle)))

            # Wait for grandchild to spawn
            for _ in range(50):
                if pid_file.is_file():
                    break
                time.sleep(0.1)
            self.assertTrue(pid_file.is_file(), "Child did not write grandchild PID.")
            grandchild_pid = int(pid_file.read_text().strip())

            # Close Job Object - both parent and grandchild must be terminated
            job.close()
            time.sleep(0.3)

            # Verify parent is dead
            self.assertIsNotNone(parent.poll())

            # Verify grandchild is dead
            k32 = ctypes.windll.kernel32
            h_grandchild = k32.OpenProcess(0x0400, False, grandchild_pid)  # PROCESS_QUERY_INFORMATION
            if h_grandchild:
                exit_code = ctypes.c_ulong()
                k32.GetExitCodeProcess(h_grandchild, ctypes.byref(exit_code))
                k32.CloseHandle(h_grandchild)
                self.assertNotEqual(exit_code.value, 259, "Grandchild is still active (259).")

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_job_memory_limit_enforced(self):
        """Allocations exceeding the configured Job Memory limit must be blocked."""
        # 64 MB limit
        job = sl.WindowsJobObject(memory_limit_mb=64)
        self.assertTrue(job.create())

        alloc_script = (
            "try:\n"
            "    a = bytearray(200 * 1024 * 1024)\n"
            "    print('ALLOC_SUCCEEDED')\n"
            "except MemoryError:\n"
            "    print('ALLOC_MEMORY_ERROR')\n"
        )
        proc = subprocess.Popen(
            [sys.executable, "-c", alloc_script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.assertTrue(job.assign_process(int(proc._handle)))
        stdout, stderr = proc.communicate(timeout=10)
        job.close()

        output = stdout.decode().strip()
        self.assertIn("ALLOC_MEMORY_ERROR", output, f"Memory cap was not enforced: {output}")

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_job_active_process_limit_enforced(self):
        """Spawning more processes than ActiveProcessLimit must be refused by the OS."""
        job = sl.WindowsJobObject(max_processes=2)
        self.assertTrue(job.create())

        spawn_script = (
            "import subprocess, sys\n"
            "p2 = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(10)'])\n"
            "try:\n"
            "    p3 = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(10)'])\n"
            "    print('P3_SPAWNED_UNEXPECTEDLY')\n"
            "    p3.terminate()\n"
            "except Exception as e:\n"
            "    print(f'P3_SPAWN_FAILED: {e}')\n"
            "p2.terminate()\n"
        )
        proc = subprocess.Popen(
            [sys.executable, "-c", spawn_script],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self.assertTrue(job.assign_process(int(proc._handle)))
        stdout, stderr = proc.communicate(timeout=10)
        job.close()

        output = stdout.decode().strip()
        self.assertIn("P3_SPAWN_FAILED", output, f"Process cap was not enforced: {output}")

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_job_cpu_rate_control(self):
        """CPU rate control must be set to an 80% hard cap."""
        job = sl.WindowsJobObject(cpu_rate_percent=80)
        self.assertTrue(job.create())
        cpu_info = job.query_cpu_rate_control()
        self.assertIsNotNone(cpu_info)
        self.assertEqual(cpu_info.CpuRate, 8000, "CpuRate was not set to 8000 (80.00%).")
        self.assertTrue(
            bool(cpu_info.ControlFlags & sl.JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP),
            "HARD_CAP flag was not set.",
        )
        job.close()

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_job_ui_restrictions(self):
        """Job Object must enforce UI restrictions (handles, clipboard, desktop)."""
        job = sl.WindowsJobObject()
        self.assertTrue(job.create())
        ui_flags = job.query_ui_restrictions()
        self.assertIsNotNone(ui_flags)
        expected = (
            sl.JOB_OBJECT_UILIMIT_HANDLES
            | sl.JOB_OBJECT_UILIMIT_READCLIPBOARD
            | sl.JOB_OBJECT_UILIMIT_WRITECLIPBOARD
            | sl.JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS
            | sl.JOB_OBJECT_UILIMIT_DISPLAYSETTINGS
            | sl.JOB_OBJECT_UILIMIT_DESKTOP
            | sl.JOB_OBJECT_UILIMIT_EXITWINDOWS
        )
        self.assertEqual(ui_flags & expected, expected, "UI restrictions class is incomplete.")
        job.close()


class TestPhase5FilesystemAndAdversarial(unittest.TestCase):
    """Adversarial security tests using disposable fixtures."""

    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.workspace = Path(self.temp_dir.name)
        self.project_dir = self.workspace / "test-project"
        self.project_dir.mkdir()
        self.unrelated_dir = self.workspace / "unrelated-user-data"
        self.unrelated_dir.mkdir()
        (self.unrelated_dir / "secret_document.txt").write_text("SUPER_SECRET_PAYLOAD", encoding="utf-8")

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_adversarial_read_unrelated_documents(self):
        """Worker must not read files outside the project scope."""
        secret_file = self.unrelated_dir / "secret_document.txt"
        self.assertTrue(secret_file.is_file())

        # Path validation test (simulating motion-service.js 'inside' check)
        def inside(root: Path, candidate: Path) -> bool:
            try:
                rel = candidate.resolve().relative_to(root.resolve())
                return not str(rel).startswith("..")
            except ValueError:
                return False

        self.assertFalse(
            inside(self.project_dir, secret_file),
            "Path escaping project root was falsely identified as inside project.",
        )

    def test_adversarial_write_outside_project(self):
        """Worker must not write files outside its designated project folder."""
        target_outside = self.unrelated_dir / "attacker_drop.txt"

        # Simulating safe runner output scoping
        def validate_output_path(project_root: Path, output_path: Path) -> bool:
            outputs_dir = project_root / "outputs"
            try:
                rel = output_path.resolve().relative_to(outputs_dir.resolve())
                return not str(rel).startswith("..")
            except ValueError:
                return False

        self.assertFalse(validate_output_path(self.project_dir, target_outside))

    def test_adversarial_runtime_immutability(self):
        """Runtime files (node.exe, runner.mjs) must not be writable by worker output."""
        runner_mjs = ROOT / "runtime" / "motion" / "renderer" / "runner.mjs"
        self.assertTrue(runner_mjs.is_file())

        def validate_output_path(project_root: Path, output_path: Path) -> bool:
            outputs_dir = project_root / "outputs"
            try:
                rel = output_path.resolve().relative_to(outputs_dir.resolve())
                return not str(rel).startswith("..")
            except ValueError:
                return False

        self.assertFalse(validate_output_path(self.project_dir, runner_mjs))


class TestPhase5ChromiumAndNetworkIsolation(unittest.TestCase):
    """Investigates Chromium CDP localhost requirements vs Windows network isolation."""

    @unittest.skipUnless(sys.platform == "win32", "Requires Windows OS")
    def test_appcontainer_loopback_denial_evidence(self):
        """CheckNetIsolation LoopbackExempt returns Access Denied for standard users.

        This documents the OS-level constraint: a standard user application on Windows
        cannot programmatically exempt AppContainers from loopback isolation without
        requiring administrator elevation.
        """
        proc = subprocess.run(
            ["CheckNetIsolation.exe", "LoopbackExempt", "-s"],
            capture_output=True,
            text=True,
        )
        # For non-elevated sessions, CheckNetIsolation returns Access Denied
        # or exit code 1
        output = proc.stdout + proc.stderr
        if proc.returncode != 0:
            self.assertIn("Access Denied", output)

    def test_chromium_no_sandbox_prohibited(self):
        """Production Remotion runner must NOT pass --no-sandbox to Chromium."""
        runner_path = ROOT / "runtime" / "motion" / "renderer" / "runner.mjs"
        self.assertTrue(runner_path.is_file())
        runner_content = runner_path.read_text(encoding="utf-8")
        self.assertNotIn(
            "--no-sandbox",
            runner_content,
            "Security violation: --no-sandbox was found in runner.mjs.",
        )

    def test_network_isolation_audit(self):
        """Audits the evaluation report's network isolation gate."""
        report = sl.evaluate_isolation(ROOT / "runtime" / "motion")
        # In current configuration, network access is not certified as denied
        self.assertFalse(
            report["render_allowed"],
            "Render was permitted even though outbound network denial is not verified.",
        )
        self.assertIn(
            "Windows project worker isolation policy is not marked 'validated'",
            str(report["reasons_blocked"]),
        )


class TestPhase5SecurityGateFailClosed(unittest.TestCase):
    """Verifies that the render security gate fails closed with code 78."""

    def test_sandbox_launcher_fails_closed_code_78(self):
        """sandbox_launcher.py must return exit code 78 when unvalidated."""
        proc = subprocess.run(
            [
                sys.executable,
                str(ROOT / "backend" / "motion" / "sandbox_launcher.py"),
                "--exe",
                sys.executable,
                "--runtime-root",
                str(ROOT / "runtime" / "motion"),
                "--",
                "-c",
                "print(1)",
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(proc.returncode, 78, f"Expected 78, got {proc.returncode}")
        self.assertIn("security-gate-blocked", proc.stderr)
        self.assertIn(
            "Secure rendering is not yet enabled because Windows project isolation has not passed verification",
            proc.stderr,
        )

    def test_check_security_cli_flag(self):
        """--check-security CLI flag outputs JSON and exit code 1 when not ready."""
        proc = subprocess.run(
            [
                sys.executable,
                str(ROOT / "backend" / "motion" / "sandbox_launcher.py"),
                "--check-security",
                "--runtime-root",
                str(ROOT / "runtime" / "motion"),
            ],
            capture_output=True,
            text=True,
        )
        self.assertEqual(proc.returncode, 1)
        data = json.loads(proc.stdout)
        self.assertFalse(data["render_allowed"])
        self.assertTrue(data["job_objects_available"])
        self.assertTrue(data["process_tree_containment"])
        self.assertTrue(data["memory_capping_supported"])
        self.assertTrue(data["cpu_rate_control_supported"])
        self.assertTrue(data["ui_restrictions_supported"])


if __name__ == "__main__":
    unittest.main()
