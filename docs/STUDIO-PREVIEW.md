# Studio preview assets and limits

The map image and transparent first-person pistol were supplied by the project owner. Original files are preserved as `studio-dust2.jpg` and `studio-pistol.png`; CSS composes them without altering source images.

The Dust II overview is extracted from the game and distributed by [MurkyYT/cs2-map-icons](https://github.com/MurkyYT/cs2-map-icons), downloaded October 10, 2026 from `images/radars/de_dust2_radar_psd.png`. Counter-Strike artwork belongs to Valve. The supplied HUD image served as a positioning reference; HUD elements are rebuilt so color, scale and visibility remain adjustable.

The preview uses a 16:9 viewport and resolution-scaled crosshair dimensions. A tangent-based focal ratio makes wider viewmodel FOV smaller. Depth and offsets project a fixed cutout, so they cannot reveal additional surfaces or reproduce game bones, animation, lighting or clipping. Left hand mirrors the cutout. Tilt is preview-only and never enters exported configs.

Radar uses the actual Dust II overview with a fixed approximate B-site position. Rotation and centering illustrate settings, not live telemetry. HUD is a reference layout. Gamma is a brightness approximation applied to world and weapon, not HUD. Dynamic crosshairs show their resting shape; spread and recoil are not simulated. Confirm final appearance in CS2.
