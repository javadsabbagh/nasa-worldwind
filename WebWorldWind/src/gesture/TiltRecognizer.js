/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TiltRecognizer
 * @version $Id$
 */
define(['../gesture/PanRecognizer'],
    function (PanRecognizer) {
        "use strict";

        /**
         * Constructs a tilt gesture recognizer.
         * @alias TiltRecognizer
         * @constructor
         * @augments PanRecognizer
         * @classdesc A concrete gesture recognizer subclass that looks for two finger tilt gestures.
         * @throws {ArgumentError} If the specified target is null or undefined.
         */
        var TiltRecognizer = function (target) {
            PanRecognizer.call(this, target);

            // Intentionally not documented.
            this.maxTouchDistance = 250;

            // Intentionally not documented.
            this.maxTouchDivergence = 50;
        };

        // Intentionally not documented.
        TiltRecognizer.LEFT = (1 << 0);

        // Intentionally not documented.
        TiltRecognizer.RIGHT = (1 << 1);

        // Intentionally not documented.
        TiltRecognizer.UP = (1 << 2);

        // Intentionally not documented.
        TiltRecognizer.DOWN = (1 << 3);

        TiltRecognizer.prototype = Object.create(PanRecognizer.prototype);

        // Documented in superclass.
        TiltRecognizer.prototype.shouldInterpret = function () {
            for (var i = 0, count = this.touchCount; i < count; i++) {
                var touch = this.touch(i),
                    dx = touch.translationX,
                    dy = touch.translationY,
                    distance = Math.sqrt(dx * dx + dy * dy);
                if (distance > this.interpretDistance) {
                    return true; // interpret touches when any touch moves far enough
                }
            }

            return false;
        };

        // Documented in superclass.
        TiltRecognizer.prototype.shouldRecognize = function () {
            var touchCount = this.touchCount;
            if (touchCount < 2) {
                return false;
            }

            var touch0 = this.touch(0),
                touch1 = this.touch(1),
                dx = touch0.clientX - touch1.clientX,
                dy = touch0.clientY - touch1.clientY,
                distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > this.maxTouchDistance) {
                return false; // touches must be close together
            }

            var tx = touch0.translationX - touch1.translationX,
                ty = touch0.translationY - touch1.translationY,
                divergence = Math.sqrt(tx * tx + ty * ty);
            if (divergence > this.maxTouchDivergence) {
                return false; // touches must be moving in a mostly parallel direction
            }

            var verticalMask = TiltRecognizer.UP | TiltRecognizer.DOWN,
                dirMask0 = this.touchDirection(touch0) & verticalMask,
                dirMask1 = this.touchDirection(touch1) & verticalMask;
            return (dirMask0 & dirMask1) != 0; // touches must move in the same vertical direction
        };

        // Intentionally not documented.
        TiltRecognizer.prototype.touchDirection = function (touch) {
            var dx = touch.translationX,
                dy = touch.translationY,
                dirMask = 0;

            if (Math.abs(dx) > Math.abs(dy)) {
                dirMask |= (dx < 0 ? TiltRecognizer.LEFT : 0);
                dirMask |= (dx > 0 ? TiltRecognizer.RIGHT : 0);
            } else {
                dirMask |= (dy < 0 ? TiltRecognizer.UP : 0);
                dirMask |= (dy > 0 ? TiltRecognizer.DOWN : 0);
            }

            return dirMask;
        };

        return TiltRecognizer;
    });