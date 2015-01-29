/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports UserFacingText
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Color',
        '../render/DrawContext',
        '../util/Font',
        '../util/Logger',
        '../geom/Matrix',
        '../error/NotYetImplementedError',
        '../geom/Rectangle',
        '../render/Renderable',
        '../geom/Vec3'
    ],
    function (ArgumentError,
              Color,
              DrawContext,
              Font,
              Logger,
              Matrix,
              NotYetImplementedError,
              Rectangle,
              Renderable,
              Vec3) {
        "use strict";

        /**
         * Constructs user facing text that enables text to be placed at a geographical position.
         * @param {Position} position The position for the text.
         * @param {string} text The text to be displayed.
         * @param {Font} (optional) A font descriptor.
         * @alias UserFacingText
         * @constructor
         * @augments {Renderable}
         * @classdesc Provides a mechanism for placing a text at a geographical position.
         */
        var UserFacingText = function(text, position, font) {
            if (!text) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "UserFacingText", "constructor",
                    "missingText"));
            }
            if (!position) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "UserFacingText", "constructor",
                    "missingPosition"));
            }

            Renderable.call(this);

            this.text = text;
            this.position = position;
            this.font = font || new Font(32);

            this.point = new Vec3(0, 0, 0);

            this.bounds = new Rectangle(0, 0, 0, 0);
        };

        UserFacingText.prototype = Object.create(Renderable.prototype);
    
        UserFacingText.prototype.render = function(dc) {
            if (!this.enabled) {
                return;
            }

            this.point = dc.globe.computePointFromPosition(this.position.latitude,
                this.position.longitude,
                this.position.altitude,
                this.point);

            dc.textRenderer.render(dc, this.point, this.text, this.font, 1, false, this.bounds);
        };

        return UserFacingText;
});