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
        '../geom/Location',
        '../util/Logger',
        '../geom/Matrix',
        '../pick/PickedObject',
        '../geom/Position',
        '../shapes/ShapeAttributes',
        '../geom/Vec2',
        '../geom/Vec3',
        '../util/libtess'
    ],
    function (AbstractShape,
              ArgumentError,
              BasicTextureProgram,
              BoundingBox,
              Color,
              Location,
              Logger,
              Matrix,
              PickedObject,
              Position,
              ShapeAttributes,
              Vec2,
              Vec3,
              libtessDummy) {
        "use strict";

        /**
         * Constructs a Polygon.
         * @alias Polygon
         * @constructor
         * @augments AbstractShape
         * @classdesc Represents a 3D polygon. The polygon may be extruded to the ground to form a prism. It may have
         * multiple boundaries defining empty portions. See also {@link SurfacePolygon}.
         * <p>
         *     Altitudes within the polygon's positions are interpreted according to the polygon's altitude mode, which
         *     can be one of the following:
         * <ul>
         *     <li>[WorldWind.ABSOLUTE]{@link WorldWind#ABSOLUTE}</li>
         *     <li>[WorldWind.RELATIVE_TO_GROUND]{@link WorldWind#RELATIVE_TO_GROUND}</li>
         *     <li>[WorldWind.CLAMP_TO_GROUND]{@link WorldWind#CLAMP_TO_GROUND}</li>
         * </ul>
         * If the latter, the polygon positions' altitudes are ignored. (If the polygon should be draped onto the
         * terrain, you might want to use {@link SurfacePolygon} instead.)
         * <p>
         *     Polygons have separate attributes for normal display and highlighted display. They use the interior and
         *     outline attributes of {@link ShapeAttributes}. If those attributes identify an image, that image is
         *     applied to the polygon.
         * <p>
         *     A polygon displays as a vertical prism if its [extrude]{@link Polygon#extrude} property is true. A
         *     curtain is formed around its boundaries and extends from the polygon's edges to the ground.
         * <p>
         *     A polygon can be textured, including its extruded boundaries. The textures are specified via the
         *     [imageSource]{@link ShapeAttributes#imageSource} property of the polygon's attributes. If that
         *     property is a single string, then it identifies the image source for the polygon's texture. If that
         *     property is an array of strings, then the first entry in the array specifies the polygon's image
         *     source and subsequent entries specify the image sources of the polygon's extruded boundaries. If the
         *     array contains two entries, the first is the polygon's image source and the second is the common image
         *     source for all extruded boundaries. If the array contains more than two entries, then the first entry
         *     is the polygon's image source and each subsequent entry is the image source for consecutive extruded
         *     boundary segments. A null value for any entry indicates that no texture is applied for the corresponding
         *     polygon or extruded edge segment. Texture coordinates for the polygon's texture are specified via this
         *     polygon's [textureCoordinates]{@link Polygon#textureCoordinates} property. Texture coordinates for
         *     extruded boundary segments are implicitly defined to fit the full texture to each boundary segment.
         *     The imageOffset and imageScale properties of this polygon's shape attributes are not utilized.
         * <p>
         *     When displayed on a 2D globe, this polygon displays as a {@link SurfacePolygon}.
         *
         * @param {Position[][]} boundaries A two-dimensional array containing the polygon boundaries. Each entry of the
         * array specifies the vertices for one boundary of the polygon, in geographic coordinates. The first boundary
         * in the array is considered the outer boundary for the purpose of calculating the polygon's extent.
         * @throws {ArgumentError} If the specified boundaries array is null or undefined.
         */
        var Polygon = function (boundaries) {
            if (!boundaries) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Polygon", "constructor", "missingBoundaries"));
            }

            AbstractShape.call(this);

            // Private. Documentation is with the defined property below and the constructor description above.
            this._boundaries = boundaries;

            this._textureCoordinates = null;

            this.referencePosition = this.determineReferencePosition(this._boundaries);

            this._extrude = false;

            this.scratchPoint = new Vec3(0, 0, 0); // scratch variable
        };

        Polygon.prototype = Object.create(AbstractShape.prototype);

        Object.defineProperties(Polygon.prototype, {
            /**
             * This polygon's boundaries. See the description of the boundaries argument in the constructor.
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
                    this.referencePosition = this.determineReferencePosition(this._boundaries);
                    this.reset();
                }
            },

            /**
             * This polygon's texture coordinates if this polygon is to be textured. A texture coordinate must be
             * provided for each boundary position. The texture coordinates are specified in the same arrangement
             * as the boundaries, with a two-dimensional array, each entry of which specifies the texture coordinates
             * for one boundary. Each texture coordinate is a {@link Vec2} containing the s and t coordinates.
             * @type {Vec2[][]}
             * @default null
             */
            textureCoordinates: {
                get: function () {
                    return this._textureCoordinates;
                },
                set: function (value) {
                    this._textureCoordinates = value;
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

        // Intentionally not documented.
        Polygon.prototype.determineReferencePosition = function (boundaries) {
            // Assign the first position as the reference position.
            return (boundaries.length > 0 && boundaries[0].length > 2) ? boundaries[0][0] : null;
        };

        // Internal. Determines whether this shape's geometry must be re-computed.
        Polygon.prototype.mustGenerateGeometry = function (dc) {
            if (!this.currentData.boundaryPoints) {
                return true;
            }

            if (this.currentData.drawInterior !== this.activeAttributes.drawInterior) {
                return true;
            }

            if (this.altitudeMode === WorldWind.ABSOLUTE) {
                return false;
            }

            return this.currentData.isExpired
        };

        Polygon.prototype.hasCapTexture = function () {
            return this.activeAttributes.imageSource && this.textureCoordinates;
        };

        Polygon.prototype.determineActiveAttributes = function (dc) {
            AbstractShape.prototype.determineActiveAttributes.call(this, dc);

            if (this.activeAttributes && this.hasCapTexture()) {
                this.activeTexture = dc.gpuResourceCache.resourceForKey(this.activeAttributes.imageSource);

                if (!this.activeTexture) {
                    dc.gpuResourceCache.retrieveTexture(dc.currentGlContext, this.activeAttributes.imageSource);
                }
            }
        };

        // Overridden from AbstractShape base class.
        Polygon.prototype.doMakeOrderedRenderable = function (dc) {
            // A null reference position is a signal that there are no boundaries to render.
            if (!this.referencePosition) {
                return null;
            }

            if (!this.activeAttributes.drawInterior && !this.activeAttributes.drawOutline) {
                return null;
            }

            // See if the current shape data can be re-used.
            if (!this.mustGenerateGeometry(dc)) {
                return this;
            }

            var currentData = this.currentData;

            // Set the transformation matrix to correspond to the reference position.
            var refPt = currentData.referencePoint;
            dc.terrain.surfacePointForMode(this.referencePosition.latitude, this.referencePosition.longitude,
                this.referencePosition.altitude, this._altitudeMode, refPt);
            currentData.transformationMatrix.setToTranslation(refPt[0], refPt[1], refPt[2]);

            // Close the boundaries.
            var fullBoundaries = [];
            for (var b = 0; b < this._boundaries.length; b++) {
                fullBoundaries[b] = this._boundaries[b].slice(0); // clones the array
                fullBoundaries[b].push(this._boundaries[b][0]); // appends the first position to the boundary
            }

            // Convert the geographic coordinates to the Cartesian coordinates that will be rendered.
            var boundaryPoints = this.computeBoundaryPoints(dc, fullBoundaries);

            // Tessellate the polygon if its interior is to be drawn.
            if (this.activeAttributes.drawInterior) {
                var capVertices = this.tessellatePolygon(dc, boundaryPoints);
                if (capVertices) {
                    // Must copy the vertices to a typed array. (Can't use typed array to begin with because its size
                    // is unknown prior to tessellation.)
                    currentData.capTriangles = new Float32Array(capVertices.length);
                    for (var i = 0, len = capVertices.length; i < len; i++) {
                        currentData.capTriangles[i] = capVertices[i];
                    }
                }
            }

            currentData.boundaryPoints = boundaryPoints;
            currentData.drawInterior = this.activeAttributes.drawInterior; // remember for validation
            this.resetExpiration(currentData);
            currentData.refreshBuffers = true; // causes VBOs to be reloaded

            // Create the extent from the Cartesian points. Those points are relative to this path's reference point,
            // so translate the computed extent to the reference point.
            if (!currentData.extent) {
                currentData.extent = new BoundingBox();
            }
            currentData.extent.setToPoints(boundaryPoints[0]); // use only the first boundary
            currentData.extent.translate(currentData.referencePoint);

            return this;
        };

        // Private. Intentionally not documented.
        Polygon.prototype.computeBoundaryPoints = function (dc, boundaries) {
            var eyeDistSquared = Number.MAX_VALUE,
                eyePoint = dc.navigatorState.eyePoint,
                boundaryPoints = [],
                stride = this._extrude ? 6 : 3,
                pt = new Vec3(0, 0, 0),
                numPoints, pos, k, dSquared;

            for (var b = 0; b < boundaries.length; b++) {
                numPoints = (this._extrude ? 2 : 1) * boundaries[b].length;
                boundaryPoints[b] = new Float32Array(numPoints * 3);

                for (var i = 0, len = boundaries[b].length; i < len; i++) {
                    pos = boundaries[b][i];

                    dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, pos.altitude, this.altitudeMode, pt);

                    dSquared = pt.distanceToSquared(eyePoint);
                    if (dSquared < eyeDistSquared) {
                        eyeDistSquared = dSquared;
                    }

                    pt.subtract(this.currentData.referencePoint);

                    k = stride * i;
                    boundaryPoints[b][k] = pt[0];
                    boundaryPoints[b][k + 1] = pt[1];
                    boundaryPoints[b][k + 2] = pt[2];

                    if (this._extrude) {
                        dc.terrain.surfacePointForMode(pos.latitude, pos.longitude, 0, WorldWind.CLAMP_TO_GROUND, pt);

                        dSquared = pt.distanceToSquared(eyePoint);
                        if (dSquared < eyeDistSquared) {
                            eyeDistSquared = dSquared;
                        }

                        pt.subtract(this.currentData.referencePoint);

                        boundaryPoints[b][k + 3] = pt[0];
                        boundaryPoints[b][k + 4] = pt[1];
                        boundaryPoints[b][k + 5] = pt[2];
                    }
                }
            }

            this.currentData.eyeDistance = Math.sqrt(eyeDistSquared);

            return boundaryPoints;
        };

        Polygon.prototype.tessellatePolygon = function (dc, boundaryPoints) {
            var triangles = [], // the output list of triangles
                error = 0,
                stride = this._extrude ? 6 : 3,
                includeTextureCoordinates = this.hasCapTexture(),
                coords, normal;

            if (!this.polygonTessellator) {
                this.polygonTessellator = new libtess.GluTesselator();

                this.polygonTessellator.gluTessCallback(libtess.gluEnum.GLU_TESS_VERTEX_DATA,
                    function (data, tris) {
                        tris[tris.length] = data[0];
                        tris[tris.length] = data[1];
                        tris[tris.length] = data[2];

                        if (includeTextureCoordinates) {
                            tris[tris.length] = data[3];
                            tris[tris.length] = data[4];
                        }
                    });

                this.polygonTessellator.gluTessCallback(libtess.gluEnum.GLU_TESS_COMBINE,
                    function (coords, data, weight) {
                        var newCoords = [coords[0], coords[1], coords[2]];

                        if (includeTextureCoordinates) {
                            for (var i = 3; i <= 4; i++) {
                                var value = 0;
                                for (var w = 0; w < 4; w++) {
                                    if (weight[w] > 0) {
                                        value += weight[w] * data[w][i];
                                    }
                                }

                                newCoords[i] = value;
                            }
                        }

                        return newCoords;
                    });

                this.polygonTessellator.gluTessCallback(libtess.gluEnum.GLU_TESS_ERROR,
                    function (errno) {
                        error = errno;
                        Logger.logMessage(Logger.LEVEL_WARNING, "Polygon", "tessellatePolygon",
                            "Tessellation error " + errno + ".");
                    });
            }

            // Compute a normal vector for the polygon.
            normal = Vec3.computeBufferNormal(boundaryPoints[0], stride);
            if (!normal) {
                // The first boundary is colinear. Fall back to the surface normal.
                dc.globe.surfaceNormalAtLocation(this.referencePosition.latitude, this.referencePosition.longitude,
                    normal);
            }
            this.polygonTessellator.gluTessNormal(normal[0], normal[1], normal[2]);

            // Tessellate the polygon.
            this.polygonTessellator.gluTessBeginPolygon(triangles);
            for (var b = 0; b < boundaryPoints.length; b++) {
                var t = 0;
                this.polygonTessellator.gluTessBeginContour();
                var contour = boundaryPoints[b];
                for (var c = 0; c < contour.length; c += stride) {
                    coords = [contour[c], contour[c + 1], contour[c + 2]];
                    if (includeTextureCoordinates) {
                        if (t < this.textureCoordinates[b].length) {
                            coords[3] = this.textureCoordinates[b][t][0];
                            coords[4] = this.textureCoordinates[b][t][1];
                        } else {
                            coords[3] = this.textureCoordinates[b][0][0];
                            coords[4] = this.textureCoordinates[b][1][1];
                        }
                        ++t;
                    }
                    this.polygonTessellator.gluTessVertex(coords, coords);
                }
                this.polygonTessellator.gluTessEndContour();
            }
            this.polygonTessellator.gluTessEndPolygon();

            return error === 0 ? triangles : null;
        };

        // Private. Intentionally not documented.
        Polygon.prototype.mustDrawVerticals = function (dc) {
            return this._extrude
                && this.activeAttributes.drawOutline
                && this.activeAttributes.drawVerticals
                && this.altitudeMode !== WorldWind.CLAMP_TO_GROUND;
        };

        // Overridden from AbstractShape base class.
        Polygon.prototype.doRenderOrdered = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.currentProgram,
                currentData = this.currentData,
                refreshBuffers = currentData.refreshBuffers,
                numPoints, vboId, opacity, color, pickColor, stride, nPts, textureBound = false;

            program.loadTextureEnabled(gl, false);

            if (dc.pickingMode) {
                pickColor = dc.uniquePickColor();
            }

            if (this.activeAttributes.drawInterior && currentData.capTriangles) {
                this.applyMvpMatrix(dc);

                if (!currentData.capVboCacheKey) {
                    currentData.capVboCacheKey = dc.gpuResourceCache.generateCacheKey();
                }

                vboId = dc.gpuResourceCache.resourceForKey(currentData.capVboCacheKey);
                if (!vboId) {
                    vboId = gl.createBuffer();
                    dc.gpuResourceCache.putResource(currentData.capVboCacheKey, vboId,
                        currentData.capTriangles.length * 4);
                    refreshBuffers = true;
                }

                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vboId);
                if (refreshBuffers) {
                    gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, currentData.capTriangles,
                        WebGLRenderingContext.STATIC_DRAW);
                    dc.frameStatistics.incrementVboLoadCount(1);
                }

                color = this.activeAttributes.interiorColor;
                opacity = color.alpha * dc.currentLayer.opacity;
                // Disable writing the shape's fragments to the depth buffer when the interior is semi-transparent.
                gl.depthMask(opacity >= 1 || dc.pickingMode);
                program.loadColor(gl, dc.pickingMode ? pickColor : color);
                program.loadOpacity(gl, dc.pickingMode ? (opacity > 0 ? 1 : 0) : opacity);

                stride = this.hasCapTexture() ? 20 : 12;

                if (this.activeTexture) {
                    textureBound = this.activeTexture.bind(dc);
                    if (textureBound) {
                        program.loadTextureEnabled(gl, true);
                        gl.enableVertexAttribArray(program.vertexTexCoordLocation);
                        gl.vertexAttribPointer(program.vertexTexCoordLocation, 2, WebGLRenderingContext.FLOAT, false,
                            stride, 12);
                        program.loadTextureUnit(gl, WebGLRenderingContext.TEXTURE0);
                        program.loadModulateColor(gl, dc.pickingMode);
                    }
                }

                gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, stride, 0);
                gl.drawArrays(WebGLRenderingContext.TRIANGLES, 0, 4 * (currentData.capTriangles.length / stride));
            }

            // Draw the extruded boundaries and/or the outline.
            if ((this._extrude && this.activeAttributes.drawInterior) || this.activeAttributes.drawOutline) {
                if (!currentData.boundaryVboCacheKeys) {
                    this.currentData.boundaryVboCacheKeys = [];
                }

                program.loadTextureEnabled(gl, false);
                gl.disableVertexAttribArray(program.vertexTexCoordLocation);

                for (var b = 0; b < currentData.boundaryPoints.length; b++) { // for each boundary
                    // The sides and outline use the same vertices, those of the individual boundaries.
                    // Set up that data here for common use below.

                    numPoints = currentData.boundaryPoints[b].length / 3;

                    if (!currentData.boundaryVboCacheKeys[b]) {
                        currentData.boundaryVboCacheKeys[b] = dc.gpuResourceCache.generateCacheKey();
                    }

                    vboId = dc.gpuResourceCache.resourceForKey(currentData.boundaryVboCacheKeys[b]);
                    if (!vboId) {
                        vboId = gl.createBuffer();
                        dc.gpuResourceCache.putResource(currentData.boundaryVboCacheKeys[b], vboId, numPoints * 12);
                        refreshBuffers = true;
                    }

                    // Bind and if necessary fill the VBO. We fill the VBO here rather than in doMakeOrderedRenderable
                    // so that there's no possibility of the VBO being ejected from the cache between the time it's
                    // filled and the time it's used.
                    gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vboId);
                    if (refreshBuffers) {
                        gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, currentData.boundaryPoints[b],
                            WebGLRenderingContext.STATIC_DRAW);
                        dc.frameStatistics.incrementVboLoadCount(1);
                    }

                    // Draw the extruded boundary.
                    if (this.activeAttributes.drawInterior && this._extrude) {
                        this.applyMvpMatrix(dc);

                        color = this.activeAttributes.interiorColor;
                        opacity = color.alpha * dc.currentLayer.opacity;
                        // Disable writing the shape's fragments to the depth buffer when the interior is
                        // semi-transparent.
                        gl.depthMask(opacity >= 1 || dc.pickingMode);
                        program.loadColor(gl, dc.pickingMode ? pickColor : color);
                        program.loadOpacity(gl, dc.pickingMode ? (opacity > 0 ? 1 : 0) : opacity);

                        gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);
                        gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, numPoints);
                    }

                    // Draw the outline for this boundary.
                    if (this.activeAttributes.drawOutline) {
                        // Make the outline stand out from the interior.
                        this.applyMvpMatrixForOutline(dc);
                        program.loadTextureEnabled(gl, false);

                        color = this.activeAttributes.outlineColor;
                        opacity = color.alpha * dc.currentLayer.opacity;
                        // Disable writing the shape's fragments to the depth buffer when the interior is
                        // semi-transparent.
                        gl.depthMask(opacity >= 1 || dc.pickingMode);
                        program.loadColor(gl, dc.pickingMode ? pickColor : color);
                        program.loadOpacity(gl, dc.pickingMode ? 1 : opacity);

                        gl.lineWidth(this.activeAttributes.outlineWidth);

                        if (this._extrude) {
                            stride = 24;
                            nPts = numPoints / 2;
                        } else {
                            stride = 12;
                            nPts = numPoints;
                        }

                        gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false,
                            stride, 0);
                        gl.drawArrays(WebGLRenderingContext.LINE_STRIP, 0, nPts);

                        if (this.mustDrawVerticals(dc)) {
                            gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false,
                                0, 0);
                            gl.drawArrays(WebGLRenderingContext.LINES, 0, numPoints - 2);
                        }
                    }
                }
            }
            currentData.refreshBuffers = false;

            if (dc.pickingMode) {
                var po = new PickedObject(pickColor, this.pickDelegate ? this.pickDelegate : this, null,
                    dc.currentLayer, false);
                dc.resolvePick(po);
            }
        };

        // Overridden from AbstractShape base class.
        Polygon.prototype.beginDrawing = function (dc) {
            var gl = dc.currentGlContext;

            if (this.activeAttributes.drawInterior) {
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