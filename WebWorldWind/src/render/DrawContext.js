/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports DrawContext
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Color',
        '../util/FrameStatistics',
        '../geom/Frustum',
        '../globe/Globe',
        '../shaders/GpuProgram',
        '../cache/GpuResourceCache',
        '../layer/Layer',
        '../util/Logger',
        '../geom/Matrix',
        '../navigate/NavigatorState',
        '../pick/PickedObjectList',
        '../geom/Plane',
        '../geom/Position',
        '../geom/Rectangle',
        '../geom/Sector',
        '../render/SurfaceTileRenderer',
        '../render/TextSupport',
        '../geom/Vec2',
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (ArgumentError,
              Color,
              FrameStatistics,
              Frustum,
              Globe,
              GpuProgram,
              GpuResourceCache,
              Layer,
              Logger,
              Matrix,
              NavigatorState,
              PickedObjectList,
              Plane,
              Position,
              Rectangle,
              Sector,
              SurfaceTileRenderer,
              TextSupport,
              Vec2,
              Vec3,
              WWMath) {
        "use strict";

        /**
         * Constructs a DrawContext.
         * @alias DrawContext
         * @constructor
         * @classdesc Provides current state during rendering. The current draw context is passed to most rendering
         * methods in order to make those methods aware of current state.
         */
        var DrawContext = function () {
            /**
             * The starting time of the current frame, in milliseconds.
             * @type {Number}
             */
            this.timestamp = new Date().getTime();

            /**
             * The globe being rendered.
             * @type {Globe}
             */
            this.globe = null;

            /**
             * The layer being rendered.
             * @type {Layer}
             */
            this.currentLayer = null;

            /**
             * The current state of the associated navigator.
             * @type {NavigatorState}
             */
            this.navigatorState = null;

            /**
             * The terrain for the current frame.
             * @type {Terrain}
             */
            this.terrain = null;

            /**
             * The maximum geographic area currently in view.
             * @type {Sector}
             */
            this.visibleSector = null;

            /**
             * The current GPU program.
             * @type {GpuProgram}
             */
            this.currentProgram = null;

            /**
             * The current vertical exaggeration.
             * @type {Number}
             */
            this.verticalExaggeration = 1;

            /**
             * The surface-tile-renderer to use for drawing surface tiles.
             * @type {SurfaceTileRenderer}
             */
            this.surfaceTileRenderer = new SurfaceTileRenderer();

            /**
             * The GPU resource cache, which tracks WebGL resources.
             * @type {GpuResourceCache}
             */
            this.gpuResourceCache = null;

            /**
             * The current eye position.
             * @type {Position}
             */
            this.eyePosition = new Position(0, 0, 0);

            /**
             * The current screen projection matrix.
             * @type {Matrix}
             */
            this.screenProjection = Matrix.fromIdentity();

            /**
             * The current clear color, expressed as an array of Number in the order red, green, blue, alpha.
             * @type {Color}
             * @default red = 0, green = 0, blue = 0, alpha = 1
             */
            this.clearColor = Color.MEDIUM_GRAY;

            /**
             * Frame statistics.
             * @type {FrameStatistics}
             */
            this.frameStatistics = new FrameStatistics();

            /**
             * The current WebGL context.
             * @type {WebGLRenderingContext}
             */
            this.currentGlContext = null;

            /**
             * Indicates whether the frame is being drawn for picking.
             * @type {boolean}
             */
            this.pickingMode = false;

            /**
             * The current pick point, in screen coordinates.
             * @type {Vec2}
             */
            this.pickPoint = null;

            /**
             * The current pick rectangle, in WebGL (lower-left origin) screen coordinates.
             * @type {Rectangle}
             */
            this.pickRectangle = null;

            /**
             * The current pick frustum, created anew each picking frame.
             * @type {Frustum}
             * @readonly
             */
            this.pickFrustum = null;

            /**
             * Indicates that picking will return all objects at the pick point, if any. The top-most object will have
             * its <code>isOnTop</code> flag set to <code>true</code>.
             * If deep picking is <code>false</code>, the default, only the top-most object is returned, plus
             * the picked-terrain object if the pick point is over the terrain.
             * @type {boolean}
             * @default false
             */
            this.deepPicking = false;

            /**
             * Indicates that the current picking operation is in support of region picking.
             * @type {boolean}
             * @default false
             */
            this.regionPicking = false;

            /**
             * A unique color variable to use during picking.
             * @type {Color}
             */
            this.pickColor = new Color(0, 0, 0, 1);

            /**
             * The objects at the current pick point.
             * @type {PickedObjectList}
             */
            this.objectsAtPickPoint = new PickedObjectList();

            /**
             * Indicates whether this draw context is in ordered rendering mode.
             * @type {boolean}
             */
            this.orderedRenderingMode = false;

            /**
             * A "virtual" canvas for creating texture maps of SVG text.
             * @type {Canvas}
             */
            this.canvas2D = null;

            /**
             * A 2D context derived from the "virtual" canvas.
             */
            this.ctx2D = null;

            /**
             * The list of ordered renderables.
             * @type {Array}
             */
            this.orderedRenderables = [];

            /**
             * Provides ordinal IDs to ordered renderables.
             * @type {number}
             */
            this.orderedRenderablesCounter = 0;

            /**
             * A shared TextSupport instance.
             * @type {TextSupport}
             */
            this.textSupport = new TextSupport();
        };

        // Internal use. Intentionally not documented.
        DrawContext.unitQuadKey = "DrawContextUnitQuadKey";
        DrawContext.unitQuadKey3 = "DrawContextUnitQuadKey3";

        /**
         * Prepare this draw context for the drawing of a new frame.
         */
        DrawContext.prototype.reset = function () {
            var oldTimeStamp = this.timestamp;
            this.timestamp = Date.now();
            if (this.timestamp === oldTimeStamp)
                ++this.timestamp;

            this.orderedRenderables = []; // clears the ordered renderables array
            this.orderedRenderablesCounter = 0;
            this.pickColor = new Color(0, 0, 0, 1);
            this.pickingMode = false;
            this.pickPoint = null;
            this.pickRectangle = null;
            this.pickFrustum = null;
            this.objectsAtPickPoint.clear();
        };

        /**
         * Computes any values necessary to render the upcoming frame. Called after all draw context state for the
         * frame has been set.
         */
        DrawContext.prototype.update = function () {
            var eyePoint = this.navigatorState.eyePoint;

            this.globe.computePositionFromPoint(eyePoint[0], eyePoint[1], eyePoint[2], this.eyePosition);
            this.screenProjection.setToScreenProjection(this.navigatorState.viewport);
        };

        /**
         * Indicates whether terrain exists.
         * @returns {boolean} <code>true</code> if there is terrain, otherwise <code>false</code>.
         */
        DrawContext.prototype.hasTerrain = function () {
            return this.terrain && this.terrain.surfaceGeometry && (this.terrain.surfaceGeometry.length > 0);
        };

        /**
         * Binds a specified GPU program.
         * This function also makes the program the current program.
         * @param {WebGLRenderingContext} gl The current WebGL drawing context.
         * @param {GpuProgram} program The program to bind. May be null or undefined, in which case the currently
         * bound program is unbound.
         */
        DrawContext.prototype.bindProgram = function (gl, program) {
            if (program) {
                program.bind(gl);
            } else {
                gl.useProgram(null);
            }

            this.currentProgram = program;
        };

        /**
         * Binds a potentially cached GPU program, creating and caching it if it isn't already cached.
         * This function also makes the program the current program.
         * @param {WebGLRenderingContext} gl The current WebGL drawing context.
         * @param {function} programConstructor The constructor to use to create the program.
         * @returns {GpuProgram} The bound program.
         * @throws {ArgumentError} If the specified constructor is null or undefined.
         */
        DrawContext.prototype.findAndBindProgram = function (gl, programConstructor) {
            if (!programConstructor) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "DrawContext", "bindProgramForKey",
                        "The specified program constructor is null or undefined."));
            }

            var program = this.gpuResourceCache.programForKey(programConstructor);
            if (program) {
                this.bindProgram(gl, program);
            } else {
                try {
                    program = new programConstructor(gl);
                    this.bindProgram(gl, program);
                    this.gpuResourceCache.putResource(programConstructor, program, WorldWind.GPU_PROGRAM, program.size);
                } catch (e) {
                    Logger.log(Logger.LEVEL_SEVERE, "Error attempting to create GPU program.")
                }
            }

            return program;
        };

        /**
         * Adds an ordered renderable to this draw context's ordered renderable list.
         * @param {OrderedRenderable} orderedRenderable The ordered renderable to add. May be null, in which case the
         * current ordered renderable list remains unchanged.
         */
        DrawContext.prototype.addOrderedRenderable = function (orderedRenderable) {
            if (orderedRenderable) {
                orderedRenderable.insertionOrder = this.orderedRenderablesCounter++;
                this.orderedRenderables.push(orderedRenderable);
            }
        };

        /**
         * Adds an ordered renderable to the end of this draw context's ordered renderable list.
         * @param {OrderedRenderable} orderedRenderable The ordered renderable to add. May be null, in which case the
         * current ordered renderable list remains unchanged.
         */
        DrawContext.prototype.addOrderedRenderableToBack = function (orderedRenderable) {
            if (orderedRenderable) {
                orderedRenderable.insertionOrder = this.orderedRenderablesCounter++;
                orderedRenderable.eyeDistance = Number.MAX_VALUE;
                this.orderedRenderables.push(orderedRenderable);
            }
        };

        /**
         * Returns the ordered renderable at the head of the ordered renderable list without removing it from the list.
         * @returns {OrderedRenderable} The first ordered renderable in this draw context's ordered renderable list, or
         * null if the ordered renderable list is empty.
         */
        DrawContext.prototype.peekOrderedRenderable = function () {
            if (this.orderedRenderables.length > 0) {
                return this.orderedRenderables[this.orderedRenderables.length - 1];
            } else {
                return null;
            }
        };

        /**
         * Returns the ordered renderable at the head of the ordered renderable list and removes it from the list.
         * @returns {OrderedRenderable} The first ordered renderable in this draw context's ordered renderable list, or
         * null if the ordered renderable list is empty.
         */
        DrawContext.prototype.popOrderedRenderable = function () {
            if (this.orderedRenderables.length > 0) {
                return this.orderedRenderables.pop();
            } else {
                return null;
            }
        };

        /**
         * Sorts the ordered renderable list from nearest to the eye point to farthest from the eye point.
         */
        DrawContext.prototype.sortOrderedRenderables = function () {
            // Sort the ordered renderables by eye distance from front to back and then by insertion time. The ordered
            // renderable peek and pop access the back of the ordered renderable list, thereby causing ordered renderables to
            // be processed from back to front.

            this.orderedRenderables.sort(function (orA, orB) {
                var eA = orA.eyeDistance,
                    eB = orB.eyeDistance;

                if (eA < eB) { // orA is closer to the eye than orB; sort orA before orB
                    return -1;
                } else if (eA > eB) { // orA is farther from the eye than orB; sort orB before orA
                    return 1;
                } else { // orA and orB are the same distance from the eye; sort them based on insertion time
                    var tA = orA.insertionOrder,
                        tB = orB.insertionOrder;

                    if (tA > tB) {
                        return -1;
                    } else if (tA < tB) {
                        return 1;
                    } else {
                        return 0;
                    }
                }
            });
        };

        /**
         * Reads the color from the current render buffer at a specified point. Used during picking to identify the item most
         * recently affecting the pixel at the specified point.
         * @param {Vec2} pickPoint The current pick point.
         * @returns {Color} The color at the pick point.
         */
        DrawContext.prototype.readPickColor = function (pickPoint) {
            var glPickPoint = this.navigatorState.convertPointToViewport(pickPoint, new Vec2(0, 0, 0)),
                colorBytes = new Uint8Array(4);

            this.currentGlContext.readPixels(glPickPoint[0], glPickPoint[1], 1, 1, WebGLRenderingContext.RGBA,
                WebGLRenderingContext.UNSIGNED_BYTE, colorBytes);

            if (this.clearColor.equalsBytes(colorBytes)) {
                return null;
            }

            return Color.colorFromByteArray(colorBytes);
        };

        /**
         * Reads the current render buffer colors in a specified rectangle. Used during region picking to identify
         * the items not occluded.
         * @param {Rectangle} pickRectangle The rectangle for which to read the colors.
         * @returns {{}} An object containing the unique colors in the specified rectangle, excluding the current
         * clear color. The colors are referenced by their byte string
         * (see [Color.toByteString]{@link Color#toByteString}.
         */
        DrawContext.prototype.readPickColors = function (pickRectangle) {
            var gl = this.currentGlContext,
                colorBytes = new Uint8Array(pickRectangle.width * pickRectangle.height * 4),
                uniqueColors = {},
                color,
                blankColor = new Color(0, 0, 0, 0),
                packAlignment = gl.getParameter(WebGLRenderingContext.PACK_ALIGNMENT);

            gl.pixelStorei(WebGLRenderingContext.PACK_ALIGNMENT, 1); // read byte aligned
            this.currentGlContext.readPixels(pickRectangle.x, pickRectangle.y,
                pickRectangle.width, pickRectangle.height,
                WebGLRenderingContext.RGBA, WebGLRenderingContext.UNSIGNED_BYTE, colorBytes);
            gl.pixelStorei(WebGLRenderingContext.PACK_ALIGNMENT, packAlignment); // restore the pack alignment

            for (var i = 0, len = pickRectangle.width * pickRectangle.height; i < len; i++) {
                var k = i * 4;
                color = Color.colorFromBytes(colorBytes[k], colorBytes[k + 1], colorBytes[k + 2], colorBytes[k + 3]);
                if (color.equals(this.clearColor) || color.equals(blankColor))
                    continue;
                uniqueColors[color.toByteString()] = color;
            }

            return uniqueColors;
        };

        /**
         * Determines whether a specified picked object is under the pick point, and if it is adds it to this draw
         * context's list of picked objects. This method should be called by shapes during ordered rendering
         * after the shape is drawn. If this draw context is in single-picking mode, the specified pickable object
         * is added to the list of picked objects whether or not it is under the pick point.
         * @param pickableObject
         * @returns {null}
         */
        DrawContext.prototype.resolvePick = function (pickableObject) {
            pickableObject.pickPoint = this.pickPoint;

            if (this.deepPicking && !this.regionPicking) {
                var color = this.readPickColor(this.pickPoint);
                if (!color) { // getPickColor returns null if the pick point selects the clear color
                    return null;
                }

                if (pickableObject.color.equals(color)) {
                    this.addPickedObject(pickableObject);
                }
            } else {
                // Don't resolve. Just add the object to the pick list. It will be resolved later.
                this.addPickedObject(pickableObject);
            }
        };

        /**
         * Adds an object to the current picked-object list. The list identifies objects that are at the pick point
         * but not necessarily the top-most object.
         * @param  {PickedObject} pickedObject The object to add.
         */
        DrawContext.prototype.addPickedObject = function (pickedObject) {
            if (pickedObject) {
                this.objectsAtPickPoint.add(pickedObject);
            }
        };

        /**
         * Computes a unique color to use as a pick color.
         * @returns {Color} A unique color.
         */
        DrawContext.prototype.uniquePickColor = function () {
            var color = this.pickColor.nextColor();

            return color.equals(this.clearColor) ? color.nextColor() : color;
        };

        /**
         * Creates a pick frustum for the current pick point and stores it in this draw context. If this context's
         * pick rectangle is null or undefined then a pick rectangle is also computed and assigned to this context.
         * If the existing pick rectangle extends beyond the viewport then it is truncated by this method to fit
         * within the viewport.
         * This method assumes that this draw context's pick point or pick rectangle has been set. It returns
         * <code>false</code> if neither one of these exists.
         *
         * @returns {boolean} <code>true</code> if the pick frustum could be created, otherwise <code>false</code>.
         */
        DrawContext.prototype.makePickFrustum = function () {
            if (!this.pickPoint && !this.pickRectangle) {
                return false;
            }

            var lln, llf, lrn, lrf, uln, ulf, urn, urf, // corner points of frustum
                nl, nr, nt, nb, nn, nf, // normal vectors of frustum planes
                l, r, t, b, n, f, // frustum planes
                va, vb = new Vec3(0, 0, 0), // vectors formed by the corner points
                apertureRadius = 2, // radius of pick window in screen coordinates
                screenPoint = new Vec3(0, 0, 0),
                pickPoint,
                pickRectangle = this.pickRectangle,
                viewport = this.navigatorState.viewport;

            // Compute the pick rectangle if necessary.
            if (!pickRectangle) {
                pickPoint = this.navigatorState.convertPointToViewport(this.pickPoint, new Vec2(0, 0));
                pickRectangle = new Rectangle(
                    pickPoint[0] - apertureRadius,
                    pickPoint[1] - apertureRadius,
                    2 * apertureRadius,
                    2 * apertureRadius);
            }

            // Clamp the pick rectangle to the viewport.

            var xl = pickRectangle.x,
                xr = pickRectangle.x + pickRectangle.width,
                yb = pickRectangle.y,
                yt = pickRectangle.y + pickRectangle.height;

            if (xr < 0 || yt < 0 || xl > viewport.x + viewport.width || yb > viewport.y + viewport.height) {
                return false; // pick rectangle is outside the viewport.
            }

            pickRectangle.x = WWMath.clamp(xl, viewport.x, viewport.x + viewport.width);
            pickRectangle.y = WWMath.clamp(yb, viewport.y, viewport.y + viewport.height);
            pickRectangle.width = WWMath.clamp(xr, viewport.x, viewport.x + viewport.width) - pickRectangle.x;
            pickRectangle.height = WWMath.clamp(yt, viewport.y, viewport.y + viewport.height) - pickRectangle.y;
            this.pickRectangle = pickRectangle;

            // Compute the pick frustum.

            screenPoint[0] = pickRectangle.x;
            screenPoint[1] = pickRectangle.y;
            screenPoint[2] = 0;
            this.navigatorState.unProject(screenPoint, lln = new Vec3(0, 0, 0));

            screenPoint[0] = pickRectangle.x;
            screenPoint[1] = pickRectangle.y;
            screenPoint[2] = 1;
            this.navigatorState.unProject(screenPoint, llf = new Vec3(0, 0, 0));

            screenPoint[0] = pickRectangle.x + pickRectangle.width;
            screenPoint[1] = pickRectangle.y;
            screenPoint[2] = 0;
            this.navigatorState.unProject(screenPoint, lrn = new Vec3(0, 0, 0));

            screenPoint[0] = pickRectangle.x + pickRectangle.width;
            screenPoint[1] = pickRectangle.y;
            screenPoint[2] = 1;
            this.navigatorState.unProject(screenPoint, lrf = new Vec3(0, 0, 0));

            screenPoint[0] = pickRectangle.x;
            screenPoint[1] = pickRectangle.y + pickRectangle.height;
            screenPoint[2] = 0;
            this.navigatorState.unProject(screenPoint, uln = new Vec3(0, 0, 0));

            screenPoint[0] = pickRectangle.x;
            screenPoint[1] = pickRectangle.y + pickRectangle.height;
            screenPoint[2] = 1;
            this.navigatorState.unProject(screenPoint, ulf = new Vec3(0, 0, 0));

            screenPoint[0] = pickRectangle.x + pickRectangle.width;
            screenPoint[1] = pickRectangle.y + pickRectangle.height;
            screenPoint[2] = 0;
            this.navigatorState.unProject(screenPoint, urn = new Vec3(0, 0, 0));

            screenPoint[0] = pickRectangle.x + pickRectangle.width;
            screenPoint[1] = pickRectangle.y + pickRectangle.height;
            screenPoint[2] = 1;
            this.navigatorState.unProject(screenPoint, urf = new Vec3(0, 0, 0));

            va = new Vec3(ulf[0] - lln[0], ulf[1] - lln[1], ulf[2] - lln[2]);
            vb.set(uln[0] - llf[0], uln[1] - llf[1], uln[2] - llf[2]);
            nl = va.cross(vb);
            l = new Plane(nl[0], nl[1], nl[2], -nl.dot(lln));
            l.normalize();

            va = new Vec3(urn[0] - lrf[0], urn[1] - lrf[1], urn[2] - lrf[2]);
            vb.set(urf[0] - lrn[0], urf[1] - lrn[1], urf[2] - lrn[2]);
            nr = va.cross(vb);
            r = new Plane(nr[0], nr[1], nr[2], -nr.dot(lrn));
            r.normalize();

            va = new Vec3(ulf[0] - urn[0], ulf[1] - urn[1], ulf[2] - urn[2]);
            vb.set(urf[0] - uln[0], urf[1] - uln[1], urf[2] - uln[2]);
            nt = va.cross(vb);
            t = new Plane(nt[0], nt[1], nt[2], -nt.dot(uln));
            t.normalize();

            va = new Vec3(lrf[0] - lln[0], lrf[1] - lln[1], lrf[2] - lln[2]);
            vb.set(llf[0] - lrn[0], llf[1] - lrn[1], llf[2] - lrn[2]);
            nb = va.cross(vb);
            b = new Plane(nb[0], nb[1], nb[2], -nb.dot(lrn));
            b.normalize();

            va = new Vec3(uln[0] - lrn[0], uln[1] - lrn[1], uln[2] - lrn[2]);
            vb.set(urn[0] - lln[0], urn[1] - lln[1], urn[2] - lln[2]);
            nn = va.cross(vb);
            n = new Plane(nn[0], nn[1], nn[2], -nn.dot(lln));
            n.normalize();

            va = new Vec3(urf[0] - llf[0], urf[1] - llf[1], urf[2] - llf[2]);
            vb.set(ulf[0] - lrf[0], ulf[1] - lrf[1], ulf[2] - lrf[2]);
            nf = va.cross(vb);
            f = new Plane(nf[0], nf[1], nf[2], -nf.dot(llf));
            f.normalize();

            this.pickFrustum = new Frustum(l, r, b, t, n, f);

            return true;
        };

        /**
         * Returns the VBO ID of a buffer containing a unit quadrilateral expressed as four 2D vertices at (0, 1), (0, 0),
         * (1, 1) and (1, 0). The four vertices are in the order required by a triangle strip. The buffer is created
         * on first use and cached. Subsequent calls to this method return the cached buffer.
         * @returns {Object} The VBO ID identifying the vertex buffer.
         */
        DrawContext.prototype.unitQuadBuffer = function () {
            var vboId = this.gpuResourceCache.resourceForKey(DrawContext.unitQuadKey);

            if (!vboId) {
                var gl = this.currentGlContext,
                    points = new Float32Array(8);

                points[0] = 0; // upper left corner
                points[1] = 1;
                points[2] = 0; // lower left corner
                points[3] = 0;
                points[4] = 1; // upper right corner
                points[5] = 1;
                points[6] = 1; // lower right corner
                points[7] = 0;

                vboId = gl.createBuffer();
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vboId);
                gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, points, WebGLRenderingContext.STATIC_DRAW);
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, null);

                this.gpuResourceCache.putResource(DrawContext.unitQuadKey, vboId, WorldWind.GPU_BUFFER, points.length * 4);
            }

            return vboId;
        };

        /**
         * Returns the VBO ID of a buffer containing a unit quadrilateral expressed as four 3D vertices at (0, 1, 0),
         * (0, 0, 0), (1, 1, 0) and (1, 0, 0).
         * The four vertices are in the order required by a triangle strip. The buffer is created
         * on first use and cached. Subsequent calls to this method return the cached buffer.
         * @returns {Object} The VBO ID identifying the vertex buffer.
         */
        DrawContext.prototype.unitQuadBuffer3 = function () {
            var vboId = this.gpuResourceCache.resourceForKey(DrawContext.unitQuadKey3);

            if (!vboId) {
                var gl = this.currentGlContext,
                    points = new Float32Array(12);

                points[0] = 0; // upper left corner
                points[1] = 1;
                points[2] = 0;
                points[3] = 0; // lower left corner
                points[4] = 0;
                points[5] = 0;
                points[6] = 1; // upper right corner
                points[7] = 1;
                points[8] = 0;
                points[9] = 1; // lower right corner
                points[10] = 0;
                points[11] = 0;

                vboId = gl.createBuffer();
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vboId);
                gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, points, WebGLRenderingContext.STATIC_DRAW);
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, null);

                this.gpuResourceCache.putResource(DrawContext.unitQuadKey3, vboId, WorldWind.GPU_BUFFER,
                    points.length * 4);
            }

            return vboId;
        };

        return DrawContext;
    }
)
;