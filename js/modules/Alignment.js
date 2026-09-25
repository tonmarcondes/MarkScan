import { detectSolid, markerCorners } from './SolidReferences.js';
import AR from '../vendor/aruco.js';

/** Solve a projective map from paired points; normalized inputs keep the solve well conditioned. */
export function homography(from, to) {
  const equations = [], values = [];
  from.forEach(([u, v], i) => {
    const [x, y] = to[i];
    equations.push([u, v, 1, 0, 0, 0, -x * u, -x * v], [0, 0, 0, u, v, 1, -y * u, -y * v]);
    values.push(x, y);
  });
  const m = Array.from({ length: 8 }, (_, i) => Array.from({ length: 9 }, (_, j) =>
    equations.reduce((sum, row, k) => sum + row[i] * (j === 8 ? values[k] : row[j]), 0)));
  for (let i = 0; i < 8; i++) {
    let pivot = i;
    for (let j = i + 1; j < 8; j++) if (Math.abs(m[j][i]) > Math.abs(m[pivot][i])) pivot = j;
    if (Math.abs(m[pivot][i]) < 1e-10) throw new Error('Referências sem geometria suficiente para alinhar a folha.');
    [m[i], m[pivot]] = [m[pivot], m[i]];
    const divisor = m[i][i]; for (let k = i; k <= 8; k++) m[i][k] /= divisor;
    for (let j = 0; j < 8; j++) if (j !== i) {
      const factor = m[j][i]; for (let k = i; k <= 8; k++) m[j][k] -= factor * m[i][k];
    }
  }
  return [...m.map(row => row[8]), 1];
}

export function project(matrix, x, y) {
  const divisor = matrix[6] * x + matrix[7] * y + 1;
  if (Math.abs(divisor) < 1e-8) return [NaN, NaN];
  return [(matrix[0] * x + matrix[1] * y + matrix[2]) / divisor,
    (matrix[3] * x + matrix[4] * y + matrix[5]) / divisor];
}

export function warpImage(source, matrix, width, height) {
  const output = new ImageData(width, height), src = source.data, dst = output.data;
  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width, d = matrix[6] * u + matrix[7] * v + 1;
      const sx = (matrix[0] * u + matrix[1] * v + matrix[2]) / d * source.width;
      const sy = (matrix[3] * u + matrix[4] * v + matrix[5]) / d * source.height;
      const offset = (y * width + x) * 4;
      dst[offset + 3] = 255;
      if (!Number.isFinite(sx) || sx < 0 || sy < 0 || sx >= source.width - 1 || sy >= source.height - 1) {
        dst[offset] = dst[offset + 1] = dst[offset + 2] = 255; continue;
      }
      const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0;
      const i = (y0 * source.width + x0) * 4;
      for (let c = 0; c < 3; c++) dst[offset + c] =
        (src[i + c] * (1 - fx) + src[i + 4 + c] * fx) * (1 - fy) +
        (src[i + source.width * 4 + c] * (1 - fx) + src[i + source.width * 4 + 4 + c] * fx) * fy;
    }
  }
  return output;
}

const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export default class Alignment {
  constructor() { this.detector = new AR.Detector(); }

  align(image, definition, {preview=false} = {}) {
    const solid = definition.type === 'solid-v1';
    const detected = solid ? detectSolid(image, definition, this.detector) : this.detector.detect(image);
    const matches = definition.markers.map(expected => detected.filter(marker => marker.id === expected.id));
    if (matches.some(markers => markers.length > 1)) throw new Error('Há referências repetidas. Mostre somente uma folha por vez.');
    const found = matches.filter(markers => markers.length === 1).length;
    if (found !== 4) {
      const other = detected.some(marker => !definition.markers.some(expected => expected.id === marker.id));
      throw new Error(other ? `Referências de outra folha ou incompletas (${found}/4). Confira o gabarito selecionado.` : `Referências visíveis: ${found}/4. Mostre os quatro cantos e aproxime a folha.`);
    }
    const from = [], to = [], sizes = [];
    definition.markers.forEach((expected, i) => {
      const corners = matches[i][0].corners.map(({ x, y }) => [x, y]);
      const size = Math.min(...corners.map((point, j) => distance(point, corners[(j + 1) % 4])));
      sizes.push(size);
      if (size < (solid ? 3 : 21)) throw new Error('Aproxime a folha: as marcas de referência estão pequenas demais.');
      const r = definition.markerSize / 2;
      const canonical = solid ? markerCorners(expected) : [[expected.x - r, expected.y - r], [expected.x + r, expected.y - r],
        [expected.x + r, expected.y + r], [expected.x - r, expected.y + r]];
      canonical.forEach((point, j) => {
        from.push([point[0] / definition.width, point[1] / definition.height]);
        to.push([corners[j][0] / image.width, corners[j][1] / image.height]);
      });
    });
    const matrix = homography(from, to);
    const errors = from.map((point, i) => {
      const estimated = project(matrix, ...point);
      return Math.hypot((estimated[0] - to[i][0]) * image.width, (estimated[1] - to[i][1]) * image.height);
    });
    const error = Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length);
    if (!Number.isFinite(error) || error > Math.max(solid ? 1.5 : 2, Math.min(...sizes) * .09) || Math.max(...errors) > (solid ? 2.5 : Math.min(...sizes) * .2)) {
      throw new Error('As referências não formam uma folha plana. Reduza a inclinação, alise a folha e melhore a iluminação.');
    }
    const quad = [[0, 0], [1, 0], [1, 1], [0, 1]].map(point => project(matrix, ...point));
    if (quad.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y) || x < -.015 || y < -.015 || x > 1.015 || y > 1.015)) {
      throw new Error('A folha está cortada. Afaste um pouco a câmera para incluir toda a página.');
    }
    const cross = quad.map((p, i) => {
      const q = quad[(i + 1) % 4], r = quad[(i + 2) % 4];
      return (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
    });
    if (cross.some(value => value <= .008)) throw new Error('Perspectiva excessiva ou folha espelhada. Posicione a câmera mais de frente.');
    const top = [quad[1][0] - quad[0][0], (quad[1][1] - quad[0][1]) * image.height / image.width];
    const rotation = ((Math.round(Math.atan2(top[1], top[0]) * 180 / Math.PI) % 360) + 360) % 360;
    return { image: preview ? null : warpImage(image, matrix, definition.width, definition.height),
      metadata: { type: definition.type, matrix, quad, rotation, reprojectionError: Number(error.toFixed(2)), markerIds: definition.markers.map(marker => marker.id), sourceSize: { width: image.width, height: image.height } } };
  }
}
