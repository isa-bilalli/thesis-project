import csv
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path.cwd()
SUMMARY = json.loads((ROOT / "testing/results/summary/monolith-summary.json").read_text(encoding="utf-8"))
OUT = ROOT / "testing/results/report-assets"
OUT.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1600, 760
MARGIN = (130, 105, 70, 115)
NAVY = "#0F172A"
SLATE = "#475569"
GRID = "#E2E8F0"
BLUE = "#2563EB"
AMBER = "#F59E0B"
RED = "#DC2626"

def font(size, bold=False):
    name = "seguisb.ttf" if bold else "segoeui.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / name), size)

TITLE = font(34, True)
LABEL = font(22)
SMALL = font(18)

def canvas(title):
    image = Image.new("RGB", (WIDTH, HEIGHT), "white")
    draw = ImageDraw.Draw(image)
    draw.text((MARGIN[0], 34), title, fill=NAVY, font=TITLE)
    return image, draw

def plot_box():
    left, top, right_margin, bottom_margin = MARGIN
    return left, top, WIDTH - right_margin, HEIGHT - bottom_margin

def grid_y(draw, values, labels):
    left, top, right, bottom = plot_box()
    for y, label in zip(values, labels):
        draw.line((left, y, right, y), fill=GRID, width=2)
        box = draw.textbbox((0, 0), label, font=SMALL)
        draw.text((left - 18 - (box[2] - box[0]), y - 12), label, fill=SLATE, font=SMALL)

def save(image, name):
    image.save(OUT / name, "PNG", optimize=True)

def bar_chart(title, labels, series, colors, y_max, filename, y_label, target=None, log_scale=False):
    image, draw = canvas(title)
    left, top, right, bottom = plot_box()
    if log_scale:
        low = 10
        ticks = [tick for tick in [10, 50, 100, 500, 1000, 5000, 25000] if tick <= y_max]
        y_for = lambda value: bottom - (math.log10(max(low, value)) - math.log10(low)) / (math.log10(y_max) - math.log10(low)) * (bottom - top)
    else:
        ticks = [y_max * fraction for fraction in (0, .25, .5, .75, 1)]
        y_for = lambda value: bottom - value / y_max * (bottom - top)
    grid_y(draw, [y_for(value) for value in ticks], [f"{value:g}" for value in ticks])
    draw.line((left, top, left, bottom), fill=SLATE, width=2)
    draw.line((left, bottom, right, bottom), fill=SLATE, width=2)
    group_width = (right - left) / len(labels)
    bar_width = group_width * .62 / len(series)
    for series_index, (series_name, values) in enumerate(series):
        for index, value in enumerate(values):
            x0 = left + index * group_width + group_width * .19 + series_index * bar_width
            x1 = x0 + bar_width * .9
            y = y_for(value)
            draw.rounded_rectangle((x0, y, x1, bottom), radius=5, fill=colors[series_index])
            text = f"{value:.0f}"
            box = draw.textbbox((0, 0), text, font=SMALL)
            draw.text(((x0+x1)/2 - (box[2]-box[0])/2, max(top, y-27)), text, fill=NAVY, font=SMALL)
    for index, label in enumerate(labels):
        box = draw.multiline_textbbox((0, 0), label, font=SMALL, align="center")
        draw.multiline_text((left + (index+.5)*group_width - (box[2]-box[0])/2, bottom+18), label, fill=SLATE, font=SMALL, align="center")
    if target:
        y = y_for(target[0])
        draw.line((left, y, right, y), fill=RED, width=3)
        draw.text((right-300, y-30), target[1], fill=RED, font=SMALL)
    legend_x = left
    for index, (name, _) in enumerate(series):
        draw.rectangle((legend_x, 82, legend_x+24, 99), fill=colors[index])
        draw.text((legend_x+34, 77), name, fill=SLATE, font=SMALL)
        legend_x += 240
    draw.text((25, top+180), y_label, fill=SLATE, font=LABEL)
    save(image, filename)

k6 = SUMMARY["k6"]
profiles = ["medium-baseline", "medium-average", "medium-stress", "medium-spike", "medium-breakpoint", "medium-soak"]
labels = ["Baseline", "Average", "Stress", "Spike", "Breakpoint", "Soak"]
p95 = [k6[name]["http"]["p95"] for name in profiles]
p99 = [k6[name]["http"]["p99"] for name in profiles]
rates = [k6[name]["requests"]["rate"] for name in profiles]
bar_chart("Latency across monolith load profiles", labels, [("p95 latency", p95), ("p99 latency", p99)], [BLUE, AMBER], 25000, "load-profile-latency.png", "Latency (ms)", (500, "500 ms target"), True)
bar_chart("Achieved request rate by profile", labels, [("Requests / second", rates)], [BLUE], 60, "load-profile-throughput.png", "Requests/s")

scale_names = ["small-search", "medium-search", "large-search"]
scale_labels = ["Small\n1k customers", "Medium\n10k customers", "Large\n50k customers"]
scale_p95 = [k6[name]["http"]["p95"] for name in scale_names]
bar_chart("Dataset growth drives query latency", scale_labels, [("Search/deep-page p95", scale_p95)], ["#059669"], 1400, "dataset-scale.png", "p95 (ms)", (750, "750 ms guard"))

with (ROOT / "testing/results/runtime/monolith-process.csv").open(encoding="utf-8") as handle:
    rows = list(csv.DictReader(handle))[-1800:]
minutes = [index / 60 for index in range(len(rows))]
rss = [float(row["rss_bytes"]) / 1048576 for row in rows]
heap = [float(row["heap_used_bytes"]) / 1048576 for row in rows]
image, draw = canvas("Process memory remains bounded during 30-minute soak")
left, top, right, bottom = plot_box()
y_max = 120
ticks = [0, 30, 60, 90, 120]
y_for = lambda value: bottom - value/y_max*(bottom-top)
x_for = lambda value: left + value/30*(right-left)
grid_y(draw, [y_for(value) for value in ticks], [str(value) for value in ticks])
draw.line((left, top, left, bottom), fill=SLATE, width=2)
draw.line((left, bottom, right, bottom), fill=SLATE, width=2)
for values, color in [(rss, "#7C3AED"), (heap, "#0EA5E9")]:
    points = [(x_for(minutes[index]), y_for(value)) for index, value in enumerate(values)]
    draw.line(points, fill=color, width=3)
for minute in [0, 5, 10, 15, 20, 25, 30]:
    draw.text((x_for(minute)-10, bottom+18), str(minute), fill=SLATE, font=SMALL)
draw.text((left, bottom+58), "Elapsed minutes", fill=SLATE, font=LABEL)
draw.text((25, top+180), "Memory (MB)", fill=SLATE, font=LABEL)
draw.rectangle((left, 82, left+24, 99), fill="#7C3AED")
draw.text((left+34, 77), "RSS", fill=SLATE, font=SMALL)
draw.rectangle((left+150, 82, left+174, 99), fill="#0EA5E9")
draw.text((left+184, 77), "Heap used", fill=SLATE, font=SMALL)
save(image, "soak-memory.png")

scores = json.loads((ROOT / "testing/results/lighthouse/scores.json").read_text(encoding="utf-8"))
categories = ["performance", "accessibility", "best-practices", "seo"]
category_labels = ["Performance", "Accessibility", "Best practices", "SEO"]
bar_chart("Frontend quality audit", category_labels, [("Login", [scores["login"][key] for key in categories]), ("Dashboard", [scores["dashboard"][key] for key in categories])], ["#334155", "#38BDF8"], 100, "lighthouse-scores.png", "Score")

print(json.dumps({"assets": sorted(path.name for path in OUT.glob("*.png"))}, indent=2))
