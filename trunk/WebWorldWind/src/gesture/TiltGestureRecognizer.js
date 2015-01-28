/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TiltGestureRecognizer
 * @version $Id$
 */
define([
        '../gesture/GestureRecognizer',
        '../gesture/PanGestureRecognizer'
    ],
    function (GestureRecognizer,
              PanGestureRecognizer) {
        "use strict";

        /**
         * Constructs a tilt gesture recognizer.
         * @alias TiltGestureRecognizer
         * @constructor
         * @classdesc A concrete gesture recognizer subclass that looks for two finger tilt gestures.
         */
        var TiltGestureRecognizer = function (target) {
            PanGestureRecognizer.call(this, target);

            // Internal use only. Intentionally not documented.
            this.maximumTouchDistance = 250;

            // Internal use only. Intentionally not documented.
            this.maximumTouchDivergence = 50;
        };

        // Internal use only. Intentionally not documented.
        TiltGestureRecognizer.LEFT = (1 << 0);

        // Internal use only. Intentionally not documented.
        TiltGestureRecognizer.RIGHT = (1 << 1);

        // Internal use only. Intentionally not documented.
        TiltGestureRecognizer.UP = (1 << 2);

        // Internal use only. Intentionally not documented.
        TiltGestureRecognizer.DOWN = (1 << 3);

        TiltGestureRecognizer.prototype = Object.create(PanGestureRecognizer.prototype);

        /**
         *
         * @returns {boolean}
         * @protected
         */
        TiltGestureRecognizer.prototype.shouldInterpret = function () {
            for (var i = 0, count = this.touches.length; i < count; i++) {
                var entry = this.touches[i],
                    distance = entry.clientLocation.distanceTo(entry.clientStartLocation);
                if (distance > this.threshold) {
                    return true; // interpret touches when any touch moves far enough
                }
            }

            return false;
        };

        /**
         *
         * @returns {boolean}
         * @protected
         */
        TiltGestureRecognizer.prototype.shouldRecognize = function () {
            var touchCount = this.touchCount();
            if (touchCount != 2) {
                return false;
            }

            var touch0 = this.touches[0],
                touch1 = this.touches[1],
                distance = touch0.clientLocation.distanceTo(touch1.clientLocation),
                startDistance = touch0.clientStartLocation.distanceTo(touch1.clientStartLocation),
                divergence = Math.abs(distance - startDistance);
            if (startDistance > this.maximumTouchDistance || divergence > this.maximumTouchDivergence) {
                return false; // touches must be close together and be moving somewhat parallel
            }

            var verticalMask = TiltGestureRecognizer.UP | TiltGestureRecognizer.DOWN,
                dirMask0 = this.touchDirection(touch0) & verticalMask,
                dirMask1 = this.touchDirection(touch1) & verticalMask;
            return (dirMask0 & dirMask1) != 0; // touches must move in the same vertical direction
        };

        /**
         *
         * @param touch
         * @returns {number}
         * @protected
         */
        TiltGestureRecognizer.prototype.touchDirection = function (touch) {
            var dx = touch.clientLocation[0] - touch.clientStartLocation[0],
                dy = touch.clientLocation[1] - touch.clientStartLocation[1],
                dirMask = 0;

            if (Math.abs(dx) > Math.abs(dy)) {
                dirMask |= (dx < 0 ? TiltGestureRecognizer.LEFT : 0);
                dirMask |= (dx > 0 ? TiltGestureRecognizer.RIGHT : 0);
            } else {
                dirMask |= (dy < 0 ? TiltGestureRecognizer.UP : 0);
                dirMask |= (dy > 0 ? TiltGestureRecognizer.DOWN : 0);
            }

            return dirMask;
        };

        return TiltGestureRecognizer;
    });