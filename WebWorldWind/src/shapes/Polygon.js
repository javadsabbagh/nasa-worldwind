/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Polygon
 * @version $Id$
 */
define([
        '../shapes/AbstractShape',
        '../error/ArgumentError',
        '../shaders/BasicTextureProgram',
        '../geom/BoundingBox',
        '../util/Color',
        '../../thirdparty/libtess.debug',
        '../geom/Location',
        '../util/Logger',
        '../geom/Matrix',
        '../pick/PickedObject',
        '../geom/Position',
        '../shapes/ShapeAttributes',
        '../geom/Vec2',
        '../geom/Vec3'
    ],
    function (AbstractShape,
              ArgumentError,
              BasicTextureProgram,
              BoundingBox,
              Color,
              libtess,
              Location,
              Logger,
              Matrix,
              PickedObject,
              Position,
              ShapeAttributes,
              Vec2,
              Vec3) {
        "use strict";

        /**
         * Constructs a Polygon.
         * @alias Polygon
         * @constructor
         * @augments AbstractShape
         * @classdesc Represents a 3D polygon. The polygon may be extruded to the ground to form a prism. It may have
         * multiple boundaries defining empty portions.
         * <p>
         * The polygon's edges are drawn between boundary
         * positions to achieve a specified path type, which can be one of the following:
         * <ul>
         *     <li>[WorldWind.GREAT_CIRCLE]{@link WorldWind#GREAT_CIRCLE}</li>
         *     <li>[WorldWind.RHUMB_LINE]{@link WorldWind#RHUMB_LINE}</li>
         *     <li>[WorldWind.LINEAR]{@link WorldWind#LINEAR}</li>
         * </ul>
         * <p>
         *     Polygon edges conform to the terrain if the [followTerrain]{@link Polygon#followTerrain} property is true.
         * <p>
         *     Altitudes within the polygon's positions are interpreted according to the polygon's altitude mode, which
         *     can be one of the following:
         * <ul>
         *     <li>[WorldWind.ABSOLUTE]{@link WorldWind#ABSOLUTE}</li>
         *     <li>[WorldWind.RELATIVE_TO_GROUND]{@link WorldWind#RELATIVE_TO_GROUND}</li>
         *     <li>[WorldWind.CLAMP_TO_GROUND]{@link WorldWind#CLAMP_TO_GROUND}</li>
         * </ul>
         * If the latter, the polygon positions' altitudes are ignored.
         * <p>
         *     Polygons have separate attributes for normal display and highlighted display. They use the interior and
         *     outline attributes of {@link ShapeAttributes} but do not use the image attributes.
         * <p>
         *     A polygon displays as a vertical prism if its [extrude]{@link Polygon#extrude} property is true. A
         *     curtain is formed around its boundaries and extends from the polygon's edges to the ground.
         * @param {Position[][]} boundaries A 2-dimensional array containing the polygon boundaries. Each entry of the
         * array specifies the vertices for one boundary of the polygon, in geographic coordinates.
         * @throws {ArgumentError} If the specified boundaries array is null or undefined.
         */
        var Polygon = function (boundaries) {
            if (!boundaries) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Polygon", "constructor", "missingBoundaries"));
            }

            AbstractShape.call(this);

            // Private. Documentation is with the defined property below.
            this._boundaries = boundaries;

            // Private. Documentation is with the defined property below.
            this._pathType = WorldWind.GREAT_CIRCLE;

            // Private. Documentation is with the defined property below.
            this._terrainConformance = 10;

            // Private. Documentation is with the defined property below.
            this._numSubSegments = 10;

            // Assign the first position as the reference position.
            this.referencePosition = (boundaries.length > 0 && boundaries[0].length > 2) ? boundaries[0][0] : null;

            this.scratchPoint = new Vec3(0, 0, 0); // scratch variable
        };

        Polygon.prototype = Object.create(AbstractShape.prototype);

        Object.defineProperties(Polygon.prototype, {
            /**
             * This polygon's boundaries.
             * @type {Position[][]}
             * @memberof Polygon.prototype
             */
            boundaries: {
                get: function () {
                    return this._boundaries;
                },
                set: function (boundaries) {
                    if (!boundaries) {
                        throw new ArgumentError(
                            Logger.logMessage(Logger.LEVEL_SEVERE, "Polygon", "boundaries", "missingBoundaries"));
                    }

                    this._boundaries = boundaries;
                    this.referencePosition = (boundaries.length > 0 && boundaries[0].length > 2)
                        ? boundaries[0][0] : null;
                    this.reset();
                }
            },

            /**
             * Indicates whether this polygon should conform to the terrain.
             * @type {Boolean}
             * @default false
             * @memberof Polygon.prototype
             */
            followTerrain: {
                get: function () {
                    return this._followTerrain;
                },
                set: function (followTerrain) {
                    this._followTerrain = followTerrain;
                    this.reset();
                }
            },

            /**
             * Specifies how accurately this polygon must adhere to the terrain when the polygon is terrain following.
             * The value specifies the maximum number of pixels between tessellation points. Lower values increase
             * accuracy but decrease performance.
             * @type {Number}
             * @default 10
             * @memberof Polygon.prototype
             */
            terrainConformance: {
                get: function () {
                    return this._terrainConformance;
                },
                set: function (terrainConformance) {
                    this._terrainConformance = terrainConformance;
                    this.reset();
                }
            },

            /**
             * Specifies the number of segments used between specified positions to achieve this polygon's path type.
             * Higher values cause the path to conform more closely to the path type but decrease performance.
             * <p/>
             * Note: The sub-segments number is ignored when the polygon follows terrain or when the path type is
             * WorldWind.LINEAR.
             * @type {Number}
             * @default 10
             * @memberof Polygon.prototype
             */
            numSubSegments: {
                get: function () {
                    return this._numSubSegments;
                },
                set: function (numSubSegments) {
                    this._numSubSegments = numSubSegments >= 0 ? numSubSegments : 0;
                    this.reset();
                }
            },

            /**
             * The type of path to follow when drawing the polygon's edges. Recognized values are:
             * <ul>
             * <li>[WorldWind.GREAT_CIRCLE]{@link WorldWind#GREAT_CIRCLE}</li>
             * <li>[WorldWind.RHUMB_LINE]{@link WorldWind#RHUMB_LINE}</li>
             * <li>[WorldWind.LINEAR]{@link WorldWind#LINEAR}</li>
             * </ul>
             * @type {String}
             * @default WorldWind.GREAT_CIRCLE
             * @memberof Polygon.prototype
             */
            pathType: {
                get: function () {
                    return this._pathType;
                },
                set: function (pathType) {
                    this._pathType = pathType;
                    this.reset();
                }
            },

            /**
             * Specifies whether to extrude this polygon to the ground by drawing a filled interior from the polygon
             * to the terrain. The filled interior uses this polygon's interior attributes.
             * @type {Boolean}
             * @default false
             * @memberof Polygon.prototype
             */
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

        // Internal. Determines whether this shape's geometry must be re-computed.
        Polygon.prototype.mustGenerateGeometry = function (dc) {
            if (!this.currentData.tessellatedPoints) {
                return true;
            }

            if (this.currentData.drawInterior !== this.activeAttributes.drawInterior
                || this.currentData.drawVerticals !== this.activeAttributes.drawVerticals) {
                return true;
            }

            if (!this.followTerrain && this.currentData.numSubSegments !== this.numSubSegments) {
                return true;
            }

            if (this.followTerrain && this.currentData.terrainConformance !== this.terrainConformance) {
                return true;
            }

            if (this.altitudeMode === WorldWind.ABSOLUTE) {
                return false;
            }

            return this.currentData.isExpired
        };

        // Overridden from AbstractShape base class.
        Polygon.prototype.doMakeOrderedRenderable = function (dc) {
            // A null reference position is a signal that there are no boundaries to render.
            if (!this.referencePosition) {
                return null;
            }

            // See if the current shape data can be re-used.
            if (!this.mustGenerateGeometry(dc)) {
                return this;
            }

            // Set the transformation matrix to correspond to the reference position.
            var refPt = this.currentData.referencePoint;
            dc.terrain.surfacePointForMode(this.referencePosition.latitude, this.referencePosition.longitude,
                this.referencePosition.altitude, this._altitudeMode, refPt);
            this.currentData.transformationMatrix.setToTranslation(refPt[0], refPt[1], refPt[2]);

            // Tessellate the boundaries in geographic coordinates.
            var tessellatePositions = this.makeTessellatedPositions(dc);
            if (tessellatePositions.length < 1 || tessellatePositions[0].length < 2) {
                return null;
            }

            // Convert the tessellated geographic coordinates to the Cartesian coordinates that will be rendered.
            var tessellatedPoints = this.computeRenderedPath(dc, tessellatePositions);

            this.currentData.tessellatedPoints = tessellatedPoints;
            this.currentData.drawInterior = this.activeAttributes.drawInterior;
            this.currentData.drawVerticals = this.activeAttributes.drawVerticals;
            this.currentData.numSubSegments = this.numSubSegments;
            this.currentData.terrainConformance = this.terrainConformance;
            this.resetExpiration(this.currentData);
            this.currentData.fillVbo = true;

            // Create the extent from the Cartesian points. Those points are relative to this path's reference point, so
            // translate the computed extent to the reference point.
            if (!this.currentData.extent) {
                this.currentData.extent = new BoundingBox();
            }
            this.currentData.extent.setToPoints(tessellatedPoints[0]); // TODO compute bbox from all points
            this.currentData.extent.translate(this.currentData.referencePoint);

            return this;
        };

        // Private. Intentionally not documented.
        Polygon.prototype.makeTessellatedPositions = function (dc) {
            var tessellatedPositions = [],
                navState = dc.navigatorState,
                showVerticals = this.mustDrawVerticals(dc),
                ptA = new Vec3(0, 0, 0),
                ptB = new Vec3(0, 0, 0),
                posA, posB, eyeDistance, pixelSize;

            if (showVerticals) {
                this.currentData.verticalIndices = [];
            }

            for (var b = 0; b < this._boundaries.length; b++) {
                if (showVerticals) {
                    this.currentData.verticalIndices[b] = new Int16Array(this.boundaries[b].length * 2);
                    this.currentData.verticalIndices[b][0] = 0;
                    this.currentData.verticalIndices[b][1] = 1;
                }

                tessellatedPositions.push([]);

                for (var i = 1, len = this._boundaries[b].length; i < len; i++) {
                    if (i === 1) {
                        posA = this._boundaries[b][0];
                        tessellatedPositions[b].push(posA);
                        dc.terrain.surfacePointForMode(posA.latitude, posA.longitude, posA.altitude,
                            this._altitudeMode, ptA);
                    }
                    posB = this._boundaries[b][i];
                    dc.terrain.surfacePointForMode(posB.latitude, posB.longitude, posB.altitude, this._altitudeMode, ptB);
                    eyeDistance = navState.eyePoint.distanceTo(ptA);
                    pixelSize = navState.pixelSizeAtDistance(eyeDistance);
                    if (ptA.distanceTo(ptB) < pixelSize * 8 && this.altitudeMode !== WorldWind.ABSOLUTE) {
                        tessellatedPositions[b].push(posB); // distance is short so no need for sub-segments
                    } else {
                        this.makeSegment(dc, posA, posB, ptA, ptB, tessellatedPositions[b]);
                    }

                    posA = posB;
                    ptA.copy(ptB);

                    if (showVerticals) {
                        var k = 2 * (tessellatedPositions[b].length - 1);
                        this.currentData.verticalIndices[b][i * 2] = k;
                        this.currentData.verticalIndices[b][i * 2 + 1] = k + 1;
                    }
                }

                // Close the polygon.
                posA = this._boundaries[b][this._boundaries[b].length - 1];
                tessellatedPositions[b].push(posA);
                dc.terrain.surfacePointForMode(posA.latitude, posA.longitude, posA.altitude, this._altitudeMode, ptA);

                posB = this._boundaries[b][0];
                dc.terrain.surfacePointForMode(posB.latitude, posB.longitude, posB.altitude, this._altitudeMode, ptB);
                eyeDistance = navState.eyePoint.distanceTo(ptA);
                pixelSize = navState.pixelSizeAtDistance(eyeDistance);
                if (ptA.distanceTo(ptB) < pixelSize * 8 && this.altitudeMode !== WorldWind.ABSOLUTE) {
                    tessellatedPositions[b].push(posB); // distance is short so no need for sub-segments
                } else {
                    this.makeSegment(dc, posA, posB, ptA, ptB, tessellatedPositions[b]);
                }
            }

            return tessellatedPositions;
        };

        // Private. Intentionally not documented.
        Polygon.prototype.makeSegment = function (dc, posA, posB, ptA, ptB, tessellatedPositions) {
            var navState = dc.navigatorState,
                eyePoint = navState.eyePoint,
                pos = new Location(0, 0),
                height = 0,
                arcLength, segmentAzimuth, segmentDistance, s, p, distance;

            // If it's just a straight line and not terrain following, then the segment is just two points.
            if (this._pathType === WorldWind.LINEAR && !this._followTerrain) {
                if (!ptA.equals(ptB)) {
                    tessellatedPositions.push(posB);
                }
                return;
            }

            // Compute the segment length.

            if (this._pathType === WorldWind.LINEAR) {
                segmentDistance = Location.linearDistance(posA, posB);
            } else if (this._pathType === WorldWind.RHUMB_LINE) {
                segmentDistance = Location.rhumbDistance(posA, posB);
            } else {
                segmentDistance = Location.greatCircleDistance(posA, posB);
            }

            if (this._altitudeMode !== WorldWind.CLAMP_TO_GROUND) {
                height = 0.5 * (posA.altitude + posB.altitude);
            }

            arcLength = segmentDistance * (dc.globe.equatorialRadius + height * dc.verticalExaggeration);

            if (arcLength <= 0) { // segment is 0 length
                return;
            }

            // Compute the azimuth to apply while tessellating the segment.

            if (this._pathType === WorldWind.LINEAR) {
                segmentAzimuth = Location.linearAzimuth(posA, posB);
            } else if (this._pathType === WorldWind.RHUMB_LINE) {
                segmentAzimuth = Location.rhumbAzimuth(posA, posB);
            } else {
                segmentAzimuth = Location.greatCircleAzimuth(posA, posB);
            }

            this.scratchPoint.copy(ptA);
            for (s = 0, p = 0; s < 1;) {
                if (this._followTerrain) {
                    p += this._terrainConformance * navState.pixelSizeAtDistance(this.scratchPoint.distanceTo(eyePoint));
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

                tessellatedPositions.push(new Position(pos.latitude, pos.longitude, pos.altitude));

                if (this._followTerrain) {
                    // Compute a new reference point for eye distance.
                    dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, pos.altitude,
                        WorldWind.CLAMP_TO_GROUND, this.scratchPoint);
                }
            }
        };

        // Private. Intentionally not documented.
        Polygon.prototype.computeRenderedPath = function (dc, tessellatedPositions) {
            var capturePoles = this.mustDrawInterior(dc) || this.mustDrawVerticals(dc),
                eyeDistSquared = Number.MAX_VALUE,
                eyePoint = dc.navigatorState.eyePoint,
                tessellatedPoints = [],
                stride = capturePoles ? 6 : 3,
                pt = new Vec3(0, 0, 0),
                numPoints, altitudeMode, pos, k, dSquared;

            if (this._followTerrain && this.altitudeMode !== WorldWind.CLAMP_TO_GROUND) {
                altitudeMode = WorldWind.RELATIVE_TO_GROUND;
            } else {
                altitudeMode = this.altitudeMode;
            }

            for (var b = 0; b < tessellatedPositions.length; b++) {
                numPoints = (capturePoles ? 2 : 1) * tessellatedPositions[b].length;
                tessellatedPoints[b] = new Float32Array(numPoints * 3);

                for (var i = 0, len = tessellatedPositions[b].length; i < len; i++) {
                    pos = tessellatedPositions[b][i];

                    dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, pos.altitude, altitudeMode, pt);

                    dSquared = pt.distanceToSquared(eyePoint);
                    if (dSquared < eyeDistSquared) {
                        eyeDistSquared = dSquared;
                    }

                    pt.subtract(this.currentData.referencePoint);

                    k = stride * i;
                    tessellatedPoints[b][k] = pt[0];
                    tessellatedPoints[b][k + 1] = pt[1];
                    tessellatedPoints[b][k + 2] = pt[2];

                    if (capturePoles) {
                        dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, 0, WorldWind.CLAMP_TO_GROUND, pt);

                        dSquared = pt.distanceToSquared(eyePoint);
                        if (dSquared < eyeDistSquared) {
                            eyeDistSquared = dSquared;
                        }

                        pt.subtract(this.currentData.referencePoint);

                        tessellatedPoints[b][k + 3] = pt[0];
                        tessellatedPoints[b][k + 4] = pt[1];
                        tessellatedPoints[b][k + 5] = pt[2];
                    }
                }
            }

            this.currentData.pointBufferHasExtrusionPoints = capturePoles;
            this.currentData.eyeDistance = Math.sqrt(eyeDistSquared);

            return tessellatedPoints;
        };

        // Private. Intentionally not documented.
        Polygon.prototype.mustDrawInterior = function (dc) {
            return this.activeAttributes.drawInterior && this._altitudeMode !== WorldWind.CLAMP_TO_GROUND;
        };

        // Private. Intentionally not documented.
        Polygon.prototype.mustDrawVerticals = function (dc) {
            return this.activeAttributes.drawOutline && this.activeAttributes.drawVerticals
                && this.altitudeMode !== WorldWind.CLAMP_TO_GROUND;
        };

        // Overridden from AbstractShape base class.
        Polygon.prototype.doRenderOrdered = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.currentProgram,
                currentData = this.currentData,
                numPoints, vboId, opacity, color, pickColor, stride, nPts;

            this.applyMvpMatrix(dc);

            if (!currentData.vboCacheKey) {
                this.currentData.vboCacheKey = [];
            }

            if (this.mustDrawVerticals(dc)) {
                if (!currentData.verticalIndicesVboCacheKey) {
                    currentData.verticalIndicesVboCacheKey = [];
                }
            }

            program.loadTextureEnabled(gl, false);

            if (dc.pickingMode) {
                pickColor = dc.uniquePickColor();
            }

            for (var b = 0; b < currentData.tessellatedPoints.length; b++) {
                numPoints = currentData.tessellatedPoints[b].length / 3;

                if (!currentData.vboCacheKey[b]) {
                    currentData.vboCacheKey[b] = dc.gpuResourceCache.generateCacheKey();
                }

                vboId = dc.gpuResourceCache.resourceForKey(currentData.vboCacheKey[b]);
                if (!vboId) {
                    vboId = gl.createBuffer();
                    dc.gpuResourceCache.putResource(currentData.vboCacheKey[b], vboId,
                        currentData.tessellatedPoints[b].length * 4);
                    currentData.fillVbo = true;
                }

                // Bind and if necessary fill the VBO. We fill the VBO here rather than in doMakeOrderedRenderable so that
                // there's no possibility of the VBO being ejected from the cache between the time it's filled and
                // the time it's used.
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vboId);
                if (currentData.fillVbo) {
                    gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, currentData.tessellatedPoints[b],
                        WebGLRenderingContext.STATIC_DRAW);
                    dc.frameStatistics.incrementVboLoadCount(1);
                }

                if (this.mustDrawInterior(dc)) {
                    color = this.activeAttributes.interiorColor;
                    opacity = color.alpha * dc.currentLayer.opacity;
                    // Disable writing the shape's fragments to the depth buffer when the interior is semi-transparent.
                    if (opacity < 1 && !dc.pickingMode) {
                        gl.depthMask(false);
                    }
                    program.loadColor(gl, dc.pickingMode ? pickColor : color);
                    program.loadOpacity(gl, dc.pickingMode ? (opacity > 0 ? 1 : 0) : opacity);

                    gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);
                    gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, numPoints);
                }

                if (this.activeAttributes.drawOutline) {
                    if ((this.mustDrawVerticals(dc) && this.mustDrawInterior(dc))
                        || this.altitudeMode === WorldWind.CLAMP_TO_GROUND) {
                        // Make the verticals stand out from the interior, or the outline stand out from the terrain.
                        this.applyMvpMatrixForOutline(dc);
                    }

                    color = this.activeAttributes.outlineColor;
                    opacity = color.alpha * dc.currentLayer.opacity;
                    // Disable writing the shape's fragments to the depth buffer when the interior is semi-transparent.
                    if (opacity < 1 && !dc.pickingMode) {
                        gl.depthMask(false);
                    }
                    program.loadColor(gl, dc.pickingMode ? pickColor : color);
                    program.loadOpacity(gl, dc.pickingMode ? 1 : opacity);

                    gl.lineWidth(this.activeAttributes.outlineWidth);

                    if (this.currentData.pointBufferHasExtrusionPoints) {
                        stride = 24;
                        nPts = numPoints / 2;
                    } else {
                        stride = 12;
                        nPts = numPoints;
                    }

                    gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, stride, 0);
                    gl.drawArrays(WebGLRenderingContext.LINE_STRIP, 0, nPts);

                    if (this.mustDrawVerticals(dc)) {
                        if (!currentData.verticalIndicesVboCacheKey[b]) {
                            currentData.verticalIndicesVboCacheKey[b] = dc.gpuResourceCache.generateCacheKey();
                        }

                        vboId = dc.gpuResourceCache.resourceForKey(currentData.verticalIndicesVboCacheKey[b]);
                        if (!vboId) {
                            vboId = gl.createBuffer();
                            dc.gpuResourceCache.putResource(currentData.verticalIndicesVboCacheKey[b], vboId,
                                currentData.verticalIndices[b].length * 4);
                            currentData.fillVbo = true;
                        }

                        gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, vboId);
                        if (currentData.fillVbo) {
                            gl.bufferData(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, currentData.verticalIndices[b],
                                WebGLRenderingContext.STATIC_DRAW);
                            dc.frameStatistics.incrementVboLoadCount(1);
                        }

                        gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);
                        gl.drawElements(WebGLRenderingContext.LINES, currentData.verticalIndices[b].length,
                            WebGLRenderingContext.UNSIGNED_SHORT, 0);
                    }
                }
            }
            currentData.fillVbo = false;

            if (dc.pickingMode) {
                var po = new PickedObject(pickColor, this.pickDelegate ? this.pickDelegate : this, null, dc.currentLayer,
                    false);
                dc.resolvePick(po);
            }
        };

        // Overridden from AbstractShape base class.
        Polygon.prototype.beginDrawing = function (dc) {
            var gl = dc.currentGlContext;

            if (this.mustDrawInterior(dc)) {
                gl.disable(WebGLRenderingContext.CULL_FACE);
            }

            dc.findAndBindProgram(gl, BasicTextureProgram);
            gl.enableVertexAttribArray(dc.currentProgram.vertexPointLocation);
        };

        // Overridden from AbstractShape base class.
        Polygon.prototype.endDrawing = function (dc) {
            var gl = dc.currentGlContext;

            gl.disableVertexAttribArray(dc.currentProgram.vertexPointLocation);
            dc.bindProgram(gl, null);
            gl.depthMask(true);
            gl.lineWidth(1);
            gl.enable(WebGLRenderingContext.CULL_FACE);
        };

        return Polygon;
    });