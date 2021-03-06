var md = require('node-markdown').Markdown,
    redisWrite = require('../rediswrite'),
    util = require('util'),
    output = require('../output'),
    dsutils = require('../dsutils'),
    content = {type:"application/json"};

module.exports = function(app) {
  
	app.post('/return', function(req, res) {
	  content.data = JSON.stringify('{"output":"'+escape(md(unescape(req.body.str)))+'"}');
		output(req,res,content);
	});  

  app.post('/save', function(req,res) {
    var itemId = req.body.id,
        type = req.body.type;
    
    if (!itemId || itemId == "null") {
      itemId = null;
    }
                    
    var mainStr = type + ":",
        nowDate = new Date(),
        title = req.body.title || "Untitled",
        uri = req.body.title ? req.body.title.replace(/\s/g,"-") : "untitled-article-"+(nowDate.toString()).replace(/\s/g,"-"),
        nowDateTime = dsutils.dateFormat(nowDate);
        
    uri = uri.replace(/[^A-Za-z0-9\-]/g,"");
    uri = uri.toLowerCase();

    if (!itemId) {
      redisWrite.writeNew("item", function (err, id) {
        mainStr += id + ":";
        
        var bodyContent = unescape(req.body.str);
        
        var score = nowDate.getTime()+"";
            
        client.set(mainStr + "title", title);
        client.zadd(type+"s", score, type + ":" + id); 
        client.zunionstore("items",2,"articles","links");
        
        if (type == "article") {
          client.set(mainStr + "uri", uri);
          client.set("article-title:"+uri+":id", id); 
          client.set(mainStr + "description", req.body.description);
          client.set(mainStr + "content", bodyContent);            
        } else if (type == "link") {
          var matches = bodyContent.match(/^(http:\/\/.+)\n\n(.+)/i);
          if (matches) {
            client.set(mainStr + "uri", matches[1]);
            client.set(mainStr + "text", matches[2]);            
          }
        }
        
        client.set(mainStr + "datetime-created", nowDateTime);
        client.set(mainStr + "datetime-modified", nowDateTime);
                          
        res.writeHead(200,{"Content-Type":"text/plain"});
        res.end("Success.");          
      });        
    } else {
      mainStr += itemId + ':';
    
      client.set(mainStr + "title", title);
      client.set(mainStr + "content", unescape(req.body.str));
      client.set(mainStr + "datetime-modified", nowDateTime);
      
      if (type == "article") { 
        client.set("article-title:"+title+":id", id);        
      }
      
      res.writeHead(200,{"Content-Type":"text/plain"});
      res.end("Success.");        
    }
    
  });

}