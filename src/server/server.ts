import express = require('express');
import * as http from 'http';
import * as socketio from 'socket.io';

const PORT = 8081;

class Main {
  constructor() {
    const clients: any = {}; // ルームに参加したクライアント情報を格納する変数
    const app = express();
    const server: http.Server = http.createServer(app); // httpサーバーを設定する

    app.use(express.static('dist'));
    app.use((req, res, next) => {
      res.status(404);
      res.end('404:Page not found.');
    });

    // ルートアクセスの場合、index.htmlを表示
    app.get('/', (req, res) => {
      res.sendFile(`${__dirname}/index.html`);
    });

    server.listen(PORT); // サーバーを起動してリクエストを待ち受け状態にする
    const io = socketio.listen(server); // HTTPサーバにソケットをひも付ける（WebSocket有効化）
    const index = io.of('/index.html');
    index.on('connection', (socket) => {
      // host
      socket.on('validateRoomName', (roomName: string) => {
        // ルーム名が未入力の場合
        if (roomName === '') {
          index.to(socket.id).emit('createRoomError', 'ルーム名を入力してください。');
          return;
        }
        // 既に同名のルームが存在する場合
        if (roomName in game.adapter.rooms) {
          index.to(socket.id).emit('createRoomError', '別名を入力してください。');
          return;
        }
        index.to(socket.id).emit('createRoom');
      });

      // guest
      socket.on('validateJoinRoom', (data) => {
        const roomName = data.roomName;
        // ルームが存在しない場合
        if (!game.adapter.rooms[roomName]) {
          index.to(socket.id).emit('joinRoomError', 'ルームが存在しません。');
          return;
        }
        // 既に2人入室している場合
        if (game.adapter.rooms[roomName].length >= 2) {
          index.to(socket.id).emit('joinRoomError', 'ルームが満員です。');
          return;
        }
        index.to(socket.id).emit('joinRoom');
      });

      // 共通
      socket.on('updateRoomListToMyself', () => {
        index.to(socket.id).emit('updateRoomList', this.getRoomList(game));
      });

      // 共通
      // socket.on('updateRoomListToAllMembers', () => {
      //   socket.broadcast.emit('updateRoomList', this.getRoomList(game));
      // });
    });

    const game = io.of('/game.html');
    game.on('connection', (socket) => {
      // host
      socket.on('createRoom', (roomName) => {
        socket.join(roomName);
        // index.emit('updateRoomList', this.getRoomList(game));
        clients[socket.id] = roomName;
      });

      // guest
      socket.on('joinRoom', (data) => {
        if (!game.adapter.rooms[data.roomName]) {
          game.to(socket.id).emit('joinRoomError', 'ルームが存在しません。トップページへ戻ります。');
          return;
        }
        if (game.adapter.rooms[data.roomName].length >= 2) {
          game.to(socket.id).emit('joinRoomError', 'ルームが満員です。トップページへ戻ります。');
          return;
        }
        if (game.adapter.rooms[data.roomName]) {
          socket.join(data.roomName);
          // index.emit('updateRoomList', this.getRoomList(game));
          socket.broadcast.to(data.roomName).emit('joinedGuest', data.guestName);
          clients[socket.id] = data.roomName;
        }
      });

      // host
      socket.on('sendHostDataToGuest', (data) => {
        socket.broadcast.to(clients[socket.id]).emit('receiveHostDataFromHost', data);
      });

      // 共通
      socket.on('putPiece', (selectedX) => {
        socket.broadcast.to(clients[socket.id]).emit('putPiece', selectedX);
      });

      // 共通
      socket.on('onMouseOver', (selectedX) => {
        socket.broadcast.to(clients[socket.id]).emit('onMouseOver', selectedX);
      });

      // 共通
      socket.on('onMouseOut', () => {
        socket.broadcast.to(clients[socket.id]).emit('onMouseOut');
      });

      // 共通
      socket.on('initialize', () => {
        game.in(clients[socket.id]).emit('initialize');
      });

      // 共通
      socket.on('leaveRoom', () => {
        socket.leave(clients[socket.id]);
        // index.emit('updateRoomList', this.getRoomList(game));
      });

      // 共通
      socket.on('disconnect', () => {
        socket.broadcast.to(clients[socket.id]).emit('rivalDisconnect', '対戦相手が退出しました。トップページへ戻ります。');
        // index.emit('updateRoomList', this.getRoomList(game));
        delete clients[socket.id];
      });
    });
  }

  private getRoomList(io: socketio.Namespace) {
    const roomList: string[] = [];
    let sids: any = io.adapter.sids;
    sids = Object.keys(sids).map((key) => {
      return key;
    });

    Object.keys(io.adapter.rooms)
      .forEach((roomName) => {
        if (sids.indexOf(roomName) >= 0) {
          return;
        }
        if (io.adapter.rooms[roomName].length <= 1) {
          roomList.push(roomName);
        }
      });
    return roomList;
  }
}

new Main();
