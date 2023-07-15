const db = require("./sqlite.js");
const crypto = require("crypto");

async function removeUser(id) {
  const user = await db
    .table("Users")
    .first(["roomId", "id"])
    .where({ socketId: id})
    .go();
  
  console.log(user, id);
  if (!user) { return; }

  const room = await db
    .table("Rooms")
    .first(["users", "userLimit"])
    .where({ id: user.roomId })
    .go();
console.log(room);
  if (!room) {return;}
  await db.table("Users").delete().where({ id: user.id }).go();
  if (room.users - 1 > 0) {
    await db
      .table("Rooms")
      .update({
        users: room.users - 1,
        available: room.users - 1 < room.userLimit,
      })
      .where({ id: user.roomId })
      .go();
    return user.roomId;
  } else {
    await db.table("Rooms").delete().where({ id: user.roomId }).go();
  }
}

function fetchRoom(id) {
  return db.table("Rooms").first(["*"]).where({ id }).go();
}

async function newRoom(userLimit, client, isPrivate) {
  const id = crypto.randomBytes(2).toString("hex"),
    params = {
      id,
      users: 0,
      createdAt: Date.now(),
      userLimit,
      available: true,
      client, private: isPrivate
    };
  await db.table("Rooms").insert(params).go();
  return params;
} 

async function getRoom(userLimit, client) {
  const limit = typeof userLimit == "number" && userLimit < 20 ? userLimit : 5;
  const room = await db
    .table("Rooms")
    .first(["*"])
    .where({ available: 1, userLimit: limit, client, private: 0 })
    .go();
  return room;
}

async function newUser() {
  const id = crypto.randomBytes(9).toString("hex");
  await db.table("Users").insert({ id, createdAt: Date.now() }).go();
  return { id };
}

async function joinRoom(userId, roomId, socketId) {
  if (!userId || !roomId || !socketId) {
    return { success: false };
  }
  const room = await db
    .table("Rooms")
    .first(["userLimit", "users"])
    .where({ id: roomId })
    .go();
  if (room && room.users < room.userLimit) {
    var users = room.users + 1;
    await Promise.all([
      db
        .table("Rooms")
        .update({ users, available: users < room.userLimit })
        .where({ id: roomId })
        .go(),
      db
        .table("Users")
        .update({ roomId: roomId, socketId })
        .where({ id: userId })
        .go(),
    ]);
    return { success: true };
  } else {
    return { success: false, message: "Room is full" };
  }
}

function fetchUser(id) {
  return db.table("Users").first(["*"]).where({ id }).go();
}

// db.run("DELETE FROM Rooms Where 1")d

module.exports = {
  getRoom,
  fetchRoom,
  joinRoom,
  newUser,
  removeUser,
  fetchUser,
  newRoom
};
