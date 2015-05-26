/*
 * Copyright (C) 2015 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports FramebufferTileController
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../render/FramebufferTile',
        '../util/LevelSet',
        '../geom/Location',
        '../util/Logger',
        '../cache/MemoryCache',
        '../geom/Sector',
        '../util/Tile'
    ],
    function (ArgumentError,
              FramebufferTile,
              Location,
              LevelSet,
              Logger,
              MemoryCache,
              Sector,
              Tile) {
        "use strict";

        /**
         * Constructs a framebuffer tile controller.
         * @alias FramebufferTileController
         * @constructor
         * @classdesc Provides access to a multi-resolution WebGL framebuffer arranged as adjacent tiles in a pyramid.
         * World Wind shapes use this class internally to draw on the terrain surface. Applications typically do not
         * interact with this class.
         */
        var FramebufferTileController = function () {

            /**
             * The width in pixels of framebuffers associated with this controller's tiles.
             * @type {Number}
             * @readonly
             */
            this.tileWidth = 256;

            /**
             * The height in pixels of framebuffers associated with this controller's tiles.
             * @type {Number}
             * @readonly
             */
            this.tileHeight = 256;

            /**
             * Indicates the relationship of tile resolution to screen resolution as the viewing altitude changes.
             * Values greater than 0 cause tiles to appear at higher resolution at greater altitudes than normal, but at
             * an increased performance cost. Values less than 0 decrease the default resolution at any given altitude.
             * The default value is 0. Values typically range between -0.5 and 0.5.
             * @type {Number}
             */
            this.detailHint = 0;

            // Internal. Intentionally not documented.
            this.levels = new LevelSet(Sector.FULL_SPHERE, new Location(45, 45), 16, this.tileWidth, this.tileHeight);

            // Internal. Intentionally not documented.
            this.topLevelTiles = [];

            // Internal. Intentionally not documented.
            this.currentTiles = [];

            // Internal. Intentionally not documented.
            this.currentGSK = null;

            // Internal. Intentionally not documented.
            this.currentMVP = null;

            // Internal. Intentionally not documented.
            this.tileCache = new MemoryCache(500000, 400000);

            // Internal. Intentionally not documented.
            this.key = "FramebufferTileController " + ++FramebufferTileController.keyPool;

            // Internal. Intentionally not documented.
            this.detailHintOrigin = 2.4;
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.keyPool = 0; // source of unique ids

        /**
         * Returns a set of multi-resolution [FramebufferTile]{@link FramebufferTile} instances appropriate for the
         * current draw context that overlap a specified sector.
         * @param {DrawContext} dc The current draw context.
         * @param {Sector} sector The geographic region of interest.
         * @returns {Array} The set of multi-resolution framebuffer tiles that overlap the sector.
         * @throws {ArgumentError} If the specified sector is null.
         */
        FramebufferTileController.prototype.selectTiles = function (dc, sector) {
            if (!sector) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "FramebufferTileController", "selectTiles",
                    "missingSector"));
            }

            this.assembleTiles(dc);

            var selectedTiles = [];
            for (var i = 0, len = this.currentTiles.length; i < len; i++) {
                var tile = this.currentTiles[i];
                if (tile.sector.overlaps(sector)) {
                    selectedTiles.push(tile);
                }
            }

            return selectedTiles;
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.assembleTiles = function (dc) {
            var gsk = dc.globeStateKey,
                mvp = dc.navigatorState.modelviewProjection;

            if (gsk != this.currentGSK || !mvp.equals(this.currentMVP)) {
                this.doAssembleTiles(dc);
                this.currentGSK = gsk;
                this.currentMVP = mvp;
            }
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.doAssembleTiles = function (dc) {
            this.currentTiles = [];

            if (!dc.terrain) {
                return;
            }

            if (this.topLevelTiles.length == 0) {
                this.createTopLevelTiles();
            }

            for (var i = 0, len = this.topLevelTiles.length; i < len; i++) {
                var tile = this.topLevelTiles[i];

                tile.update(dc);

                if (this.isTileVisible(dc, tile)) {
                    this.addTileOrDescendants(dc, tile);
                }
            }
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.createTile = function (sector, level, row, column) {
            var tileKey = this.key + " " + level.levelNumber + "." + row + "." + column;
            return new FramebufferTile(sector, level, row, column, tileKey);
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.createTopLevelTiles = function () {
            Tile.createTilesForLevel(this.levels.firstLevel(), this, this.topLevelTiles);
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.addTileOrDescendants = function (dc, tile) {
            if (this.tileMeetsRenderingCriteria(dc, tile)) {
                this.addTile(tile);
                return;
            }

            var nextLevel = this.levels.level(tile.level.levelNumber + 1),
                subTiles = tile.subdivideToCache(nextLevel, this, this.tileCache);

            for (var i = 0, len = subTiles.length; i < len; i++) {
                var child = subTiles[i];

                child.update(dc);

                if (this.isTileVisible(dc, child)) {
                    this.addTileOrDescendants(dc, child);
                }
            }
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.addTile = function (tile) {
            this.currentTiles.push(tile);
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.isTileVisible = function (dc, tile) {
            if (dc.globe.projectionLimits && !tile.sector.overlaps(dc.globe.projectionLimits)) {
                return false;
            }

            return tile.extent.intersectsFrustum(dc.navigatorState.frustumInModelCoordinates);
        };

        // Internal. Intentionally not documented.
        FramebufferTileController.prototype.tileMeetsRenderingCriteria = function (dc, tile) {
            var s = this.detailHintOrigin + this.detailHint;
            if (tile.sector.minLatitude >= 75 || tile.sector.maxLatitude <= -75) {
                s *= 0.9;
            }

            return tile.level.isLastLevel() || !tile.mustSubdivide(dc, s);
        };

        return FramebufferTileController;
    });