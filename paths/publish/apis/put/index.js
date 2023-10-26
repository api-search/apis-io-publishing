const vandium = require('vandium');
const mysql  = require('mysql');
const https  = require('https');
const yaml = require('js-yaml');

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

    var year = currentDate.getFullYear().toString();
    var month = (currentDate.getMonth() + 101).toString().substring(1);
    var day = (currentDate.getDate() + 100).toString().substring(1);
    var timestamp =  year + "-" + month + "-" + day;
    
    var sql = 'select a.name,ao.name as name2,a.slug,ao.slug as slug2,a.description,ao.description AS description2,a.image,ao.image AS image2,a.baseURL,a.humanURL,a.apisjson_url,a.tags,a.published,(select name from apisjson_overlay aj WHERE aj.apisjson_url = a.apisjson_url) as indexName,(select score from apisjson aj WHERE aj.url = a.apisjson_url) as score,(select percentage from apisjson aj WHERE aj.url = a.apisjson_url) as percentage,(select rules from apisjson aj WHERE aj.url = a.apisjson_url) as rules FROM apis a LEFT JOIN apis_overlay ao ON a.humanURL = ao.humanURL WHERE a.published <> ' + weekNumber;
    connection.query(sql, function (error, results, fields) {

      var response = {};
      response['pulling'] = "Wa Wah";            
      callback( null, results );  
      connection.end();              

  });

});