const {runServer, app} = require('./server') ;
const neo4j = require('neo4j-driver'); 
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', '123'));
const session = driver.session();

runServer(3000) ;

app.get("/", (req, res)=> {
   session
    .run('MATCH (n) RETURN n')
        .then(function(result) {
            result.records.forEach(function(record) {
                console.log(record._fields[0].properties);
                
            });
        })
        .catch(function(err){
            console.log(err);
        });
        res.send('fuck it'); 
});
