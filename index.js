const { runServer, app } = require("./server");
const fs = require("fs");
const cypher = require("cypher-query-builder");
const neo4j = require("neo4j-driver");
const { text } = require("body-parser");
const { node, relation } = require("cypher-query-builder");
const driver = neo4j.driver(
  "bolt://localhost",
  neo4j.auth.basic("neo4j", "123")
);
let db = new cypher.Connection("bolt://localhost", {
  username: "neo4j",
  password: "123",
});
runServer(3000);

app.get("/", (req, res) => {
  res.send("Hello public transport!");
});

app.get("/records", async (req, res) => {
  let records = [];
  const results = await db.matchNode("n").return("n").run();

  records = results.map((row) => row.n.properties.name);
  res.send(records);
});

app.get("/record/:name", async (req, res) => {
  let name = req.params.name;
  const results = await db
    .matchNode("line", "Line")
    .where({ "line.name": name })
    .return("line")
    .run();

  let record = results.map((row) => row.line.properties.name);
  res.send(record);
});

app.post("/create", async (req, res) => {
  let formType = req.body.type;
  let formName = req.body.name;
  const results = await db
    .create(cypher.node("node", formType, { name: formName }))
    .return("node")
    .run();
  console.log(formType);
  res.send(results.map((row) => row.node.properties.name));
});

app.post("/delete", async (req, res) => {
  let formType = req.body.type;
  let formName = req.body.name;
  const results = await db
    .matchNode("node", formType, { name: formName })
    .delete("node")
    .return("node")
    .run();
  res.send(`Usunięto ${formType} ${formName}`);
});

app.get("/flushdata", async (req, res) => {
  const results = await db.matchNode("n").detachDelete("n").run();
  res.send("Database delated");
});

app.post("/relation", async (req, res) => {
  const session = driver.session();
  let formType = req.body.type;
  let formName = req.body.name;
  let formNumber = req.body.number;
  const query = `match p = (n:${formType} {name:"${formName}"})-[r*${formNumber}]-(m) return p`;

  session
    .run(query)
    .then((result) => {
      const results = result.records.map((record) => record.get(0));

      res.send(results);
    })
    .catch((e) => {
      res.status(500).send(e);
    })
    .then(() => {
      return session.close();
    });
});
// app.get("/createdatabase", async(req, res) => {

// 	let queries=[];
// 	let tmp="";
// 	let queryNo = 0;
// 	let text;
// 	fs.readFile('./database.txt', async (err,data) => {
// 		if (err) throw err;
// 		text = data.toString();
// 		text = text.split(";");

// 		text.forEach(function(query) {
// 			queries.push(session.run(query))
// 		})

// 		console.log(queries);
// 		// Promise.all(queries).then(function(results) {
// 		// 	results.forEach(function (result) {
// 		// 		console.log(result)
// 		// 	})
// 		// 	session.close()
// 		// 	driver.close()
// 		// })

// 	res.send('Database created');
// 	});
// });

// try {
//     const result = await session.run("MATCH (n) return n");

//     const nodes = result.records;

//     nodes.forEach((record) => {
//       records.push(record.get(0));
//     });

//     records.forEach((result) => {
//       console.log(result.properties.name);
//     });
//   } finally {
//     await session.close();
//   }
//   res.send(records);
//   await driver.close();
