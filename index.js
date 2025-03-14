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
const roomsInfo = [
  {
    roomNum: 1,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null
  },
  {
    roomNum: 2,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null
  },
  {
    roomNum: 3,
    users: new Set(),
    gameActive: false,
    gameData: null,
    roomOwner: null
  },
];

io.on("connection", (socket) => {
  console.log(
    `User connected: ${socket.handshake.address}, ${socket.handshake.time}`
  );

  socket.on("save username", (data) => {
    socket.data.user = data;
  });

  socket.on("disconnect", () => {
    console.log(`${socket.data.user} disconnected`);
    if (socket.data.room) {
      roomsInfo[socket.data.room].users.delete(socket.data.user);
      
      socket.leave(socket.data.room);
      io.to(socket.data.room).emit("update room users", [
        ...roomsInfo[socket.data.room].users,
      ]);
    }
  });

  socket.on("create room", (roomName) => {
    rooms.add(roomName);
    const createdRoom = roomName;
    if (!roomsInfo[createdRoom]) {
      roomsInfo[createdRoom] = {
        roomNum: roomName,
        users: new Set(),
        gameActive: false,
        gameData: null,
        roomOwner: socket.data.user
      };
    }
    
    console.log(`Room created: ${roomName} by ${socket.data.user}`);
    let roomOwner = socket.data.user;
    socket.emit("get owner", roomOwner);

    io.emit("get rooms", [...rooms]);
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
      
      return socket.emit("join room", payload);
    }
    const payload = {
      message: "Room does not exist",
      status: 0,
    };
    socket.emit("join room", payload);
  });

  socket.on("get rooms", () => {
    socket.emit("get rooms", [...rooms]);
  });

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
    
    io.to(room).emit("game started", gameData);
    
    console.log(`Game started in room ${room}`);
  });
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});
