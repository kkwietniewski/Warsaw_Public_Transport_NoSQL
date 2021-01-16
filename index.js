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
  res.render("index.html", { title: "Homepage", message: "Wybierz endpoint", flushed:"empty"});
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
   
    res.render("records.html", { records: records, message:"empty" });
    await session.close();
  }
});

app.get("/line/:type/:name", async (req, res) =>
{
  const session = driver.session();
  let lineStops=[];
  let ultimateStops=[];
  let lineType;
  let name = req.params.name;
  let type = req.params.type;
  
  if (type == "Metro")
  {
    type = "MetroStation";
    lineType = "Linia Metro"; 
  }
  else if (type == "Bus")
  {
    type = "BusStation"; 
    lineType = "Linia Autobusowa"; 
  }
  else if (type == "Tram")
  {
    type = "TramStation";
    lineType = "Linia Tramwajowa"; 
  }
  else if (type == "Train")
  {
    type = "TrainStation";
    lineType = "Linia Kolejowa"; 
  }

  const query = `match p = (n:${type})-[r]-(m:Line {name:'${name}'}) return p order by r.stop_id `;

  session
    .run(query)
    .then((result) => {
      const results = result.records.map((record) => record.get(0));
      console.log(results[0].segments[0]); 
      
      results.forEach(res => {
        lineStops.push(res.segments[0]);

        if (res.segments[0].relationship.properties.ultimate_stop == "true")
        {
          ultimateStops.push(res.start.properties.name); 
        }
      })
     
      res.render("line.html", {results: lineStops, line:name, ultimateStops: ultimateStops, lineType: lineType});
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
  res.render("createnode.html", {alert:"empty"});
});
app.post("/create", async (req, res) => {
  let formLine = req.body.type;
  let formName = req.body.name;
  let formPropValue = req.body.relationPropValue;
  let records = [];

  if (!formPropValue || !formName || !formLine)
  {
    res.render("createnode.html", {alert: "Proszę uzupełnić wszystkie dane!"}); 
  }

  formPropValue = Number(formPropValue);
  if (Number.isInteger(formPropValue) != true)
  {
    res.render("createnode.html", {alert: "Proszę podać poprawne dane!"}); 
  }

    if (formLine == 'Metro' || formLine == 'Bus' || formLine == 'Tram' || formLine == 'Train')
  {
    let formType = 'Line';
    
    try {
    const results = await db
      .create(cypher.node("node", formType, { name: formName, type: formLine, zone: formPropValue }))
      .return("node")
      .run();
    records = results.map((row) => row.node);
    res.render("addresults.html", { records: records, message: "Utworzyłeś : " });
    }
    catch (e)
    {
      res.render("createnode.html", {alert:"Błąd serwera! Być może taki rekord już istnieje."}); 
    }
   
  }
  else {
    try {
  const results = await db
    .create(cypher.node("node", formLine, { name: formName, zone: formPropValue  }))
    .return("node")
    .run();
  records = results.map((row) => row.node);
  res.render("addresults.html", { records: records, message: "Utworzyłeś : " });
  }
catch (e)
{
  res.render("createnode.html", {alert: "Błąd serwera! Być może taki rekord już istnieje."});
}
  }
  
});

app.get("/delete", (req, res) => {
  res.render("deletenode.html", {alert:"empty"});
});

app.post("/delete", async (req, res) => {
  let formName = req.body.name;
  if (!formName)
  {
    res.render("deletenode.html", {alert: "Proszę uzupełnić wszystkie dane!"})
  }
  const results = await db
    .matchNode("node", { name: formName })
    .detachDelete("node")
    .return("node")
    .run();
  records = results.map((row) => row.node);
  if (records.length == 0)
      {
       res.render("deletenode.html", {alert: "Taki rekord nie istnieje!"}); 
      }
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
  res.render("index.html", {
    flushed: "Baza danych została wyczyszczona!", message: "Dodaj elementy do bazy danych!"
  });
});

app.get("/addrelation", async (req, res) => {
  const session = driver.session();
  let nodes;
  try {
    const results = await db
      .matchNode("node")
      .return("node")
      .run();
    nodes = results.map((row) => row.node);
  } catch (e) {
    res.status(500);
    res.send("Błąd!");
  } finally {
    res.render("addrelation.html", { nodes: nodes, alert:"empty"});
    await session.close();
  }
});

app.post("/addrelation", async (req,res)=>{
  const session = driver.session();
  let formNode1 = req.body.node1;
  let formNode2 = req.body.node2;
  let formRelationType = req.body.relationType;
  let formRelationName = req.body.relationName;
  let formRelationPropName1 = req.body.relationPropName1;
  let formRelationPropValue1 = req.body.relationPropValue1;
  let formRelationPropName2 = req.body.relationPropName2;
  let formRelationPropValue2 = req.body.relationPropValue2;
  let formRelationPropName3 = req.body.relationPropName3;
  let formRelationPropValue3 = req.body.relationPropValue3;
  let query;
  if(formRelationType == "out" && formRelationPropValue1.length < 1 && formRelationPropValue2.length < 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)-[:${formRelationName}]->(n2)`;
  else if(formRelationType == "out" && formRelationPropValue1.length >= 1 && formRelationPropValue2.length < 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)-[:${formRelationName}{${formRelationPropName1}:"${formRelationPropValue1}"}]->(n2)`;
  else if(formRelationType == "out" && formRelationPropValue1.length >= 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)-[:${formRelationName}{${formRelationPropName1}:"${formRelationPropValue1}",${formRelationPropName2}:"${formRelationPropValue2}"}]->(n2)`;
  else if(formRelationType == "out" && formRelationPropValue1.length >= 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length >= 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)-[:${formRelationName}{${formRelationPropName1}:"${formRelationPropValue1}",${formRelationPropName2}:"${formRelationPropValue2}",${formRelationPropName3}:"${formRelationPropValue3}"}]->(n2)`;
  else if(formRelationType == "out" && formRelationPropValue1.length < 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length >= 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)-[:${formRelationName}{${formRelationPropName2}:"${formRelationPropValue2}",${formRelationPropName3}:"${formRelationPropValue3}"}]->(n2)`;
  else if(formRelationType == "out" && formRelationPropValue1.length < 1 && formRelationPropValue2.length < 1 && formRelationPropValue3.length >= 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)-[:${formRelationName}{${formRelationPropName3}:"${formRelationPropValue3}"}]->(n2)`;
  else if(formRelationType == "out" && formRelationPropValue1.length < 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)-[:${formRelationName}{${formRelationPropName2}:"${formRelationPropValue2}"}]->(n2)`;
  else if(formRelationType == "in" && formRelationPropValue1.length < 1 && formRelationPropValue2.length < 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)<-[:${formRelationName}]-(n2)`;
  else if(formRelationType == "in" && formRelationPropValue1.length >= 1 && formRelationPropValue2.length < 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)<-[:${formRelationName}{${formRelationPropName1}:"${formRelationPropValue1}"}]-(n2)`;
  else if(formRelationType == "in" && formRelationPropValue1.length >= 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)<-[:${formRelationName}{${formRelationPropName1}:"${formRelationPropValue1}",${formRelationPropName2}:"${formRelationPropValue2}"}]-(n2)`;
  else if(formRelationType == "in" && formRelationPropValue1.length >= 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length >= 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)<-[:${formRelationName}{${formRelationPropName1}:"${formRelationPropValue1}",${formRelationPropName2}:"${formRelationPropValue2}",${formRelationPropName3}:"${formRelationPropValue3}"}]-(n2)`;
  else if(formRelationType == "in" && formRelationPropValue1.length < 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length >= 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)<-[:${formRelationName}{${formRelationPropName2}:"${formRelationPropValue2}",${formRelationPropName3}:"${formRelationPropValue3}"}]-(n2)`;
  else if(formRelationType == "in" && formRelationPropValue1.length < 1 && formRelationPropValue2.length < 1 && formRelationPropValue3.length >= 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)<-[:${formRelationName}{${formRelationPropName3}:"${formRelationPropValue3}"}]-(n2)`;
  else if(formRelationType == "in" && formRelationPropValue1.length < 1 && formRelationPropValue2.length >= 1 && formRelationPropValue3.length < 1) query = `match (n1 {name:"${formNode1}"}), (n2 {name:"${formNode2}"}) create (n1)<-[:${formRelationName}{${formRelationPropName2}:"${formRelationPropValue2}"}]-(n2)`;
  
  if (!formNode1 || !formNode2 || !formRelationType || !formRelationName)
  {
    const session = driver.session();
  let nodes;
  try {
    const results = await db
      .matchNode("node")
      .return("node")
      .run();
    nodes = results.map((row) => row.node);
  } catch (e) {
    res.status(500);
    res.send("Błąd!");
  } finally {
    res.render("addrelation.html", { nodes: nodes, alert:"Proszę podać typ relacji!"});
    await session.close();
  }
  }

  session
    .run(query)
    .catch((e) => {
      res.status(500).send(e);
    })
    .then(() => {
      res.render("addrelationresult.html", {node1: formNode1, node2: formNode2, relationName: formRelationName, });
      return session.close();
    });
});

app.get("/relationdepth", (req, res) => {
  res.render("relationdepth.html", {alert: "empty"});
});

app.post("/relationdepth", async (req, res) => {
  const session = driver.session();
  let formName = req.body.name;
  let formNumber = req.body.number;
  const query = `match p = (n {name:"${formName}"})-[r*${formNumber}]-(m) return p`;

  if (!formName || !formNumber)
  {
    res.render("relationdepth.html", {alert:"Proszę uzupełnić wszystkie dane!"}); 
  }

  formNumber = Number(formNumber); 
 
  if (Number.isInteger(formNumber)!=true)
  {
    res.render("relationdepth.html", {alert:"Wprowadź poprawne dane!"}); 
  }
  session
    .run(query)
    .then((result) => {
      const results = result.records.map((record) => record.get(0));
      
      if (results.length == 0)
      {
       res.render("relationdepth.html", {alert: "Taki rekord nie istnieje!"}); 
      }
      res.render("relationdepthresult.html", {
        result: results,
        length: formNumber,
      });
    })
    .catch((e) => {
      res.render("relationdepth.html", {alert: "Błąd serwera!"}); 
    })
    .then(() => {
      return session.close();
    });
});

app.get("/findrelation", (req, res) => {
  res.render("findrelation.html", {alert: "empty"});
});

app.post("/findrelation", async (req, res) => {
  const session = driver.session();
  let formName1 = req.body.name1;
  let formName2 = req.body.name2;

  if (!formName1 || !formName2)
  {
    res.render("findrelation.html", {alert: "Proszę uzupełnić wszystkie dane!"}); 
  }

  const query = `match (from {name:"${formName1}"}), (to {name: "${formName2}"}) call apoc.algo.dijkstra(from, to, 'connect|part_of', '') yield path as path return path`;

  session
    .run(query)
    .then((result) => {
      const results = result.records.map((record) => record.get(0));
      if (results.length == 0)
      {
       res.render("findrelation.html", {alert: "Nie można odnaleźć takiej trasy!"}); 
      }

      res.render("findrelationresult.html", { result: results, node1: formName1, node2: formName2 });
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
