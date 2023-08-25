/**
 * プレイヤーを管理
 */

import { Render } from './render';
import { Rules } from './rules';
import { Board } from './board';
import { Game } from './game';
import { AI } from './ai';

export class PlayerInfo {
  name: string = '';
  selfImage = new createjs.Bitmap('');
  pieceImage = new createjs.Bitmap('');
  isFirst: boolean = false;
  turn: number = 0;
  messages = {
    thinking: '',
    win: '',
    lose: '',
    draw: '',
  };
  selectedX: number = -1;
}

export abstract class PlayersBase {
  constructor(private playerInfo: PlayerInfo) { }

  public getPlayerInfo(): PlayerInfo {
    return this.playerInfo;
  }

  public setName(name: string) {
    this.playerInfo.name = name;
  }

  public setSelfImage(selfImage: createjs.Bitmap) {
    const render = new Render();
    render.getImageSize(selfImage, Rules.getRulesInfo().cellSize);
    this.playerInfo.selfImage = selfImage;
  }

  public setPieceImage(pieceImage: createjs.Bitmap) {
    const render = new Render();
    render.getImageSize(pieceImage, Rules.getRulesInfo().cellSize);
    this.playerInfo.pieceImage = pieceImage;
  }

  public setIsFirst(isFirst: boolean) {
    this.playerInfo.isFirst = isFirst;
  }

  public setTurn(turn: number) {
    this.playerInfo.turn = turn;
  }

  public setMessages(messages: any) {
    this.playerInfo.messages = messages;
  }

  public setSelectedX(selectedX: number) {
    this.playerInfo.selectedX = selectedX;
  }

  public async putPieceOnBoard(selectedX: number) {
    const board = new Board();
    AI.putPiece(selectedX, this.getPlayerInfo().turn);
    board.getBoardInfo().gameRecord.push(selectedX);
    const render = new Render();
    await render.createBoardPiecesWithAnimation(selectedX, this.getXY().y, this.playerInfo.pieceImage);
    render.removeAllplayersCurrentTurn();
    const game = new Game();
    game.changeCurrentTurn();
  }

  public getXY(): { x: number, y: number } {
    return {
      x: this.playerInfo.selectedX,
      y: Board.getBoardInfo().mapHeight[this.playerInfo.selectedX],
    };
  }

  abstract win(): void;
}

export class Myself extends PlayersBase {
  static playerInfo: PlayerInfo = new PlayerInfo();
  constructor() {
    super(Myself.playerInfo);
    this.setTurn(1);
  }

  static getPlayerInfo(): PlayerInfo {
    return Myself.playerInfo;
  }

  public initialize() {
    Myself.playerInfo = new PlayerInfo();
  }

  public win() {
    const render = new Render();
    render.createPlayersInfoForMyselfWin();
    render.createPlayersInfoForRivalLose();
    const victoryCount = Number(<string>sessionStorage.getItem('victoryCountForMyself')) + 1;
    sessionStorage.setItem('victoryCountForMyself', String(victoryCount));
  }
}

export class Rival extends PlayersBase {
  static playerInfo: PlayerInfo = new PlayerInfo();
  constructor() {
    super(Rival.playerInfo);
    this.setTurn(-1);
  }

  static getPlayerInfo(): PlayerInfo {
    return Rival.playerInfo;
  }

  public initialize() {
    Rival.playerInfo = new PlayerInfo();
  }

  public async thinkNextHand(): Promise<number> {
    return new Promise<number>(resolve => {
      const myself = new Myself();
      const rival = new Rival();
      const rivalRange = AI.getRange();
      const myselfRange = AI.getRange();
      let result;

      result = AI.checkLine(rivalRange, rival.getPlayerInfo().turn);
      if (result >= 0) {
        return resolve(result);
      }

      result = AI.checkLine(myselfRange, myself.getPlayerInfo().turn);
      if (result >= 0) {
        return resolve(result);
      }
      const allRange = {
        start: 0,
        end: Rules.rulesInfo.colSize - 1,
      };
      result = AI.checkContinuityReach(allRange, rival.getPlayerInfo().turn);
      if (result >= 0) {
        return resolve(result);
      }

      const render = new Render();
      const worker = new Worker('worker.js');
      let progressNumber = 0;
      worker.addEventListener('message', message => {
        if (message.data === null) {
          progressNumber++;
          render.updatePlayersInfoForRivalProgress(progressNumber, Rules.getRulesInfo().playoutNumber);
        } else {
          render.removePlayersInfoForRivalProgress();
          console.log(message.data.gameTree);
          return resolve(Number(message.data.bestHand));
        }
      });
      worker.postMessage({
        turn: Game.getGameInfo().currentTurn,
        rivalTurn: Rival.getPlayerInfo().turn,
        playoutNumber: Rules.getRulesInfo().playoutNumber,
        playoutThreshold: Rules.getRulesInfo().playoutThreshold,
        rulesInfo: Rules.getRulesInfo(),
        boardInfo: Board.getBoardInfo(),
      });
    });
  }

  public win() {
    const render = new Render();
    render.createPlayersInfoForRivalWin();
    render.createPlayersInfoForMyselfLose();
    const victoryCount = Number(<string>sessionStorage.getItem('victoryCountForRival')) + 1;
    sessionStorage.setItem('victoryCountForRival', String(victoryCount));
  }
}
