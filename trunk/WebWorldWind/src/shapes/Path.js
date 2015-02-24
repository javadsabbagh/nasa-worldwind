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
        '../geom/Location',
        '../util/Logger',
        '../geom/Matrix',
        '../pick/PickedObject',
        '../geom/Position',
        '../geom/Vec2',
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (AbstractShape,
              ArgumentError,
              BasicTextureProgram,
              Color,
              Location,
              Logger,
              Matrix,
              PickedObject,
              Position,
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

            this._pathType = WorldWind.GREAT_CIRCLE;

            this._terrainConformance = 10;

            this._numSubSegments = 10;
        };

        Path.scratchMatrix = Matrix.fromIdentity(); // scratch variable

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

        Path.prototype.doMakeOrderedRenderable = function (dc) {
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
            //this.currentData.extent.setToPoints(tessellatedPoints); TODO
            //this.currentData.extent.translate(this.currentData.referencePoint);

            return this;
        };

        Path.prototype.makeTessellatedPositions = function (dc) {
            var tessellatedPositions = [],
                navState = dc.navigatorState,
                showVerticals = this.mustDrawVerticals(dc),
                ptA = new Vec3(0, 0, 0),
                ptB = new Vec3(0, 0, 0),
                posA = this._positions[0],
                posB, eyeDistance, pixelSize;

            if (showVerticals) {
                this.currentData.verticalIndices = new Int16Array(this.positions.length * 2);
                this.currentData.verticalIndices[0] = 0;
                this.currentData.verticalIndices[1] = 1;
            }

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

                if (showVerticals) {
                    var k = 2 * (tessellatedPositions.length - 1);
                    this.currentData.verticalIndices[i * 2] = k;
                    this.currentData.verticalIndices[i * 2 + 1] = k + 1;
                }
            }

            return tessellatedPositions;
        };

        Path.prototype.makeSegment = function (dc, posA, posB, ptA, ptB, tessellatedPositions) {
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

                tessellatedPositions.push(new Position(pos.latitude, pos.longitude, pos.altitude));

                ptA = ptB;
            }
        };

        Path.prototype.computeRenderedPath = function (dc, tessellatedPositions) {
            var extrudeIt = this.mustDrawInterior(dc),
                eyeDistSquared = Number.MAX_VALUE,
                eyePoint = dc.navigatorState.eyePoint,
                numPoints = (extrudeIt ? 2 : 1) * tessellatedPositions.length,
                tessellatedPoints = new Float32Array(numPoints * 3),
                stride = extrudeIt ? 6 : 3,
                pt = new Vec3(0, 0, 0),
                pos, k, dSquared;

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
                    dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, 0, WorldWind.CLAMP_TO_GROUND, pt);

                    dSquared = pt.distanceToSquared(eyePoint);
                    if (dSquared < eyeDistSquared) {
                        eyeDistSquared = dSquared;
                    }

                    pt.subtract(this.currentData.referencePoint);

                    tessellatedPoints[k + 3] = pt[0];
                    tessellatedPoints[k + 4] = pt[1];
                    tessellatedPoints[k + 5] = pt[2];
                }
            }

            this.currentData.eyeDistance = Math.sqrt(eyeDistSquared);

            return tessellatedPoints;
        };

        Path.prototype.mustDrawInterior = function (dc) {
            return this.activeAttributes.drawInterior && !(this._altitudeMode === WorldWind.CLAMP_TO_GROUND);
        };

        Path.prototype.mustDrawVerticals = function (dc) {
            return this.mustDrawInterior(dc) && this.activeAttributes.drawOutline;
        };

        Path.prototype.doRenderOrdered = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.currentProgram,
                currentData = this.currentData,
                numPoints = currentData.tessellatedPoints.length / 3,
                vboId, opacity, color, pickColor, extrudeIt, stride, nPts;

            this.applyMvpMatrix(dc);

            if (!currentData.vboKey) {
                currentData.vboKey = dc.gpuResourceCache.generateCacheKey();
            }

            vboId = dc.gpuResourceCache.resourceForKey(currentData.vboKey);
            if (!vboId) {
                vboId = gl.createBuffer();
                dc.gpuResourceCache.putResource(currentData.vboKey, vboId, numPoints * 3 * 4);

                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vboId);
                gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, currentData.tessellatedPoints,
                    WebGLRenderingContext.STATIC_DRAW);
            } else{
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vboId);
                gl.bufferSubData(WebGLRenderingContext.ARRAY_BUFFER, 0, currentData.tessellatedPoints);
            }

            program.loadTextureEnabled(gl, false);

            if (dc.pickingMode) {
                pickColor = dc.uniquePickColor();
            }

            if (this.mustDrawInterior(dc)) {
                extrudeIt = true;
                color = this.activeAttributes.interiorColor;
                opacity = color.alpha * dc.currentLayer.opacity;
                // Disable writing the shape's fragments to the depth buffer when the interior is semi-transparent.
                if (opacity < 1 && !dc.pickingMode) {
                    gl.depthMask(false);
                }
                program.loadColor(gl, dc.pickingMode ? pickColor : color);
                program.loadOpacity(gl, opacity);

                gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);
                gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, numPoints);
            }

            if (this.activeAttributes.drawOutline) {
                color = this.activeAttributes.outlineColor;
                opacity = color.alpha * dc.currentLayer.opacity;
                // Disable writing the shape's fragments to the depth buffer when the interior is semi-transparent.
                if (opacity < 1 && !dc.pickingMode) {
                    gl.depthMask(false);
                }
                program.loadColor(gl, dc.pickingMode ? pickColor : color);
                program.loadOpacity(gl, opacity);

                gl.lineWidth(this.activeAttributes.outlineWidth);

                stride = extrudeIt ? 24 : 12;
                nPts = extrudeIt ? numPoints / 2 : numPoints;

                gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, stride, 0);
                gl.drawArrays(WebGLRenderingContext.LINE_STRIP, 0, nPts);

                if (this.mustDrawVerticals(dc)) {
                    this.applyMvpMatrixForVerticals(dc);

                    if (!currentData.verticalIndicesCacheKey) {
                        currentData.verticalIndicesCacheKey = dc.gpuResourceCache.generateCacheKey();
                    }

                    vboId = dc.gpuResourceCache.resourceForKey(currentData.verticalIndicesCacheKey);
                    if (!vboId) {
                        vboId = gl.createBuffer();
                        dc.gpuResourceCache.putResource(currentData.verticalIndicesCacheKey, vboId,
                            currentData.verticalIndices.length * 4);

                        gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, vboId);
                        gl.bufferData(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, currentData.verticalIndices,
                            WebGLRenderingContext.STATIC_DRAW);
                    } else {
                        gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, vboId);
                        gl.bufferSubData(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, 0, currentData.verticalIndices);
                    }

                    gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);
                    gl.drawElements(WebGLRenderingContext.LINES, currentData.verticalIndices.length,
                        WebGLRenderingContext.UNSIGNED_SHORT, 0);
                }
            }

            if (dc.pickingMode) {
                var po = new PickedObject(pickColor, this.pickDelegate ? this.pickDelegate : this, null, dc.currentLayer,
                    false);
                dc.resolvePick(po);
            }
        };

        Path.prototype.beginDrawing = function (dc) {
            var gl = dc.currentGlContext;

            if (this.mustDrawInterior(dc)) {
                gl.disable(WebGLRenderingContext.CULL_FACE);
            }

            dc.findAndBindProgram(gl, BasicTextureProgram);
            gl.enableVertexAttribArray(dc.currentProgram.vertexPointLocation);
        };

        Path.prototype.endDrawing = function (dc) {
            var gl = dc.currentGlContext;

            gl.disableVertexAttribArray(dc.currentProgram.vertexPointLocation);
            dc.bindProgram(gl, null);
            gl.depthMask(true);
            gl.lineWidth(1);
            gl.enable(WebGLRenderingContext.CULL_FACE);
        };

        Path.prototype.applyMvpMatrix = function (dc) {
            Path.scratchMatrix.setToMatrix(dc.navigatorState.modelviewProjection);
            Path.scratchMatrix.multiplyMatrix(this.currentData.transformationMatrix);
            dc.currentProgram.loadModelviewProjection(dc.currentGlContext, Path.scratchMatrix);
        };

        Path.prototype.applyMvpMatrixForVerticals = function (dc) {
            Path.scratchMatrix.setToMatrix(dc.navigatorState.projection);
            Path.scratchMatrix.offsetProjectionDepth(-0.001);
            Path.scratchMatrix.multiplyMatrix(dc.navigatorState.modelview);
            Path.scratchMatrix.multiplyMatrix(this.currentData.transformationMatrix);
            dc.currentProgram.loadModelviewProjection(dc.currentGlContext, Path.scratchMatrix);
        };

        return Path;
    });