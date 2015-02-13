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
             * The gesture's translation in the window's coordinate system. This indicates the cursor's absolute
             * translation since the gesture was recognized.
             * @type {Vec2}
             */
            this.translation = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.gestureBeginLocation = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.threshold = 5;

            // Internal use only. Intentionally not documented.
            this.weight = 0.5;
        };

        DragRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        /**
         * @protected
         */
        DragRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.translation.set(0, 0);
            this.gestureBeginLocation.set(0, 0);
        };

        /**
         *
         * @param event
         * @protected
         */
        DragRecognizer.prototype.mouseMove = function (event) {
            GestureRecognizer.prototype.mouseMove.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                if (this.shouldInterpret()) {
                    if (this.shouldRecognize()) {
                        this.gestureBegan();
                        this.transitionToState(WorldWind.BEGAN);
                    } else {
                        this.transitionToState(WorldWind.FAILED);
                    }
                }
            } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                this.gestureChanged();
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
            var distance = this.clientLocation.distanceTo(this.clientStartLocation);
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
         * @protected
         */
        DragRecognizer.prototype.gestureBegan = function () {
            this.gestureBeginLocation.copy(this.clientLocation);
        };

        /**
         * @protected
         */
        DragRecognizer.prototype.gestureChanged = function () {
            var dx = this.clientLocation[0] - this.gestureBeginLocation[0],
                dy = this.clientLocation[1] - this.gestureBeginLocation[1],
                w = this.weight;

            this.translation[0] = this.translation[0] * (1 - w) + dx * w;
            this.translation[1] = this.translation[1] * (1 - w) + dy * w;
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
