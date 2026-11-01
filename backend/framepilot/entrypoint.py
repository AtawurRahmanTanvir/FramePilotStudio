"""Frozen backend entry point for the app-private PyInstaller runtime."""
import sys
from bridge import main

if __name__ == '__main__':
    raise SystemExit(main(sys.argv))
