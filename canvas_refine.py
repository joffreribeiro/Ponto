"""
Second pass — refinement only. No new shapes. Sharper, more cohesive, more deliberate.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math, os

W, H = 3200, 4000
DPI  = 300

BG         = (8, 8, 12)
DOT_DIM    = (35, 33, 46)
DOT_MID    = (82, 78, 102)
DOT_BRIGHT = (218, 212, 232)
AMBER      = (208, 150, 62)
LINE_COL   = (48, 46, 60)
TEXT_LIGHT = (198, 194, 216)
TEXT_DIM   = (80, 76, 100)

FONT_DIR = r"e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto\.claude\skills\canvas-design\canvas-fonts"

def load_font(name, size):
    path = os.path.join(FONT_DIR, name)
    try:
        return ImageFont.truetype(path, size)
    except:
        return ImageFont.load_default()

# ── BASE ────────────────────────────────────────────────────────────────────────
img  = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img, "RGBA")

rng = np.random.default_rng(7)

# ── NOISE TEXTURE (very fine grain) ─────────────────────────────────────────────
noise = Image.new("RGBA", (W, H), (0,0,0,0))
nd   = ImageDraw.Draw(noise)
pts  = rng.integers(0, [W, H], size=(22000, 2))
for px, py in pts:
    a = int(rng.uniform(2, 8))
    nd.point((int(px), int(py)), fill=(255,255,255,a))
img = Image.alpha_composite(img.convert("RGBA"), noise).convert("RGB")
draw = ImageDraw.Draw(img, "RGBA")

# ── DOT FIELD ───────────────────────────────────────────────────────────────────
COLS, ROWS = 68, 86
PAD_X, PAD_Y = 220, 300
cw = (W - 2*PAD_X) / COLS
ch = (H - 2*PAD_Y) / ROWS

def density(c, r):
    cx, cy = c / COLS, r / ROWS
    # Primary cloud centered at golden ratio
    d1 = math.exp(-((cx-0.50)**2/0.042 + (cy-0.475)**2/0.050)) * 0.95
    # Secondary: upper-left
    d2 = math.exp(-((cx-0.21)**2/0.016 + (cy-0.27)**2/0.019)) * 0.58
    # Tertiary: lower-right
    d3 = math.exp(-((cx-0.76)**2/0.014 + (cy-0.69)**2/0.017)) * 0.52
    # Meridian band at golden ratio y — density concentration
    band = 0.30 * math.exp(-((cy - 0.618)**2) / 0.0006)
    # Second horizontal whisper
    band2 = 0.14 * math.exp(-((cy - 0.382)**2) / 0.0005)
    return min(1.0, d1 + d2 + d3 + band + band2)

for row in range(ROWS):
    for col in range(COLS):
        den = density(col, row)
        if den < 0.04:
            continue

        jx = rng.uniform(-0.32, 0.32) * cw
        jy = rng.uniform(-0.32, 0.32) * ch
        x  = PAD_X + col*cw + cw/2 + jx
        y  = PAD_Y + row*ch + ch/2 + jy

        r_base = cw * 0.088

        if den < 0.15:
            if rng.random() > den * 4.0:
                continue
            r     = r_base * rng.uniform(0.25, 0.60)
            color = DOT_DIM
            alpha = int(rng.uniform(50, 100))
        elif den < 0.40:
            if rng.random() > den * 1.8:
                continue
            r     = r_base * rng.uniform(0.50, 0.95)
            color = DOT_MID
            alpha = int(rng.uniform(90, 165))
        else:
            r     = r_base * rng.uniform(0.72, 1.28)
            # Amber accent dots — rare, precious
            if rng.random() < 0.055 * den:
                color = AMBER
                alpha = int(rng.uniform(170, 240))
            elif rng.random() < 0.12 * den:
                # Slightly oversized bright dot — creates grain texture
                r *= 1.4
                color = DOT_BRIGHT
                alpha = int(rng.uniform(60, 120))
            else:
                color = DOT_BRIGHT
                alpha = int(rng.uniform(130, 210))

        r = max(1.2, r)
        bbox = [x-r, y-r, x+r, y+r]
        draw.ellipse(bbox, fill=(*color, alpha))

# ── MERIDIAN LINES ───────────────────────────────────────────────────────────────
golden_y = int(H * 0.618)
upper_y  = int(H * 0.382)
# Primary — amber, feathered
for offset, a in [(-2,30),(-1,80),(0,220),(1,80),(2,30)]:
    draw.line([(PAD_X, golden_y+offset),(W-PAD_X, golden_y+offset)],
              fill=(*AMBER, a), width=1)
# Secondary — cool dim
draw.line([(PAD_X, upper_y),(W-PAD_X, upper_y)],
          fill=(*LINE_COL, 140), width=1)

# ── TICK MARKS: left margin ──────────────────────────────────────────────────────
font_mono   = load_font("DMMono-Regular.ttf", 28)
font_mono_s = load_font("DMMono-Regular.ttf", 22)

for ly, label, col_t in [
    (int(H*0.236), "φ·0.236", TEXT_DIM),
    (upper_y,      "φ·0.382", TEXT_DIM),
    (golden_y,     "φ·0.618", AMBER),
    (int(H*0.764), "φ·0.764", TEXT_DIM),
]:
    tick_len = 30 if ly == golden_y else 18
    draw.line([(PAD_X - tick_len - 6, ly),(PAD_X - 6, ly)],
              fill=(*col_t, 180), width=1)
    draw.text((PAD_X - 130, ly - 15), label, font=font_mono_s,
              fill=(*col_t, 150 if ly != golden_y else 220))

# ── VERTICAL DOTTED GUIDES ────────────────────────────────────────────────────────
for vx_frac in [0.236, 0.50, 0.764]:
    vx = int(W * vx_frac)
    for vy in range(PAD_Y, H - PAD_Y, 9):
        a = 55 if vx_frac != 0.50 else 80
        draw.point((vx, vy), fill=(*LINE_COL, a))

# ── CORNER REGISTRATION ──────────────────────────────────────────────────────────
def reg(x, y, sx, sy):
    L = 56
    draw.line([(x, y),(x+sx*L, y)], fill=(*TEXT_DIM, 170), width=1)
    draw.line([(x, y),(x, y+sy*L)], fill=(*TEXT_DIM, 170), width=1)
    r = 3
    draw.ellipse([x-r,y-r,x+r,y+r], fill=(*TEXT_DIM, 200))

m = 90
reg(m, m,  1,  1)
reg(W-m, m, -1,  1)
reg(m, H-m, 1, -1)
reg(W-m, H-m, -1, -1)

# ── TYPOGRAPHY ───────────────────────────────────────────────────────────────────
font_title  = load_font("Jura-Light.ttf",       198)
font_sub    = load_font("DMMono-Regular.ttf",    34)
font_label  = load_font("InstrumentSans-Regular.ttf", 32)
font_italic = load_font("CrimsonPro-Italic.ttf", 54)
font_tiny   = load_font("DMMono-Regular.ttf",    24)

# Ghost title: "PONTO" — translucent, just below golden meridian
tb = draw.textbbox((0,0), "PONTO", font=font_title)
tw, th = tb[2]-tb[0], tb[3]-tb[1]
tx = (W - tw) // 2
ty = golden_y + 52
draw.text((tx, ty), "PONTO", font=font_title, fill=(*DOT_BRIGHT, 22))

# Subtitle
sub = "meridian silence  ·  field study no. 01"
sb  = draw.textbbox((0,0), sub, font=font_sub)
draw.text(((W-(sb[2]-sb[0]))//2, ty + th + 18), sub,
          font=font_sub, fill=(*TEXT_DIM, 130))

# Catalog label — top left
draw.text((PAD_X, PAD_Y - 82), "M.S. — I", font=font_label, fill=(*AMBER, 210))

# Italic phrase — top right
phrase = "o registro do invisível"
pb = draw.textbbox((0,0), phrase, font=font_italic)
draw.text((W - PAD_X - (pb[2]-pb[0]), PAD_Y - 70), phrase,
          font=font_italic, fill=(*TEXT_DIM, 110))

# Tiny time labels at intersections — the niche soul of "Ponto"
markers = [
    ("08:00", int(W*0.236)+10, int(H*0.236)-28),
    ("12:30", int(W*0.50)-80,  int(H*0.382)-28),
    ("17:48", int(W*0.764)-95, int(H*0.618)-36),
    ("23:59", int(W*0.50)-60,  int(H*0.764)-28),
]
for lbl, lx, ly in markers:
    col_m = AMBER if ly == int(H*0.618)-36 else TEXT_DIM
    a_m   = 200   if ly == int(H*0.618)-36 else 140
    draw.text((lx, ly), lbl, font=font_tiny, fill=(*col_m, a_m))
    draw.ellipse([lx-3, ly+32, lx+3, ly+38], fill=(*col_m, a_m))

# Bottom rule + caption
rule_y = H - PAD_Y + 44
draw.line([(PAD_X, rule_y),(W-PAD_X, rule_y)], fill=(*LINE_COL, 170), width=1)
cap = "2026  ·  campo de acumulação  ·  coordenadas meridionais"
cb  = draw.textbbox((0,0), cap, font=font_tiny)
draw.text(((W-(cb[2]-cb[0]))//2, rule_y+14), cap,
          font=font_tiny, fill=(*TEXT_DIM, 95))

# ── RADIAL VIGNETTE ───────────────────────────────────────────────────────────────
arr = np.array(img, dtype=np.float32)
ys, xs = np.mgrid[0:H, 0:W]
dist = np.sqrt(((xs - W/2)/(W*0.62))**2 + ((ys - H/2)/(H*0.62))**2)
vig  = np.clip(dist, 0, 1) ** 2.4 * 130
arr[...,0] -= vig
arr[...,1] -= vig
arr[...,2] -= vig
arr = np.clip(arr, 0, 255).astype(np.uint8)
img = Image.fromarray(arr, "RGB")

# Subtle global contrast boost: levels
def levels(im, black=4, white=252):
    arr2 = np.array(im, dtype=np.float32)
    arr2 = (arr2 - black) / (white - black) * 255
    return Image.fromarray(np.clip(arr2, 0, 255).astype(np.uint8), "RGB")

img = levels(img, black=3, white=250)

# ── SAVE ─────────────────────────────────────────────────────────────────────────
out = r"e:\MEUS DOCUMENTOS\OneDrive\Documentos\Ponto\meridian_silence.png"
img.save(out, "PNG", dpi=(DPI, DPI))
print(f"Refined: {out}  ({W}x{H} @ {DPI}dpi)")
