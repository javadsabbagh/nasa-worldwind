/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports FrameStatistics
 * @version $Id$
 */
define([],
    function () {
        "use strict";

        /**
         * Constructs a performance statistics instance. This is performed internally by the {@link WorldWindow}.
         * Applications do not construct instances of this class.
         * @alias FrameStatistics
         * @constructor
         * @classdesc Captures performance statistics.
         */
        var FrameStatistics = function () {

            // Internal: intentionally not documented
            this.frameCount = 0;

            // Internal: intentionally not documented
            this.frameTimeCumulative = 0;

            // Internal: intentionally not documented
            this.frameTimeBase = 0;

            /**
             * The number of milliseconds requires to render the most recent frame.
             * @type {number}
             */
            this.frameTime = 0;

            /**
             * The number of milliseconds spent tessellating the terrain during the most recent frame.
             * @type {number}
             */
            this.tessellationTime = 0;

            /**
             * The number of milliseconds spent rendering the active layers during the most recent frame.
             * @type {number}
             */
            this.layerRenderingTime = 0;

            /**
             * The number of milliseconds spent rendering ordered renderables during the most recent frame.
             * @type {number}
             */
            this.orderedRenderingTime = 0;

            /**
             * The number of terrain tiles in the most recent frame.
             * @type {number}
             */
            this.terrainTileCount = 0;

            /**
             * The number of image tiles in the most recent frame.
             * @type {number}
             */
            this.imageTileCount = 0;

            /**
             * The number of terrain tile renderings. Since terrain tiles are generally rendered more than once per,
             * this count will be greater than the number of terrain tiles created for the frame.
             * @type {number}
             */
            this.renderedTileCount = 0;

            /**
             * The number of calls to [Tile.update()]{@link Tile#update} during the most recent frame.
             * @type {number}
             */
            this.tileUpdateCount = 0;

            /**
             * The number of texture bind calls during the most recent frame.
             * @type {number}
             */
            this.textureLoadCount = 0;

            /**
             * The number of WebGL VBO loads during the most recent frame.
             * @type {number}
             */
            this.vboLoadCount = 0;

            /**
             * The average frame time over the most recent two seconds.
             * @type {number}
             */
            this.frameTimeAverage = 0;

            /**
             * The average frame rate over the most recent two seconds.
             * @type {number}
             */
            this.frameRateAverage = 0;
        };

        /**
         * Initializes this frame statistics with initial values.
         */
        FrameStatistics.prototype.beginFrame = function () {
            this.frameTime = Date.now();
            this.tessellationTime = 0;
            this.layerRenderingTime = 0;
            this.orderedRenderingTime = 0;
            this.terrainTileCount = 0;
            this.imageTileCount = 0;
            this.renderedTileCount = 0;
            this.tileUpdateCount = 0;
            this.textureLoadCount = 0;
            this.vboLoadCount = 0;

            ++this.frameCount;
        };

        /**
         * Computes the statistics for the most recent frame.
         */
        FrameStatistics.prototype.endFrame = function () {
            var now = Date.now();
            this.frameTime = now - this.frameTime;
            this.frameTimeCumulative += this.frameTime;

            // Compute averages every 2 seconds.
            if (now - this.frameTimeBase > 2000) {
                this.frameTimeAverage = this.frameTimeCumulative / this.frameCount;
                this.frameRateAverage = 1000 * this.frameCount / (now - this.frameTimeBase);
                this.frameTimeBase = now;
                this.frameTimeCumulative = 0;
                this.frameCount = 0;
                //console.log(this.frameTimeAverage.toString() + ", " + this.frameRateAverage.toString());
            }
        };

        /**
         * Increments the rendered tile count.
         * @param {number} tileCount The amount to increment the counter.
         */
        FrameStatistics.prototype.incrementRenderedTileCount = function (tileCount) {
            this.renderedTileCount += tileCount;
        };

        /**
         * Sets the terrain tile count.
         * @param {number} tileCount The amount to set the counter to.
         */
        FrameStatistics.prototype.setTerrainTileCount = function (tileCount) {
            this.terrainTileCount = tileCount;
        };

        /**
         * Increments the image tile count.
         * @param {number} tileCount The amount to increment the counter.
         */
        FrameStatistics.prototype.incrementImageTileCount = function (tileCount) {
            this.imageTileCount = tileCount;
        };

        /**
         * Increments the tile update count.
         * @param {number} count The amount to increment the counter.
         */
        FrameStatistics.prototype.incrementTileUpdateCount = function (count) {
            this.tileUpdateCount += count;
        };

        /**
         * Increments the texture load count.
         * @param {number} count The amount to increment the counter.
         */
        FrameStatistics.prototype.incrementTextureLoadCount = function (count) {
            this.textureLoadCount += count;
        };

        /**
         * Increments the VBO load count.
         * @param {number} count The amount to increment the counter.
         */
        FrameStatistics.prototype.incrementVboLoadCount = function (count) {
            this.vboLoadCount += count;
        };

        return FrameStatistics;
    });