const vandium = require('vandium');
const mysql  = require('mysql');
const https  = require('https');

exports.handler = vandium.generic()
  .handler( (event, context, callback) => {

    var connection = mysql.createConnection({
    host     : process.env.host,
    user     : process.env.user,
    password : process.env.password,
    database : process.env.database
    });

    let currentDate = new Date();
    let startDate = new Date(currentDate.getFullYear(), 0, 1);
    let days = Math.floor((currentDate - startDate) / (24 * 60 * 60 * 1000));
     
    const weekNumber = Math.ceil(days / 7);     
    
    var sql = 'SELECT * FROM apis WHERE published <> ' + weekNumber;
    connection.query(sql, function (error, results, fields) {

      if(results && results.length > 0){
        
        // Pull any new ones.
        var apisjson_name = results[0].name;
        var apisjson_url = results[0].apisjson_url;
        var apisjson_slug = apisjson_url.replace('http://','http-');
        apisjson_slug = apisjson_slug.replace('.json','');
        apisjson_slug = apisjson_slug.replace('.yaml','');
        apisjson_slug = apisjson_slug.replace('https://','https-');
        apisjson_slug = apisjson_slug.replace(/\//g, '-');
        apisjson_slug = apisjson_slug.replace('.','-');

        var local_apis_json = "https://kinlane-productions2.s3.amazonaws.com/" + results[0].path;
        console.log(local_apis_json);

        https.get(local_apis_json, res => {
          
          let data = [];
          //const headerDate = res.headers && res.headers.date ? res.headers.date : 'no response date';
          
          //console.log('Status Code:', res.statusCode);
          //console.log('Date in Response header:', headerDate);
        
          res.on('data', chunk => {
            data.push(chunk);
          });
        
          res.on('end', () => {

            var apisjson = JSON.stringify(Buffer.concat(data).toString());

            callback( null, apisjson );


          });
        }).on('error', err => {
          var response = {};
          response['pulling'] = "Problem pulling the APIs.json.";            
          callback( null, response );  
        });        
  
      }
      else{
        
        // Pull one that is old
        var response = {};
        response['pulling'] = "No more to rate.";            
        callback( null, response );  
        connection.end();        
          
      }      

  });

});