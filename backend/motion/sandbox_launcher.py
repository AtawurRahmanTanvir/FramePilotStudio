"""Fail-closed entry point for the future Windows Motion worker boundary.

This module intentionally does not launch imported project code. A restricted
token and a working directory are not sufficient to enforce project-only
filesystem access or outbound network denial.
"""

from __future__ import annotations

import argparse
import sys


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Launch a Motion worker only after Windows isolation is validated."
    )
    parser.add_argument("--exe", required=True, help="Worker executable that would be launched.")
    parser.add_argument(
        "--allowed",
        required=True,
        nargs="+",
        help="Directories that would be authorized by the future boundary.",
    )
    parser.parse_known_args()
    print(
        "Refusing to launch imported Motion code: Windows project-only "
        "filesystem and network isolation is not implemented or validated.",
        file=sys.stderr,
    )
    return 78


if __name__ == "__main__":
    raise SystemExit(main())
