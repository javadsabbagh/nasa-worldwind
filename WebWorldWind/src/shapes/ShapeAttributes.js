/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ShapeAttributes
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Color',
        '../util/Logger'
    ],
    function (ArgumentError,
              Color,
              Logger) {
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
            // Internal use only. Intentionally not documented.
            this.listeners = [];

            this.drawInterior = attributes ? attributes.drawInterior : true;
            this.drawOutline = attributes ? attributes.drawOutline : true;
            this.enableLighting = attributes ? attributes.enableLighting : false;
            this.interiorColor = attributes ? attributes.interiorColor : Color.WHITE;
            this.outlineColor = attributes ? attributes.outlineColor : Color.RED;
            this.outlineWidth = attributes ? attributes. outlineWidth : 1.0;
            this.outlineStippleFactor = attributes ? attributes.outlineStippleFactor : 0;
            this.outlineStipplePattern = attributes ? attributes.outlineStipplePattern : 0xF0F0;
            this.imageSource = attributes ? attributes.imageSource : null;
            this.imageScale = attributes ? attributes.imageScale : 1.0;
            this.imageOffset = attributes ? attributes.imageOffset : null;
            this.depthTest = attributes ? attributes.depthTest : true;
        };

        /**
         * Add a listener to this shape attribute. The listener will be called whenever the shape attribute changes.
         * @param listener
         */
        ShapeAttributes.prototype.addListener = function(listener) {
            if (!listener) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ShapeAttributes", "addListener",
                        "missingListener"));
            }

            if (typeof listener != "function") {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ShapeAttributes", "addListener",
                        "The specified listener is not a function."));
            }

            var index = this.listeners.indexOf(listener);
            if (index == -1) {
                this.listeners.push(listener);
            }
        };

        /**
         * Remove a listener from this shape attribute.
         * @param listener
         */
        ShapeAttributes.prototype.removeListener = function(listener) {
            if (!listener) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ShapeAttributes", "removeListener",
                        "missingListener"));
            }

            var index = this.listeners.indexOf(listener);
            if (index != -1) {
                this.listeners.splice(index, 1);
            }
        };

        // Internal use only. Intentionally not documented.
        ShapeAttributes.prototype.notifyListeners = function() {
            for (var idx = 0, len = this.listeners.length; idx < len; idx += 1) {
                var listener = this.listeners[idx];
                listener.call(listener, this);
            }
        };

        Object.defineProperties(ShapeAttributes.prototype, {
            /**
             * Indicates whether the interior of the associated shape is drawn.
             * @memberof ShapeAttributes.prototype
             * @type {boolean}
             * @default true
             */
            drawInterior: {
                get: function () {
                    return this._drawInterior;
                },
                set: function (value) {
                    this._drawInterior = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates whether the outline of the associated shape is drawn
             * @memberof ShapeAttributes.prototype
             * @type {boolean}
             * @default true
             */
            drawOutline: {
                get: function () {
                    return this._drawOutline;
                },
                set: function (value) {
                    this._drawOutline = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates whether lighting is applied to the associated shape.
             * @memberof ShapeAttributes.prototype
             * @type {boolean}
             * @default false
             */
            enableLighting: {
                get: function () {
                    return this._enableLighting;
                },
                set: function (value) {
                    this._enableLighting = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the associated shape's interior color and opacity.
             * @memberof ShapeAttributes.prototype
             * @type {Color}
             * @default Opaque white (red = 1, green = 1, blue = 1, alpha = 1)
             */
            interiorColor: {
                get: function () {
                    return this._interiorColor;
                },
                set: function (value) {
                    this._interiorColor = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the associated shape's outline color and opacity.
             * @memberof ShapeAttributes.prototype
             * @type {Color}
             * @default Opaque red (red = 1, green = 0, blue = 0, alpha = 1)
             */
            outlineColor: {
                get: function () {
                    return this._outlineColor;
                },
                set: function (value) {
                    this._outlineColor = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the associated shape's outline width.
             * @memberof ShapeAttributes.prototype
             * @type {number}
             * @default 1.0
             */
            outlineWidth: {
                get: function () {
                    return this._outlineWidth;
                },
                set: function (value) {
                    this._outlineWidth = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the associated shape's outline color and opacity.
             * @memberof ShapeAttributes.prototype
             * @type {Color}
             * @default Opaque red (red = 1, green = 0, blue = 0, alpha = 1)
             */
            outlineStippleFactor: {
                get: function () {
                    return this._outlineStippleFactor;
                },
                set: function (value) {
                    this._outlineStippleFactor = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the associated shape's outline stipple pattern. Specifies a number whose lower 16 bits
             * define a pattern of which pixels in the outline are rendered and which are suppressed. Each bit
             * corresponds to a pixel in the shape's outline, and the pattern repeats after every n*16 pixels, where
             * n is the [stipple factor]{@link ShapeAttributes#outlineStippleFactor}. For example, if the outline
             * stipple factor is 3, each bit in the stipple pattern is repeated three times before using the next bit.
             * <p>
             * To disable outline stippling, either specify a stipple factor of 0 or specify a stipple pattern of
             * all 1 bits, i.e., 0xFFFF.
             * @memberof ShapeAttributes.prototype
             * @type {number}
             * @default 0xF0F0
             */
            outlineStipplePattern: {
                get: function () {
                    return this._outlineStipplePattern;
                },
                set: function (value) {
                    this._outlineStipplePattern = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the associated shape's image source, a URL string. May be null, in which case no image is
             * applied to the shape.
             * @memberof ShapeAttributes.prototype
             * @type {String}
             * @default null
             */
            imageSource: {
                get: function () {
                    return this._imageSource;
                },
                set: function (value) {
                    this._imageSource = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the associated shape's image scale, the amount to scale the shape's image dimensions.
             * @memberof ShapeAttributes.prototype
             * @type {number}
             * @default 1.0
             */
            imageScale: {
                get: function () {
                    return this._imageScale;
                },
                set: function (value) {
                    this._imageScale = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates the reference point within the associated shape's image at which to locate the image on the
             * shape. That reference point is placed at the reference point of the shape. See the
             * specific shape for a description of the shape's reference point. May be null to indicate that the
             * image's bottom left corner is placed at the shape's reference point.
             * @memberof ShapeAttributes.prototype
             * @type {null}
             */
            imageOffset: {
                get: function () {
                    return this._imageOffset;
                },
                set: function (value) {
                    this._imageOffset = value;
                    this.notifyListeners();
                }
            },

            /**
             * Indicates whether the shape should be depth-tested against other objects in the scene. If true,
             * the shape may be occluded by terrain and other objects in certain viewing situations. If false,
             * the shape will not be occluded by terrain and other objects.
             * @memberof ShapeAttributes.prototype
             * @type {boolean}
             * @default true
             */
            depthTest: {
                get: function () {
                    return this._depthTest;
                },
                set: function (value) {
                    this._depthTest = value;
                    this.notifyListeners();
                }
            }
        });

        return ShapeAttributes;
    });