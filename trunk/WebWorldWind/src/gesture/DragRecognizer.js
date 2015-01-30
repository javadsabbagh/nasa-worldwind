/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports DragRecognizer
 * @version $Id$
 */
define([
        '../gesture/GestureRecognizer',
        '../geom/Vec2'
    ],
    function (GestureRecognizer,
              Vec2) {
        "use strict";

        /**
         * Constructs a drag gesture recognizer.
         * @alias DragRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for mouse drag gestures.
         */
        var DragRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {number}
             */
            this.buttons = 1;

            /**
             * The gesture's translation in the window's coordinate system. This indicates the translation of the
             * cursor since the first button was pressed.
             * @type {Vec2}
             */
            this.translation = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.threshold = 10;
        };

        DragRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        /**
         * @protected
         */
        DragRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.translation.set(0, 0);
        };

        /**
         *
         * @param event
         * @protected
         */
        DragRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            var buttonBit = (1 << event.button);
            if (buttonBit == this.buttonMask) { // first button down
                this.translation.set(0, 0);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        DragRecognizer.prototype.mouseMove = function (event) {
            GestureRecognizer.prototype.mouseMove.call(this, event);

            this.translation.copy(this.clientLocation);
            this.translation.subtract(this.clientStartLocation);

            if (this.state == WorldWind.POSSIBLE) {
                if (this.shouldInterpret()) {
                    if (this.shouldRecognize()) {
                        this.transitionToState(WorldWind.BEGAN);
                    } else {
                        this.transitionToState(WorldWind.FAILED);
                    }
                }
            } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                this.transitionToState(WorldWind.CHANGED);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        DragRecognizer.prototype.mouseUp = function (event) {
            GestureRecognizer.prototype.mouseUp.call(this, event);

            if (this.buttonMask == 0) { // last button up
                if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.transitionToState(WorldWind.ENDED);
                }
            }
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        DragRecognizer.prototype.shouldInterpret = function () {
            var distance = this.translation.magnitude();
            return distance > this.threshold; // interpret mouse movement when the cursor moves far enough
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        DragRecognizer.prototype.shouldRecognize = function () {
            var buttonMask = this.buttonMask;
            return buttonMask != 0 && buttonMask == this.buttons;
        };

        /**
         *
         * @param event
         */
        DragRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED); // drag does not recognize touch input
            }
        };

        return DragRecognizer;
    });
