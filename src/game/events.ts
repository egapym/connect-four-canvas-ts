/**
 * イベントを管理
 */

import { Render } from './render';
import { Rules } from './rules';
import { Board } from './board';
import { Myself } from './players';
import { Game } from './game';
import { MainPVP } from './main';

export class Events {
  static lastMouseOverCol = -1;
  static isOutsideBoard = true;

  static isSelectedBoard(mouseX: number, mouseY: number): boolean {
    if (mouseX >= Rules.getRulesInfo().verticalSpace
      && mouseX <= Rules.getRulesInfo().verticalSpace + Rules.getRulesInfo().boardSize.width
      && mouseY >= Rules.getRulesInfo().sideSpace
      && mouseY <= Rules.getRulesInfo().sideSpace + Rules.getRulesInfo().boardSize.height) {
      return true;
    }
    return false;
  }

  static getMouseOverColInBoard(
    mouseX: number): number {
    const rulesInfo = Rules.getRulesInfo();
    const x = mouseX === rulesInfo.verticalSpace + rulesInfo.boardSize.width ? mouseX - 1 : mouseX;
    return Math.floor((x - rulesInfo.verticalSpace) / rulesInfo.cellSize);
  }

  static setTouchEvent() {
    const stage = Render.getStage();
    if (createjs.Touch.isSupported()) {
      createjs.Touch.enable(stage);
    }
  }

  static setMouseEventsPVC() {
    const stage = Render.getStage();
    stage.addEventListener('stagemousemove', this.onMouseOverPVC);
    stage.addEventListener('stagemouseup', this.onMouseClickPVC);
  }

  static setMouseEventsPVP() {
    const stage = Render.getStage();
    stage.addEventListener('stagemousemove', this.onMouseOverPVP);
    stage.addEventListener('stagemouseup', this.onMouseClickPVP);
  }

  static removeMouseEvents() {
    const stage = Render.getStage();
    stage.removeAllEventListeners();
  }

  static onMouseClickPVC() {
    if (!Events.isSelectedBoard(Render.getStage().mouseX, Render.getStage().mouseY)) {
      return;
    }
    const selectedCol = Events.getMouseOverColInBoard(Render.getStage().mouseX);
    if (Board.isCeilingForSelectedCol(selectedCol)) {
      return;
    }
    Events.removeMouseEvents();
    document.body.style.cursor = '';
    $('#restart').prop('disabled', true);
    const game = new Game();
    game.putPieceOnBoardPVC(selectedCol);
  }

  static onMouseClickPVP() {
    if (!Events.isSelectedBoard(Render.getStage().mouseX, Render.getStage().mouseY)) {
      return;
    }
    const selectedCol = Events.getMouseOverColInBoard(Render.getStage().mouseX);
    if (Board.isCeilingForSelectedCol(selectedCol)) {
      return;
    }
    Events.removeMouseEvents();
    document.body.style.cursor = '';
    const game = new Game();
    game.putPieceOnBoardPVP(selectedCol);
    const gameIO = MainPVP.getGameIO();
    gameIO.emit('putPiece', selectedCol);
  }

  static onMouseOverPVC() {
    const render = new Render();
    const mouseOverCol = Events.getMouseOverColInBoard(Render.getStage().mouseX);
    render.removeBoardForMouseOverCol();
    if (!Events.isSelectedBoard(Render.getStage().mouseX, Render.getStage().mouseY)) {
      document.body.style.cursor = '';
      checkOutsideBoard();
      return;
    }
    Events.lastMouseOverCol = Events.getMouseOverColInBoard(Render.getStage().mouseX);
    if (Board.isCeilingForSelectedCol(Events.lastMouseOverCol)) {
      document.body.style.cursor = '';
      checkOutsideBoard();
      return;
    }
    document.body.style.cursor = 'pointer';
    render.createBoardForMouseOverCol(
      mouseOverCol,
      Board.getBoardInfo().mapHeight[mouseOverCol],
      Myself.getPlayerInfo().pieceImage,
    );
    if (mouseOverCol !== Events.lastMouseOverCol) {
      Events.lastMouseOverCol = mouseOverCol;
      Events.isOutsideBoard = false;
    }

    function checkOutsideBoard() {
      if ((Events.lastMouseOverCol < 0
        || Events.lastMouseOverCol < Rules.getRulesInfo().cellSize - 1)
        && !Events.isOutsideBoard) {
        Events.isOutsideBoard = true;
        Events.lastMouseOverCol = -1;
      }
    }
  }

  static onMouseOverPVP() {
    const gameIO = MainPVP.getGameIO();
    const render = new Render();
    const mouseOverCol = Events.getMouseOverColInBoard(Render.getStage().mouseX);
    render.removeBoardForMouseOverCol();
    if (!Events.isSelectedBoard(Render.getStage().mouseX, Render.getStage().mouseY)) {
      document.body.style.cursor = '';
      checkOutsideBoard();
      return;
    }
    if (Board.isCeilingForSelectedCol(mouseOverCol)) {
      document.body.style.cursor = '';
      checkOutsideBoard();
      return;
    }
    document.body.style.cursor = 'pointer';
    render.createBoardForMouseOverCol(
      mouseOverCol,
      Board.getBoardInfo().mapHeight[mouseOverCol],
      Myself.getPlayerInfo().pieceImage,
    );
    if (mouseOverCol !== Events.lastMouseOverCol) {
      gameIO.emit('onMouseOver', mouseOverCol);
      Events.lastMouseOverCol = mouseOverCol;
      Events.isOutsideBoard = false;
    }

    function checkOutsideBoard() {
      if ((Events.lastMouseOverCol < 0
        || Events.lastMouseOverCol < Rules.getRulesInfo().cellSize - 1)
        && !Events.isOutsideBoard) {
        gameIO.emit('onMouseOut');
        Events.isOutsideBoard = true;
        Events.lastMouseOverCol = -1;
      }
    }
  }
}
