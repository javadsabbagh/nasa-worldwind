define(['rbush', 'lodash', 'buckets'], function(rbush, _, buckets) {


    'use strict';

    function RBushCache(rBushMinSize) {

        function arrToString(arr) {
            return arr.join(',');
        }

        var size = rBushMinSize || 1000;

        this._tree = new rbush(size);

        this._cache = new buckets.Dictionary(arrToString);

    }

    RBushCache.prototype.collides = function(box) {
        return this._tree.collides(box);
    }

    RBushCache.prototype.setAsCached = function(box) {
        this._tree.insert(box);
    }

    RBushCache.prototype.cacheData = function(box, data) {
        this._cache.set(box, data);
    }

    RBushCache.prototype.get = function(box, data) {
        this._cache.get(box);
    }




    return RBushCache;





});
