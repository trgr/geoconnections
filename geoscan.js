var raw       = require( 'raw-socket' )
var timers    = require( 'timers' )
var freegeoip = require( 'node-freegeoip' )
var dns       = require( 'dns')
var Table     = require( 'cli-table');

function createConnectionObject( addr,callback ){
    var connection = {
	dns_name  : 'unresolved',
	source    : addr,
	country_name : 'unresolved',
	protocol  : 'TCP',
	discovered  : new Date(),
	last_heard : new Date(),
	lost : false,
    }
    
    dns.reverse(addr,function( err, addresses){
	connection.dns_name = (err) ? addresses : "Could not resolve"
	if ( err)
	    connection.dns_name = "Could not resolve"
	
	if ( !addresses)
	    connection.dns_name = "Resolve Error"
	else
	    connection.dns_name = addresses[0]

	
	
	freegeoip.getLocation(addr , function( err , location){
	    if( err )
		return callback(connection)
	    
	    connection.country_name = location.country_name
	    callback(connection)
	})
    })
}


var socket    = raw.createSocket( { protocol : raw.Protocol.TCP } )
var active_connections = {}

console.log( '\u001B[2J\u001B[0;0f' )
console.log("Started listening ..please wait")

socket.on( "on" , function( buffer , addr ) {    
    createConnectionObject(addr, function(connection_object) {
	active_connections[addr] = connection_object
    })
    
})
socket.on( "message" , function( buffer , addr ) {
    if ( active_connections[addr] )
	return;
    
    createConnectionObject(addr, function(connection_object) {
	active_connections[addr] = connection_object
    })
})

socket.on( "close" , function( buffer , addr ) {
    if (!active_connections[addr])
	return
    
    active_connections[addr].lost = new Date();
    /* Save to DB here */

    delete(active_connections[addr])
})


timers.setInterval(function(){
    var connection_keys = Object.keys(active_connections)
    var connection_count = connection_keys.length
    
    console.log( '\u001B[2J\u001B[0;0f' )

    var table = new Table({
	head : ['IP','Discovered','Country'],
	colWidths: [30, 20]
    })
    for ( var i=0; connection_keys.length > i; i++){
	connection = active_connections[connection_keys[i]]
	
	table.push([
	    connection.source,
	    connection.discovered,
	    connection.country_name,
	])
    }
    
    console.log(table.toString());
    
},2000 )
