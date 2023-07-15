// must include https://cdn.jsdelivr.net/npm/socket.io-client@4.5.2/dist/socket.io.js

class Client {
  constructor(options) {
    if(!io) return;
    this.socket = io("https://cool-connect.glitch.me");
    this.ready = false;
    this.userLimit = options.userLimit;
    this.client = options.client;
    this.onUserJoinCb = () => {};
    this.onUserLeaveCb = () => {};
    this.onDataCb = () => {};

    this.socket.on("userjoin", (room) => {
      this.onUserJoinCb(room);
    });

    this.socket.on("userleave", (room) => {
      this.onUserLeaveCb(room);
    });

    this.socket.on("data", (m) => {
      if (m["id"] == this.account["userId"]) return;
      this.onDataCb(m["data"]);
    });

    this.socket.on("connected", (data) => {
      this.account = data;
      this.ready = true;
    });

    
    this.link = () => {
      this.socket.emit("link", { userLimit: this.userLimit, client: this.Client });
    };    
    this.socket.on("hello", this.link);
    this.socket.on("reconnect", this.link);
  }

  sendData(data) {
    if (!this.account) {
      return;
    }
    this.socket.emit("data", { id: this.account.userId, data });
  }

  onData(cb) {
    this.onDataCb = cb;
  }

  onUserJoin(cb) {
    this.onUserJoinCb = cb;
  }

  onUserLeave(cb) {
    this.onUserLeaveCb = cb;
  }

  disconnect() {
    this.socket.disconnect();
  }
}
