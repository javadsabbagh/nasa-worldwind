define(['http://worldwindserver.net/webworldwind/worldwindlib.js',
        'OpenStreetMapConfig',
        'rbush'],
    function(ww,
             OpenStreetMapConfig,
             rbush) {

        'use strict';

        /*
            From the draw context, extracts the current altitude of the eyePosition
         */
        function getEyeAltitude(drawContext) {
            return drawContext.eyePosition.altitude;
        }

        /*
            Abstracts off of the OpenStreetMap Layer and a Renderable Layer
            to facilitate the display of information to the user
            @param wwd: the WorldWind WorldWindow object to which the layers
                        are to be applied
         */
        function OpenStreetMapLayer(wwd) {

            this._config = new OpenStreetMapConfig();
            this._wwd = wwd;
            this._baseLayer = new WorldWind.OpenStreetMapImageLayer(null);
            this._drawLayer = new WorldWind.RenderableLayer('Building Layer');
            this._enabled =  true;
            this._displayName = 'Open Street Maps';
            this._renderables = new rbush(this._config.rTreeSize);
            this._visibleNodes = [];

        }

        /*
            Uses the information stored in the configuration object to
            extract the visible nodes from the RTree
            @param center: the center point of the area currently, being
                           observed by the user
            @return: an array of nodes from the RTree that represent renderables
                     within a close proximity of the center point supplied
         */

        OpenStreetMapLayer.prototype.getVisibleNodes = function(center) {

            var boxMinLong = undefined;
            var boxMinLat = undefined;
            var boxMaxLong = undefined;
            var boxMaxLat = undefined;

            var nodes = this._renderables.search(boxMinLong, boxMinLat, boxMaxLong, boxMaxLat);

            return nodes;
        }

        /*
            Uses getVisibleNodes to retrieve the nodes that should be visible to
            the user and enable the renderables stored in them for rendering
            @param center: the center point of the area currently, being
                           xobserved by the user
            @return : the visible nodes in the layer, their enabled property set to true,
                      as retrieved from the RTree
         */
        OpenStreetMapLayer.prototype.enableVisibleNodes = function(center) {
            var nodes = this.getVisibleNodes(center);
            nodes.forEach(function(node) {
                var renderableObject = node[node.length - 1];
                renderableObject.enabled = true;
            });
            return nodes;
        }


        /*
            Disables all nodes that were previously renderable
         */
        OpenStreetMapLayer.prototype.disableVisibleNodes = function() {
            this._visibleNodes.forEach(function(node) {
                node[node.length - 1].enabled = false;
            });
        }

        /*
            Abstracts over the render functions of both the open street map layer
            and the renderable layer
         */
        OpenStreetMapLayer.prototype.render = function(dc) {
            if(this._enabled) {
                var currEyeAltitude = getEyeAltitude(dc);
                this._baseLayer.render(dc);
                if(currEyeAltitude <= this._config.drawHeight) {
                    this.disableVisibleNodes();
                    this._visibleNodes = this.enableVisibleNodes(dc.center);
                    this._drawLayer.render(dc);
                } else {
                    this.disableVisibleNodes();
                    this._visibleNodes = [];
                }
            }

        }

        /*
            Takes the renderable and constructs a "node" for insertion into
            the RTree
         */
        OpenStreetMapLayer.prototype.createRTreeNode = function(point) {
            var long = point.longitude;
            var lat = point.latitude;
            return [long, lat, long, lat, point];
        }

        /*
            Takes a renderable, disables it, and adds it to the RTree
         */
        OpenStreetMapLayer.prototype.addRenderable = function(renderable) {
            renderable.enabled = false;
            this._drawLayer.addRenderable(renderable);
            var node = this.createRTreeNode(renderable);
            this._renderables.insert(node);
        }

        /*
            Takes an iterable of renderables, construct their RTree nodes and
            adds them to the RTree
         */
        OpenStreetMapLayer.prototype.addRenderables = function(renderables) {
            var self = this;
            this._drawLayer.addRenderables(renderables);
            var nodes = renderables.map(function(renderable) {
                renderable.enabled = false;
                return self.createRTreeNode(renderable);
            });
            this._renderables.load(nodes);
        }

        Object.defineProperties(OpenStreetMapLayer.prototype, {
           enabled : {
               get: function() {
                   return this._enabled;
               },

               set: function(value) {
                   this._enabled = value;
               }
           },

            displayName: {
                get: function() {
                    return this._displayName;
                }
            }
        });


        return OpenStreetMapLayer;




});
