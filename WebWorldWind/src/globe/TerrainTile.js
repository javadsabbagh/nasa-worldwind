/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TerrainTile
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../geom/Matrix',
        '../util/Tile'
    ],
    function (ArgumentError,
              Logger,
              Matrix,
              Tile) {
        "use strict";

        /**
         * Constructs a terrain tile.
         * @alias TerrainTile
         * @constructor
         * @classdesc Represents a portion of a globe's terrain.
         * @param {Sector} sector The sector this tile covers.
         * @param {Level} level The level this tile is associated with.
         * @param {Number} row This tile's row in the associated level.
         * @param {Number} column This tile's column in the associated level.
         *
         */
        var TerrainTile = function (sector, level, row, column) {
            Tile.call(this, sector, level, row, column); // args are checked in the superclass' constructor

            /**
             * The transformation matrix that maps tile local coordinates to model coordinates.
             * @type {Matrix}
             */
            this.transformationMatrix = Matrix.fromIdentity();

            /**
             * The number of model coordinate points this tile contains.
             * @type {number}
             */
            this.numPoints = 0;

            /**
             * The tile's model coordinate points.
             * @type {null}
             */
            this.points = null;

            /**
             * Indicates the date and time at which this tile's terrain geometry was computed.
             * This is used to invalidate the terrain geometry when the globe's elevations change.
             * @type {number}
             */
            this.geometryTimestamp = 0;

            /**
             * Indicates the date and time at which this tile's terrain geometry VBO was loaded.
             * This is used to invalidate the terrain geometry when the globe's elevations change.
             * @type {number}
             */
            this.geometryVboTimestamp = 0;

            /**
             * The GPU resource cache ID for this tile's model coordinates VBO.
             * @type {null}
             */
            this.geometryVboCacheKey = level.levelNumber.toString() + "." + row.toString() + "." + column.toString();

            this.scratchArray = [];
        };

        TerrainTile.prototype = Object.create(Tile.prototype);

        /**
         * Computes a point on the terrain at a specified location.
         * @param {Number} latitude The location's latitude.
         * @param {Number} longitude The location's longitude.
         * @param {Vec3} result A pre-allocated Vec3 in which to return the computed point.
         * @returns {Vec3} The result argument set to the computed point.
         * @throws {ArgumentError} If the specified result is null or undefined.
         */
        TerrainTile.prototype.surfacePoint = function (latitude, longitude, result) {
            if (!result) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "TerrainTile", "surfacePoint", "missingResult"));
            }

            var tileSector = this.sector,
                minLat = tileSector.minLatitude,
                maxLat = tileSector.maxLatitude,
                minLon = tileSector.minLongitude,
                maxLon = tileSector.maxLongitude,
                tileWidth = this.tileWidth,
                tileHeight = this.tileHeight,
                s, t, si, ti, rowStride, vertices, points, k, sf, tf, x, y, z;

            // Compute the location's horizontal (s) and vertical (t) parameterized coordinates within the tiles 2D grid of
            // points as a floating-point value in the range [0, tileWidth] and [0, tileHeight]. These coordinates indicate
            // which cell contains the location, as well as the location's placement within the cell. Note that this method
            // assumes that the caller has tested whether the location is contained within the tile's sector.
            s = (longitude - minLon) / (maxLon - minLon) * tileWidth;
            t = (latitude - minLat) / (maxLat - minLat) * tileHeight;

            // Get the coordinates for the four vertices defining the cell this point is in. Tile vertices start in the lower
            // left corner and proceed in row major order across the tile. The tile contains one more vertex per row or
            // column than the tile width or height. Vertices in the points array are organized in the
            // following order: lower-left, lower-right, upper-left, upper-right. The cell's diagonal starts at the
            // lower-left vertex and ends at the upper-right vertex.
            si = s < tileWidth ? Math.floor(s) : tileWidth;
            ti = t < tileHeight ? Math.floor(t) : tileHeight;
            rowStride = tileWidth + 1;

            vertices = this.points;
            points = this.scratchArray; // temporary working buffer
            k = 3 * (si + ti * rowStride); // lower-left and lower-right vertices
            for (var i = 0; i < 6; i++) {
                points[i] = vertices[k + i];
            }

            k = 3 * (si + (ti + 1) * rowStride); // upper-left and upper-right vertices
            for (var j = 6; j < 12; j++) {
                points[j] = vertices[k + (j - 6)];
            }

            // Compute the location's corresponding point on the cell in tile local coordinates,
            // given the fractional portion of the parameterized s and t coordinates. These values indicate the location's
            // relative placement within the cell. The cell's vertices are defined in the following order: lower-left,
            // lower-right, upper-left, upper-right. The cell's diagonal starts at the lower-left vertex and ends at the
            // upper-right vertex.
            sf = (s < tileWidth ? s - Math.floor(s) : 1);
            tf = (t < tileHeight ? t - Math.floor(t) : 1);

            if (sf < tf) {
                result[0] = points[3] + (1 - sf) * (points[0] - points[3]) + tf * (points[9] - points[3]);
                result[1] = points[4] + (1 - sf) * (points[1] - points[4]) + tf * (points[10] - points[4]);
                result[2] = points[5] + (1 - sf) * (points[2] - points[5]) + tf * (points[11] - points[5]);
            }
            else {
                result[0] = points[6] + sf * (points[9] - points[6]) + (1 - tf) * (points[0] - points[6]);
                result[1] = points[7] + sf * (points[10] - points[7]) + (1 - tf) * (points[1] - points[7]);
                result[2] = points[8] + sf * (points[11] - points[8]) + (1 - tf) * (points[2] - points[8]);
            }

            result[0] += this.referencePoint[0];
            result[1] += this.referencePoint[1];
            result[2] += this.referencePoint[2];

            return result;
        };

        return TerrainTile;
    });