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




io.on('connection', (socket) => {
  console.log('a user connected');
});

server.listen(3000, () => {
  console.log('server running at http://localhost:3000');
});