/** Glyph rendering for the vision assessments (digits + tumbling E). */

/** 5×7 pixel font for digits 0–9 (rows of 5 chars). */
export const DIGIT_GLYPHS: Record<string, string[]> = {
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
}

/** Draw a digit glyph onto a canvas context. Returns the drawn pixel rect. */
export function drawGlyph(
  ctx: CanvasRenderingContext2D,
  digit: string,
  cx: number,
  cy: number,
  cell: number,
  color: string,
  rotation = 0,
): void {
  const glyph = DIGIT_GLYPHS[digit]
  if (!glyph) return
  const width = 5 * cell
  const height = 7 * cell
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.fillStyle = color
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] === '1') {
        ctx.fillRect(col * cell - width / 2, row * cell - height / 2, cell, cell)
      }
    }
  }
  ctx.restore()
}

/** A tumbling-E rendered as a 5×5 block. `rotation` in degrees (0/90/180/270). */
export function drawE(
  ctx: CanvasRenderingContext2D,
  size: number,
  color: string,
  rotation = 0,
): void {
  const glyph = [
    '11111',
    '10000',
    '11110',
    '10000',
    '11111',
  ]
  const cell = size / 5
  ctx.save()
  ctx.translate(size / 2, size / 2)
  ctx.rotate((rotation * Math.PI) / 180)
  ctx.fillStyle = color
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      if (glyph[row][col] === '1') {
        ctx.fillRect(col * cell - size / 2, row * cell - size / 2, cell, cell)
      }
    }
  }
  ctx.restore()
}
