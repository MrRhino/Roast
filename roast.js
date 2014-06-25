var fs = require("fs");
var restify = require('restify');

var levelup = require('levelup');
var db = levelup('./mydb');

var delimiter = "\x00";

function createUUID() {
    // http://www.ietf.org/rfc/rfc4122.txt
    var s = [];
    var hexDigits = "0123456789abcdef";
    for (var i = 0; i < 36; i++) {
        s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
    }
    s[14] = "4";  // bits 12-15 of the time_hi_and_version field to 0010
    s[19] = hexDigits.substr((s[19] & 0x3) | 0x8, 1);  // bits 6-7 of the clock_seq_hi_and_reserved to 01
    s[8] = s[13] = s[18] = s[23] = "-";

    var uuid = s.join("");
    return uuid;
}

var server = restify.createServer();

server.use(restify.gzipResponse());
server.use(restify.bodyParser());
server.use(restify.CORS());

server.listen(3000, function() {
    console.log('%s listening at %s', server.name, server.url);
});

function RESTput(req, res, next) {
    var id = unescape(req.params.id);
    console.log("RESTput >>>>>> id :" + req.params.id);
    console.log("RESTput >>>>>> id :" + id);
    console.log('RESTput >>>>>> value :' + JSON.stringify(req.params));

    console.log('RESTput >>>>>> name :' + req.params.name);
    console.log('RESTput >>>>>> description :' + req.params.description);
    console.log('RESTput >>>>>> price :' + req.params.price);
    var data = {key:id, value:JSON.stringify(req.params)};

    put(data, (function(res){
        return function() {
                res.send(204);
        };
    })(res));
    return next();
}

function RESTsend(req, res, next) {
    var id = unescape(req.params.id);
    if(req.params)console.log('GET @@ :' + id);
    get(id, function(value) {
        // stringify value if object
        if(typeof value == 'object'){
        }
        else if(value.charAt(0) == '{'){
            console.log('RESTsend !!! esc_id, id, value : ' + escape(value.id) + ', ' + id + ', ' + JSON.stringify(value));
            value = JSON.parse(value);
            value.id = req.params.id;
            console.log('RESTsend --- reqParmId, stringifyId, value : ' + req.params.id + ', ' + escape(JSON.stringify(value.id)) + ', ' + JSON.stringify(value));
        }
        res.send(value);

    });
    return next();
}

function RESTlist(req, res, next, key) {
    console.log('GET');
    var start = key + "\x00feet";
    var stop = key + "\x00plane\xff"; 
    getStream({
        // start: start,
        // end: stop,
        callback: function(value) {
            for(i in value){
                if(typeof value[i].value == 'object'){
                }
                else if(value[i].value.charAt(0) == '{'){
                    console.log('---------------');
                    var id = escape(value[i].key);
                    value[i] = JSON.parse(value[i].value);
                    value[i].id = id;
                    console.log('--- ' + JSON.stringify(value[i]));
                }
            }
            res.send(value);

        }
    });
    return next();
}

function RESTdel(req, res, next) {
    var id = unescape(req.params.id);
    if(req.params)console.log('DELETE ## :' + id);

    del({key:id}, (function(res){
        return function(err){
            if(err)res.send(500);
            else res.send(204);
        }})(res)
    );
    return next();
}

function RESTcreate(req, res, next) {
    console.log('<><><> CREATE : ' + JSON.stringify(req.params));
    var id = 'products' + delimiter + createUUID();
    var data = {key:id, value:JSON.stringify(req.params)};

    put(data, (function(res){
        return function(err){
            console.log('---->> Arguments : ' + JSON.stringify(arguments));
            console.log('---->> err : ' + err);
            if(err){
                console.log('---->> XXXX : ');
            }
            if(err)res.send(500)
            else res.send(204);
        };
    })(res));
    return next();
}

server.get('/products', function(req, res, next){RESTlist(req, res, next, 'products')});
server.get('/products/:id', RESTsend);
server.del('/products/:id', RESTdel);
server.post('/products', RESTcreate);
server.put('/products/:id', RESTput);


//////////////////////////////////////////
//          Level with me doc
//////////////////////////////////////////
//
// Backbone REST API
// create   → POST      /collection
// read     → GET       /collection[/id]
// update   → PUT       /collection/id
// delete   → DELETE    /collection/id

// Create, Update, Delete

function batch(data, callback) {
    if (typeof data == 'string') data = eval('(' + data + ')');
    if (typeof data == 'object' && typeof data.length == 'number') {
        // Batch
        db.batch(data, function(err) {
            if (err) return console.log('Batch operation failed! :', err)
            console.log('Batch success, ' + data.length + ' record(s) affected');
            if (callback) callback();
        });
    }
}

function put(data, callback) {
    if (typeof data == 'string') data = eval('(' + data + ')');
    console.log('+++' + JSON.stringify(data));
    if (typeof data == 'object') {
        // Batch put
        if (typeof data.length == 'number') {
            var i = 0;
            for (i in data) data[i].type = 'put';
            db.batch(data, function(err) {
                if (err) return console.log('Put operation failed! :', err)
                console.log('Batch put create success');
                if (callback) callback();
            });
        }
        else {
            db.put(data.key, data.value, function(err) {
                if (err) return console.log('Put operation failed! :', err)
                console.log('put("' + data.key + '", "' + data.value + '") success');
                console.log('callback : ' + callback );
                if (callback) callback();
            });
        }
    }
}

// data = [array, object, string]

function del(data, callback) {
    console.log('*** Data : ' + JSON.stringify(data));
    function del(key, callback) {
        db.del(key, function(err) {
            if (err) return console.log('Something went wrong!', err);
            console.log('del("' + key + '"): success');
            if (callback) callback(err);
        });
    }
    if (typeof data == 'object') {
        // Batch del
        if (typeof data.length == 'number') {
            var i = 0;
            for (i in data) data[i].type = 'del';
            db.batch(data, function(err) {
                if (err) return console.log('Something went wrong!', err);
                console.log('Batch delete success: ' + data.length + ' records deleted');
                if (callback) callback(err);
            });
        }
        // Del
        else {
            console.log('*** Del : del(data.key, callback);');
            console.log('*** : ' + data.key);
            del(data.key, callback);
        }
    }
    if (typeof data == 'string') {
        console.log('*** Is string : del(data, callback);');
        del(data, callback);
    }
}

function get(key, callback) {
    db.get(key, function(err, value) {
        if (err) return console.log('Something went wrong!', err); // Key not found
        console.log('get("' + key + '"): ' + JSON.stringify(value));
        if (callback) callback(value);
    });
}

function getStream(options) {
    var res = [];
    db.createReadStream(options)
        .on('data', function(data) {
            res.push(data);
        })
        .on('error', function(err) {
            console.log('Oh my!', err);
        })
        .on('close', function() {
            console.log('Stream closed');
        })
        .on('end', function() {
            console.log('Stream ended');
            if (options && options.callback) options.callback(res);
        });
}

var consoleCallBack = function() {
    getStream({
        limit: '100',
        callback: function(res) {
            console.log(res)
        }
    });
}
