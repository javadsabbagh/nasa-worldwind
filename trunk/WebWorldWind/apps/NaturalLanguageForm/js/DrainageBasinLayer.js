define(function() {

    function DrainageBasinLayer() {
        this._displayName = 'Drainage Basins';
        this._layer = new WorldWind.RenderableLayer(this._displayName);
        this._uri = '';
    }


    DrainageBasinLayer.prototype.loadContents = function() {

        var attributeCallback = function(attributes, record) {
            var configuration = {};
            configuration.name = attributes.values.name || attributes.values.Name || attributes.values.NAME;

            if (record.isPointType()) {
                configuration.name = attributes.values.name || attributes.values.Name || attributes.values.NAME;

                configuration.attributes = new WorldWind.PlacemarkAttributes(placemarkAttributes);

                if (attributes.values.pop_max) {
                    var population = attributes.values.pop_max;
                    configuration.attributes.imageScale = 0.01 * Math.log(population);
                }
            } else if (record.isPolygonType()) {
                configuration.attributes = new WorldWind.ShapeAttributes(null);

                // Fill the polygon with a random pastel color.
                configuration.attributes.interiorColor = WorldWind.Color.BLUE;

                // Paint the outline in a darker variant of the interior color.
                configuration.attributes.outlineColor = new WorldWind.Color(
                    0.5 * configuration.attributes.interiorColor.red,
                    0.5 * configuration.attributes.interiorColor.green,
                    0.5 * configuration.attributes.interiorColor.blue,
                    1.0);
            }

            return configuration;
        };

        var shapeFile = new WorldWind.Shapefile(this._uri);
        shapeFile.load(null, attributeCallback, this._layer);

    }

    DrainageBasinLayer.prototype.render = function(dc) {
        this._layer.render(dc);
    }

    Object.defineProperties(DrainageBasinLayer.prototype, {

        displayName : {
            get: function() {
                return this._displayName;
            }
        },

        renderables: {
            get: function() {
                return this._layer.renderables;
            }
        }

    });



});