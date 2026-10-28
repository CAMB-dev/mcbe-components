"""Compatibility entry point. All demo PNGs use the canonical merged-release audit."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name('prepare-workstation-materials.py')), run_name='__main__')
