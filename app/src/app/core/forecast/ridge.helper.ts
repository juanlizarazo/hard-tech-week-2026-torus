import { IRidgeGram } from './ridge.interfaces';

export class RidgeHelper {
  public static gram(featureRows: number[][], targets: number[]): IRidgeGram {
    const columnCount = featureRows.length > 0 ? featureRows[0].length + 1 : 1;
    const xtx: number[][] = Array.from({ length: columnCount }, () => new Array(columnCount).fill(0));
    const xty = new Array(columnCount).fill(0);

    for (let rowIndex = 0; rowIndex < featureRows.length; rowIndex++) {
      const row = [1, ...featureRows[rowIndex]];
      const target = targets[rowIndex];

      for (let i = 0; i < columnCount; i++) {
        xty[i] += row[i] * target;

        for (let j = 0; j < columnCount; j++) {
          xtx[i][j] += row[i] * row[j];
        }
      }
    }

    return { xtx, xty, n: featureRows.length };
  }

  public static addGrams(first: IRidgeGram, second: IRidgeGram, sign: 1 | -1 = 1): IRidgeGram {
    const columnCount = first.xtx.length;
    const xtx = Array.from({ length: columnCount }, (_unused, i) =>
      Array.from({ length: columnCount }, (_unusedColumn, j) => first.xtx[i][j] + sign * second.xtx[i][j]),
    );
    const xty = first.xty.map((value, index) => value + sign * second.xty[index]);

    return { xtx, xty, n: first.n + sign * second.n };
  }

  public static solve(gram: IRidgeGram, lambda: number): number[] {
    const columnCount = gram.xtx.length;
    const penalized = gram.xtx.map((row, i) => row.map((value, j) => value + (i === j && i > 0 ? lambda : 0)));

    return RidgeHelper._choleskySolve(penalized, gram.xty, columnCount);
  }

  public static predict(beta: number[], featureRow: number[]): number {
    let prediction = beta[0];

    for (let index = 0; index < featureRow.length; index++) {
      prediction += beta[index + 1] * featureRow[index];
    }

    return prediction;
  }

  private static _choleskySolve(matrix: number[][], vector: number[], size: number): number[] {
    const lower: number[][] = Array.from({ length: size }, () => new Array(size).fill(0));

    for (let i = 0; i < size; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = matrix[i][j];

        for (let k = 0; k < j; k++) {
          sum -= lower[i][k] * lower[j][k];
        }

        if (i === j) {
          lower[i][j] = Math.sqrt(Math.max(sum, 1e-12));
        } else {
          lower[i][j] = sum / lower[j][j];
        }
      }
    }

    const intermediate = new Array(size).fill(0);

    for (let i = 0; i < size; i++) {
      let sum = vector[i];

      for (let k = 0; k < i; k++) {
        sum -= lower[i][k] * intermediate[k];
      }

      intermediate[i] = sum / lower[i][i];
    }

    const solution = new Array(size).fill(0);

    for (let i = size - 1; i >= 0; i--) {
      let sum = intermediate[i];

      for (let k = i + 1; k < size; k++) {
        sum -= lower[k][i] * solution[k];
      }

      solution[i] = sum / lower[i][i];
    }

    return solution;
  }
}
