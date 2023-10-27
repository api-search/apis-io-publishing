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
        var apis_human_url = results[0].humanURL;
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

        var sql2 = 'select p.type,p.url FROM properties p WHERE p.api_base_url = ' + connection.escape(apis_human_url) + ' AND common = 0';
        connection.query(sql2, function (error2, results2, fields2) {
    
          //if(results2 && results2.length > 0){      
                        
            publish_api.properties = results2;

            var sql3 = 'select p.type,p.url FROM properties p WHERE p.api_base_url = ' + connection.escape(apisjson_url) + ' AND common = 1';
            connection.query(sql3, function (error3, results3, fields3) {
        
              //if(results3 && results3.length > 0){      
                            
                publish_api.common = results3;            

                var path = '/repos/api-search/web-site/contents/_posts/2023-09-01-' + apis_slug + '.md';
                const options = {
                    hostname: 'api.github.com',
                    method: 'GET',
                    path: path,
                    headers: {
                      "Accept": "application/vnd.github+json",
                      "User-Agent": "apis-io-search",
                      "Authorization": 'Bearer ' + process.env.gtoken
                  }
                };

                https.get(options, (res) => {

                    var body = '';
                    res.on('data', (chunk) => {
                        body += chunk;
                    });

                    res.on('end', () => {

                      var github_results = JSON.parse(body);

                      var sha = '';
                      if(github_results.sha){
                        sha = github_results.sha;
                      }

                      var api_yaml = '---\r\n' + yaml.dump(publish_api) + '---';

                      var c = {};
                      c.name = "Kin Lane";
                      c.email = "kinlane@gmail.com";

                      var m = {};
                      m.message = 'Publishing OpenAPI';
                      m.committer = c;
                      m.sha = sha;
                      m.content = btoa(unescape(encodeURIComponent(api_yaml)));

                      // Check from github
                      var path = '/repos/api-search/web-site/contents/_posts/2023-09-01-' + apis_slug + '.md';           
                      const options = {
                          hostname: 'api.github.com',
                          method: 'PUT',
                          path: path,
                          headers: {
                            "Accept": "application/vnd.github+json",
                            "User-Agent": "apis-io-search",
                            "Authorization": 'Bearer ' + process.env.gtoken
                        }
                      };

                      //console.log(options);

                      var req = https.request(options, (res) => {

                          let body = '';
                          res.on('data', (chunk) => {
                              body += chunk;
                          });
              
                          res.on('end', () => {

                            var sql = "UPDATE apis SET published = " + weekNumber + " WHERE humanURL = " + connection.escape(apis_human_url);
                            //var sql = "UPDATE apis SET published = 0 WHERE baseURL = '" + apis_base_url + "'";
                            connection.query(sql, function (error, results, fields) { 
                              var response = {};
                              response.sql = sql;
                              response.body = body;
                              response.message = "Published " + apis_slug + " to GitHub!!";
                              callback( null, response);
                              connection.end();
                            });                         

                          });

                          res.on('error', () => {

                            var response = {};
                            response['pulling'] = "Error writing to GitHub.";            
                            callback( null, response );  
                            connection.end();

                          });

                      });

                    req.write(JSON.stringify(m));
                    req.end();   

                    });              

                    res.on('error', () => {

                      var response = {};
                      response['pulling'] = "Error reading from GitHub.";            
                      callback( null, response );  
                      connection.end();
                    });

                });   

              //}

            });  // End Common                
          
          //}

        });  // End Properties                         
  
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