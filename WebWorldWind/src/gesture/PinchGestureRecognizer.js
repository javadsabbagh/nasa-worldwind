/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports PinchGestureRecognizer
 * @version $Id$
 */
define([
        '../gesture/GestureRecognizer'
    ],
    function (GestureRecognizer) {
        "use strict";

        /**
         * Constructs a pinch gesture recognizer.
         * @alias PinchGestureRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for two finger pinch gestures.
         */
        var PinchGestureRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {number}
             */
            this.scale = 1;

            // Internal use only. Intentionally not documented.
            this.scaleOffset = 1;

            // Internal use only. Intentionally not documented.
            this.threshold = 10;

            // Internal use only. Intentionally not documented.
            this.distance = 0;

            // Internal use only. Intentionally not documented.
            this.startDistance = 0;

            // Internal use only. Intentionally not documented.
            this.touchIds = [];
        };

        PinchGestureRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        /**
         * @protected
         */
        PinchGestureRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.scale = 1;
            this.scaleOffset = 1;
            this.distance = 0;
            this.startDistance = 0;
            this.touchIds = [];
        };

        /**
         *
         * @param event
         * @protected
         */
        PinchGestureRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state == GestureRecognizer.POSSIBLE) {
                this.transitionToState(GestureRecognizer.FAILED); // pinch does not recognize mouse input
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        PinchGestureRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.touchIds.length < 2) {
                for (var i = 0; i < event.changedTouches.length && this.touchIds.length < 2; i++) {
                    this.touchIds.push(event.changedTouches.item(i).identifier);
                }

                if (this.touchIds.length == 2) {
                    var index0 = this.indexOfTouch(this.touchIds[0]),
                        index1 = this.indexOfTouch(this.touchIds[1]);
                    this.distance = this.touchDistance(index0, index1);
                    this.startDistance = this.distance;
                    this.scaleOffset = this.scale;
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        PinchGestureRecognizer.prototype.touchMove = function (event) {
            GestureRecognizer.prototype.touchMove.call(this, event);

            if (this.touchIds.length == 2) {
                var index0 = this.indexOfTouch(this.touchIds[0]),
                    index1 = this.indexOfTouch(this.touchIds[1]);
                this.distance = this.touchDistance(index0, index1);
                this.scale = this.computeScale();

                if (this.state == GestureRecognizer.POSSIBLE) {
                    if (this.shouldRecognize()) {
                        this.transitionToState(GestureRecognizer.BEGAN);
                    }
                } else if (this.state == GestureRecognizer.BEGAN || this.state == GestureRecognizer.CHANGED) {
                    this.transitionToState(GestureRecognizer.CHANGED);
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        PinchGestureRecognizer.prototype.touchEndOrCancel = function (event) {
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
                if (this.state == GestureRecognizer.BEGAN || this.state == GestureRecognizer.CHANGED) {
                    this.transitionToState(event.type == "touchend" ?
                        GestureRecognizer.ENDED : GestureRecognizer.CANCELLED);
                }
            }
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        PinchGestureRecognizer.prototype.shouldRecognize = function () {
            return Math.abs(this.distance - this.startDistance) > this.threshold
        };

        /**
         *
         * @param indexA
         * @param indexB
         * @returns {number}
         * @protected
         */
        PinchGestureRecognizer.prototype.touchDistance = function (indexA, indexB) {
            var pointA = this.touches[indexA].clientLocation,
                pointB = this.touches[indexB].clientLocation;
            return pointA.distanceTo(pointB);
        };

        /**
         *
         * @returns {number}
         * @protected
         */
        PinchGestureRecognizer.prototype.computeScale = function() {
            return (this.distance / this.startDistance) * this.scaleOffset;
        };

        return PinchGestureRecognizer;
    });