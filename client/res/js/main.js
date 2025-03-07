const socket = io("http://localhost:3000");
const users = document.getElementById("users");
const usersCount = document.getElementById("usersCount");
const send = document.getElementById("send");
const lick = document.getElementById("lick");
const startGame = document.getElementById("startGame");
const roomInput = document.getElementById("roomInput");
const enterRoom = document.getElementById("enterRoom");
const roomInfo = document.getElementById("roomInfo");
const availableRooms = document.getElementById("availableRooms");
const displayCookies = document.getElementById("displayCookies");
const owner = document.getElementById("owner");
const gameArea = document.getElementById("gameArea");

const nameInput = document.getElementById("nameInput");
const enterUsername = document.getElementById("enterUsername");

const createRoomInput = document.getElementById("createRoomInput");
const createRoomButton = document.getElementById("createRoomButton");

let currentRoom;
let username;
let numberOfCookies = 0;
let players = [];

enterUsername.onclick = () => {
  username = nameInput.value + "#" + Date.now();
  socket.emit("save username", username);
  document.getElementById("nameInput").style.display="none";
  document.getElementById("enterUsername").style.display="none";
}

createRoomButton.onclick = () => {
  const newRoomName = createRoomInput.value.trim();
  
  if (newRoomName && username) {
    socket.emit("create room", newRoomName);
    createRoomInput.value = "";
    socket.emit("join room", { roomNum: newRoomName, username: username });
  } else {
    alert("bro enterni jmeno");
  }
}

window.onload = () => {
  socket.emit("get rooms");
};

lick.onclick = () => {
  numberOfCookies++;
  socket.emit("lick", numberOfCookies)
}

enterRoom.onclick = () => {
  if(username) {
    socket.emit("join room", { roomNum: roomInput.value, username: username });
    roomInput.value = "";
  } else {
    alert("enterni usernmae")
  }
};

socket.on("join room", (data) => {
  if (data.status === 1) {
    roomInfo.innerHTML = `${data.message}: ${data.roomNum}`;
    currentRoom = data.roomNum;
    return;
  }
  roomInfo.innerHTML = data.message;
});

socket.on("update room users", (data) => {
  users.innerHTML = "";
  players = data; 
  data.map((user) => {
    users.innerHTML += `<p>${user}</p>`;
  });
});

socket.on("get owner", (roomOwner) => {
  owner.innerHTML = `<h1>${roomOwner}</h1>`;
});

startGame.onclick = () => {
  const roomOwner = document.getElementById('owner').innerText;
  if (username === roomOwner) {
    const gameData = generateGameData(players);
    socket.emit("start game", { room: currentRoom, gameData: gameData });
  } else {
    alert("bro nejsi vlastnik roomky");
  }
}

function generateGameData(players) {
  const roles = ["Sheriff", "Bandit", "Loner", "Vice"];
  const champions = ["Willy the Kid", "Vulture Sam", "Suzy Lafayette", "Slab The Killer", "Sid Ketchum", "Rose Doolan", "Pedro Ramirez", "Paul Regret", "Lucky Duke", "Kit Carlson", "Jourdonnais", "Jesse Jones", "El Gringo", "Calamity Janet", "Black Jack", "Bart Cassidy"];
  const attributes = ["Winchester", "Volcanic", "Mirino", "Schofield", "Rev Carabine", "Remington", "Mustang", "Prigione", "Dinamite", "Barile"];

  console.log(players.length)
  // udelej aby byl spravnej pocet roli, distance, kdyz serif + hp, hp podle champion
  
  
  const gameData = players.map((player) => {


    return {
      username: player,
      hp: 4, 
      distance: 1, 
      role: roles[Math.floor(Math.random() * roles.length)],
      champion: champions[Math.floor(Math.random() * champions.length)],
      attributes: [
        
      ]
    };
  });
  
  return gameData;
}

socket.on("game started", (gameData) => {
  renderPlayerCards(gameData);
});

function renderPlayerCards(gameData) {

  gameData.forEach(player => {
    const playerCard = document.createElement("div");
    playerCard.className = "player-card";
    playerCard.id = `player-${player.username.replace(/[^a-zA-Z0-9]/g, "-")}`;
    
    const isCurrentPlayer = player.username === username;
    if (isCurrentPlayer) {
      playerCard.classList.add("current-player");
    }
    
    playerCard.innerHTML = `
      <div class="player-header ${isCurrentPlayer ? 'my-player' : ''}">
        <h3>${player.username}</h3>
        <span class="role">${isCurrentPlayer || player.role === "Sheriff" ? player.role : "?"}</span>
      </div>
      <div class="player-stats">
        <div class="stat">
          <span class="stat-label">HP:</span>
          <span class="stat-value">${player.hp}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Distance:</span>
          <span class="stat-value">${player.distance}</span>
        </div>
        <div class="stat">
          <span class="stat-label">Champion:</span>
          <span class="stat-value">${player.champion}</span>
        </div>
      </div>
      <div class="player-attributes">
        <h4>Attributes:</h4>
        <ul>
          ${player.attributes.map(attr => `<li>${attr}</li>`).join('')}
        </ul>
      </div>
    `;
    
    gameArea.appendChild(playerCard);
  });
  
  document.getElementById("roomInput").style.display = "none";
  document.getElementById("enterRoom").style.display = "none";
  document.getElementById("createRoomInput").style.display = "none";
  document.getElementById("createRoomButton").style.display = "none";
  document.getElementById("availableRooms").style.display = "none";
  document.getElementById("lick").style.display = "none";
  document.getElementById("startGame").style.display = "none";
  
  const gameControls = document.createElement("div");
  gameControls.className = "game-controls";
  gameControls.innerHTML = `
    <button id="drawCard">Draw Card</button>
    <button id="endTurn">End Turn</button>
  `;
  
  gameArea.appendChild(gameControls);
}

socket.on("get values", (numberOfCookies, fruser) => {
  displayCookies.innerHTML += `<p>${fruser}: ${numberOfCookies}</p>`;
  console.log(numberOfCookies);
});

socket.on("get rooms", (data) => {
  availableRooms.innerHTML = "<p>Available rooms</p>";  
  data.map((roomNum) => {
    availableRooms.innerHTML += `
      <p>${roomNum}</p>
    `;
  });
});
