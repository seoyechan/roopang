# 앱 아이콘 생성: python3 design/make-icons.py
# 초록 배경 꽉 채움(투명 없음) → iOS apple-touch-icon·Android maskable 겸용. 얼굴은 maskable 안전영역(중앙 80%) 안에 둔다.
from PIL import Image, ImageDraw

S = 1024
GREEN, INK, WHITE = '#48df55', '#181b17', '#ffffff'
cx, cy, R, LW = S // 2, S // 2 + 30, 290, 34

im = Image.new('RGB', (S, S), GREEN)
d = ImageDraw.Draw(im)

# 머리 위 삐친 머리카락
d.arc((cx - 10, cy - R - 100, cx + 150, cy - R + 60), 180, 290, fill=INK, width=LW)
# 얼굴
d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=WHITE)
# 괴도 가면: 얼굴 원 안으로 잘린 띠
mask = Image.new('L', (S, S), 0)
ImageDraw.Draw(mask).ellipse((cx - R, cy - R, cx + R, cy + R), fill=255)
band = Image.new('L', (S, S), 0)
ImageDraw.Draw(band).ellipse((cx - 1.15 * R, cy - 0.44 * R, cx + 1.15 * R, cy + 0.16 * R), fill=255)
im.paste(INK, (0, 0), Image.composite(band, Image.new('L', (S, S), 0), mask))
d = ImageDraw.Draw(im)
d.ellipse((cx - R, cy - R, cx + R, cy + R), outline=INK, width=LW)
# 감은 눈(흰 ∩)과 웃는 입
ew, eh, ey = 0.34 * R, 0.26 * R, cy - 0.12 * R
for ex in (cx - 0.36 * R, cx + 0.36 * R):
    d.arc((ex - ew / 2, ey - eh / 2, ex + ew / 2, ey + eh / 2), 190, 350, fill=WHITE, width=int(LW * 0.85))
mw, my = 0.4 * R, cy + 0.42 * R
d.arc((cx - mw / 2, my - mw / 3, cx + mw / 2, my + mw / 3), 20, 160, fill=INK, width=int(LW * 0.85))

for name, size in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180)]:
    im.resize((size, size), Image.LANCZOS).save(f'public/icons/{name}', optimize=True)
