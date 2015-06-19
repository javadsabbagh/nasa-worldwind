/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports DragRecognizer
 * @version $Id$
 */
define(['../gesture/GestureRecognizer'],
    function (GestureRecognizer) {
        "use strict";

        /**
         * Constructs a mouse drag gesture recognizer.
         * @alias DragRecognizer
         * @constructor
         * @augments GestureRecognizer
         * @classdesc A concrete gesture recognizer subclass that looks for mouse drag gestures.
         * @throws {ArgumentError} If the specified target is null or undefined.
         */
        var DragRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {Number}
             */
            this.button = 0;

            // Intentionally not documented.
            this.interpretDistance = 5;
        };

        DragRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        // Documented in superclass.
        DragRecognizer.prototype.mouseMove = function (event) {
            if (this.state == WorldWind.POSSIBLE) {
                if (this.shouldInterpret()) {
                    if (this.shouldRecognize()) {
                        this.translationX = 0; // set translation to zero when the drag begins
                        this.translationY = 0;
                        this.state = WorldWind.BEGAN;
                    } else {
                        this.state = WorldWind.FAILED;
                    }
                }
            } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                this.state = WorldWind.CHANGED;
            }
        };

        // Documented in superclass.
        DragRecognizer.prototype.mouseUp = function (event) {
            if (this.mouseButtonMask == 0) { // last button up
                if (this.state == WorldWind.POSSIBLE) {
                    this.state = WorldWind.FAILED;
                } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.state = WorldWind.ENDED;
                }
            }
        };

        // Documented in superclass.
        DragRecognizer.prototype.touchStart = function (touch) {
            if (this.state == WorldWind.POSSIBLE) {
                this.state = WorldWind.FAILED; // mouse gestures fail upon receiving a touch event
            }
        };

        /**
         *
         * @returns {Boolean}
         * @protected
         */
        DragRecognizer.prototype.shouldInterpret = function () {
            var dx = this.translationX,
                dy = this.translationY,
                distance = Math.sqrt(dx * dx + dy * dy);
            return distance > this.interpretDistance; // interpret mouse movement when the cursor moves far enough
        };

        /**
         *
         * @returns {Boolean}
         * @protected
         */
        DragRecognizer.prototype.shouldRecognize = function () {
            var buttonBit = (1 << this.button);
            return buttonBit == this.mouseButtonMask; // true when the specified button is the only button down
        };

        return DragRecognizer;
    });
