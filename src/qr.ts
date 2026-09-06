const QR_SIZE = 33;
const DATA_CODEWORDS = 80;
const ECC_CODEWORDS = 20;
const FORMAT_GENERATOR = 0x537;
const FORMAT_MASK = 0x5412;

export function makeQrCode(value: string): boolean[][] {
  const data = encodeData(value);
  const matrix = Array.from({ length: QR_SIZE }, () => Array<boolean | null>(QR_SIZE).fill(null));

  drawFinder(matrix, 0, 0);
  drawFinder(matrix, QR_SIZE - 7, 0);
  drawFinder(matrix, 0, QR_SIZE - 7);
  drawAlignment(matrix, 26, 26);
  drawTiming(matrix);
  reserveFormatAreas(matrix);
  placeData(matrix, data);
  writeFormatBits(matrix);

  return matrix.map((row) => row.map((module) => module ?? false));
}

function encodeData(value: string): number[] {
  const bytes = new TextEncoder().encode(value);
  const bits: number[] = [0, 1, 0, 0];
  appendBits(bits, bytes.length, 8);
  bytes.forEach((byte) => appendBits(bits, byte, 8));
  for (let index = 0; index < Math.min(4, DATA_CODEWORDS * 8 - bits.length); index += 1) bits.push(0);
  while (bits.length % 8 !== 0) bits.push(0);

  const dataCodewords: number[] = [];
  for (let index = 0; index < bits.length; index += 8) dataCodewords.push(bitsToByte(bits.slice(index, index + 8)));
  let pad = 0;
  while (dataCodewords.length < DATA_CODEWORDS) {
    dataCodewords.push(pad % 2 === 0 ? 0xec : 0x11);
    pad += 1;
  }

  return [...dataCodewords, ...reedSolomon(dataCodewords, ECC_CODEWORDS)];
}

function appendBits(target: number[], value: number, length: number) {
  for (let shift = length - 1; shift >= 0; shift -= 1) target.push((value >>> shift) & 1);
}

function bitsToByte(bits: number[]) {
  return bits.reduce((value, bit) => (value << 1) | bit, 0);
}

function reedSolomon(data: number[], degree: number): number[] {
  const generator = reedSolomonGenerator(degree);
  const remainder = Array(degree).fill(0) as number[];
  data.forEach((value) => {
    const factor = value ^ remainder[0];
    remainder.shift();
    remainder.push(0);
    generator.slice(1).forEach((coefficient, index) => {
      remainder[index] ^= multiply(coefficient, factor);
    });
  });
  return remainder;
}

function reedSolomonGenerator(degree: number): number[] {
  let generator = [1];
  for (let index = 0; index < degree; index += 1) {
    const next = Array(generator.length + 1).fill(0) as number[];
    generator.forEach((coefficient, coefficientIndex) => {
      next[coefficientIndex] ^= coefficient;
      next[coefficientIndex + 1] ^= multiply(coefficient, exponent(2, index));
    });
    generator = next;
  }
  return generator;
}

function exponent(value: number, power: number) {
  let result = 1;
  for (let index = 0; index < power; index += 1) result = multiply(result, value);
  return result;
}

function multiply(left: number, right: number) {
  let result = 0;
  let first = left;
  let second = right;
  while (second > 0) {
    if ((second & 1) !== 0) result ^= first;
    first <<= 1;
    if ((first & 0x100) !== 0) first ^= 0x11d;
    second >>>= 1;
  }
  return result;
}

function drawFinder(matrix: Array<Array<boolean | null>>, left: number, top: number) {
  for (let y = -1; y <= 7; y += 1) {
    for (let x = -1; x <= 7; x += 1) {
      const row = top + y;
      const column = left + x;
      if (row < 0 || row >= QR_SIZE || column < 0 || column >= QR_SIZE) continue;
      const dark = x >= 0 && x <= 6 && y >= 0 && y <= 6
        && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4));
      matrix[row][column] = dark;
    }
  }
}

function drawAlignment(matrix: Array<Array<boolean | null>>, centerX: number, centerY: number) {
  for (let y = -2; y <= 2; y += 1) {
    for (let x = -2; x <= 2; x += 1) {
      matrix[centerY + y][centerX + x] = Math.max(Math.abs(x), Math.abs(y)) !== 1;
    }
  }
}

function drawTiming(matrix: Array<Array<boolean | null>>) {
  for (let index = 8; index < QR_SIZE - 8; index += 1) {
    if (matrix[6][index] === null) matrix[6][index] = index % 2 === 0;
    if (matrix[index][6] === null) matrix[index][6] = index % 2 === 0;
  }
}

function reserveFormatAreas(matrix: Array<Array<boolean | null>>) {
  for (let index = 0; index < 9; index += 1) {
    if (matrix[index][8] === null) matrix[index][8] = false;
    if (matrix[8][index] === null) matrix[8][index] = false;
  }
  for (let index = 0; index < 8; index += 1) matrix[8][QR_SIZE - 1 - index] = false;
  for (let index = 8; index < 15; index += 1) matrix[QR_SIZE - 15 + index][8] = false;
  matrix[QR_SIZE - 8][8] = true;
}

function placeData(matrix: Array<Array<boolean | null>>, codewords: number[]) {
  const bits = codewords.flatMap((codeword) => Array.from({ length: 8 }, (_, shift) => (codeword >>> (7 - shift)) & 1));
  let bitIndex = 0;
  let upward = true;
  for (let right = QR_SIZE - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let offset = 0; offset < QR_SIZE; offset += 1) {
      const row = upward ? QR_SIZE - 1 - offset : offset;
      for (let side = 0; side < 2; side += 1) {
        const column = right - side;
        if (matrix[row][column] !== null) continue;
        const rawBit = bitIndex < bits.length ? bits[bitIndex] : 0;
        bitIndex += 1;
        const maskedBit = (row + column) % 2 === 0 ? rawBit ^ 1 : rawBit;
        matrix[row][column] = maskedBit === 1;
      }
    }
    upward = !upward;
  }
}

function writeFormatBits(matrix: Array<Array<boolean | null>>) {
  const formatData = 0b01000;
  let remainder = formatData << 10;
  while (bitLength(remainder) >= bitLength(FORMAT_GENERATOR)) {
    remainder ^= FORMAT_GENERATOR << (bitLength(remainder) - bitLength(FORMAT_GENERATOR));
  }
  const bits = ((formatData << 10) | remainder) ^ FORMAT_MASK;
  for (let index = 0; index < 15; index += 1) {
    const bit = ((bits >>> index) & 1) !== 0;
    if (index < 6) matrix[index][8] = bit;
    else if (index < 8) matrix[index + 1][8] = bit;
    else matrix[8][QR_SIZE - 15 + index] = bit;

    if (index < 8) matrix[8][QR_SIZE - 1 - index] = bit;
    else matrix[QR_SIZE - 15 + index][8] = bit;
  }
  matrix[QR_SIZE - 8][8] = true;
}

function bitLength(value: number) {
  let length = 0;
  while (value > 0) {
    length += 1;
    value >>>= 1;
  }
  return length;
}
