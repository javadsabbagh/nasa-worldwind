/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Text
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../shaders/BasicTextureProgram',
        '../util/Color',
        '../util/Font',
        '../util/Logger',
        '../geom/Matrix',
        '../pick/PickedObject',
        '../render/Renderable',
        '../shapes/TextAttributes',
        '../geom/Vec2',
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (ArgumentError,
              BasicTextureProgram,
              Color,
              Font,
              Logger,
              Matrix,
              PickedObject,
              Renderable,
              TextAttributes,
              Vec2,
              Vec3,
              WWMath) {
        "use strict";

        /**
         * Constructs a text shape.
         * @alias Text
         * @constructor
         * @augments Renderable
         * @classdesc Represents a string of text displayed at a specified geographic position.
         *
         * @param {Position} position The text's geographic position.
         * @param {String} text The text to display.
         */
        var Text = function (position, text) {
            if (!position) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Text", "constructor", "missingPosition"));
            }

            Renderable.call(this);

            /**
             * The text's attributes. If null and this text is not highlighted, this text is not drawn.
             * @type {TextAttributes}
             * @default see [TextAttributes]{@link TextAttributes}
             */
            this.attributes = new TextAttributes(null);

            /**
             * The attributes used when this text's highlighted flag is true. If null and the
             * highlighted flag is true, this text's normal attributes are used. If they, too, are null, this
             * text is not drawn.
             * @type {TextAttributes}
             * @default null
             */
            this.highlightAttributes = null;

            /**
             * Indicates whether this text uses its highlight attributes rather than its normal attributes.
             * @type {boolean}
             * @default false
             */
            this.highlighted = false;

            /**
             * Indicates whether this text is drawn.
             * @type {boolean}
             * @default true
             */
            this.enabled = true;

            /**
             * This text's geographic position.
             * @type {Position}
             */
            this.position = position;

            /**
             * This placemark's text. If null, no text is drawn.
             * @type {String}
             * @default null
             */
            this.text = text;

            /**
             * This text's altitude mode. May be one of
             * <ul>
             *  <li>[WorldWind.ABSOLUTE]{@link WorldWind#ABSOLUTE}</li>
             *  <li>[WorldWind.RELATIVE_TO_GROUND]{@link WorldWind#RELATIVE_TO_GROUND}</li>
             *  <li>[WorldWind.CLAMP_TO_GROUND]{@link WorldWind#CLAMP_TO_GROUND}</li>
             * </ul>
             * @type WorldWind.ABSOLUTE
             */
            this.altitudeMode = WorldWind.ABSOLUTE;

            /**
             * Indicates the object to return as the <code>userObject</code> of this text when picked. If null,
             * then this text object is returned as the <code>userObject</code>.
             * @type {Object}
             * @default null
             * @see  [PickedObject.userObject]{@link PickedObject#userObject}
             */
            this.pickDelegate = null;

            /**
             * Indicates whether this text has visual priority over other shapes in the scene.
             * @type {boolean}
             * @default false
             */
            this.alwaysOnTop = false;
        };

        Text.prototype = Object.create(Renderable.prototype);

        /**
         * Renders this text. This method is typically not called by applications but is called by
         * [RenderableLayer]{@link RenderableLayer} during rendering. For this shape this method creates and
         * enques an ordered renderable with the draw context and does not actually draw the text.
         * @param {DrawContext} dc The current draw context.
         */
        Text.prototype.render = function (dc) {
        };

        /**
         * Draws this shape as an ordered renderable. Applications do not call this function. It is called by
         * [WorldWindow]{@link WorldWindow} during rendering.
         * @param {DrawContext} dc The current draw context.
         */
        Text.prototype.renderOrdered = function (dc) {
        };

        return Text;
    });