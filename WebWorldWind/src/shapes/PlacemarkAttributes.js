/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports PlacemarkAttributes
 * @version $Id$
 */
define([
        '../util/Color',
        '../util/Font',
        '../util/Offset',
        '../shapes/ShapeAttributes',
        '../shapes/TextAttributes'
    ],
    function (Color,
              Font,
              Offset,
              ShapeAttributes,
              TextAttributes) {
        "use strict";

        /**
         * Constructs a placemark attributes bundle.
         * The defaults indicate a placemark displayed as a white 1x1 pixel square centered on the placemark's
         * geographic position.
         * @alias PlacemarkAttributes
         * @constructor
         * @classdesc Holds attributes applied to [Placemark]{@link Placemark} shapes.
         *
         * @param {PlacemarkAttributes} attributes Attributes to initialize this attributes instance to. May be null,
         * in which case the new instance contains default attributes.
         */
        var PlacemarkAttributes = function (attributes) {

            /**
             * The image color.
             * When this attribute bundle has a valid image path the placemark's image is multiplied by this image
             * color to achieve the final placemark color. Otherwise the placemark is drawn in this color. The color
             * white, the default, causes the image to be drawn in its native colors.
             * @type {Color}
             * @default White (1, 1, 1, 1)
             */
            this.imageColor = (attributes && attributes.imageColor) ? attributes.imageColor : new Color(1, 1, 1, 1);

            /**
             * Indicates the location within the placemark's image to align with the placemark's geographic position.
             * May be null, in which case the image's bottom-left corner is placed at the geographic position.
             * @type {Offset}
             * @default 0.5, 0.5, both fractional (Centers the image on the geographic position.)
             */
            this.imageOffset = (attributes && attributes.imageOffset) ? attributes.imageOffset
                : new Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);

            /**
             * Indicates the amount to scale the placemark's image.
             * When this attribute bundle has a valid image path the scale is applied to the image's dimensions. Otherwise, the
             * scale indicates the dimensions in pixels of a square drawn at the point placemark's geographic position.
             * A scale of 0 causes the placemark to disappear; however, the placemark's label, if any, is still drawn.
             * @type {Number}
             * @default 1
             */
            this.imageScale = attributes ? attributes.imageScale : 1;

            /**
             * The URL of the placemark's image.
             * @type {String}
             * @default null
             */
            this.imagePath = attributes ? attributes.imagePath : null;

            /**
             * Indicates whether the placemark should be depth-tested against other objects in the scene. If true,
             * the placemark may be occluded by terrain and other objects in certain viewing situations. If false,
             * the placemark will not be occluded by terrain and other objects. If this value is true, the placemark's
             * label, if any, has an independent depth-testing control.
             * See [TextAttributes.depthTest]{@link TextAttributes#depthTest}.
             * @type {boolean}
             * @default
             */
            this.depthTest = attributes ? attributes.depthTest : true;

            /**
             * Indicates the attributes to apply to the placemark's label, if any. If null, the placemark's label is
             * not drawn.
             * @type {TextAttributes}
             * @default The defaults of TextAttributes.
             */
            this.labelAttributes = attributes ? attributes.labelAttributes : new TextAttributes(null);

            /**
             * Indicates whether to draw a line from the placemark's geographical position to the ground.
             * @type {boolean}
             * @default false
             */
            this.drawLeaderline = attributes ? attributes.drawLeaderline : false;

            /**
             * The attributes to apply to the leader line.
             * @type {ShapeAttributes}
             * @default See {@link ShapeAttributes}
             */
            this.leaderLineAttributes = attributes ? attributes.leaderLineAttributes : new ShapeAttributes(null);
        };

        return PlacemarkAttributes;
    });