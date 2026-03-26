#!/usr/bin/env python3
"""Change detection heatmap between two orthomosaics."""

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

BASE_DIR = "/Users/deepgupta/FlytBase/3D-Mapping/output"
LATEST = f"{BASE_DIR}/odm_orthophoto.jpg"
EARLIER = f"{BASE_DIR}/orthomosaic_earlier.jpg"
OUT_HEATMAP = f"{BASE_DIR}/change_detection.png"
OUT_OVERLAY = f"{BASE_DIR}/change_overlay.jpg"

print("Loading latest survey...")
img_latest = Image.open(LATEST).convert("RGB")
print(f"  Size: {img_latest.size}")

print("Loading earlier survey...")
img_earlier = Image.open(EARLIER).convert("RGB")
print(f"  Size: {img_earlier.size}")

# Resize earlier to match latest if dimensions differ
if img_latest.size != img_earlier.size:
    print(f"Resizing earlier image from {img_earlier.size} to {img_latest.size}...")
    img_earlier = img_earlier.resize(img_latest.size, Image.LANCZOS)

# Convert to numpy arrays
arr_latest = np.array(img_latest, dtype=np.float32)
arr_earlier = np.array(img_earlier, dtype=np.float32)

# Compute pixel-wise difference (Euclidean distance across RGB channels)
print("Computing pixel-wise difference...")
diff = np.sqrt(np.sum((arr_latest - arr_earlier) ** 2, axis=2))

# Normalize to 0-1 range
diff_max = diff.max()
print(f"  Max raw difference: {diff_max:.1f}")
if diff_max > 0:
    diff_norm = diff / diff_max
else:
    diff_norm = diff

# Apply a threshold to filter noise (below 5% = no change)
NOISE_THRESHOLD = 0.05
diff_norm[diff_norm < NOISE_THRESHOLD] = 0.0

# Create RGBA heatmap: red=high change, yellow=moderate, transparent=no change
print("Generating heatmap...")
h, w = diff_norm.shape
heatmap = np.zeros((h, w, 4), dtype=np.uint8)

# Red channel: always high where there's change
heatmap[:, :, 0] = (np.clip(diff_norm, 0, 1) * 255).astype(np.uint8)

# Green channel: high for moderate, low for high change (creates red->yellow gradient)
# Yellow at ~0.3-0.5 diff, red at ~0.7-1.0 diff
green = np.clip(1.0 - diff_norm * 2.0, 0, 1)  # 1 at low diff, 0 at high diff
green[diff_norm == 0] = 0  # no color where no change
heatmap[:, :, 1] = (green * diff_norm * 255).astype(np.uint8)

# Blue channel: 0 (no blue needed for red-yellow palette)
heatmap[:, :, 2] = 0

# Alpha: proportional to change magnitude, 0 where no change
alpha = np.clip(diff_norm * 2.0, 0, 1)  # ramp up alpha quickly
alpha[diff_norm == 0] = 0
heatmap[:, :, 3] = (alpha * 220).astype(np.uint8)  # max 220 for slight transparency

# Save heatmap with transparency
print(f"Saving heatmap to {OUT_HEATMAP}...")
heatmap_img = Image.fromarray(heatmap, mode="RGBA")
heatmap_img.save(OUT_HEATMAP)

# Create blended overlay
print(f"Saving overlay to {OUT_OVERLAY}...")
latest_rgba = img_latest.convert("RGBA")
composite = Image.alpha_composite(latest_rgba, heatmap_img)
composite_rgb = composite.convert("RGB")
composite_rgb.save(OUT_OVERLAY, quality=90)

print("Done!")
print(f"  Heatmap: {OUT_HEATMAP}")
print(f"  Overlay: {OUT_OVERLAY}")
