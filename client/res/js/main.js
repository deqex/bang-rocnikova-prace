const socket = io("http://localhost:3000");
const users = document.getElementById("users");
const send = document.getElementById("send");
const lick = document.getElementById("lick");
const roomInput = document.getElementById("roomInput");
const enterRoom = document.getElementById("enterRoom");
const roomInfo = document.getElementById("roomInfo");
const availableRooms = document.getElementById("availableRooms");


const nameInput = document.getElementById("nameInput");
const enterUsername = document.getElementById("enterUsername");

let currentRoom;
let username;
let numberOfCookies = 0;


enterUsername.onclick = () => {
  username = nameInput.value;
    socket.emit("save username", username);
    document.getElementById("nameInput").style.display="none";
    document.getElementById("enterUsername").style.display="none";
}

window.onload = () => {
  onUserConnect();
  socket.emit("get rooms");
};


lick.onclick = () => {
    console.log("click");
    console.log(numberOfCookies);
    numberOfCookies++;
}



enterRoom.onclick = () => {
  if (username = null) {
    
  } else {
      socket.emit("join room", { roomNum: roomInput.value, username: username });
  roomInput.value = "";
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
  data.map((user) => {
    users.innerHTML += `<p>${user}</p>`;
  });
});

socket.on("get rooms", (data) => {
  availableRooms.innerHTML = "<p>Available rooms</p>";
  data.map((roomNum) => {
    availableRooms.innerHTML += `
            <p>${roomNum}</p>
        `;
  });
});
