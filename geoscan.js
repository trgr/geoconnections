var raw       = require( "raw-socket" )
var timers    = require ( "timers" )
var freegeoip = require( "node-freegeoip" )
var socket    = raw.createSocket( { protocol : raw.Protocol.TCP } )
var ip_list   = {}

console.log( '\u001B[2J\u001B[0;0f' )
console.log("Started listening ..please wait")

socket.on( "message" , function( buffer , source ) {
    if( source != null ){
	ip_list[source] = { 
	    source   : source,
	    protocol : 'TCP'
	}
    }
})

timers.setInterval(function(){
    console.log( '\u001B[2J\u001B[0;0f' )
    console.log( "Found these connections :" )
    Object.keys(ip_list).forEach(function( item ) {	
	freegeoip.getLocation( ip_list[item].source , function( err , local){
	    console.log( ip_list[item].source + "\t" + ip_list[item].protocol + "\t" + local.country_name)
	})
    })
},5000 )



