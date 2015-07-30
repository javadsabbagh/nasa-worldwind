define(['BuildingFactory'], function(BuildingFactory) {

    function BuildingLayer() {
        this._displayName = 'Buildings';
        this._layer = new WorldWind.RenderableLayer(this._displayName);
        this._factory = new BuildingFactory();
    }

    BuildingLayer.prototype.addBuilding = function(polygonShape, amenity) {
        console.log('creating polygon for .....', polygonShape);
        var box = polygonShape.slice(0, polygonShape.length - 1);
        var building = this._factory.constructBuilding([box], amenity);
        this._layer.addRenderable(building);
    }

    BuildingLayer.prototype.clearBuildings = function() {
        this._layer.removeAllRenderables();
    }

    BuildingLayer.prototype.render = function(dc) {
        this._layer.render(dc);
    }

    Object.defineProperties(BuildingLayer.prototype, {
       displayName : {
           get: function() {
               return this._displayName;
           }
       }
    });

    return BuildingLayer;

})