/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports PanRecognizer
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
         * Constructs a pan gesture recognizer.
         * @alias PanRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for touch panning gestures.
         */
        var PanRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {number}
             */
            this.minimumNumberOfTouches = 1;

            /**
             *
             * @type {Number}
             */
            this.maximumNumberOfTouches = Number.MAX_VALUE;

            /**
             * The gesture's translation in the window's coordinate system. This indicates the translation of the
             * touches since the gesture was recognized.
             * @type {Vec2}
             */
            this.translation = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.gestureBeginLocation = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.threshold = 20;

            // Internal use only. Intentionally not documented.
            this.weight = 0.5;
        };

        PanRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        /**
         * @protected
         */
        PanRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.translation.set(0, 0);
            this.gestureBeginLocation.set(0, 0);
        };

        /**
         *
         * @param event
         * @protected
         */
        PanRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED); // pan does not recognize mouse input
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        PanRecognizer.prototype.touchMove = function (event) {
            GestureRecognizer.prototype.touchMove.call(this, event);

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
        PanRecognizer.prototype.touchEndOrCancel = function (event) {
            GestureRecognizer.prototype.touchEndOrCancel.call(this, event);

            if (event.targetTouches.length == 0) { // last touches cancelled
                if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.transitionToState(event.type == "touchend" ? WorldWind.ENDED : WorldWind.CANCELLED);
                }
            }
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PanRecognizer.prototype.shouldInterpret = function () {
            var dx = this.clientLocation[0] - this.clientStartLocation[0] + this.touchCentroidShift[0],
                dy = this.clientLocation[1] - this.clientStartLocation[1] + this.touchCentroidShift[1],
                distance = Math.sqrt(dx * dx + dy * dy);

            return distance > this.threshold; // interpret touches when the touch centroid moves far enough
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PanRecognizer.prototype.shouldRecognize = function () {
            var touchCount = this.touchCount();
            return touchCount != 0
                && touchCount >= this.minimumNumberOfTouches
                && touchCount <= this.maximumNumberOfTouches
        };

        /**
         * @protected
         */
        PanRecognizer.prototype.gestureBegan = function () {
            this.gestureBeginLocation.copy(this.clientLocation);
        };

        /**
         * @protected
         */
        PanRecognizer.prototype.gestureChanged = function () {
            var dx = this.clientLocation[0] - this.gestureBeginLocation[0] + this.touchCentroidShift[0],
                dy = this.clientLocation[1] - this.gestureBeginLocation[1] + this.touchCentroidShift[1],
                w = this.weight;

            this.translation[0] = this.translation[0] * (1 - w) + dx * w;
            this.translation[1] = this.translation[1] * (1 - w) + dy * w;
        };

        return PanRecognizer;
    });
