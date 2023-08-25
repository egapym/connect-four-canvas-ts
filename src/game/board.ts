
/**
 * ゲーム盤面を管理
 */

import { Rules } from './rules';
import { Game } from './game';

export class BoardInfo {
  map: number[][] = [];
  mapHeight: number[] = [];
  gameRecord: (number | string)[] = [];
}

export class Board {
  static boardInfo = new BoardInfo();

  static getBoardInfo(): BoardInfo {
    return Board.boardInfo;
  }

  public getBoardInfo(): BoardInfo {
    return Board.boardInfo;
  }

  static isCeilingForSelectedCol(x: number): boolean {
    return this.getBoardInfo().mapHeight[x] === Rules.getRulesInfo().colSize;
  }

  public initialize() {
    Board.boardInfo = new BoardInfo();
    const rulesInfo = Rules.getRulesInfo();
    const colArr = [];
    for (let col = 0; col < rulesInfo.colSize; col++) {
      colArr.push(0);
    }
    for (let col = 0; col < rulesInfo.colSize; col++) {
      Board.boardInfo.map.push(Object.assign({}, colArr));
      Board.boardInfo.mapHeight.push(0);
    }
  }

  public updateGameRecordFromInitialSetteing(gameRecordStr: string) {
    this.getBoardInfo().gameRecord = gameRecordStr.split(',').map(hand => {
      return isFinite(Number(hand)) ? Number(hand) : hand;
    });
  }
}
