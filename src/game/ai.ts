/**
 * AIを管理
 */

import { Rules } from './rules';
import { Board } from './board';

interface CanPutRange {
  start: number;
  end: number;
}

export class AI {
  static putPiece(x: number, turn: number) {
    Board.boardInfo.map[Board.boardInfo.mapHeight[x]][x] = turn;
    Board.boardInfo.mapHeight[x] += 1;
  }

  static excludePiece(x: number) {
    Board.boardInfo.map[Board.boardInfo.mapHeight[x] - 1][x] = 0;
    Board.boardInfo.mapHeight[x] -= 1;
  }

  static changeCurrentTurn(turn: number): number {
    return turn * -1;
  }

  static getY(x: number): number {
    return Board.boardInfo.mapHeight[x] - 1;
  }

  static getRangeForContinuityReach(x: number): CanPutRange {
    return {
      start: x - (Rules.rulesInfo.line - 1) < 0 ? 0 : x - (Rules.rulesInfo.line - 1),
      end: x + (Rules.rulesInfo.line - 1) > (Rules.rulesInfo.colSize - 1)
        ? (Rules.rulesInfo.colSize - 1) : x + (Rules.rulesInfo.line - 1),
    };
  }

  static getRange(): CanPutRange {
    const boardInfo = Board.getBoardInfo();
    const record1 = Number(boardInfo.gameRecord[boardInfo.gameRecord.length - 1]);
    const record2 = Number(boardInfo.gameRecord[boardInfo.gameRecord.length - 2]);
    const start = record1 < record2 ? record1 : record2;
    const end = record1 < record2 ? record2 : record1;
    return {
      start: start - (Rules.rulesInfo.line - 1) < 0 ? 0 : start - (Rules.rulesInfo.line - 1),
      end: end + (Rules.rulesInfo.line - 1) > (Rules.rulesInfo.colSize - 1)
        ? (Rules.rulesInfo.colSize - 1) : end + (Rules.rulesInfo.line - 1),
    };
  }

  static getLine(x: number, y: number, turn: number): { x: number, y: number }[] {
    let RL = [];
    let RULD = [];
    let LURD = [];
    const UD = [];
    for (let i = -Rules.rulesInfo.line + 1; i <= Rules.rulesInfo.line - 1; i++) {
      if (x + i >= 0 && x + i <= Rules.rulesInfo.colSize - 1) {
        // 左右
        if (Board.boardInfo.map[y][x + i] === turn) {
          RL.push({ x: x + i, y });
          if (RL.length === Rules.rulesInfo.line) return RL;
        } else RL = [];
        // 左下～右上
        if ((y + i >= 0 && y + i <= Rules.rulesInfo.colSize - 1)
          && Board.boardInfo.map[y + i][x + i] === turn) {
          RULD.push({ x: x + i, y: y + i });
          if (RULD.length === Rules.rulesInfo.line) return RULD;
        } else RULD = [];
        // 左上～右下
        if ((y + i * -1 >= 0 && y + i * -1 <= Rules.rulesInfo.colSize - 1)
          && Board.boardInfo.map[y + i * -1][x + i] === turn) {
          LURD.push({ x: x + i, y: y + i * -1 });
          if (LURD.length === Rules.rulesInfo.line) return LURD;
        } else LURD = [];
      }
    }

    if (y - Rules.rulesInfo.line + 1 < 0) return [];

    for (let i = 0; i < Rules.rulesInfo.line; i++) {
      if (Board.boardInfo.map[y - i][x] === turn) {
        UD.push({ x, y: y - i });
        if (UD.length === Rules.rulesInfo.line) return UD;
      } else return [];
    }

    return [];
  }

  static isLine(x: number, y: number, turn: number): boolean {
    let RL = 0;
    let RULD = 0;
    let LURD = 0;
    let UD = 0;
    for (let i = -Rules.rulesInfo.line + 1; i <= Rules.rulesInfo.line - 1; i++) {
      if (x + i >= 0 && x + i <= Rules.rulesInfo.colSize - 1) {
        // 左右
        if (Board.boardInfo.map[y][x + i] === turn) {
          if (RL === Rules.rulesInfo.line - 1) return true;
          RL++;
        } else RL = 0;
        // 左下～右上
        if ((y + i >= 0 && y + i <= Rules.rulesInfo.colSize - 1)
          && Board.boardInfo.map[y + i][x + i] === turn) {
          if (RULD === Rules.rulesInfo.line - 1) return true;
          RULD++;
        } else RULD = 0;
        // 左上～右下
        if ((y + i * -1 >= 0 && y + i * -1 <= Rules.rulesInfo.colSize - 1)
          && Board.boardInfo.map[y + i * -1][x + i] === turn) {
          if (LURD === Rules.rulesInfo.line - 1) return true;
          LURD++;
        } else LURD = 0;
      }
    }

    if (y - Rules.rulesInfo.line + 1 < 0) return false;

    for (let i = 0; i < Rules.rulesInfo.line; i++) {
      if (Board.boardInfo.map[y - i][x] === turn) {
        if (UD === Rules.rulesInfo.line - 1) return true;
        UD++;
      } else return false;
    }
    return false;
  }

  static checkLine(range: CanPutRange, turn: number) {
    for (let x = range.start; x <= range.end; x++) {
      if (Board.isCeilingForSelectedCol(x)) continue;
      this.putPiece(x, turn);
      if (this.isLine(x, this.getY(x), turn)) {
        this.excludePiece(x);
        return x;
      }
      this.excludePiece(x);
    }
    return -1;
  }

  static canPutPieceToSelectedCol(x: number, turn: number): boolean {
    switch (Board.boardInfo.mapHeight[x]) {
      case Rules.rulesInfo.colSize - 1: return true;
      case Rules.rulesInfo.colSize: return false;
      default: break;
    }
    this.putPiece(x, turn);
    this.putPiece(x, -turn);
    if (this.isLine(x, this.getY(x), -turn)) {
      this.excludePiece(x);
      this.excludePiece(x);
      return false; // 空中リーチあり。置けない事が判明
    }
    this.excludePiece(x);
    this.excludePiece(x);
    return true;
  }

  static checkDoubleReach(range: CanPutRange, turn: number): number {
    for (let x = range.start; x <= range.end; x++) {
      if (!this.canPutPieceToSelectedCol(x, turn)) continue;
      this.putPiece(x, turn);
      const resultRange = this.getRange();
      const resultCheckReach = this.checkLine(resultRange, turn);
      if (resultCheckReach === -1) {
        this.excludePiece(x);
        continue;
      }
      if (Board.isCeilingForSelectedCol(resultCheckReach)) {
        this.excludePiece(x);
        continue;
      }
      this.putPiece(resultCheckReach, -turn);
      if (this.checkLine(resultRange, turn) >= 0) {
        this.excludePiece(resultCheckReach);
        this.excludePiece(x);
        return x;
      }
      this.excludePiece(resultCheckReach);
      this.excludePiece(x);
    }
    return -1;
  }

  static checkContinuityReach(range: CanPutRange, turn: number): number {
    for (let x = range.start; x <= range.end; x++) {
      // 既に天井で積めなかった場合
      if (!this.canPutPieceToSelectedCol(x, turn)) continue;
      this.putPiece(x, turn);
      const resultRange1 = this.getRangeForContinuityReach(x);
      const resultCheckReach1 = this.checkLine(resultRange1, turn);
      // CPUがリーチしなかった
      if (resultCheckReach1 === -1) {
        this.excludePiece(x);
        continue;
      }
      // CPUがリーチしたのでプレイヤーが防ぐ
      if (Board.isCeilingForSelectedCol(resultCheckReach1)) {
        this.excludePiece(x);
        continue;
      }
      this.putPiece(resultCheckReach1, -turn);
      // CPUが1手前でプレイヤーのリーチ防ぎ、かつプレイヤーがリーチしている
      if (this.checkLine(resultRange1, turn) >= 0) {
        this.excludePiece(resultCheckReach1);
        this.excludePiece(x);
        return x; // 終了
      }
      const resultRange2 = this.getRangeForContinuityReach(resultCheckReach1);
      const resultCheckDoubleReach = this.checkDoubleReach(resultRange2, -turn);
      // 防いだらプレイヤーがWリーチしてしまった
      if (resultCheckDoubleReach >= 0) {
        this.excludePiece(resultCheckReach1);
        this.excludePiece(x);
        continue;
      }
      const resultCheckReach2 = this.checkLine(resultRange2, -turn);
      // 防いだらプレイヤーがリーチしてしまった
      if (resultCheckReach2 >= 0) {
        resultRange2.start = resultCheckReach2;
        resultRange2.end = resultCheckReach2;
      }
      // =============================再帰
      const resultCheckContinuityReach = this.checkContinuityReach(resultRange2, turn);
      // =============================
      this.excludePiece(resultCheckReach1);
      this.excludePiece(x);
      if (resultCheckContinuityReach >= 0) {
        return x;
      }
    }
    return -1;
  }
}
