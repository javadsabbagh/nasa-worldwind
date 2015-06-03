/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ClickRecognizer
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
         * Constructs a click gesture recognizer.
         * @alias ClickRecognizer
         * @constructor
         * @augments GestureRecognizer
         * @classdesc A concrete gesture recognizer subclass that looks for single or multiple clicks.
         */
        var ClickRecognizer = function (target) {
            GestureRecognizer.call(this, target);

            /**
             *
             * @type {number}
             */
            this.numberOfClicks = 1;

            /**
             *
             * @type {Number}
             */
            this.button = 0;

            // Internal use only. Intentionally not documented.
            this.threshold = 5;

            // Internal use only. Intentionally not documented.
            this.clickDuration = 500;

            // Internal use only. Intentionally not documented.
            this.clickInterval = 400;

            // Internal use only. Intentionally not documented.
            this.timeout = null;

            // Internal use only. Intentionally not documented.
            this.clicks = [];
        };

        ClickRecognizer.prototype = Object.create(GestureRecognizer.prototype);

        Object.defineProperties(ClickRecognizer.prototype, {
            /**
             * Returns the X coordinate of this recognizer's click location.
             * @type {Number}
             * @memberof ClickRecognizer.prototype
             */
            clientX: {
                get: function () {
                    return this.clicks[0].location[0];
                }
            },

            /**
             * Returns the Y coordinate of this recognizer's click location.
             * @type {Number}
             * @memberof ClickRecognizer.prototype
             */
            clientY: {
                get: function () {
                    return this.clicks[0].location[1];
                }
            }
        });

        /**
         * @returns {Vec2}
         */
        ClickRecognizer.prototype.location = function () {
            return this.clicks.length > 0 ? this.clicks[0].location : null;
        };

        /**
         *
         * @param state
         * @protected
         */
        ClickRecognizer.prototype.didTransitionToState = function (state) {
            GestureRecognizer.prototype.didTransitionToState.call(this, state);

            var inTerminalState = GestureRecognizer.terminalStates.indexOf(this.state) != -1;
            if (inTerminalState) {
                this.cancelFailAfterDelay();
            }
        };

        /**
         * @protected
         */
        ClickRecognizer.prototype.reset = function () {
            GestureRecognizer.prototype.reset.call(this);

            this.cancelFailAfterDelay();
            this.clicks = [];
        };

        /**
         *
         * @param event
         * @protected
         */
        ClickRecognizer.prototype.mouseDown = function (event) {
            GestureRecognizer.prototype.mouseDown.call(this, event);

            if (this.state != WorldWind.POSSIBLE) {
                return;
            }

            if (this.button != event.button) {
                this.transitionToState(WorldWind.FAILED);
            } else {
                this.clickStart();
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        ClickRecognizer.prototype.mouseMove = function (event) {
            GestureRecognizer.prototype.mouseMove.call(this, event);

            if (this.state != WorldWind.POSSIBLE) {
                return;
            }

            var distance = this.clientLocation.distanceTo(this.clientStartLocation);
            if (distance > this.threshold) {
                this.transitionToState(WorldWind.FAILED);
            }
        };

        /**
         *
         * @param event
         * @protected
         */
        ClickRecognizer.prototype.mouseUp = function (event) {
            GestureRecognizer.prototype.mouseUp.call(this, event);

            if (this.state != WorldWind.POSSIBLE) {
                return;
            }

            this.clickEnd();
        };

        /**
         *
         * @param event
         * @protected
         */
        ClickRecognizer.prototype.touchStart = function (event) {
            GestureRecognizer.prototype.touchStart.call(this, event);

            if (this.state == WorldWind.POSSIBLE) {
                this.transitionToState(WorldWind.FAILED); // click does not recognize touch input
            }
        };

        /**
         *
         */
        ClickRecognizer.prototype.clickStart = function () {
            var click = {
                location: new Vec2(this.clientLocation[0], this.clientLocation[1])
            };

            this.clicks.push(click);
            this.failAfterDelay(this.clickDuration); // fail if the click takes too long
        };

        /**
         * @protected
         */
        ClickRecognizer.prototype.clickEnd = function () {
            var clickCount = this.clicks.length;
            if (clickCount == this.numberOfClicks) {
                this.transitionToState(WorldWind.RECOGNIZED);
            } else {
                this.failAfterDelay(this.clickInterval); // fail if another click doesn't start soon enough
            }
        };

        /**
         * @protected
         */
        ClickRecognizer.prototype.failAfterDelay = function (delay) {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
            }

            self.timeout = window.setTimeout(function () {
                self.timeout = null;
                self.transitionToState(WorldWind.FAILED);
            }, delay);
        };

        /**
         * @protected
         */
        ClickRecognizer.prototype.cancelFailAfterDelay = function () {
            var self = this;
            if (self.timeout) {
                window.clearTimeout(self.timeout);
                self.timeout = null;
            }
        };

        return ClickRecognizer;
    });
