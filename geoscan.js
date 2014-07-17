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

/* Future mongoose model */
var mConnection 

var all_connections = Array()

var socket

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

Array.prototype.has = function(f){
    for( var i = 0; this.length > i; i++ )
	if( f(this[i]) )
	    return true
    return false
}


/* Add generic padding method to String type */
String.prototype.pad = function(c) { return (c > 0) ? String( this + Array(c).join(" ") ) : this }

/* Extend console to be able to clear screen */
console.clear = function() { process.stdout.write('\u001B[2J\u001B[0;0f') }

/* These could propably be added to Connection prototype */
function consoleFormatConnection(connectionObject){
    var ip           = connectionObject.source.pad(options.col_ip_size - connectionObject.source.length) 
    var country_name = connectionObject.country_name.pad(options.col_country_name_size - connectionObject.country_name.length)
    var dns_name     = connectionObject.dns_name.pad(options.col_reverse_dns_size - connectionObject.dns_name.length)
    var last_seen    = connectionObject.last_seen.getTime()
    return [last_seen,ip,country_name,dns_name]
}

function JSONFormatConnection(connectionObject){
    var ip           = connectionObject.source
    var country_name = connectionObject.country_name
    var dns_name     = connectionObject.dns_name
    var last_seen    = connectionObject.last_seen
    return JSON.stringify( [last_seen,ip,country_name,dns_name] )
}

function showHelp(message,exit){
    if( message.length > 0 )
	console.warn( message )
    
    console.log( "Options" )
    console.log( "--unique\t Connection is only listed when it first appears." )
    console.log( "--save_db\t Store connections data in a database" )
    console.log( "--output_json\t Outputs a JSON encoded array instead of human readable / console formated" )
    
    if(exit)
	process.exit()
}



/* process some arguments */
if( argv.help )
    showHelp("",true)


if( argv.v )
    options.verbose_level = 1

if( argv.q ) //Quiet
    options.verbose_level = 0

if( argv.output_json)
    options.output_json = true


if( process.getuid() != 0 ) /* Check if we're root*/
    showHelp("raw-sockets requires root priveliges",true)


/* Create socket */
socket    = raw.createSocket( { protocol : raw.Protocol.TCP } )


var ignore = []

/* Setup listening for socket on 'message' */
var listener = function(save_to_db){
    socket.on( "message" , function( buffer , addr ) {
	if (ignore[addr] == true)
	    return
	
	ignore[addr] = true
	
	if(!all_connections.has(function(elm){
	    t = new Date().getTime() - 100000
	    if (  elm.last_seen > t && elm.source == addr)
		return true
	}) ) {
	    
	    connection = new Connection( addr )
	    all_connections.push(connection)
	    delete( ignore[addr] )
	    connection.doAsyncLookups(function(){		
		if ( options.output_json )
		    console.log( JSONFormatConnection( connection ) )
		else
		    console.log( consoleFormatConnection( connection ).join(options.col_delimiter) )		
		
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
	delete( ignore[addr] )	
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

