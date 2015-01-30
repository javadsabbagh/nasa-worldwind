/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TapGestureRecognizer
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
         * Constructs a tap gesture recognizer.
         * @alias TapGestureRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for single or multiple taps.
         */
        var TapGestureRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {number}
             */
            this.numberOfTaps = 1;

            /**
             *
             * @type {Number}
             */
            this.numberOfTouches = 1;

            // Internal use only. Intentionally not documented.
            this.threshold = 20;

            // Internal use only. Intentionally not documented.
            this.tapDuration = 500;

            // Internal use only. Intentionally not documented.
            this.tapInterval = 400;

            // Internal use only. Intentionally not documented.
            this.timeout = null;

            // Internal use only. Intentionally not documented.
            this.taps = [];
        };

        TapGestureRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        /**
         * @returns {Vec2}
         */
        TapGestureRecognizer.prototype.location = function () {
            return this.taps.length > 0 ? this.taps[0].location : null;
        };

        /**
         *
         * @param state
         * @protected
         */
        TapGestureRecognizer.prototype.didTransitionToState = function (state) {
            GestureRecognizer.prototype.didTransitionToState.call(this, state);

            var inTerminalState = GestureRecognizer.terminalStates.indexOf(this.state) != -1;
            if (inTerminalState) {
                this.cancelFailAfterDelay();
            }
        };

        /**
         * @protected
         */
        TapGestureRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.cancelFailAfterDelay();
            this.taps = [];
        };

        /**
         *
         * @param event
         * @protected
         */
        TapGestureRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state == GestureRecognizer.POSSIBLE) {
                this.transitionToState(GestureRecognizer.FAILED); // tap does not recognize mouse input
            }
        };

        /**
         *
         * @param event
         */
        TapGestureRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.state != GestureRecognizer.POSSIBLE) {
                return;
            }

            if (this.touchCount() > this.numberOfTouches) {
                this.transitionToState(GestureRecognizer.FAILED);
            } else {
                if (this.touchCount() == event.changedTouches.length) { // first touches down
                    this.tapStart();
                } else {
                    this.tapChange();
                }
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        TapGestureRecognizer.prototype.touchMove = function (event) {
            GestureRecognizer.prototype.touchMove.call(this, event);

            if (this.state != GestureRecognizer.POSSIBLE) {
                return;
            }

            var translation = new Vec2(0, 0);
            translation.copy(this.clientLocation);
            translation.subtract(this.clientStartLocation);
            translation.add(this.touchCentroidShift);

            if (translation.magnitude() > this.threshold) {
                this.transitionToState(GestureRecognizer.FAILED);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        TapGestureRecognizer.prototype.touchEnd = function (event) {
            GestureRecognizer.prototype.touchEnd.call(this, event);

            if (this.state != GestureRecognizer.POSSIBLE) {
                return;
            }

            if (this.touchCount() == 0) { // last touches ended
                this.tapEnd();
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        TapGestureRecognizer.prototype.touchCancel = function (event) {
            GestureRecognizer.prototype.touchCancel.call(this, event);

            if (this.state == GestureRecognizer.POSSIBLE) {
                this.transitionToState(GestureRecognizer.FAILED);
            }
        };

        /**
         *
         */
        TapGestureRecognizer.prototype.tapStart = function () {
            var tap = {
                touchCount: this.touchCount(),
                location: new Vec2(this.clientLocation[0], this.clientLocation[1])
            };

            this.taps.push(tap);
            this.failAfterDelay(this.tapDuration); // fail if the tap takes too long
        };

        /**
         * @protected
         */
        TapGestureRecognizer.prototype.tapChange = function () {
            var tap = this.taps[this.taps.length - 1];
            if (tap.touchCount < this.touchCount()) {
                tap.touchCount = this.touchCount(); // max number of simultaneous touches
                tap.location.copy(this.clientLocation); // touch centroid
            }
        };

        /**
         * @protected
         */
        TapGestureRecognizer.prototype.tapEnd = function () {
            var tapCount = this.taps.length,
                tap = this.taps[tapCount - 1];

            if (tap.touchCount != this.numberOfTouches) {
                this.transitionToState(GestureRecognizer.FAILED);
            } else if (tapCount == this.numberOfTaps) {
                this.transitionToState(GestureRecognizer.RECOGNIZED);
            } else {
                this.failAfterDelay(this.tapInterval); // fail if another tap doesn't start soon enough
            }
        };

        /**
         * @protected
         */
        TapGestureRecognizer.prototype.failAfterDelay = function (delay) {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
            }

            self.timeout = window.setTimeout(function() {
                self.timeout = null;
                self.transitionToState(GestureRecognizer.FAILED);
            }, delay);
        };

        /**
         * @protected
         */
        TapGestureRecognizer.prototype.cancelFailAfterDelay = function () {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
                self.timeout = null;
            }
        };

        return TapGestureRecognizer;
    });
