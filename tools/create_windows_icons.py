"""Create app icon assets from FramePilot's supplied full logo artwork."""
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'branding' / 'framepilot-studio-logo.png'
PNG = ROOT / 'branding' / 'framepilot-studio-1024.png'
WINDOW_PNG = ROOT / 'branding' / 'framepilot-window.png'
ICO = ROOT / 'branding' / 'framepilot-studio.ico'


def main() -> None:
    original = Image.open(SOURCE).convert('RGB')
    # Crop the existing upper emblem only; the complete logo remains in the UI.
    emblem = original.crop((140, 110, 1115, 772))
    # The logo has a small diagonal wordmark accent under the emblem. Keep the
    # icon focused on the existing emblem by masking that separate accent,
    # while retaining the emblem's lower tips and film strip.
    background_color = original.getpixel((10, 10))
    ImageDraw.Draw(emblem).polygon(
        [(735, 590), (975, 590), (975, 700), (735, 700)],
        fill=background_color,
    )
    emblem.thumbnail((960, 700), Image.Resampling.LANCZOS)

    # The original artwork uses a near-black backdrop. Matching its sampled
    # corner color keeps the emblem recognizable without inventing new artwork.
    background = Image.new('RGB', (1024, 1024), background_color)
    x = (1024 - emblem.width) // 2
    y = (1024 - emblem.height) // 2
    background.paste(emblem, (x, y))
    background.save(PNG, format='PNG', optimize=True)
    background.save(WINDOW_PNG, format='PNG', optimize=True)

    icon = background.convert('RGBA')
    icon.save(
        ICO,
        format='ICO',
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (24, 24), (16, 16)],
        append_images=[],
    )
    print(f'Created {PNG}, {WINDOW_PNG}, and multi-resolution {ICO}')


if __name__ == '__main__':
    main()
