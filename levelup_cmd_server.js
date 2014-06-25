var levelup = require('levelup');

var db = levelup('./mydb');


// Backbone REST API
// create   → POST      /collection
// read     → GET       /collection[/id]
// update   → PUT       /collection/id
// delete   → DELETE    /collection/id


// Create, Update, Delete
function batch(data, callback){

    if(typeof data == 'string')data = eval('('+data+')');
    if (typeof data == 'object' && typeof data.length == 'number') {

        // stringify value if object
        for(i in data){
            if(typeof data[i] == 'object'){
                console.log('###############');
                data[i].value = JSON.stringify(data[i].value);
                console.log('### ' + data[i].value);
            }
            else if(data[i].value.charAt(0) == '{'){
                console.log('---------------');
                data[i].value = JSON.parse(data[i].value);
                console.log('--- ' + data[i].value);
            }
        }
        //Batch
        db.batch(data, function(err) {
            if (err) return console.log('Batch operation failed! :', err)
            console.log('Batch success, ' + data.length + ' record(s) affected');
            if(callback)callback();
        });        
    }
}

// data = [array, object]
function put(data, callback) {
    if(typeof data == 'string')data = eval('('+data+')');
    if (typeof data == 'object') {
        // Batch put
        if(typeof data.length == 'number') {
            var i =  0;
            for(i in data)data[i].type = 'put';
            db.batch(data, function(err) {
                if (err) return console.log('Put operation failed! :', err)
                console.log('Batch put create success');
                if(callback)callback();
            });        
        }
        // Put
        else
        {
            db.put(data.key, data.value, function(err) {
                if (err) return console.log('Put operation failed! :', err)
                console.log('put("'+ data.key +'", "'+ data.value +'") success');
                if(callback)callback();
            });        
        }        
    }
}

// data = [array, object, string]
function del(data, callback){
    function del(key, callback){
        db.del(key, function(err) {
            if (err) return console.log('Something went wrong!', err);
            console.log('del("' + data + '"): success');
            if(callback)callback();
        });     
    }
    if (typeof data == 'object') {
        // Batch del
        if(typeof data.length == 'number') {
            var i =  0;
            for(i in data)data[i].type = 'del';
            db.batch(data, function(err) {
                if (err) return console.log('Something went wrong!', err);
                console.log('Batch delete success: ' + data.length + ' records deleted');
                if(callback)callback();
            });        
        }
        // Del
        else
        {
            del(data.key, callback);
        }        
    }
    if (typeof data == 'string') {
        del(data, callback);
    }

}

function get(key, callback) {
  db.get(key, function (err, value) {
    if (err) return console.log('Something went wrong!', err); // Key not found
    console.log('get("' + key + '"): ' + value);
    if(callback)callback(value);
  });
}


// Command line examples
//
// Get:
// node levelup_cmd_server get 'key'
// Width delimiter '\x00' (null)
// node levelup_cmd_server.js get [name]\"\\x00\"[key]
//
// Put:
// node levelup_cmd_server put 'Mikey' 'Mouse'
// Width delimiter '\x00' (null)
// node levelup_cmd_server.js put [name]\"\\x00\"[key]
//
// Delete:
// node levelup_cmd_server del 'key'
// Width delimiter '\x00' (null)
// node levelup_cmd_server.js del [name]\"\\x00\"[key]
//
// Batch:
// node levelup_cmd_server batch "[{type:'del',key:'Hey',value:'You'},{type:'put',key:'Us',value:'Them'}]"
// Width delimiter '\x00' (null)
// node levelup_cmd_server batch "[{type:'put',key:'Us\x00bb',value:'Them'}]"//
// node levelup_cmd_server batch '[{"type":"put","key":"products\x00car1","value":{"name":"ford","description":"sedan","price":200}}]'
//
// Function call:
// node levelup_cmd_server function args
// node levelup_cmd_server getStream "{limit:3}"
// node levelup_cmd_server getStream {start:\"name\"}
//
// Width delimiter '\x00' (null) and end character '\xff' (ÿ) 
// node levelup_cmd_server.js getStream '{start:"name\x00P",end:"name\x00\xff"}'

var delimiter = "\x00";
var alphastop = "\xff";

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
            if(options && options.callback)options.callback(res);
        });
}

function opsFunc() {
    var ops = [, {
        type: 'put',
        key: 'name',
        value: 'Yuri Irsenovich Kim'
    }, {
        type: 'put',
        key: 'dob',
        value: '16 February 1941'
    }, {
        type: 'put',
        key: 'spouse',
        value: 'Kim Young-sook'
    }, {
        type: 'put',
        key: 'occupation',
        value: 'Clown'
    }];

    db.batch(ops, function(err) {
        if (err) return console.log('Ooops!', err)
        console.log('Great success dear leader!')
    });
}

var test = function(stop){
    var stop = stop? stop : alphastop;
    getStream({start:"name" + delimiter + "P",end:"name" + delimiter + stop,callback:function(res){console.log(res)}});    
}

var consoleCallBack =  function(){
    getStream({limit:'100',callback:function(res){console.log(res)}});
}

var keys = function(key){
    console.log(key.replace('\"\\x00\"', delimiter));
}

var argtest = function(arg){
    console.log(JSON.parse(arg));
}

var args = process.argv.slice(2);

if(args.length==1){
    if(args[0] == 'getStream'){
        console.log(options);
        var options = {};
        options.callback = function(res){console.log(res)};
        eval(args[0])(options);
    }
    else{
        eval(args[0])();
    }
}
else if(args.length==2){
    if(args[0] == 'getStream'){
        var options = eval("(" + args[1] + ")");
        console.log(options);
        options.callback = function(res){console.log(res)};
        eval(args[0])(options);
    }
    else{
        var options = args[1].replace('\"\\x00\"', delimiter);
        //var options = args[1];
        eval(args[0])(options, consoleCallBack);
    }
}
else if(args.length>2 && args[0]=='put'){
    var key = args[1].replace('\"\\x00\"', delimiter);
    eval(args[0])({key:key, value:args[2]}, consoleCallBack);
}
else{
    consoleCallBack();
}

