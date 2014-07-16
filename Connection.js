var freegeoip = require( 'node-freegeoip' )
var dns       = require( 'dns')

var Connection = function( addr) {
    this.dns_name  = 'Unresolved'
    this.source    = addr
    this.country_name = 'Unresolved'
    this.protocol  = 'TCP'
    this.discovered  = new Date()
    this.last_seen = new Date()
    this.lost = false
    this.bytecount = 0
    this.last_bytecount = 0
}
Connection.prototype.getDuration = function(){
    return this.discovered.getTime() + this.last_seen.getTime()
}
Connection.prototype.addToByteCount = function( bytecount ) {
    this.bytecount += bytecount
    this.last_bytecount = bytecount
    
}
Connection.prototype.getConnectionTime = function(){
    return (this.last_seen )
}
Connection.prototype.doAsyncLookups  = function(callback){
    var connection = this
    dns.reverse(connection.source,function( err, addresses){
	connection.dns_name = (!err && addresses) ? addresses[0] : 'Resolve Error'
	freegeoip.getLocation(connection.source , function( err , location){
	    connection.country_name = (!err) ? location.country_name : 'Lookup error'
	    return callback()
	})
    })
}
Connection.prototype.dnsReverse = function(){
    var connection = this
    dns.reverse(connection.source,function( err, addresses){
	connection.dns_name = (!err && addresses) ? addresses : 'Resolve Error'
    })
}
Connection.prototype.geoLookup = function (){
    var connection = this
    freegeoip.getLocation(connection.source , function( err , location){
	connection.country_name = (!err) ? location.country_name : 'Lookup error'
    })
}
module.exports = Connection
