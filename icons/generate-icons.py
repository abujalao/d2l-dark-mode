"""
Generate D2L-branded PNG icons for the D2L Dark Mode extension.
Uses only the Python standard library (no Pillow needed).
Creates a blue rounded square with white "D2L" text and moon icon.
Produces icons at 16x16, 48x48, and 128x128.
"""

import struct, zlib, math, os

def make_png(width, height, pixels):
    """Create a PNG file from raw RGBA pixel data."""
    def chunk(chunk_type, data):
        c = chunk_type + data
        crc = struct.pack('>I', zlib.crc32(c) & 0xffffffff)
        return struct.pack('>I', len(data)) + c + crc

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))

    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])

    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')

    return header + ihdr + idat + iend


def dist(x1, y1, x2, y2):
    """Calculate distance between two points."""
    return math.sqrt((x1-x2)**2 + (y1-y2)**2)


def smooth_alpha(d, threshold, smoothing=1.5):
    """Generate smooth anti-aliased alpha values."""
    if d <= threshold - smoothing:
        return 255
    elif d >= threshold + smoothing:
        return 0
    else:
        # Smooth transition
        ratio = (d - (threshold - smoothing)) / (2 * smoothing)
        return int(255 * (1 - ratio))


def is_inside_rounded_rect(x, y, width, height, corner_radius):
    """Check if point is inside a rounded rectangle."""
    # Check if in corner regions
    if x < corner_radius:
        if y < corner_radius:
            # Top-left corner
            return dist(x, y, corner_radius, corner_radius) <= corner_radius
        elif y > height - corner_radius:
            # Bottom-left corner
            return dist(x, y, corner_radius, height - corner_radius) <= corner_radius
    elif x > width - corner_radius:
        if y < corner_radius:
            # Top-right corner
            return dist(x, y, width - corner_radius, corner_radius) <= corner_radius
        elif y > height - corner_radius:
            # Bottom-right corner
            return dist(x, y, width - corner_radius, height - corner_radius) <= corner_radius
    # Inside main rectangle
    return True


def draw_letter_d(pixels, size, start_x, start_y, letter_height, width_px):
    """Draw a stylized 'D' letter."""
    thickness = max(1, int(letter_height * 0.18))

    for y in range(letter_height):
        for x in range(width_px):
            # Vertical bar of 'D'
            if x < thickness:
                px = start_x + x
                py = start_y + y
                if 0 <= px < size and 0 <= py < size:
                    idx = (py * size + px) * 4
                    pixels[idx] = 255      # White
                    pixels[idx+1] = 255
                    pixels[idx+2] = 255
                    pixels[idx+3] = 255

            # Curved part of 'D' (simplified as arc)
            arc_x = start_x + x - thickness
            arc_y = start_y + y - letter_height // 2
            arc_radius = letter_height // 2
            arc_dist = dist(arc_x, arc_y, width_px - thickness - arc_radius, 0)

            if arc_radius - thickness <= arc_dist <= arc_radius and x >= thickness:
                px = start_x + x
                py = start_y + y
                if 0 <= px < size and 0 <= py < size:
                    idx = (py * size + px) * 4
                    pixels[idx] = 255      # White
                    pixels[idx+1] = 255
                    pixels[idx+2] = 255
                    pixels[idx+3] = 255


def draw_icon(size):
    """Generate D2L-branded dark mode icon."""
    pixels = [0] * (size * size * 4)

    # D2L brand colors
    d2l_blue = (77, 159, 255)      # #4d9fff - celestine blue
    white = (255, 255, 255)

    # Rounded square dimensions
    corner_radius = size * 0.15

    for y in range(size):
        for x in range(size):
            idx = (y * size + x) * 4

            # Check if inside rounded square
            if is_inside_rounded_rect(x + 0.5, y + 0.5, size, size, corner_radius):
                # Blue background
                pixels[idx] = d2l_blue[0]
                pixels[idx+1] = d2l_blue[1]
                pixels[idx+2] = d2l_blue[2]
                pixels[idx+3] = 255
            else:
                # Transparent
                pixels[idx] = 0
                pixels[idx+1] = 0
                pixels[idx+2] = 0
                pixels[idx+3] = 0

    # Draw "D" letter (large, centered)
    letter_height = int(size * 0.50)
    letter_width = int(size * 0.45)
    start_x = int(size * 0.28)
    start_y = int(size * 0.25)

    # Simplified "D" - vertical bar
    bar_width = max(2, int(size * 0.12))
    bar_height = letter_height
    bar_x = start_x
    bar_y = start_y

    for y in range(bar_height):
        for x in range(bar_width):
            px = bar_x + x
            py = bar_y + y
            if 0 <= px < size and 0 <= py < size:
                idx = (py * size + px) * 4
                pixels[idx] = white[0]
                pixels[idx+1] = white[1]
                pixels[idx+2] = white[2]
                pixels[idx+3] = 255

    # Simplified "D" - curved arc (right side)
    arc_center_x = bar_x + bar_width
    arc_center_y = bar_y + bar_height // 2
    arc_radius_outer = letter_height // 2
    arc_radius_inner = arc_radius_outer - bar_width

    for angle_deg in range(-90, 91, 2):
        angle = math.radians(angle_deg)
        for r in range(arc_radius_inner, arc_radius_outer):
            px = int(arc_center_x + r * math.cos(angle))
            py = int(arc_center_y + r * math.sin(angle))
            if 0 <= px < size and 0 <= py < size:
                idx = (py * size + px) * 4
                pixels[idx] = white[0]
                pixels[idx+1] = white[1]
                pixels[idx+2] = white[2]
                pixels[idx+3] = 255

    # Small crescent moon in top-right corner
    if size >= 48:
        moon_cx = size * 0.78
        moon_cy = size * 0.22
        moon_radius = size * 0.10
        cutout_offset = size * 0.04

        for y in range(size):
            for x in range(size):
                idx = (y * size + x) * 4

                # Only draw moon if this pixel is already blue (inside background)
                if pixels[idx+3] == 255 and pixels[idx] == d2l_blue[0]:
                    d_moon = dist(x + 0.5, y + 0.5, moon_cx, moon_cy)
                    d_cut = dist(x + 0.5, y + 0.5, moon_cx + cutout_offset, moon_cy - cutout_offset * 0.5)

                    # Crescent: inside main circle, outside cutout circle
                    if d_moon <= moon_radius and d_cut > moon_radius * 0.7:
                        pixels[idx] = white[0]
                        pixels[idx+1] = white[1]
                        pixels[idx+2] = white[2]
                        pixels[idx+3] = 255

    return pixels


script_dir = os.path.dirname(os.path.abspath(__file__))

for size in [16, 48, 128]:
    pixels = draw_icon(size)
    png_data = make_png(size, size, pixels)
    path = os.path.join(script_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(png_data)
    print(f'Created {path} ({len(png_data)} bytes)')

print('Done!')
