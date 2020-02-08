#!/usr/bin/env node
//assumes html5 front end, will automatically reply to version packet with both html and html5 extension, 
if (process.argv.length < 3) {
    var cmd = process.argv[1].split('/')
    console.error("Usage: " + cmd[cmd.length - 1] + " [port]");
    process.exit(1);
}
var app = require('express')();
var http = require('http').Server(app);

var io = require('socket.io')(http);

var port = process.env.PORT || process.argv[2];

var net = require('net');
class Character {
    constructor(name, alive, battle, monster, started, ready, str, def, regen, health, gold, roomNum, desc) {
        this.name = name;

        this.alive = alive
        this.joinbattle = battle
        this.monster = monster
        this.started = started
        this.ready = ready

        this.str = str;
        this.def = def;
        this.regen = regen;

        this.health = health;
        this.gold = gold;

        this.roomNumber = roomNum;
        this.description = desc;


    }
}
class Game {
    constructor(iniPoints, statMax, desc) {
        this.initialPoints = iniPoints;
        this.statMax = statMax;
        this.description = desc;

    }
}
class Connection {
    constructor(num, name, desc) {
        this.number = num;
        this.name = name;
        this.description = desc;
    }
}
app.get('/', function(req, res) {
	res.sendFile(__dirname + '/page/index.html');
	
});

io.on('connection', function(socket) { //Everything related to a single client ui goes within here (the model and controler)
    var player;
    var connections = [];
    var monsters = [];
    var players = [];
    var loot = [];
    var rawPlayer = true;
    var started = false;

    //console.log('user connected to ' + socket.handshake.query.ip + ':' + socket.handshake.query.port); //only fires on connection, so create socket here, probiably also send a uuid (if I end up using a uuid)
	
    var client = new net.Socket();
    client.connect(socket.handshake.query.port, socket.handshake.query.ip, function() { //establish connection with lurk server
        //console.log('Connected');
        //client.write('Hello, server! Love, Client.');
    });

    client.on('error', function(ex) { //handle any server error
        console.log("tcp socket error");
        console.log(ex);
        //send critical error message to ui (missing lurk server)
        //close both sockets
    });
    let net_buffer = new Buffer.alloc(0);

    function sendCharacters(list, type) {
        socket.emit("Character " + type, JSON.stringify(list))
    }

    function sendPlayer() {
        socket.emit("Character player", JSON.stringify(player));
    }

    function handleCharacter(characterPkt) { //characters get large
        var room;
        if (player != null) {
            room = player.roomNumber;
        } else {
            room = 0;
        }

        if (characterPkt.monster) { //sepperate processing for monsters
			//console.log(characterPkt)
            var found = false;
            for (var i = 0; i < monsters.length; i++) {
                if (characterPkt.name == monsters[i].name) { //found it

                    if ((characterPkt.roomNumber == room) && (characterPkt.alive)) { //update
                        monsters[i] = characterPkt;
                    } else { //remove
                        monsters.splice(i, 1);
                    }
                    found = true;
                    break; //should be no repeats, and this is easier for deletion
                }
            }

            if (!found) {
                if ((characterPkt.roomNumber == room) && (characterPkt.alive)) {
                    monsters.push(characterPkt);

                }
            }

            sendCharacters(monsters, "monsters")
        } else { //sepperate processing for characters
            if (rawPlayer) { //feed anything not exsplicitly a monster to the player field

                player = characterPkt;
                rawPlayer = false;
                sendPlayer();
            } else if (characterPkt.name == player.name) {

                player = characterPkt;
                sendPlayer();
            } else {
                var found = false;
                for (var i = 0; i < players.length; i++) {
                    if (characterPkt.name == players[i].name) { //found it


                        if ((characterPkt.alive) && (characterPkt.roomNum == room)) { //update

                            players[i] = characterPkt;
                        } else { //remove

                            players.splice(i, 1);
                        }
                        found = true;
                        break; //should be no repeats, and this is easier for deletion
                    }
                }

                if (!found) {
                    if ((characterPkt.roomNumber == room) && (characterPkt.alive)) {

                        players.push(characterPkt);
                    }
                }

                sendCharacters(players, "players")
            }

        }
        if (!characterPkt.alive) { //one more time for loot
            var found = false;
            for (var i = 0; i < loot.length; i++) {
                if (characterPkt.name == loot[i].name) { //found it
                    if (characterPkt.roomNum == room) { //update
                        loot[i] = characterPkt;
                    } else { //remove
                        loot.splice(i, 1);
                    }

                    break; //should be no repeats, and this is easier for deletion
                }
            }
            if (!found) {
                if (characterPkt.roomNumber == room) {
                    loot.push(characterPkt);
                }
            }

            sendCharacters(loot, "loot")
        }
    }
	var serverFeatures={
		version:"2.0",
		features:[]
	};
    function lurk() {
        while (true) {
			
            if (net_buffer.length < 1) break;
            if (net_buffer[0] == 0) { //some times these happen, just throw them out

                net_buffer = net_buffer.slice(1);

            } else if (net_buffer[0] == 1) { //messge packet
                if (net_buffer.length < 3) break;
                var len = net_buffer.readUInt16LE(1) //BE big endian LE little endian

                if (net_buffer.length < (67 + len)) break;
                //var to = buffer.toString('utf8', 3, 34).replace(/[^\x20-\x7E]/g, '') //lurk always sends 32 chars as a name, this filters out all the unprintables
                var to = net_buffer.toString('utf8', 3, 35).replace(/\00+/g, '') //should just scrap null not spaces too
                var from = net_buffer.toString('utf8', 35, 67)
                var msg = net_buffer.toString('utf8', 67, 67 + len)
                if (to) {

                    from = from + '->' + to
                }

                socket.emit('chat message', from + ': ' + msg);
                net_buffer = net_buffer.slice(67 + len);
            } else if (net_buffer[0] == 7) { //error package
                if (net_buffer.length < 4) break;
                var len = net_buffer.readUInt16LE(2)
                if (net_buffer.length < 4 + len) break;
                socket.emit('lurk error', "{\"code\":\"" + net_buffer[1] + "\",\"message\":\"" + net_buffer.toString('utf8', 4, 4 + len).replace(/\00+/g, '') + "\"}")

                net_buffer = net_buffer.slice(4 + len);

            } else if (net_buffer[0] == 8) { //accept packet
                if (net_buffer.length < 2) break;
                if (net_buffer[1] == 1) { //server accepted chat message, big woop

                } else if (net_buffer[1] == 10) { //server accepted character
                    rawPlayer = true;

                }
                net_buffer = net_buffer.slice(2);
            } else if (net_buffer[0] == 9 || net_buffer[0] == 13) { //room packet
                if (net_buffer.length < 37) break;
                var type;
                if (net_buffer[0] == 13) {
                    type = "connection"
                } else {
                    type = "room"
                    players = []
                    monsters = []
                    loot = []
                    connections = []
                }
                var len = net_buffer.readUInt16LE(35)
                if (net_buffer.length < 4 + len) break;
                socket.emit('lurk ' + type, "{\"number\":\"" + net_buffer.readUInt16LE(1) + "\",\"name\":\"" + net_buffer.toString('utf8', 3, 35).replace(/\00+/g, '') + "\",\"description\":\"" + net_buffer.toString('utf8', 37, 37 + len).replace(/\00+/g, '') + "\"}")
                net_buffer = net_buffer.slice(37 + len);
            } else if (net_buffer[0] == 10) { //the all importatnt character packets
                if (net_buffer.length < 48) break;
                var len = net_buffer.readUInt16LE(46);
                if (net_buffer.length < (48 + len)) break;

                var flags = net_buffer[33]

                handleCharacter(new Character(
                    net_buffer.toString('utf8', 1, 33).replace(/\00+/g, ''),
                    (flags & 0x80) > 0, //alive
                    (flags & 0x40) > 0, //joinBattle
                    (flags & 0x20) > 0, //monster
                    (flags & 0x10) > 0, //started
                    (flags & 0x08) > 0, //ready
                    net_buffer.readUInt16LE(34),
                    net_buffer.readUInt16LE(36),
                    net_buffer.readUInt16LE(38),
                    net_buffer.readInt16LE(40),
                    net_buffer.readUInt16LE(42),
                    net_buffer.readUInt16LE(44),
                    net_buffer.toString('utf8', 48, 48 + len) //.replace(/\00+/g, '')	
                ));
                net_buffer = net_buffer.slice(48 + len);

            } else if (net_buffer[0] == 11) { //game packet
                if (net_buffer.length < 7) break;
                var len = net_buffer.readUInt16LE(5);
                if (net_buffer.length < (7 + len)) break;

                var points = net_buffer.readUInt16LE(1);
                var stats = net_buffer.readUInt16LE(3);

                var description = JSON.stringify(net_buffer.toString('utf8', 7, 7 + len));
                game = new Game(points, stats, description);
                //console.log('{"description":'+description+', "points":"'+points+'","max":"'+stats+'"}');
                socket.emit('lurk game', '{"description":' + description + ', "points":"' + points + '","max":"' + stats + '"}');
                //console.log('lurk game','{"description":'+description+', "points":"'+points+'","max":"'+stats+'"}');
                net_buffer = net_buffer.slice(7 + len);
            }else if (net_buffer[0] == 14) { //version packet
                if (net_buffer.length < 5) break;
				serverFeatures.version=net_buffer[1]+":"+net_buffer[2]
                len = net_buffer.readUInt16LE(3);
                if (net_buffer.length < 5+len) break;
                
				
				start=6;
				while(start<5+len){
				var len = net_buffer.readUInt16LE(start) //BE big endian LE little endian
					serverFeatures.features.push(net_buffer.toString('utf8', start+2, start+2 + len));
					start=start+2 + len;
				}
				socket.emit('lurk version', JSON.stringify(serverFeatures));
				net_buffer = net_buffer.slice(5+len);
			    //reply features
				buffer = new ArrayBuffer(18);
				view = new DataView(buffer);
				view.setUint8(0, 14) //set type byte
				view.setUint8(1, 2) //set major version
				view.setUint8(2, 2) //set minor version
				view.setUint16(3,13) //length of features
				view.setUint16(5,4) //feature 1 length
				for (i = 0; i < 4; i++) {
					view.setUint8(7 + i, "html".charCodeAt(i)) //pack message into last bytes
				}
				view.setUint16(11,5) //feature 1 length
				for (i = 0; i < 5; i++) {
					view.setUint8(13 + i, "html5".charCodeAt(i)) //pack message into last bytes
				}

				var buf = new Buffer.from(buffer)

				//client.write(buf);
            } else {
                console.log('Unsupported message: ' + net_buffer.readInt8(0)+" from "+socket.handshake.query.ip + ':' + socket.handshake.query.port);
                net_buffer = net_buffer.slice(1);
            }

        }
    }
    client.on('data', function(data) { //receive data from server
        net_buffer = Buffer.concat([net_buffer, data]);
        lurk();

    });

    socket.on('fight', function(msg) { //recieve any sort of ui packet by changing the 'chat message' part
        try {
            buffer = new ArrayBuffer(1);
            view = new DataView(buffer);
            view.setUint8(0, 3) //set type byte


            var buf = new Buffer.from(buffer)

            client.write(buf);
        } catch (e) {}
    });

    socket.on('pvp', function(msg) { //recieve any sort of ui packet by changing the 'chat message' part
        try {
            buffer = new ArrayBuffer(33);
            view = new DataView(buffer);
            view.setUint8(0, 4) //set type byte

            for (i = 0; i < Math.min(32, msg.length); i++) {
                view.setUint8(1 + i, msg.charCodeAt(i)) //pack message into last bytes
            }

            var buf = new Buffer.from(buffer)

            client.write(buf);
        } catch (e) {}
    });
	
    socket.on('start', function(msg) { //recieve any sort of ui packet by changing the 'chat message' part
        try {

            buffer = new ArrayBuffer(1);
            view = new DataView(buffer);
            view.setUint8(0, 6) //set type byte


            var buf = new Buffer.from(buffer)

            client.write(buf);
        } catch (e) {}
    });

    socket.on('loot', function(msg) { //recieve any sort of ui packet by changing the 'chat message' part
        try {
            buffer = new ArrayBuffer(33);
            view = new DataView(buffer);
            view.setUint8(0, 5) //set type byte

            for (i = 0; i < Math.min(32, msg.length); i++) {
                view.setUint8(1 + i, msg.charCodeAt(i)) //pack message into last bytes
            }

            var buf = new Buffer.from(buffer)

            client.write(buf);
        } catch (e) {}
    });

    socket.on('change room', function(msg) { //recieve any sort of ui packet by changing the 'chat message' part
         try{
        // console.log(msg)
        buffer = new ArrayBuffer(3);
        view = new DataView(buffer);
        view.setUint8(0, 2) //set type byte
        view.setUint16(1, parseInt(msg), true)

        var buf = new Buffer.from(buffer)

        client.write(buf);

        //console.log(buf)
        }catch(e){}
    });

    socket.on('chat message', function(msg) { //recieve any sort of ui packet by changing the 'chat message' part
        //console.log(msg)
        try {
            //io.emit('chat message', msg); //send a message, send to all

            var obj = JSON.parse(msg);
            //console.log(obj)
            obj.msg = obj.msg.replace(/\00+/g, '')
            buffer = new ArrayBuffer(67 + obj.msg.length);
            view = new DataView(buffer);
            view.setUint8(0, 1) //set type byte
            view.setUint16(1, obj.msg.length, true) //set message length
            for (i = 0; i < Math.min(32, obj.rec.length); i++) {
                view.setUint8(3 + i, obj.rec.charCodeAt(i)) //pack message into last bytes
            }

            for (i = 0; i < Math.min(32, player.name.length); i++) {
                view.setUint8(35 + i, player.name.charCodeAt(i)) //pack message into last bytes
            }

            for (i = 0; i < obj.msg.length; i++) {
                view.setUint8(67 + i, obj.msg.charCodeAt(i)) //pack message into last bytes
            }



            var buf = new Buffer.from(buffer)
            client.write(buf);
            //console.log(buf)
        } catch (e) {}
    });

    socket.on('character input', function(msg) { //recieve any sort of ui packet by changing the 'chat message' part
        try {
            var obj = JSON.parse(msg);
            //io.emit('chat message', msg); //send a message, send to all
            obj.description = obj.description.replace(/\00+/g, '')
            buffer = new ArrayBuffer(48 + obj.description.length);

            view = new DataView(buffer);
            view.setUint8(0, 10) //set type byte
            for (i = 0; i < Math.min(32, obj.name.length); i++) {
                view.setInt8(1 + i, obj.name.charCodeAt(i))
            }
            
			view.setUint8(33, (+(obj.joinbattle == 'true')) << 6) //shift battle flag over
            view.setUint16(34, parseInt(obj.str), true) //set message length
            view.setUint16(36, parseInt(obj.def), true) //set message length
            view.setUint16(38, parseInt(obj.regen), true) //set message length


            view.setUint16(46, obj.description.length, true) //set message length
            for (i = 0; i < Math.min(65535, obj.description.length); i++) {
                view.setInt8(48 + i, obj.description.charCodeAt(i))
            }

            var buf = new Buffer.from(buffer)
            client.write(buf);
        } catch (e) {}
    });
    socket.on('disconnect', function() {
        buffer = new ArrayBuffer(1);
        view = new DataView(buffer);
        view.setUint8(0, 12) //set type byte


        var buf = new Buffer.from(buffer)

        client.write(buf);
        //console.log('user disconnected'); //this is called on dissconect, close the socket here.  Also block page reloads or this will fire as well
        client.destroy();
    });
socket.on('error', function(msg) {
        console.log(msg)
    });

}); //end client only stuff
io.on('error', function(msg) {
        console.log(msg)
    });//oh please handle errors

http.listen(port, function() {
    console.log('listening on *:' + port); //server start
});
