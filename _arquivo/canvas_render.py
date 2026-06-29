import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.font_manager import FontProperties
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import math
import os

# Canvas dimensions (3200 x 4000 px - portrait, like a museum print)
W, H = 3200, 4000
DPI = 300

# Color palette — Meridian Silence
BG       = (10, 10, 14)          # near-black, slightly blue-tinted
DOT_DIM  = (38, 36, 48)          # muted purple-dark for faint dots
DOT_MID  = (90, 86, 110)         # medium lavender-grey
DOT_BRIGHT = (220, 215, 235)     # near-white lavender
AMBER    = (210, 155, 72)        # warm amber — the single warm frequency
LINE_COL = (55, 52, 68)          # subtle grid lines
TEXT_LIGHT = (200, 196, 218)     # light text
TEXT_DIM   = (90, 86, 110)       # dim text

FONT_DIR = r"e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto\.claude\skills\canvas-design\canvas-fonts"

def load_font(name, size):
    path = os.path.join(FONT_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

def rgba(rgb, a=255):
    return (*rgb, a)

# Create base image
img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img, "RGBA")

# ── BACKGROUND TEXTURE: very faint noise ──────────────────────────────────────
noise_layer = Image.new("RGBA", (W, H), (0,0,0,0))
nd = ImageDraw.Draw(noise_layer)
rng = np.random.default_rng(42)
noise_pts = rng.integers(0, [W, H], size=(18000, 2))
for px, py in noise_pts:
    a = int(rng.uniform(2, 10))
    nd.point((int(px), int(py)), fill=(255, 255, 255, a))
img = Image.alpha_composite(img.convert("RGBA"), noise_layer).convert("RGB")
draw = ImageDraw.Draw(img, "RGBA")

# ── DOT FIELD: accumulated marks on a grid — the core visual ─────────────────
COLS = 72
ROWS = 90
PAD_X = 200
PAD_Y = 280
cell_w = (W - 2 * PAD_X) / COLS
cell_h = (H - 2 * PAD_Y) / ROWS

# Density map: three Gaussian wells + one horizontal band
def density(col, row):
    cx, cy = col / COLS, row / ROWS
    # Large central cluster
    d1 = math.exp(-((cx - 0.5)**2 / 0.045 + (cy - 0.48)**2 / 0.055)) * 0.92
    # Upper-left secondary
    d2 = math.exp(-((cx - 0.22)**2 / 0.018 + (cy - 0.28)**2 / 0.022)) * 0.62
    # Lower-right tertiary
    d3 = math.exp(-((cx - 0.74)**2 / 0.016 + (cy - 0.70)**2 / 0.020)) * 0.55
    # Horizontal band — a meridian line made of dots
    band = 0.28 * math.exp(-((cy - 0.618)**2) / 0.0008)
    return min(1.0, d1 + d2 + d3 + band)

for row in range(ROWS):
    for col in range(COLS):
        den = density(col, row)
        # Jitter within cell for organic feel
        jx = rng.uniform(-0.28, 0.28) * cell_w
        jy = rng.uniform(-0.28, 0.28) * cell_h
        x = PAD_X + col * cell_w + cell_w / 2 + jx
        y = PAD_Y + row * cell_h + cell_h / 2 + jy

        # Dot size varies with density
        r_base = cell_w * 0.09
        if den < 0.05:
            continue  # sparse: skip most
        elif den < 0.18:
            if rng.random() > den * 3.5:
                continue
            r = r_base * rng.uniform(0.3, 0.7)
            col_dot = DOT_DIM
            alpha = int(rng.uniform(60, 110))
        elif den < 0.45:
            if rng.random() > den * 1.6:
                continue
            r = r_base * rng.uniform(0.5, 1.0)
            col_dot = DOT_MID
            alpha = int(rng.uniform(100, 180))
        else:
            r = r_base * rng.uniform(0.7, 1.3)
            # In the dense core, occasional amber dots
            if rng.random() < 0.06 * den:
                col_dot = AMBER
                alpha = int(rng.uniform(160, 230))
            else:
                col_dot = DOT_BRIGHT
                alpha = int(rng.uniform(140, 220))

        r = max(1.0, r)
        bbox = [x - r, y - r, x + r, y + r]
        draw.ellipse(bbox, fill=(*col_dot, alpha))

# ── MERIDIAN LINES: thin horizontal rules ──────────────────────────────────────
line_ys = [
    int(H * 0.618),   # golden ratio — the primary meridian (amber)
    int(H * 0.236),   # upper
    int(H * 0.382),   # upper-mid
    int(H * 0.764),   # lower-mid
    int(H * 0.882),   # lower
]
for i, ly in enumerate(line_ys):
    if i == 0:
        # Primary meridian — amber, solid
        for dy in range(-1, 2):
            alpha = 200 if dy == 0 else 60
            draw.line([(PAD_X, ly + dy), (W - PAD_X, ly + dy)], fill=(*AMBER, alpha), width=1)
    else:
        # Secondary — very faint
        draw.line([(PAD_X, ly), (W - PAD_X, ly)], fill=(*LINE_COL, 120), width=1)

# ── COORDINATE TICK MARKS: left edge ──────────────────────────────────────────
font_mono_sm = load_font("DMMono-Regular.ttf", 26)
for i, ly in enumerate(line_ys):
    label = f"{ly:04d}"
    # tick
    draw.line([(PAD_X - 24, ly), (PAD_X - 4, ly)], fill=(*TEXT_DIM, 160), width=1)
    draw.text((PAD_X - 90, ly - 14), label, font=font_mono_sm,
              fill=(*TEXT_DIM, 120))

# ── VERTICAL REFERENCE LINES: sparse ──────────────────────────────────────────
vline_xs = [int(W * f) for f in [0.236, 0.5, 0.764]]
for vx in vline_xs:
    for dy in range(PAD_Y, H - PAD_Y, 6):
        draw.point((vx, dy), fill=(*LINE_COL, 80))

# ── CORNER REGISTRATION MARKS ─────────────────────────────────────────────────
def corner_mark(x, y, flip_x=False, flip_y=False):
    L = 60
    T = 1
    dx = -1 if flip_x else 1
    dy_s = -1 if flip_y else 1
    draw.line([(x, y), (x + dx * L, y)], fill=(*TEXT_DIM, 180), width=T)
    draw.line([(x, y), (x, y + dy_s * L)], fill=(*TEXT_DIM, 180), width=T)
    r = 4
    draw.ellipse([x - r, y - r, x + r, y + r], fill=(*TEXT_DIM, 200))

m = 80
corner_mark(m, m)
corner_mark(W - m, m, flip_x=True)
corner_mark(m, H - m, flip_y=True)
corner_mark(W - m, H - m, flip_x=True, flip_y=True)

# ── TYPOGRAPHY ─────────────────────────────────────────────────────────────────
font_title   = load_font("Jura-Light.ttf",  200)
font_sub     = load_font("DMMono-Regular.ttf", 36)
font_label   = load_font("InstrumentSans-Regular.ttf", 30)
font_italic  = load_font("CrimsonPro-Italic.ttf", 52)
font_tiny    = load_font("DMMono-Regular.ttf", 22)

# MAIN WORD: "PONTO" — ultra-light, near-white, vertical center-bottom area
# Positioned just below the golden meridian line, centered
title_text = "PONTO"
# Measure text
bbox_t = draw.textbbox((0, 0), title_text, font=font_title)
tw = bbox_t[2] - bbox_t[0]
th = bbox_t[3] - bbox_t[1]
tx = (W - tw) // 2
ty = int(H * 0.618) + 48  # just below the amber meridian

# Draw title with very low opacity — it exists as a ghost
draw.text((tx, ty), title_text, font=font_title, fill=(*DOT_BRIGHT, 28))

# SUBTITLE — clinical reference, below title
sub_text = "meridian silence  ·  field study no. 01"
bbox_s = draw.textbbox((0, 0), sub_text, font=font_sub)
sw = bbox_s[2] - bbox_s[0]
draw.text(((W - sw) // 2, ty + th + 24), sub_text, font=font_sub,
          fill=(*TEXT_DIM, 140))

# UPPER LABEL — top left, like a catalog entry
draw.text((PAD_X, PAD_Y - 80), "M.S. — I", font=font_label,
          fill=(*AMBER, 200))

# Italic phrase — upper right area, rotated feel via position
phrase = "o registro do invisível"
draw.text((W - PAD_X - 480, PAD_Y - 68), phrase, font=font_italic,
          fill=(*TEXT_DIM, 120))

# TINY DATA LABELS scattered at meridian intersections
data_labels = [
    ("08:00", int(W * 0.236), int(H * 0.236) - 22),
    ("12:30", int(W * 0.5) - 70, int(H * 0.382) - 22),
    ("18:00", int(W * 0.764) - 100, int(H * 0.618) - 30),
    ("23:59", int(W * 0.5) - 60, int(H * 0.882) - 22),
]
for lbl, lx, ly in data_labels:
    draw.text((lx, ly), lbl, font=font_tiny, fill=(*AMBER, 160))
    # small amber dot at intersection
    draw.ellipse([lx - 3, ly + 28, lx + 3, ly + 34], fill=(*AMBER, 200))

# BOTTOM RULE + credit
draw.line([(PAD_X, H - PAD_Y + 40), (W - PAD_X, H - PAD_Y + 40)],
          fill=(*LINE_COL, 180), width=1)
credit = "2026  ·  campo de acumulação  ·  coordenadas meridionais"
bbox_c = draw.textbbox((0, 0), credit, font=font_tiny)
cw = bbox_c[2] - bbox_c[0]
draw.text(((W - cw) // 2, H - PAD_Y + 56), credit, font=font_tiny,
          fill=(*TEXT_DIM, 100))

# ── FINAL REFINEMENT: vignette ─────────────────────────────────────────────────
vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
vd = ImageDraw.Draw(vignette)
steps = 80
for s in range(steps):
    t = s / steps
    margin = int(t * min(W, H) * 0.52)
    x0, y0 = margin, margin
    x1, y1 = W - margin, H - margin
    if x1 > x0 and y1 > y0:
        alpha = int((1 - t) ** 2.2 * 140)
        vd.rectangle([x0, y0, x1, y1], outline=(0, 0, 0, alpha), width=1)
# Simpler approach: radial vignette via numpy
img_arr = np.array(img.convert("RGBA"), dtype=np.float32)
cx, cy = W / 2, H / 2
ys, xs = np.mgrid[0:H, 0:W]
dist = np.sqrt(((xs - cx) / W) ** 2 + ((ys - cy) / H) ** 2)
vig = np.clip(dist * 1.6, 0, 1) ** 2.2 * 140
img_arr[..., 0] -= vig
img_arr[..., 1] -= vig
img_arr[..., 2] -= vig
img_arr = np.clip(img_arr, 0, 255).astype(np.uint8)
img = Image.fromarray(img_arr[..., :3], "RGB")

# ── EXPORT ─────────────────────────────────────────────────────────────────────
out_path = r"e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto\meridian_silence.png"
img.save(out_path, "PNG", dpi=(DPI, DPI), optimize=False)
print(f"Saved: {out_path}  ({W}x{H} @ {DPI}dpi)")
