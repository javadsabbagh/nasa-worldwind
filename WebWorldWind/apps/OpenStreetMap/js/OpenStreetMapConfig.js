
/*
    Provides the configuration for the globe
 */


define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'jquery'], function(ww, $) {

    var OpenStreetMapConfig = function() {

        this._canvasName = 'globe';

        this._drawHeightInM = 10000;

        this._drawHeightInKm = this._drawHeightInM * 1000;

        this._drawRadiusInMiles = 10.0;

        this._kmPerMile = 1.60934;

        this._drawRadiusInKm = this._kmPerMile * this._drawRadiusInMiles;

        this._boundBoxHeight = 1.6;

        this._boundBoxWidth = 1.6;

        this._rTreeSize = 100000;

        this._canvasWidthFactor = 0.9;

        this._canvasHeightFactor = 1.0;

        this._canvasWidth = $(document).width() * this._canvasWidthFactor;

        this._canvasHeight = $(document).height() * this._canvasHeightFactor;

        this._overPassAPIBody = 'http://overpass-api.de/api/';

    }


    Object.defineProperties(OpenStreetMapConfig.prototype, {
        canvasName : {
            get: function() {
                return this._canvasName;
            }
        },

        canvasIDString: {
            get: function() {
                return '#' + this._canvasName;
            }
        },

        drawHeight : {
            get: function() {
                return this._drawHeightInM;
            }
        },

        drawRadius : {
            get: function() {
                return this._drawRadiusInKm;
            }
        },

        rTreeSize: {
            get: function() {
                return this._rTreeSize;
            }
        },

        boundBoxHeight: {
            get: function() {
                return this._boundBoxHeight;
            }
        },

        boundBoxWidth: {
            get: function() {
                return this._boundBoxWidth;
            }
        },

        canvasHeightFactor: {
            get: function() {
                return this._canvasHeightFactor;
            }
        },

        canvasWidthFactor: {
            get: function() {
                return this._canvasHeightFactor;
            }
        },

        canvasHeight : {
            get: function() {
                return this._canvasHeight;
            }
        },

        canvasWidth: {
            get: function() {
                return this._canvasWidth;
            }
        },

        overPassAPIBody : {
            get: function() {
                return this._overPassAPIBody;
            }
        }
    });

    return OpenStreetMapConfig;



})
