/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Path
 * @version $Id$
 */
define([
        '../shapes/AbstractShape',
        '../error/ArgumentError',
        '../shaders/BasicTextureProgram',
        '../util/Color',
        '../util/Logger',
        '../geom/Matrix',
        '../pick/PickedObject',
        '../geom/Vec2',
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (AbstractShape,
              ArgumentError,
              BasicTextureProgram,
              Color,
              Logger,
              Matrix,
              PickedObject,
              Vec2,
              Vec3,
              WWMath) {
        "use strict";

        /**
         * Constructs a path.
         * @alias Path
         * @constructor
         * @augments AbstractShape
         * @classdesc Represents a Path shape.
         * @param {Position[]} positions An array containing the path positions.
         * @throws {ArgumentError} If the specified positions array is null or undefined.
         */
        var Path = function (positions) {
            if (!positions) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Path", "constructor", "missingPositions"));
            }

            AbstractShape.call(this);

            this._positions = positions;
            this.referencePosition = positions.length > 0 ? positions[0] : null;

            this._pathType = WorldWind.LINEAR;

            this._terrainConformance = 10;

            this._numSubSegments = 10;
        };

        Path.prototype = Object.create(AbstractShape.prototype);

        Object.defineProperties(AbstractShape.prototype, {
            positions: {
                get: function () {
                    return this._positions;
                },
                set: function (positions) {
                    if (!positions) {
                        throw new ArgumentError(
                            Logger.logMessage(Logger.LEVEL_SEVERE, "Path", "constructor", "missingPositions"));
                    }

                    this._positions = positions;
                    this.referencePosition = positions.length > 0 ? positions[0] : null;
                    this.reset();
                }
            },

            followTerrain: {
                get: function () {
                    return this._followTerrain;
                },
                set: function (followTerrain) {
                    this._followTerrain = followTerrain;
                    this.reset();
                }
            },

            terrainConformance: {
                get: function () {
                    return this._terrainConformance;
                },
                set: function (terrainConformance) {
                    this._terrainConformance = terrainConformance;
                    this.reset();
                }
            },

            numSubSegments: {
                get: function () {
                    return this._numSubSegments;
                },
                set: function (numSubSegments) {
                    this._numSubSegments = numSubSegments >= 0 ? numSubSegments : 0;
                    this.reset();
                }
            },

            pathType: {
                get: function () {
                    return this._pathType;
                },
                set: function (pathType) {
                    this._pathType = pathType;
                    this.reset();
                }
            },

            extrude: {
                get: function () {
                    return this._extrude;
                },
                set: function (extrude) {
                    this._extrude = extrude;
                    this.reset();
                }
            }
        });

        Path.prototype.makeOrderedRenderable = function (dc) {
            // A null reference position is a signal that there are no positions to render.
            if (!this.referencePosition || this._positions.length < 2) {
                return null;
            }

            // Set the transformation matrix to correspond to the reference position.
            var refPt = this.currentData.referencePoint;
            dc.terrain.surfacePointForMode(this.referencePosition.latitude, this.referencePosition.longitude,
                this.referencePosition.altitude, this._altitudeMode, refPt);
            this.currentData.transformationMatrix.setToTranslation(refPt[0], refPt[1], refPt[2]);

            // Tessellate the path in geographic coordinates.
            var tessellatedPositions = this.makeTessellatedPositions(dc);
            if (tessellatedPositions.length < 2) {
                return null;
            }

            // Convert the tessellated geographic coordinates to the Cartesian coordinates that will be rendered.
            var tessellatedPoints = this.computeRenderedPath(dc, tessellatedPositions);

            // Create the extent from the Cartesian points. Those points are relative to this path's reference point, so
            // translate the computed extent to the reference point.
            this.currentData.tessellatedPoints = tessellatedPoints;
            this.currentData.extent.setToPoints(tessellatedPoints);
            this.currentData.extent.translate(this.currentData.referencePoint);

            return this;
        };

        Path.prototype.makeTessellatedPositions = function (dc) {
            var tessellatedPositions = [],
                navState = dc.navigatorState,
                ptA = new Vec3(0, 0, 0),
                ptB = new Vec3(0, 0, 0),
                posA = this._positions[0],
                posB, eyeDistance, pixelSize;

            tessellatedPositions.push(posA);

            dc.terrain.surfacePointForMode(posA.latitude, posA.longitude, posA.altitude, this._altitudeMode, ptA);

            for (var i = 1, len = this._positions.length; i < len; i++) {
                posB = this._positions[i];
                dc.terrain.surfacePointForMode(posB.latitude, posB.longitude, posB.altitude, this._altitudeMode, ptB);
                eyeDistance = navState.eyePoint.distanceTo(ptA);
                pixelSize = navState.pixelSizeAtDistance(eyeDistance);
                if (ptA.distanceTo(ptB) < pixelSize * 8) {
                    tessellatedPositions.push(posB); // distance is short so no need for sub-segments
                } else {
                    this.makeSegment(dc, posA, posB, ptA, ptB, tessellatedPositions);
                }

                posA = posB;
                ptA.copy(ptB);
            }

            return tessellatedPositions;
        };

        Path.prototype.makeSegment = function (dc, posA, posB, ptA, ptB, tessellatedPositions) {
            var navState = dc.navigatorState,
                eyePoint = navState.eyePoint,
                pos = new Location(0, 0),
                arcLength, segmentAzimuth, segmentDistance, s, p, distance;

            if (this._pathType === WorldWind.LINEAR) {
                arcLength = ptA.distanceTo(ptB);
            } else {
                arcLength = this.computeSegmentLength(dc, posA, posB);
            }

            if (arcLength <= 0 || (this._pathType === WorldWind.LINEAR && !this._followTerrain)) {
                // Segment is 0 length or a straight line.
                if (!ptA.equals(ptB)) {
                    tessellatedPositions.push(posB);
                }
                return;
            }

            if (this._pathType === WorldWind.LINEAR) {
                segmentAzimuth = Location.linearAzimuth(posA, posB);
                segmentDistance = Location.linearDistance(posA, posB);
            } else if (this._pathType === WorldWind.RHUMB_LINE) {
                segmentAzimuth = Location.rhumbAzimuth(posA, posB);
                segmentDistance = Location.rhumbDistance(posA, posB);
            } else {
                segmentAzimuth = Location.greatCircleAzimuth(posA, posB);
                segmentDistance = Location.greatCircleDistance(posA, posB);
            }

            for (s = 0, p = 0; s < 1;) {
                if (this._followTerrain) {
                    p += this._terrainConformance * navState.pixelSizeAtDistance(ptA.distanceTo(eyePoint));
                } else {
                    p += arcLength / this._numSubSegments;
                }

                s = p / arcLength;
                if (s >= 1) {
                    pos = posB;
                } else {
                    distance = s * segmentDistance;

                    if (this._pathType === WorldWind.LINEAR) {
                        Location.linearLocation(posA, segmentAzimuth, distance, pos);
                    } else if (this._pathType === WorldWind.RHUMB_LINE) {
                        Location.rhumbLocation(posA, segmentAzimuth, distance, pos);
                    } else {
                        Location.greatCircleLocation(posA, segmentAzimuth, distance, pos);
                    }

                    pos.altitude = (1 - s) * posA.altitude + s * posB.altitude;
                }

                tessellatedPositions.push(pos);

                ptA = ptB;
            }
        };

        Path.prototype.computeSegmentLength = function (dc, posA, posB) {
            var length = Location.greatCircleDistance(posA, posB) * dc.globe.equatorialRadius;

            if (this._altitudeMode !== WorldWind.CLAMP_TO_GROUND) {
                length += 0.5 * (posA.altitude + posB.altitude) * dc.verticalExaggeration;

            }

            return length;
        };

        Path.prototype.computeRenderedPath = function (dc, tessellatedPositions) {
            var extrudeIt = this.activeAttributes.drawInterior,
                eyeDistSquared = Number.MAX_VALUE,
                eyePoint = dc.navigatorState.eyePoint,
                numPoints = (extrudeIt ? 2 : 1) * tessellatedPositions.length,
                tessellatedPoints = new Float32Array(numPoints * 3),
                stride = extrudeIt ? 6 : 3,
                pt = new Vec3(0, 0, 0),
                pos, lat, lon, k, dSquared;

            for (var i = 0, len = tessellatedPositions.length; i < len; i++) {
                pos = tessellatedPositions[i];

                dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, pos.altitude, this._altitudeMode, pt);

                dSquared = pt.distanceToSquared(eyePoint);
                if (dSquared < eyeDistSquared) {
                    eyeDistSquared = dSquared;
                }

                pt.subtract(this.currentData.referencePoint);

                k = stride * i;
                tessellatedPoints[k] = pt[0];
                tessellatedPoints[k + 1] = pt[1];
                tessellatedPoints[k + 2] = pt[2];

                if (extrudeIt) {
                    dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, 0, this._altitudeMode, pt);

                    dSquared = pt.distanceToSquared(eyePoint);
                    if (dSquared < eyeDistSquared) {
                        eyeDistSquared = dSquared;
                    }

                    pt.subtract(this.currentData.referencePoint);

                    k = stride * i;
                    tessellatedPoints[k + 3] = pt[0];
                    tessellatedPoints[k + 4] = pt[1];
                    tessellatedPoints[k + 5] = pt[2];
                }
            }

            this.currentData.eyeDistance = Math.sqrt(eyeDistSquared);

            return tessellatedPoints;
        };

        return Path;
    });