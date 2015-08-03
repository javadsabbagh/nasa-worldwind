define(function() {


    'use strict';




    function Building(id, polygon, buildingType, colorMapper) {
        this._id = id;
        this._polygon = polygon;
        this._buildingType = buildingType;
        this._colorMapper = colorMapper;
        this._shape = null;
    }





    Building.prototype.chooseOutlineColorBasedOnBuildingType = function(buildingType) {
        var color = this._colorMapper.getColor(buildingType);
        return color;
    }

    Building.prototype.assignColors = function(buildingType) {

        var outlineColor = this.chooseOutlineColorBasedOnBuildingType(buildingType);
        var interiorColor = new WorldWind.Color(outlineColor.red * 0.5, outlineColor.green * 0.5,
            outlineColor.blue * 0.5);

        var colors = {
            interiorColor : interiorColor,
            outlineColor : outlineColor
        };

        return colors;

    }

    Building.prototype.createSurfacePolygon = function(polygon, buildingType) {

        var colors = this.assignColors(buildingType);
        var shapeAttributes = new WorldWind.ShapeAttributes(null);
        shapeAttributes.interiorColor = colors.interiorColor;
        shapeAttributes.outlineColor = colors.outlineColor;
        shapeAttributes.drawOutline = true;
        shapeAttributes.outlineWidth = 0.4;

        var polygonShape = new WorldWind.SurfacePolygon(polygon, shapeAttributes);
        return polygonShape;

    }

    Building.prototype.render = function(dc) {
        if(this._shape === null) {
            this._shape = this.createSurfacePolygon(this._polygon, this._buildingType);
        }
        this._shape.render(dc);
    }




    Object.defineProperties(Building.prototype, {

        id : {
            get: function() {
                return this._id;
            }
        },

        polygon : {
            get: function() {
                return this._polygon;
            }
        },

        buildingType : {
            get: function() {
                return this._buildingType;
            },

            set: function(value) {
                this._buildingType = value;
            }
        }

    });

    return Building;


});