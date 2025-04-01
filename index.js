const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");
const app = express();
const port = 3000;
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

app.use(express.static(path.join(__dirname, "client")));

app.get("/", (req, res) => {
  res.sendFile("/index.html");
});

const rooms = new Set(["0", "1", "2"]);
const roomsInfo = [ //pak odeber, nech na testovani
  {
    roomNum: 1,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null,
    maxPlayers: 4
  },
  {
    roomNum: 2,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null,
    maxPlayers: 4
  },
  {
    roomNum: 3,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null,
    maxPlayers: 4
  },
];

io.on("connection", (socket) => {
  console.log(
    `User connected: ${socket.handshake.address}, ${socket.handshake.time}`
  );

  socket.on("save username", (data) => {
    socket.data.user = data;
  });

  //
  //
  // AI POUPRAVILO DISCONNECT, LEAVE ROOM A VYTVORILO SEND ROOM
  // kod mozna rewritnu jelikoz je zbytecne dlouhy (alespon si myslem(to moje nefungovalo ale byl jsem na spravne trase(alespon doufam)))
  //
  //


  socket.on("disconnect", () => {
    console.log(`${socket.data.user} disconnected`);
    if (socket.data.room) {
      const roomId = socket.data.room;
      const room = roomsInfo[roomId];

      // Check if the disconnected user is the room owner
      if (room && room.roomOwner === socket.data.user) {
        console.log(`Room owner ${socket.data.user} disconnected. Closing room ${roomId}`);

        // Get all sockets in this room
        const socketsInRoom = io.sockets.adapter.rooms.get(roomId);

        if (socketsInRoom) {
          // Notify all clients in the room that it's being closed
          io.to(roomId).emit("room closed", {
            message: "Room owner disconnected. Room is being closed."
          });

          // Disconnect all clients from the room
          for (const socketId of socketsInRoom) {
            const clientSocket = io.sockets.sockets.get(socketId);
            if (clientSocket && clientSocket.data.room === roomId) {
              clientSocket.data.room = null;
              clientSocket.leave(roomId);
            }
          }
        }

        // Delete the room from our data structures
        delete roomsInfo[roomId];
        rooms.delete(roomId);
      } else {
        // Regular user disconnection (not room owner)
        if (room) {
          room.users.delete(socket.data.user);
          socket.leave(roomId);
          io.to(roomId).emit("update room users", [...room.users]);
        }
      }

      // Update the room list for all clients
      sendRoomList();
    }
  });

  socket.on("leave room", (data) => {
    if (socket.data.room) {
      const roomId = socket.data.room;
      const room = roomsInfo[roomId];

      if (room) {
        // Check if the leaving user is the room owner
        if (room.roomOwner === socket.data.user) {
          console.log(`Room owner ${socket.data.user} left room ${roomId}. Closing room.`);

          // Get all sockets in this room
          const socketsInRoom = io.sockets.adapter.rooms.get(roomId);

          if (socketsInRoom) {
            // Notify all clients in the room that it's being closed
            io.to(roomId).emit("room closed", {
              message: "Room owner left. Room is being closed."
            });

            // Disconnect all clients from the room
            for (const socketId of socketsInRoom) {
              const clientSocket = io.sockets.sockets.get(socketId);
              if (clientSocket && clientSocket.data.room === roomId) {
                clientSocket.data.room = null;
                clientSocket.leave(roomId);
              }
            }
          }

          // Delete the room from our data structures
          delete roomsInfo[roomId];
          rooms.delete(roomId);

          // Reset the room data for this socket
          socket.data.room = null;

          // Emit a confirmation to the client
          socket.emit("leave room", {
            message: "Room closed successfully",
            status: 1
          });
        } else {
          // Regular user leaving (not room owner)
          room.users.delete(socket.data.user);
          socket.leave(roomId);

          // Update the room users list for other users in the room
          io.to(roomId).emit("update room users", [...room.users]);

          // Reset the room data for this socket
          socket.data.room = null;

          // hej sem dej poslat zpravu abys 'owner' a 'test' nastavil na nic
          // ted se mi to nechce delat
          // rovnou ti pripomenu ze nektery veci jsou kontrolovany jen pres clientside a ne serverside
          // koukni se do actual karet az budes doma a zkontroluj ty 'details'

          // Emit a confirmation to the client
          socket.emit("leave room", {
            message: "Room left successfully",
            status: 1
          });
        }

        // Send updated room list to all clients
        sendRoomList();
      }
    } else {
      socket.emit("leave room", {
        message: "You are not in a room",
        status: 0
      });
    }
  });

  socket.on("create room", (roomName, newMaxPlayers, isPrivate) => {
    rooms.add(roomName);
    const createdRoom = roomName;
    if (!roomsInfo[createdRoom]) {
      roomsInfo[createdRoom] = {
        roomNum: roomName, //lmao
        users: new Set(),
        gameActive: false,
        gameData: null,
        roomOwner: socket.data.user,
        maxPlayers: parseInt(newMaxPlayers),
        isPrivate: isPrivate
      };
    }

    console.log(`Room created: ${roomName} by ${socket.data.user} with ${newMaxPlayers} as max players. Private: ${isPrivate}`);
    let roomOwner = socket.data.user;
    let letMaxPlayers = newMaxPlayers;
    socket.emit("get owner", roomOwner);
    socket.emit("get max players", letMaxPlayers);

    sendRoomList();
  });

  socket.on("join room", (data) => {
    if (rooms.has(data.roomNum)) {
      if (roomsInfo[data.roomNum] && roomsInfo[data.roomNum].gameActive) {
        const payload = {
          message: "Game already in progress",
          status: 0,
        };
        return socket.emit("join room", payload);
      }

      if (roomsInfo[data.roomNum] && roomsInfo[data.roomNum].users.size >= roomsInfo[data.roomNum].maxPlayers) {
        const payload = {
          message: "Room is full",
          status: 0,
        };
        return socket.emit("join room", payload);
      }

      if (socket.data.room) {
        roomsInfo[socket.data.room].users.delete(socket.data.user);
        socket.leave(socket.data.room);
        io.to(socket.data.room).emit("update room users", [
          ...roomsInfo[socket.data.room].users,
        ]);
      }

      roomsInfo[data.roomNum].users.add(socket.data.user);
      socket.join(data.roomNum);
      socket.data.room = data.roomNum;
      console.log(roomsInfo[data.roomNum].users);
      const payload = {
        message: "Room joined",
        status: 1,
        roomNum: data.roomNum,
      };
      io.to(data.roomNum).emit("update room users", [
        ...roomsInfo[data.roomNum].users,
      ]);

      if (roomsInfo[data.roomNum].roomOwner) {
        socket.emit("get owner", roomsInfo[data.roomNum].roomOwner);
      }
      sendRoomList();

      return socket.emit("join room", payload);
    }
    const payload = {
      message: "Room does not exist",
      status: 0,
    };
    socket.emit("join room", payload);
  });

  socket.on("get rooms", () => {
    sendRoomList();
  });

  function sendRoomList() {
    const roomsWithCounts = [...rooms].map(roomNum => {
      if (roomsInfo[roomNum]) {
        return {
          roomNum: roomNum,
          playerCount: roomsInfo[roomNum].users.size,
          maxPlayers: roomsInfo[roomNum].maxPlayers || 4,
          isPrivate: roomsInfo[roomNum].isPrivate || false
        };
      } else {
        return {
          roomNum: roomNum,
          playerCount: 0,
          maxPlayers: 4,
          isPrivate: false
        };
      }
    }).filter(room => !room.isPrivate);

    io.emit("get rooms", roomsWithCounts);
  }

  socket.on("lick", (numberOfCookies) => {
    let fruser = socket.data.user;
    io.emit("get values", numberOfCookies, fruser);
    console.log(fruser + numberOfCookies);
  });

  socket.on("start game", ({ room, gameData }) => {
    if (!roomsInfo[room]) return;

    if (roomsInfo[room].roomOwner !== socket.data.user) {
      return socket.emit("error", { message: "Only room owner can start the game" });
    }

    roomsInfo[room].gameActive = true;
    roomsInfo[room].gameData = gameData;

    const sheriff = gameData.find(player => player.role === "Sheriff");
    roomsInfo[room].currentTurn = sheriff ? sheriff.username : null;
    io.to(room).emit("game started", gameData);

    console.log(`Game started in room ${room}`);
  });

  socket.on("update turn", (playerUsername) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room) return;

    if (room.currentTurn && room.currentTurn !== socket.data.user) {
      console.log(`Turn update rejected: ${socket.data.user} tried to update turn when it's ${room.currentTurn}'s turn`);
      return;
    }

    room.currentTurn = playerUsername;
    console.log(`Turn updated in room ${socket.data.room}: ${playerUsername}'s turn`);

    io.to(socket.data.room).emit("update turn", playerUsername);
  });

  socket.on("update card count", (playerUsername, cardCount) => {
    if (!socket.data.room) return;

    if (playerUsername !== socket.data.user) {
      console.log(`Card count update rejected: ${socket.data.user} tried to update ${playerUsername}'s card count`);
      return;
    }

    console.log(`Card count updated for ${playerUsername} in room ${socket.data.room}: ${cardCount} cards`);
    io.to(socket.data.room).emit("update card count", playerUsername, cardCount);
  });

  socket.on("get cards", (cards) => {
    if (cards) {
      if (socket.data.room) {
        roomsInfo[socket.data.room].cards = cards;
        roomsInfo[socket.data.room].gameDeck = [...cards];
        console.log(`Cards for room ${socket.data.room} with ${cards.length} cards`);
      }

      if (socket.data.room) {
        io.to(socket.data.room).emit("get cards", cards);
      } else {
        console.log("you are not in a room")
      }
    }
    else if (socket.data.room && roomsInfo[socket.data.room].cards) {
      socket.emit("get cards", roomsInfo[socket.data.room].cards);
    }
  });

  socket.on("update attributes", (playerUsername, attributes) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (playerUsername !== socket.data.user) {
      console.log(`Attributes update rejected: ${socket.data.user} tried to update ${playerUsername}'s attributes`);
      return;
    }

    const playerData = room.gameData.find(player => player.username === playerUsername);
    if (playerData) {
      playerData.attributes = attributes;
      console.log(`${playerUsername} updated attributes in room ${socket.data.room}`);
    }

    io.to(socket.data.room).emit("update attributes", playerUsername, attributes);
  });

  socket.on("draw card", () => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];

    if (!room || !room.gameDeck || room.gameDeck.length === 0) {
      console.log(`no cards left in deck for room ${socket.data.room} or room does not exist or room doesn't have a deck`);
      socket.emit("draw card result", { success: false, message: "no cards left in deck (or doesn't have a deck somehow)" });
      return;
    }

    if (room.currentTurn !== socket.data.user) {
      console.log(`draw card rejected: ${socket.data.user} tried to draw when it's ${room.currentTurn}'s turn`);
      socket.emit("draw card result", { success: false, message: "not your turn" });
      return;
    }

    const drawnCard = room.gameDeck.pop();
    console.log(`${socket.data.user} drew card ${drawnCard.name} (${drawnCard.details}) in room ${socket.data.room}`);

    socket.emit("draw card result", {
      success: true,
      card: drawnCard,
      remainingCards: room.gameDeck.length
    });
  });




  socket.on("play bang", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Bang play rejected: ${socket.data.user} tried to play Bang! when it's ${room.currentTurn}'s turn`);
      return;
    }

    console.log(`${socket.data.user} played Bang! targeting ${data.target} in room ${socket.data.room}`);
    io.to(socket.data.room).emit("bang attack", {
      attacker: socket.data.user,
      target: data.target,
      card: data.card
    });
  });

  socket.on("use missed", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    console.log(`${socket.data.user} used Missed! to avoid Bang! from ${data.attacker} in room ${socket.data.room}`);

    io.to(socket.data.room).emit("attack missed", {
      defender: socket.data.user,
      attacker: data.attacker
    });
  });

  socket.on("take damage", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData) return;

    playerData.hp -= data.amount;
    console.log(`${socket.data.user} took ${data.amount} damage from ${data.attacker}, HP now: ${playerData.hp}`);

    io.to(socket.data.room).emit("player damaged", {
      player: socket.data.user,
      attacker: data.attacker,
      amount: data.amount,
      currentHP: playerData.hp
    })

    if (playerData.champion === "Bart Cassidy") {
      const drawnCard = room.gameDeck.pop();
      console.log(`${socket.data.user} drew card ${drawnCard.name} (${drawnCard.details}) in room ${socket.data.room}`);

      socket.emit("draw card result", {
        success: true,
        card: drawnCard,
        remainingCards: room.gameDeck.length
      });
    }
  });

  socket.on("heal self", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData) return;

    playerData.hp += data.amount;
    console.log(`${socket.data.user} healed for  ${data.amount}, HP now: ${playerData.hp}`);

    io.to(socket.data.room).emit("player healed", {
      player: socket.data.user,
      amount: data.amount,
      currentHP: playerData.hp
    });

    if (playerData.hp <= 0) {
      console.log(`${socket.data.user} was eliminated!`);
      io.to(socket.data.room).emit("player eliminated", {
        player: socket.data.user,
        attacker: data.attacker
      });

    }
  });
});



server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});