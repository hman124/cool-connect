const dbfile = "/app/.data/clients_v1.0.5.db";
const fs = require("fs");
const exists = fs.existsSync(dbfile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbfile);

if (exists) {;
  console.log("el database es ready, señor");
} else {
  db.serialize(() => {
    db.run("CREATE TABLE Users (id TEXT, socketId TEXT, createdAt INT, roomId TEXT)");
    db.run("CREATE TABLE Rooms (id TEXT, users INT, createdAt INT, available BOOL, userLimit INT, client TEXT)");
  });
}
// db.run("ALTER TABLE Rooms ADD COLUMN private BOOL")
db.run("DELETE FROM Rooms Where 1")
db.run("DELETE FROM Users Where 1")
function dbAll(query, ...stmts) {
  return new Promise((res, rej) => {
    db.all(query, ...stmts, (err, rows) => {
      if (err) { 
        rej(err);
      } else {
        res(rows);
      }
    });
  });
}

function dbRun(query, ...stmts) {
  return new Promise((res, rej) => {
    db.run(query, ...stmts, err => {
      if (err) {
        rej(err);
      } else {
        res();
      }
    });
  });
}

async function dbFirstOld(query,...stmts) {
  const data = await dbAll(query, ...stmts);
  return data.length?data[0]:false;
}

function dbSelect(table, select, json) {
  var [criteria, params] = getInfo(json);
  return dbAll(
    `Select ${select.join(",")} From ${table} Where ${criteria}`,
    ...params
  );
}

async function dbFirst(...params) {
  var rows = await dbSelect(...params);
  if (Object.keys(rows).length > 0) {
    return rows[0];
  } else {
    return false;
  }
}

async function dbExists(table, json) {
  var rows = await dbSelect(table, ["*"], json);
  if (Object.keys(rows).length > 0) {
    return true;
  } else {
    return false;
  }
}

function dbInsert(table, json) {
  var params = Object.values(json);
  return dbRun(
    `Insert Into ${table} (${Object.keys(json).join(",")}) Values (?${",?".repeat(
      params.length - 1
    )})`,
    ...params
  );
}

function dbUpdate(table, newjson, oldjson) {
  var [oldcriteria, params] = getInfo(oldjson),
      [,newparams] = getInfo(newjson); 
  return dbRun(
    `Update ${table} Set ${Object.keys(newjson).join("=?,") + "=?"} Where ${oldcriteria}`,
    ...newparams, ...params
  );
}

function getInfo(json) {
  if(!json) {
    throw new Error("Missing Required JSON Parameter, use {} for wildcard (if applicable).");
  } else {
    return [
      Object.keys(json).join("=? And ") + (Object.keys(json).length>0?"=?":"1"),
      Object.values(json)
    ];
  }
}

function dbDelete(table, json) {
  var [criteria, params] = getInfo(json);
  return dbRun(`Delete From ${table} Where ${criteria}`, ...params);
}

class Table {
  constructor (table) {
    this.table = table;
  }
  
  select (what) {
    if(!this.type) {
      this.type = "select";
      this.select_what = what;
    }
    return this;
  }
  
  insert (what){
    if(!this.type) {
      this.type = "insert";
      this.insert_what = what;  
    }
    return this;
  }
  
  update (what) {
    if(!this.type) {
      this.type = "update";
      this.update_what = what;
    }
    return this;
  }
  
  delete () {
    if(!this.type) {
      this.type = "delete";
    }
    return this;
  }
  
  first (what) {
    if(!this.type) {
      this.type = "first";
      this.select_what = what;
    }
    return this;
  }
  
  where (condition) {
    if(this.type !== "insert") {
      this.where_condition = condition;
    }
    return this;
  }
  
  exists () {
    if(!this.type) {
      this.type = "exists";
    }
    return this;
  }
  
  go () {
    switch (this.type){
      case undefined:
        return null;
      break;
      case "select":
        return dbSelect(this.table, this.select_what, this.where_condition);
      break;
      case "update":
        return dbUpdate(this.table, this.update_what, this.where_condition);
      break;
      case "insert":
        return dbInsert(this.table, this.insert_what);
      break;
      case "delete":
        return dbDelete(this.table, this.where_condition)
      break;
      case "first":
        return dbFirst(this.table, this.select_what, this.where_condition);
      break;
      case "exists":
        return dbExists(this.table, this.where_condition);
      break;
    }
  }
}


function table(...p){return new Table(...p);}

module.exports = {table, all:dbAll, run: dbRun, first: dbFirstOld};