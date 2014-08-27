#!/usr/bin/node
// test
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

/* Add generic padding method to String type */
/* Concat string on with a string created by joining a array of size n on whitespace if n is greater than 0 */
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

function consoleFormatJSON(connectionObject){
    var ip           = connectionObject.source
    var country_name = connectionObject.country_name
    var dns_name     = connectionObject.dns_name
    var last_seen    = connectionObject.last_seen
    return JSON.stringify( [last_seen,ip,country_name,dns_name] )
}

function showHelp(message,exit){
    if( message.length > 0 )
	console.warn( message )

    console.log( argv['$0'] + " options" )
    console.log( "--unique".pad(30) +"\t: Connection is only listed when it first appears." )
    console.log( "--save_db".pad(30) +"\t: Store connections data in a database" )
    console.log( "--output_json".pad(20) +"\t: Outputs a JSON encoded array instead of human readable / console formated" )
    console.log( "--connection_idle_time <t in ms> ".pad(0) +"\t: Time to wait before a connection is regarded as new again")
    console.log( "--help".pad(30) +"\t: Prints this help")
    
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

if( argv.unique )
    options.unique = true

if( argv.connection_idle_time )
    options.connection_idle_time = argv.connection_idle_time

if( process.getuid() != 0 ) /* Check if we're root*/
    showHelp(argv['$0'] + " requires root priveliges for raw socket.",true)



/* Create socket */
socket    = raw.createSocket( { protocol : raw.Protocol.TCP } )

socket.on( "message" , function( buffer , addr ){
    
    var conn = new Connection( addr )
    conns_count = all_connections.length
    
    /* If we know of this address and it's idle_time has not passed since it was last seen */
    var t = new Date().getTime() - options.connection_idle_time
    for( var i = 0; conns_count > i; i++ ) 
	if(all_connections[i].source == addr && (all_connections[i].last_seen.getTime() > t || options.unique) ) /* p ^ ( q ^ v r ) */
	    return
    
    all_connections.push( conn )
    conn.doAsyncLookups(function(){	
	if( options.output_json )
	    console.log( consoleFormatJSON( conn ) )
	else
	    console.log( consoleFormatConnection( conn ).join(options.col_delimiter) )	
    })
    
})
