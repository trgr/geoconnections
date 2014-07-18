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


socket.on( "message" , function( buffer , addr ){
    
    if ( ignore[addr] ) 
	return
    
    ignore[addr] = true /* This is not needed anymore*/
    var conn = new Connection( addr )
    conns_count = all_connections.length
    
    var t = new Date().getTime() - options.connection_idle_time
    
    for( var i = 0; conns_count > i; i++ ){
	if(all_connections[i].source == addr && all_connections[i].last_seen.getTime() > t ){
	    delete ( ignore[addr] )
	    return
	}
    }
    
    all_connections.push( conn )
    conn.doAsyncLookups(function(){	
	console.log( consoleFormatConnection( conn ).join(options.col_delimiter) )	
	delete ( ignore[addr] )

    })
    
})



