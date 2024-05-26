const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const cors = require('cors');
const databasePath = path.join(__dirname, "userData.db");

const app = express();
app.use(cors());

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
const validatePassword = (password) => {
  return password.length < 4;
};
//todo and selfGroup tables are created
app.get("/", async (request, response) => {
  try{
    const createTableQuery = `
    CREATE TABLE selfGroup (
      id INTEGER NOT NULL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL, 
      gender VARCHAR(255) NOT NULL,
      avatar VARCHAR(255) NOT NULL,
      domain VARCHAR(255) NOT NULL,
      available BOOLEAN
    )
  `;
  const fetchData = await database.run(createTableQuery);
  response.send({"message":"table created"});
  }catch(err){
    response.status(400).send({"message":"Table already created"});
  }
});

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const query = `
    SELECT * FROM user WHERE username='${username}';`;
  const responseData = await database.get(query);
  const value = validatePassword(password);
  console.log(value);
  if (responseData !== undefined) {
    response.status(400);
    response.send({"message":"user already exists"});
  } else if (validatePassword(password)) {
    response.status(400);
    response.send({"message":"length of the password should not be less than 4"});
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    const insertionQuery = `
     INSERT INTO
      user (username, name, password, gender, location)
     VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`;
    await database.run(insertionQuery);
    response.send({"message":"Registration Completed"});
  }
});

//To add the data into the Todo list
app.post("/todoUsers", async (request, response) => {
  try{const {
    first_name,
    last_name,
    email,
    gender,
    avatar,
    domain,
    available,
  } = request.body;
  const firstName = first_name;
  const lastName = last_name;
  console.log(firstName, lastName, email, gender, avatar, domain, available);
  const query1 = `
  SELECT * FROM todo WHERE email='${email}'`;
  const resolve = await database.get(query1);
  if (resolve !== undefined) {
    response.status(400);
    response.send(resolve);
  } else {
    const insertionQuery = `
      INSERT INTO todo(first_name,last_name,email,gender,avatar,domain,available)
      VALUES(
          '${firstName}','${lastName}','${email}','${gender}','${avatar}','${domain}',${available})
      
      `;
    const dataResponse = await database.run(insertionQuery);
    response.send({"message":"added successfully"});
  }
  }catch(err){
    response.status(400).send({err});
  }
});

//to get the data from the selfGroup
app.get("/usersGroup", async (request, response) => {
  const query = `SELECT * FROM selfGroup`;
  const details = await database.all(query);
  response.send(details);
});

//to add the user into the group
app.post("/usersGroup", async (request, response) => {
  const {
    first_name,
    last_name,
    email,
    gender,
    avatar,
    domain,
    available,
  } = request.body;
  const firstName = first_name;
  const lastName = last_name;
  console.log(firstName, lastName, email, gender, avatar, domain, available);
  const query1 = `
  SELECT * FROM selfGroup WHERE email='${email}'`;
  const resolve = await database.get(query1);
  if (resolve !== undefined) {
    response.status(400);
    response.send({ message: "user already exists" });
  } else {
    const insertionQuery = `
      INSERT INTO selfGroup(first_name,last_name,email,gender,avatar,domain,available)
      VALUES(
          '${firstName}','${lastName}','${email}','${gender}','${avatar}','${domain}',${available})
      
      `;
    const dataResponse = await database.run(insertionQuery);
    response.send({ message: "added successfully" });
  }
});

//to delete the user from delete list
app.delete("/delete/:id", async (request, response) => {
  const { id } = request.params;
  const query = `
   DELETE FROM todo
   WHERE id=${id}`;
  await database.run(query);
  response.send("deleted successfully");
});

//to delete the user From the Group
app.delete("/deleteFromGroup/:id", async (request, response) => {
  const { id } = request.params;
  const query = `
   DELETE FROM selfGroup
   WHERE id=${id}`;
  await database.run(query);
  response.send("deleted successfully");
});

//fetches the user with his name
app.get("/user/:name", async (request, response) => {
  const { name } = request.params;
  const query = `
    SELECT * FROM todo WHERE first_name LIKE '%${name}%' `;
  const fetchedData = await database.get(query);
  response.send(fetchedData);
});

//filtered data
app.get("/users/", async (request, response) => {
  const {
    domain = "",
    gender = "",
    available = "",
    limit = 20,
    offset = 0,
  } = request.query;
  let query = null;
  console.log(domain, gender, available);
  if (gender !== "" && domain !== "" && available !== "") {
    query = `SELECT * FROM todo WHERE domain IN (${domain}) AND gender IN (${gender}) AND available LIKE ${available} LIMIT ${limit} OFFSET ${offset}`;
  } else if (gender !== "" && domain !== "") {
    query = `SELECT * FROM todo WHERE domain IN (${domain}) AND gender IN (${gender}) LIMIT ${limit} OFFSET ${offset}`;
  } else if (domain !== "" && available !== "") {
    query = `SELECT * FROM todo WHERE domain IN (${domain}) AND available LIKE ${available} LIMIT ${limit} OFFSET ${offset}`;
  } else if (gender !== "" && available !== "") {
    query = `SELECT * FROM todo WHERE gender IN (${gender}) and available LIKE ${available} LIMIT ${limit} OFFSET ${offset}`;
  } else if (domain !== "") {
    query = `SELECT * FROM todo WHERE domain IN (${domain}) limit ${limit} offset ${offset}`;
  } else if (gender !== "") {
    query = `SELECT * FROM todo WHERE gender IN (${gender}) LIMIT ${limit} OFFSET ${offset}`;
  } else if (available !== "") {
    query = `SELECT * FROM todo WHERE available LIKE ${available} LIMIT ${limit} OFFSET ${offset}`;
  } else {
    query = `SELECT * FROM todo limit ${limit} offset ${offset}`;
  }
  const fetchedData = await database.all(query);
  response.send(fetchedData);
});

//updates Data
app.put("/users/:id", async (request, response) => {
  const { id } = request.params;
  console.log(id);
  const {
    first_name,
    last_name,
    email,
    gender,
    avatar,
    domain,
    available,
  } = request.body;
  const firstName = first_name;
  const lastName = last_name;
  const query = `
 UPDATE todo
 SET first_name='${firstName}',
 last_name='${lastName}',
 email='${email}',
 gender='${gender}',
 avatar='${avatar}',
 domain='${domain}',
 available=${available}
 WHERE id=${id}`;
  const execute = await database.run(query);
  response.send("updated Successfully");
});
