var raw       = require( 'raw-socket' )
var timers    = require ( 'timers' )
var freegeoip = require( 'node-freegeoip' )
var columnify = require( 'columnify')
var dns       = require( 'dns')

var socket    = raw.createSocket( { protocol : raw.Protocol.TCP } )
var ip_active = {}

console.log( '\u001B[2J\u001B[0;0f' )
console.log("Started listening ..please wait")

socket.on( "on" , function( buffer , addr ) {
    
    var packet = {
	source    : addr,
	location  : {},
	protocol  : 'TCP',
	connected  : new Date(),
	last_heard : new Date(),
	disconnected : false,
    }
    
    freegeoip.getLocation(addr , function( err , local){
	packet.location = local
	ip_active[packet.source] = packet
    })

})
socket.on( "message" , function( buffer , addr ) {
    var packet = {
	source : addr,
	protocol : 'TCP',
	discovered : new Date(),
	last_heard : new Date(),
	location : {
	    country_name : 'N/A'
	}
    }
    if( typeof(ip_active[addr]) == 'undefined' ){
	    var packet = {
		source   : addr,
		location : {},
		protocol : 'TCP',
		discovered : new Date(),
		last_heard : new Date(),
	    }
	
	freegeoip.getLocation(addr , function( err , local){
	    packet.location = local
	    ip_active[packet.source] = packet
	})
    }else{
	ip_active[packet.source].last_heard= new Date();
    }
})


socket.on( "close" , function( buffer , addr ) {
    ip_active[packet.source].disconnected = new Date();
    delete(ip_active[addr])
})


timers.setInterval(function(){
    var connection_count = Object.keys(ip_active).length
    
    console.log( '\u001B[2J\u001B[0;0f' )    
    console.log ( 'CONNECTION COUNT: ' + connection_count)

    Object.keys(ip_active).forEach(function( item ) {
	packet = ip_active[item]
	dns.lookup( packet.source, function( err , addr ){

	    console.log( packet.last_heard.toString() + "\t" + packet.source + "\t"+ addr + "\t\t" + packet.location.country_name )
	})
	
    })

},2000 )
