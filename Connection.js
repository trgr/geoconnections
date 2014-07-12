var freegeoip = require( 'node-freegeoip' )
var dns       = require( 'dns')

var Connection = function( addr) {
    this.dnys_name  = 'unresolved'
    this.source    = addr
    this.country_name = 'Unresolved'
    this.protocol  = 'TCP'
    this.discovered  = new Date()
    this.last_heard = new Date()
    this.lost = false
    this.bytecount = 0
    this.last_bytecount = 0
}
Connection.prototype.getDuration = function(){
    return this.discovered.getTime() + this.last_heard.getTime()
}
Connection.prototype.addToByteCount = function( bytecount ) {
    this.bytecount += bytecount
    this.last_bytecount = bytecount
    
}
Connection.prototype.getConnectionTime = function(){
    return (this.last_heard )
}
Connection.prototype.dnsReverse = function(){
    var connection = this
    dns.reverse(connection.source,function( err, addresses){
	if( !err && addresses)
            connection.dns_name = addresses
        else
            connection.dns_name = "Resolve Error"
    })
}
Connection.prototype.geoLookup = function (){
    var connection = this
    freegeoip.getLocation(connection.source , function( err , location){
        if (!err )
            connection.country_name = location.country_name
    })
}
module.exports = Connection
