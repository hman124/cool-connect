const express = require("express");
const app = express();
//
const http = require("http").createServer(app);

const { Server } = require("socket.io");
const io = new Server(http, {
  cookie: true,
  cors: {
    origin: "https://mathmatic-games.glitch.me",
    methods: ["GET", "POST"],
  },
}); 

const cors = require("cors");
const db = require("./database.js"); 

http.listen(process.env.PORT);

app.use(cors());

io.on("connection", (socket) => {
  socket.emit("hello", { whatsup: true });

  socket.on("data", async (d) => {
    const user = await db.fetchUser(d.id);
    if (!user) {
      return;
    }
    io.to(user.roomId).emit("data", { data: d.data, id: d.id });
  });

  async function joinRoom(user, roomId, socketId) {
    const joined = await db.joinRoom(user, roomId, socketId);
    
    if (!joined.success) {
      socket.emit("error", { message: "Room is full" });
      return;
    }

    const room = await db.fetchRoom(roomId);
    
    if(room.users > 1){
      io.to(roomId).emit("userjoin", room);
    }
    
    socket.join(roomId);
    socket.emit("room", { userId: user, room });
  }
 
  socket.on("create", async params => {
    const { userLimit, client, isPrivate } = params;
    
    console.log("CREATE");
    console.log(params);
    
    //make sure it's a valid type
    if (typeof isPrivate !== "boolean") {
      return;
    }

    const [room, user] = await Promise.all([
      db.newRoom(userLimit, client, isPrivate),
      db.newUser(),
    ]);

    joinRoom(user.id, room.id, socket.id);
  });

  socket.on("join", async (params) => {
    const { userLimit, client, code } = params;
    const user = await db.newUser();

    if (typeof code == "string") {
      //join specific room
      const room = await db.fetchRoom(code);

      if (!room) {
        socket.emit("error", { message: "Room Doesn't exist" });
        return;
      }

      joinRoom(user.id, room.id, socket.id);
    } else {
      //join any room

      const [room, user] = await Promise.all([db.getRoom(userLimit, client), db.newUser()]);

      if (!room) {
        socket.emit("error", { message: "no available rooms" });
        return;
      }

      joinRoom(user.id, room.id, socket.id);
    }
  });

  //   socket.on("link", async (params) => {
  //     if (!params) return;
  //     const { userLimit, client } = params;
  //     const [room, user] = await Promise.all([
  //       db.getRoom(userLimit, client),
  //       db.newUser(),
  //     ]);
  //     if (!room) {
  //       socket.emit("reconnect", { message: "Room no longer exists" });
  //       return;
  //     }

  //     console.log(room);
  //     const joined = await db.joinRoom(user.id, room.id, socket.id);
  //     if (!joined.success) {
  //       socket.emit("reconnect", { message: "Room is full" });
  //       return;
  //     }

  //     const newroom = await db.fetchRoom(room.id);
  //     io.to(room.id).emit("userjoin", newroom);
  //     socket.join(room.id);
  //     socket.emit("room", { room: newroom, userId: user.id });
  //   });

  socket.on("disconnect", async () => {
    const roomId = await db.removeUser(socket.id);
    console.log(roomId);
    if (!roomId) {
      return;
    }
    const room = await db.fetchRoom(roomId);
    io.to(roomId).emit("userleave", room);
  });
});
