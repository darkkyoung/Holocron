"""Observe a fresh local rehearsal at 1x speed. Run from the repository root."""
import argparse
import collections
import json
import pathlib
import re
import signal
import subprocess
import time
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--qualifying", action="store_true", help="Begin at 20:00 KST with the full qualifying hour")
args = parser.parse_args()
cmd = ["node", "--import", "./scripts/sites-env.mjs", "scripts/racing/preview-phase3c.mjs"]
if args.qualifying:
    cmd.append("--qualifying")
server = subprocess.Popen(cmd, stdout=subprocess.PIPE, text=True)
try:
    for line in server.stdout:
        match = re.search(r"http://127\.0\.0\.1:\d+", line)
        if match:
            break
    else:
        raise RuntimeError("Local preview did not start")
    url = match.group() + "/api/racing/watch"
    phases, drops, laps = [], [], set()
    errors = collections.Counter()
    count, previous, first = 0, None, None
    began = time.monotonic()
    while time.monotonic() - began < (4800 if args.qualifying else 1200):
        try:
            with urllib.request.urlopen(url, timeout=15) as response:
                assert "no-store" in response.headers["Cache-Control"]
                view = json.load(response)
        except OSError as error:
            errors[type(error).__name__] += 1
            time.sleep(0.5)
            continue
        phase, offset = view["phase"], view.get("offset")
        if first is None:
            first = offset
        if offset is not None and previous is not None and offset < previous:
            drops.append({"previous": previous, "current": offset, "phase": phase})
        if not phases or phases[-1][0] != phase:
            phases.append([phase, offset])
        previous = offset
        count += 1
        laps.update(r["lap"] for r in view.get("riders", []) if "lap" in r)
        if phase == "FINAL":
            break
        time.sleep(0.5)
    result = dict(seconds=time.monotonic()-began, firstOffset=first, samples=count, phases=phases,
                  laps=sorted(laps), errors=dict(errors), offsetDrops=drops)
    path = pathlib.Path("out/3e-wall-clock.json")
    path.parent.mkdir(exist_ok=True)
    path.write_text(json.dumps(result, indent=2) + "\n")
    assert phases[-1][0] == "FINAL" and "PRESHOW" in dict(phases) and sorted(laps) == list(range(1, 11))
    if args.qualifying:
        assert any(p.startswith("QUALIFYING") for p, _ in phases)
    print(json.dumps(result))
finally:
    server.send_signal(signal.SIGTERM)
    server.wait(timeout=30)
