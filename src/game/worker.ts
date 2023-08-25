interface RulesInfo {
  debug: boolean;
  canvasSize: {
    width: number,
    height: number,
  };
  boardSize: {
    width: number,
    height: number,
  };
  colSize: number;
  cellSize: number;
  verticalSpace: number;
  sideSpace: number;
  line: number;
  playoutNumber: number;
  playoutThreshold: number;
}

interface BoardInfo {
  map: number[][];
  mapHeight: number[];
  gameRecord: (number | string)[];
}

class RewardInfo {
  visits: number = 0; // 現在のノードに訪れた回数
  Q: number = 0; // 期待報酬 win/visits
  win: number = 0;
  childNode: RewardInfo[] = [];
  parentNode: RewardInfo | null = null;
  index: number = 0;
  isExpandable: boolean = true;
  game = {
    isEnd: false,
    winner: 0,
  };
}

interface CanPutRange {
  start: number;
  end: number;
}

addEventListener('message', (message: any) => {
  console.log('MCTS processing...');
  console.time('MCTS');
  const result = montecarlo(
    message.data.turn,
    message.data.rivalTurn,
    message.data.playoutNumber,
    message.data.playoutThreshold,
    message.data.rulesInfo,
    message.data.boardInfo,
  );
  console.timeEnd('MCTS');
  console.log(`Best hand: ${result.bestHand}`);
  postMessage(result);
  close(); // Workerの終了
});

// Play
function montecarlo(
  turn: number,
  rivalTurn: number,
  playoutNumber: number,
  playoutThreshold: number,
  rulesInfo: RulesInfo,
  boardInfo: BoardInfo,
) {
  const gameTree = new RewardInfo();
  const nodeDefaultValue: RewardInfo[] = [];
  for (let col = 0; col < rulesInfo.colSize; col++) {
    nodeDefaultValue.push(Object.assign({}, new RewardInfo()));
    nodeDefaultValue[col].index = col;
  }
  const defaultBoardInfo: any = [];
  defaultBoardInfo['gameRecord'] = Object.assign([], boardInfo.gameRecord);
  defaultBoardInfo['map'] = JSON.parse(JSON.stringify(boardInfo.map));
  defaultBoardInfo['mapHeight'] = Object.assign({}, boardInfo.mapHeight);
  expandLeafNode(gameTree, nodeDefaultValue);
  checkExpandableForLeafNode(boardInfo, rulesInfo, gameTree, turn);

  for (let count = 1; count <= playoutNumber; count++) {
    // searchLeafNodeに根ノードを渡し、UCTに従って探索し、葉ノードを返す
    let searchResult = searchLeafNode(boardInfo, rulesInfo, gameTree, turn);

    // プレイアウトの前に勝敗が確定しているかを調べ、確定している場合、葉の拡張をfalse,playOutResultを1にする
    if (!searchResult.leafNode.game.isEnd) {
      checkWinOrLoss(
        boardInfo, rulesInfo, searchResult.leafNode, -searchResult.currentTurn, searchResult.leafNode.index);
    }

    // 葉ノードのvisitsが閾値以上の場合、expandLeafNodeで葉ノードを拡大する
    if (searchResult.leafNode.visits > playoutThreshold && searchResult.leafNode.isExpandable) {
      searchResult.leafNode.visits -= 1;
      expandLeafNode(searchResult.leafNode, nodeDefaultValue);

      // 拡大された各葉ノードに対してcanPutPieceToSelectedColを実行し、結果がfalseならばisExpandableをfalseに設定する
      checkExpandableForLeafNode(boardInfo, rulesInfo, searchResult.leafNode, -searchResult.currentTurn);

      // selectChildに展開された元の親ノードを渡し、最もUCTの値が大きい子ノードを取得する
      searchResult = searchLeafNode(boardInfo, rulesInfo, searchResult.leafNode, searchResult.currentTurn);
    }

    let playOutResult;
    if (searchResult.leafNode.game.isEnd) {
      playOutResult = rivalTurn === searchResult.leafNode.game.winner ? 1 : 0;
    } else {
      // playOutで盤面評価を行う
      playOutResult
        = playOut(boardInfo, rulesInfo, searchResult.currentTurn, rivalTurn, searchResult.leafNode.index);
    }

    // updateNodeで葉ノードから根ノードまでのQ及びwinを更新
    updateNode(searchResult.leafNode, playOutResult, rivalTurn, searchResult.currentTurn);

    boardInfo.gameRecord = Object.assign([], defaultBoardInfo.gameRecord);
    boardInfo.map = JSON.parse(JSON.stringify(defaultBoardInfo.map));
    boardInfo.mapHeight = Object.assign({}, defaultBoardInfo.mapHeight);
    postMessage(null);
  }

  // 根ノードで、visitsの値が最も大きい子ノードの手を最良の手として取得する
  return {
    bestHand: selectBestHand(gameTree),
    gameTree,
  };
}

// Selection
// 渡された親ノードで、各子ノードのUCTを計算し、最もUCTの値が大きい子ノードの番号を取得する
function selectbestUCTChild(boardInfo: BoardInfo, rulesInfo: RulesInfo, parentNode: RewardInfo, turn: number): number {
  let maxUCT = 0;
  let bestNodeNumber = -1;
  parentNode.childNode.forEach((childNode, index) => {
    const UCT = calcUCT(childNode, parentNode.visits);
    if (UCT > maxUCT && canPutPieceToSelectedCol(boardInfo, rulesInfo, index, turn)) {
      maxUCT = UCT;
      bestNodeNumber = index;
    }
  });
  if (bestNodeNumber === -1) {
    bestNodeNumber = getSelectableCol(boardInfo, rulesInfo);
  }
  return bestNodeNumber;
}

// Expansion
// 渡された葉ノードを展開する
function expandLeafNode(leafNode: RewardInfo, nodeDefaultValue: RewardInfo[]) {
  leafNode.childNode = JSON.parse(JSON.stringify(nodeDefaultValue));
  leafNode.childNode.forEach(childNode => {
    childNode.parentNode = leafNode;
  });
}

// Evaluation
function playOut(
  boardInfo: BoardInfo, rulesInfo: RulesInfo, turn: number, rivalTurn: number, lastHand: number): 0 | 0.5 | 1 {
  if (isDraw(boardInfo, rulesInfo)) return 1;
  let currentTurn = turn;
  let x = lastHand;
  const allRange = {
    start: 0,
    end: rulesInfo.colSize - 1,
  };
  while (true) {
    const range = getRange(boardInfo, rulesInfo);
    if (checkLine(boardInfo, rulesInfo, range, currentTurn) >= 0) return rivalTurn === currentTurn ? 1 : 0;
    const resultCheckLine = checkLine(boardInfo, rulesInfo, range, -currentTurn);
    if (resultCheckLine >= 0) {
      putPiece(boardInfo, resultCheckLine, currentTurn);
      boardInfo.gameRecord.push(resultCheckLine);
      if (isDraw(boardInfo, rulesInfo)) return 0.5;
      currentTurn = -currentTurn;
      continue;
    }
    if (
      checkContinuityReach(boardInfo, rulesInfo, allRange, currentTurn) >= 0) return rivalTurn === currentTurn ? 1 : 0;
    x = getPlayoutSelectableCol(boardInfo, rulesInfo, currentTurn);
    putPiece(boardInfo, x, currentTurn);
    boardInfo.gameRecord.push(x);
    if (isDraw(boardInfo, rulesInfo)) return 0.5;
    currentTurn = -currentTurn;
  }
}

// Backup
// 渡された葉ノードから根ノードまでのQ及びwinを更新
function updateNode(leafNode: RewardInfo, playOutResult: number, rivalTurn: number, turn: number) {
  let currentTurn = turn;
  let currentNode: RewardInfo | null = leafNode;
  do {
    if (rivalTurn !== currentTurn) {
      currentNode.win += playOutResult;
    } else {
      currentNode.win += playOutResult === 0.5 ? playOutResult : 1 - playOutResult;
    }
    currentNode.Q = currentNode.win / currentNode.visits;
    currentNode = currentNode.parentNode;
    currentTurn = -currentTurn;
  } while (currentNode !== null);
}

// 渡されたノードをUCTに従って探索し、葉ノードを返す
function searchLeafNode(
  boardInfo: BoardInfo, rulesInfo: RulesInfo, node: RewardInfo, turn: number)
  : { leafNode: RewardInfo, currentTurn: number } {
  let currentNode = node;
  let currentTurn = turn;
  currentNode.visits++;
  do {
    const bestNode = selectbestUCTChild(boardInfo, rulesInfo, currentNode, currentTurn);
    currentNode = currentNode.childNode[bestNode];
    putPiece(boardInfo, bestNode, currentTurn);
    boardInfo.gameRecord.push(bestNode);
    currentNode.visits++;
    currentTurn = -currentTurn;
  } while (currentNode.childNode.length !== 0);
  return { leafNode: currentNode, currentTurn };
}

function calcUCT(leafNode: RewardInfo, parentNodeVisits: number): number {
  return leafNode.Q + (1.0 * Math.sqrt(Math.log(parentNodeVisits) / leafNode.visits || 0));
}

function selectBestHand(rootNode: RewardInfo): number {
  let maxVisits = 0;
  let bestNodeNumber = 0;
  rootNode.childNode.forEach((childNode, index) => {
    const visits = childNode.visits;
    if (visits > maxVisits) {
      maxVisits = visits;
      bestNodeNumber = index;
    }
  });
  return bestNodeNumber;
}

function checkExpandableForLeafNode(boardInfo: BoardInfo, rulesInfo: RulesInfo, parentNode: RewardInfo, turn: number) {
  parentNode.childNode.forEach(childNode => {
    if (!canPutPieceToSelectedColForPlayout(boardInfo, rulesInfo, childNode.index, turn)) {
      childNode.isExpandable = false;
      return;
    }
  });
}

function putPiece(boardInfo: BoardInfo, x: number, turn: number) {
  boardInfo.map[boardInfo.mapHeight[x]][x] = turn;
  boardInfo.mapHeight[x] += 1;
}

function excludePiece(boardInfo: BoardInfo, x: number) {
  boardInfo.map[boardInfo.mapHeight[x] - 1][x] = 0;
  boardInfo.mapHeight[x] -= 1;
}

function canPutPieceToSelectedCol(boardInfo: BoardInfo, rulesInfo: RulesInfo, x: number, turn: number): boolean {
  switch (boardInfo.mapHeight[x]) {
    case rulesInfo.colSize - 1: return true;
    case rulesInfo.colSize: return false;
    default: break;
  }
  putPiece(boardInfo, x, turn);
  putPiece(boardInfo, x, -turn);
  if (isLine(boardInfo, rulesInfo, x, getY(boardInfo, x), -turn)) {
    excludePiece(boardInfo, x);
    excludePiece(boardInfo, x);
    return false; // 空中リーチあり。置けない事が判明
  }
  excludePiece(boardInfo, x);
  excludePiece(boardInfo, x);
  return true;
}

function canPutPieceToSelectedColForPlayout(
  boardInfo: BoardInfo, rulesInfo: RulesInfo, x: number, turn: number): boolean {
  if (boardInfo.mapHeight[x] >= rulesInfo.colSize - 1) {
    return false;
  }
  putPiece(boardInfo, x, turn);
  putPiece(boardInfo, x, -turn);
  if (isLine(boardInfo, rulesInfo, x, getY(boardInfo, x), -turn)) {
    excludePiece(boardInfo, x);
    excludePiece(boardInfo, x);
    return false; // 空中リーチあり。置けない事が判明
  }
  excludePiece(boardInfo, x);
  excludePiece(boardInfo, x);
  return true;
}

function isLine(boardInfo: BoardInfo, rulesInfo: RulesInfo, x: number, y: number, turn: number): boolean {
  let RL = 0;
  let RULD = 0;
  let LURD = 0;
  let UD = 0;
  for (let i = -rulesInfo.line + 1; i <= rulesInfo.line - 1; i++) {
    if (x + i >= 0 && x + i <= rulesInfo.colSize - 1) {
      // 左右
      if (boardInfo.map[y][x + i] === turn) {
        if (RL === rulesInfo.line - 1) return true;
        RL++;
      } else RL = 0;
      // 左下～右上
      if ((y + i >= 0 && y + i <= rulesInfo.colSize - 1)
        && boardInfo.map[y + i][x + i] === turn) {
        if (RULD === rulesInfo.line - 1) return true;
        RULD++;
      } else RULD = 0;
      // 左上～右下
      if ((y + i * -1 >= 0 && y + i * -1 <= rulesInfo.colSize - 1)
        && boardInfo.map[y + i * -1][x + i] === turn) {
        if (LURD === rulesInfo.line - 1) return true;
        LURD++;
      } else LURD = 0;
    }
    if (i >= 0 && RL + RULD + LURD === 0) break;
  }

  if (y - rulesInfo.line + 1 < 0) return false;

  for (let i = 0; i < rulesInfo.line; i++) {
    if (boardInfo.map[y - i][x] === turn) {
      if (UD === rulesInfo.line - 1) return true;
      UD++;
    } else return false;
  }
  return false;
}

function getY(boardInfo: BoardInfo, x: number): number {
  return boardInfo.mapHeight[x] - 1;
}

function getRange(boardInfo: BoardInfo, rulesInfo: RulesInfo): CanPutRange {
  const record1 = Number(boardInfo.gameRecord[boardInfo.gameRecord.length - 1]);
  const record2 = Number(boardInfo.gameRecord[boardInfo.gameRecord.length - 2]);
  const start = record1 < record2 ? record1 : record2;
  const end = record1 < record2 ? record2 : record1;
  return {
    start: start - (rulesInfo.line - 1) < 0 ? 0 : start - (rulesInfo.line - 1),
    end: end + (rulesInfo.line - 1) > (rulesInfo.colSize - 1)
      ? (rulesInfo.colSize - 1) : end + (rulesInfo.line - 1),
  };
}

function getRangeForContinuityReach(rulesInfo: RulesInfo, x: number): CanPutRange {
  return {
    start: x - (rulesInfo.line - 1) < 0 ? 0 : x - (rulesInfo.line - 1),
    end: x + (rulesInfo.line - 1) > (rulesInfo.colSize - 1)
      ? (rulesInfo.colSize - 1) : x + (rulesInfo.line - 1),
  };
}

function checkLine(boardInfo: BoardInfo, rulesInfo: RulesInfo, range: CanPutRange, turn: number) {
  for (let x = range.start; x <= range.end; x++) {
    if (isCeilingForSelectedCol(boardInfo, rulesInfo, x)) continue;
    putPiece(boardInfo, x, turn);
    if (isLine(boardInfo, rulesInfo, x, getY(boardInfo, x), turn)) {
      excludePiece(boardInfo, x);
      return x;
    }
    excludePiece(boardInfo, x);
  }
  return -1;
}

function checkDoubleReach(boardInfo: BoardInfo, rulesInfo: RulesInfo, range: CanPutRange, turn: number): number {
  for (let x = range.start; x <= range.end; x++) {
    if (!canPutPieceToSelectedCol(boardInfo, rulesInfo, x, turn)) continue;
    putPiece(boardInfo, x, turn);
    const resultRange = getRange(boardInfo, rulesInfo);
    const resultCheckReach = checkLine(boardInfo, rulesInfo, resultRange, turn);
    if (resultCheckReach === -1) { // CPUがリーチしなかった
      excludePiece(boardInfo, x);
      continue;
    }
    if (isCeilingForSelectedCol(boardInfo, rulesInfo, resultCheckReach)) {
      excludePiece(boardInfo, x);
      continue;
    }
    putPiece(boardInfo, resultCheckReach, -turn);
    if (checkLine(boardInfo, rulesInfo, resultRange, turn) >= 0) {
      excludePiece(boardInfo, resultCheckReach);
      excludePiece(boardInfo, x);
      return x;
    }
    excludePiece(boardInfo, resultCheckReach);
    excludePiece(boardInfo, x);
  }
  return -1;
}

function isCeilingForSelectedCol(boardInfo: BoardInfo, rulesInfo: RulesInfo, x: number): boolean {
  return boardInfo.mapHeight[x] === rulesInfo.colSize;
}

function checkContinuityReach(boardInfo: BoardInfo, rulesInfo: RulesInfo, range: CanPutRange, turn: number): number {
  for (let x = range.start; x <= range.end; x++) {
    // 既に天井で積めなかった場合
    if (!canPutPieceToSelectedCol(boardInfo, rulesInfo, x, turn)) continue;
    putPiece(boardInfo, x, turn);
    const resultRange1 = getRangeForContinuityReach(rulesInfo, x);
    const resultCheckReach1 = checkLine(boardInfo, rulesInfo, resultRange1, turn);
    // CPUがリーチしなかった
    if (resultCheckReach1 === -1) {
      excludePiece(boardInfo, x);
      continue;
    }
    // CPUがリーチしたのでプレイヤーが防ぐ
    if (isCeilingForSelectedCol(boardInfo, rulesInfo, resultCheckReach1)) {
      excludePiece(boardInfo, x);
      continue;
    }
    putPiece(boardInfo, resultCheckReach1, -turn);
    // CPUが1手前でプレイヤーのリーチ防ぎ、かつプレイヤーがリーチしている
    if (checkLine(boardInfo, rulesInfo, resultRange1, turn) >= 0) {
      excludePiece(boardInfo, resultCheckReach1);
      excludePiece(boardInfo, x);
      return x; // 終了
    }
    const resultRange2 = getRangeForContinuityReach(rulesInfo, resultCheckReach1);
    const resultCheckDoubleReach = checkDoubleReach(boardInfo, rulesInfo, resultRange2, -turn);
    // 防いだらプレイヤーがWリーチしてしまった
    if (resultCheckDoubleReach >= 0) {
      excludePiece(boardInfo, resultCheckReach1);
      excludePiece(boardInfo, x);
      continue;
    }
    const resultCheckReach2 = checkLine(boardInfo, rulesInfo, resultRange2, -turn);
    // 防いだらプレイヤーがリーチしてしまった
    if (resultCheckReach2 >= 0) {
      resultRange2.start = resultCheckReach2;
      resultRange2.end = resultCheckReach2;
    }
    // =============================再帰
    const resultCheckContinuityReach = checkContinuityReach(boardInfo, rulesInfo, resultRange2, turn);
    // =============================
    excludePiece(boardInfo, resultCheckReach1);
    excludePiece(boardInfo, x);
    if (resultCheckContinuityReach >= 0) return x;
  }
  return -1;
}

function getPlayoutSelectableCol(boardInfo: BoardInfo, rulesInfo: RulesInfo, turn: number): number {
  let count = 0;
  do {
    const x = Math.floor(Math.random() * rulesInfo.colSize);
    if (canPutPieceToSelectedCol(boardInfo, rulesInfo, x, turn)) return x;
    count++;
  } while (count <= 50);
  return getSelectableCol(boardInfo, rulesInfo);
}

function isDraw(boardInfo: BoardInfo, rulesInfo: RulesInfo): boolean {
  if (boardInfo.gameRecord.length >= rulesInfo.colSize ** 2 + 1) return true;
  return false;
}

function getSelectableCol(boardInfo: BoardInfo, rulesInfo: RulesInfo) {
  while (true) {
    const x = Math.floor(Math.random() * rulesInfo.colSize);
    if (!isCeilingForSelectedCol(boardInfo, rulesInfo, x)) return x;
  }
}

function checkWinOrLoss(
  boardInfo: BoardInfo, rulesInfo: RulesInfo, leafNode: RewardInfo, turn: number, x: number) {
  if (isLine(boardInfo, rulesInfo, x, getY(boardInfo, x), turn)) {
    leafNode.game.isEnd = true;
    leafNode.game.winner = turn;
    leafNode.isExpandable = false;
  }
}
