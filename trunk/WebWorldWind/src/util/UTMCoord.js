define(['../geom/UTMLatLongConverter'], function(UTMLatLongConverter) {

    'use strict';

    /*
     * This represents a coordinate in the Universal Mercator Projection
     * @param {northing} : the northing to be considered
     * @param {easting} : the easting to be considered
     * @param {zone} : the resident zone of the coordinate
     * @param {hemisphere} : the hemisphere that contains the coordinate, either 'N' or 'S'
     */
    function UTMCoord(northing, easting, zone, hemisphere) {

        this._northing = northing;
        this._easting = easting;
        this._zone = zone;
        this._hemisphere = hemisphere;

        this._converter =  new UTMLatLongConverter();

    }




    Object.defineProperties(UTMCoord.prototype, {

        location: {
            get: function() {
                return this._converter.convertToLatLong(this._easting, this._northing, this._zone, this.hemisphere);
            }
        },

        northing: {
            get: function() {
                return this._northing;
            }
        },

        easting: {
            get: function() {
                return this._easting
            }
        },

        zone: {
            get: function() {
                return this._zone;
            }
        },

        hemisphere: {
            get: function() {
                return this._hemisphere;
            }
        }

    });



});
