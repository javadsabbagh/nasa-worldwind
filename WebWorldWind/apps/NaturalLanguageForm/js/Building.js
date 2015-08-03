define(function() {


    'use strict';


    function Building(id, polygon, buildingType) {
        this._id = id;
        this._polygon = polygon;
        this._buildingType = buildingType;
        this._shape = null;
    }

    Building.prototype.assignColors = function(buildingType) {

        var interiorColor = WorldWind.Color.BLUE;

        var outlineColor = new WorldWind.Color(interiorColor.red * 0.5, interiorColor.blue * 0.5,
            interiorColor.green * 0.5);

        var colors = {
            interiorColor : interiorColor,
            outlineColor : outlineColor
        };

        return color;

    }

    Building.prototype.createSurfacePolygon = function(polygon, buildingType) {

        var colors = this.assignColors(buildingType);
        var shapeAttributes = new WorldWind.ShapeAttributes(null);
        shapeAttributes.interiorColor = colors.interiorColor;
        shapeAttributes.outlineColor = colors.outlineColor;
        shapeAttributes.drawOutline = true;

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


})