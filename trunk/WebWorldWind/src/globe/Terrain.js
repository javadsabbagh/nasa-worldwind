/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Terrain
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../geom/Vec3'
    ],
    function (ArgumentError,
              Logger,
              Vec3) {
        "use strict";

        /**
         * Constructs a Terrain object.
         * @alias Terrain
         * @constructor
         * @classdesc Represents terrain and provides functions for computing points on or relative to the terrain.
         */
        var Terrain = function (globe, tessellator, terrainTiles, verticalExaggeration) {

            /**
             * The globe associated with this terrain.
             * @type {Globe}
             */
            this.globe = globe;

            /**
             * The vertical exaggeration of this terrain.
             * @type {Number}
             */
            this.verticalExaggeration = verticalExaggeration;

            /**
             * The sector spanned by this terrain.
             * @type {Sector}
             */
            this.sector = terrainTiles.sector;

            /**
             * The tessellator used to generate this terrain.
             * @type {Tessellator}
             */
            this.tessellator = tessellator;

            /**
             * The surface geometry for this terrain
             * @type {TerrainTile[]}
             */
            this.surfaceGeometry = terrainTiles.tileArray;

            /**
             * A string identifying this terrain's current state. Used to compare states during rendering to
             * determine whether state dependent cached values must be updated. Applications typically do not
             * interact with this property.
             * @readonly
             * @type {String}
             */
            this.stateKey = globe.stateKey + " ve " + verticalExaggeration.toString();
        };

        Terrain.scratchPoint = new Vec3(0, 0, 0);

        /**
         * Computes a Cartesian point at a location on the surface of this terrain.
         * @param {Number} latitude The location's latitude.
         * @param {Number} longitude The location's longitude.
         * @param {Number} offset Distance above the terrain, in meters, at which to compute the point.
         * @param {Vec3} result A pre-allocated Vec3 in which to return the computed point.
         * @returns {Vec3} The specified result parameter, set to the coordinates of the computed point, or null if
         * the specified location is not within this terrain.
         * @throws {ArgumentError} If the specified result argument is null or undefined.
         */
        Terrain.prototype.surfacePoint = function (latitude, longitude, offset, result) {
            if (!result) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Terrain", "surfacePoint", "missingResult"));
            }

            for (var i = 0, len = this.surfaceGeometry.length; i < len; i++) {
                if (this.surfaceGeometry[i].sector.containsLocation(latitude, longitude)) {
                    this.surfaceGeometry[i].surfacePoint(latitude, longitude, result);

                    if (offset) {
                        var normal = this.globe.surfaceNormalAtPoint(result[0], result[1], result[2], Terrain.scratchPoint);
                        result[0] += normal[0] * offset;
                        result[1] += normal[1] * offset;
                        result[2] += normal[2] * offset;
                    }

                    return result;
                }
            }

            return null;
        };

        /**
         * Computes a Cartesian point at a location on the surface of this terrain according to a specified
         * altitude mode.
         * @param {Number} latitude The location's latitude.
         * @param {Number} longitude The location's longitude.
         * @param {Number} offset Distance above the terrain, in meters relative to the specified altitude mode, at
         * which to compute the point.
         * @param {String} altitudeMode The altitude mode to use to compute the point. Recognized values are
         * <code>WorldWind.ABSOLUTE</code>, <code>WorldWind.CLAMP_TO_GROUND</code> and
         * <code>WorldWind.RELATIVE_TO_GROUND</code>. The mode <code>WorldWind.ABSOLUTE</code> is used if the
         * specified mode is null, undefined or unrecognized.
         * @param {Vec3} result A pre-allocated Vec3 in which to return the computed point.
         * @returns {Vec3} The specified result parameter, set to the coordinates of the computed point.
         * @throws {ArgumentError} If the specified result argument is null or undefined.
         */
        Terrain.prototype.surfacePointForMode = function (latitude, longitude, offset, altitudeMode, result) {
            if (!result) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Terrain", "surfacePointForMode", "missingResult"));
            }

            if (!altitudeMode)
                altitudeMode = WorldWind.ABSOLUTE;

            if (altitudeMode === WorldWind.CLAMP_TO_GROUND) {
                return this.surfacePoint(latitude, longitude, 0, result);
            } else if (altitudeMode === WorldWind.RELATIVE_TO_GROUND) {
                return this.surfacePoint(latitude, longitude, offset, result);
            } else {
                var height = offset * this.verticalExaggeration;
                this.globe.computePointFromPosition(latitude, longitude, height, result);
                return result;
            }
        };

        /**
         * Initializes rendering state to draw a succession of terrain tiles.
         * @param {DrawContext} dc The current draw context.
         */
        Terrain.prototype.beginRendering = function (dc) {
            if (this.globe && this.globe.tessellator) {
                this.globe.tessellator.beginRendering(dc);
            }
        };

        /**
         * Restores rendering state after drawing a succession of terrain tiles.
         * @param {DrawContext} dc The current draw context.
         */
        Terrain.prototype.endRendering = function (dc) {
            if (this.globe && this.globe.tessellator) {
                this.globe.tessellator.endRendering(dc);
            }
        };

        /**
         * Initializes rendering state for drawing a specified terrain tile.
         * @param {DrawContext} dc The current draw context.
         * @param {TerrainTile} terrainTile The terrain tile subsequently drawn via this tessellator's render function.
         * @throws {ArgumentError} If the specified tile is null or undefined.
         */
        Terrain.prototype.beginRenderingTile = function (dc, terrainTile) {
            if (!terrainTile) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Terrain", "beginRenderingTile", "missingTile"));
            }

            if (this.globe && this.globe.tessellator) {
                this.globe.tessellator.beginRenderingTile(dc, terrainTile);
            }
        };

        /**
         * Restores rendering state after drawing the most recent tile specified to
         * [beginRenderingTile{@link Tessellator#beginRenderingTile}.
         * @param {DrawContext} dc The current draw context.
         * @param {TerrainTile} terrainTile The terrain tile most recently rendered.
         * @throws {ArgumentError} If the specified tile is null or undefined.
         */
        Terrain.prototype.endRenderingTile = function (dc, terrainTile) {
            // Intentionally empty.
        };

        /**
         * Renders a specified terrain tile.
         * @param {DrawContext} dc The current draw context.
         * @param {TerrainTile} terrainTile The terrain tile to render.
         * @throws {ArgumentError} If the specified tile is null or undefined.
         */
        Terrain.prototype.renderTile = function (dc, terrainTile) {
            if (!terrainTile) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Terrain", "renderTile", "missingTile"));
            }

            if (this.globe && this.globe.tessellator) {
                this.globe.tessellator.renderTile(dc, terrainTile);
            }
        };

        Terrain.prototype.pick = function (dc) { // TODO
        };

        return Terrain;
    });