var Transmission = require('transmission');
var ProgressBar  = require('progress');
var express = require('express');
var bodyParser = require("body-parser");
const multer  = require("multer");
//const app = express();




var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);


app.use(express.static(__dirname + "/test"));

const urlencodedParser = bodyParser.urlencoded({extended: false});

const storageConfig = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, "Download");
    },
    filename: (req, file, cb) =>{
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {

    if(file.mimetype === "application/x-bittorrent"){
        cb(null, true);
    }
    else {
        cb(null, false);
    }
}

var transmission = new Transmission({
    port : 9091,
    host : '127.0.0.1'
});

//var tor;

function get(hash, cb) {
    transmission.get(hash, function(err, result) {
        if (err) {
            throw err;
        }
     //  console.log(result.torrents[0]);
        //tor = result.torrents[0];
        cb(null, result.torrents[0]);
    });
}

function watch(hash) {
    get(hash, function(err, torrent) {
        if (err) {
            throw err;
        }

        var downloadedEver = 0;
        var WatchBar = new ProgressBar('  downloading [:bar] :percent :etas', {
            complete : '=',
            incomplete : ' ',
            width : 35,
            total : torrent.sizeWhenDone
        });

        function tick(err, torrent) {
            if (err) {
                throw err;
            }
            var downloaded = torrent.downloadedEver - downloadedEver;
            downloadedEver = torrent.downloadedEver;
            WatchBar.tick(downloaded);

            if (torrent.sizeWhenDone === torrent.downloadedEver) {
                return remove(hash);
            }
            setTimeout(function() {
                get(hash, tick);
            }, 1000);
        }

        get(hash, tick);
    });
}

function remove(hash) {
    transmission.remove(hash, function(err) {
        if (err) {
            throw err;
        }
        console.log('torrent was removed');
    });
}

app.use(multer({storage:storageConfig, fileFilter: fileFilter}).single("myFile"));

app.post("/register", urlencodedParser, function (request, response) {
    if(!request.body) {
        return response.sendStatus(400);
    }

    console.log(request.body);
    let filedata = request.file;
    //console.log(filedata);
    if(!filedata) {
        //response.send("Ошибка при загрузке файла");
    }
    else {
        //response.send("Файл загружен");

        transmission.addFile(filedata.path, {
            //options
        }, function (err, result) {
            if (err) {
                return console.log(err)
            }
            var hash = result.hashString;
            watch(hash);

           // remove(hash);
        });
    }
});






// app.use("/register", function (request, response){
//     response.send(tor);
// });
//app.listen(3000);
// app.listen(3000, '192.168.42.204', function() {
//     //console.log("... port %d in %s mode", app.address().port, app.settings.env);
// });

server.listen(3000, '192.168.42.204', function() {
    //console.log("... port %d in %s mode", app.address().port, app.settings.env);
});

io.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });

    socket.on('my other event', function (data) {
        console.log(data);
    });

});