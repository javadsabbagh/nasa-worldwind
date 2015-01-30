/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports RotationGestureRecognizer
 * @version $Id$
 */
define([
        '../geom/Angle',
        '../gesture/GestureRecognizer',
        '../geom/Vec2'
    ],
    function (Angle,
              GestureRecognizer,
              Vec2) {
        "use strict";

        /**
         * Constructs a rotation gesture recognizer.
         * @alias RotationGestureRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for two finger rotation gestures.
         */
        var RotationGestureRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {number}
             */
            this.rotation = 0;

            // Internal use only. Intentionally not documented.
            this.rotationOffset = 0;

            // Internal use only. Intentionally not documented.
            this.threshold = 10;

            // Internal use only. Intentionally not documented.
            this.slope = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.beginSlope = new Vec2(0, 0);

            // Internal use only. Intentionally not documented.
            this.touchIds = [];
        };

        RotationGestureRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        /**
         * @protected
         */
        RotationGestureRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.rotation = 0;
            this.rotationOffset = 0;
            this.slope.set(0, 0);
            this.beginSlope.set(0, 0);
            this.touchIds = [];
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationGestureRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED); // rotation does not recognize mouse input
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationGestureRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.touchIds.length < 2) {
                for (var i = 0; i < event.changedTouches.length && this.touchIds.length < 2; i++) {
                    var touch = event.changedTouches.item(i);
                    this.touchIds.push(touch.identifier);
                }

                if (this.touchIds.length == 2) {
                    var index0 = this.indexOfTouch(this.touchIds[0]),
                        index1 = this.indexOfTouch(this.touchIds[1]);
                    this.slope = this.touchSlope(index0, index1);
                    this.beginSlope = this.slope;
                    this.rotationOffset = this.rotation;
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationGestureRecognizer.prototype.touchMove = function (event) {
            GestureRecognizer.prototype.touchMove.call(this, event);

            if (this.touchIds.length == 2) {
                var index0 = this.indexOfTouch(this.touchIds[0]),
                    index1 = this.indexOfTouch(this.touchIds[1]);
                this.slope = this.touchSlope(index0, index1);
                this.rotation = this.computeRotation();

                if (this.state == WorldWind.POSSIBLE) {
                    if (this.shouldRecognize()) {
                        this.transitionToState(WorldWind.BEGAN);
                    }
                } else if (this.state == WorldWind.BEGAN || this.state == WorldWind.CHANGED) {
                    this.transitionToState(WorldWind.CHANGED);
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        RotationGestureRecognizer.prototype.touchEndOrCancel = function (event) {
            GestureRecognizer.prototype.touchEndOrCancel.call(this, event);

            // Remove touch identifier entries for the touches that ended or cancelled.
            for (var i = 0, count = event.changedTouches.length; i < count; i++) {
                var touch = event.changedTouches.item(i),
                    index = this.touchIds.indexOf(touch.identifier);
                if (index != -1) {
                    this.touchIds.splice(index, 1);
                }
            }

            if (event.targetTouches.length == 0) { // last touches ended
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
        RotationGestureRecognizer.prototype.shouldRecognize = function () {
            return Math.abs(this.slope[0] - this.beginSlope[0]) > this.threshold
                || Math.abs(this.slope[1] - this.beginSlope[1]) > this.threshold;
        };

        /**
         *
         * @param indexA
         * @param indexB
         * @returns {number}
         * @protected
         */
        RotationGestureRecognizer.prototype.touchSlope = function (indexA, indexB) {
            var pointA = this.touches[indexA].clientLocation,
                pointB = this.touches[indexB].clientLocation;
            return new Vec2(pointA[0] - pointB[0], pointA[1] - pointB[1]);
        };

        /**
         *
         * @param slope
         * @returns {number}
         * @protected
         */
        RotationGestureRecognizer.prototype.angleForSlope = function (slope) {
            var radians = Math.atan2(slope[1], slope[0]);
            return radians * Angle.RADIANS_TO_DEGREES;
        };

        /**
         *
         * @returns {number}
         * @protected
         */
        RotationGestureRecognizer.prototype.computeRotation = function () {
            var angle = this.angleForSlope(this.slope),
                beginAngle = this.angleForSlope(this.beginSlope),
                rotation = angle - beginAngle + this.rotationOffset;
            return Angle.normalizedDegrees(rotation);
        };

        return RotationGestureRecognizer;
    });
