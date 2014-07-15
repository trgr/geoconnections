var raw       = require( 'raw-socket' )
var timers    = require( 'timers' )
var argv      = require( 'optimist').argv
var console   = require( 'better-console')
var mongoose   = require( 'mongoose' )
var socket    = raw.createSocket( { protocol : raw.Protocol.TCP } )
var stdin     = process.stdin;


var LIST_MODES = {
    ACTIVE   : {
	name : "Active"
    },
    HISTORIC : {
	name : "Historic"
    },
}

var options = {
    refresh_time : 1000,
    connection_stay_time : 1000, 
    list_mode : LIST_MODES.ACTIVE,
}


/* Include own files*/
var Connection  = require( './Connection.js' )
var mConnectionSchema = require( './ConnectionSchema.js')

/* Set some defaults */
var active_connections = {}
var all_connections    = {}

/* Future mongoose model */
var mConnection 

/* Add generic sort method to Array type*/
Array.prototype.sortByProp = function(p){
 return this.sort(function(a,b){
  return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
 });
}


/* process some arguments */
if( argv.help ){
    console.log("Options")
    console.log ("\t--output_file=<filename>")
    console.log ("\t--save_db>")
    console.log ("\t--refresh_time=<refresh_time> : In millisenconds")
    process.exit()
}

if( argv.refresh_time )
    options.refresh_time = argv.refresh_time

console.log( '\u001B[2J\u001B[0;0f' )
console.log("Started listening ..please wait")

/* Start listening for events */
stdin.setRawMode(true)
stdin.resume()
stdin.setEncoding( 'utf8' );
stdin.on('data', function (key) {
    switch(key){
    case '\u0003': /* Ctrl-C */
	process.exit()
	break;
	
    case "a":
	options.list_mode = LIST_MODES.ACTIVE
	break
	
    case "h":
	options.list_mode = LIST_MODES.HISTORIC
	break;
	
    case "+":
	options.refresh_time += 100
	break;
	
    case "-":
	options.refresh_time -= 100
	break;
    }
    
});

/* Setup listening for socket on,message,and close*/
/* Adds incomming Connection objects to active_connections and all_connections */
var listener = function(save_to_db){
    socket.on( "message" , function( buffer , addr ) {
	if ( !active_connections[addr] ){
	    connection = new Connection( addr )
	    
	    /* Can be displayed before everything is resolved */
	    active_connections[addr] = connection
	    connection.doAsyncLookups(function(){
		
		//active_connections[addr] = connection
		if (save_to_db){
		    var conn = new mConnection(
			{
			    dns_name : connection.dns_name,
			    source   : connection.source,
			    country_name : connection.country_name,
			    protocol : connection.protocol,
			    discovered : connection.discovered,
			    last_seen : connection.last_seen,
			    bytecount  : connection.bytecount,
			    last_bytecount : connection.last_bytecount
			}
		    )
		    conn.save(function(err, c){
			
		    })
		}
	    })
	}else{
	    
	    active_connections[addr].addToByteCount( buffer.length )
	    active_connections[addr].last_seen = new Date()
	}
	
	all_connections[addr] = active_connections[addr]
	
    })
}


if( argv.save_db ){
    mongoose.connect('mongodb://localhost/geoconnections');
    var db = mongoose.connection
    db.once( "open" , function(){
	mConnection = mongoose.model('mConnection',mConnectionSchema)
	listener(true)
    })
}else{
    listener(false)
}


timers.setInterval(function(){
    active_connections = {}
},options.connection_stay_time)


/* Start output to console interval */
timers.setInterval(function(){
    var connection_hash = {}
    

    if(options.list_mode == LIST_MODES.ACTIVE)
	connection_hash = active_connections
    if( options.list_mode == LIST_MODES.HISTORIC)
	connection_hash = all_connections
    
    
    var connection_keys = Object.keys(connection_hash)
    var connection_count = connection_keys.length
    
    var connection_table_data = []
    var header_table_data     = [
	{
	    'Connections' : connection_count,
	    'List mode'   : options.list_mode.name,
	    'Window refresh rate' : options.refresh_time + "ms"
	}]
    console.log( '\u001B[2J\u001B[0;0f' )
    console.table( header_table_data ) 

    for ( var i=0; connection_keys.length > i; i++){
	connection = connection_hash[connection_keys[i]]
	connection_table_data.push( {"IP" : connection.source,
			  "Country" : connection.country_name,
			  "Reverse DNS" : connection.dns_name,
			  "Total # bytes rcvc" : connection.bytecount,
			  "Last  # bytes rcvd" : connection.last_bytecount,
			  "Duration (ms)" : connection.getDuration(),
			  "Last Seen" : connection.last_seen.getTime()
		       })
    }
    connection_table_data.sortByProp('Last Seen')
    
    console.table( connection_table_data )
    
},options.refresh_time )

