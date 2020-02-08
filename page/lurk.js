function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

class Game{
    constructor(iniPoints=0,statMax=0,desc=""){
        this.initialPoints=iniPoints;
        this.statMax=statMax;
        this.description=desc;

    }
}
var started=false;
var players=[]
var lootables=[]
var monsters=[]
var connections=[]
var player;
$(function() {
    var game= new Game();
	var args=getUrlVars()
	if(args["ip"]+""==="undefined"){
		args["ip"]="localhost"
	}
	if(!(args["port"]+""==="undefined")){
		$("#connection").hide();
		$("#waiting").show();

	}
	//must be served from node to use this line
	var socket = io('?ip='+args["ip"]+'&port='+args["port"])
    //var socket = io('ws://isoptera.lcsc.edu:5000/?ip='+args["ip"]+'&port='+args["port"]);
	//use this line to connect to NODE server from other client implimentations other than the distributed one from node
    $('#chat > form > button').click(function() {//send message to server UPDATE FOR LURK
	if( $('#chat > form > input').val()){
        socket.emit('chat message', '{"msg":"'+$('#chat > form > input').val()+'","rec":"'+$("#chat > form > select[name=target]").val()+'"}');
console.log('{"msg":"'+$('#chat > form > input').val()+'","rec":"'+$("#chat > form > select[name=target]").val()+'"}')
	
	var sender="You"
	if($("#chat > form > select[name=target]").val()){
		sender+="->"+$("#chat > form > select[name=target]").val();
	}
	 $('#chat > ul').append($('<li>').html(sender+": "+$('#chat > form > input').val()));
	 $('#chat > form input[name=input]').val("");

        $('#chat > ul').scrollTop($('#chat > ul')[0].scrollHeight);
        //$('#chat > form > input ').val('');
        return false;
		}
    });

$('#join > form button').click(function() {//send character to server SEND TO NODE

	 socket.emit('character input',"{\"name\":\""+$('#join > form  input[name=name]').val()+"\",\"description\":\""+$('#join > form  textarea[name=description]').val()+"\",\"joinbattle\":\""+$('#join > form input[name=battle]').is(":checked")+"\",\"str\":\""+$('#join > form  input[name=str]').val()+"\",\"def\":\""+$('#join > form  input[name=def]').val()+"\",\"regen\":\""+$('#join > form  input[name=reg]').val()+"\"}")
       // socket.emit('chat message', $('#m').val());
        //$('#chat > form > input ').val('');
        return false;
    });

    socket.on('chat message', function(msg) {
        $('#chat > ul').append($('<li>').html(DOMPurify.sanitize(msg)));
        $('#chat > ul').scrollTop($('#chat > ul')[0].scrollHeight);
    });

socket.on('lurk game', function(msg) {

	var obj = JSON.parse(msg);
	game=new Game(obj.points,obj.max,obj.description);
        $('#game-desc').html(game.description)
	$('#join > form [name=stat_max]').text("Initial Points: "+ game.initialPoints)
	$('#join > form input[name=str]').attr({"max" : Math.min(game.statMax,game.initialPoints)});

	$('#join > form input[name=def]').attr({"max" : Math.min(game.statMax,game.initialPoints)});
	$('#join > form input[name=reg]').attr({"max" : Math.min(game.statMax,game.initialPoints)});
	$("#waiting").hide();
	$('#join').show()
	$("#game").hide();
    });	
	$('#join > form  input[type=number]').change(function() {
	  
	$('#join > form  input[name=str]').attr({"max" : Math.min(game.statMax,game.initialPoints-(+$('#join > form  input[name=reg]').val()+(+$('#join > form  input[name=def]').val())))});
$('#join > form  input[name=def]').attr({"max" : Math.min(game.statMax,game.initialPoints-(+$('#join > form  input[name=reg]').val()+(+$('#join > form  input[name=str]').val())))});
$('#join > form  input[name=reg]').attr({"max" : Math.min(game.statMax,game.initialPoints-(+$('#join > form  input[name=str]').val()+(+$('#join > form  input[name=def]').val())))});
	});
	
	socket.on('Character monsters', function(msg) {
console.log("monster")
console.log(msg)
		monsters=JSON.parse(msg);
		$('#monsters').empty()
		 $('#monsters').append($('<option>').text("Select a Monster").val("").attr("selected",true).attr("disabled",true) );
		for(var i=0;i<monsters.length;i++){
			$('#monsters').append($('<option>').text(monsters[i].name).val(i));
		}
			//clear monsters and populate from msg
	});
	socket.on('Character players', function(msg) {
		console.log(msg)
	
			players=JSON.parse(msg);
console.log(players)
		$('#players').empty()
$('#players').append($('<option>').text("Select a Player").val( "").attr("selected",true).attr("disabled",true) );
		$('#chat > form >select[name=target]').empty()
$('#chat > form >select[name=target]').append($('<option>').text("All").val("").attr("selected",true));
		for(var i=0;i<players.length;i++){
			$('#players').append($('<option>').text(players[i].name).val(i));
	$('#chat > form >select[name=target]').append($('<option>').text(players[i].name).val(players[i].name));
		}
				//clear players and populate from msg
	});
	socket.on('Character loot', function(msg) {

		lootables=JSON.parse(msg);
		$('#loot').empty()
		 $('#loot').append($('<option>').text("Select Loot").val( "").attr("selected",true).attr("disabled",true));
		for(var i=0;i<lootables.length;i++){
			$('#loot').append($('<option>').text(lootables[i].name).val(i));
		}
			//clear monsters and populate from msg
	});
	socket.on('Character player', function(msg) {
		player=JSON.parse(msg);
		console.log("got player")
		if(!started){
			$("#join").hide();
			$("#game").show();
			console.log("starting game")
			started=true;
		}
			$('#character > [name=name]').text(player.name)
$('#character > [name=description]').html(DOMPurify.sanitize(player.description))

$('#character > [name=battle] > input').prop("checked", player.joinbattle)

$('#character > [name=health] > div').text(player.health)
$('#character > [name=gold] > div').text(player.gold)
$('#character > [name=str] > div').text(player.str)
$('#character > [name=def] > div').text(player.def)
$('#character > [name=room] > div').text(player.roomNumber)
$('#character > [name=reg] > div').text(player.regen)
	$('#character > div[name=alive] > input').prop("checked", player.alive);
	$('#character > div[name=battle] > input').prop("checked", player.joinbattle);
	$('#character > div[name=monster] > input').prop("checked", player.monster);
	
	$('#character > div[name=started] > input').prop("checked", player.ready);
	$('#character > div[name=ready] > input').prop("checked", player.started);
	});
	socket.on('lurk error', function(msg) {
		var obj=JSON.parse(msg)
		$('#chat > ul').append($('<li>').html("ERROR "+obj.code+": "+obj.message).addClass("error"));
       		$('#chat > ul').scrollTop($('#chat > ul')[0].scrollHeight);
		if($('#chat').is(":hidden")){
			alert(obj.code+": "+obj.message)
		}
	});
	
	socket.on('lurk room', function(msg) {
		connections=[]
		players=[]
		monsters=[]
		lootables=[]
		
		$('#monsters').empty()
		$('#players').empty()
		$('#loot').empty()
		$('#chat > form > select').empty()
$('#players').append($('<option>').text("Select Player").val( "").attr("selected",true).attr("disabled",true));
$('#monsters').append($('<option>').text("Select Monster").val( "").attr("selected",true).attr("disabled",true));
$('#loot').append($('<option>').text("Select Loot").val( "").attr("selected",true).attr("disabled",true));
$('#chat > form >select[name=target]').append($('<option>').text("All").val("").attr("selected",true) );
		$('#connections').empty()
		room=JSON.parse(msg)
			//change the room, dump players, monsters, loot, and connections
		$('#room-title').text(room.number+": "+room.name);
		$('#room-description').html(room.description);
		$('#inspect > div[name=player]').hide()
		$('#inspect > div[name=room]').hide()
	});
	socket.on('lurk connection', function(msg) {
			//clear connections and repulate from msg
		var obj=JSON.parse(msg)
var index=connections.length;
		connections.push(obj)

		 $('#connections').append($('<label>').html($('<input type="radio" name="connection">').val(index)).append(obj.number+": "+obj.name));
       // window.scrollTo(0, document.body.scrollHeight);
	});

$('#room-description > button[name=start]').click(function(){
	console.log("start")
	socket.emit('start','')
});

$('#character > [name=battle] > input').click(function(){
	console.log("joinbattle")
	player.joinbattle^=1;
	socket.emit('character input',JSON.stringify(player))
});
$('#fight').click(function(){
	console.log("fight")
	socket.emit('fight','')
});



$('#connections').change(function() {
	var connection=connections[$('#connections > label > input[type=radio]:checked').val()]
	
	$('#connections > label.selected').removeClass("selected");
	$('#connections > label > input[type=radio]:checked').parent().addClass("selected");
	$('#players').val("")
	$('#monsters').val("")
	$('#loot').val("")

	$('#inspect > div[name=player]').hide()
	$('#inspect > div[name=room] > div[name=name] > div').html(connection.name);
	$('#inspect > div[name=room] > div[name=number] > div').text(connection.number);
	$('#inspect > div[name=room] > div[name=description] > div').html(connection.description);
	$('#inspect > div[name=room]').show()
	
});
function inspectCharacter(character){
console.log(character)
	$('#inspect > div[name=room]').hide()
	$('#inspect > div[name=player] > div[name=name] > div').text(character.name);
	$('#inspect > div[name=player] > div[name=room] > div').text(character.number);
	$('#inspect > div[name=player] > div[name=description] > div').html(DOMPurify.sanitize(character.description));
	$('#inspect > div[name=player] > div[name=alive] > input').prop("checked", character.alive);
	$('#inspect > div[name=player] > div[name=battle] > input').prop("checked", character.joinbattle);
	$('#inspect > div[name=player] > div[name=monster] > input').prop("checked", character.monster);
	
	$('#inspect > div[name=player] > div[name=started] > input').prop("checked", character.ready);
	$('#inspect > div[name=player] > div[name=ready] > input').prop("checked", character.started);
	$('#inspect > div[name=player] > div[name=health] > div').text(character.health);
	$('#inspect > div[name=player] > div[name=gold] > div').text(character.gold);
	$('#inspect > div[name=player] > div[name=str] > div').text(character.str);
	$('#inspect > div[name=player] > div[name=def] > div').text(character.def);
	$('#inspect > div[name=player] > div[name=reg] > div').text(character.regen);
	$('#inspect > div[name=player]').show()
	
}
$('#players').change(function(){
	$('#connections > label > input[type=radio]:checked').prop("checked", false)
	$('#connections > label.selected').removeClass("selected");
	$('#monsters').val("")
	$('#loot').val("")
	var character=players[$('#players').val()]
	$('#inspect > div[name=player] > button').text("PVP Fight").show().prop('name', 'pvp')
	inspectCharacter(character)
});
$('#loot').change(function(){
	
	$('#connections > label > input[type=radio]:checked').prop("checked", false)
	$('#connections > label.selected').removeClass("selected");
	$('#monsters').val("")
	$('#players').val("")
	var character=lootables[$('#loot').val()]
	$('#inspect > div[name=player] > button').text("Loot").show().prop('name', 'loot')
	inspectCharacter(character)
});
$('#monsters').change(function(){
	
	$('#connections > label > input[type=radio]:checked').prop("checked", false)
	$('#connections > label.selected').removeClass("selected");
	$('#loot').val("")
	$('#players').val("")
	var character=monsters[$('#monsters').val()]
	$('#inspect > div[name=player] > button').hide()
	inspectCharacter(character)
});
$('#changeRoom').click(function(){
	console.log("change")
	socket.emit('change room',connections[$('#connections > label > input[type=radio]:checked').val()].number)
});
$('#inspect > div[name=player] > button').click(function(){
	console.log("button")
	if($('#inspect > div[name=player] > button').attr("name")=="pvp"){
		console.log("pvp")
		socket.emit('pvp',players[$('#players').val()].name)
	}else if($('#inspect > div[name=player] > button').attr("name")=="loot"){

		console.log("loot")
		socket.emit('loot',loot[$('#loot').val()].name)
	}
});
	//need to impliment 
	//see monsters
	//pvp fight
	//loot rooms
window.onbeforeunload = function() {
   return "Leaving or reloading this page will cause your connection to the lurk server to be terminated.  Depending on the server, this could result in loss of progress";
   //if we return nothing here (just calling return;) then there will be no pop-up question at all
   //return;
};
});

document.addEventListener('invalid', (function () {
  return function (e) {
    e.preventDefault();
    document.getElementById("name").focus();
  };
})(), true);
