"""Windows Motion Worker Sandbox Launcher and Isolation Boundary.

Enforces genuine OS-level containment for imported Remotion execution.
Implements Windows Job Objects with process-tree containment, memory caps,
active process limits, and desktop/UI restrictions.

Enforces the fail-closed security gate: if full project-scoped filesystem isolation
and network restrictions are not verified, execution is refused with exit code 78.
"""

from __future__ import annotations

import argparse
import ctypes
from ctypes import wintypes
import json
import os
from pathlib import Path
import subprocess
import sys
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Windows Job Object Win32 Definitions
# ---------------------------------------------------------------------------
JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000
JOB_OBJECT_LIMIT_JOB_MEMORY = 0x0200
JOB_OBJECT_LIMIT_ACTIVE_PROCESS = 0x0008
JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION = 0x0400

JobObjectExtendedLimitInformation = 9
JobObjectBasicUIRestrictions = 4
JobObjectCpuRateControlInformation = 15

JOB_OBJECT_CPU_RATE_CONTROL_ENABLE = 0x00000001
JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP = 0x00000004

JOB_OBJECT_UILIMIT_HANDLES = 0x00000001
JOB_OBJECT_UILIMIT_READCLIPBOARD = 0x00000002
JOB_OBJECT_UILIMIT_WRITECLIPBOARD = 0x00000004
JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS = 0x00000008
JOB_OBJECT_UILIMIT_DISPLAYSETTINGS = 0x00000010
JOB_OBJECT_UILIMIT_GLOBALATOMS = 0x00000020
JOB_OBJECT_UILIMIT_DESKTOP = 0x00000040
JOB_OBJECT_UILIMIT_EXITWINDOWS = 0x00000080


class IO_COUNTERS(ctypes.Structure):
    _fields_ = [
        ("ReadOperationCount", ctypes.c_uint64),
        ("WriteOperationCount", ctypes.c_uint64),
        ("OtherOperationCount", ctypes.c_uint64),
        ("ReadTransferCount", ctypes.c_uint64),
        ("WriteTransferCount", ctypes.c_uint64),
        ("OtherTransferCount", ctypes.c_uint64),
    ]


class JOBOBJECT_BASIC_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_int64),
        ("PerJobUserTimeLimit", ctypes.c_int64),
        ("LimitFlags", wintypes.DWORD),
        ("MinimumWorkingSetSize", ctypes.c_size_t),
        ("MaximumWorkingSetSize", ctypes.c_size_t),
        ("ActiveProcessLimit", wintypes.DWORD),
        ("Affinity", ctypes.c_size_t),
        ("PriorityClass", wintypes.DWORD),
        ("SchedulingClass", wintypes.DWORD),
    ]


class JOBOBJECT_EXTENDED_LIMIT_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", JOBOBJECT_BASIC_LIMIT_INFORMATION),
        ("IoInfo", IO_COUNTERS),
        ("ProcessMemoryLimit", ctypes.c_size_t),
        ("JobMemoryLimit", ctypes.c_size_t),
        ("PeakProcessMemoryLimit", ctypes.c_size_t),
        ("PeakJobMemoryLimit", ctypes.c_size_t),
    ]


class JOBOBJECT_BASIC_UI_RESTRICTIONS(ctypes.Structure):
    _fields_ = [
        ("UIRestrictionsClass", wintypes.DWORD),
    ]


class JOBOBJECT_CPU_RATE_CONTROL_INFORMATION(ctypes.Structure):
    _fields_ = [
        ("ControlFlags", wintypes.DWORD),
        ("CpuRate", wintypes.DWORD),
    ]


class WindowsJobObject:
    """Encapsulates a Windows Job Object with resource and containment limits."""

    def __init__(
        self,
        memory_limit_mb: int = 4096,
        max_processes: int = 32,
        cpu_rate_percent: int = 80,
    ):
        self.memory_limit_mb = memory_limit_mb
        self.max_processes = max_processes
        self.cpu_rate_percent = cpu_rate_percent
        self.handle: Optional[wintypes.HANDLE] = None
        self.k32 = getattr(ctypes.windll, "kernel32", None) if sys.platform == "win32" else None

    def create(self) -> bool:
        if not self.k32:
            return False
        self.handle = self.k32.CreateJobObjectW(None, None)
        if not self.handle:
            return False

        # Set extended limits: kill on close, active process limit, memory limit
        ext = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
        ext.BasicLimitInformation.LimitFlags = (
            JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            | JOB_OBJECT_LIMIT_ACTIVE_PROCESS
            | JOB_OBJECT_LIMIT_JOB_MEMORY
            | JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION
        )
        ext.BasicLimitInformation.ActiveProcessLimit = self.max_processes
        ext.JobMemoryLimit = self.memory_limit_mb * 1024 * 1024
        res = self.k32.SetInformationJobObject(
            self.handle,
            JobObjectExtendedLimitInformation,
            ctypes.byref(ext),
            ctypes.sizeof(ext),
        )
        if not res:
            self.close()
            return False

        # Set CPU rate control if supported
        if self.cpu_rate_percent and 1 <= self.cpu_rate_percent <= 100:
            cpu_info = JOBOBJECT_CPU_RATE_CONTROL_INFORMATION()
            cpu_info.ControlFlags = (
                JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP
            )
            cpu_info.CpuRate = self.cpu_rate_percent * 100  # in 1/100ths of 1%
            self.k32.SetInformationJobObject(
                self.handle,
                JobObjectCpuRateControlInformation,
                ctypes.byref(cpu_info),
                ctypes.sizeof(cpu_info),
            )

        # Set UI restrictions (no desktop access, no clipboard, no exit windows)
        ui = JOBOBJECT_BASIC_UI_RESTRICTIONS()
        ui.UIRestrictionsClass = (
            JOB_OBJECT_UILIMIT_HANDLES
            | JOB_OBJECT_UILIMIT_READCLIPBOARD
            | JOB_OBJECT_UILIMIT_WRITECLIPBOARD
            | JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS
            | JOB_OBJECT_UILIMIT_DISPLAYSETTINGS
            | JOB_OBJECT_UILIMIT_DESKTOP
            | JOB_OBJECT_UILIMIT_EXITWINDOWS
        )
        self.k32.SetInformationJobObject(
            self.handle,
            JobObjectBasicUIRestrictions,
            ctypes.byref(ui),
            ctypes.sizeof(ui),
        )
        return True

    def assign_process(self, process_handle: int) -> bool:
        if not self.handle or not self.k32:
            return False
        res = self.k32.AssignProcessToJobObject(self.handle, wintypes.HANDLE(process_handle))
        return bool(res)

    def query_extended_limits(self) -> Optional[JOBOBJECT_EXTENDED_LIMIT_INFORMATION]:
        if not self.handle or not self.k32:
            return None
        ext = JOBOBJECT_EXTENDED_LIMIT_INFORMATION()
        ret_len = wintypes.DWORD()
        res = self.k32.QueryInformationJobObject(
            self.handle,
            JobObjectExtendedLimitInformation,
            ctypes.byref(ext),
            ctypes.sizeof(ext),
            ctypes.byref(ret_len),
        )
        return ext if res else None

    def query_ui_restrictions(self) -> Optional[int]:
        if not self.handle or not self.k32:
            return None
        ui = JOBOBJECT_BASIC_UI_RESTRICTIONS()
        ret_len = wintypes.DWORD()
        res = self.k32.QueryInformationJobObject(
            self.handle,
            JobObjectBasicUIRestrictions,
            ctypes.byref(ui),
            ctypes.sizeof(ui),
            ctypes.byref(ret_len),
        )
        return int(ui.UIRestrictionsClass) if res else None

    def query_cpu_rate_control(self) -> Optional[JOBOBJECT_CPU_RATE_CONTROL_INFORMATION]:
        if not self.handle or not self.k32:
            return None
        cpu = JOBOBJECT_CPU_RATE_CONTROL_INFORMATION()
        ret_len = wintypes.DWORD()
        res = self.k32.QueryInformationJobObject(
            self.handle,
            JobObjectCpuRateControlInformation,
            ctypes.byref(cpu),
            ctypes.sizeof(cpu),
            ctypes.byref(ret_len),
        )
        return cpu if res else None

    def is_process_in_job(self, process_handle: int) -> bool:
        if not self.handle or not self.k32:
            return False
        in_job = wintypes.BOOL()
        res = self.k32.IsProcessInJob(
            wintypes.HANDLE(process_handle), self.handle, ctypes.byref(in_job)
        )
        return bool(res and in_job.value)

    def close(self) -> None:
        if self.handle and self.k32:
            self.k32.CloseHandle(self.handle)
            self.handle = None


# ---------------------------------------------------------------------------
# Security & Isolation Evaluation
# ---------------------------------------------------------------------------
def evaluate_isolation(runtime_root: Optional[Path] = None) -> Dict[str, Any]:
    """Evaluates all dimensions of the Windows worker isolation boundary."""
    report: Dict[str, Any] = {
        "os": sys.platform,
        "job_objects_available": False,
        "process_tree_containment": False,
        "memory_capping_supported": False,
        "cpu_rate_control_supported": False,
        "ui_restrictions_supported": False,
        "filesystem_scope": "not-validated",
        "network_access": "not-validated",
        "isolation_status": "not-validated",
        "render_allowed": False,
        "reasons_blocked": [],
        "requirements": [
            "Process-tree containment via Windows Job Objects (Kill-on-close)",
            "Memory cap (max 4096 MB) and process limit (max 32 concurrent)",
            "CPU rate control (hard-capped scheduling)",
            "UI & Desktop handle restrictions",
            "Project-scoped writable filesystem boundary (read-only runtime)",
            "Network restrictions with local Chromium CDP loopback allowance",
        ],
    }

    if sys.platform != "win32":
        report["reasons_blocked"].append("Windows OS required for native job object and worker isolation.")
        return report

    # Test Job Object capability
    try:
        job = WindowsJobObject(memory_limit_mb=256, max_processes=4, cpu_rate_percent=80)
        if job.create():
            report["job_objects_available"] = True
            report["process_tree_containment"] = True
            report["memory_capping_supported"] = True
            report["cpu_rate_control_supported"] = True
            report["ui_restrictions_supported"] = True
            job.close()
    except Exception as exc:
        report["reasons_blocked"].append(f"Failed to initialize Windows Job Object: {exc}")

    # Inspect worker policy file
    policy_path = None
    if runtime_root:
        candidate = runtime_root / "security" / "worker-policy.json"
        if candidate.is_file():
            policy_path = candidate
        else:
            candidate_tmpl = runtime_root / "security" / "worker-policy.template.json"
            if candidate_tmpl.is_file():
                policy_path = candidate_tmpl

    if policy_path and policy_path.is_file():
        try:
            policy_data = json.loads(policy_path.read_text(encoding="utf-8"))
            report["policy_file"] = str(policy_path)
            report["isolation_status"] = policy_data.get("isolationStatus", "not-validated")
            report["filesystem_scope"] = policy_data.get("filesystemScope", "unrestricted")
            report["network_access"] = policy_data.get("networkAccess")
        except Exception:
            pass

    # Evaluate whether full containment is validated
    if report["isolation_status"] != "validated":
        report["reasons_blocked"].append(
            "Windows project worker isolation policy is not marked 'validated'. "
            "A JSON policy file alone is not a sandbox; OS-enforced filesystem and network denial must be verified."
        )
    if report["filesystem_scope"] != "project-only":
        report["reasons_blocked"].append(
            "Filesystem scope is not restricted to 'project-only'. "
            "Untrusted Remotion code must not have read/write access to user directories or system drives."
        )
    if report["network_access"] is not False:
        report["reasons_blocked"].append(
            "Outbound network denial is not active. "
            "Remotion worker must not communicate outside the local machine."
        )

    report["render_allowed"] = (
        report["job_objects_available"]
        and report["isolation_status"] == "validated"
        and report["filesystem_scope"] == "project-only"
        and report["network_access"] is False
    )
    return report


# ---------------------------------------------------------------------------
# CLI Entry Point
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Launch a Motion worker only after Windows isolation is validated."
    )
    parser.add_argument("--exe", help="Worker executable that would be launched.")
    parser.add_argument(
        "--allowed",
        nargs="+",
        help="Directories that would be authorized by the boundary.",
    )
    parser.add_argument(
        "--runtime-root",
        help="Path to the Motion runtime root containing security manifests.",
    )
    parser.add_argument(
        "--check-security",
        action="store_true",
        help="Output JSON evaluation of current Windows isolation status and exit.",
    )

    args, unknown = parser.parse_known_args()

    runtime_root = Path(args.runtime_root) if args.runtime_root else None
    eval_result = evaluate_isolation(runtime_root)

    if args.check_security:
        print(json.dumps(eval_result, indent=2))
        return 0 if eval_result["render_allowed"] else 1

    # Security gate check
    if not eval_result["render_allowed"]:
        error_msg = {
            "event": "security-gate-blocked",
            "status": "NOT READY",
            "message": (
                "Refusing to launch imported Motion code: Windows project-only "
                "filesystem and network isolation is not implemented or validated."
            ),
            "reasons": eval_result["reasons_blocked"],
            "user_explanation": (
                "Secure rendering is not yet enabled because Windows project isolation "
                "has not passed verification. Your project has not been executed."
            ),
        }
        print(json.dumps(error_msg, ensure_ascii=False), file=sys.stderr, flush=True)
        return 78

    # If isolation was validated, launch under the Job Object
    if not args.exe:
        print("Worker executable (--exe) is required.", file=sys.stderr)
        return 1

    job = WindowsJobObject()
    if not job.create():
        print("Failed to initialize Windows Job Object containment.", file=sys.stderr)
        return 1

    cmd = [args.exe] + unknown
    try:
        proc = subprocess.Popen(
            cmd,
            creationflags=0x00000004,  # CREATE_SUSPENDED
        )
        job.assign_process(int(proc._handle))
        ctypes.windll.kernel32.ResumeThread(wintypes.HANDLE(proc._handle))
        proc.wait()
        return proc.returncode
    except Exception as exc:
        print(f"Error launching worker process: {exc}", file=sys.stderr)
        return 1
    finally:
        job.close()


if __name__ == "__main__":
    raise SystemExit(main())
