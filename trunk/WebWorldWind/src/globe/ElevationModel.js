/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ElevationModel
 * @version $Id$
 */
define([
        '../util/AbsentResourceList',
        '../geom/Angle',
        '../error/ArgumentError',
        '../globe/ElevationImage',
        '../globe/ElevationTile',
        '../util/LevelSet',
        '../util/Logger',
        '../cache/MemoryCache',
        '../geom/Sector',
        '../util/Tile',
        '../util/WWMath'],
    function (AbsentResourceList,
              Angle,
              ArgumentError,
              ElevationImage,
              ElevationTile,
              LevelSet,
              Logger,
              MemoryCache,
              Sector,
              Tile,
              WWMath) {
        "use strict";

        /**
         * Constructs an elevation model.
         * @alias ElevationModel
         * @constructor
         * @classdesc Represents the elevations for an area, often but not necessarily the whole globe.
         * @param {Sector} coverageSector The sector this elevation model spans.
         * @param {Location} levelZeroDelta The size of top-level tiles, in degrees.
         * @param {Number} numLevels The number of levels used to represent this elevation model's resolution pyramid.
         * @param {String} retrievalImageFormat The mime type of the elevation data retrieved by this elevation model.
         * @param {String} cachePath A string unique to this elevation model relative to other elevation model used by
         * the application.
         * @param {Number} tileWidth The number of intervals (cells) in the longitudinal direction of this elevation
         * model's elevation tiles.
         * @param {Number} tileHeight The number of intervals (cells) in the latitudinal direction of this elevation
         * model's elevation tiles.
         * @throws {ArgumentError} If any argument is null or undefined, if the number of levels specified is less
         * than one, or if either the tile width or tile height are less than one.
         */
        var ElevationModel = function (coverageSector, levelZeroDelta, numLevels, retrievalImageFormat, cachePath,
                                       tileWidth, tileHeight) {
            if (!coverageSector) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "constructor", "missingSector"));
            }

            if (!levelZeroDelta) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "constructor",
                        "The specified level-zero delta is null or undefined."));
            }

            if (!retrievalImageFormat) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "constructor",
                        "The specified image format is null or undefined."));
            }

            if (!cachePath) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "constructor",
                        "The specified cache path is null or undefined."));
            }

            if (!numLevels || numLevels < 1) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "constructor",
                        "The specified number of levels is not greater than zero."));
            }

            if (!tileWidth || !tileHeight || tileWidth < 1 || tileHeight < 1) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "constructor",
                        "The specified tile width or height is not greater than zero."));
            }

            /**
             * The sector this elevation model spans, as passed to the constructor. This property is intended to be
             * read-only.
             * @type {Sector}
             * @readonly
             */
            this.coverageSector = coverageSector;

            /**
             * The mime type to use when retrieving elevations, as passed to the constructor.
             * This property is intended to be read-only.
             * @type {String}
             * @readonly
             */
            this.retrievalImageFormat = retrievalImageFormat;

            /** A unique string identifying this elevation model, as passed to the constructor.
             * This property is intended to be read-only.
             * @type {String}
             * @readonly
             */
            this.cachePath = cachePath;

            /**
             * Indicates this elevation model's display name.
             * @type {String}
             * @default "Elevations"
             */
            this.displayName = "Elevations";

            /**
             * Indicates the last time this elevation model changed, in milliseconds since midnight Jan 1, 1970.
             * @type {number}
             * @readonly
             * @default Date.getTime() at construction
             */
            this.timestamp = Date.now();

            /**
             * This elevation model's minimum elevation
             * @type {number}
             * @default 0
             */
            this.minElevation = 0;

            /**
             * This elevation model's maximum elevation.
             * @type {number}
             */
            this.maxElevation = 0;

            /**
             * Indicates whether the data associated with the elevation model is point data. A value of <code>false</code>
             * indicates that the data is area data (pixel is area).
             * @type {boolean}
             * @default true
             */
            this.pixelIsPoint = true;

            /**
             * The level set created during construction of this elevation model.
             * This property is intended to be read-only.
             * @type {LevelSet}
             * @readonly
             */
            this.levels = new LevelSet(this.coverageSector, levelZeroDelta, numLevels, tileWidth, tileHeight);

            // These are internal and intentionally not documented.
            this.currentTiles = []; // holds assembled tiles
            this.currentSector = new Sector(0, 0, 0, 0); // a scratch variable
            this.tileCache = new MemoryCache(1000000, 800000); // for elevation tiles
            this.imageCache = new MemoryCache(10000000, 8000000); // for the elevations, themselves
            this.currentRetrievals = []; // Identifies elevation retrievals in progress
            this.absentResourceList = new AbsentResourceList(3, 5e3);
            this.id = ++ElevationModel.idPool;
            this._stateKey = "elevationModel " + this.id.toString() + " ";
        };

        ElevationModel.idPool = 0; // Used to assign unique IDs to elevation models for use in their state key.

        Object.defineProperties(ElevationModel.prototype, {
            /**
             * A string identifying this elevation model's current state. Used to compare states during rendering to
             * determine whether globe-state dependent cached values must be updated. Applications typically do not
             * interact with this property.
             * @memberof ElevationModel.prototype
             * @readonly
             * @type {String}
             */
            stateKey: {
                get: function () {
                    return this._stateKey;
                }
            }
        });

        /**
         * Returns the minimum and maximum elevations within a specified sector.
         * @param {Sector} sector The sector for which to determine extreme elevations.
         * @returns {Number[]} An array containing the minimum and maximum elevations within the specified sector,
         * or null if the specified sector is outside this elevation model's coverage area.
         * @throws {ArgumentError} If the specified sector is null or undefined.
         */
        ElevationModel.prototype.minAndMaxElevationsForSector = function (sector) {
            if (!sector) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "minAndMaxElevationsForSector", "missingSector"));
            }

            var level = this.levels.levelForTexelSize(sector.deltaLatitude() * Angle.DEGREES_TO_RADIANS / 64);
            this.assembleTiles(level, sector, false);

            if (this.currentTiles.length == 0) {
                return null; // Sector is outside the elevation model's coverage area. Do not modify the result array.
            }

            // Assign the output extreme elevations to the largest and smallest double values, respectively. This has the effect
            // of expanding the extremes with each subsequent tile as needed. If we initialized this array with zeros then the
            // output extreme elevations would always contain zero, even when the range of the image's extreme elevations in the
            // sector does not contain zero.
            var min = Number.MAX_VALUE,
                max = -min,
                image,
                imageMin,
                imageMax,
                result = [];

            for (var i = 0, len = this.currentTiles.length; i < len; i++) {
                image = this.currentTiles[i].image();
                if (image) {
                    imageMin = image.minElevation;
                    if (min > imageMin) {
                        min = imageMin;
                    }

                    imageMax = image.maxElevation;
                    if (max < imageMax) {
                        max = imageMax;
                    }
                } else {
                    result[0] = this.minElevation;
                    result[1] = this.maxElevation;
                    return result; // At least one tile image is not in memory; return the model's extreme elevations.
                }
            }

            result[0] = min;
            result[1] = max;

            return result;
        };

        /**
         * Returns the elevation at a specified location.
         * @param {Number} latitude The location's latitude in degrees.
         * @param {Number} longitude The location's longitude in degrees.
         * @returns {Number} The elevation at the specified location. Returns zero if the location is outside the
         * coverage area of this elevation model.
         */
        ElevationModel.prototype.elevationAtLocation = function (latitude, longitude) {
            if (!this.coverageSector.containsLocation(latitude, longitude)) {
                return 0; // location is outside the elevation model's coverage
            }

            var level = this.levels.lastLevel(),
                deltaLat = level.tileDelta.latitude,
                deltaLon = level.tileDelta.longitude,
                r = Tile.computeRow(deltaLat, latitude),
                c = Tile.computeColumn(deltaLon, longitude),
                tile,
                image = null;

            for (var i = level.levelNumber; i >= 0; i--) {
                tile = this.tileCache.entryForKey(i.toString() + "." + r.toString() + "." + c.toString());
                if (tile) {
                    image = tile.image();
                    if (image) {
                        return image.elevationAtLocation(latitude, longitude);
                    }
                }

                r = Math.floor(r / 2);
                c = Math.floor(c / 2);
            }

            return 0; // did not find a tile with an image
        };

        /**
         * Returns the elevations at locations within a specified sector.
         * @param {Sector} sector The sector for which to determine the elevations.
         * @param {Number} numLatitude The number of latitudinal sample locations within the sector.
         * @param {Number} numLongitude The number of longitudinal sample locations within the sector.
         * @param {Number} targetResolution The desired elevation resolution.
         * @param {Number[]} result An array in which to return the requested elevations.
         * @returns {Number} The resolution actually achieved, which may be greater than that requested if the
         * elevation data for the requested resolution is not currently available.
         * @throws {ArgumentError} If the specified sector or result array is null or undefined, or if either of the
         * specified numLatitude or numLongitude values is less than one.
         */
        ElevationModel.prototype.elevationsForGrid = function (sector, numLatitude, numLongitude, targetResolution,
                                                               result) {
            if (!sector) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "elevationsForSector", "missingSector"));
            }

            if (!result) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "elevationsForSector", "missingResult"));
            }

            if (!numLatitude || !numLongitude || numLatitude < 1 || numLongitude < 1) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ElevationModel", "constructor",
                        "The specified number of latitudinal or longitudinal positions is less than one."));
            }

            var level = this.levels.levelForTexelSize(targetResolution),
                texelSize = level.texelSize * Angle.RADIANS_TO_DEGREES,
                expandedSector = sector;

            if (!this.pixelIsPoint) {
                // Expand the sector in order to capture tiles adjacent to those required for pixel-is-point.
                expandedSector = new Sector(
                    Math.max(-90, sector.minLatitude - 2 * texelSize),
                    Math.min(90, sector.maxLatitude + 2 * texelSize),
                    Math.max(-180, sector.minLongitude - 2 * texelSize),
                    Math.min(180, sector.maxLongitude + 2 * texelSize));
            }

            this.assembleTiles(level, expandedSector, true);
            if (this.currentTiles.length === 0) {
                return 0; // Sector is outside the elevation model's coverage area. Do not modify the results array.
            }

            // Sort from lowest resolution to highest so that higher resolutions override lower resolutions in the
            // loop below.
            this.currentTiles.sort(function (tileA, tileB) {
                return tileA.level.levelNumber - tileB.level.levelNumber;
            });

            if (this.pixelIsPoint) {
                return this.sectorElevationsFromPointElevations(sector, numLatitude, numLongitude, targetResolution,
                    result);
            } else {
                return this.sectorElevationsFromAreaElevations(sector, numLatitude, numLongitude, targetResolution,
                    result);
            }
        };

        ElevationModel.prototype.sectorElevationsFromPointElevations = function (sector, numLatitude, numLongitude,
                                                                                 targetResolution, result) {
            var maxResolution = 0,
                resolution;

            for (var i = 0, len = this.currentTiles.length; i < len; i++) {
                var tile = this.currentTiles[i],
                    image = tile.image();

                if (image) {
                    image.elevationsForGrid(sector, numLatitude, numLongitude, result);
                    resolution = tile.level.texelSize;

                    if (maxResolution < resolution) {
                        maxResolution = resolution;
                    }
                } else {
                    maxResolution = Number.MAX_VALUE;
                }
            }

            return maxResolution;
        };

        ElevationModel.prototype.sectorElevationsFromAreaElevations = function (sector, numLatitude, numLongitude,
                                                                                targetResolution, result) {
            // For each lat/lon in sector
            //  Compute the lat/lon of the four surrounding area pixels.
            //  Look up the area elevations in the current-tiles list.
            //  Interpolate the point elevation from those four area elevations.

            var deltaLat = sector.deltaLatitude() / (numLatitude > 1 ? numLatitude - 1 : 1),
                deltaLon = sector.deltaLongitude() / (numLongitude > 1 ? numLongitude - 1 : 1),
                lat, lon,
                level = this.levels.levelForTexelSize(targetResolution),
                texelSize = level.texelSize * Angle.RADIANS_TO_DEGREES,
                index = 0,
                swElevation = [], seElevation = [], neElevation = [], nwElevation = [];

            for (var j = 0; j < numLatitude; j++) {
                if (j === 0) {
                    lat = sector.minLatitude;
                } else if (j === numLatitude - 1) {
                    lat = sector.maxLatitude;
                } else {
                    lat = sector.minLatitude + j * deltaLat;
                }

                for (var i = 0; i < numLongitude; i++) {
                    if (i === 0) {
                        lon = sector.minLongitude;
                    } else if (i === numLongitude - 1) {
                        lon = sector.maxLongitude;
                    } else {
                        lon = sector.minLongitude + i * deltaLon;
                    }

                    var minLat = Math.max(-90, lat - WWMath.fmod(WWMath.fabs(lat), texelSize)),
                        minLon = Math.max(-180, lon - WWMath.fmod(WWMath.fabs(lon), texelSize)),
                        maxLat = Math.min(90, minLat + texelSize),
                        maxLon = Math.min(180, minLon + texelSize),
                        sw = this.elevationFromAreaData(minLat, minLon, swElevation),
                        se = this.elevationFromAreaData(minLat, maxLon, seElevation),
                        ne = this.elevationFromAreaData(maxLat, maxLon, neElevation),
                        nw = this.elevationFromAreaData(maxLat, minLon, nwElevation),
                        yf = WWMath.fabs(lat - minLat) / WWMath.fabs(maxLat - minLat),
                        xf = WWMath.fabs(lon - minLon) / WWMath.fabs(maxLon - minLon);

                    if (sw && se && ne && nw) {
                        result[index] = WWMath.interpolate(yf,
                            WWMath.interpolate(xf, swElevation[0], seElevation[0]),
                            WWMath.interpolate(xf, nwElevation[0], neElevation[0]));
                    }

                    index++;
                }
            }

            return level.texelSize; // TODO: return the actual achieved
        };

        ElevationModel.prototype.elevationFromAreaData = function (lat, lon, result) {
            for (var i = this.currentTiles.length - 1; i >= 0; i--) {
                var tile = this.currentTiles[i],
                    image = tile.image();

                if (tile.sector.containsLocation(lat, lon) && image) {
                    result[0] = image.elevationAtLocation(lat, lon);
                    return true;
                }
            }

            return false;
        };

        // Intentionally not documented.
        ElevationModel.prototype.createTile = function (sector, level, row, column) {
            var imagePath = this.cachePath + "/" + level.levelNumber + "/" + row + "/" + row + "_" + column + ".bil";

            return new ElevationTile(sector, level, row, column, imagePath, this.imageCache);
        };

        // Intentionally not documented.
        ElevationModel.prototype.assembleTiles = function (level, sector, retrieveTiles) {
            this.currentTiles = [];

            // Intersect the requested sector with the elevation model's coverage area. This avoids attempting to assemble tiles
            // that are outside the coverage area.
            this.currentSector.copy(sector);
            this.currentSector.intersection(this.coverageSector);

            if (this.currentSector.isEmpty())
                return; // sector is outside the elevation model's coverage area

            var deltaLat = level.tileDelta.latitude,
                deltaLon = level.tileDelta.longitude,
                firstRow = Tile.computeRow(deltaLat, this.currentSector.minLatitude),
                lastRow = Tile.computeLastRow(deltaLat, this.currentSector.maxLatitude),
                firstCol = Tile.computeColumn(deltaLon, this.currentSector.minLongitude),
                lastCol = Tile.computeLastColumn(deltaLon, this.currentSector.maxLongitude);

            for (var row = firstRow; row <= lastRow; row++) {
                for (var col = firstCol; col <= lastCol; col++) {
                    this.addTileOrAncestor(level, row, col, retrieveTiles);
                }
            }
        };

        // Intentionally not documented.
        ElevationModel.prototype.addTileOrAncestor = function (level, row, column, retrieveTiles) {
            var tile = this.tileForLevel(level.levelNumber, row, column);

            if (this.isTileImageInMemory(tile)) {
                this.addToCurrentTiles(tile);
            } else {
                if (retrieveTiles) {
                    this.retrieveTileImage(tile);
                }

                if (level.isFirstLevel()) {
                    this.currentTiles.push(tile); // no ancestor tile to add
                } else {
                    this.addAncestor(level, row, column, retrieveTiles);
                }
            }
        };

        // Intentionally not documented.
        ElevationModel.prototype.addAncestor = function (level, row, column, retrieveTiles) {
            var tile = null,
                r = Math.floor(row / 2),
                c = Math.floor(column / 2);

            for (var i = level.levelNumber - 1; i >= 0; i--) {
                tile = this.tileForLevel(i, r, c);
                if (this.isTileImageInMemory(tile)) {
                    this.addToCurrentTiles(tile);
                    return;
                }

                r = Math.floor(r / 2);
                c = Math.floor(c / 2);
            }

            // No ancestor tiles have an in-memory image. Retrieve the ancestor tile corresponding for the first level, and
            // add it. We add the necessary tiles to provide coverage over the requested sector in order to accurately return
            // whether or not this elevation model has data for the entire sector.
            this.addToCurrentTiles(tile);

            if (retrieveTiles) {
                this.retrieveTileImage(tile);
            }
        };

        // Intentionally not documented.
        ElevationModel.prototype.addToCurrentTiles = function (tile) {
            this.currentTiles.push(tile);

            // If the tile's elevations have expired, cause it to be re-retrieved. Note that the current,
            // expired elevations are still used until the updated ones arrive.
            if (this.isTileImageExpired(tile)) {
                this.retrieveTileImage(tile);
            }
        };

        // Intentionally not documented.
        ElevationModel.prototype.isTileImageExpired = function (tile) {
            return !(!this.expiration || this.expiration > Date.now());
        };

        // Intentionally not documented.
        ElevationModel.prototype.tileForLevel = function (levelNumber, row, column) {
            var tileKey = levelNumber.toString() + "." + row.toString() + "." + column.toString(),
                tile = this.tileCache.entryForKey(tileKey);

            if (tile) {
                return tile;
            }

            var level = this.levels.level(levelNumber),
                sector = Tile.computeSector(level, row, column);

            tile = this.createTile(sector, level, row, column);
            this.tileCache.putEntry(tileKey, tile, tile.size);

            return tile;
        };

        // Intentionally not documented.
        ElevationModel.prototype.isTileImageInMemory = function (tile) {
            return this.imageCache.containsKey(tile.imagePath);
        };

        // Intentionally not documented.
        ElevationModel.prototype.resourceUrlForTile = function (tile) {
            return this.urlBuilder.urlForTile(tile, this.retrievalImageFormat);
        };

        // Intentionally not documented.
        ElevationModel.prototype.retrieveTileImage = function (tile) {
            if (this.currentRetrievals.indexOf(tile.imagePath) < 0) {
                var url = this.resourceUrlForTile(tile, this.retrievalImageFormat),
                    xhr = new XMLHttpRequest(),
                    elevationModel = this;

                if (!url)
                    return;

                xhr.open("GET", url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        elevationModel.removeFromCurrentRetrievals(tile.imagePath);

                        var contentType = xhr.getResponseHeader("content-type");

                        if (xhr.status === 200) {
                            if (contentType === elevationModel.retrievalImageFormat
                                || contentType === "text/plain"
                                || contentType === "application/octet-stream") {
                                Logger.log(Logger.LEVEL_INFO, "Elevations retrieval succeeded: " + url);
                                elevationModel.loadElevationImage(tile, xhr);
                                elevationModel.absentResourceList.unmarkResourceAbsent(tile.imagePath);

                                // Send an event to request a redraw.
                                var e = document.createEvent('Event');
                                e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                                window.dispatchEvent(e);
                            } else if (contentType === "text/xml") {
                                elevationModel.absentResourceList.markResourceAbsent(tile.imagePath);
                                Logger.log(Logger.LEVEL_WARNING,
                                    "Elevations retrieval failed (" + xhr.statusText + "): " + url + ".\n "
                                    + String.fromCharCode.apply(null, new Uint8Array(xhr.response)));
                            } else {
                                elevationModel.absentResourceList.markResourceAbsent(tile.imagePath);
                                Logger.log(Logger.LEVEL_WARNING,
                                    "Elevations retrieval failed: " + url + ". " + "Unexpected content type "
                                    + contentType);
                            }
                        } else {
                            elevationModel.absentResourceList.markResourceAbsent(tile.imagePath);
                            Logger.log(Logger.LEVEL_WARNING,
                                "Elevations retrieval failed (" + xhr.statusText + "): " + url);
                        }
                    }
                };

                xhr.onerror = function () {
                    elevationModel.removeFromCurrentRetrievals(tile.imagePath);
                    elevationModel.absentResourceList.markResourceAbsent(tile.imagePath);
                    Logger.log(Logger.LEVEL_WARNING, "Elevations retrieval failed: " + url);
                };

                xhr.ontimeout = function () {
                    elevationModel.removeFromCurrentRetrievals(tile.imagePath);
                    elevationModel.absentResourceList.markResourceAbsent(tile.imagePath);
                    Logger.log(Logger.LEVEL_WARNING, "Elevations retrieval timed out: " + url);
                };

                xhr.send(null);

                this.currentRetrievals.push(tile.imagePath);
            }
        };

        ElevationModel.prototype.removeFromCurrentRetrievals = function (imagePath) {
            var index = this.currentRetrievals.indexOf(imagePath);
            if (index > -1) {
                this.currentRetrievals.splice(index, 1);
            }
        };

        // Intentionally not documented.
        ElevationModel.prototype.loadElevationImage = function (tile, xhr) {
            var elevationImage = new ElevationImage(tile.imagePath, tile.sector, tile.tileWidth, tile.tileHeight);

            if (this.retrievalImageFormat == "application/bil16") {
                elevationImage.imageData = new Int16Array(xhr.response);
                elevationImage.size = elevationImage.imageData.length * 2;
            }

            if (elevationImage.imageData) {
                elevationImage.findMinAndMaxElevation();
                this.imageCache.putEntry(tile.imagePath, elevationImage, elevationImage.size);
                this.timestamp = Date.now();
            }
        };

        return ElevationModel;

    });