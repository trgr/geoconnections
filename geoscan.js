/* Built in */
var timers    = require( 'timers' )

/* third-party*/
var raw       = require( 'raw-socket' )
var argv      = require( 'optimist').argv
var mongoose  = require( 'mongoose' )

/* Include own files*/
var Connection                  = require( './Connection.js' )
var mConnectionSchema           = require( './ConnectionSchema.js' )

/* Include config */
var options = require( './config.js' )
/* Create socket, get stdin*/
var socket    = raw.createSocket( { protocol : raw.Protocol.TCP } )
var stdin     = process.stdin;

/* Future mongoose model */
var mConnection 

/* Add generic sort method to Array type*/
Array.prototype.sortByProp = function(p){
    return this.sort(function(a,b){
	return (a[p] > b[p]) ? 1 : (a[p] < b[p]) ? -1 : 0;
    });
}

Array.prototype.hasElmWithProp = function(p,v){
    for(var i = 0; this.length > i; i++)
	if (this[i][p] == v )
	    return true
    
    return false
}

/* Add generic padding method to String type */
String.prototype.pad = function(c) { return (c > 0) ? String( this + Array(c).join(" ") ) : this }

/* Extend console to be able to clear screen */
console.clear = function() { process.stdout.write('\u001B[2J\u001B[0;0f') }

function pad(str, size){
    for ( var  i = 0; size > i; i++)
	str += " "

    return str
}

/* Set some defaults */
var all_connections    = Array()

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

if( argv.v )
    options.verbose_level = 1

if( argv.q ) //Quiet
    options.verbose_level = 0

if( argv.output_json)
    options.output_json = true

console.clear()
console.log("Started listening ..please wait")

/* Start listening for keyboard events */
stdin.setRawMode(true)
stdin.resume()
stdin.setEncoding( 'utf8' );
stdin.on('data', function (key) {
    switch(key){
    case '\u0003': /* Ctrl-C */
	process.exit()
	break;
		
    case "+":
	options.refresh_time += 100
	break;
	
    case "-":
	options.refresh_time -= 100
	break;
    }
    
});

/* Setup listening for socket on 'message' */

var listener = function(save_to_db){
    socket.on( "message" , function( buffer , addr ) {
	if(!all_connections.hasElmWithProp("source",addr)){
	    connection = new Connection( addr )
	    
	    /* Can be displayed before everything is resolved so push reference to all_connections*/
	    all_connections.push(connection)

	    
	    connection.doAsyncLookups(function(){
		
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
	}
	
	all_connections.sortByProp( "last_seen" )
	
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

function consoleFormatConnection(connectionObject){
    var ip           = connectionObject.source.pad(options.col_ip_size - connectionObject.source.length) 
    var country_name = connectionObject.country_name.pad(options.col_country_name_size - connectionObject.country_name.length)
    var dns_name     = connectionObject.dns_name.pad(options.col_reverse_dns_size - connectionObject.dns_name.length)
    var last_seen    = connectionObject.last_seen
    return [last_seen,ip,country_name,dns_name]
}

function JSONFormatConnection(connectionObject){
    var ip           = connectionObject.source
    var country_name = connectionObject.country_name
    var dns_name     = connectionObject.dns_name
    var last_seen    = connectionObject.last_seen
    return JSON.stringify( [last_seen,ip,country_name,dns_name] )
}
/* Start output to console interval */
timers.setInterval(function(){
    
    var connection_count = all_connections.length
    console.clear()
    
    if( options.verbose_level > 0)
	console.log( "Connection count : " + connection_count)
    
    for ( var i=0; connection_count > i; i++)
	if ( options.output_json )
	    console.log( JSONFormatConnection( all_connections[i] ) )
        else
	    console.log( consoleFormatConnection( all_connections[i] ).join(options.col_delimiter) )
    
},options.refresh_time )
