/**
 * トップ画面
 */

import { pieceList } from '../dataSet/pieceList';
import { Rules } from '../game/rules';

window.onload = () => {
  const myselfName = String(sessionStorage.getItem('myselfName') || '');
  const roomName = String(sessionStorage.getItem('roomName') || '');
  $('#myselfName').val(myselfName);
  $('#roomName').val(roomName);
  sessionStorage.clear();
  sessionStorage.setItem('myselfName', String(myselfName));
  sessionStorage.setItem('roomName', String(roomName));
  new Index();
};

window.onerror = (message: any) => {
  console.error(message);
  window.alert('エラーが発生しました。');
};

class Index {
  static indexIO = io.connect('/index.html');
  constructor() {
    const indexIO = Index.getIndexIO();
    const DEFAULT_COL_SIZE = '8';
    const DEFAULT_LINE = '4';
    const KANJI_NUMBERS = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

    window.onpageshow = function (event) {
      if (event.persisted) {
        const indexIO = Index.getIndexIO();
        if (!indexIO.connected) {
          window.location.reload();
        }
      }
    };

    $('#createRoom').prop('disabled', $('#roomName').val() === '');
    $('#joinRoom').prop('disabled', !$('#roomList option:selected').val());
    $('#common_setting_colSize').val(DEFAULT_COL_SIZE);
    $('#common_setting_line').val(DEFAULT_LINE);
    sessionStorage.setItem('colSize', DEFAULT_COL_SIZE);
    sessionStorage.setItem('line', DEFAULT_LINE);
    $('#line').text(KANJI_NUMBERS[Number(DEFAULT_LINE) - 1]);

    $('#start-pvc-myself').click(() => {
      let myselfName = $('#myselfName').val();
      if (myselfName === '') {
        myselfName = 'プレイヤー';
      }

      const randomPieceNumberForMyself = Math.floor(Math.random() * pieceList.length);
      let randomPieceNumberForRival = 0;
      while (pieceList.length > 1) {
        const randomPieceNumber = Math.floor(Math.random() * pieceList.length);
        if (randomPieceNumberForMyself !== randomPieceNumber) {
          randomPieceNumberForRival = randomPieceNumber;
          break;
        }
      }

      sessionStorage.setItem('myselfName', String(myselfName));
      sessionStorage.setItem('myselfIsFirst', 'true');
      sessionStorage.setItem('mode', 'pvc');
      sessionStorage.setItem('myselfPieceImage', pieceList[randomPieceNumberForMyself]);
      sessionStorage.setItem('rivalName', 'コンピュータ');
      sessionStorage.setItem('rivalPieceImage', pieceList[randomPieceNumberForRival]);
      sessionStorage.setItem('victoryCountForMyself', '0');
      sessionStorage.setItem('victoryCountForRival', '0');
      this.checkiOS(indexIO);
      window.location.href = './game.html';
    });
    $('#start-pvc-rival').click(() => {
      let myselfName = $('#myselfName').val();
      if (myselfName === '') {
        myselfName = 'プレイヤー';
      }

      const randomPieceNumberForMyself = Math.floor(Math.random() * pieceList.length);
      let randomPieceNumberForRival = 0;
      while (pieceList.length > 1) {
        const randomPieceNumber = Math.floor(Math.random() * pieceList.length);
        if (randomPieceNumberForMyself !== randomPieceNumber) {
          randomPieceNumberForRival = randomPieceNumber;
          break;
        }
      }

      sessionStorage.setItem('myselfName', String(myselfName));
      sessionStorage.setItem('myselfIsFirst', 'false');
      sessionStorage.setItem('mode', 'pvc');
      sessionStorage.setItem('myselfPieceImage', pieceList[randomPieceNumberForMyself]);
      sessionStorage.setItem('rivalName', 'コンピュータ');
      sessionStorage.setItem('rivalPieceImage', pieceList[randomPieceNumberForRival]);
      sessionStorage.setItem('victoryCountForMyself', '0');
      sessionStorage.setItem('victoryCountForRival', '0');
      this.checkiOS(indexIO);
      window.location.href = './game.html';
    });
    $('#myselfName').on('keydown keyup keypress change', () => {
      const myselfName = String($('#myselfName').val());
      sessionStorage.setItem('myselfName', myselfName);
    });
    $('#roomName').on('keydown keyup keypress change', () => {
      const roomName = String($('#roomName').val());
      sessionStorage.setItem('roomName', roomName);
      if ($('#roomName').val() === '') {
        $('#createRoom').prop('disabled', true);
      } else {
        $('#createRoom').prop('disabled', false);
      }
    });
    $('#roomList').change(() => {
      if (!$('#roomList option:selected').val()) {
        $('#joinRoom').prop('disabled', true);
      } else {
        $('#joinRoom').prop('disabled', false);
      }
    });
    $('#validateRoomName').submit((e) => {
      const roomName = String($('#roomName').val());
      indexIO.emit('validateRoomName', roomName);
      e.preventDefault();
    });
    $('#validateJoinRoom').submit((e) => {
      const data: any = {};
      data['guestName'] = $('#myselfName').val();
      data['roomName'] = $('#roomList option:selected').val();
      indexIO.emit('validateJoinRoom', data);
      e.preventDefault();
    });
    $('#common_setting').click(() => {
      const colSize = Number(sessionStorage.getItem('colSize'));
      const line = Number(sessionStorage.getItem('line'));
      $('#common_setting_colSize').val(colSize);
      $('#common_setting_line').val(line);
    });
    $('#common_setting_ok').click(() => {
      const colSize = String($('#common_setting_colSize').val());
      const line = String($('#common_setting_line').val());
      sessionStorage.setItem('colSize', colSize);
      sessionStorage.setItem('line', line);
      $('#line').text(KANJI_NUMBERS[Number(line) - 1]);
    });
    $('#updateRoomList').click(() => {
      indexIO.emit('updateRoomListToMyself');
    });

    // host
    indexIO.on('createRoomError', (errorMessage: string) => {
      $('#createRoomError').text(errorMessage);
    });

    // host
    indexIO.on('createRoom', () => {
      const myselfName = String($('#myselfName').val());
      const roomName = String($('#roomName').val());
      const myselfIsFirst = $('#turn input[type=radio]:checked').val();
      const randomPieceNumberForMyself = Math.floor(Math.random() * pieceList.length);

      let randomPieceNumberForRival = 0;
      while (pieceList.length > 1) {
        const randomPieceNumber = Math.floor(Math.random() * pieceList.length);
        if (randomPieceNumberForMyself !== randomPieceNumber) {
          randomPieceNumberForRival = randomPieceNumber;
          break;
        }
      }

      sessionStorage.setItem('myselfName', myselfName);
      sessionStorage.setItem('roomName', roomName);
      sessionStorage.setItem('myselfIsFirst', myselfIsFirst === 'true' ? 'true' : 'false');
      sessionStorage.setItem('mode', 'pvp');
      sessionStorage.setItem('role', 'host');
      sessionStorage.setItem('myselfPieceImage', pieceList[randomPieceNumberForMyself]);
      sessionStorage.setItem('rivalPieceImage', pieceList[randomPieceNumberForRival]);
      sessionStorage.setItem('status', 'waiting');
      sessionStorage.setItem('victoryCountForMyself', '0');
      sessionStorage.setItem('victoryCountForRival', '0');
      this.checkiOS(indexIO);
      window.location.href = './game.html';
    });

    // host
    indexIO.on('joinRoomError', (errorMessage: string) => {
      $('#joinRoomError').text(errorMessage).show();
    });

    // guest
    indexIO.on('joinRoom', () => {
      // indexIO.emit('updateRoomListToAllMembers');
      const roomName: any = $('#roomList option:selected').val();
      sessionStorage.setItem('myselfName', String($('#myselfName').val()));
      sessionStorage.setItem('mode', 'pvp');
      sessionStorage.setItem('role', 'guest');
      sessionStorage.setItem('roomName', roomName);
      sessionStorage.setItem('status', 'waiting');
      sessionStorage.setItem('victoryCountForMyself', '0');
      sessionStorage.setItem('victoryCountForRival', '0');
      this.checkiOS(indexIO);
      window.location.href = './game.html';
    });

    // common
    indexIO.on('updateRoomList', (data: any) => {
      $('#joinRoomError').hide();
      this.updateRoomList(data);
    });

    // common
    indexIO.on('disconnect', () => {
      window.location.reload();
    });

    indexIO.emit('updateRoomListToMyself');
  }

  updateRoomList(data: any) {
    let optionValueStr = '';
    for (let i = 0; i < data.length; i++) {
      optionValueStr = `${optionValueStr}<option value='${data[i]}'>${data[i]}</option>`;
    }
    if (optionValueStr) {
      optionValueStr = `<option value='' disabled selected style='display:none;'>選択してください</option>${optionValueStr}`;
    } else {
      optionValueStr = "<option value='' disabled selected style='display:none;'>ルームは存在しません</option>";
    }
    $('#roomList').html(optionValueStr);
    $('#joinRoom').prop('disabled', !$('#roomList option:selected').val());
  }

  static getIndexIO(): SocketIOClient.Socket {
    return Index.indexIO;
  }

  private checkiOS(indexIO: SocketIOClient.Socket) {
    const ua = navigator.userAgent;
    const isIOS = ua.indexOf('iPhone') >= 0
      || ua.indexOf('iPad') >= 0
      || navigator.userAgent.indexOf('iPod') >= 0;
    if (isIOS) {
      indexIO.disconnect();
    }
  }
}
