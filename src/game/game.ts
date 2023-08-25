/**
 * ゲームの進行関連を管理
 */

import { Render } from './render';
import { Rules } from './rules';
import { Events } from './events';
import { Myself, Rival } from './players';
import { Board } from './board';
import { AI } from './ai';

export class GameInfo {
  currentTurn: number = 0; // 1:自分 -1:相手
}

export class Game {
  static gameInfo = new GameInfo;

  static getGameInfo(): GameInfo {
    return Game.gameInfo;
  }

  public getGameInfo(): GameInfo {
    return Game.gameInfo;
  }

  public setCurrentTurn(currentTurn: number) {
    Game.gameInfo.currentTurn = currentTurn;
  }

  public async initializePVC() {
    Events.removeMouseEvents();
    Events.setTouchEvent();
    $('#restart').prop('disabled', true);

    let myself = new Myself();
    let rival = new Rival();
    const render = new Render();
    const rules = new Rules();
    const board = new Board();

    myself.initialize();
    rival.initialize();
    rules.initialize();
    board.initialize();
    myself = new Myself();
    rival = new Rival();
    this.initialSettingPVC(rules, myself, rival, board);
    render.initializePVC();

    // const gameRecordStr = 'm,'
    //   + '0,0,0,0,0,0,0,0,0,0,0,0,'
    //   + '1,1,1,1,1,1,1,1,1,1,1,1,'
    //   + '2,2,2,2,2,2,2,2,2,2,2,2,'
    //   + '3,3,3,3,3,3,3,3,3,3,3,3,'
    //   + '4,4,4,4,4,4,4,4,4,4,4,4,'
    //   + '5,5,5,5,5,5,5,5,5,5,5,5,'
    //   + '6,6,6,6,6,6,6,6,6,6,6,6,'
    //   + '7,7,7,7,7,7,7,7,7,7,7,7,'
    //   + '8,8,8,8,8,8,8,8,8,8,8,8,'
    //   + '9,9,9,9,9,9,9,9,9,9,9,9,'
    //   + '10,10,10,10,10,10,10,10,10,10,10,10,'
    //   + '11,11,11,11,11,11,11,11,11,11';

    // const gameRecordStr = 'm,2,3,2,4,5,4,4,5,5,5,2,2,3,3,3,7,4,4,3,5,7,5,5,4,3,3';
    const gameRecordStr = '';

    if (gameRecordStr) {
      this.updateBoardFromInitialSetteing(gameRecordStr, myself, rival, render, board);
    }

    await render.createGameEffectForGameStartWithAnimation();

    if (Game.gameInfo.currentTurn === 1) {
      render.createPlayersInfoForMyselfCurrentTurn();
      Events.setMouseEventsPVC();
      return;
    }

    this.putPieceOnBoardPVC(-1);
  }

  public async initializePVP() {
    Events.removeMouseEvents();
    Events.setTouchEvent();
    $('#restart').hide();

    let myself = new Myself();
    let rival = new Rival();
    const render = new Render();
    const rules = new Rules();
    const board = new Board();

    rules.initialize();
    myself.initialize();
    rival.initialize();
    board.initialize();
    myself = new Myself();
    rival = new Rival();
    this.initialSettingPVP(rules, myself, rival, board);
    render.initializePVP();

    if (sessionStorage.getItem('status') !== 'matching') {
      return;
    }
    sessionStorage.setItem('status', 'playing');

    await render.createGameEffectForGameStartWithAnimation();

    if (Game.gameInfo.currentTurn === 1) {
      render.createPlayersInfoForMyselfCurrentTurn();
      Events.setMouseEventsPVP();
    } else {
      render.createPlayersInfoForRivalCurrentTurn();
    }
  }

  public async putPieceOnBoardPVC(selectedX: number) {
    const render = new Render();
    render.removeBoardForMouseOverCol();

    const rules = new Rules();
    const myself = new Myself();
    const rival = new Rival();

    switch (Game.gameInfo.currentTurn) {
      case 1: // 自分
        myself.setSelectedX(selectedX);
        await myself.putPieceOnBoard(myself.getXY().x);
        if (rules.isGameFinishedPVC(myself)) break;
        render.createPlayersInfoForRivalCurrentTurn();
        // rival.setSelectedX(0);
        rival.setSelectedX(await rival.thinkNextHand());
        await rival.putPieceOnBoard(rival.getXY().x);
        if (rules.isGameFinishedPVC(rival)) break;
        render.createPlayersInfoForMyselfCurrentTurn();
        Events.setMouseEventsPVC();
        break;
      case -1: // 相手
        render.createPlayersInfoForRivalCurrentTurn();
        rival.setSelectedX(await rival.thinkNextHand());
        await rival.putPieceOnBoard(rival.getXY().x);
        if (rules.isGameFinishedPVC(rival)) break;
        render.createPlayersInfoForMyselfCurrentTurn();
        Events.setMouseEventsPVC();
        break;
      default:
        throw new Error('ゲーム情報が不正です。');
    }

    $('#restart').prop('disabled', false);
  }

  public async putPieceOnBoardPVP(selectedX: number) {
    const render = new Render();
    render.removeBoardForMouseOverCol();
    render.removeAllplayersCurrentTurn();
    const rules = new Rules();
    const myself = new Myself();
    const rival = new Rival();

    switch (Game.gameInfo.currentTurn) {
      case 1: // 自分
        myself.setSelectedX(selectedX);
        await myself.putPieceOnBoard(myself.getXY().x);
        if (rules.isGameFinishedPVP(myself)) break;
        render.createPlayersInfoForRivalCurrentTurn();
        break;
      case -1: // 相手
        render.createPlayersInfoForRivalCurrentTurn();
        rival.setSelectedX(selectedX);
        await rival.putPieceOnBoard(rival.getXY().x);
        if (rules.isGameFinishedPVP(rival)) break;
        render.createPlayersInfoForMyselfCurrentTurn();
        Events.setMouseEventsPVP();
        break;
      default:
        throw new Error('ゲーム情報が不正です。');
    }
  }

  public changeCurrentTurn() {
    Game.gameInfo.currentTurn = Game.gameInfo.currentTurn * -1;
  }

  public returnBoard() {
    const render = new Render();
    const boardInfo = Board.getBoardInfo();
    if (boardInfo.gameRecord.length <= 2) return;
    for (let index = 0; index < 2; index++) {
      render.removeBoardPiece(boardInfo.gameRecord.length - 2);
      boardInfo.map[boardInfo.mapHeight[Number(boardInfo.gameRecord[boardInfo.gameRecord.length - 1])] - 1]
      [Number(boardInfo.gameRecord[boardInfo.gameRecord.length - 1])] = 0;
      boardInfo.mapHeight[Number(boardInfo.gameRecord[boardInfo.gameRecord.length - 1])] -= 1;
      boardInfo.gameRecord.pop();
    }
  }

  private initialSettingPVC(rules: Rules, myself: Myself, rival: Rival, board: Board) {
    myself.setName(sessionStorage.getItem('myselfName') || '名無しさん');
    myself.setSelfImage(new createjs.Bitmap('./assets/image/player_images/myself.png'));
    myself.setPieceImage(new createjs.Bitmap(sessionStorage.getItem('myselfPieceImage') || ''));
    myself.setIsFirst(sessionStorage.getItem('myselfIsFirst') === 'true' ? true : false);
    rival.setName(sessionStorage.getItem('rivalName') || '名無しさん');
    rival.setSelfImage(new createjs.Bitmap('./assets/image/player_images/robo.png'));
    rival.setPieceImage(new createjs.Bitmap(sessionStorage.getItem('rivalPieceImage') || ''));
    rival.setIsFirst(sessionStorage.getItem('myselfIsFirst') === 'true' ? false : true);
    const boardInfo = board.getBoardInfo();
    boardInfo.gameRecord.push(myself.getPlayerInfo().isFirst ? 'm' : 'r');
    this.setCurrentTurn(myself.getPlayerInfo().isFirst ? 1 : -1);
  }

  private initialSettingPVP(rules: Rules, myself: Myself, rival: Rival, board: Board) {
    myself.setName(sessionStorage.getItem('myselfName') || '名無しさん');
    myself.setSelfImage(new createjs.Bitmap('./assets/image/player_images/myself.png'));
    myself.setPieceImage(new createjs.Bitmap(sessionStorage.getItem('myselfPieceImage') || ''));
    myself.setIsFirst(sessionStorage.getItem('myselfIsFirst') === 'true' ? true : false);
    rival.setName(sessionStorage.getItem('rivalName') || '名無しさん');
    rival.setSelfImage(new createjs.Bitmap('./assets/image/player_images/myself.png'));
    rival.setPieceImage(new createjs.Bitmap(sessionStorage.getItem('rivalPieceImage') || ''));
    rival.setIsFirst(sessionStorage.getItem('myselfIsFirst') === 'true' ? false : true);
    const boardInfo = board.getBoardInfo();
    boardInfo.gameRecord.push(myself.getPlayerInfo().isFirst ? 'm' : 'r');
    this.setCurrentTurn(myself.getPlayerInfo().isFirst ? 1 : -1);
  }

  private updateBoardFromInitialSetteing(
    gameRecordStr: string, myself: Myself, rival: Rival, render: Render, board: Board) {
    const boardInfo = board.getBoardInfo();
    board.updateGameRecordFromInitialSetteing(gameRecordStr);
    myself.setIsFirst(boardInfo.gameRecord[0] === 'm' ? true : false);
    rival.setIsFirst(boardInfo.gameRecord[0] === 'r' ? true : false);
    Game.gameInfo.currentTurn = myself.getPlayerInfo().isFirst ? 1 : -1;
    this.updateBoardPiecesFromInitialSetteing(myself, rival, render, board);
  }

  private updateBoardPiecesFromInitialSetteing(myself: Myself, rival: Rival, render: Render, board: Board) {
    const gameRecord = board.getBoardInfo().gameRecord;
    for (let i = 1; i < gameRecord.length; i++) {
      switch (Game.gameInfo.currentTurn) {
        case 1: // 自分
          AI.putPiece(Number(board.getBoardInfo().gameRecord[i]), myself.getPlayerInfo().turn);
          myself.setSelectedX(Number(gameRecord[i]));
          render.createBoardPiecesWithNoAnimation(
            myself.getXY().x,
            myself.getXY().y,
            myself.getPlayerInfo().pieceImage);
          break;
        case -1: // 相手
          AI.putPiece(Number(board.getBoardInfo().gameRecord[i]), rival.getPlayerInfo().turn);
          rival.setSelectedX(Number(gameRecord[i]));
          render.createBoardPiecesWithNoAnimation(
            rival.getXY().x,
            rival.getXY().y,
            rival.getPlayerInfo().pieceImage);
          break;
        default:
          throw new Error('ゲーム情報が不正です。');
      }
      this.changeCurrentTurn();
    }
  }
}
