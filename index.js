const { runServer, app } = require("./server");
const fs = require("fs");
const cypher = require("cypher-query-builder");
const neo4j = require("neo4j-driver");
const { text } = require("body-parser");
const { node, relation } = require("cypher-query-builder");
const driver = neo4j.driver(
  "bolt://localhost",
  neo4j.auth.basic("neo4j", "123"),
  { disableLosslessIntegers: true }
);
let db = new cypher.Connection("bolt://localhost", {
  username: "neo4j",
  password: "123",
});
runServer(3000);

app.get("/", (req, res) => {
  res.render("index.html", { title: "Homepage", message: "Wybierz endpoint" });
});

app.get("/records", async (req, res) => {
  const session = driver.session();
  let records = [];
  try {
    const results = await db.matchNode("n").return("n").run();
    records = results.map((row) => row.n);

  } catch (e) {
    res.status(500);
    res.send("Blad!");
  } finally {
   
    res.render("records.html", { records: records });
    await session.close();
  }
});

app.get("/line/:type/:name", async (req, res) =>
{
  const session = driver.session();
  let line;
  let stops=[];
  let name = req.params.name;
  let type = req.params.type;

  if (type == "Metro")
  {
    type = "MetroStation";
  }
  else if (type == "Bus")
  {
    type = "BusStation"; 
  }
  else if (type == "Tram")
  {
    type = "TramStation";
  }
  else if (type == "Train")
  {
    type = "TrainStation";
  }

  const query = `match (n:${type})-[]-(m:Line {name:'${name}'}) return n`;

  console.log(query); 

  session
    .run(query)
    .then((result) => {
      const results = result.records.map((record) => record.get(0));
      console.log(results); 

      res.render("line.html", {results: results, line:name});
    })
    .catch((e) => {
      res.status(500).send(e);
    })
    .then(() => {
      return session.close();
    });

});

app.get("/record/:name", async (req, res) => {
  const session = driver.session();
  let record;
  let name = req.params.name;
  try {
    const results = await db
      .matchNode("node")
      .where({ "node.name": name })
      .return("node")
      .run();
    record = results.map((row) => row.node);
  } catch (e) {
    res.status(500);
    res.send("Błąd!");
  } finally {
    res.render("record.html", { record: record });
    await session.close();
  }
});
app.get("/create", (req, res) => {
  res.render("createnode.html");
});
app.post("/create", async (req, res) => {
  let formType = req.body.type;
  let formName = req.body.name;
  let records = [];
  const results = await db
    .create(cypher.node("node", formType, { name: formName }))
    .return("node")
    .run();
  records = results.map((row) => row.node);
  res.render("addresults.html", { records: records, message: "Utworzyłeś : " });
});

app.get("/delete", (req, res) => {
  res.render("deletenode.html");
});

app.post("/delete", async (req, res) => {
  let formName = req.body.name;
  const results = await db
    .matchNode("node", { name: formName })
    .detachDelete("node")
    .return("node")
    .run();
  records = results.map((row) => row.node);
  res.render("deleteresults.html", {
    records: records,
    message: "You deleted: ",
    name: formName,
  });
});

app.get("/flushdata", (req, res) => {
  res.render("flushdatabase.html");
});

app.post("/flushdata", async (req, res) => {
  const results = await db.matchNode("n").detachDelete("n").run();
  res.render("flushdatabaseresult.html", {
    message: "Baza danych została wyczyszczona!",
  });
});

app.get("/relationdepth", (req, res) => {
  res.render("relationdepth.html");
});

app.post("/relationdepth", async (req, res) => {
  const session = driver.session();
  let formName = req.body.name;
  let formNumber = req.body.number;
  const query = `match p = (n {name:"${formName}"})-[r*${formNumber}]-(m) return p`;

  session
    .run(query)
    .then((result) => {
      const results = result.records.map((record) => record.get(0));

      res.render("relationdepthresult.html", {
        result: results,
        length: formNumber,
      });
    })
    .catch((e) => {
      res.status(500).send(e);
    })
    .then(() => {
      return session.close();
    });
});

app.get("/findrelation", (req, res) => {
  res.render("findrelation.html");
});

app.post("/findrelation", async (req, res) => {
  const session = driver.session();
  let formName1 = req.body.name1;
  let formName2 = req.body.name2;
  const query = `match (from {name:"${formName1}"}), (to {name: "${formName2}"}) call apoc.algo.dijkstra(from, to, 'connect|part_of', '') yield path as path return path`;

  session
    .run(query)
    .then((result) => {
      const results = result.records.map((record) => record.get(0));

      res.render("findrelationresult.html", { result: results });
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
