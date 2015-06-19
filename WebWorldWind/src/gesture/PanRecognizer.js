/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports PanRecognizer
 * @version $Id$
 */
define(['../gesture/GestureRecognizer'],
    function (GestureRecognizer) {
        "use strict";

        /**
         * Constructs a pan gesture recognizer.
         * @alias PanRecognizer
         * @constructor
         * @augments GestureRecognizer
         * @classdesc A concrete gesture recognizer subclass that looks for touch panning gestures.
         * @throws {ArgumentError} If the specified target is null or undefined.
         */
        var PanRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {Number}
             */
            this.minNumberOfTouches = 1;

            /**
             *
             * @type {Number}
             */
            this.maxNumberOfTouches = Number.MAX_VALUE;

            // Intentionally not documented.
            this.interpretDistance = 20;
        };

        PanRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        // Documented in superclass.
        PanRecognizer.prototype.mouseDown = function (event) {
            if (this.state == WorldWind.POSSIBLE) {
                this.state = WorldWind.FAILED; // touch gestures fail upon receiving a mouse event
            }
        };

        // Documented in superclass.
        PanRecognizer.prototype.touchMove = function (touch) {
            if (this.state == WorldWind.POSSIBLE) {
                if (this.shouldInterpret()) {
                    if (this.shouldRecognize()) {
                        this.translationX = 0; // set translation to zero when the pan begins
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
        PanRecognizer.prototype.touchEnd = function (touch) {
            if (this.touchCount == 0) { // last touch ended
                if (this.state == WorldWind.POSSIBLE) {
                    this.state = WorldWind.FAILED;
                } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.state = WorldWind.ENDED;
                }
            }
        };

        // Documented in superclass.
        PanRecognizer.prototype.touchCancel = function (touch) {
            if (this.touchCount == 0) { // last touch cancelled
                if (this.state == WorldWind.POSSIBLE) {
                    this.state = WorldWind.FAILED;
                } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.state = WorldWind.CANCELLED;
                }
            }
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PanRecognizer.prototype.shouldInterpret = function () {
            var dx = this.translationX,
                dy = this.translationY,
                distance = Math.sqrt(dx * dx + dy * dy);
            return distance > this.interpretDistance; // interpret touches when the touch centroid moves far enough
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PanRecognizer.prototype.shouldRecognize = function () {
            var touchCount = this.touchCount;
            return touchCount != 0
                && touchCount >= this.minNumberOfTouches
                && touchCount <= this.maxNumberOfTouches
        };

        return PanRecognizer;
    });
