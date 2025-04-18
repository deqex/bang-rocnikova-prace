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
const test = document.getElementById("test");
const gameArea = document.getElementById("gameArea");
const leaveRoom = document.getElementById("leaveRoom");
//const isPrivate = document.getElementById("isPrivate")

const nameInput = document.getElementById("nameInput");
const enterUsername = document.getElementById("enterUsername");

const createRoomButton = document.getElementById("createRoomButton");
const switchlabel = document.getElementById("switchlabel");

const maxPlayers = document.getElementById("maxPlayers")

let currentRoom;
let username;
let numberOfCookies = 0;
let players = [];
let isRoomPrivate;
let gameDeck = []; // This will now be used just for reference
let playerHand = [];
let currentTurn = null; //mozna pak odeber
let cardSelectionOpen = false; //mozna pak odeber
let targetingMode = false; // Flag to track if we're in targeting mode
let selectedCard = null; // Track the selected card for targeting
const listOfWeapons = ["Winchester", "Rev. Carabine", "Schofield", "Remington"];
let numberOfDrawnCards = 0;

enterUsername.onclick = () => {
  username = nameInput.value;
  if (username.length < 12) {
    const timeNow = Date.now().toString();
    const lastFour = timeNow.slice(-4);
    username = username + "#" + lastFour;
    socket.emit("save username", username);
    document.getElementById("nameInput").style.display = "none";
    document.getElementById("enterUsername").style.display = "none";
    document.getElementById("createRoomButton").style.display = "block";
  } else {
    alert("name too long")
  }

}

createRoomButton.onclick = () => {
  const timeNow = Date.now().toString();
  const lastSix = timeNow.slice(-6);
  const newRoomName = lastSix;
  const newMaxPlayers = maxPlayers.value;
  const isRoomPrivate = document.getElementById('isPrivate').checked;

  if (newRoomName && username) {
    socket.emit("create room", newRoomName, newMaxPlayers, isRoomPrivate);
    socket.emit("join room", { roomNum: newRoomName, username: username });
    document.getElementById("createRoomButton").style.display = "none";
    document.getElementById("switchlabel").style.display = "none";
    document.getElementById("maxPlayers").style.display = "none";
    document.getElementById("startGame").style.display = "block";
    document.getElementById("leaveRoom").style.display = "block";
  } else {
    alert("bro enterni jmeno");
  }
}

function isPrivate() {
  if (document.getElementById('isPrivate').checked) {
    isRoomPrivate = true;
  } else {
    isRoomPrivate = false;
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
  if (username) {
    socket.emit("join room", { roomNum: roomInput.value, username: username });
    roomInput.value = "";
    document.getElementById("leaveRoom").style.display = "block";
  } else {
    alert("enterni usernmae")
  }
};

leaveRoom.onclick = () => {

  if (currentRoom) {
    socket.emit("leave room", { roomNum: currentRoom });

    roomInfo.innerHTML = "Room: ";
    users.innerHTML = "";
    currentRoom = null;

    document.getElementById("createRoomButton").style.display = "block";
    document.getElementById("switchlabel").style.display = "block";
    document.getElementById("maxPlayers").style.display = "block";
    document.getElementById("roomInput").style.display = "block";
    document.getElementById("enterRoom").style.display = "block";
    document.getElementById("leaveRoom").style.display = "none";
    owner.innerHTML = ``;
    test.innerHTML = ``;

    socket.emit("get rooms");
  } else {
    alert("You are not in a room");
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
  console.log(players.length)
  if (username === roomOwner && players.length >= 4) {
    const gameData = generateGameData(players);
    socket.emit("start game", { room: currentRoom, gameData: gameData });
  } else {
    alert("Only the room owner can start the game or not enough players or you don't have a username good error message yes");
  }
}

socket.on("room closed", (data) => {
  roomInfo.innerHTML = data.message; //pak odeber
  users.innerHTML = "";
  currentRoom = null;
  socket.emit("get rooms");
  alert(data.message);
});

function generateRoles(playerCount) {
  let roles = [];

  switch (playerCount) {
    case 4:
      roles = ['Sheriff', 'Outlaw', 'Renegade', 'Renegade'];
      break;
    case 5:
      roles = ['Sheriff', 'Outlaw', 'Renegade', 'Renegade', 'Deputy'];
      break;
    case 6:
      roles = ['Sheriff', 'Outlaw', 'Renegade', 'Renegade', 'Renegade', 'Deputy'];
      break;
    case 7:
      roles = ['Sheriff', 'Outlaw', 'Renegade', 'Renegade', 'Renegade', 'Deputy', 'Deputy'];
      break;
    default:
      alert("an oopsie happened");
  }
  return shuffleArray(roles);
}

//
//
// ZACATEK AI KOD SEKCE
//
//

// Function to calculate distance between two players based on their positions in the circle
function calculateDistance(playerA, playerB, totalPlayers) {
  const posA = playerA.position;
  const posB = playerB.position;

  // Calculate the shortest path around the circle
  const clockwise = Math.abs(posA - posB);
  const counterClockwise = totalPlayers - clockwise;

  // Get the minimum distance
  let distance = Math.min(clockwise, counterClockwise);

  if (playerB.attributes && playerB.attributes.includes("Mustang")) {
    distance += 1;
  }

  if (playerB.champion && playerB.champion === "Paul Regret") {
    distance += 1;
  }

  if (playerA.champion === "Rose Doolan") {
    // Rose Doolan sees all players at a distance decreased by 1
    distance = Math.max(1, distance - 1);
  }

  return distance;
}

//
//
// KONEC AI KOD SEKCE
//
//

function generateGameData(players) {
  const championData = { // generovano pomoci ai 
    "Willy the Kid": { baseHP: 4, description: "Can play any number of BANG! cards" },
   // "Calamity Janet": { baseHP: 4, description: "Can use BANG! cards as Missed! and vice versa" },
  //  "Bart Cassidy": { baseHP: 4, description: "Each time he loses a life point, he draws a card" },
    "Kit Carlson": { baseHP: 4, description: "Looks at top 3 cards of the deck when drawing" },
   // "Jesse Jones": { baseHP: 4, description: "Can draw the first card from the hand of a player" },
 //   "Rose Doolan": { baseHP: 4, description: "Sees adjacent players at a distance decreased by 1" },
   // "Paul Regret": { baseHP: 3, description: "All players see him at an increased distance by 1" },
  //  "El Gringo": { baseHP: 3, description: "When hit by a player, draws a card from their hand" },
//    "Pedro Ramirez": { baseHP: 4, description: "He may draw his first card from the discard pile." },
    //"Jourdonnais": { baseHP: 4, description: "Has a permanent Barrel in play" },
    //"Black Jack": { baseHP: 4, description: "Shows second card drawn; if Hearts/Diamonds, draws again" },
 //   "Slab the Killer": { baseHP: 4, description: "Players need 2 Missed! cards to cancel his BANG!" },
   // "Lucky Duke": { baseHP: 4, description: "Flips top 2 cards and chooses which to use" },
    "Suzy Laffayete": { baseHP: 4, description: "When she has 0 cards in hand, draws a card" },
    "Vulture Sam": { baseHP: 4, description: "Takes all cards of eliminated players" }
  };

  const bangCards = [ // generovano pomoci ai abych nemusel opisovat s trochou opravy struktura tvorena mnou
    { name: "Barrel", details: "Q♠" },
    { name: "Barrel", details: "K♠" },
    { name: "Dynamite", details: "2♥" },
    { name: "Jail", details: "J♠" },
    { name: "Jail", details: "4♥" },
    { name: "Jail", details: "10♠" },
    { name: "Mustang", details: "8♥" },
    { name: "Mustang", details: "9♥" },
    { name: "Remington", details: "K♣" },
    { name: "Rev. Carabine", details: "A♣" },
    { name: "Schofield", details: "J♣" },
    { name: "Schofield", details: "Q♣" },
    { name: "Schofield", details: "K♠" },
    { name: "Scope", details: "A♠" },
    { name: "Volcanic", details: "10♠" },
    { name: "Volcanic", details: "10♣" },
    { name: "Winchester", details: "8♠" },
    { name: "Bang!", details: "A♠" },
    { name: "Bang!", details: "2♦" },
    { name: "Bang!", details: "3♦" },
    { name: "Bang!", details: "4♦" },
    { name: "Bang!", details: "5♦" },
    { name: "Bang!", details: "6♦" },
    { name: "Bang!", details: "7♦" },
    { name: "Bang!", details: "8♦" },
    { name: "Bang!", details: "9♦" },
    { name: "Bang!", details: "10♦" },
    { name: "Bang!", details: "J♦" },
    { name: "Bang!", details: "Q♦" },
    { name: "Bang!", details: "K♦" },
    { name: "Bang!", details: "A♦" },
    { name: "Bang!", details: "2♣" },
    { name: "Bang!", details: "3♣" },
    { name: "Bang!", details: "4♣" },
    { name: "Bang!", details: "5♣" },
    { name: "Bang!", details: "6♣" },
    { name: "Bang!", details: "7♣" },
    { name: "Bang!", details: "8♣" },
    { name: "Bang!", details: "9♣" },
    { name: "Bang!", details: "Q♥" },
    { name: "Bang!", details: "A♥" },
    { name: "Beer", details: "6♥" },
    { name: "Beer", details: "7♥" },
    { name: "Beer", details: "8♥" },
    { name: "Beer", details: "9♥" },
    { name: "Beer", details: "10♥" },
    { name: "Beer", details: "J♥" },
    { name: "Cat Balou", details: "K♦" },
    { name: "Cat Balou", details: "9♦" },
    { name: "Cat Balou", details: "10♦" },
    { name: "Cat Balou", details: "J♦" },
    { name: "Duel", details: "Q♦" },
    { name: "Duel", details: "J♠" },
    { name: "Duel", details: "8♣" },
    { name: "Gatling", details: "10♥" },
    { name: "General Store", details: "9♣" },
    { name: "General Store", details: "Q♠" },
    { name: "Indians!", details: "K♦" },
    { name: "Indians!", details: "A♦" },
    { name: "Missed!", details: "10♣" },
    { name: "Missed!", details: "J♣" },
    { name: "Missed!", details: "Q♣" },
    { name: "Missed!", details: "K♣" },
    { name: "Missed!", details: "A♣" },
    { name: "Missed!", details: "2♠" },
    { name: "Missed!", details: "3♠" },
    { name: "Missed!", details: "4♠" },
    { name: "Missed!", details: "5♠" },
    { name: "Missed!", details: "6♠" },
    { name: "Missed!", details: "7♠" },
    { name: "Missed!", details: "8♠" },
    { name: "Panic!", details: "J♥" },
    { name: "Panic!", details: "Q♥" },
    { name: "Panic!", details: "A♥" },
    { name: "Panic!", details: "8♦" },
    { name: "Saloon", details: "5♥" },
    { name: "Stagecoach", details: "9♠" },
    { name: "Stagecoach", details: "9♠" },
    { name: "Wells Fargo", details: "3♥" }
  ];
  socket.emit("get cards", shuffleArray(bangCards));

  const roles = generateRoles(players.length);
  const gameData = players.map((player, index) => {
    const championNames = Object.keys(championData);
    const champion = championNames[Math.floor(Math.random() * championNames.length)]; //mrdka
    const role = roles[index];
    const baseHP = championData[champion].baseHP; //jeste vetsi mrdka 
    let attributes = [];
    let hp;
    if (role === "Sheriff") { //mozna pak ternarni jestli ti zbyde cas
      hp = baseHP + 1;
    } else {
      hp = baseHP;
    }

    return {
      username: player,
      hp: hp,
      maxHP: hp,
      position: index, // TENHLE RADEK JE AI
      role: role,
      champion: champion,
      championDescription: championData[champion].description,
      attributes: []
    };
  });
  return gameData;
}

function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

socket.on("game started", (gameData) => {
  const sheriff = gameData.find(player => player.role === "Sheriff");
  currentTurn = sheriff ? sheriff.username : null;

  if (gameDeck.length === 0) {
    socket.emit("get cards");
  } else {
    dealInitialCards(gameData);
  }
  renderPlayerCards(gameData);

  if (currentTurn) {
    socket.emit("update turn", currentTurn);
  }
});

socket.on("get cards", (cards) => {
  gameDeck = shuffleArray([...cards]);
  console.log("Received deck with", gameDeck.length, "cards");

  const currentPlayerData = players.find(p => p.username === username);
  if (currentPlayerData) {
    dealInitialCards(players);
  }
});

function dealInitialCards(gameData) {
  gameData.forEach(player => {
    if (!player.cards) {
      player.cards = [];
      player.cardCount = 0;
    }
  });

  const currentPlayer = gameData.find(player => player.username === username);
  if (currentPlayer) {
    const cardsToDeal = currentPlayer.maxHP;
    currentPlayer.cards = [];

    for (let i = 0; i < cardsToDeal && gameDeck.length > 0; i++) { //shoutout stepan
      const card = gameDeck.pop();
      currentPlayer.cards.push(card);
    }

    playerHand = [...currentPlayer.cards];
    currentPlayer.cardCount = playerHand.length;
    console.log(`Dealt ${playerHand.length} cards to you`);
    console.log("Your hand:", playerHand);
  }

  gameData.forEach(player => {
    if (player.username !== username) {
      player.cardCount = player.maxHP;
    }
  });

  players = gameData;
}

//
//
// ZACATEK AI KOD SEKCE
// ne vse bylo AI jako napr playerCard, ale pozicovani a responzivita je AI
//
//

function renderPlayerCards(gameData) {
  // Clear the game area first
  gameArea.innerHTML = '';

  const currentPlayerData = gameData.find(player => player.username === username);
  if (!currentPlayerData) return;

  // Update players array
  players = gameData;

  // Hide all pre-game elements
  const elementsToHide = [
    "roomInput", "enterRoom", "createRoomButton", "availableRooms", "startGame",
    "lick", "owner", "test", "displayCookies", "users", "usersCount", "maxPlayers",
    "nameInput", "enterUsername", "roomInfo", "switchlabel"
  ];

  elementsToHide.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.style.display = "none";
  });

  // Fix container to prevent scrolling
  document.querySelector('.container').style.margin = "0";
  document.querySelector('.container').style.padding = "0";
  document.querySelector('.container').style.overflow = "hidden";
  document.querySelector('.container').style.width = "100vw";
  document.querySelector('.container').style.height = "100vh";
  document.querySelector('.container').style.position = "fixed";
  document.querySelector('.container').style.top = "0";
  document.querySelector('.container').style.left = "0";

  // Set gameArea to fill viewport
  gameArea.style.position = "absolute";
  gameArea.style.width = "100%";
  gameArea.style.height = "100%";
  gameArea.style.margin = "0";
  gameArea.style.padding = "0";
  gameArea.style.overflow = "hidden";
  gameArea.style.boxSizing = "border-box";

  // Create the central table
  const table = document.createElement("div");
  table.className = "game-table";
  table.innerHTML = `
    <div class="table-content">
      <div style="display: flex; justify-content: center; align-items: center; height: 100%;">
        <img src="./res/img/01_barile.png" style="max-height: 60%; max-width: 45%;">
        <img src="./res/img/01_barile.png" style="max-height: 60%; max-width: 45%;">
      </div>
      <p>${gameData.length} Players</p>
    </div>
  `;
  gameArea.appendChild(table);

  function updatePositions() {
    // Get current viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate appropriate sizes based on viewport
    const centerX = viewportWidth / 2;
    const centerY = viewportHeight / 2;

    // Calculate table size (responsive)
    const tableSize = Math.min(viewportWidth, viewportHeight) * 0.2;
    table.style.width = `${tableSize}px`;
    table.style.height = `${tableSize}px`;

    // Calculate card size (responsive)
    const cardWidth = Math.min(Math.max(viewportWidth * 0.15, 150), 220);
    const cardHeight = cardWidth * 1.25;

    // Define extremely minimal safety margin
    const marginFromEdge = 3; // Very small margin, cards will be almost touching edges

    // Find current player index
    const currentPlayerIndex = gameData.findIndex(p => p.username === username);
    const totalPlayers = gameData.length;

    // Update player card positions
    const cards = document.querySelectorAll('.player-card');

    cards.forEach((card, index) => {
      // Calculate position relative to current player
      const relativePosition = (index - currentPlayerIndex + totalPlayers) % totalPlayers;

      // Calculate angle
      const angle = (Math.PI * 2 * relativePosition / totalPlayers) + (Math.PI / 2);

      // Identify card positions
      const isLeftSide = Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) < -0.5;
      const isRightSide = Math.abs(Math.sin(angle)) < 0.3 && Math.cos(angle) > 0.5;
      const isTopSide = Math.abs(Math.cos(angle)) < 0.3 && Math.sin(angle) < -0.5;
      const isBottomSide = Math.abs(Math.cos(angle)) < 0.3 && Math.sin(angle) > 0.5;

      // Base radius calculation - much larger than before
      let baseRadius = Math.min(viewportWidth, viewportHeight) * 0.48;

      // For side cards, calculate position to put them right at the edge
      if (isLeftSide) {
        // Left side - position at edge
        card.style.left = `${marginFromEdge}px`;
        card.style.top = `${centerY - (cardHeight / 2)}px`;
      } else if (isRightSide) {
        // Right side - position at edge
        card.style.left = `${viewportWidth - cardWidth - marginFromEdge}px`;
        card.style.top = `${centerY - (cardHeight / 2)}px`;
      } else if (isTopSide) {
        // Top side
        card.style.left = `${centerX - (cardWidth / 2)}px`;
        card.style.top = `${marginFromEdge}px`;
      } else if (isBottomSide) {
        // Bottom side
        card.style.left = `${centerX - (cardWidth / 2)}px`;
        card.style.top = `${viewportHeight - cardHeight - marginFromEdge - 60}px`; // Account for controls
      } else {
        // For other positions, use angle-based positioning but with increased radius
        const adjustedRadius = baseRadius * 1.1; // Even bigger radius
        let left = centerX + Math.cos(angle) * adjustedRadius - (cardWidth / 2);
        let top = centerY + Math.sin(angle) * adjustedRadius - (cardHeight / 2);

        // Ensure cards don't go off screen
        left = Math.max(marginFromEdge, Math.min(viewportWidth - cardWidth - marginFromEdge, left));
        top = Math.max(marginFromEdge, Math.min(viewportHeight - cardHeight - marginFromEdge - 60, top));

        card.style.left = `${left}px`;
        card.style.top = `${top}px`;
      }

      card.style.width = `${cardWidth}px`;

      // Adjust font size based on card width
      const fontSize = cardWidth * 0.07;
      card.style.fontSize = `${fontSize}px`;
    });

    // Update game controls position
    const controls = document.querySelector('.game-controls');
    if (controls) {
      controls.style.position = "fixed";
      controls.style.bottom = `${Math.min(20, viewportHeight * 0.03)}px`;
      controls.style.width = `${Math.min(viewportWidth * 0.8, 600)}px`;
    }
  }

  // Position players around the table
  gameData.forEach((player) => {
    const isCurrentPlayer = player.username === username;
    const isCurrentTurn = player.username === currentTurn;

    // Create player card
    const playerCard = document.createElement("div");
    playerCard.className = "player-card";

    if (isCurrentPlayer) {
      playerCard.classList.add("current-player");
    }

    if (player.role === "Sheriff") {
      playerCard.classList.add("sheriff");
    }

    // Add active turn indicator
    if (isCurrentTurn) {
      playerCard.classList.add("active-turn");
    }

    // Calculate distance between current player and this player
    const distance = isCurrentPlayer ? 0 : calculateDistance(currentPlayerData, player, gameData.length);

    // Format player name (remove ID part after #)
    const displayName = player.username; // Show full name including ID numbers

    // Determine what role to display
    let roleDisplay = "?";
    if (isCurrentPlayer || player.role === "Sheriff") {
      roleDisplay = player.role;
    }

    let cardCount;
    if (player.cardCount !== undefined) {
      cardCount = player.cardCount;
    } else {
      cardCount = player.maxHP;
    }

    // Create card content
    playerCard.innerHTML = `
      <div class="player-name">${displayName}${isCurrentTurn ? ' (Turn)' : ''}</div>
      <div class="player-role ${player.role.toLowerCase()}">${roleDisplay}</div>
      <div class="player-stats">
        <div>HP: ${player.hp}/${player.maxHP}</div>
        <div>Cards: ${cardCount}</div>
        <div>Distance: ${isCurrentPlayer ? "-" : distance}</div>
        <div>Champion: ${player.champion}</div>
      </div>
      <div class="player-ability"><em>${player.championDescription}</em></div>
      <div class="player-attributes">
        <div>Attributes:</div>
        <ul>
          ${player.attributes.map(attr => `<li>${attr}</li>`).join('')}
        </ul>
      </div>
    `;

    // Set initial position (will be updated by updatePositions)
    playerCard.style.position = "absolute";
    gameArea.appendChild(playerCard);
  });

  const controls = document.createElement("div");
  controls.className = "game-controls";

  const isPlayerTurn = currentTurn === username;

  controls.innerHTML = `
    <button id="endTurn" ${!isPlayerTurn ? 'disabled' : ''}>End Turn</button>
    <button id="playCard">Play Card</button>
    <button id="drawCard" ${!isPlayerTurn ? 'disabled' : ''}>Draw Card</button>
  `;
  gameArea.appendChild(controls);

  document.getElementById("drawCard").addEventListener("click", () => {

    if (currentTurn !== username) {
      console.log("not your turn");
      return;
    }

    const currentPlayer = players.find(p => p.username === username);
    if (currentPlayer.champion === "Kit Carlson" && numberOfDrawnCards === 0) {
      socket.emit("kit carlson ability");
      numberOfDrawnCards++;
      numberOfDrawnCards++;
      return;
    }

    if (currentPlayer && currentPlayer.champion === "Pedro Ramirez" && numberOfDrawnCards === 0) {
      socket.emit("check discard pile");
      return;
    }

    if (currentPlayer && currentPlayer.champion === "Suzy Laffayete" && playerHand.length === 0) {
      socket.emit("suzy laffayete ability");
      return;
    }

    if (numberOfDrawnCards >= 2) {
      console.log("already drawn this turn");
      return;
    }



    socket.emit("draw card", numberOfDrawnCards);
    numberOfDrawnCards++;
    
    socket.emit("draw card", numberOfDrawnCards);
    numberOfDrawnCards++;
  });

  document.getElementById("playCard").addEventListener("click", () => {
    if (playerHand.length === 0) {
      console.log("No cards to play");
      return;
    }

    if (cardSelectionOpen) {
      const existingMenu = document.querySelector(".card-selection-menu");
      if (existingMenu) {
        document.body.removeChild(existingMenu);
        cardSelectionOpen = false;
      }
      return;
    }

    cardSelectionOpen = true;

    const cardMenu = document.createElement("div");
    cardMenu.className = "card-selection-menu";

    const menuHeader = document.createElement("div");
    menuHeader.className = "card-menu-header";
    menuHeader.innerHTML = `
      <h2>Select a Card to Play</h2>
      <button id="closeCardMenu">✕</button>
    `;
    cardMenu.appendChild(menuHeader);

    const cardContainer = document.createElement("div");
    cardContainer.className = "card-container";

    playerHand.forEach((card, index) => {
      const cardElement = document.createElement("div");
      cardElement.className = "card-item";
      cardElement.innerHTML = `
        <div class="card-name">${card.name}</div>
        <div class="card-details">${card.details}</div>
      `;

      cardElement.addEventListener("click", () => {
        console.log(`Selected card: ${card.name} (${card.details})`);

        if (currentTurn !== username) {
          console.log("Not your turn");
          return;
        }

        if (card.name === "Bang!") {
          targetingMode = true;
          selectedCard = card;
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;

          const targetInstruction = document.createElement("div");
          targetInstruction.id = "targetInstruction";
          targetInstruction.className = "target-instruction";
          targetInstruction.innerHTML = `<p>select a player to target</p>`;
          document.body.appendChild(targetInstruction);

          enableTargeting();
          return;
        }

        if (card.name === "Cat Balou") {
          targetingMode = true;
          selectedCard = card;
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;

          const targetInstruction = document.createElement("div");
          targetInstruction.id = "targetInstruction";
          targetInstruction.className = "target-instruction";
          targetInstruction.innerHTML = `<p>Select a player to target with Cat Balou</p>`;
          document.body.appendChild(targetInstruction);

          enableCatBalouTargeting();
          return;
        }

        if (card.name === "Panic!") {
          targetingMode = true;
          selectedCard = card;
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;

          const targetInstruction = document.createElement("div");
          targetInstruction.id = "targetInstruction";
          targetInstruction.className = "target-instruction";
          targetInstruction.innerHTML = `<p>Select a player to steal a card from (range: 1)</p>`;
          document.body.appendChild(targetInstruction);

          enablePanicTargeting();
          return;
        }

        if (card.name === "Schofield") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            const existingWeapon = listOfWeapons.find(weapon => currentPlayer.attributes.includes(weapon));
            if (existingWeapon) {
              currentPlayer.attributes = currentPlayer.attributes.filter(attr => attr !== existingWeapon);
            }
            currentPlayer.attributes.push("Schofield");
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("update attributes", username, currentPlayer.attributes);
            console.log("Equipped Schofield: Range increased to 2");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Winchester") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            const existingWeapon = listOfWeapons.find(weapon => currentPlayer.attributes.includes(weapon));
            if (existingWeapon) {
              currentPlayer.attributes = currentPlayer.attributes.filter(attr => attr !== existingWeapon);
            }
            currentPlayer.attributes.push("Winchester");
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("update attributes", username, currentPlayer.attributes);
            console.log("Equipped Winchester: Range increased to 5");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Rev. Carabine") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            const existingWeapon = listOfWeapons.find(weapon => currentPlayer.attributes.includes(weapon));
            if (existingWeapon) {
              currentPlayer.attributes = currentPlayer.attributes.filter(attr => attr !== existingWeapon);
            }
            currentPlayer.attributes.push("Rev. Carabine");
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("update attributes", username, currentPlayer.attributes);
            console.log("Equipped Rev. Carabine: Range increased to 4");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Remington") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            const existingWeapon = listOfWeapons.find(weapon => currentPlayer.attributes.includes(weapon));
            if (existingWeapon) {
              currentPlayer.attributes = currentPlayer.attributes.filter(attr => attr !== existingWeapon);
            }
            currentPlayer.attributes.push("Remington");
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("update attributes", username, currentPlayer.attributes);
            console.log("Equipped Remington: Range increased to 3");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Scope") {//possibly dva scopy checkni pravidla az nebudes linej
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            currentPlayer.attributes.push("Scope");
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("update attributes", username, currentPlayer.attributes);
            console.log("Equipped Scope: Range increased by 1");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Mustang") { //possibly dva mustangove checkni pravidla az nebudes linej
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            currentPlayer.attributes.push("Mustang");
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("update attributes", username, currentPlayer.attributes);
            console.log("Equipped Mustang: Distance increased by 1");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Barrel") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            currentPlayer.attributes.push("Barrel");
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("update attributes", username, currentPlayer.attributes);
            console.log("Equipped Barrel: Draw hearts to dodge Bang!");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Beer") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            playerHand.splice(index, 1);
            discardCard(card); 
            currentPlayer.cardCount = playerHand.length;
            currentPlayer.hp = currentPlayer.hp + 1;
            socket.emit("heal self", {
              amount: 1,
            });
            socket.emit("update card count", username, playerHand.length);
            console.log("Drank beer, healing 1 hp!");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Wells Fargo") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            playerHand.splice(index, 1);
            discardCard(card); 
            socket.emit("draw card");
            socket.emit("draw card");
            socket.emit("draw card");
            
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            console.log("Used Wells Fargo: Draw 3 cards");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Stagecoach") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            playerHand.splice(index, 1);
            discardCard(card); 
            socket.emit("draw card");
            socket.emit("draw card");
            
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            console.log("Used Stagecoach: Draw 2 cards");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Indians!") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("play indians", {
              card: card
            });
            console.log("Played Indians! against all other players");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Gatling") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("play gatling", {
              card: card
            });
            console.log("Played Gatling against all other players");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "General Store") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("play general store", { card: card });
            console.log("Played General Store: Drawing cards for everyone to choose in turns");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Saloon") {
          const currentPlayer = players.find(p => p.username === username);
          if (currentPlayer) {
            playerHand.splice(index, 1);
            currentPlayer.cardCount = playerHand.length;
            socket.emit("update card count", username, playerHand.length);
            socket.emit("play saloon", { card: card });
            console.log("Played Saloon: Healing all players by 1 HP");
          }
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;
          renderPlayerCards(players);
          return;
        }

        if (card.name === "Jail") {
          targetingMode = true;
          selectedCard = card;
          document.body.removeChild(cardMenu);
          cardSelectionOpen = false;

          const targetInstruction = document.createElement("div");
          targetInstruction.id = "targetInstruction";
          targetInstruction.className = "target-instruction";
          targetInstruction.innerHTML = `<p>Select a player to put in Jail (cannot target Sheriff)</p>`;
          document.body.appendChild(targetInstruction);

          enableJailTargeting();
          return;
        }

        playerHand.splice(index, 1);

        const currentPlayer = players.find(p => p.username === username);
        if (currentPlayer) {
          currentPlayer.cardCount = playerHand.length;
          socket.emit("update card count", username, playerHand.length);
        }

        document.body.removeChild(cardMenu);
        cardSelectionOpen = false;

        renderPlayerCards(players);
      });

      cardContainer.appendChild(cardElement);
    });

    cardMenu.appendChild(cardContainer);
    document.body.appendChild(cardMenu);

    document.getElementById("closeCardMenu").addEventListener("click", () => {
      document.body.removeChild(cardMenu);
      cardSelectionOpen = false;
    });
  });



  document.getElementById("endTurn").addEventListener("click", () => {
    numberOfDrawnCards = 0;
    if (currentTurn !== username) {
      console.log("Not your turn");
      return;
    }

    // zacatek ai
    const currentPlayerIndex = players.findIndex(p => p.username === username);
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[nextPlayerIndex];
    currentTurn = nextPlayer.username;
    socket.emit("update turn", currentTurn);
    // konec ai

    renderPlayerCards(players);
    console.log(`Ended turn. It's now ${nextPlayer.username}'s turn.`);
  });
  updatePositions();

  // Update positions when window is resized
  window.addEventListener('resize', updatePositions);

  // Store resize handler reference for potential cleanup
  gameArea.resizeHandler = updatePositions;
}

//
//
// KONEC AI KOD SEKCE
//
//

socket.on("get values", (numberOfCookies, fruser) => {
  displayCookies.innerHTML += `<p>${fruser}: ${numberOfCookies}</p>`;
  console.log(numberOfCookies);
});

socket.on("get max players", (letMaxPlayers) => {
  test.innerHTML += `<h1>${letMaxPlayers}</h1>`;
});

socket.on("get rooms", (data) => {
  availableRooms.innerHTML = "<p>Available rooms</p>";
  data.forEach((room) => {
    availableRooms.innerHTML += `
      <p class="availableRoom" data-room-num="${room.roomNum}">${room.roomNum} (${room.playerCount}/${room.maxPlayers} players)</p>
    `;
  });

  document.querySelectorAll('.availableRoom').forEach(roomElement => {
    roomElement.onclick = () => {
      const roomNum = roomElement.getAttribute('data-room-num');
      console.log("Selected room:", roomNum);
      if (username) {
        socket.emit("join room", { roomNum: roomNum, username: username });
        document.getElementById("leaveRoom").style.display = "block";
      } else {
        username = "bigretard"; //tohle pak odeber
        const timeNow = Date.now().toString();
        const lastFour = timeNow.slice(-4);
        username = username + "#" + lastFour;
        socket.emit("save username", username);
        socket.emit("join room", { roomNum: roomNum, username: username });
        document.getElementById("leaveRoom").style.display = "block";
      }
    };
  });
});

socket.on("update turn", (playerUsername) => {
  currentTurn = playerUsername;
  if (players.length > 0) {
    renderPlayerCards(players);
  }

  if (currentTurn === username) {
    console.log("It's your turn!");
    
    const currentPlayer = players.find(p => p.username === username);
    if (currentPlayer && currentPlayer.attributes && currentPlayer.attributes.includes("Jail")) {
      socket.emit("jail turn start");
    } 
  }
});

socket.on("update card count", (playerUsername, cardCount) => {
  const playerToUpdate = players.find(p => p.username === playerUsername);
  if (playerToUpdate) {
    playerToUpdate.cardCount = cardCount;

    if (!cardSelectionOpen && players.length > 0) {
      renderPlayerCards(players);
    }
  }
});

socket.on("draw card result", (data) => {
  if (data.success) {
    const currentPlayer = players.find(p => p.username === username);
    
    if (currentPlayer.champion === "Kit Carlson" && numberOfDrawnCards === 0) {
      socket.emit("kit carlson ability");
      return; 
    }
    
    playerHand.push(data.card);
    if (currentPlayer) {
      currentPlayer.cardCount = playerHand.length;
      socket.emit("update card count", username, playerHand.length);
    }
    renderPlayerCards(players);
  } else {
    console.log(data.message);
  }
});

function enableTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    if (card.classList.contains('current-player')) return;
    card.classList.add('targetable');
    card.addEventListener('click', handleCardTargeting);
  });
}

function disableTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    card.classList.remove('targetable');
    card.removeEventListener('click', handleCardTargeting);
  });
  const instruction = document.getElementById('targetInstruction');
  if (instruction) document.body.removeChild(instruction);

  targetingMode = false;
  selectedCard = null;
}

// TATO FUNKCE JE AI
function handleCardTargeting(event) {
  // Get the player card that was clicked
  const targetCard = event.currentTarget;

  // Find the username in the card
  const nameElement = targetCard.querySelector('.player-name');
  const targetUsername = nameElement.textContent.replace(' (Turn)', ''); // Remove turn indicator if present

  // Find player data for target and current player
  const targetPlayer = players.find(p => p.username === targetUsername);
  const currentPlayer = players.find(p => p.username === username);

  if (!targetPlayer || !currentPlayer) {
    console.log("Could not find player data");
    disableTargeting();
    return;
  }

  // Check distance between players - already includes Mustang effect
  const distance = calculateDistance(currentPlayer, targetPlayer, players.length);

  console.log(`Distance to ${targetUsername}: ${distance}`);

  let range = 1;
  if (currentPlayer.attributes) {
    if (currentPlayer.attributes.includes("Schofield")) {
      range = 2;
    } else if (currentPlayer.attributes.includes("Remington")) {
      range = 3;
    } else if (currentPlayer.attributes.includes("Rev. Carabine")) {
      range = 4;
    } else if (currentPlayer.attributes.includes("Winchester")) {
      range = 5;
    }
  }

  if (currentPlayer.attributes && currentPlayer.attributes.includes("Scope")) {
    range += 1;
  }

  if (distance > range) {
    alert(`Target is out of range (distance: ${distance}, your range: ${range})`);
    disableTargeting();
    return;
  }

  console.log(`Targeting ${targetUsername} with Bang!`);
  const cardIndex = playerHand.findIndex(card =>
    card.name === selectedCard.name && card.details === selectedCard.details);

  if (cardIndex !== -1) {
    playerHand.splice(cardIndex, 1);
    discardCard(selectedCard);
    currentPlayer.cardCount = playerHand.length;
    socket.emit("update card count", username, playerHand.length);
  }

  socket.emit("play bang", {
    target: targetUsername,
    card: selectedCard
  });

  disableTargeting();
  renderPlayerCards(players);
}

socket.on("bang attack", (data) => {
  if (data.target !== username) return;

  console.log(`${data.attacker} attacked you with Bang!`);
  const missedCard = playerHand.find(card => card.name === "Missed!");

    const currentPlayer = players.find(p => p.username === username);
  if (missedCard || currentPlayer.champion === "Jourdonnais" || currentPlayer.attributes.includes("Barrel")) {
    showMissedDialog(data.attacker, missedCard);
  } else {
    socket.emit("take damage", {
      amount: 1,
      attacker: data.attacker
    });
  }
});

function showMissedDialog(attacker, missedCard) {
  const missedDialog = document.createElement("div");
  missedDialog.className = "missed-dialog";

  const currentPlayer = players.find(p => p.username === username);

  //fakt jsem se snazil to udelat bez ai ale ta if funkce mi nefungovala, takze to udelalo takhle pres dialogHTML
  let dialogHTML = `
    <div class="missed-dialog-content">
      <h3>${attacker} attacked you with Bang!</h3>
      <p>You have a Missed! card. Do you want to use it?</p>
      <div class="missed-buttons">
      <button id="takeDamage">No, take damage</button>`;
  
  if (missedCard) {
    dialogHTML +=`
          <button id="useMissed">Yes, use Missed!</button>`;
  }
        
  if (currentPlayer.attributes.includes("Barrel")) {
    dialogHTML += `
        <button id="useBarrel">Use Barrel</button>`;
  }

  if (currentPlayer.champion === "Jourdonnais") {  
    dialogHTML += `
        <button id="usePassive">Use passive</button>`;
  }
  dialogHTML += `
      </div>
    </div>
  `;

  missedDialog.innerHTML = dialogHTML;
  document.body.appendChild(missedDialog);

  if (missedCard) {
      document.getElementById("useMissed").addEventListener("click", () => {
    const cardIndex = playerHand.findIndex(card => card.name === missedCard.name && card.details === missedCard.details);
    if (cardIndex !== -1) {
      playerHand.splice(cardIndex, 1);
      discardCard(missedCard);
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        currentPlayer.cardCount = playerHand.length;
        socket.emit("update card count", username, playerHand.length);
      }
    }

    socket.emit("use missed", {
      attacker: attacker,
      card: missedCard
    });

    document.body.removeChild(missedDialog);
    renderPlayerCards(players);
  });
  }


  document.getElementById("takeDamage").addEventListener("click", () => {
    socket.emit("take damage", {
      amount: 1,
      attacker: attacker
    });

    document.body.removeChild(missedDialog);
  });


  if (currentPlayer.attributes.includes("Barrel")) {
    document.getElementById("useBarrel").addEventListener("click", () => { 

      const barrelCard = gameDeck.pop();
      console.log(barrelCard);
      if (barrelCard.details.includes("♥")) {
        console.log("Barrel card is a heart");
        socket.emit("use missed", {
          attacker: attacker,
          card: barrelCard
        });
        document.body.removeChild(missedDialog);
      } else {
        console.log("Barrel card is not a heart");
        document.getElementById("useBarrel").style.display = "none"; // BACHA NA INSPECT ELEMENT PAK VYRES!!
      }
    });
  }


  if (currentPlayer.champion === "Jourdonnais") {
    document.getElementById("usePassive").addEventListener("click", () => { 

      const barrelCard = gameDeck.pop();
      console.log(barrelCard);
      if (barrelCard.details.includes("♥")) {
        console.log("Card is heart");
        socket.emit("use missed", {
          attacker: attacker,
          card: barrelCard
        });
        document.body.removeChild(missedDialog);
      } else {
        console.log("Card is not a heart");
        document.getElementById("usePassive").style.display = "none"; // bro muze inspect elementnout
      }
    });
  }
}



socket.on("attack missed", (data) => {
  console.log(`${data.defender} used Missed! to avoid Bang! from ${data.attacker}`);
  //bro animaci nebo neco
});

//
socket.on("player damaged", (data) => {
  console.log(`${data.player} took ${data.amount} damage from ${data.attacker}, HP now: ${data.currentHP}`);

  const playerToUpdate = players.find(p => p.username === data.player);
  if (playerToUpdate) {
    playerToUpdate.hp = data.currentHP;
    renderPlayerCards(players);
  }
  
  if (data.player === username && data.attacker !== data.player && playerToUpdate && playerToUpdate.champion === "El Gringo") {
    console.log("El Gringo ability triggered: Drawing a card from attacker's hand");
    socket.emit("el gringo ability", {
      attacker: data.attacker
    });
  }
});

socket.on("player healed", (data) => {
  console.log(`${data.player} healed ${data.amount}, HP now: ${data.currentHP}`);

  const playerToUpdate = players.find(p => p.username === data.player);
  if (playerToUpdate) {
    playerToUpdate.hp = data.currentHP;
    renderPlayerCards(players);
  }
});

socket.on("player eliminated", (data) => {
  console.log(`${data.player} was eliminated by ${data.attacker}`);

  const playerToUpdate = players.find(p => p.username === data.player);
  if (playerToUpdate) {
    playerToUpdate.hp = 0;
    playerToUpdate.eliminated = true;
    renderPlayerCards(players);
  }

  if (data.player === username) {
    const controls = document.querySelector('.game-controls');
    controls.style.display = 'none';
    const eliminationMsg = document.createElement('div');
    eliminationMsg.className = 'elimination-message';
    eliminationMsg.innerHTML = `<h2>You have been eliminated!</h2>`;
    document.body.appendChild(eliminationMsg);
  }
});

socket.on("indians attack", (data) => {
  if (data.attacker === username) return;

  console.log(`${data.attacker} played Indians! - all players must discard a Bang! or lose 1 life point`);
  const bangCard = playerHand.find(card => card.name === "Bang!");

  if (bangCard) {
    showIndiansDialog(data.attacker, bangCard);
  } else {
    socket.emit("take damage", {
      amount: 1,
      attacker: data.attacker
    });
  }
});

function showIndiansDialog(attacker, bangCard) {
  const indiansDialog = document.createElement("div");
  indiansDialog.className = "missed-dialog"; // Reusing the missed dialog styling
  
  const dialogHTML = `
    <div class="missed-dialog-content">
      <h3>${attacker} played Indians!</h3>
      <p>You can discard a Bang! card to defend yourself.</p>
      <div class="missed-buttons">
        <button id="takeDamage">Take damage</button>
        ${bangCard ? `<button id="useBang">Use Bang!</button>` : ''}
      </div>
    </div>
  `;
  
  indiansDialog.innerHTML = dialogHTML;
  document.body.appendChild(indiansDialog);
  
  if (bangCard) {
    document.getElementById("useBang").addEventListener("click", () => {
      const cardIndex = playerHand.findIndex(card => card.name === bangCard.name && card.details === bangCard.details);
      if (cardIndex !== -1) {
        playerHand.splice(cardIndex, 1);
        discardCard(bangCard);
        const currentPlayer = players.find(p => p.username === username);
        if (currentPlayer) {
          currentPlayer.cardCount = playerHand.length;
          socket.emit("update card count", username, playerHand.length);
        }
      }
      
      socket.emit("defend indians", {
        attacker: attacker,
        card: bangCard
      });
      
      document.body.removeChild(indiansDialog);
      renderPlayerCards(players);
    });
  }
  
  document.getElementById("takeDamage").addEventListener("click", () => {
    socket.emit("take damage", {
      amount: 1,
      attacker: attacker
    });
    
    document.body.removeChild(indiansDialog);
  });
}

socket.on("indians defended", (data) => {
  console.log(`${data.defender} used Bang! to defend against Indians! from ${data.attacker}`);
});

socket.on("gatling attack", (data) => {
  if (data.attacker === username) return;

  console.log(`${data.attacker} played Gatling - all players must discard a Missed! or lose 1 life point`);
  const missedCard = playerHand.find(card => card.name === "Missed!");
  const currentPlayer = players.find(p => p.username === username);

  if (missedCard || (currentPlayer && (currentPlayer.champion === "Jourdonnais" || currentPlayer.attributes.includes("Barrel")))) {
    showMissedDialog(data.attacker, missedCard);
  } else {
    socket.emit("take damage", {
      amount: 1,
      attacker: data.attacker
    });
  }
});

const style = document.createElement('style');
style.textContent = `
.player-card.active-turn {
  box-shadow: 0 0 15px #ffcc00;
  border: 2px solid #ffcc00;
}

.player-card.targetable {
  cursor: pointer;
  box-shadow: 0 0 15px #ff3300;
  transition: transform 0.2s ease;
}

.player-card.targetable:hover {
  transform: scale(1.1);
}

.target-instruction {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 5px;
  z-index: 1000;
  text-align: center;
}

.missed-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.missed-dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  text-align: center;
}

.missed-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

.missed-buttons button {
  padding: 10px 15px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  font-weight: bold;
}

#useMissed {
  background-color: #4CAF50;
  color: white;
}

#takeDamage {
  background-color: #f44336;
  color: white;
}

.elimination-message {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 20px 30px;
  border-radius: 10px;
  text-align: center;
  z-index: 2000;
}

.game-controls button:disabled {
  background-color: #cccccc;
  color: #666666;
  cursor: not-allowed;
  opacity: 0.7;
}

.game-controls button {
  transition: all 0.2s ease;
}

.game-controls button:not(:disabled):hover {
  transform: scale(1.05);
  background-color: #45a049;
}
`;
document.head.appendChild(style);

const cardMenuStyle = document.createElement('style');
cardMenuStyle.textContent = `
.card-selection-menu {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.85);
  border-radius: 10px;
  padding: 20px;
  z-index: 1000;
  width: 80%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
}

.card-menu-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-bottom: 1px solid #444;
  padding-bottom: 10px;
}

.card-menu-header h2 {
  color: white;
  margin: 0;
}

#closeCardMenu {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  cursor: pointer;
}

.card-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
  overflow-y: auto;
  padding: 10px 0;
}

.card-item {
  width: 120px;
  height: 180px;
  background-color: #f8f8f8;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
  padding: 10px;
  text-align: center;
}

.card-item:hover {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
}

.card-name {
  font-weight: bold;
  font-size: 16px;
  margin-bottom: 10px;
}

.card-details {
  font-size: 14px;
  color: #555;
}
`;
document.head.appendChild(cardMenuStyle);

socket.on("update attributes", (playerUsername, attributes) => {
  const playerToUpdate = players.find(p => p.username === playerUsername);
  if (playerToUpdate) {
    playerToUpdate.attributes = attributes;

    if (players.length > 0) {
      renderPlayerCards(players);
    }
  }
});

function enableCatBalouTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    if (card.classList.contains('current-player')) return;
    card.classList.add('targetable');
    card.addEventListener('click', handleCatBalouTargeting);
  });
}

function handleCatBalouTargeting(event) {
  const targetCard = event.currentTarget;

  const nameElement = targetCard.querySelector('.player-name');
  const targetUsername = nameElement.textContent.replace(' (Turn)', '');

  const targetPlayer = players.find(p => p.username === targetUsername);
  const currentPlayer = players.find(p => p.username === username);

  if (!targetPlayer || !currentPlayer) {
    console.log("Could not find player data");
    disableCatBalouTargeting();
    return;
  }

  const cardIndex = playerHand.findIndex(card =>
    card.name === selectedCard.name && card.details === selectedCard.details);

  if (cardIndex !== -1) {
    playerHand.splice(cardIndex, 1);
    discardCard(selectedCard);
    currentPlayer.cardCount = playerHand.length;
    socket.emit("update card count", username, playerHand.length);
  }

  showCatBalouOptionsDialog(targetUsername);
  disableCatBalouTargeting();
}

function disableCatBalouTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    card.classList.remove('targetable');
    card.removeEventListener('click', handleCatBalouTargeting);
  });
  const instruction = document.getElementById('targetInstruction');
  if (instruction) document.body.removeChild(instruction);

  targetingMode = false;
  selectedCard = null;
}

function showCatBalouOptionsDialog(targetUsername) {
  const targetPlayer = players.find(p => p.username === targetUsername);
  // Store the card reference before we lose it
  const cardReference = {...selectedCard};
  
  const optionsDialog = document.createElement("div");
  optionsDialog.className = "cat-balou-dialog";
  
  let dialogContent = `
    <div class="cat-balou-dialog-content">
      <h3>Cat Balou - Choose Action</h3>
      <p>What would you like to do to ${targetUsername}?</p>
      <div class="cat-balou-buttons">
        <button id="randomCard">Take a Random Card</button>`;
  
  // Only show attribute option if the target has attributes
  if (targetPlayer.attributes && targetPlayer.attributes.length > 0) {
    dialogContent += `<button id="chooseAttribute">Remove an Attribute</button>`;
  }
  
  dialogContent += `</div></div>`;
  
  optionsDialog.innerHTML = dialogContent;
  document.body.appendChild(optionsDialog);
  
  document.getElementById("randomCard").addEventListener("click", () => {
    socket.emit("play cat balou", {
      target: targetUsername,
      action: "takeCard",
      card: cardReference  // Use the saved reference
    });
    document.body.removeChild(optionsDialog);
    renderPlayerCards(players);
  });
  
  const attributeButton = document.getElementById("chooseAttribute");
  if (attributeButton) {
    attributeButton.addEventListener("click", () => {
      document.body.removeChild(optionsDialog);
      showAttributeSelectionDialog(targetUsername, targetPlayer.attributes, cardReference);
    });
  }
}

function showAttributeSelectionDialog(targetUsername, attributes, cardReference) {
  const attributeDialog = document.createElement("div");
  attributeDialog.className = "cat-balou-dialog";
  
  let dialogContent = `
    <div class="cat-balou-dialog-content">
      <h3>Select Attribute to Remove</h3>
      <p>Choose which attribute to remove from ${targetUsername}:</p>
      <div class="cat-balou-attributes">`;
  
  attributes.forEach(attr => {
    dialogContent += `<button class="attribute-button" data-attr="${attr}">${attr}</button>`;
  });
  
  dialogContent += `</div></div>`;
  
  attributeDialog.innerHTML = dialogContent;
  document.body.appendChild(attributeDialog);
  
  const attributeButtons = document.querySelectorAll('.attribute-button');
  attributeButtons.forEach(button => {
    button.addEventListener("click", () => {
      const attributeToRemove = button.getAttribute('data-attr');
      socket.emit("play cat balou", {
        target: targetUsername,
        action: "removeAttribute",
        attribute: attributeToRemove,
        card: cardReference  // Use the saved reference
      });
      document.body.removeChild(attributeDialog);
      renderPlayerCards(players);
    });
  });
}

socket.on("cat balou result", (data) => {
  if (data.action === "takeCard") {
    console.log(`${data.attacker} took a card from ${data.target}`);
    
    if (data.target === username && playerHand.length > 0) {
      const randomIndex = Math.floor(Math.random() * playerHand.length);
      const removedCard = playerHand.splice(randomIndex, 1)[0];
      discardCard(removedCard);
      
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        currentPlayer.cardCount = playerHand.length;
        socket.emit("update card count", username, playerHand.length);
      }
      console.log(`${data.attacker} took your ${removedCard.name} card`);
    }
    
    if (data.attacker === username && data.cardTaken) {
      console.log(`You took a ${data.cardTaken.name} from ${data.target}`);
    }
  } else if (data.action === "removeAttribute") {
    console.log(`${data.attacker} removed ${data.attribute} from ${data.target}`);
    
     const targetPlayer = players.find(p => p.username === data.target);
    if (targetPlayer && targetPlayer.attributes) {
      targetPlayer.attributes = targetPlayer.attributes.filter(attr => attr !== data.attribute);
      renderPlayerCards(players);
    }
  }
});

const catBalouStyle = document.createElement('style');
catBalouStyle.textContent = `
.cat-balou-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.cat-balou-dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  text-align: center;
}

.cat-balou-buttons, .cat-balou-attributes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.cat-balou-buttons button, .attribute-button {
  padding: 10px 15px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  background-color: #9b4f96;
  color: white;
  transition: background-color 0.2s;
}

.cat-balou-buttons button:hover, .attribute-button:hover {
  background-color: #7a3c78;
}
`;
document.head.appendChild(catBalouStyle);

function enablePanicTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    if (card.classList.contains('current-player')) return;
    card.classList.add('targetable');
    card.addEventListener('click', handlePanicTargeting);
  });
}

function disablePanicTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    card.classList.remove('targetable');
    card.removeEventListener('click', handlePanicTargeting);
  });
  const instruction = document.getElementById('targetInstruction');
  if (instruction) document.body.removeChild(instruction);

  targetingMode = false;
  selectedCard = null;
}

function handlePanicTargeting(event) {
  const targetCard = event.currentTarget;

  const nameElement = targetCard.querySelector('.player-name');
  const targetUsername = nameElement.textContent.replace(' (Turn)', '');

  const targetPlayer = players.find(p => p.username === targetUsername);
  const currentPlayer = players.find(p => p.username === username);

  if (!targetPlayer || !currentPlayer) {
    console.log("Could not find player data");
    disablePanicTargeting();
    return;
  }

  const distance = calculateDistance(currentPlayer, targetPlayer, players.length);

  if (distance > 1) {
    alert(`Target is out of range for Panic! (distance: ${distance}, Panic! range: 1)`);
    disablePanicTargeting();
    return;
  }

  if (targetPlayer.cardCount <= 0 && (!targetPlayer.attributes || targetPlayer.attributes.length === 0)) {
    alert(`${targetUsername} has nothing to steal!`);
    disablePanicTargeting();
    return;
  }

  const cardIndex = playerHand.findIndex(card =>
    card.name === selectedCard.name && card.details === selectedCard.details);

  if (cardIndex !== -1) {
    playerHand.splice(cardIndex, 1);
    discardCard(selectedCard);
    currentPlayer.cardCount = playerHand.length;
    socket.emit("update card count", username, playerHand.length);
  }

  showPanicOptionsDialog(targetUsername);
  disablePanicTargeting();
}

function showPanicOptionsDialog(targetUsername) {
  const targetPlayer = players.find(p => p.username === targetUsername);
  // Store the card reference before we lose it
  const cardReference = {...selectedCard};
  
  const optionsDialog = document.createElement("div");
  optionsDialog.className = "panic-dialog";
  
  let dialogContent = `
    <div class="panic-dialog-content">
      <h3>Panic! - Choose Action</h3>
      <p>What would you like to steal from ${targetUsername}?</p>
      <div class="panic-buttons">`;
      
  if (targetPlayer.cardCount > 0) {
    dialogContent += `<button id="stealCard">Steal a Random Card</button>`;
  }
  
  if (targetPlayer.attributes && targetPlayer.attributes.length > 0) {
    dialogContent += `<button id="stealAttribute">Steal an Attribute</button>`;
  }
  
  dialogContent += `</div></div>`;
  
  optionsDialog.innerHTML = dialogContent;
  document.body.appendChild(optionsDialog);
  
  const stealCardButton = document.getElementById("stealCard");
  if (stealCardButton) {
    stealCardButton.addEventListener("click", () => {
      socket.emit("play panic", {
        target: targetUsername,
        action: "stealCard",
        card: cardReference  // Use the saved reference
      });
      document.body.removeChild(optionsDialog);
      renderPlayerCards(players);
    });
  }
  
  const stealAttributeButton = document.getElementById("stealAttribute");
  if (stealAttributeButton) {
    stealAttributeButton.addEventListener("click", () => {
      document.body.removeChild(optionsDialog);
      showAttributeSelectionDialogForPanic(targetUsername, targetPlayer.attributes, cardReference);
    });
  }
}

function showAttributeSelectionDialogForPanic(targetUsername, attributes, cardReference) {
  const attributeDialog = document.createElement("div");
  attributeDialog.className = "panic-dialog";
  
  let dialogContent = `
    <div class="panic-dialog-content">
      <h3>Select Attribute to Steal</h3>
      <p>Choose which attribute to take from ${targetUsername}:</p>
      <div class="panic-attributes">`;
  
  attributes.forEach(attr => {
    dialogContent += `<button class="attribute-button" data-attr="${attr}">${attr}</button>`;
  });
  
  dialogContent += `</div></div>`;
  
  attributeDialog.innerHTML = dialogContent;
  document.body.appendChild(attributeDialog);
  
  const attributeButtons = document.querySelectorAll('.attribute-button');
  attributeButtons.forEach(button => {
    button.addEventListener("click", () => {
      const attributeToSteal = button.getAttribute('data-attr');
      socket.emit("play panic", {
        target: targetUsername,
        action: "stealAttribute",
        attribute: attributeToSteal,
        card: cardReference  
      });
      document.body.removeChild(attributeDialog);
      renderPlayerCards(players);
    });
  });
}

socket.on("panic result", (data) => {
  console.log(`${data.attacker} used Panic! on ${data.target}`);
  
  if (data.action === "stealCard") {
    if (data.target === username && playerHand.length > 0) {
      const randomIndex = Math.floor(Math.random() * playerHand.length);
      const removedCard = playerHand.splice(randomIndex, 1)[0];
      
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        currentPlayer.cardCount = playerHand.length;
        socket.emit("update card count", username, playerHand.length);
      }
      
      console.log(`${data.attacker} stole your ${removedCard.name} card`);
      
      socket.emit("card stolen", {
        card: removedCard,
        from: username,
        to: data.attacker
      });
      
      renderPlayerCards(players);
    }
    
    if (data.attacker === username && data.stolenCard) {
      playerHand.push(data.stolenCard);
      
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        currentPlayer.cardCount = playerHand.length;
        socket.emit("update card count", username, playerHand.length);
      }
      
      console.log(`You stole a ${data.stolenCard.name} from ${data.target}`);
      renderPlayerCards(players);
    }
  } 
  else if (data.action === "stealAttribute") {
    console.log(`${data.attacker} stole ${data.attribute} from ${data.target}`);
    
    if (data.target === username) {
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer && currentPlayer.attributes) {
        currentPlayer.attributes = currentPlayer.attributes.filter(attr => attr !== data.attribute);
        socket.emit("update attributes", username, currentPlayer.attributes);
      }
    }
    

    if (data.attacker === username) {
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        if (!currentPlayer.attributes) {
          currentPlayer.attributes = [];
        }
        
        if (listOfWeapons.includes(data.attribute)) {
          const existingWeapon = listOfWeapons.find(weapon => currentPlayer.attributes.includes(weapon));
          if (existingWeapon) {
            currentPlayer.attributes = currentPlayer.attributes.filter(attr => attr !== existingWeapon);
          }
        }
        
        currentPlayer.attributes.push(data.attribute);
        socket.emit("update attributes", username, currentPlayer.attributes);
        console.log(`You stole ${data.attribute} from ${data.target}`);
      }
    }
    
    renderPlayerCards(players);
  }
});

const panicStyle = document.createElement('style');
panicStyle.textContent = `
.panic-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.panic-dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  text-align: center;
}

.panic-buttons, .panic-attributes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
}

.panic-buttons button, .attribute-button {
  padding: 10px 15px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  background-color: #ff5722;
  color: white;
  transition: background-color 0.2s;
}

.panic-buttons button:hover, .attribute-button:hover {
  background-color: #e64a19;
}

.panic-notification {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 2000;
  animation: fadeInOut 2s forwards;
}

@keyframes fadeInOut {
  0% { opacity: 0; }
  20% { opacity: 1; }
  80% { opacity: 1; }
  100% { opacity: 0; }
}
`;
document.head.appendChild(panicStyle);

socket.on("suzy laffayete card", (data) => {
  console.log(`received ${data.card} for ${data.for}`) //no point atp ale necham to
})

socket.on("kit carlson cards", (data) => {
  console.log(`received ${data.cards} for ${data.for}`); // no point atp ale necham to
  kitCarlsonFunction(data)
});

function kitCarlsonFunction(data) {
  const existingDialog = document.querySelector('.kit-carlson-dialog');
  if (existingDialog) {
    document.body.removeChild(existingDialog);
  }

  const kitCarlsonDialog = document.createElement("div");
  kitCarlsonDialog.className = "kit-carlson-dialog";

  let dialogHTML = `
    <div class="kit-carlson-content">
      <h3>Kit Carlson Ability</h3>
      <p class="instruction">Select 2 cards to keep. The remaining card will be placed back on top of the deck.</p>
      <div class="kit-carlson-cards">`;
  
  data.cards.forEach(card => { //pak fixni at to actually vypada jak karta
    dialogHTML += `
      <div class="kit-carlson-card" data-name="${card.name}" data-details="${card.details}"> 
        <div class="card-name">${card.name}</div>
        <div class="card-details">${card.details}</div>
      </div>`;
  });
  
  dialogHTML += `
      </div>
      <div class="selected-count">Selected: 0/2</div>
      <button class="confirm-selection" disabled>Confirm Selection</button>
    </div>`;
  
  kitCarlsonDialog.innerHTML = dialogHTML;
  document.body.appendChild(kitCarlsonDialog);

  const selectedCards = [];
  const cards = kitCarlsonDialog.querySelectorAll('.kit-carlson-card');
  const selectedCount = kitCarlsonDialog.querySelector('.selected-count');
  const confirmButton = kitCarlsonDialog.querySelector('.confirm-selection');

  cards.forEach(cardElement => {
    cardElement.addEventListener('click', () => {
      const cardName = cardElement.getAttribute('data-name');
      const cardDetails = cardElement.getAttribute('data-details');
      const card = { name: cardName, details: cardDetails };
      
      if (cardElement.classList.contains('selected')) {
        cardElement.classList.remove('selected');
        const index = selectedCards.findIndex(c => c.name === cardName && c.details === cardDetails);
        if (index !== -1) {
          selectedCards.splice(index, 1);
        }
      } else if (selectedCards.length < 2) {
        cardElement.classList.add('selected');
        selectedCards.push(card);
      }

      selectedCount.textContent = `Selected: ${selectedCards.length}/2`;
      confirmButton.disabled = selectedCards.length !== 2;
    });
  });

  confirmButton.addEventListener('click', () => {
    if (selectedCards.length === 2) {
      socket.emit('kit carlson select', {
        selectedCards: selectedCards
      });
      
      selectedCards.forEach(card => {
        playerHand.push(card);
      });
      
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        currentPlayer.cardCount = playerHand.length;
        socket.emit("update card count", username, playerHand.length);
      }
      
      document.body.removeChild(kitCarlsonDialog);
    }
  });
}

socket.on("kit carlson cards", (data) => {
  if (data.for === username) {
    kitCarlsonFunction(data);
  }
});

socket.on("kit carlson complete", (data) => {
  renderPlayerCards(players);
});

socket.on("general store cards", (data) => {
  console.log("General Store cards received:", data.cards);
  showGeneralStoreDialog(data.cards, data.playedBy, data.currentSelector);
});

function showGeneralStoreDialog(cards, playedBy, currentSelector) {
  const generalStoreDialog = document.createElement("div");
  generalStoreDialog.className = "general-store-dialog";
  
  let dialogHTML = `
    <div class="general-store-content">
      <h3>General Store</h3>
      <p>${playedBy} played General Store!</p>
      <p class="selector-info">Current selector: <strong>${currentSelector}</strong></p>`;
  
  if (currentSelector === username) {
    dialogHTML += `<p class="your-turn">It's your turn to select a card!</p>`;
  } else {
    dialogHTML += `<p class="waiting">Waiting for ${currentSelector} to select a card...</p>`;
  }
  
  dialogHTML += `<div class="general-store-cards">`;
  
  cards.forEach(card => {
    const disabledClass = currentSelector !== username ? ' disabled' : '';
    
    dialogHTML += `
      <div class="general-store-card${disabledClass}" data-name="${card.name}" data-details="${card.details}">
        <div class="card-name">${card.name}</div>
        <div class="card-details">${card.details}</div>
      </div>`;
  });
  
  dialogHTML += `</div></div>`;
  
  generalStoreDialog.innerHTML = dialogHTML;
  document.body.appendChild(generalStoreDialog);
  
  if (currentSelector === username) {
    const storeCards = document.querySelectorAll('.general-store-card');
    storeCards.forEach(cardElement => {
      cardElement.addEventListener('click', () => {
        const cardName = cardElement.getAttribute('data-name');
        const cardDetails = cardElement.getAttribute('data-details');
        
        socket.emit("select general store card", {
          card: { name: cardName, details: cardDetails }
        });
        
        storeCards.forEach(c => {
          c.classList.add('disabled');
          c.style.pointerEvents = 'none';
        });
        
        const selectorInfo = document.querySelector('.selector-info');
        if (selectorInfo) {
          selectorInfo.innerHTML = '<p>You selected a card. Waiting for other players...</p>';
        }
        
        if (document.querySelector('.your-turn')) {
          document.querySelector('.your-turn').remove();
        }
      });
    });
  }
}

socket.on("general store update selector", (data) => {
  console.log("General Store selector update:", data.currentSelector);
  const dialog = document.querySelector('.general-store-dialog');
  if (!dialog) return;

  const selectorInfo = dialog.querySelector('.selector-info');
  if (selectorInfo) {
    selectorInfo.innerHTML = `Current selector: <strong>${data.currentSelector}</strong>`;
  }
  
  // If it's now your turn, enable cards and show prompt
  if (data.currentSelector === username) {
    // Remove any existing waiting message
    const waitingMsg = dialog.querySelector('.waiting');
    if (waitingMsg) waitingMsg.remove();
    
    const generalStoreContent = dialog.querySelector('.general-store-content');
    
    // Remove existing 'your turn' message if present
    const existingYourTurn = dialog.querySelector('.your-turn');
    if (existingYourTurn) existingYourTurn.remove();
    
    // Add 'your turn' message
    const yourTurnMsg = document.createElement('p');
    yourTurnMsg.className = 'your-turn';
    yourTurnMsg.textContent = "It's your turn to select a card!";
    
    // Insert before the cards container
    const cardsContainer = dialog.querySelector('.general-store-cards');
    generalStoreContent.insertBefore(yourTurnMsg, cardsContainer);
    
    // Enable card selection and attach fresh event listeners
    const storeCards = dialog.querySelectorAll('.general-store-card');
    storeCards.forEach(card => {
      card.classList.remove('disabled');
      card.style.pointerEvents = 'auto';
      
      // Remove any existing listeners to prevent duplicates
      const clone = card.cloneNode(true);
      card.parentNode.replaceChild(clone, card);
      
      // Add fresh listener
      clone.addEventListener('click', function() {
        const cardName = this.getAttribute('data-name');
        const cardDetails = this.getAttribute('data-details');
        
        console.log(`Selecting card: ${cardName} (${cardDetails})`);
        
        socket.emit("select general store card", {
          card: { name: cardName, details: cardDetails }
        });
        
        // Disable all cards after selection
        dialog.querySelectorAll('.general-store-card').forEach(c => {
          c.classList.add('disabled');
          c.style.pointerEvents = 'none';
        });
        
        // Update UI to show waiting state
        const yourTurnElement = dialog.querySelector('.your-turn');
        if (yourTurnElement) yourTurnElement.remove();
        
        const newMsg = document.createElement('p');
        newMsg.className = 'waiting';
        newMsg.textContent = 'You selected a card. Waiting for other players...';
        generalStoreContent.insertBefore(newMsg, dialog.querySelector('.general-store-cards'));
      });
    });
  } else {
    // If it's not your turn, ensure cards are disabled and update waiting message
    const yourTurnMsg = dialog.querySelector('.your-turn');
    if (yourTurnMsg) yourTurnMsg.remove();
    
    // Update or create waiting message
    let waitingMsg = dialog.querySelector('.waiting');
    if (!waitingMsg) {
      waitingMsg = document.createElement('p');
      waitingMsg.className = 'waiting';
      const generalStoreContent = dialog.querySelector('.general-store-content');
      generalStoreContent.insertBefore(waitingMsg, dialog.querySelector('.general-store-cards'));
    }
    waitingMsg.textContent = `Waiting for ${data.currentSelector} to select a card...`;
    
    // Ensure cards are disabled
    const storeCards = dialog.querySelectorAll('.general-store-card');
    storeCards.forEach(card => {
      card.classList.add('disabled');
      card.style.pointerEvents = 'none';
    });
  }
});

// Update the event listener for when a card is selected
socket.on("general store card selected", (data) => {
  console.log(`${data.player} selected ${data.card.name} from General Store`);
  
  const dialog = document.querySelector('.general-store-dialog');
  if (!dialog) return;
  
  // Remove the selected card from the display
  let cardRemoved = false;
  const cards = dialog.querySelectorAll('.general-store-card');
  cards.forEach(cardElement => {
    if (cardElement.getAttribute('data-name') === data.card.name && 
        cardElement.getAttribute('data-details') === data.card.details) {
      cardElement.remove();
      cardRemoved = true;
    }
  });
  
  if (!cardRemoved) {
    console.warn(`Card ${data.card.name} (${data.card.details}) not found in the display`);
  }
  
  // Create or find selections container
  let selectionsContainer = dialog.querySelector('.selections-container');
  if (!selectionsContainer) {
    selectionsContainer = document.createElement('div');
    selectionsContainer.className = 'selections-container';
    dialog.querySelector('.general-store-content').appendChild(selectionsContainer);
  }
  
  // Add selection info
  const selectionInfo = document.createElement('div');
  selectionInfo.className = 'selection-info';
  selectionInfo.textContent = `${data.player} selected ${data.card.name}`;
  selectionInfo.style.color = '#ff5722';
  selectionsContainer.appendChild(selectionInfo);
});

// Update this event listener for when the general store is complete
socket.on("general store complete", (data) => {
  // If you're one of the players who selected a card, add it to your hand
  if (data.selectedBy === username && data.card) {
    playerHand.push(data.card);
    const currentPlayer = players.find(p => p.username === username);
    if (currentPlayer) {
      currentPlayer.cardCount = playerHand.length;
      socket.emit("update card count", username, playerHand.length);
    }
  }
  
  // Show final message and close dialog after delay
  const dialog = document.querySelector('.general-store-dialog');
  if (dialog) {
    const finalMsg = document.createElement('p');
    finalMsg.className = 'final-message';
    finalMsg.textContent = 'All players have selected their cards!';
    dialog.querySelector('.general-store-content').appendChild(finalMsg);
    
    setTimeout(() => {
      document.body.removeChild(dialog);
      renderPlayerCards(players);
    }, 2000);
  }
});

// Update styles for the General Store
const generalStoreStyle = document.createElement('style');
generalStoreStyle.textContent = `
.general-store-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.general-store-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 800px;
  width: 90%;
  text-align: center;
  max-height: 80vh;
  overflow-y: auto;
}

.general-store-cards {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
  margin-top: 20px;
}

.general-store-card {
  width: 120px;
  height: 180px;
  background-color: #f8f8f8;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s;
  padding: 10px;
  text-align: center;
}

.general-store-card:hover:not(.disabled) {
  transform: scale(1.05);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  background-color: #e8f5e9;
}

.general-store-card.disabled {
  opacity: 0.5;
  cursor: default;
  transform: none;
  box-shadow: none;
}

.selector-info {
  margin-top: 10px;
  font-size: 16px;
  color: #333;
}

.your-turn {
  margin-top: 10px;
  color: #2196F3;
  font-weight: bold;
  font-size: 18px;
}

.waiting {
  margin-top: 10px;
  color: #FF9800;
  font-style: italic;
}

.selections-container {
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.selection-info {
  color: #ff5722;
  font-style: italic;
}

.final-message {
  margin-top: 15px;
  color: #4CAF50;
  font-weight: bold;
  font-size: 18px;
}
`;
document.head.appendChild(generalStoreStyle);

socket.on("el gringo draw", (data) => {
  if (data.target === username && data.stolenCard) {
    playerHand.push(data.stolenCard);
    
    const currentPlayer = players.find(p => p.username === username);
    if (currentPlayer) {
      currentPlayer.cardCount = playerHand.length;
      socket.emit("update card count", username, playerHand.length);
    }
    console.log(`El Gringo: You drew a ${data.stolenCard.name} from ${data.attacker}`);
    renderPlayerCards(players);
  }
  
  if (data.attacker === username) {
    if (playerHand.length > 0) {
      const randomIndex = Math.floor(Math.random() * playerHand.length);
      const removedCard = playerHand.splice(randomIndex, 1)[0];
      
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        currentPlayer.cardCount = playerHand.length;
        socket.emit("update card count", username, playerHand.length);
      }
      
      console.log(`${data.target} took your ${removedCard.name} card using El Gringo ability`);
      
      socket.emit("el gringo card taken", {
        card: removedCard,
        from: username,
        to: data.target
      });
      
      renderPlayerCards(players);
    }
  }
});

function discardCard(card) {
  socket.emit("discard card", card);
}

socket.on("use missed", (data) => {
  const missedCard = playerHand.find(card => card.name === "Missed!");
  if (missedCard) {
    const cardIndex = playerHand.indexOf(missedCard);
    if (cardIndex !== -1) {
      playerHand.splice(cardIndex, 1);
      discardCard(missedCard);
      
      const currentPlayer = players.find(p => p.username === username);
      if (currentPlayer) {
        currentPlayer.cardCount = playerHand.length;
        socket.emit("update card count", username, playerHand.length);
      }
    }
  }
  
  renderPlayerCards(players);
});


function enableJailTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    if (card.classList.contains('current-player') || card.classList.contains('sheriff')) return;
    card.classList.add('targetable');
    card.addEventListener('click', handleJailTargeting);
  });
}

function disableJailTargeting() {
  const playerCards = document.querySelectorAll('.player-card');
  playerCards.forEach(card => {
    card.classList.remove('targetable');
    card.removeEventListener('click', handleJailTargeting);
  });
  const instruction = document.getElementById('targetInstruction');
  if (instruction) document.body.removeChild(instruction);

  targetingMode = false;
  selectedCard = null;
}

function handleJailTargeting(event) {
  const targetCard = event.currentTarget;
  
  if (targetCard.classList.contains('sheriff')) {
    alert("You cannot put the Sheriff in Jail!");
    return;
  }

  const nameElement = targetCard.querySelector('.player-name');
  const targetUsername = nameElement.textContent.replace(' (Turn)', '');

  const targetPlayer = players.find(p => p.username === targetUsername);
  const currentPlayer = players.find(p => p.username === username);

  if (!targetPlayer || !currentPlayer) {
    console.log("Could not find player data");
    disableJailTargeting();
    return;
  }

  const cardIndex = playerHand.findIndex(card => card.name === selectedCard.name && card.details === selectedCard.details);

  if (cardIndex !== -1) {
    playerHand.splice(cardIndex, 1);
    currentPlayer.cardCount = playerHand.length;
    socket.emit("update card count", username, playerHand.length);
  }

  socket.emit("play jail", {
    target: targetUsername,
    card: selectedCard
  });

  disableJailTargeting();
  renderPlayerCards(players);
}

socket.on("check jail", () => {
  console.log("You're in Jail! Draw a card to try to escape");
  showJailDialog();
});

function showJailDialog() {
  const jailDialog = document.createElement("div");
  jailDialog.className = "jail-dialog";
  
  const dialogHTML = `
    <div class="jail-dialog-content">
      <h3>You're in Jail!</h3>
      <p>Draw a card. If it's Hearts ♥, you escape and can play your turn.</p>
      <p>Otherwise, your turn is skipped.</p>
      <div class="jail-buttons">
        <button id="drawJailCard">Draw Card</button>
      </div>
    </div>
  `;
  
  jailDialog.innerHTML = dialogHTML;
  document.body.appendChild(jailDialog);
  
  document.getElementById("drawJailCard").addEventListener("click", () => {
    socket.emit("check jail escape");
    
    document.getElementById("drawJailCard").disabled = true;
    document.getElementById("drawJailCard").textContent = "Drawing...";
  });
}

socket.on("jail result", (data) => {
  const jailDialog = document.querySelector('.jail-dialog');
  if (!jailDialog) return;
  
  const content = jailDialog.querySelector('.jail-dialog-content');
  const drawnCardHTML = `
    <div class="drawn-jail-card">
      <p>You drew: <strong>${data.card.name} (${data.card.details})</strong></p>
    </div>
  `;
  
  content.insertAdjacentHTML('beforeend', drawnCardHTML);
  
  const resultMessage = document.createElement('p');
  resultMessage.className = 'jail-result';
  
  if (data.escaped) {
    resultMessage.textContent = "It's Hearts! You escape from Jail and can continue your turn.";
    resultMessage.style.color = '#4CAF50';
  } else {
    resultMessage.textContent = "Not Hearts. Your turn is skipped.";
    resultMessage.style.color = '#F44336';
  }
  
  content.appendChild(resultMessage);
  
  const buttonContainer = jailDialog.querySelector('.jail-buttons');
  buttonContainer.innerHTML = '';
  
  const dismissButton = document.createElement('button');
  dismissButton.textContent = 'OK';
  dismissButton.className = 'dismiss-jail';
  buttonContainer.appendChild(dismissButton);
  
  dismissButton.addEventListener('click', () => {
    document.body.removeChild(jailDialog);
  });
  
  if (data.escaped) {
    setTimeout(() => {
      if (jailDialog.parentNode) {
        document.body.removeChild(jailDialog);
      }
    }, 3000);
  }
});

// Add the Jail dialog style
const jailStyle = document.createElement('style');
jailStyle.textContent = `
.jail-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.jail-dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.jail-buttons {
  margin-top: 20px;
}

.jail-buttons button {
  padding: 10px 15px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  background-color: #3f51b5;
  color: white;
}

.jail-buttons button:hover {
  background-color: #303f9f;
}

.jail-buttons button:disabled {
  background-color: #9e9e9e;
  cursor: not-allowed;
}

.drawn-jail-card {
  margin-top: 15px;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 5px;
}

.jail-result {
  font-weight: bold;
  margin-top: 15px;
  font-size: 18px;
}

.dismiss-jail {
  margin-top: 15px;
  padding: 8px 20px;
}
`;
document.head.appendChild(jailStyle);

socket.on("discard pile top", (data) => {
  if (data.card) {
    showPedroRamirezDialog(data.card);
  } else {
    console.log("No cards in discard pile for Pedro Ramirez ability");
    socket.emit("draw card", numberOfDrawnCards);
    numberOfDrawnCards++;
    
    socket.emit("draw card", numberOfDrawnCards);
    numberOfDrawnCards++;
  }
});

function showPedroRamirezDialog(topCard) {
  const pedroDialog = document.createElement("div");
  pedroDialog.className = "pedro-dialog";
  
  const dialogHTML = `
    <div class="pedro-dialog-content">
      <h3>Pedro Ramirez Ability</h3>
      <p>You can draw your first card from the discard pile instead of the deck.</p>
      
      <div class="discard-card">
        <p>Top card in discard pile:</p>
        <div class="card-display">
          <div class="card-name">${topCard.name}</div>
          <div class="card-details">${topCard.details}</div>
        </div>
      </div>
      
      <div class="pedro-buttons">
        <button id="drawFromDiscard">Draw from Discard</button>
        <button id="drawFromDeck">Draw from Deck</button>
      </div>
    </div>
  `;
  
  pedroDialog.innerHTML = dialogHTML;
  document.body.appendChild(pedroDialog);
  
  const cardDisplay = pedroDialog.querySelector('.card-display');
  cardDisplay.style.padding = '10px';
  cardDisplay.style.margin = '10px auto';
  cardDisplay.style.width = '120px';
  cardDisplay.style.height = '150px';
  cardDisplay.style.backgroundColor = '#f8f8f8';
  cardDisplay.style.border = '1px solid #ddd';
  cardDisplay.style.borderRadius = '8px';
  cardDisplay.style.display = 'flex';
  cardDisplay.style.flexDirection = 'column';
  cardDisplay.style.justifyContent = 'center';
  cardDisplay.style.alignItems = 'center';
  cardDisplay.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
  
  document.getElementById("drawFromDiscard").addEventListener("click", () => {
    socket.emit("draw from discard");
    numberOfDrawnCards++;
    y
    socket.emit("draw card", numberOfDrawnCards);
    numberOfDrawnCards++;
    
    document.body.removeChild(pedroDialog);
  });
  
  document.getElementById("drawFromDeck").addEventListener("click", () => {
    socket.emit("draw card", numberOfDrawnCards);
    numberOfDrawnCards++;
    
    socket.emit("draw card", numberOfDrawnCards);
    numberOfDrawnCards++;
    
    document.body.removeChild(pedroDialog);
  });
}

const pedroStyle = document.createElement('style');
pedroStyle.textContent = `
.pedro-dialog {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
}

.pedro-dialog-content {
  background-color: white;
  padding: 20px;
  border-radius: 10px;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

.discard-card {
  margin: 15px 0;
}

.pedro-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 20px;
}

.pedro-buttons button {
  padding: 10px 15px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  background-color: #795548;
  color: white;
  transition: background-color 0.2s;
}

.pedro-buttons button:hover {
  background-color: #5d4037;
}

#drawFromDiscard {
  background-color: #ff9800;
}

#drawFromDiscard:hover {
  background-color: #f57c00;
}
`;
document.head.appendChild(pedroStyle);