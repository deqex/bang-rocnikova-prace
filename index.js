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
    maxPlayers: 4,
    gameDeck: null,
    discardPile: []
  },
  {
    roomNum: 2,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null,
    maxPlayers: 4,
    gameDeck: null,
    discardPile: []
  },
  {
    roomNum: 3,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null,
    maxPlayers: 4,
    gameDeck: null,
    discardPile: []
  },
];

const dynamiteState = {};

io.on("connection", (socket) => {
  console.log(
    `User connected: ${socket.handshake.address}, ${socket.handshake.time}`
  );

  // Helper function to add a card to the discard pile
  function addCardToDiscardPile(room, card) {
    if (!room.discardPile) {
      room.discardPile = [];
    }
    room.discardPile.push(card);
    console.log(`Card ${card.name} added to discard pile. Total cards: ${room.discardPile.length}`);

    if (room.roomNum) {
      io.to(room.roomNum).emit("discard pile update", {
        lastCard: card
      });
    }
  }

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
        isPrivate: isPrivate,
        gameDeck: null,
        discardPile: []
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

  socket.on("start game", ({ room, gameData }) => {
    if (!roomsInfo[room]) return;

    if (roomsInfo[room].roomOwner !== socket.data.user) {
      return socket.emit("error", { message: "Only room owner can start the game" });
    }

    roomsInfo[room].gameActive = true;
    roomsInfo[room].gameData = gameData;
    roomsInfo[room].discardPile = [];
    dynamiteState[room] = {
      pendingCheck: false,
      checkedPlayer: null
    };

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

    // Check if the player is eliminated
    const targetPlayer = room.gameData.find(p => p.username === playerUsername);
    if (targetPlayer && targetPlayer.hp <= 0) {
      console.log(`Skipping eliminated player ${playerUsername}'s turn`);
      
      // Find the next non-eliminated player
      const currentPlayerIndex = room.gameData.findIndex(p => p.username === playerUsername);
      let nextPlayerIndex = (currentPlayerIndex + 1) % room.gameData.length;
      let nextPlayer = room.gameData[nextPlayerIndex];
      
      // Skip players with HP <= 0 (eliminated)
      while (nextPlayer.hp <= 0 && nextPlayerIndex !== currentPlayerIndex) {
        // Move to the next player
        nextPlayerIndex = (nextPlayerIndex + 1) % room.gameData.length;
        nextPlayer = room.gameData[nextPlayerIndex];
        
        // If we've checked all players and returned to the current one, break
        if (nextPlayerIndex === currentPlayerIndex) {
          console.log("No active players left to take a turn");
          return;
        }
      }
      
      // Update to the next non-eliminated player
      playerUsername = nextPlayer.username;
    }

    room.currentTurn = playerUsername;
    console.log(`Turn updated in room ${socket.data.room}: ${playerUsername}'s turn`);

    io.to(socket.data.room).emit("update turn", playerUsername);

    const player = room.gameData.find(p => p.username === playerUsername);
    if (player && player.attributes && player.attributes.includes("Dynamite")) {
      dynamiteState[socket.data.room] = { pendingCheck: true, checkedPlayer: playerUsername };
      console.log(`Dynamite check initiated for ${playerUsername} in room ${socket.data.room}`);
      io.to(socket.data.room).emit("dynamite turn start", { player: playerUsername });
    } else {
      io.to(socket.data.room).emit("update turn", playerUsername);
    }
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

  socket.on("draw card", (numberOfDrawnCards) => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];
    const playerData = room.gameData.find(player => player.username === socket.data.user);

    // AI START - Prevent drawing if Dynamite check is pending
    if (dynamiteState[socket.data.room] && dynamiteState[socket.data.room].pendingCheck && dynamiteState[socket.data.room].checkedPlayer === socket.data.user) {
      console.log(`Draw card rejected: Dynamite check pending for ${socket.data.user}`);
      socket.emit("draw card result", { success: false, message: "Dynamite check pending" });
      return;
    }
    // AI END - Prevent drawing if Dynamite check is pending

    if (!room.gameDeck || room.gameDeck.length === 0) {
      if (room.discardPile.length > 0) {
        console.log(`Deck empty, shuffling discard pile with ${room.discardPile.length} cards`);
        room.gameDeck = shuffleArray([...room.discardPile]);
        room.discardPile = [];
        console.log(`New deck created with ${room.gameDeck.length} cards`);
      } else {
        console.log(`no cards left in deck for room ${socket.data.room}`);
        socket.emit("draw card result", { success: false, message: "no cards left in deck" });
        return;
      }
    }

    if (playerData.champion === "Suzy Laffayete") {
      console.log("gurt: yo")
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

  socket.on("discard card", (card) => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];

    if (room) {
      addCardToDiscardPile(room, card);
    }
  });

  socket.on("play bang", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Bang play rejected: ${socket.data.user} tried to play Bang! when it's ${room.currentTurn}'s turn`);
      return;
    }

    // Check if target player is eliminated
    const targetPlayer = room.gameData.find(player => player.username === data.target);
    if (!targetPlayer || targetPlayer.hp <= 0) {
      console.log(`Bang target rejected: ${data.target} is eliminated or doesn't exist`);
      socket.emit("error", { message: "Cannot target eliminated players" });
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} played Bang! targeting ${data.target} in room ${socket.data.room}`);

    io.to(socket.data.room).emit("bang attack", {
      attacker: socket.data.user,
      target: data.target,
      card: data.card
    });

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (playerData.champion === "Willy the Kid" || (playerData.attributes && playerData.attributes.includes("Volcanic"))) { 
      console.log(`${socket.data.user} has Volcanic/Willy, turn does not end automatically.`);
    } else {
      // Automatically end turn after a short delay for non-Volcanic/Willy players
      setTimeout(() => {
        // Ensure the room and gameData still exist after the delay
        const currentRoom = roomsInfo[socket.data.room];
        if (!currentRoom || !currentRoom.gameData) {
            console.log(`[Auto End Turn Delay] Room or gameData disappeared for room ${socket.data.room}`);
            return;
        }
        
        // Find the next non-eliminated player
        const currentPlayerIndex = currentRoom.gameData.findIndex(p => p.username === socket.data.user);
        // Check if player still exists (might have disconnected during delay)
        if (currentPlayerIndex === -1) {
            console.log(`[Auto End Turn Delay] Attacking player ${socket.data.user} not found.`);
            return;
        }
        
        let nextPlayerIndex = (currentPlayerIndex + 1) % currentRoom.gameData.length;
        let nextPlayer = currentRoom.gameData[nextPlayerIndex];
        let loopCheck = 0; // Prevent infinite loops if all others are eliminated
        const maxLoops = currentRoom.gameData.length + 1;

        // Skip players with HP <= 0 (eliminated)
        while (nextPlayer.hp <= 0 && loopCheck < maxLoops) {
          nextPlayerIndex = (nextPlayerIndex + 1) % currentRoom.gameData.length;
          nextPlayer = currentRoom.gameData[nextPlayerIndex];
          loopCheck++;
          
          // If we've checked all players and only found eliminated ones (or the original player)
          if (loopCheck >= maxLoops || nextPlayer.username === socket.data.user && nextPlayer.hp <= 0) {
            console.log("[Auto End Turn Delay] No active players left to take a turn after Bang!");
            // Potentially emit a game end event here or handle appropriately
            return; 
          }
        }
        
        // Only update turn if a valid next player was found
        if (nextPlayer.hp > 0) {
            currentRoom.currentTurn = nextPlayer.username;
            console.log(`[Auto End Turn Delay] Turn ended after Bang!: ${socket.data.user} -> ${nextPlayer.username}`);
            io.to(socket.data.room).emit("update turn", nextPlayer.username);
        } else {
             console.log(`[Auto End Turn Delay] Could not find a valid next player for ${socket.data.user}.`);
        }
      }, 200); // 200ms delay - adjust if needed
    }
  });

  socket.on("play indians", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Indians play rejected: ${socket.data.user} tried to play Indians! when it's ${room.currentTurn}'s turn`);
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} played Indians! in room ${socket.data.room}`);

    io.to(socket.data.room).emit("indians attack", {
      attacker: socket.data.user,
      card: data.card
    });
  });

  socket.on("defend indians", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (data.card) {
      addCardToDiscardPile(room, data.card);
    }

    console.log(`${socket.data.user} used Bang! to defend against Indians! from ${data.attacker} in room ${socket.data.room}`);

    io.to(socket.data.room).emit("indians defended", {
      defender: socket.data.user,
      attacker: data.attacker
    });
  });

  socket.on("play gatling", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Gatling play rejected: ${socket.data.user} tried to play Gatling when it's ${room.currentTurn}'s turn`);
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} played Gatling in room ${socket.data.room}`);

    io.to(socket.data.room).emit("gatling attack", {
      attacker: socket.data.user,
      card: data.card
    });
  });

  socket.on("use missed", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (data.card) {
      addCardToDiscardPile(room, data.card);
      console.log(`${socket.data.user} used Missed! to avoid Bang! from ${data.attacker} in room ${socket.data.room}`);
    }

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
    });


    if (playerData.hp <= 0) {
      console.log(`[Elimination Check - Damage] Player ${socket.data.user} HP <= 0.`);
      if (!playerData.eliminated) { 
        playerData.eliminated = true; 
        console.log(`[Elimination Check - Damage] Marked ${socket.data.user} as eliminated.`);
        
        const playerSocket = [...io.sockets.sockets.values()].find(
          s => s.data.user === socket.data.user && s.data.room === socket.data.room
        );
        
        if (playerSocket) {
          console.log(`[Elimination Check - Damage] Found socket for ${socket.data.user}, emitting 'discard all cards'.`);
          playerSocket.emit("discard all cards");
        } else {
          console.log(`[Elimination Check - Damage] Could not find socket for ${socket.data.user} to discard cards.`);
        }
        
        console.log(`[Elimination Check - Damage] Emitting 'player eliminated' for ${socket.data.user}.`);
        io.to(socket.data.room).emit("player eliminated", {
          player: socket.data.user,
          attacker: data.attacker
        });

        if (playerData.role === "Renegade" && data.attacker && data.attacker !== socket.data.user) {
          const attackerData = room.gameData.find(p => p.username === data.attacker);
          if (attackerData && attackerData.hp > 0) {
            console.log(`[Reward] ${data.attacker} eliminated Renegade ${socket.data.user}. Granting 3 card reward.`);
            const attackerSocket = [...io.sockets.sockets.values()].find(
              s => s.data.user === data.attacker && s.data.room === socket.data.room
            );

            if (attackerSocket) {
              let cardsDrawnCount = 0;
              for (let i = 0; i < 3; i++) {
                if (!room.gameDeck || room.gameDeck.length === 0) {
                  if (room.discardPile && room.discardPile.length > 0) {
                    console.log(`[Reward Draw] Deck empty, shuffling discard pile with ${room.discardPile.length} cards`);
                    room.gameDeck = shuffleArray([...room.discardPile]);
                    room.discardPile = [];
                    io.to(socket.data.room).emit("discard pile update", { lastCard: null }); 
                    console.log(`[Reward Draw] New deck created with ${room.gameDeck.length} cards`);
                  } else {
                    console.log(`[Reward Draw] No cards left in deck or discard for ${data.attacker}`);
                    break; 
                  }
                }
                const drawnCard = room.gameDeck.pop();
                if (drawnCard) {
                  console.log(`[Reward Draw] ${data.attacker} drew card ${drawnCard.name} (${drawnCard.details})`);
                  attackerSocket.emit("draw card result", {
                    success: true,
                    card: drawnCard,
                    remainingCards: room.gameDeck.length
                  });
                  cardsDrawnCount++;
                }
              }
              console.log(`[Reward] Granted ${cardsDrawnCount} cards to ${data.attacker}.`);
            } else {
              console.log(`[Reward] Could not find socket for attacker ${data.attacker}.`);
            }
          } else {
             console.log(`[Reward] Attacker ${data.attacker} is eliminated or not found, no reward for eliminating Renegade ${socket.data.user}.`);
          }
        } else if (playerData.role === "Renegade") {
             console.log(`[Reward] Renegade ${socket.data.user} eliminated, but attacker was self or undefined.`);
        }
      } else {
          console.log(`[Elimination Check - Damage] Player ${socket.data.user} was already marked eliminated.`);
      }
    }

    if (playerData.champion === "Bart Cassidy" && !playerData.eliminated) { 
      const drawnCard = room.gameDeck.pop();
      console.log(`${socket.data.user} drew card ${drawnCard.name} (${drawnCard.details}) in room ${socket.data.room}`);

      socket.emit("draw card result", {
        success: true,
        card: drawnCard,
        remainingCards: room.gameDeck.length
      });
    }
  });

  socket.on("el gringo ability", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData || playerData.champion !== "El Gringo") {
      console.log(`${socket.data.user} is not El Gringo`);
      return;
    }

    console.log(`${socket.data.user} (El Gringo) is drawing a card from ${data.attacker}`);

    io.to(socket.data.room).emit("el gringo draw", {
      target: socket.data.user,
      attacker: data.attacker
    });
  });

  socket.on("el gringo card taken", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    // AI if funkce
    if (data.from !== socket.data.user) {
      console.log(`${socket.data.user} tried to report a card taken from ${data.from}`);
      return;
    }

    console.log(`${data.to} took a ${data.card.name} from ${data.from} using El Gringo ability in room ${socket.data.room}`);

    // AI RADEK
    const targetSocket = [...io.sockets.adapter.rooms.get(socket.data.room)].map(id => io.sockets.sockets.get(id)).find(s => s.data.user === data.to);

    if (targetSocket) {
      targetSocket.emit("el gringo draw", {
        target: data.to,
        attacker: data.from,
        stolenCard: data.card
      });
    }
  });

  socket.on("heal self", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData) return;

    const newHp = Math.min(playerData.hp + data.amount, playerData.maxHP);
    const actualHealAmount = newHp - playerData.hp;
    playerData.hp = newHp;

    console.log(`${socket.data.user} healed for ${actualHealAmount} (limited by max HP), HP now: ${playerData.hp}/${playerData.maxHP}`);

    io.to(socket.data.room).emit("player healed", {
      player: socket.data.user,
      amount: actualHealAmount,
      currentHP: playerData.hp
    });


  });

  socket.on("play cat balou", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Cat Balou play rejected: ${socket.data.user} tried to play Cat Balou when it's ${room.currentTurn}'s turn`);
      return;
    }

    const targetPlayer = room.gameData.find(player => player.username === data.target);
    if (!targetPlayer) return;
    
    // Check if target player is eliminated
    if (targetPlayer.hp <= 0) {
      console.log(`Cat Balou target rejected: ${data.target} is eliminated`);
      socket.emit("error", { message: "Cannot target eliminated players" });
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} played Cat Balou targeting ${data.target} in room ${socket.data.room}`);

    if (data.action === "takeCard") {
      console.log(`${socket.data.user} played Cat Balou to take a card from ${data.target} in room ${socket.data.room}`);

      io.to(socket.data.room).emit("cat balou result", {
        attacker: socket.data.user,
        target: data.target,
        action: "takeCard"
      });
    }
    else if (data.action === "removeAttribute") {
      console.log(`${socket.data.user} played Cat Balou to remove attribute ${data.attribute} from ${data.target} in room ${socket.data.room}`);

      if (targetPlayer.attributes) {
        targetPlayer.attributes = targetPlayer.attributes.filter(attr => attr !== data.attribute);
      }

      io.to(socket.data.room).emit("cat balou result", {
        attacker: socket.data.user,
        target: data.target,
        action: "removeAttribute",
        attribute: data.attribute
      });

      io.to(socket.data.room).emit("update attributes", data.target, targetPlayer.attributes || []);
    }
  });

  socket.on("play panic", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Panic! play rejected: ${socket.data.user} tried to play Panic! when it's ${room.currentTurn}'s turn`);
      return;
    }

    const targetPlayer = room.gameData.find(player => player.username === data.target);
    if (!targetPlayer) return;
    
    // Check if target player is eliminated
    if (targetPlayer.hp <= 0) {
      console.log(`Panic target rejected: ${data.target} is eliminated`);
      socket.emit("error", { message: "Cannot target eliminated players" });
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} played Panic! targeting ${data.target} in room ${socket.data.room}`);

    if (data.action === "stealCard") {
      console.log(`${socket.data.user} played Panic! to steal a card from ${data.target} in room ${socket.data.room}`);

      io.to(socket.data.room).emit("panic result", {
        attacker: socket.data.user,
        target: data.target,
        action: "stealCard"
      });
    }
    else if (data.action === "stealAttribute") {
      console.log(`${socket.data.user} played Panic! to steal attribute ${data.attribute} from ${data.target} in room ${socket.data.room}`);

      if (targetPlayer.attributes) {
        targetPlayer.attributes = targetPlayer.attributes.filter(attr => attr !== data.attribute);
      }

      const attackerPlayer = room.gameData.find(player => player.username === socket.data.user);
      if (attackerPlayer) {
        if (!attackerPlayer.attributes) {
          attackerPlayer.attributes = [];
        }

        if (["Winchester", "Rev. Carabine", "Schofield", "Remington"].includes(data.attribute)) {
          const existingWeapon = attackerPlayer.attributes.find(attr =>
            ["Winchester", "Rev. Carabine", "Schofield", "Remington"].includes(attr));

          if (existingWeapon) {
            attackerPlayer.attributes = attackerPlayer.attributes.filter(attr => attr !== existingWeapon);
          }
        }

        attackerPlayer.attributes.push(data.attribute);
      }

      io.to(socket.data.room).emit("panic result", {
        attacker: socket.data.user,
        target: data.target,
        action: "stealAttribute",
        attribute: data.attribute
      });

      io.to(socket.data.room).emit("update attributes", data.target, targetPlayer.attributes || []);
      io.to(socket.data.room).emit("update attributes", socket.data.user, attackerPlayer?.attributes || []);
    }
  });

  socket.on("card stolen", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (data.from !== socket.data.user) {
      console.log(`Card stolen event rejected: ${socket.data.user} tried to report a card stolen from ${data.from}`);
      return;
    }

    console.log(`${data.to} stole a ${data.card.name} from ${data.from} in room ${socket.data.room}`);

    const attackerSocket = [...io.sockets.sockets.values()].find(
      s => s.data.user === data.to && s.data.room === socket.data.room
    );

    if (attackerSocket) {
      attackerSocket.emit("panic result", {
        attacker: data.to,
        target: data.from,
        action: "stealCard",
        stolenCard: data.card
      });
    }
  });

  socket.on("play general store", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData || !room.gameDeck) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`General Store play rejected: ${socket.data.user} tried to play General Store when it's ${room.currentTurn}'s turn`);
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} played General Store in room ${socket.data.room}`);

    const activePlayers = room.gameData.filter(p => p.hp > 0);
    const activePlayerCount = activePlayers.length;

    const availableCards = [];
    console.log(`[General Store] Drawing ${activePlayerCount} cards for ${activePlayerCount} active players.`);

    for (let i = 0; i < activePlayerCount && room.gameDeck.length > 0; i++) { 
      availableCards.push(room.gameDeck.pop());
    }

    console.log(`${socket.data.user} played General Store. Drew ${availableCards.length} cards.`);

    const playingPlayerIndex = room.gameData.findIndex(player => player.username === socket.data.user);
    let selectionOrder = [];
    const totalPlayers = room.gameData.length; 

    if (playingPlayerIndex !== -1) {
      for (let i = 0; i < totalPlayers; i++) { 
        const playerIndex = (playingPlayerIndex + i) % totalPlayers;
        const player = room.gameData[playerIndex];
        if (player.hp > 0) {
          selectionOrder.push(player.username);
        }
      }
    }

    // Set up the general store state with turn order
    room.generalStore = {
      cards: availableCards,
      playedBy: socket.data.user,
      selectedCards: {},
      selectionOrder: selectionOrder,
      currentSelectorIndex: 0
    };

    const currentSelector = selectionOrder[0];

    // Emit the general store event to all players
    io.to(socket.data.room).emit("general store cards", {
      cards: availableCards,
      playedBy: socket.data.user,
      currentSelector: currentSelector
    });
  });

  socket.on("select general store card", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.generalStore) {
      console.log(`General Store state not found for room ${socket.data.room}`);
      return;
    }

    // Debug the current state
    console.log("General Store state:", {
      currentSelector: room.generalStore.selectionOrder[room.generalStore.currentSelectorIndex],
      requestingPlayer: socket.data.user,
      selectionOrder: room.generalStore.selectionOrder,
      currentIndex: room.generalStore.currentSelectorIndex,
      remainingCards: room.generalStore.cards.length
    });

    // Check if it's this player's turn to select
    const currentSelector = room.generalStore.selectionOrder[room.generalStore.currentSelectorIndex];
    if (currentSelector !== socket.data.user) {
      console.log(`Card selection rejected: ${socket.data.user} tried to select when it's ${currentSelector}'s turn`);
      return;
    }

    // Check if the selected card is available
    const cardIndex = room.generalStore.cards.findIndex(
      card => card.name === data.card.name && card.details === data.card.details
    );

    if (cardIndex === -1) {
      console.log(`${socket.data.user} tried to select a card that's no longer available`);
      return;
    }

    // Remove the card from available cards
    const selectedCard = room.generalStore.cards.splice(cardIndex, 1)[0];

    // Record the selection
    room.generalStore.selectedCards[socket.data.user] = selectedCard;

    console.log(`${socket.data.user} selected ${selectedCard.name} from General Store`);

    // Notify all players about the selection
    io.to(socket.data.room).emit("general store card selected", {
      player: socket.data.user,
      card: selectedCard
    });

    // Move to the next selector
    room.generalStore.currentSelectorIndex++;

    // Debug the new state
    console.log("Updated index:", room.generalStore.currentSelectorIndex);
    console.log("Selection order length:", room.generalStore.selectionOrder.length);

    // Check if all players have selected a card
    if (room.generalStore.currentSelectorIndex >= room.generalStore.selectionOrder.length) {
      console.log("All players have selected. General Store complete.");
      // Notify all players that the general store is complete
      Object.keys(room.generalStore.selectedCards).forEach(player => {
        io.to(socket.data.room).emit("general store complete", {
          selectedBy: player,
          card: room.generalStore.selectedCards[player]
        });
      });

      // Clean up
      delete room.generalStore;
    } else {
      // Move to the next player's turn
      const nextSelector = room.generalStore.selectionOrder[room.generalStore.currentSelectorIndex];
      console.log(`Next selector: ${nextSelector}`);

      // Notify all players of the new selector
      io.to(socket.data.room).emit("general store update selector", {
        currentSelector: nextSelector
      });
    }
  });

  socket.on("suzy laffayete ability", () => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];
    const playerData = room.gameData.find(player => player.username === socket.data.user);

    if (!room.gameDeck || room.gameDeck.length === 0) {
      if (room.discardPile.length > 0) {
        console.log(`Deck empty, shuffling discard pile with ${room.discardPile.length} cards`);
        room.gameDeck = shuffleArray([...room.discardPile]);
        room.discardPile = [];
        console.log(`New deck created with ${room.gameDeck.length} cards`);
      } else {
        console.log(`no cards left in deck for room ${socket.data.room}`);
        socket.emit("draw card result", { success: false, message: "no cards left in deck" });
        return;
      }
    }

    if (!playerData.champion === "Suzy Laffayete") {
      console.log(`${socket.data.user} tried using Suzy Laffayete ability when their champion is ${playerData.champion}!`)
      return;
    }

    const drawnCard = room.gameDeck.pop();
    console.log(`${socket.data.user} drew card ${drawnCard.name} (${drawnCard.details}) in room ${socket.data.room}`);

    socket.emit("suzy laffayete card", {
      card: drawnCard,
      for: socket.data.user
    });
  })

  socket.on("kit carlson ability", () => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData || !room.gameDeck) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Kit Carlson ability rejected: ${socket.data.user} tried to use his ability when it's ${room.currentTurn}'s turn`);
      return;
    }

    const availableCards = [];

    for (let i = 0; i < 3; i++) {
      if (room.gameDeck.length > 0) {
        availableCards.push(room.gameDeck.pop());
      }
    }

    console.log(`${socket.data.user} used Kit Carlson ability. Drew ${availableCards.length} cards.`);

    room.kitCarlsonCards = {
      cards: availableCards,
      player: socket.data.user
    };

    socket.emit("kit carlson cards", {
      cards: availableCards,
      for: socket.data.user
    });
  });

  socket.on("kit carlson select", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.kitCarlsonCards) return;

    if (room.kitCarlsonCards.player !== socket.data.user) {
      console.log(`Kit Carlson selection rejected: ${socket.data.user} tried to select when it's ${room.kitCarlsonCards.player}'s turn`);
      return;
    }

    const selectedCards = data.selectedCards;
    const remainingCards = room.kitCarlsonCards.cards.filter(
      card => !selectedCards.some(selected => selected.name === card.name && selected.details === card.details
      )
    );

    remainingCards.reverse().forEach(card => {
      room.gameDeck.push(card);
    });

    delete room.kitCarlsonCards;
    const playerData = room.gameData.find(player => player.username === socket.data.user);

    if (playerData) {
      if (!playerData.hand) {
        playerData.hand = [];
      }
      playerData.hand.push(...selectedCards);
    }

    socket.emit("kit carlson complete", {
      selectedCards: selectedCards
    });

    io.to(socket.data.room).emit("update player hand", {
      player: socket.data.user,
      cards: playerData?.hand || []
    });
  });

  socket.on("check discard pile", () => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room) return; //paranoia coding

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData || playerData.champion !== "Pedro Ramirez") {
      console.log(`${socket.data.user} is not Pedro Ramirez`);
      return;
    }

    if (room.currentTurn !== socket.data.user) {
      console.log(`Pedro Ramirez ability rejected: not ${socket.data.user}'s turn`);
      return;
    }

    if (!room.discardPile || room.discardPile.length === 0) {
      socket.emit("discard pile top", { card: null });
      return;
    }

    const topCard = room.discardPile[room.discardPile.length - 1];
    console.log(`${socket.data.user} checking discard pile. Top card: ${topCard.name} (${topCard.details})`);

    socket.emit("discard pile top", { card: topCard });
  });

  socket.on("draw from discard", () => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.discardPile || room.discardPile.length === 0) return;

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData || playerData.champion !== "Pedro Ramirez") {
      console.log(`${socket.data.user} is not Pedro Ramirez`);
      return;
    }


    if (room.currentTurn !== socket.data.user) {
      console.log(`Pedro Ramirez ability rejected: not ${socket.data.user}'s turn`);
      return;
    }

    const drawnCard = room.discardPile.pop();
    console.log(`${socket.data.user} drew ${drawnCard.name} (${drawnCard.details}) from discard pile`);

    socket.emit("draw card result", {
      success: true,
      card: drawnCard,
      remainingCards: room.gameDeck.length,
      fromDiscard: true
    });
  });

  socket.on("play saloon", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Saloon play rejected: ${socket.data.user} tried to play Saloon when it's ${room.currentTurn}'s turn`);
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} played Saloon in room ${socket.data.room}. Healing all players by 1 HP.`);

    room.gameData.forEach(player => {
      // Skip eliminated players
      if (player.hp <= 0) return;
      
      const newHp = Math.min(player.hp + 1, player.maxHP);
      const actualHealAmount = newHp - player.hp;
      player.hp = newHp;

      if (actualHealAmount > 0) {
        io.to(socket.data.room).emit("player healed", {
          player: player.username,
          amount: actualHealAmount,
          currentHP: player.hp
        });
      }
    });
  });

  socket.on("play jail", (data) => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Jail play rejected: ${socket.data.user} tried to play Jail when it's ${room.currentTurn}'s turn`);
      return;
    }

    const targetPlayer = room.gameData.find(player => player.username === data.target);
    if (!targetPlayer) return;

    // Check if target player is eliminated
    if (targetPlayer.hp <= 0) {
      console.log(`Jail target rejected: ${data.target} is eliminated`);
      socket.emit("error", { message: "Cannot target eliminated players" });
      return;
    }

    const isSheriff = targetPlayer.role === "Sheriff";
    if (isSheriff) {
      console.log(`${socket.data.user} attempted to put Sheriff ${data.target} in Jail (not allowed)`);
      socket.emit("error", { message: "Cannot put the Sheriff in Jail" });
      return;
    }

    if (!targetPlayer.attributes) {
      targetPlayer.attributes = [];
    }
    targetPlayer.attributes.push("Jail");

    console.log(`${socket.data.user} put ${data.target} in Jail in room ${socket.data.room}`);

    io.to(socket.data.room).emit("update attributes", data.target, targetPlayer.attributes);
  });

  socket.on("jail turn start", () => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Jail check rejected: not ${socket.data.user}'s turn`);
      return;
    }

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData || !playerData.attributes || !playerData.attributes.includes("Jail")) {
      console.log(`${socket.data.user} is not in Jail`);
      return;
    }

    console.log(`${socket.data.user} starting turn while in Jail in room ${socket.data.room}`);

    socket.emit("check jail");
  });

  socket.on("check jail escape", () => {
    if (!socket.data.room) return;

    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData || !room.gameDeck || room.gameDeck.length === 0) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Jail escape check rejected: not ${socket.data.user}'s turn`);
      return;
    }

    const playerData = room.gameData.find(player => player.username === socket.data.user);
    if (!playerData || !playerData.attributes || !playerData.attributes.includes("Jail")) {
      console.log(`${socket.data.user} is not in Jail`);
      return;
    }

    const drawnCard = room.gameDeck.pop();
    console.log(`${socket.data.user} drew ${drawnCard.name} (${drawnCard.details}) for Jail check`);

    const isHearts = drawnCard.details.includes("♥");

    if (isHearts) {
      console.log(`${socket.data.user} escaped from Jail with a hearts card!`);
      playerData.attributes = playerData.attributes.filter(attr => attr !== "Jail");
      io.to(socket.data.room).emit("update attributes", socket.data.user, playerData.attributes);

      socket.emit("jail result", {
        escaped: true,
        card: drawnCard
      });
    } else {
      console.log(`${socket.data.user} failed to escape from Jail`);

      socket.emit("jail result", {
        escaped: false,
        card: drawnCard
      });

      setTimeout(() => {
        const currentPlayerIndex = room.gameData.findIndex(p => p.username === socket.data.user);
        let nextPlayerIndex = (currentPlayerIndex + 1) % room.gameData.length;
        
        // Skip players with HP <= 0 (eliminated)
        let nextPlayer = room.gameData[nextPlayerIndex];
        while (nextPlayer.hp <= 0 && nextPlayerIndex !== currentPlayerIndex) {
          nextPlayerIndex = (nextPlayerIndex + 1) % room.gameData.length;
          nextPlayer = room.gameData[nextPlayerIndex];
          
          if (nextPlayerIndex === currentPlayerIndex) {
            console.log("No non-eliminated players found after jail check");
            nextPlayer = room.gameData[currentPlayerIndex]; // Stay with current player as fallback
            break;
          }
        }

        playerData.attributes = playerData.attributes.filter(attr => attr !== "Jail");
        io.to(socket.data.room).emit("update attributes", socket.data.user, playerData.attributes);

        room.currentTurn = nextPlayer.username;
        io.to(socket.data.room).emit("update turn", nextPlayer.username);
      }, 3000);
    }
  });

  socket.on("play dynamite", (data) => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Dynamite play rejected: ${socket.data.user} tried to play when it's ${room.currentTurn}'s turn`);
      return;
    }

    const playerData = room.gameData.find(p => p.username === socket.data.user);
    if (!playerData) return;

    if (!playerData.attributes) {
      playerData.attributes = [];
    }

    if (!playerData.attributes.includes("Dynamite")) {
      playerData.attributes.push("Dynamite");
      console.log(`${socket.data.user} placed Dynamite in front of them in room ${socket.data.room}`);
      addCardToDiscardPile(room, data.card);
      io.to(socket.data.room).emit("update attributes", socket.data.user, playerData.attributes);
    } else {
      console.log(`${socket.data.user} tried to play Dynamite but already has one.`);
      addCardToDiscardPile(room, data.card); //testi jestli kdyz jsou dva dynamity, tak se jeden vrati do cyklu karet stejne nemas cas lmao
    }
  });

  socket.on("check dynamite draw", () => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData || !room.gameDeck) return;

    if (!dynamiteState[socket.data.room] || !dynamiteState[socket.data.room].pendingCheck || dynamiteState[socket.data.room].checkedPlayer !== socket.data.user) {
      console.log(`Dynamite check rejected: Invalid state or not ${socket.data.user}'s turn to check.`);
      return;
    }

    const playerData = room.gameData.find(p => p.username === socket.data.user);
    if (!playerData || !playerData.attributes || !playerData.attributes.includes("Dynamite")) {
      console.log(`Dynamite check rejected: ${socket.data.user} does not have Dynamite.`);
      dynamiteState[socket.data.room].pendingCheck = false;
      io.to(socket.data.room).emit("update turn", socket.data.user);
      return;
    }

    if (room.gameDeck.length === 0) {
      if (room.discardPile.length > 0) {
        console.log(`Deck empty for Dynamite check, shuffling discard pile with ${room.discardPile.length} cards`);
        room.gameDeck = shuffleArray([...room.discardPile]);
        room.discardPile = [];
        console.log(`New deck created with ${room.gameDeck.length} cards`);
      } else {
        console.log(`No cards left in deck or discard for Dynamite check in room ${socket.data.room}`);
      }
    }
    const drawnCard = room.gameDeck.pop();
    addCardToDiscardPile(room, drawnCard);

    console.log(`${socket.data.user} drew ${drawnCard.name} (${drawnCard.details}) for Dynamite check`);

    const symbol = drawnCard.details.slice(-1);
    const rankNumber = drawnCard.details.slice(0, -1);
    const rank = parseInt(rankNumber);

    let explodes = false;
    if (symbol === '♠' && !isNaN(rank) && rank >= 2 && rank <= 9) {
      explodes = true;
    }

    dynamiteState[socket.data.room].pendingCheck = false;

    if (explodes) {
      console.log(`Dynamite exploded on ${socket.data.user}!`);
      playerData.attributes = playerData.attributes.filter(attr => attr !== "Dynamite");
      io.to(socket.data.room).emit("update attributes", socket.data.user, playerData.attributes);

      playerData.hp -= 3;
      console.log(`${socket.data.user} took 3 damage from Dynamite, HP now: ${playerData.hp}`);

      io.to(socket.data.room).emit("dynamite explosion", {
        player: socket.data.user,
        card: drawnCard,
        currentHP: playerData.hp
      });

      io.to(socket.data.room).emit("player damaged", {
        player: socket.data.user,
        attacker: "Dynamite",
        amount: 3,
        currentHP: playerData.hp
      });

      if (playerData.hp <= 0) {
        console.log(`[Elimination Check - Dynamite] Player ${socket.data.user} HP <= 0.`);
        playerData.eliminated = true; // Mark as eliminated
        console.log(`[Elimination Check - Dynamite] Marked ${socket.data.user} as eliminated.`);
        
        // Find this player's socket to request their cards
        const playerSocket = [...io.sockets.sockets.values()].find(
          s => s.data.user === socket.data.user && s.data.room === socket.data.room
        );
        
        if (playerSocket) {
          console.log(`[Elimination Check - Dynamite] Found socket for ${socket.data.user}, emitting 'discard all cards'.`);
          playerSocket.emit("discard all cards");
        } else {
          console.log(`[Elimination Check - Dynamite] Could not find socket for ${socket.data.user} to discard cards.`);
        }
        
        console.log(`[Elimination Check - Dynamite] Emitting 'player eliminated' for ${socket.data.user}.`);
        io.to(socket.data.room).emit("player eliminated", {
          player: socket.data.user,
          attacker: "Dynamite"
        });
        // pak udelej aby to dal dalsimu hracovi turn 
      }
      io.to(socket.data.room).emit("update turn", socket.data.user);

    } else {
      console.log(`Dynamite did not explode. Passing to the next player.`);
      passDynamite(room, playerData, drawnCard);
    }
  });

  // zacatek ai 
  function passDynamite(room, currentPlayer, drawnCard) {
    currentPlayer.attributes = currentPlayer.attributes.filter(attr => attr !== "Dynamite");
    io.to(room.roomNum).emit("update attributes", currentPlayer.username, currentPlayer.attributes);

    const currentPlayerIndex = room.gameData.findIndex(p => p.username === currentPlayer.username);
    let nextPlayerIndex = (currentPlayerIndex + 1) % room.gameData.length;
    // Skip eliminated players if any (though Dynamite shouldn't target eliminated ones usually)
    while (room.gameData[nextPlayerIndex].eliminated) {
      nextPlayerIndex = (nextPlayerIndex + 1) % room.gameData.length;
      if (nextPlayerIndex === currentPlayerIndex) { // Should not happen in a valid game state
        console.error("Error finding next player for Dynamite pass.");
        // Turn proceeds for the current player if no valid next player found
        io.to(room.roomNum).emit("update turn", currentPlayer.username);
        return;
      }
    }
    const nextPlayer = room.gameData[nextPlayerIndex];

    // Add Dynamite to the next player
    if (!nextPlayer.attributes) {
      nextPlayer.attributes = [];
    }
    nextPlayer.attributes.push("Dynamite");
    io.to(room.roomNum).emit("update attributes", nextPlayer.username, nextPlayer.attributes);

    console.log(`Dynamite passed from ${currentPlayer.username} to ${nextPlayer.username}`);

    io.to(room.roomNum).emit("dynamite passed", {
      from: currentPlayer.username,
      to: nextPlayer.username,
      card: drawnCard
    });

    // Current player's turn proceeds normally now
    io.to(room.roomNum).emit("update turn", currentPlayer.username);
  }
  // konec ai 

  socket.on("play duel", (data) => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData) return;

    if (room.currentTurn !== socket.data.user) {
      console.log(`Duel play rejected: ${socket.data.user} tried to play Duel when it's ${room.currentTurn}'s turn`);
      return;
    }
    
    if (room.duelState) {
        console.log(`Duel play rejected: Another duel is already in progress in room ${socket.data.room}`);
        socket.emit("error", { message: "Another duel is already in progress." });
        return;
    }

    const targetPlayer = room.gameData.find(player => player.username === data.target);
    if (!targetPlayer || targetPlayer.hp <= 0 || targetPlayer.username === socket.data.user) {
      console.log(`Duel target rejected: ${data.target} is invalid (eliminated or self)`);
      socket.emit("error", { message: "Invalid Duel target." });
      return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} initiated a Duel against ${data.target} in room ${socket.data.room}`);

    room.duelState = {
        attacker: socket.data.user,
        target: data.target,
        currentChallenger: data.target, 
        lastBangCard: null 
    };

    const targetSocket = [...io.sockets.sockets.values()].find(
        s => s.data.user === data.target && s.data.room === socket.data.room
    );

    if (targetSocket) {
        targetSocket.emit("duel challenge", { challenger: socket.data.user });
    } else {
        console.log(`Could not find socket for Duel target ${data.target}.`);
        delete room.duelState;
    }
  });

  socket.on("duel response", (data) => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData || !room.duelState) {
        console.log(`Duel response rejected: Room or duel state not found for room ${socket.data.room}`);
        return;
    }

    if (room.duelState.currentChallenger !== socket.data.user) {
        console.log(`Duel response rejected: ${socket.data.user} tried to respond when it's ${room.duelState.currentChallenger}'s turn.`);
        return;
    }
    
    if (room.duelState.attacker !== data.opponent && room.duelState.target !== data.opponent) {
        console.log(`Duel response rejected: Opponent mismatch. Expected ${room.duelState.attacker} or ${room.duelState.target}, got ${data.opponent}`);
        return;
    }

    addCardToDiscardPile(room, data.card);
    console.log(`${socket.data.user} responded to the Duel with a Bang! against ${data.opponent}`);

    const nextChallenger = data.opponent;
    room.duelState.currentChallenger = nextChallenger;
    room.duelState.lastBangCard = data.card;

    const nextChallengerSocket = [...io.sockets.sockets.values()].find(
        s => s.data.user === nextChallenger && s.data.room === socket.data.room
    );

    if (nextChallengerSocket) {
        nextChallengerSocket.emit("duel challenge", { challenger: socket.data.user });
    } else {
        console.log(`Could not find socket for next Duel challenger ${nextChallenger}.`);
        console.log(`Duel ended: ${nextChallenger} disconnected or could not be found. ${socket.data.user} wins.`);
        io.to(socket.data.room).emit("duel ended", { winner: socket.data.user, loser: nextChallenger, reason: "disconnect" });
        delete room.duelState;
    }
  });

  socket.on("duel concede", (data) => {
    if (!socket.data.room) return;
    const room = roomsInfo[socket.data.room];
    if (!room || !room.gameData || !room.duelState) {
        console.log(`Duel concede rejected: Room or duel state not found for room ${socket.data.room}`);
        return;
    }

    if (room.duelState.currentChallenger !== socket.data.user) {
        console.log(`Duel concede rejected: ${socket.data.user} tried to concede when it's ${room.duelState.currentChallenger}'s turn.`);
        return;
    }
    
    if (room.duelState.attacker !== data.opponent && room.duelState.target !== data.opponent) {
        console.log(`Duel concede rejected: Opponent mismatch. Expected ${room.duelState.attacker} or ${room.duelState.target}, got ${data.opponent}`);
        return;
    }

    const loserUsername = socket.data.user;
    const winnerUsername = data.opponent;
    console.log(`Duel ended: ${loserUsername} conceded to ${winnerUsername}`);

    const loserData = room.gameData.find(player => player.username === loserUsername);
    if (loserData) {
        loserData.hp -= 1;
        console.log(`${loserUsername} took 1 damage from losing Duel, HP now: ${loserData.hp}`);

        io.to(socket.data.room).emit("player damaged", {
            player: loserUsername,
            attacker: winnerUsername, 
            amount: 1,
            currentHP: loserData.hp
        });

         if (loserData.hp <= 0) {
             if (!loserData.eliminated) { 
                loserData.eliminated = true; 
                console.log(`[Elimination Check - Duel] Marked ${loserUsername} as eliminated.`);
                
                const loserSocket = [...io.sockets.sockets.values()].find(
                  s => s.data.user === loserUsername && s.data.room === socket.data.room
                );
                
                if (loserSocket) {
                    console.log(`[Elimination Check - Duel] Found socket for ${loserUsername}, emitting 'discard all cards'.`);
                    loserSocket.emit("discard all cards");
                } else {
                    console.log(`[Elimination Check - Duel] Could not find socket for ${loserUsername} to discard cards.`);
                }
                
                console.log(`[Elimination Check - Duel] Emitting 'player eliminated' for ${loserUsername}.`);
                io.to(socket.data.room).emit("player eliminated", {
                  player: loserUsername,
                  attacker: winnerUsername 
                });
                
                if (loserData.role === "Renegade" && winnerUsername) {
                  handleRenegadeEliminationReward(room, winnerUsername, loserUsername);
                }
            }
        }
    }

    io.to(socket.data.room).emit("duel ended", { winner: winnerUsername, loser: loserUsername, reason: "concede" });

    delete room.duelState;
  });

  // Helper function for Renegade reward (extracted for clarity)
  function handleRenegadeEliminationReward(room, attackerUsername, eliminatedUsername) {
    const attackerData = room.gameData.find(p => p.username === attackerUsername);
    if (attackerData && attackerData.hp > 0) {
        console.log(`[Reward] ${attackerUsername} eliminated Renegade ${eliminatedUsername}. Granting 3 card reward.`);
        const attackerSocket = [...io.sockets.sockets.values()].find(
            s => s.data.user === attackerUsername && s.data.room === room.roomNum
        );

        if (attackerSocket) {
            let cardsDrawnCount = 0;
            for (let i = 0; i < 3; i++) {
                if (!room.gameDeck || room.gameDeck.length === 0) {
                    if (room.discardPile && room.discardPile.length > 0) {
                        console.log(`[Reward Draw] Deck empty, shuffling discard pile with ${room.discardPile.length} cards`);
                        room.gameDeck = shuffleArray([...room.discardPile]);
                        room.discardPile = [];
                        io.to(room.roomNum).emit("discard pile update", { lastCard: null }); 
                        console.log(`[Reward Draw] New deck created with ${room.gameDeck.length} cards`);
                    } else {
                        console.log(`[Reward Draw] No cards left in deck or discard for ${attackerUsername}`);
                        break; 
                    }
                }
                const drawnCard = room.gameDeck.pop();
                if (drawnCard) {
                    console.log(`[Reward Draw] ${attackerUsername} drew card ${drawnCard.name} (${drawnCard.details})`);
                    attackerSocket.emit("draw card result", {
                        success: true,
                        card: drawnCard,
                        remainingCards: room.gameDeck.length
                    });
                    cardsDrawnCount++;
                }
            }
            console.log(`[Reward] Granted ${cardsDrawnCount} cards to ${attackerUsername}.`);
        } else {
            console.log(`[Reward] Could not find socket for attacker ${attackerUsername}.`);
        }
    } else {
        console.log(`[Reward] Attacker ${attackerUsername} is eliminated or not found, no reward for eliminating Renegade ${eliminatedUsername}.`);
    }
  }
});



server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}