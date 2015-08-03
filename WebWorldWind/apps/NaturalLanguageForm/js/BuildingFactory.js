define(['Building','BuildingColorMapping'], function(Building, BuildingColorMapping) {


    'use strict';

    function BuildingFactory() {
        this._colorMapping = new BuildingColorMapping();
    }

    BuildingFactory.prototype.createBuilding = function(id, polygon, buildingType) {
        var building = new Building(id, polygon, buildingType, this._colorMapping);
        return building;
    }





    //BuildingFactory.prototype.chooseColor = function(amenity) {
    //    return WorldWind.Color.BLACK;
    //}
    //
    //BuildingFactory.prototype.constructBuilding = function(polygonShape, amenity) {
    //
    //    var color = this.chooseColor(amenity);
    //    var shapeAttributes = new WorldWind.ShapeAttributes(null);
    //    shapeAttributes.drawOutline = true;
    //    shapeAttributes.outlineColor = color;
    //    shapeAttributes.interiorColor = color;
    //
    //
    //    var polygon = new WorldWind.SurfacePolygon(polygonShape, shapeAttributes);
    //    console.log('shape :',polygonShape);
    //    console.log('polgon being created ', polygon);
    //    return polygon;
    //
    //
    //}


    return BuildingFactory;

});