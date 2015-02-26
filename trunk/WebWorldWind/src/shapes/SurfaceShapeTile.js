/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceShapeTile
 * @version $Id$
 */
define([
        '../geom/Angle',
        '../error/ArgumentError',
        '../util/Level',
        '../util/Logger',
        '../geom/Sector',
        '../render/Texture',
        '../render/TextureTile'
    ],
    function (Angle,
              ArgumentError,
              Level,
              Logger,
              Sector,
              Texture,
              TextureTile) {
        "use strict";

        /**
         * Constructs a surface shape tile.
         * @alias SurfaceShapeTile
         * @constructor
         * @classdesc Represents a texture map containing renditions of surface shapes applied to a portion of a globe's terrain.
         * @param {Sector} sector The sector this tile covers.
         * @param {Level} level The level this tile is associated with.
         * @param {number} row This tile's row in the associated level.
         * @param {number} column This tile's column in the associated level.
         * @throws {ArgumentError} If the specified sector or level is null or undefined, the row or column arguments
         * are less than zero, or the specified image path is null, undefined or empty.
         *
         */
        var SurfaceShapeTile = function(sector, level, row, column) {
            TextureTile.call(this, sector, level, row, column); // args are checked in the superclass' constructor

            /**
             * The surface shapes that affect this tile.
             * @type {SurfaceShape[]}
             */
            this.surfaceShapes = [];

            /**
             * The sector that bounds this tile.
             * @type {Sector}
             */
            this.sector = sector;

            /**
             * A collection of sectors that bounds this title, dealing potentially with the crossing of the dateline.
             * @type {Array}
             */
            this.sectors = [];

            /**
             * A string to use as a cache key.
             * @type {string}
             */
            this.cacheKey = null;

            this.createCtx2D();
        };

        SurfaceShapeTile.prototype = Object.create(TextureTile.prototype);

        /**
         * Clear all collected surface shapes.
         */
        SurfaceShapeTile.prototype.clearShapes = function() {
            this.surfaceShapes.splice(0);
        };

        /**
         * Query whether any surface shapes have been collected.
         * @returns {boolean} Returns true if there are collected surface shapes.
         */
        SurfaceShapeTile.prototype.hasShapes = function() {
            return this.surfaceShapes.length > 0;
        };

        /**
         *
         * @returns {SurfaceShape[]} The collection of surface shapes collected by this tile.
         */
        SurfaceShapeTile.prototype.getShapes = function() {
            return this.surfaceShapes;
        };

        /**
         * The sector that bounds this tile.
         * @returns {Sector}
         */
        SurfaceShapeTile.prototype.getSector = function() {
            return this.sector;
        };

        /**
         * Add a surface shape to this tile's collection of surface shapes.
         * @param {SurfaceShape} surfaceShape The surface shape to add.
         */
        SurfaceShapeTile.prototype.addSurfaceShape = function(surfaceShape) {
            this.surfaceShapes.push(surfaceShape);
        };

        /**
         * Add multiple surface shapes to this tile's collection.
         * @param {SurfaceShape[]} shapes A collection of surface shapes to add to the collection of this tile.
         */
        SurfaceShapeTile.prototype.addAllSurfaceShapes = function(shapes) {
            this.surfaceShapes.concat(shapes);
        };

        /**
         * Determine whether the surface shape tile has a valid texture.
         * @param {DrawContext} dc The draw context.
         * @returns {boolean} True if the surface shape tile has a valid texture, else false.
         */
        SurfaceShapeTile.prototype.hasTexture = function(dc) {
            var gpuResourceCache = dc.gpuResourceCache;

            if (!this.gpuCacheKey) {
                this.gpuCacheKey = this.getCacheKey();
            }

            var texture = gpuResourceCache.resourceForKey(this.gpuCacheKey);

            return !texture ? false : true;
        };

        /**
         * Return the texture for rendering this tile. If one does not exist, create a new texture.
         * @param {DrawContext} dc The draw context
         * @returns {Texture} The texture for displaying the tile.
         */
        SurfaceShapeTile.prototype.getTexture = function(dc) {
            var gpuResourceCache = dc.gpuResourceCache;

            if (!this.gpuCacheKey) {
                this.gpuCacheKey = this.getCacheKey();
            }

            var texture = gpuResourceCache.resourceForKey(this.gpuCacheKey);

            if (!texture) {
                texture = this.updateTexture(dc);
            }

            return texture;
        };

        /**
         * Redraw all of the surface shapes onto the texture for this tile.
         * @param {DrawContext} dc
         * @returns {Texture}
         */
        SurfaceShapeTile.prototype.updateTexture = function(dc) {
            var gl = dc.currentGlContext,
                canvas = SurfaceShapeTile.canvas;

            canvas.width = SurfaceShapeTile.textureWidth;
            canvas.height = SurfaceShapeTile.textureHeight;

            var ctx2D = SurfaceShapeTile.ctx2D;

            // Mapping from lat/lon to x/y:
            //  lon = minlon => x = 0
            //  lon = maxLon => x = 256
            //  lat = minLat => y = 256
            //  lat = maxLat => y = 0
            //  (assuming texture size is 256)
            // So:
            //  x = 256 / sector.dlon * (lon - minLon)
            //  y = -256 / sector.dlat * (lat - maxLat)
            var xScale = SurfaceShapeTile.textureWidth / this.sector.deltaLongitude(),
                yScale = -SurfaceShapeTile.textureHeight / this.sector.deltaLatitude(),
                xOffset = -this.sector.minLongitude * xScale,
                yOffset = -this.sector.maxLatitude * yScale;

            ctx2D.setTransform(xScale, 0,
                0, yScale,
                xOffset, yOffset
            );

            var degreesPerMeter = 360 / (2 * Math.PI * dc.globe.equatorialRadius);

            for (var idx = 0, len = this.surfaceShapes.length; idx < len; idx += 1) {
                var shape = this.surfaceShapes[idx];

                shape.renderToTexture(ctx2D, degreesPerMeter);
            }

            var texture = new Texture(gl, canvas);

            var gpuResourceCache = dc.gpuResourceCache;

            this.gpuCacheKey = this.getCacheKey();

            gpuResourceCache.putResource(this.gpuCacheKey, texture, texture.size);

            return texture;
        };

        /**
         * Get a key suitable for cache look-ups.
         * @returns {string}
         */
        SurfaceShapeTile.prototype.getCacheKey = function() {
            if (!this.cacheKey) {
                this.cacheKey = "SurfaceShapeTile:" +
                this.sector.minLatitude.toString() + "," +
                this.sector.minLongitude.toString() + "," +
                this.sector.maxLatitude.toString() + "," +
                this.sector.maxLongitude.toString() + "," +
                this.level.levelNumber.toString() + "," +
                this.row.toString() + "," +
                this.column.toString();
            }

            return this.cacheKey;
        };

        /**
         * Create a new canvas and its 2D context on demand.
         */
        SurfaceShapeTile.prototype.createCtx2D = function() {
            // If the context was previously created, ...
            if (!SurfaceShapeTile.ctx2D) {
                SurfaceShapeTile.canvas = document.createElement("canvas");
                SurfaceShapeTile.ctx2D = SurfaceShapeTile.canvas.getContext("2d");
            }
        };

        //
        /**
         * Default SurfaceShape tile texture width.
         * @type {number}
         */
        SurfaceShapeTile.textureWidth = 256;

        /**
         * Default SurfaceShape tile texture height.
         * @type {number}
         */
        SurfaceShapeTile.textureHeight = 256;

        /*
         * For internal use only.
         * 2D canvas and context, which is created lazily on demand.
         */
        SurfaceShapeTile.canvas = null;
        SurfaceShapeTile.ctx2D = null;

        return SurfaceShapeTile;
    }
);