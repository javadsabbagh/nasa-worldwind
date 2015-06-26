/*
    A set implementation
 */


define(['http://worldwindserver.net/webworldwind/worldwindlib.js'], function(ww) {

    function Set() {
        this._container = {};
    }

    Set.prototype.getKeys = function() {
        var keys = [];
        var self = this;
        for(var key in self._container) {
            if(self.hasOwnProperty(key)) {
                keys.push(key);
            }
        }
        return keys;
    }

    Set.prototype.add = function(key) {
        this._container[key] = true;
    }

    Set.prototype.addMany = function(keys) {
        var self = this;
        keys.forEach(function(key) {
            self.add(key);
        });
    }

    Set.prototype.remove = function(key) {
        this._container[key] = false;
    }

    Set.prototype.removeMany = function(keys) {
        var self = this;
        keys.forEach(function(key) {
            self.remove(key);
        });
    }

    Set.prototype.contains = function(key) {
        return this._container[key] === true;
    }

    Set.prototype.intersect = function(that) {
        var res = new Set();
        var self = this;
        this.getKeys().forEach(function(key) {
           if(that.contains(key)) {
               res.add(key);
           }
        });
        return res;
    }

    Set.prototype.union = function(that) {
        var res = new Set();
        var self = this;
        res.addMany(self.getKeys());
        res.addMany(that.getKeys());
        return res;
    }

    Set.prototype.setDifference = function(that) {
        var res = new Set();
        var keys = this.getKeys();
        keys.forEach(function(key) {
           if(that.contains(key) === false) {
               res.add(key);
           }
        });
        return res;
    }

    Set.prototype.filter = function(func) {
        var res = new Set();
        var keys = this.getKeys();
        res.addMany(keys.filter(func));
        return res;
    }

    Set.prototype.map = function(mapFunc) {
        var res = new Set();
        var keys = this.getKeys();
        res.addMany(keys.map(mapFunc));
        return res;
    }

    Set.prototype.forEach = function(eachFunc) {
        var keys = this.getKeys();
        keys.forEach(eachFunc);
    }

    return Set;

});