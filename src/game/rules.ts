/**
 * ゲームルールを管理
 */

import { Board } from './board';
import { Render } from './render';
import { PlayersBase } from './players';
import { AI } from './ai';

export class RulesInfo {
  debug = false;
  canvasSize = {
    width: 1000,
    height: 600,
  };
  boardSize = {
    width: this.canvasSize.width / 2,
    height: this.canvasSize.width / 2,
  };
  colSize = 8;
  cellSize = this.boardSize.width / this.colSize;
  verticalSpace = (this.canvasSize.width - this.boardSize.width) / 2;
  sideSpace = (this.canvasSize.height - this.boardSize.height) / 2;
  line = 4;
  playoutNumber = 35000;
  playoutThreshold = Math.ceil(this.playoutNumber * 0.004);
}

export class Rules {
  static rulesInfo: RulesInfo;

  static getRulesInfo(): RulesInfo {
    return Rules.rulesInfo;
  }

  public getRulesInfo(): RulesInfo {
    return Rules.rulesInfo;
  }

  public initialize() {
    Rules.rulesInfo = new RulesInfo();
    const colSize = Number(sessionStorage.getItem('colSize'));
    this.setColSize(isFinite(colSize) ? colSize : 8);
    const line = Number(sessionStorage.getItem('line'));
    this.setLine(isFinite(line) ? line : 4);
    this.setCellSize(Rules.rulesInfo.boardSize.width / Rules.rulesInfo.colSize);
  }

  public setColSize(colSize: number) {
    Rules.rulesInfo.colSize = colSize;
  }

  public setLine(line: number) {
    Rules.rulesInfo.line = line;
  }

  public setCellSize(cellSize: number) {
    Rules.rulesInfo.cellSize = cellSize;
  }

  public setPlayoutNumber(playoutNumber: number) {
    Rules.rulesInfo.playoutNumber = playoutNumber;
  }

  public setPlayoutThreshold(playoutThreshold: number) {
    Rules.rulesInfo.playoutThreshold = playoutThreshold;
  }

  public isGameFinishedPVC(player: PlayersBase): boolean {
    const render = new Render();
    if ((this.isWin(render, player) || this.isDraw(render))) {
      render.updateVictoryCount();
      return true;
    }
    return false;
  }

  public isGameFinishedPVP(player: PlayersBase): boolean {
    const render = new Render();
    if ((this.isWin(render, player) || this.isDraw(render))) {
      render.updateVictoryCount();
      $('#restart').fadeIn();
      return true;
    }
    return false;
  }

  /** 判定と描画 */
  private isWin(render: Render, player: PlayersBase): boolean {
    if (AI.isLine(player.getXY().x, player.getXY().y - 1, player.getPlayerInfo().turn)) {
      player.win();
      const lines = AI.getLine(player.getXY().x, player.getXY().y - 1, player.getPlayerInfo().turn);
      render.createBoardPiecesForLine(lines);
      return true;
    }
    return false;
  }

  /** 判定と描画 */
  private isDraw(render: Render): boolean {
    const boardInfo = new Board().getBoardInfo();
    // boardInfo.gameRecord.lengthは colSize * colSize + 1 となる。1は先手のプレイヤー情報
    if (boardInfo.gameRecord.length >= Rules.getRulesInfo().colSize ** 2 + 1) {
      render.createPlayersInfoForGameDraw();
      return true;
    }
    return false;
  }
}
