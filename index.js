const {runServer, app} = require('./server') ;
const cypher = require('cypher-query-builder');
const neo4j = require('neo4j-driver'); 
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '123'));
const session = driver.session();
let db = new cypher.Connection('bolt://localhost', {username: 'neo4j', password: '123',});
runServer(3000) ;

app.get("/", (req, res)=> {

    res.send("Hello public transport!"); 
});

app.get("/records", async (req,res)=> {
    let records = [];
    const results = await db.matchNode('n')
    .return('n')
    .run();
 
    records = results.map(row=>row.n.properties.name); 
    console.log(records); 

});

app.get("/record/:name", async (req, res)=>
{
   let name = req.params.name;
   const results = await db.matchNode('line', 'Line')
   .where({'line.name':name})
   .return('line') 
   .run();

   let record = results.map(row=>row.line.properties.name);
   console.log(record); 

});

app.post("/create", async (req, res)=>
{
    let formName = req.body.name;
    // const results = await db.create('line', formName, {name:formName})
    // .

});


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