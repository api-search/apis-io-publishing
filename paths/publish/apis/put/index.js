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
    
    var sql = 'SELECT * FROM apis WHERE published <> ' + weekNumber;
    connection.query(sql, function (error, results, fields) {

      if(results && results.length > 0){
        
        // Pull any new ones.
        var apis_name = results[0].name;

        var apis_slug = apis_name.replace(/ /g, '+').toLowerCase();;     


        var apisjson_url = results[0].apisjson_url;
        var apisjson_slug = apisjson_url.replace('http://','http-');
        apisjson_slug = apisjson_slug.replace('.json','');
        apisjson_slug = apisjson_slug.replace('.yaml','');
        apisjson_slug = apisjson_slug.replace('https://','https-');
        apisjson_slug = apisjson_slug.replace(/\//g, '-');
        apisjson_slug = apisjson_slug.replace('.','-');

        var save_apisjson_path = 'apis-io/api/apis-json/' + apisjson_slug + "/" + weekNumber + "/apis.json";
        var local_apis_json = "https://kinlane-productions2.s3.amazonaws.com/" + save_apisjson_path;
        
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

            var apisjson = JSON.parse(Buffer.concat(data).toString());
            var publish_api = {};
            for (let i = 0; i < apisjson.apis.length; i++) {

              if(apisjson.apis[i].name == apis_name){
                publish_api = apisjson.apis[i];
              }

            }

            console.log("PUBLISH API");
            console.log(publish_api);

            // Check from github
            const options = {
                hostname: 'api.github.com',
                method: 'GET',
                path: '/repos/api-search/web-site/contents/_posts/' + apis_slug + '.yaml',
                headers: {
                  "Accept": "application/vnd.github+json",
                  "User-Agent": "apis-io-search",
                  "Authorization": 'Bearer ' + process.env.gtoken
              }
            };

            //console.log(options);

            https.get(options, (res) => {

                let body = '';
                res.on('data', (chunk) => {
                    body += chunk;
                });
    
                res.on('end', () => {

                  var results = JSON.parse(Buffer.concat(data).toString());

                  var sha = '';
                  if(results.sha){
                    sha = results.sha;
                  }
                  var api_yaml = yaml.dump(publish_api);

                  console.log(api_yaml);

                  var c = {};
                  c.name = "Kin Lane";
                  c.email = "kinlane@gmail.com";

                  var m = {};
                  m.message = 'Publishing OpenAPI';
                  m.committer = c;
                  m.sha = sha;
                  m.content = btoa(api_yaml);

                  // Check from github
                  const options = {
                      hostname: 'api.github.com',
                      method: 'PUT',
                      path: '/repos/api-search/web-site/contents/_posts/' + apis_slug + '.yaml',
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

                        var response = {};
                        response['pulling'] = "Published to GitHub.";            
                        callback( null, response );  
                        connection.end();

                      });

                      res.on('error', () => {

                        var response = {};
                        response['pulling'] = "Error writing to GitHub.";            
                        callback( null, response );  
                        connection.end();

                      });

                  });

                  console.log("PUBLISH API-2");
                  console.log(m);

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