/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports DragGestureRecognizer
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
         * @alias DragGestureRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for mouse drag gestures.
         */
        var DragGestureRecognizer = function (target) {
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

        DragGestureRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        /**
         * @protected
         */
        DragGestureRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.translation.set(0, 0);
        };

        /**
         *
         * @param event
         * @protected
         */
        DragGestureRecognizer.prototype.mouseDown = function (event) {
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
        DragGestureRecognizer.prototype.mouseMove = function (event) {
            GestureRecognizer.prototype.mouseMove.call(this, event);

            this.translation.copy(this.clientLocation);
            this.translation.subtract(this.clientStartLocation);

            if (this.state == GestureRecognizer.POSSIBLE) {
                if (this.shouldInterpret()) {
                    if (this.shouldRecognize()) {
                        this.transitionToState(GestureRecognizer.BEGAN);
                    } else {
                        this.transitionToState(GestureRecognizer.FAILED);
                    }
                }
            } else if (this.state == GestureRecognizer.BEGAN || this.state == GestureRecognizer.CHANGED) {
                this.transitionToState(GestureRecognizer.CHANGED);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        DragGestureRecognizer.prototype.mouseUp = function (event) {
            GestureRecognizer.prototype.mouseUp.call(this, event);

            if (this.buttonMask == 0) { // last button up
                if (this.state == GestureRecognizer.BEGAN || this.state == GestureRecognizer.CHANGED) {
                    this.transitionToState(GestureRecognizer.ENDED);
                }
            }
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        DragGestureRecognizer.prototype.shouldInterpret = function () {
            var distance = this.translation.magnitude();
            return distance > this.threshold; // interpret mouse movement when the cursor moves far enough
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        DragGestureRecognizer.prototype.shouldRecognize = function () {
            var buttonMask = this.buttonMask;
            return buttonMask != 0 && buttonMask == this.buttons;
        };

        /**
         *
         * @param event
         */
        DragGestureRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.state == GestureRecognizer.POSSIBLE) {
                this.transitionToState(GestureRecognizer.FAILED); // drag does not recognize touch input
            }
        };

        return DragGestureRecognizer;
    });
