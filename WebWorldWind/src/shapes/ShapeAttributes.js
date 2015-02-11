/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ShapeAttributes
 * @version $Id$
 */
define([
        '../util/Color'
    ],
    function (Color) {
        "use strict";

        /**
         * Constructs a shape attributes bundle, optionally specifying a prototype set of attributes. Not all shapes
         * use all the properties in the bundle. See the documentation of a specific shape to determine the properties
         * it does use.
         * @alias ShapeAttributes
         * @constructor
         * @classdesc Holds attributes applied to World Wind shapes.
         * @param {ShapeAttributes} attributes An attribute bundle whose properties are used to initially populate
         * the constructed attributes bundle. May be null, in which case the constructed attributes bundle is populated
         * with default attributes.
         */
        var ShapeAttributes = function (attributes) {

            /**
             * Indicates whether the interior of the associated shape is drawn.
             * @type {boolean}
             * @default true
             */
            this.drawInterior = attributes ? attributes.drawInterior : true;

            /**
             * Indicates whether the outline of the associated shape is drawn
             * @type {boolean}
             * @default true
             */
            this.drawOutline = attributes ? attributes.drawOutline : true;

            /**
             * Indicates whether lighting is applied to the associated shape.
             * @type {boolean}
             * @default false
             */
            this.enableLighting = attributes ? attributes.enableLighting : false;

            /**
             * Indicates the associated shape's interior color and opacity.
             * @type {Color}
             * @default Opaque white (red = 1, green = 1, blue = 1, alpha = 1)
             */
            this.interiorColor = attributes ? attributes.interiorColor : Color.WHITE;

            /**
             * Indicates the associated shape's outline color and opacity.
             * @type {Color}
             * @default Opaque red (red = 1, green = 0, blue = 0, alpha = 1)
             */
            this.outlineColor = attributes ? attributes.outlineColor : Color.RED;

            /**
             * Indicate the associated shape's outline width.
             * @type {number}
             * @default 1.0
             */
            this.outlineWidth = attributes ? attributes. outlineWidth : 1.0;

            /**
             * Indicates the associated shape's outline stipple factor. Specifies the number of times each bit in the
             * outline stipple pattern is repeated before the next bit is used. For example, if the outline stipple
             * factor is 3, each bit is repeated three times before using the next bit. The specified factor must be
             * either 0 or an integer greater than 0. A stipple factor of 0 indicates no stippling.
             * @type {number}
             * @default 0
             */
            this.outlineStippleFactor = attributes ? attributes.outlineStippleFactor : 0;

            /**
             * Indicates the associated shape's outline stipple pattern. Specifies a number whose lower 16 bits
             * define a pattern of which pixels in the outline are rendered and which are suppressed. Each bit
             * corresponds to a pixel in the shape's outline, and the pattern repeats after every n*16 pixels, where
             * n is the [stipple factor]{@link ShapeAttributes#outlineStippleFactor}. For example, if the outline
             * stipple factor is 3, each bit in the stipple pattern is repeated three times before using the next bit.
             * <p>
             * To disable outline stippling, either specify a stipple factor of 0 or specify a stipple pattern of
             * all 1 bits, i.e., 0xFFFF.
             * @type {number}
             * @default 0xF0F0
             */
            this.outlineStipplePattern = attributes ? attributes.outlineStipplePattern : 0xF0F0;

            /**
             * Indicates the associated shape's image source, a URL string. May be null, in which case no image is
             * applied to the shape.
             * @type {String}
             * @default null
             */
            this.imageSource = attributes ? attributes.imageSource : null;

            /**
             * Indicates the associated shape's image scale, the amount to scale the shape's image dimensions.
             * @type {number}
             * @default 1.0
             */
            this.imageScale = attributes ? attributes.imageScale : 1.0;

            /**
             * Indicates the reference point within the associated shape's image at which to locate the image on the
             * shape. That reference point is placed at the reference point of the shape. See the
             * specific shape for a description of the shape's reference point. May be null to indicate that the
             * image's bottom left corner is placed at the shape's reference point.
             * @type {null}
             */
            this.imageOffset = attributes ? attributes.imageOffset : null;

            /**
             * Indicates whether the shape should be depth-tested against other objects in the scene. If true,
             * the shape may be occluded by terrain and other objects in certain viewing situations. If false,
             * the shape will not be occluded by terrain and other objects.
             * @type {boolean}
             * @default
             */
            this.depthTest = attributes ? attributes.depthTest : true;
        };

        return ShapeAttributes;
    });