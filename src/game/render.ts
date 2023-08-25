/**
 * 描画処理を管理
 */

import { Rules, RulesInfo } from './rules';
import { Myself, Rival, PlayerInfo } from './players';

interface Containers {
  [name: string]: createjs.Container;
}
interface VictoryCount {
  [name: string]: createjs.Text;
}

export class Render {
  static stage: createjs.Stage = new createjs.Stage('canvas');
  static containers: Containers;
  static progress: createjs.Text;
  static playersVictoryCount: VictoryCount;

  static getStage(): createjs.Stage {
    return Render.stage;
  }

  public async initializePVC() {
    Render.containers = {};
    Render.playersVictoryCount = {};
    const rulesInfo = Rules.getRulesInfo();
    const canvas = <HTMLCanvasElement>Render.stage.canvas;
    canvas.width = rulesInfo.canvasSize.width;
    canvas.height = rulesInfo.canvasSize.height;
    Render.stage.removeAllChildren();
    Render.stage.enableMouseOver();
    createjs.Ticker.init();
    createjs.Ticker.addEventListener('tick', Render.stage);
    createjs.Ticker.timingMode = createjs.Ticker.RAF;

    this.createContainers(Render.stage, Render.containers, rulesInfo);
    this.createBackgroundForBackgroundImage(Render.containers);
    this.createBoard(Render.containers, rulesInfo);
    this.createPlayersInfo(Render.containers, rulesInfo, Myself.getPlayerInfo(), Rival.getPlayerInfo());
  }

  public async initializePVP() {
    Render.containers = {};
    Render.playersVictoryCount = {};
    const rulesInfo = Rules.getRulesInfo();
    const canvas = <HTMLCanvasElement>Render.stage.canvas;
    canvas.width = rulesInfo.canvasSize.width;
    canvas.height = rulesInfo.canvasSize.height;
    Render.stage.removeAllChildren();
    Render.stage.enableMouseOver();
    createjs.Ticker.init();
    createjs.Ticker.addEventListener('tick', Render.stage);
    createjs.Ticker.timingMode = createjs.Ticker.RAF;

    this.createContainers(Render.stage, Render.containers, rulesInfo);
    this.createBackgroundForBackgroundImage(Render.containers);
    this.createBoard(Render.containers, rulesInfo);

    if (sessionStorage.getItem('status') === 'waiting') {
      this.createPlayersInfoPVPForWait(Render.containers, rulesInfo, Myself.getPlayerInfo(), Rival.getPlayerInfo());
    } else {
      this.createPlayersInfo(Render.containers, rulesInfo, Myself.getPlayerInfo(), Rival.getPlayerInfo());
    }
  }

  public createBoardForMouseOverCol(x: number, y: number, pieceImage: createjs.Bitmap) {
    const rulesInfo = Rules.getRulesInfo();
    const mouseOverCol = new createjs.Shape();
    mouseOverCol
      .graphics
      .beginFill('#FFFFFF')
      .drawRect(x * rulesInfo.cellSize, 0, rulesInfo.cellSize, rulesInfo.boardSize.height);
    mouseOverCol.alpha = 0.3;

    const playerPiece = this.createBoardForMyselfSelectedColPiece(pieceImage, rulesInfo, x, y);
    playerPiece.alpha = 0.5;
    Render.containers.boardMouseOverCol.addChild(mouseOverCol, playerPiece);
  }

  public removeBoardForMouseOverCol() {
    Render.containers.boardMouseOverCol.removeAllChildren();
  }

  public async getImageSize(bitmapImage: createjs.Bitmap, oneSide: number): Promise<any> {
    bitmapImage.visible = false;
    return new Promise(resolve => {
      const imageSize = {
        width: 0,
        height: 0,
      };
      const interval = setInterval(
        () => {
          if (bitmapImage.image.width > 0 && bitmapImage.image.height > 0) {
            clearInterval(interval);
            imageSize.width = bitmapImage.image.width;
            imageSize.height = bitmapImage.image.height;
            return resolve(imageSize);
          }
        },
        0,
      );
    })
      .then((imageSize: any) => {
        bitmapImage.scaleX = oneSide / imageSize.width;
        bitmapImage.scaleY = oneSide / imageSize.height;
        bitmapImage.visible = true;
      });
  }

  public removeAllplayersCurrentTurn() {
    Render.containers.playersCurrentTurn.removeAllChildren();
  }

  public createBoardPiecesForLine(lines: { x: number, y: number }[]) {
    const rulesInfo = Rules.getRulesInfo();
    lines.forEach((line) => {
      const x = line.x * rulesInfo.cellSize;
      const y = (rulesInfo.colSize - line.y) * rulesInfo.cellSize;
      const border = new createjs.Shape();
      border.graphics.beginStroke('#FE2E64').setStrokeStyle(3)
        .drawRect(x, y - rulesInfo.cellSize, rulesInfo.cellSize, rulesInfo.cellSize);
      Render.containers.boardPieces.addChild(border);
      const shape = new createjs.Shape();
      shape.alpha = 0.5;
      shape.graphics.beginFill('#FFCFDC')
        .drawRect(x, y - rulesInfo.cellSize, rulesInfo.cellSize, rulesInfo.cellSize);
      Render.containers.boardPieces.addChild(shape);
    });
  }

  public async createBoardPiecesWithAnimation(x: number, y: number, pieceImage: createjs.Bitmap) {
    const rulesInfo = Rules.getRulesInfo();
    const piece = new createjs.Bitmap(pieceImage.image);
    piece.x = x * rulesInfo.cellSize;
    piece.y = -rulesInfo.cellSize;
    const shadow = new createjs.Shadow(
      '#003700', piece.y + rulesInfo.cellSize * 1.03, piece.y + rulesInfo.cellSize * 1.03, 10);
    piece.shadow = shadow;
    await this.getImageSize(piece, rulesInfo.cellSize);
    Render.containers.boardPieces.addChild(piece);
    return new Promise(resolve => {
      createjs.Tween.get(piece)
        .to(
          { y: ((rulesInfo.colSize - (y - 1)) * rulesInfo.cellSize) - rulesInfo.cellSize },
          650,
          createjs.Ease.cubicIn)
        .call(() => {
          this.cacheBoardPiece(piece, rulesInfo);
          createjs.Tween.removeAllTweens();
          return resolve();
        });
    });
  }

  public async createBoardPiecesWithNoAnimation(x: number, y: number, pieceImage: createjs.Bitmap) {
    const rulesInfo = Rules.getRulesInfo();
    const piece = new createjs.Bitmap(pieceImage.image);
    piece.x = x * rulesInfo.cellSize;
    piece.y = ((rulesInfo.colSize - (y - 1)) * rulesInfo.cellSize) - rulesInfo.cellSize;
    const shadow = new createjs.Shadow(
      '#003700', -rulesInfo.cellSize + rulesInfo.cellSize * 1.03, -rulesInfo.cellSize + rulesInfo.cellSize * 1.03, 10);
    piece.shadow = shadow;
    await this.getImageSize(piece, rulesInfo.cellSize);
    Render.containers.boardPieces.addChild(piece);
    this.cacheBoardPiece(piece, rulesInfo);
  }

  public removeBoardPiece(index: number) {
    Render.containers.boardPieces.removeChildAt(index);
  }

  public createPlayersInfoForGameDraw() {
    this.createPlayersInfoForMyselfDraw();
    this.createPlayersInfoForRivalDraw();
  }
  public createPlayersInfoForMyselfCurrentTurn() {
    const rulesInfo = Rules.getRulesInfo();
    const imageBorder = new createjs.Shape();
    imageBorder.graphics
      .beginStroke('#FE2E64')
      .setStrokeStyle(4)
      .drawRect(0, 0, rulesInfo.verticalSpace * 0.6, rulesInfo.verticalSpace * 0.6);
    const childOfMyselfImage = Render.containers.playersInfo.getChildByName('myselfImage');
    imageBorder.x = childOfMyselfImage.x;
    imageBorder.y = childOfMyselfImage.y;
    const text = new createjs.Text('あなたの番', 'bold 25px arial', '#FE2E64');
    text.x = (rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2;
    text.y = (rulesInfo.canvasSize.height / 2) * 0.3;
    Render.containers.playersCurrentTurn.addChild(imageBorder, text);
  }

  public createPlayersInfoForRivalCurrentTurn() {
    const rulesInfo = Rules.getRulesInfo();
    const imageBorder = new createjs.Shape();
    imageBorder.graphics
      .beginStroke('#FE2E64')
      .setStrokeStyle(4)
      .drawRect(0, 0, rulesInfo.verticalSpace * 0.6, rulesInfo.verticalSpace * 0.6);
    const childOfRivalImage = Render.containers.playersInfo.getChildByName('rivalImage');
    imageBorder.x = childOfRivalImage.x;
    imageBorder.y = childOfRivalImage.y;
    const text = new createjs.Text('相手の番', 'bold 25px arial', '#FE2E64');
    text.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    text.y = (rulesInfo.canvasSize.height / 2) * 0.3;
    Render.containers.playersCurrentTurn.addChild(imageBorder, text);
  }

  public createPlayersInfoForMyselfWin() {
    const rulesInfo = Rules.getRulesInfo();
    const bitmap = new createjs.Bitmap('./assets/image/UI/win.png');
    bitmap.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2);
    bitmap.y = rulesInfo.canvasSize.height * 0.80;
    bitmap.scaleX = 0.35;
    bitmap.scaleY = bitmap.scaleX;
    Render.containers.playersInfo.addChild(bitmap);
  }

  public createPlayersInfoForMyselfLose() {
    const rulesInfo = Rules.getRulesInfo();
    const bitmap = new createjs.Bitmap('./assets/image/UI/lose.png');
    bitmap.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2);
    bitmap.y = rulesInfo.canvasSize.height * 0.80;
    bitmap.scaleX = 0.35;
    bitmap.scaleY = bitmap.scaleX;
    Render.containers.playersInfo.addChild(bitmap);
  }

  public createPlayersInfoForMyselfDraw() {
    const rulesInfo = Rules.getRulesInfo();
    const bitmap = new createjs.Bitmap('./assets/image/UI/draw.png');
    bitmap.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2);
    bitmap.y = rulesInfo.canvasSize.height * 0.80;
    bitmap.scaleX = 0.35;
    bitmap.scaleY = bitmap.scaleX;
    Render.containers.playersInfo.addChild(bitmap);
  }

  public createPlayersInfoForRivalWin() {
    const rulesInfo = Rules.getRulesInfo();
    const bitmap = new createjs.Bitmap('./assets/image/UI/win.png');
    bitmap.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    bitmap.y = rulesInfo.canvasSize.height * 0.80;
    bitmap.scaleX = 0.35;
    bitmap.scaleY = bitmap.scaleX;
    Render.containers.playersInfo.addChild(bitmap);
  }

  public createPlayersInfoForRivalLose() {
    const rulesInfo = Rules.getRulesInfo();
    const bitmap = new createjs.Bitmap('./assets/image/UI/lose.png');
    bitmap.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    bitmap.y = rulesInfo.canvasSize.height * 0.80;
    bitmap.scaleX = 0.35;
    bitmap.scaleY = bitmap.scaleX;
    Render.containers.playersInfo.addChild(bitmap);
  }

  public createPlayersInfoForRivalDraw() {
    const rulesInfo = Rules.getRulesInfo();
    const bitmap = new createjs.Bitmap('./assets/image/UI/draw.png');
    bitmap.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    bitmap.y = rulesInfo.canvasSize.height * 0.80;
    bitmap.scaleX = 0.35;
    bitmap.scaleY = bitmap.scaleX;
    Render.containers.playersInfo.addChild(bitmap);
  }

  public updatePlayersInfoForRivalProgress(numerator: number, denominator: number) {
    const progress = (numerator / denominator * 100).toFixed(0);
    Render.progress.text = `計算中.. ${progress}%`;
  }

  public removePlayersInfoForRivalProgress() {
    Render.progress.text = '';
  }

  private createContainers(stage: createjs.Stage, containers: Containers, rulesInfo: RulesInfo) {
    this.createBackgroundContainer(stage, containers);
    this.createBoardContainer(stage, containers, rulesInfo);
    this.createPlayersInfoContainer(stage, containers, rulesInfo);
    this.createPlayersCurrentTurnContainer(stage, containers, rulesInfo);
    this.createBoardPiecesContainer(stage, containers, rulesInfo);
    this.createBoardMouseOverColContainer(stage, containers, rulesInfo);
    this.createGameEffectContainer(stage, containers, rulesInfo);
  }

  private createBoard(containers: Containers, rulesInfo: RulesInfo) {
    this.createBoardForBackground(containers, rulesInfo);
    this.createBoardForCellLine(containers, rulesInfo);
    this.createBoardForLuster(containers, rulesInfo);
    this.createMaskForBoard(containers, rulesInfo);
    this.cacheBoardContainer(containers, rulesInfo);
  }

  private createPlayersInfo(
    containers: Containers, rulesInfo: RulesInfo, myselfInfo: PlayerInfo, rivalInfo: PlayerInfo) {
    this.createPlayersInfoForGameTitle(containers, rulesInfo);
    this.createPlayersInfoForMyselfBackground(containers, rulesInfo);
    this.createPlayersInfoForMyselfImage(containers, rulesInfo, myselfInfo.selfImage);
    this.createPlayersInfoForMyselfName(containers, rulesInfo, myselfInfo.name);
    this.createPlayersInfoForMyselfPiece(containers, rulesInfo, myselfInfo.pieceImage);
    this.createPlayersInfoForMyselfTurnString(containers, rulesInfo);
    this.createPlayersInfoForMyselfImageBorder(containers, rulesInfo);
    this.createPlayersInfoForMyselfVictoryCount(
      containers, rulesInfo, <string>sessionStorage.getItem('victoryCountForMyself'));
    this.createPlayersInfoForRivalBackground(containers, rulesInfo);
    this.createPlayersInfoForRivalImage(containers, rulesInfo, rivalInfo.selfImage);
    this.createPlayersInfoForRivalName(containers, rulesInfo, rivalInfo.name);
    // this.createPlayersInfoForRivalMessage(containers, rulesInfo);
    this.createPlayersInfoForRivalPiece(containers, rulesInfo, rivalInfo.pieceImage);
    this.createPlayersInfoForRivalTurnString(containers, rulesInfo);
    this.createPlayersInfoForRivalImageBorder(containers, rulesInfo);
    this.createPlayersInfoForRivalProgress(containers, rulesInfo);
    this.createPlayersInfoForRivalVictoryCount(
      containers, rulesInfo, <string>sessionStorage.getItem('victoryCountForRival'));
  }

  private createPlayersInfoPVPForWait(
    containers: Containers, rulesInfo: RulesInfo, myselfInfo: PlayerInfo, rivalInfo: PlayerInfo) {
    this.createPlayersInfoForGameTitle(containers, rulesInfo);
    this.createPlayersInfoForMyselfBackground(containers, rulesInfo);
    this.createPlayersInfoForMyselfImage(containers, rulesInfo, myselfInfo.selfImage);
    this.createPlayersInfoForMyselfName(containers, rulesInfo, myselfInfo.name);
    this.createPlayersInfoForMyselfPiece(containers, rulesInfo, myselfInfo.pieceImage);
    this.createPlayersInfoForMyselfTurnString(containers, rulesInfo);
    this.createPlayersInfoForMyselfImageBorder(containers, rulesInfo);
    this.createPlayersInfoForWaitingMessage(containers, rulesInfo, '待機中');
  }

  private createBoardContainer(stage: createjs.Stage, containers: Containers, rulesInfo: RulesInfo) {
    const board = new createjs.Container();
    board.x = rulesInfo.verticalSpace;
    board.y = rulesInfo.sideSpace;
    stage.addChild(board);
    containers['board'] = board;
  }

  private createBoardForBackground(containers: Containers, rulesInfo: RulesInfo) {
    const background = new createjs.Shape();
    background.graphics
      .beginLinearGradientFill(
        ['#2ee62e', '#008000'], [0.1, 0.9], 0, 0,
        rulesInfo.boardSize.width * 0.9, rulesInfo.boardSize.height * 0.94)
      .drawRoundRect(0, 0, rulesInfo.boardSize.width, rulesInfo.boardSize.height, 10)
      .endStroke();
    containers.board.addChild(background);
  }

  private createBoardForCellLine(containers: Containers, rulesInfo: RulesInfo) {
    const cellLine = new createjs.Shape();
    const lineColor = '#FFFFFF';
    for (let col = 0; col <= rulesInfo.colSize; col++) {
      // 縦
      cellLine.graphics
        .setStrokeStyle(1)
        .beginStroke(lineColor).moveTo(col * rulesInfo.cellSize, 0)
        .lineTo(col * rulesInfo.cellSize, rulesInfo.boardSize.height)
        .endStroke();
      cellLine.graphics
        .beginFill(lineColor)
        .drawRect(col * rulesInfo.cellSize, 0, 1, rulesInfo.boardSize.height)
        .endStroke();

      // 横
      cellLine.graphics
        .setStrokeStyle(1)
        .beginStroke(lineColor).moveTo(0, col * rulesInfo.cellSize)
        .lineTo(rulesInfo.boardSize.width, col * rulesInfo.cellSize)
        .endStroke();
      cellLine.graphics
        .beginFill(lineColor)
        .drawRect(col * rulesInfo.cellSize, 0, rulesInfo.boardSize.width, 0)
        .endStroke();
    }
    containers.board.addChild(cellLine);
  }

  private createBoardForLuster(containers: Containers, rulesInfo: RulesInfo) {
    const luster = new createjs.Shape();
    luster.graphics.beginFill('rgba(255,255,255,0.1)')
      // 楕円を描く
      .drawEllipse(
        rulesInfo.boardSize.width * -0.4, rulesInfo.boardSize.height * -0.4,
        rulesInfo.boardSize.width, rulesInfo.boardSize.height * 0.74)
      .endStroke();
    containers.board.addChild(luster);
  }

  private createBoardForMyselfSelectedColPiece(
    pieceImage: createjs.Bitmap, rulesInfo: RulesInfo, x: number, y: number): createjs.Bitmap {
    pieceImage.x = x * rulesInfo.cellSize;
    pieceImage.y = -rulesInfo.cellSize + ((rulesInfo.colSize - y) * rulesInfo.cellSize);
    return pieceImage;
  }

  private createBoardMouseOverColContainer(stage: createjs.Stage, containers: Containers, rulesInfo: RulesInfo) {
    const boardMouseOverCol = new createjs.Container();
    boardMouseOverCol.x = rulesInfo.verticalSpace;
    boardMouseOverCol.y = rulesInfo.sideSpace;
    stage.addChild(boardMouseOverCol);
    containers['boardMouseOverCol'] = boardMouseOverCol;
  }

  private createBoardPiecesContainer(stage: createjs.Stage, containers: Containers, rulesInfo: RulesInfo) {
    const boardPieces = new createjs.Container();
    boardPieces.x = rulesInfo.verticalSpace;
    boardPieces.y = rulesInfo.sideSpace;
    stage.addChild(boardPieces);
    containers['boardPieces'] = boardPieces;
    this.createMaskForBoardPieces(containers, rulesInfo);
  }

  private createMaskForBoardPieces(containers: Containers, rulesInfo: RulesInfo) {
    const mask = new createjs.Shape();
    mask.graphics
      .beginFill('#000')
      .drawRoundRect(0, 0, rulesInfo.boardSize.width, rulesInfo.boardSize.height, 10)
      .endStroke();
    mask.x = rulesInfo.verticalSpace;
    mask.y = rulesInfo.sideSpace;
    containers.boardPieces.mask = mask;
  }

  private createBackgroundContainer(stage: createjs.Stage, containers: Containers) {
    const container = new createjs.Container();
    stage.addChild(container);
    containers['background'] = container;
  }

  private createBackgroundForBackgroundImage(containers: Containers) {
    const backgroundImage = new createjs.Bitmap('./assets/image/UI/backgroundImage.jpg');
    backgroundImage.alpha = 0.5;
    containers.background.addChild(backgroundImage);
  }

  private createMaskForBoard(containers: Containers, rulesInfo: RulesInfo) {
    const mask = new createjs.Shape();
    mask.graphics
      .beginFill('#000')
      .drawRoundRect(0, 0, rulesInfo.boardSize.width, rulesInfo.boardSize.height, 10)
      .endStroke();
    mask.x = rulesInfo.verticalSpace;
    mask.y = rulesInfo.sideSpace;
    containers.board.mask = mask;
  }

  private createPlayersInfoContainer(stage: createjs.Stage, containers: Containers, rulesInfo: RulesInfo) {
    const playersInfo = new createjs.Container();
    stage.addChild(playersInfo);
    containers['playersInfo'] = playersInfo;
  }

  private createPlayersInfoForMyselfBackground(containers: Containers, rulesInfo: RulesInfo) {
    const myselfBackground = new createjs.Shape();
    myselfBackground.graphics
      .beginFill('#FAFAFA')
      .drawRoundRect(0, 0, rulesInfo.verticalSpace * 0.8, rulesInfo.canvasSize.height * 0.53, 20);
    myselfBackground.x = rulesInfo.verticalSpace * 0.1;
    myselfBackground.y = (rulesInfo.canvasSize.height / 2) * 0.48;
    myselfBackground.alpha = 0.8;
    containers.playersInfo.addChild(myselfBackground);
  }

  private createPlayersInfoForRivalBackground(containers: Containers, rulesInfo: RulesInfo) {
    const rivalBackground = new createjs.Shape();
    rivalBackground.graphics
      .beginFill('#FAFAFA')
      .drawRoundRect(0, 0, rulesInfo.verticalSpace * 0.8, rulesInfo.canvasSize.height * 0.53, 20);
    rivalBackground.x = rulesInfo.verticalSpace * 3.1;
    rivalBackground.y = (rulesInfo.canvasSize.height / 2) * 0.48;
    rivalBackground.alpha = 0.8;
    containers.playersInfo.addChild(rivalBackground);
  }

  private createPlayersInfoForRivalMessage(containers: Containers, rulesInfo: RulesInfo) {
    const rivalMessage = new createjs.Text('', '20px arial', '#000');
    rivalMessage.x
      = (((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2)
        + rulesInfo.verticalSpace * 3) * 0.97;
    rivalMessage.y = rulesInfo.canvasSize.height * 0.1;
    containers.playersInfo.addChild(rivalMessage);
  }

  private createPlayersInfoForRivalImage(containers: Containers, rulesInfo: RulesInfo, selfImage: createjs.Bitmap) {
    const rivalImage = new createjs.Bitmap(selfImage.image);
    rivalImage.name = 'rivalImage';
    rivalImage.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    rivalImage.y = (rulesInfo.canvasSize.height / 2) * 0.75;
    this.getImageSize(rivalImage, rulesInfo.verticalSpace * 0.6);
    const background = new createjs.Shape();
    background
      .graphics
      .beginFill('#DDE6FF')
      .drawRect(
        ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3,
        (rulesInfo.canvasSize.height / 2) * 0.75,
        rulesInfo.verticalSpace * 0.6,
        rulesInfo.verticalSpace * 0.6,
      );
    containers.playersInfo.addChild(background, rivalImage);
  }

  private createPlayersInfoForMyselfName(containers: Containers, rulesInfo: RulesInfo, nameStr: string) {
    const myselfName = new createjs.Text(nameStr, '25px arial', '#2E2E2E');
    myselfName.x = (rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2;
    myselfName.y = (rulesInfo.canvasSize.height / 2) * 0.62;
    const width = myselfName.getMeasuredWidth();
    // const height = myselfName.getMeasuredHeight();
    if (width > ((rulesInfo.canvasSize.height / 2) / 2)) {
      myselfName.scaleX = ((rulesInfo.canvasSize.height / 2) / 2) / width;
      // myselfName.scaleY = (rulesInfo.canvasSize.height / 2) / 2 / height;
    }
    containers.playersInfo.addChild(myselfName);
  }

  private createPlayersInfoForRivalName(containers: Containers, rulesInfo: RulesInfo, nameStr: string) {
    const rivalName = new createjs.Text(nameStr, '25px arial', '#2E2E2E');
    rivalName.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    rivalName.y = (rulesInfo.canvasSize.height / 2) * 0.62;
    const width = rivalName.getMeasuredWidth();
    // const height = rivalName.getMeasuredHeight();
    if (width > ((rulesInfo.canvasSize.height / 2) / 2)) {
      rivalName.scaleX = ((rulesInfo.canvasSize.height / 2) / 2) / width;
      // myselfName.scaleY = (rulesInfo.canvasSize.height / 2) / 2 / height;
    }
    containers.playersInfo.addChild(rivalName);
  }

  private createPlayersInfoForRivalPiece(containers: Containers, rulesInfo: RulesInfo, pieceImage: createjs.Bitmap) {
    const rivalPiece = new createjs.Bitmap(pieceImage.image);
    rivalPiece.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    rivalPiece.y = (rulesInfo.canvasSize.height / 2) * 1.28;
    this.getImageSize(rivalPiece, rulesInfo.canvasSize.width * 0.04);
    containers.playersInfo.addChild(rivalPiece);
  }

  private createPlayersInfoForRivalTurnString(containers: Containers, rulesInfo: RulesInfo) {
    const turnText = Rival.getPlayerInfo().isFirst ? '先手' : '後手';
    const rivalDisplayTurn = new createjs.Text(turnText, '25px arial', '#2E2E2E');
    rivalDisplayTurn.x
      = (((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3) * 1.065;
    rivalDisplayTurn.y = (rulesInfo.canvasSize.height / 2) * 1.3;
    containers.playersInfo.addChild(rivalDisplayTurn);
  }

  private createPlayersCurrentTurnContainer(stage: createjs.Stage, containers: Containers, rulesInfo: RulesInfo) {
    const playersCurrentTurn = new createjs.Container();
    stage.addChild(playersCurrentTurn);
    containers['playersCurrentTurn'] = playersCurrentTurn;
  }

  private createPlayersInfoForMyselfImage(containers: Containers, rulesInfo: RulesInfo, selfImage: createjs.Bitmap) {
    const myselfImage = new createjs.Bitmap(selfImage.image);
    myselfImage.name = 'myselfImage';
    myselfImage.x = (rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2;
    myselfImage.y = (rulesInfo.canvasSize.height / 2) * 0.75;
    this.getImageSize(myselfImage, rulesInfo.verticalSpace * 0.6);
    const background = new createjs.Shape();
    background.graphics.beginFill('#FFE4FF')
      .drawRect(
        (rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2,
        (rulesInfo.canvasSize.height / 2) * 0.75,
        rulesInfo.verticalSpace * 0.6,
        rulesInfo.verticalSpace * 0.6,
      );
    containers.playersInfo.addChild(background, myselfImage);
  }

  private createPlayersInfoForMyselfPiece(containers: Containers, rulesInfo: RulesInfo, pieceImage: createjs.Bitmap) {
    const myselfPiece = new createjs.Bitmap(pieceImage.image);
    myselfPiece.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2);
    myselfPiece.y = rulesInfo.canvasSize.height / 2 * 1.28;
    this.getImageSize(myselfPiece, rulesInfo.canvasSize.width * 0.04);
    containers.playersInfo.addChild(myselfPiece);
  }

  private createPlayersInfoForMyselfTurnString(containers: Containers, rulesInfo: RulesInfo) {
    const turnText = Myself.getPlayerInfo().isFirst ? '先手' : '後手';
    const myselfDisplayTurn = new createjs.Text(turnText, '25px arial', '#2E2E2E');
    myselfDisplayTurn.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) * 2;
    myselfDisplayTurn.y = rulesInfo.canvasSize.height / 2 * 1.3;
    containers.playersInfo.addChild(myselfDisplayTurn);
  }

  private createPlayersInfoForRivalImageBorder(containers: Containers, rulesInfo: RulesInfo) {
    const imageBorder = new createjs.Shape();
    imageBorder.graphics
      .beginStroke('#FFCFDC')
      .setStrokeStyle(3)
      .drawRect(0, 0, rulesInfo.verticalSpace * 0.6, rulesInfo.verticalSpace * 0.6);
    const childOfRivalImage = Render.containers.playersInfo.getChildByName('rivalImage');
    imageBorder.x = childOfRivalImage.x;
    imageBorder.y = childOfRivalImage.y;
    containers.playersInfo.addChild(imageBorder);
  }

  private createPlayersInfoForMyselfImageBorder(containers: Containers, rulesInfo: RulesInfo) {
    const imageBorder = new createjs.Shape();
    imageBorder.graphics
      .beginStroke('#FFCFDC')
      .setStrokeStyle(3)
      .drawRect(0, 0, rulesInfo.verticalSpace * 0.6, rulesInfo.verticalSpace * 0.6);
    const childOfMyselfImage = Render.containers.playersInfo.getChildByName('myselfImage');
    imageBorder.x = childOfMyselfImage.x;
    imageBorder.y = childOfMyselfImage.y;
    containers.playersInfo.addChild(imageBorder);
  }

  private createPlayersInfoForRivalProgress(containers: Containers, rulesInfo: RulesInfo) {
    Render.progress = new createjs.Text('', '20px arial', '#2E2E2E');
    Render.progress.x = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    Render.progress.y = (rulesInfo.canvasSize.height / 2) * 0.51;
    containers.playersInfo.addChild(Render.progress);
  }

  private createPlayersInfoForWaitingMessage(containers: Containers, rulesInfo: RulesInfo, message: string) {
    const shape = new createjs.Shape();
    shape.graphics
      .beginFill('#FAFAFA')
      .beginStroke('#2E2E2E')
      .setStrokeStyle(3)
      .drawRoundRect(0, 0, rulesInfo.verticalSpace * 1.3, rulesInfo.canvasSize.height * 0.25, 20)
      .endStroke();
    shape.x = (rulesInfo.canvasSize.width / 2) - (rulesInfo.verticalSpace * 1.3 / 2);
    shape.y = (rulesInfo.canvasSize.height / 2) - (rulesInfo.canvasSize.height * 0.25 / 2);
    const text = new createjs.Text(message, 'bold 42px arial', '#FE2E64');
    const width = text.getMeasuredWidth();
    const height = text.getMeasuredHeight();
    text.x = (rulesInfo.canvasSize.width / 2) - (width / 2);
    text.y = (rulesInfo.canvasSize.height / 2) - (height / 2);
    containers.playersInfo.addChild(shape, text);
  }

  private createPlayersInfoForGameTitle(containers: Containers, rulesInfo: RulesInfo) {
    const KANJI_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];
    const line = sessionStorage.getItem('line') || '';
    const text = new createjs.Text(`重力付き${KANJI_NUMBERS[Number(line) - 1]}目並べ`, '25px arial', '#2E2E2E');
    const width = text.getMeasuredWidth();
    text.x = (rulesInfo.canvasSize.width / 2) - (width / 2);
    text.y = 15;
    containers.playersInfo.addChild(text);
  }

  private createPlayersInfoForMyselfVictoryCount(containers: Containers, rulesInfo: RulesInfo, victoryCount: String) {
    Render.playersVictoryCount['myself'] = new createjs.Text(`勝利数: ${victoryCount}`, '22px arial', '#2E2E2E');
    Render.playersVictoryCount['myself'].x = (rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2;
    Render.playersVictoryCount['myself'].y = rulesInfo.canvasSize.height * 0.73;
    containers.playersInfo.addChild(Render.playersVictoryCount['myself']);
  }

  private createPlayersInfoForRivalVictoryCount(containers: Containers, rulesInfo: RulesInfo, victoryCount: String) {
    Render.playersVictoryCount['rival'] = new createjs.Text(`勝利数: ${victoryCount}`, '22px arial', '#2E2E2E');
    Render.playersVictoryCount['rival'].x
      = ((rulesInfo.verticalSpace - (rulesInfo.verticalSpace * 0.6)) / 2) + rulesInfo.verticalSpace * 3;
    Render.playersVictoryCount['rival'].y = rulesInfo.canvasSize.height * 0.73;
    containers.playersInfo.addChild(Render.playersVictoryCount['rival']);
  }

  public updateVictoryCount() {
    Render.playersVictoryCount['myself'].text = `勝利数: ${<string>sessionStorage.getItem('victoryCountForMyself')}`;
    Render.playersVictoryCount['rival'].text = `勝利数: ${<string>sessionStorage.getItem('victoryCountForRival')}`;
  }

  private createGameEffectContainer(stage: createjs.Stage, containers: Containers, rulesInfo: RulesInfo) {
    const gameEffect = new createjs.Container();
    gameEffect.alpha = 0;
    stage.addChild(gameEffect);
    containers['gameEffect'] = gameEffect;
  }

  public async createGameEffectForGameStartWithAnimation() {
    const rulesInfo = Rules.getRulesInfo();
    const shape = new createjs.Shape();
    shape.graphics
      .beginLinearGradientFill(
        ['#FFF', '#7fffd4'], [0.1, 0.9], 0, 0,
        rulesInfo.canvasSize.width * 0.9, rulesInfo.canvasSize.height * 0.94)
      .drawRoundRect(
        0, rulesInfo.canvasSize.height * 0.33, rulesInfo.canvasSize.width, rulesInfo.canvasSize.height * 0.32, 10)
      .endStroke();
    const startMessage = new createjs.Text('GAME START!', 'bold 50px arial', '#2E2E2E');
    const width = startMessage.getMeasuredWidth();
    startMessage.x = (rulesInfo.canvasSize.width / 2) - (width / 2);
    startMessage.y = (rulesInfo.canvasSize.height / 2) * 0.90;
    Render.containers.gameEffect.addChild(shape, startMessage);
    return new Promise(resolve => {
      createjs.Tween.get(Render.containers.gameEffect)
        .to({ alpha: 1 }, 250)
        .wait(800)
        .to({ alpha: 0 }, 250)
        .call(() => {
          this.removeGameEffect();
          return resolve();
        });
    });
  }

  private removeGameEffect() {
    Render.containers.gameEffect.removeAllChildren();
  }

  private createButton(text: string, width: number, height: number, keyColor: string, textSize: number, font: string)
    : createjs.Container {
    // ボタン要素をグループ化
    const button = new createjs.Container();
    button.name = text; // ボタンに参考までに名称を入れておく(必須ではない)
    button.cursor = 'pointer'; // ホバー時にカーソルを変更する
    // 通常時のボタンを作成
    const bgUp = new createjs.Shape();
    bgUp.graphics
      .setStrokeStyle(1.0)
      .beginStroke(keyColor)
      .beginFill('white')
      .drawRoundRect(0.5, 0.5, width - 1.0, height - 1.0, 4);
    button.addChild(bgUp);
    bgUp.visible = true; // 表示する
    // ロールオーバー時のボタンを作成
    const bgOver = new createjs.Shape();
    bgOver.graphics
      .beginFill(keyColor)
      .drawRoundRect(0, 0, width, height, 4);
    bgOver.visible = false; // 非表示にする
    button.addChild(bgOver);
    // ラベルを作成
    const label = new createjs.Text(text, `${textSize}px ${font}`, keyColor);
    label.x = width / 2;
    label.y = height / 2;
    label.textAlign = 'center';
    label.textBaseline = 'middle';
    button.addChild(label);
    // ロールオーバーイベントを登録
    button.addEventListener('mouseover', handleMouseOver);
    button.addEventListener('mouseout', handleMouseOut);

    function handleMouseOver() {
      bgUp.visible = false;
      bgOver.visible = true;
      label.color = 'white';
    }
    function handleMouseOut() {
      bgUp.visible = true;
      bgOver.visible = false;
      label.color = keyColor;
    }
    return button;
  }

  private updatePlayersInfoForRivalMessage() {
  }

  private cacheBoardContainer(containers: Containers, rulesInfo: RulesInfo) {
    const board = containers.board;
    board.cache(0, 0, rulesInfo.boardSize.width, rulesInfo.boardSize.height);
  }

  private cacheBoardPiece(piece: createjs.Bitmap, rulesInfo: RulesInfo) {
    piece.cache(0, 0, rulesInfo.boardSize.width * 1.2, rulesInfo.boardSize.height * 1.2);
  }
}
