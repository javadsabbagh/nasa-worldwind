/*
 * Copyright (C) 2015 United States Government as represented by the Administrator of the
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
            /**
             * The font size.
             * @memberof Font
             */
            size: {
                get: function() {
                    return this._size;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._size = value;
                }
            },
            /**
             * The font style (e.g., normal, bold, italic).
             * @memberof Font
             */
            style: {
                get: function() {
                    return this._style;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._style = value;
                }
            },
            /**
             * The font variant (e.g., normal, small caps).
             * @memberof Font
             */
            variant: {
                get: function() {
                    return this._variant;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._variant = value;
                }
            },
            /**
             * The font weight (e.g., normal, bold, 100..900).
             * @memberof Font
             */
            weight: {
                get: function() {
                    return this._weight;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._weight = value;
                }
            },
            /**
             * The font face family (e.g., serif, sans-serif, monospace, cursive, fantasy).
             * @memberof Font
             */
            family: {
                get: function() {
                    return this._family;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._family = value;
                }
            },
            /**
             * The color of the font.
             * @memberof Font
             */
            color: {
                get: function() {
                    return this._color;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._color = value;
                }
            },
            /**
             * The background color of the font.
             * @memberof Font
             */
            backgroundColor: {
                get: function() {
                    return this._backgroundColor;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._backgroundColor = value;
                }
            },
            /**
             * The horizontal alignment of the font (e.g., left, center, right).
             * @memberof Font
             */
            horizontalAlignment: {
                get: function() {
                    return this._horizontalAlignment;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._horizontalAlignment = value;
                }
            },
            /**
             * The vertical alignment of the font (e.g., top, middle, bottom).
             * @memberof Font
             */
            verticalAlignment: {
                get: function() {
                    return this._verticalAlignment;
                },
                set: function(value) {
                    this._hashKey = null;
                    this._verticalAlignment = value;
                }
            },
            /**
             * The hash key for the font. It is lazily computed to captured the most recent font properties.
             * @memberof Font
             */
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

        /**
         * The set of supported font styles.
         * @type {{default: string, normal: string, italic: string, oblique: string}}
         */
        Font.styles = {
            'default': "normal",
            'normal': "normal",
            'italic': "italic",
            'oblique': "oblique"
        };

        /**
         * The set of supported font variants.
         * @type {{default: string, normal: string, small-caps: string}}
         */
        Font.variants = {
            'default': "normal",
            'normal': "normal",
            'small-caps': "small-caps"
        };

        /**
         * The set of supported font weights.
         * @type {{default: string, normal: string, bold: string, 100: string, 200: string, 300: string, 400: string, 500: string, 600: string, 700: string, 800: string, 900: string}}
         */
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

        /**
         * The set of supported font families.
         * @type {{default: string, monospace: string, serif: string, sans_serif: string, sans-serif: string, cursive: string, fantasy: string}}
         */
        Font.families = {
            'default': "monospace",
            'monospace': "monospace",
            'serif': "serif",
            'sans_serif': "sans-serif", // '-' is not a valid character in a variable name.
            'sans-serif': "sans-serif", // But you can still access it as a property.
            'cursive': "cursive",
            'fantasy': "fantasy"
        };

        /**
         * The set of supported font horizontal alignments.
         * @type {{default: string, start: string, left: string, center: string, right: string, end: string}}
         */
        Font.horizontalAlignments = {
            'default': "left",
            'start': "start",
            'left': "left",
            'center': "center",
            'right': "right",
            'end': "end"
        };

        /**
         * The set of supported font vertical alignments.
         * @type {{default: string, bottom: string, alphabetic: string, middle: string, hanging: string, top: string}}
         */
        Font.verticalAlignments = {
            'default': "alphabetic",
            'bottom': "bottom",
            'alphabetic': "alphabetic",
            'middle': "middle",
            'hanging': "hanging",
            'top': "top"
        };

        return Font;
    }
);