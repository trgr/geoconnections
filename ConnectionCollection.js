var ConnectionCollection = function() {
    this.connections = []
}

ConnectionCollection.prototype.addConnection = function (connection){
    this.connections[connection.source] = connection
}

ConnectionCollection.prototype.getConnectionCount = function(){
    return Object.keys(this.connections).length
}
ConnectionCollection.prototype.getConnectionKeys = function(){
    return Object.keys(this.connections)
}
ConnectionCollection.prototype.getConnection = function(key){
    return this.connections[key]
}
ConnectionCollection.prototype.clear = function(){
    this.connections = []
}
module.exports = ConnectionCollection
