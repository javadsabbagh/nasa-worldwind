define(['buckets','lodash'], function(buckets, _) {

    'use strict';


    function hexToRGB(hex) {

        var working = hex;

        if(hex[0] === '#') {
            working = hex.substr(1);
        }
        var red = parseInt(working.substr(0, 2), 16);
        var green = parseInt(working.substr(2, 2), 16);
        var blue = parseInt(working.substr(4, 2), 16);

        var color = {
            red: red,
            blue : blue,
            green : green
        };

        return color;
    }

    function rgbToWorldWindColor(rgb) {
        var red = rgb.red / 255;
        var blue = rgb.blue / 255;
        var green = rgb.green / 255;
        var color = new WorldWind.Color(red, green, blue);
        return color;
    }

    function hexToWorldWind(hex) {
        var rgb = hexToRGB(hex);
        var color = rgbToWorldWindColor(rgb);
        return color;
    }


    function BuildingColorMapping() {

        this._colors = new buckets.Dictionary();
        this._typeColorAssignments = new buckets.Dictionary();
        this.init();

    }

    BuildingColorMapping.prototype.init = function() {

        // initialize the colors available here


        var self = this;

        var colors = [
            ['Powder Blue','#B0E0E6'],
            ['Crayola Blue','#1F75FE'],
            ['Fern Green', '#71BC78'],
            ['Champagne Pink', '#F1DDCF'],
            ['Apricot', '#FBCEB1']
        ];

        colors.forEach(function(pair) {
            var name = pair[0];
            var hexCode = pair[1];
            var color = hexToWorldWind(hexCode);
            self._colors.set(name, color);
        });



        // assign building types to colors here
        var buildingTypes = [
            ['yes', 'Crayola Blue'],
            ['retail', 'Fern Green'],
            ['house', 'Champagne Pink'],
            ['apartment', 'Apricot']
        ]

        buildingTypes.forEach(function(pair) {
            var type = pair[0];
            var colorName = pair[1];
            self._typeColorAssignments.set(type, colorName);
        });

    }

    BuildingColorMapping.prototype.getColor = function(buildingType) {
        if(this._typeColorAssignments.containsKey(buildingType)) {
            console.log('checking for valid color');
            var colorName = this._typeColorAssignments.get(buildingType);
            console.log('Color name ', colorName);
            var color = this._colors.get(colorName);
            console.log('Color ', color);
            return color
        } else {
            return WorldWind.Color.BLACK;
        }
    }


    return BuildingColorMapping;

});