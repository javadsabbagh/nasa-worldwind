/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Font
 * @version $Id: Font.js 2660 2015-01-20 19:20:11Z danm $
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
         * Construct a font descriptor.
         * Parameters are based on CSS parameters that HTML uses.
         * @param {number} size The size of font.
         * @param {string} style The style of the font.
         * @param {string} variant The variant of the font.
         * @param {number} weight The weight of the font.
         * @param {string} family The family of the font.
         * @param {Color} color The color of the font.
         * @param {Color} backgroundColor The background color of the font.
         * @param {string} horizontalAlignment The vertical alignment of the font.
         * @param {string} verticalAlignment The horizontal alignment of the font.
         * @alias Font
         * @constructor
         * @classdesc A font descriptor.
         */
        var Font = function(size, style, variant, weight, family, color, backgroundColor, horizontalAlignment, verticalAlignment) {
            /*
             * All properties of Font are intended to be private and must be accessed via public getters and setters.
             */

            if (!size) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Font", "constructor",
                    "missingSize"));
            }
            else if (size <= 0) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "Font", "constructor",
                    "invalidSize"));
            }
            else {
                this._size = size;
            }

            this.style = style || Font.styles.default;
            this.variant = variant || Font.variants.default;
            this.weight = weight || Font.weights.default;
            this.family = family || Font.families.default;
            this.color = color || Color.WHITE;
            this.backgroundColor = backgroundColor || Color.TRANSPARENT;
            this.horizontalAlignment = horizontalAlignment || Font.horizontalAlignments.default;
            this.verticalAlignment = verticalAlignment || Font.verticalAlignments.default;
        };

        Object.defineProperties(Font.prototype, {
            size: {
                get: function() {
                    return this._size;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._size = value;
                }
            },
            style: {
                get: function() {
                    return this._style;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._style = value;
                }
            },
            variant: {
                get: function() {
                    return this._variant;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._variant = value;
                }
            },
            weight: {
                get: function() {
                    return this._weight;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._weight = value;
                }
            },
            family: {
                get: function() {
                    return this._family;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._family = value;
                }
            },
            color: {
                get: function() {
                    return this._color;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._color = value;
                }
            },
            backgroundColor: {
                get: function() {
                    return this._backgroundColor;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._backgroundColor = value;
                }
            },
            horizontalAlignment: {
                get: function() {
                    return this._horizontalAlignment;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._horizontalAlignment = value;
                }
            },
            verticalAlignment: {
                get: function() {
                    return this._verticalAlignment;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._verticalAlignment = value;
                }
            },
            hashKey: {
                get: function() {
                    // If hash key doesn't exist yet, generate it.
                    if (!this._hashKey) {
                        this._hashKey = "Font:{" +
                            "size:" + this._size.toString() + "," +
                            "style:" + this._style + "," +
                            "variant:" + this._variant + "," +
                            "weight:" + this._weight + "," +
                            "family:" + this._family + "," +
                            "color:" + this._color.toHexString(false) + "," +
                            "backgroundColor:" + this._backgroundColor.toHexString(false) + "," +
                            "horizontalALignment:" + this._horizontalAlignment + "," +
                            "verticalALignment:" + this._verticalAlignment +
                            "}";
                    }
                    return this._hashKey;
                }
            }
        });

        Font.styles = {
            'default': "normal",
            'normal': "normal",
            'italic': "italic",
            'oblique': "oblique"
        };

        Font.variants = {
            'default': "normal",
            'normal': "normal",
            'small-caps': "small-caps"
        };

        Font.weights = {
            'default': "normal",
            'normal': "normal",
            'bold': "bold",
            '100': "100",
            '200': "200",
            '300': "300",
            '400': "400",
            '500': "500",
            '600': "600",
            '700': "700",
            '800': "800",
            '900': "900"
        };

        Font.families = {
            'default': "monospace",
            'serif': "serif",
            'sans_serif': "sans-serif", // '-' is not a valid character in a variable name.
            'sans-serif': "sans-serif", // But you can still access it as a property.
            'cursive': "cursive",
            'fantasy': "fantasy",
            'monospace': "monospace"
        };

        Font.horizontalAlignments = {
            'default': "left",
            'start': "start",
            'left': "left",
            'center': "center",
            'right': "right",
            'end': "end"
        };

        Font.verticalAlignments = {
            'default': 'alphabetic',
            'bottom': "bottom",
            'alphabetic': "alphabetic",
            'middle': "middle",
            'hanging': "hanging",
            'top': "top"
        };

        return Font;
    }
);