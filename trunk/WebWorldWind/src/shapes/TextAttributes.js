/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TextAttributes
 * @version $Id$
 */
define([
        '../util/Color',
        '../util/Font',
        '../util/Offset'
    ],
    function (Color,
              Font,
              Offset) {
        "use strict";

        /**
         * Constructs a text attributes bundle.
         * The defaults indicate white, 14px text centered on the specified geographic position.
         * @alias TextAttributes
         * @constructor
         * @classdesc Holds attributes applied to [Text]{@link Text} shapes and [Placemark]{@link Placemark} labels.
         *
         * @param {TextAttributes} attributes Attributes to initialize this attributes instance to. May be null,
         * in which case the new instance contains default attributes.
         */
        var TextAttributes = function (attributes) {

            /**
             * The text color.
             * @type {Color}
             * @default White (0, 0, 0, 1)
             */
            this.color = (attributes && attributes.color) ? attributes.color : new Color( 1, 1, 1, 1);

            /**
             * The text size, face and other characteristics, as described in [Font]{@link Font}.
             * @type {Font}
             * @default Those of [Font]{@link Font}, but with size of 14px and center justification.
             */
            this.font = (attributes && attributes.font) ? attributes.font : new Font(14);

            /**
             * Indicates the location of the text relative to its geographic position.
             * May be null, in which case the text's bottom-left corner is placed at the geographic position.
             * @type {Offset}
             * @default 0.5, 0.0, both fractional (Places the text's horizontal center and vertical bottom at the
             * geographic position.)
             */
            this.offset = (attributes && attributes.offset) ? attributes.offset
                : new Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.0);

            /**
             * Indicates the amount to scale the text. A value of 0 makes the text disappear.
             * @type {Number}
             * @default 1.0
             */
            this.scale = (attributes && attributes.scale) ? attributes.scale : 1;

            /**
             * Indicates whether the text should be depth-tested against other objects in the scene. If true,
             * the text may be occluded by terrain and other objects in certain viewing situations. If false,
             * the text will not be occluded by terrain and other objects.
             * @type {boolean}
             * @default false
             */
            this.depthTest = false;
        };

        return TextAttributes;
    });