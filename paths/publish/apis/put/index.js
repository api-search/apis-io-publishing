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
    
    var sql = 'select a.name,ao.name as name2,a.slug,ao.slug as slug2,a.description,ao.description AS description2,a.image,ao.image AS image2,a.baseURL,a.humanURL,a.apisjson_url,a.tags,a.published,(select name from apisjson_overlay aj WHERE aj.apisjson_url = a.apisjson_url) as indexName,(select score from apisjson aj WHERE aj.url = a.apisjson_url) as score,(select percentage from apisjson aj WHERE aj.url = a.apisjson_url) as percentage,(select rules from apisjson aj WHERE aj.url = a.apisjson_url) as rules FROM apis a LEFT JOIN apis_overlay ao ON a.humanURL = ao.humanURL WHERE a.published <> ' + weekNumber + ' LIMIT 1';
    connection.query(sql, function (error, results, fields) {

      if(results && results.length > 0){

        var apis_name = results[0].name2;
        var apis_slug = results[0].slug2;
        var apis_description = results[0].description;
        var apis_image = results[0].image;
        var apis_tags = results[0].tags;
        var apis_human_url = results[0].humanUrl;
        var apis_base_url = results[0].baseURL;
        var apis_score = results[0].score;
        var apis_percentage = results[0].percentage;
        var apis_rules = results[0].rules;
        var apisjson_url = results[0].apisjson_url;
        
        var publish_api = {};
        
        // Needed for Static Layout
        publish_api.layout = "post";
        publish_api.published = true;

        // Main API Details
        publish_api.name = apis_name;
        publish_api.description = apis_description;
        publish_api.image = apis_image;
        publish_api.tags = apis_tags.split(',');
      
        publish_api.humanURL = apis_human_url;
        publish_api.baseURL = apis_base_url;

        publish_api.score = apis_score;
        publish_api.percentage = apis_percentage;
        publish_api.rules = apis_rules;        

        // Pull one that is old
        var response = {};
        response['pulling'] = "Rah";            
        callback( null, publish_api );  
        connection.end();                                  
  
      }
      else{
        
        // Pull one that is old
        var response = {};
        response['pulling'] = "No more to publish.";            
        callback( null, response );  
        connection.end();        
          
      }      

  });

});