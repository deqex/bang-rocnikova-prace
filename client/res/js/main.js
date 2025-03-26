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
  const distance = Math.min(clockwise, counterClockwise);

  // Apply character-specific distance modifiers
  if (playerA.champion === "Rose Doolan") {
    // Rose Doolan sees adjacent players at a distance decreased by 1
    return Math.max(1, distance - 1);
  }

  return distance;
}

//
//
// KONEC AI KOD SEKCE
//
//

function generateGameData(players) {
  const championData = { // generovano pomoci ai abych nemusel opisovat s trochou opravy struktura tvorena mnou
    "Willy the Kid": { baseHP: 4, description: "Can play any number of BANG! cards" },
    "Calamity Janet": { baseHP: 4, description: "Can use BANG! cards as Missed! and vice versa" },
    "Bart Cassidy": { baseHP: 4, description: "Each time he loses a life point, he draws a card" },
    "Kit Carlson": { baseHP: 4, description: "Looks at top 3 cards of the deck when drawing" },
    "Jesse Jones": { baseHP: 4, description: "Can draw the first card from the hand of a player" },
    "Rose Doolan": { baseHP: 4, description: "Sees adjacent players at a distance decreased by 1" },
    "El Gringo": { baseHP: 3, description: "When hit by a player, draws a card from their hand" },
    "Jourdonnais": { baseHP: 4, description: "Has a permanent Barrel in play" },
    "Black Jack": { baseHP: 4, description: "Shows second card drawn; if Hearts/Diamonds, draws again" },
    "Slab the Killer": { baseHP: 4, description: "Players need 2 Missed! cards to cancel his BANG!" },
    "Lucky Duke": { baseHP: 4, description: "Flips top 2 cards for checks and chooses which to use" },
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
  shuffleArray(bangCards);
  socket.emit("get cards", bangCards);

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
    <button id="playCard" ${!isPlayerTurn ? 'disabled' : ''}>Play Card</button>
    <button id="drawCard" ${!isPlayerTurn ? 'disabled' : ''}>Draw Card</button>
  `;
  gameArea.appendChild(controls);

  document.getElementById("drawCard").addEventListener("click", () => {
    if (currentTurn !== username) {
      console.log("not your turn");
      return;
    }
    socket.emit("draw card");
  });
  
  document.getElementById("playCard").addEventListener("click", () => {
    if (currentTurn !== username) {
      console.log("Not your turn");
      return;
    }
    
    if (playerHand.length === 0) { //lowkey pak mozna dej do jednoho ifu jsem linej rn
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

socket.on("draw card result", (result) => {
  if (result.success) {
    const drawnCard = result.card;
    playerHand.push(drawnCard);
    console.log("Drew card:", drawnCard);
    console.log(`Cards remaining in deck: ${result.remainingCards}`);
    
    const currentPlayer = players.find(p => p.username === username);
    if (currentPlayer) {
      currentPlayer.cardCount = playerHand.length;
      socket.emit("update card count", username, playerHand.length);
    }
    renderPlayerCards(players);
  } else {
    console.log(result.message);
  }
});

const style = document.createElement('style');
style.textContent = `
.player-card.active-turn {
  box-shadow: 0 0 15px #ffcc00;
  border: 2px solid #ffcc00;
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