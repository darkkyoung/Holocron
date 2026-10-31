HOLOCRON Galactic Racing — PHASE 2-A / 30FPS player 2.0 / simulator v0.4

1. Extract the ENTIRE ZIP into a NEW folder (do not overwrite an old demo).
2. Double-click START-RACING.bat. Windows PowerShell 5.1 is included in Windows 10/11.
   Node.js, Python, npm, internet and administrator access are NOT required.
3. Keep the terminal open. Chrome opens the exact extracted build.
4. Compare the top Build SHA with build-info.json and the release report.
5. If port 43874 is occupied, no browser opens. In that folder run:
   START-RACING.bat -Port 43875
6. Stop with Ctrl+C / close the terminal. This does not stop old servers.

K / Space = play/pause; arrows = 5 seconds; J/L = 10 seconds; F = fullscreen.
Use the gear inside the player for speed, camera and HUD size.
Qualifying, race and ceremony are independent replay videos.
The archive button demonstrates a persistent mini-player in this isolated shell.
It is not connected to HOLOCRON Production navigation or a live 21:00 broadcast.

No accounts, credits, API keys, database or installation is involved.
If local script execution is forbidden by your managed Windows policy, do not
bypass that policy: ask your administrator. No executable is downloaded.
The 3D renderer uses WebGL if available; a visibly labelled SVG fallback is used
otherwise. Physical Windows/GPU testing status is stated in the release report.

Performance: expand the developer performance panel below the replay (or add ?perf=1).
Play for at least 30 seconds, then download its JSON. This measures actual frames,
not a guaranteed 30FPS. Test fullscreen/large HUD as well. Hardware GPU results
must be distinguished from SwiftShader or the SVG fallback.
