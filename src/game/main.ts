/**
 * ゲームのメイン処理
 */

import { Game } from './game';

// デバッグ用
import { Render } from './render';
import { Rules } from './rules';
import { Events } from './events';
import { Myself, Rival } from './players';
import { AI } from './ai';
import { Board } from './board';

window.onload = () => {
  const game = new Game();
  switch (sessionStorage.getItem('mode')) {
    case 'pvc':
      game.initializePVC();
      new MainPVC();
      break;
    case 'pvp':
      game.initializePVP();
      new MainPVP();
      break;
    default:
      window.alert('不正なページ遷移です。トップページへ戻ります。');
      window.location.href = './index.html';
      break;
  }
};

window.onerror = (message: any) => {
  console.error(message);
  window.alert('エラーが発生しました。トップページへ戻ります。');
  window.location.href = './index.html';
};

class MainPVC {
  constructor() {
    if (Rules.getRulesInfo().debug) {
      $('.debug').fadeIn();
    } else {
      $('.debug').hide();
    }
    $('#top').val('TOPへ');
    $('#restart').val('再戦');
    $('#top').click(() => {
      window.location.href = './index.html';
    });
    $('#restart').click(() => {
      const game = new Game();
      game.initializePVC();
      const playoutNumber = Number($('#debug_setting_playoutNumber').val());
      const playoutThreshold = Number($('#debug_setting_playoutThreshold').val());
      const rules = new Rules();
      rules.setPlayoutNumber(playoutNumber);
      rules.setPlayoutThreshold(playoutThreshold);
    });
    $('#debug_run_function').click(() => {
      console.clear();
      // console.table(Board.getBoardInfo().map.reverse());
      // Board.getBoardInfo().map.reverse();
      // console.dir(`mapHeight: ${Board.getBoardInfo().mapHeight}`);
      console.log(Rules.getRulesInfo());

      // const rival = new Rival();
      // console.log(AI.checkContinuityReach(AI.getRange(), rival.getPlayerInfo().turn));
      // console.log(AI.getRange());
      // const render = new Render();
      // const worker = new Worker('worker.js');
      // let progressNumber = 0;
      // worker.addEventListener('message', message => {
      //   if (message.data) {
      //     console.log(message.data);
      //     render.removePlayersInfoForRivalProgress();
      //   } else {
      //     progressNumber++;
      //     render.chengePlayersInfoForRivalProgress(progressNumber, Rules.getRulesInfo().playoutNumber);
      //   }
      // });
      // worker.postMessage({
      //   turn: 1,
      //   // cpuTurn: Rival.getPlayerInfo().turn,
      //   cpuTurn: 1,
      //   playoutNumber: Rules.getRulesInfo().playoutNumber,
      //   playoutThreshold: Rules.getRulesInfo().playoutThreshold,
      //   rulesInfo: Rules.getRulesInfo(),
      //   boardInfo: Board.getBoardInfo(),
      // });
    });
    $('#debug_returnBoard').click(() => {
      const game = new Game();
      game.returnBoard();
      $('#restart').prop('disabled', false);
    });
    $('#debug_gameRecord').click(() => {
      console.log(Board.getBoardInfo().gameRecord.join(','));
    });
    $('#debug_setting').click(() => {
      Events.removeMouseEvents();
      const rules = new Rules();
      const playoutNumber = rules.getRulesInfo().playoutNumber;
      const playoutThreshold = rules.getRulesInfo().playoutThreshold;
      $('#debug_setting_playoutNumber').val(playoutNumber);
      $('#debug_setting_playoutThreshold').val(playoutThreshold);
    });
    $('#debug_setting_ok').click(() => {
      if (!isFinite(Number($('#debug_setting_playoutNumber').val()))
        || !isFinite(Number($('#debug_setting_playoutThreshold').val()))) {
        return;
      }
      const playoutNumber = Number($('#debug_setting_playoutNumber').val());
      const playoutThreshold = Number($('#debug_setting_playoutThreshold').val());
      const rules = new Rules();
      rules.setPlayoutNumber(playoutNumber);
      rules.setPlayoutThreshold(playoutThreshold);
    });
    $('#debug_setting_modal').on('hidden.bs.modal', () => {
      if (Game.getGameInfo().currentTurn === Myself.getPlayerInfo().turn) Events.setMouseEventsPVC();
    });

    const rules = new Rules();
    const playoutNumber = rules.getRulesInfo().playoutNumber;
    const playoutThreshold = rules.getRulesInfo().playoutThreshold;
    $('#debug_setting_playoutNumber').val(playoutNumber);
    $('#debug_setting_playoutThreshold').val(playoutThreshold);
  }
}

export class MainPVP {
  static gameIO = io.connect('/game.html');
  constructor() {
    if (sessionStorage.getItem('status') === 'playing') {
      window.alert('画面が更新されました。トップページへ戻ります。');
      window.location.href = './index.html';
      return;
    }

    const gameIO = MainPVP.getGameIO();
    if (Rules.getRulesInfo().debug) {
      $('.debug').fadeIn();
    } else {
      $('.debug').hide();
    }
    $('#top').val('退出');
    $('#restart').val('再戦');
    $('#debug_run_function').click(() => {
      console.clear();
      console.log(Rules.getRulesInfo());
      $('#restart').fadeIn();
    });
    $('#restart').click(() => {
      gameIO.emit('initialize', sessionStorage.getItem('roomName'));
    });
    $('#top').click(() => {
      gameIO.emit('leaveRoom', sessionStorage.getItem('roomName'));
      window.location.href = './index.html';
    });

    if (sessionStorage.getItem('role') === 'host') {
      gameIO.emit('createRoom', sessionStorage.getItem('roomName'));
    } else {
      const data: any = {};
      data['roomName'] = sessionStorage.getItem('roomName');
      data['guestName'] = sessionStorage.getItem('myselfName');
      gameIO.emit('joinRoom', data);
    }

    // host
    gameIO.on('joinedGuest', (guestName: any) => {
      sessionStorage.setItem('rivalName', String(guestName));
      const data: any = {};
      data['hostName'] = sessionStorage.getItem('myselfName');
      data['hostIsFirst'] = sessionStorage.getItem('myselfIsFirst');
      data['hostPieceImage'] = sessionStorage.getItem('myselfPieceImage');
      data['guestPieceImage'] = sessionStorage.getItem('rivalPieceImage');
      data['colSize'] = sessionStorage.getItem('colSize');
      data['line'] = sessionStorage.getItem('line');
      gameIO.emit('sendHostDataToGuest', data);
    });

    // guest
    gameIO.on('receiveHostDataFromHost', (data: any) => {
      sessionStorage.setItem('rivalName', data.hostName);
      sessionStorage.setItem('myselfIsFirst', data.hostIsFirst === 'true' ? 'false' : 'true');
      sessionStorage.setItem('myselfPieceImage', data.guestPieceImage);
      sessionStorage.setItem('rivalPieceImage', data.hostPieceImage);
      sessionStorage.setItem('colSize', data.colSize);
      sessionStorage.setItem('line', data.line);
      gameIO.emit('initialize');
    });

    // guest
    gameIO.on('joinRoomError', (errorMessage: string) => {
      window.alert(errorMessage);
      window.location.href = './index.html';
    });

    // 共通
    gameIO.on('putPiece', (selectedX: number) => {
      const game = new Game();
      game.putPieceOnBoardPVP(selectedX);
    });

    // 共通
    gameIO.on('onMouseOver', (selectedX: number) => {
      const render = new Render();
      render.removeBoardForMouseOverCol();
      render.createBoardForMouseOverCol(
        selectedX,
        Board.getBoardInfo().mapHeight[selectedX],
        Rival.getPlayerInfo().pieceImage,
      );
    });

    // 共通
    gameIO.on('onMouseOut', () => {
      const render = new Render();
      render.removeBoardForMouseOverCol();
    });

    // 共通
    gameIO.on('initialize', () => {
      sessionStorage.setItem('status', 'matching');
      const game = new Game();
      game.initializePVP();
    });

    // 共通
    gameIO.on('rivalDisconnect', (message: string) => {
      gameIO.emit('leaveRoom');
      window.alert(message);
      window.location.href = './index.html';
    });

    // 共通
    gameIO.on('disconnect', () => {
      window.alert('通信が切断されました。トップページへ戻ります。');
      window.location.href = './index.html';
    });
  }

  static getGameIO(): SocketIOClient.Socket {
    return MainPVP.gameIO;
  }
}
