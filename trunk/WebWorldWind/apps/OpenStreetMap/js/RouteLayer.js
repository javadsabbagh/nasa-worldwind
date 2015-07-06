define(['http://worldwindserver.net/webworldwind/worldwindlib.js', 'Route','polyline'], function(ww, Route, polyline) {

   'use strict';


    function RouteLayer() {

        this._displayName = 'Routes Layer';
        this._renderableLayer = new WorldWind.RenderableLayer('Routes Layer');
        this._enabled = true;

    }

    /*
        Given a json object (as described on https://github.com/Project-OSRM/osrm-backend/wiki/Server-api),
        creates a new Route object and adds it to the renderable layer
        @param geojsonDoc: the json doc that contains the route information
     */
    RouteLayer.prototype.addRoute = function(geojsonDoc) {
        var arrOfRoutes = polyline.decode(geojsonDoc["route_geometry"]);
        arrOfRoutes.forEach(function(entry){
            entry[0] = entry[0]/10
            entry[1] = entry[1]/10
        })
        var route = new Route(arrOfRoutes, geojsonDoc);
        this._renderableLayer.addRenderable(route);
    }

    /*
        Provides an interface to the renderable layer that is masked by this object
        @param dc: the DrawContext that is supplied to render the renderable layer
     */
    RouteLayer.prototype.render = function(dc) {
        this._renderableLayer.render(dc);
    }


    Object.defineProperties(RouteLayer.prototype, {

        enabled : {
            get: function() {
                return this._enabled;
            },

            set: function(value) {
                this._enabled = value;
                this._renderableLayer.enabled = value;
            }
        },

        displayName: {
            get: function() {
                return this._displayName;
            },

            set: function(value) {
                this._displayName = value;
            }
        }

    });

return RouteLayer

});