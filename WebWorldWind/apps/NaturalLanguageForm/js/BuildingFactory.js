define(function() {


    'use strict';

    function BuildingFactory() {

    }


    BuildingFactory.prototype.chooseColor = function(amenity) {
        return WorldWind.Color.BLACK;
    }

    BuildingFactory.prototype.constructBuilding = function(polygonShape, amenity) {

        var color = this.chooseColor(amenity);
        var shapeAttributes = new WorldWind.ShapeAttributes(null);
        shapeAttributes.drawOutline = true;
        shapeAttributes.outlineColor = color;
        shapeAttributes.interiorColor = color;


        var polygon = new WorldWind.SurfacePolygon(polygonShape, shapeAttributes);
        console.log('shape :',polygonShape);
        console.log('polgon being created ', polygon);
        return polygon;


    }


    return BuildingFactory;

});