from __future__ import annotations

import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print('{"event":"error","message":"Motion bridge command is required."}', flush=True)
        return 2
    command = argv[1]
    if command == "word-timing":
        import word_timing_engine
        sys.argv = [str(HERE / "word_timing_engine.py"), *argv[2:]]
        return word_timing_engine.main()
    if command in {"inspect", "import"}:
        import project_import
        sys.argv = [str(HERE / "project_import.py"), command, *argv[2:]]
        return project_import.main()
    print('{"event":"error","message":"Unknown Motion bridge command."}', flush=True)
    return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
