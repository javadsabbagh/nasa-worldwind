/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports WorldWindow
 * @version $Id$
 */
define([
        './error/ArgumentError',
        './render/DrawContext',
        './globe/EarthElevationModel',
        './util/FrameStatistics',
        './globe/Globe',
        './cache/GpuResourceCache',
        './util/Logger',
        './navigate/LookAtNavigator',
        './navigate/NavigatorState',
        './geom/Rectangle',
        './geom/Sector',
        './globe/Terrain',
        './globe/Tessellator',
        './render/TextRenderer',
        './geom/Vec2'],
    function (ArgumentError,
              DrawContext,
              EarthElevationModel,
              FrameStatistics,
              Globe,
              GpuResourceCache,
              Logger,
              LookAtNavigator,
              NavigatorState,
              Rectangle,
              Sector,
              Terrain,
              Tessellator,
              TextRenderer,
              Vec2) {
        "use strict";

        /**
         * Constructs a World Wind window for an HTML canvas.
         * @alias WorldWindow
         * @constructor
         * @classdesc Represents a World Wind window for an HTML canvas.
         * @param {String} canvasName The name assigned to the canvas in the HTML page.
         */
        var WorldWindow = function (canvasName) {
            if (!(window.WebGLRenderingContext)) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "constructor",
                        "The specified canvas does not support WebGL."));
            }

            this.canvas = document.getElementById(canvasName);

            this.canvas.addEventListener("webglcontextlost", handleContextLost, false);
            this.canvas.addEventListener("webglcontextrestored", handleContextRestored, false);

            var thisWindow = this;

            function handleContextLost(event) {
                event.preventDefault();
                thisWindow.gpuResourceCache.clear();

                if (thisWindow.pickingFrameBuffer) {
                    thisWindow.pickingFrameBuffer = null;
                }
            }

            function handleContextRestored(event) {
            }

            var gl = this.canvas.getContext("webgl");
            if (!gl) {
                gl = this.canvas.getContext("experimental-webgl");
            }

            /**
             * The number of bits in the depth buffer associated with this World Window.
             * @type {number}
             */
            this.depthBits = gl.getParameter(WebGLRenderingContext.DEPTH_BITS);

            /**
             * The current viewport of this World Window.
             * @type {Rectangle}
             */
            this.viewport = new Rectangle(0, 0, this.canvas.width, this.canvas.height);

            /**
             * The globe displayed.
             * @type {Globe}
             */
            this.globe = new Globe(new EarthElevationModel());

            /**
             * The layers to display in this world window.
             * This property is read-only. Use [addLayer]{@link WorldWindow#addLayer} or
             * [insertLayer]{@link WorldWindow#insertLayer} to add layers to this world window.
             * Use [removeLayer]{@link WorldWindow#removeLayer} to remove layers from this world window.
             * @type {Layer[]}
             * @readonly
             */
            this.layers = [];

            /**
             * The navigator used to manipulate the globe.
             * @type {LookAtNavigator}
             * @default [LookAtNavigator]{@link LookAtNavigator}
             */
            this.navigator = new LookAtNavigator(this);

            /**
             * The tessellator used to create the globe's terrain.
             * @type {Tessellator}
             */
            this.tessellator = new Tessellator();

            /**
             * The vertical exaggeration to apply to the terrain.
             * @type {Number}
             */
            this.verticalExaggeration = 1;

            /**
             * Indicates that picking will return only one picked item plus the picked terrain, if any. Setting this
             * flag to <code>true</code> may increase picking performance when the scene contains very many shapes.
             * @type {boolean}
             * @default false
             */
            this.singlePickMode = false;

            /**
             * Performance statistics for this WorldWindow.
             * @type {FrameStatistics}
             */
            this.frameStatistics = new FrameStatistics();

            /**
             * The list of callbacks to call immediately after performing a redraw. The callbacks have a single
             * argument: this world window, e.g., <code>redrawCallback(WorldWindow);</code>
             * @type {function[]}
             */
            this.redrawCallbacks = [];

            // Internal. Intentionally not documented.
            this.gpuResourceCache = new GpuResourceCache();

            // Internal. Intentionally not documented.
            this.drawContext = new DrawContext();
            this.drawContext.canvas = this.canvas;

            // Internal. Intentionally not documented.
            this.drawContext.textRenderer = WorldWindow.textRender;

            // Internal. Intentionally not documented.
            this.pickingFrameBuffer = null;

            // Create a virtual canvas for capturing texture maps of SVG text and other SVG 2D renderings.
            this.drawContext.canvas2D = document.createElement("canvas");
            this.drawContext.ctx2D = this.drawContext.canvas2D.getContext("2d");

            // Set up to handle redraw requests sent to the canvas. Imagery uses this target because images are
            // generally specific to the WebGL context associated with the canvas.
            this.canvas.addEventListener(WorldWind.REDRAW_EVENT_TYPE, function (event) {
                thisWindow.redraw();
            }, false);

            // Set up to handel redraw requests sent to the global window. Elevation models use this target because
            // they can be shared among world windows.
            window.addEventListener(WorldWind.REDRAW_EVENT_TYPE, function (event) {
                thisWindow.redraw();
            }, false);
        };

        /**
         * Converts window coordinates to coordinates relative to this World Window's canvas.
         * @param {Number} x The X coordinate to convert.
         * @param {Number} y The Y coordinate to convert.
         * @returns {Vec2} The converted coordinates.
         */
        WorldWindow.prototype.canvasCoordinates = function (x, y) {
            var bbox = this.canvas.getBoundingClientRect(),
                xc = x - bbox.left * (this.canvas.width / bbox.width),
                yc = y - bbox.top * (this.canvas.height / bbox.height);

            return new Vec2(xc, yc);
        };

        /**
         * Redraws the window.
         */
        WorldWindow.prototype.redraw = function () {
            try {
                this.resetDrawContext();
                this.drawFrame();

                for (var i = 0, len = this.redrawCallbacks.length; i < len; i++) {
                    this.redrawCallbacks[i](this);
                }
            } catch (e) {
                Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "redraw",
                    "Exception occurred during rendering: " + e.toString());
            }
        };

        /**
         * Requests the World Wind objects displayed at a specified screen-coordinate point.
         *
         * If the point intersects the terrain, the returned list contains an object identifying the associated geographic
         * position. This returns an empty list when nothing in the World Wind scene intersects the specified point.
         *
         * @param pickPoint The point to examine in this World Window's screen coordinates.
         * @returns {PickedObjectList} A list of picked World Wind objects at the specified pick point.
         * @throws {ArgumentError} If the specified pick point is undefined.
         */
        WorldWindow.prototype.pick = function (pickPoint) {
            if (!pickPoint) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "pick", "missingPoint"));
            }

            this.resetDrawContext();
            this.drawContext.pickingMode = true;
            this.drawContext.regionPickingMode = false;
            this.drawContext.pickPoint = pickPoint;
            this.pickTerrainOnly = false;
            this.drawFrame();

            return this.drawContext.objectsAtPickPoint;
        };

        /**
         * Requests the position of the World Wind terrain at a specified screen-coordinate point..
         *
         * If the point intersects the terrain, the returned list contains a single object identifying the associated geographic
         * position. Otherwise this returns an empty list.
         *
         * @param pickPoint The point to examine in this World Window's screen coordinates.
         *
         * @returns {PickedObjectList} A list containing the picked World Wind terrain position at the specified point,
         * or an empty list if the point does not intersect the terrain.
         * @throws {ArgumentError} If the specified pick point is undefined.
         */
        WorldWindow.prototype.pickTerrain = function (pickPoint) {
            if (!pickPoint) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "pickTerrain", "missingPoint"));
            }

            this.resetDrawContext();
            this.drawContext.pickingMode = true;
            this.drawContext.regionPickingMode = false;
            this.drawContext.pickPoint = pickPoint;
            this.pickTerrainOnly = true;
            this.drawFrame();

            return this.drawContext.objectsAtPickPoint;
        };

        /**
         * Requests the World Wind objects displayed within a specified screen-coordinate region.
         * @param {Rectangle} rectangle The screen coordinate rectangle identifying the region to search.
         * @returns {PickedObjectList} A list of visible World Wind objects within the specified region.
         * @throws {ArgumentError} If the specified rectangle is null or undefined.
         */
        WorldWindow.prototype.pickShapesInRegion = function (rectangle) {
            if (!rectangle) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WorldWindow", "pickShapesInRegion", "missingRectangle"));
            }

            this.resetDrawContext();
            this.drawContext.pickingMode = true;
            this.drawContext.regionPickingMode = true;
            this.pickTerrainOnly = false;
            this.drawContext.pickRectangle =
                new Rectangle(rectangle.x, this.canvas.height - rectangle.y, rectangle.width, rectangle.height);
            this.drawFrame();

            return this.drawContext.objectsAtPickPoint;
        };

        // Internal. Intentionally not documented.
        WorldWindow.prototype.resetDrawContext = function () {
            var dc = this.drawContext;

            dc.reset();
            dc.globe = this.globe;
            dc.layers = this.layers;
            dc.navigatorState = this.navigator.currentState();
            dc.verticalExaggeration = this.verticalExaggeration;
            dc.frameStatistics = this.frameStatistics;
            dc.singlePickMode = this.singlePickMode;
            dc.update();
        };

        /* useful stuff to debug WebGL */
        /*
         function logGLCall(functionName, args) {
         console.log("gl." + functionName + "(" +
         WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
         };

         function validateNoneOfTheArgsAreUndefined(functionName, args) {
         for (var ii = 0; ii < args.length; ++ii) {
         if (args[ii] === undefined) {
         console.error("undefined passed to gl." + functionName + "(" +
         WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");
         }
         }
         };

         WorldWindow.prototype.logAndValidate = function logAndValidate(functionName, args) {
         logGLCall(functionName, args);
         validateNoneOfTheArgsAreUndefined (functionName, args);
         };

         WorldWindow.prototype.throwOnGLError = function throwOnGLError(err, funcName, args) {
         throw WebGLDebugUtils.glEnumToString(err) + " was caused by call to: " + funcName;
         };
         */

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.drawFrame = function () {
            this.drawContext.frameStatistics.beginFrame();

            var gl = this.canvas.getContext("webgl");
            if (!gl) {
                gl = this.canvas.getContext("experimental-webgl");
            }

            // uncomment to debug WebGL
            //var gl = WebGLDebugUtils.makeDebugContext(this.canvas.getContext("webgl"),
            //        this.throwOnGLError,
            //        this.logAndValidate
            //);

            this.drawContext.currentGlContext = gl;

            this.viewport = new Rectangle(0, 0, this.canvas.width, this.canvas.height);

            if (!this.pickingFrameBuffer) {
                this.createPickBuffer(gl);
            }

            if (this.drawContext.pickingMode) {
                gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, this.pickingFrameBuffer);
            }

            try {
                this.beginFrame(this.drawContext, this.viewport);
                this.createTerrain(this.drawContext);
                this.clearFrame(this.drawContext);
                if (this.drawContext.pickingMode) {
                    if (this.drawContext.makePickFrustum()) {
                        this.doPick(this.drawContext);
                    }
                } else {
                    this.doDraw(this.drawContext);
                }
            } finally {
                this.endFrame(this.drawContext);
                if (this.drawContext.pickingMode) {
                    gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, null);
                }
                this.drawContext.frameStatistics.endFrame();
            }
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.beginFrame = function (dc, viewport) {
            var gl = dc.currentGlContext;

            gl.viewport(viewport.x, viewport.y, viewport.width, viewport.height);

            if (!dc.pickingMode) {
                gl.enable(WebGLRenderingContext.BLEND);
                gl.blendFunc(WebGLRenderingContext.ONE, WebGLRenderingContext.ONE_MINUS_SRC_ALPHA);
            }

            gl.enable(WebGLRenderingContext.CULL_FACE);
            gl.enable(WebGLRenderingContext.DEPTH_TEST);
            gl.depthFunc(WebGLRenderingContext.LEQUAL);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.endFrame = function (dc) {
            var gl = dc.currentGlContext;

            gl.disable(WebGLRenderingContext.BLEND);
            gl.disable(WebGLRenderingContext.CULL_FACE);
            gl.disable(WebGLRenderingContext.DEPTH_TEST);
            gl.blendFunc(WebGLRenderingContext.ONE, WebGLRenderingContext.ZERO);
            gl.depthFunc(WebGLRenderingContext.LESS);
            gl.clearColor(0, 0, 0, 1);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.clearFrame = function (dc) {
            var gl = dc.currentGlContext;

            gl.clearColor(dc.clearColor.red, dc.clearColor.green, dc.clearColor.blue, dc.clearColor.alpha);
            gl.clear(WebGLRenderingContext.COLOR_BUFFER_BIT | WebGLRenderingContext.DEPTH_BUFFER_BIT);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.doDraw = function (dc) {
            this.drawLayers();
            this.drawOrderedRenderables();
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.doPick = function (dc) {
            dc.terrain.pick(dc);

            if (!this.pickTerrainOnly) {
                this.drawLayers();
                this.drawOrderedRenderables();
            }

            if (this.drawContext.regionPickingMode) {
                this.resolveRegionPick();
            } else {
                this.resolveTopPick();
            }
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.createTerrain = function (dc) {
            // TODO: Implement Tessellator to return a Terrain rather than synthesizing this copy here.
            dc.terrain = new Terrain(); // TODO: have Tessellator.tessellate() return a filled out one of these
            dc.terrain.surfaceGeometry = this.tessellator.tessellate(dc).tileArray;
            dc.terrain.globe = dc.globe;
            dc.terrain.tessellator = this.tessellator;
            dc.terrain.verticalExaggeration = dc.verticalExaggeration;
            dc.terrain.sector = Sector.FULL_SPHERE;

            dc.frameStatistics.setTerrainTileCount(
                this.drawContext.terrain && this.drawContext.terrain.surfaceGeometry ?
                    this.drawContext.terrain.surfaceGeometry.length : 0);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.drawLayers = function () {
            // Draw all the layers attached to this WorldWindow.

            var beginTime = Date.now(),
                dc = this.drawContext,
                layers = this.drawContext.layers,
                layer;

            for (var i = 0, len = layers.length; i < len; i++) {
                layer = layers[i];
                if (layer) {
                    dc.currentLayer = layer;
                    try {
                        layer.render(dc);
                    } catch (e) {
                        Logger.log(Logger.LEVEL_SEVERE, "Error while rendering layer " + layer.displayName + ".");
                        // Keep going. Render the rest of the layers.
                    }
                }
            }

            var now = Date.now();
            dc.frameStatistics.layerRenderingTime = now - beginTime;
        };

        /**
         * Adds a specified layer to the end of this world window.
         * @param {Layer} layer The layer to add. May be null or undefined, in which case this world window is not modified.
         */
        WorldWindow.prototype.addLayer = function (layer) {
            this.layers.push(layer);
        };

        /**
         * Removes the first instance of a specified layer from this world window.
         * @param {Layer} layer The layer to remove. May be null or undefined, in which case this world window is not
         * modified. This world window is also not modified if the specified layer does not exist in this world
         * window's layer list.
         */
        WorldWindow.prototype.removeLayer = function (layer) {
            if (!layer)
                return;

            var index = -1;
            for (var i = 0, len = this.layers.length; i < len; i++) {
                if (this.layers[i] == layer) {
                    index = i;
                    break;
                }
            }

            if (index >= 0) {
                this.layers.splice(index, 1);
            }
        };

        /**
         * Inserts a specified layer at a specified position in this world window's layer list.
         * @param {number} index The index at which to insert the layer. May be negative to specify the position
         * from the end of the array.
         * @param {Layer} layer The layer to insert. This world window's layer list is not changed if the specified
         * layer is null or undefined.
         */
        WorldWindow.prototype.insertLayer = function (index, layer) {
            if (layer) {
                this.layers.splice(index, 0, layer);
            }
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.drawOrderedRenderables = function () {
            var beginTime = Date.now(),
                dc = this.drawContext,
                or;

            dc.sortOrderedRenderables();
            dc.orderedRenderingMode = true;

            while (or = dc.popOrderedRenderable()) {
                try {
                    or.renderOrdered(dc);
                } catch (e) {
                    Logger.logMessage(Logger.LEVEL_WARNING, "WorldWindow", "drawOrderedRenderables",
                        "Error while rendering a shape:" + e.message);
                    // Keep going. Render the rest of the ordered renderables.
                }
            }

            dc.orderedRenderingMode = false;

            dc.frameStatistics.orderedRenderingTime = Date.now() - beginTime;
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.createPickBuffer = function (gl) {
            var pickingTexture = gl.createTexture();
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, pickingTexture);
            gl.texImage2D(WebGLRenderingContext.TEXTURE_2D, 0, WebGLRenderingContext.RGBA,
                this.viewport.width, this.viewport.height, 0, WebGLRenderingContext.RGBA,
                WebGLRenderingContext.UNSIGNED_BYTE, null);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_MIN_FILTER,
                WebGLRenderingContext.LINEAR);

            var pickingDepthBuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(WebGLRenderingContext.RENDERBUFFER, pickingDepthBuffer);
            gl.renderbufferStorage(WebGLRenderingContext.RENDERBUFFER, WebGLRenderingContext.DEPTH_COMPONENT16,
                this.viewport.width, this.viewport.height);

            this.pickingFrameBuffer = gl.createFramebuffer();
            gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, this.pickingFrameBuffer);
            gl.framebufferTexture2D(WebGLRenderingContext.FRAMEBUFFER, WebGLRenderingContext.COLOR_ATTACHMENT0,
                WebGLRenderingContext.TEXTURE_2D, pickingTexture, 0);
            gl.framebufferRenderbuffer(WebGLRenderingContext.FRAMEBUFFER, WebGLRenderingContext.DEPTH_ATTACHMENT,
                WebGLRenderingContext.RENDERBUFFER, pickingDepthBuffer);

            var e = gl.checkFramebufferStatus(WebGLRenderingContext.FRAMEBUFFER);
            if (e != WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
                Logger.logMessage(Logger.LEVEL_WARNING, "WorldWindow", "createPickBuffer",
                    "Error creating pick buffer: " + gl.checkFramebufferStatus());
            }

            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, null);
            gl.bindRenderbuffer(WebGLRenderingContext.RENDERBUFFER, null);
            gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, null);
        };

        // Internal function. Intentionally not documented.
        WorldWindow.prototype.resolveTopPick = function () {
            // Make a last reading to determine what's on top.

            var pickedObjects = this.drawContext.objectsAtPickPoint,
                topObject = null,
                terrainObject = null;

            if (pickedObjects.objects.length > 0) {
                var pickColor = this.drawContext.readPickColor(this.drawContext.pickPoint);
                if (pickColor) {
                    // Find the picked object with the top color code and set its isOnTop flag.
                    for (var i = 0, len = pickedObjects.objects.length; i < len; i++) {
                        var po = pickedObjects.objects[i];

                        if (po.isTerrain) {
                            terrainObject = po;
                        }

                        if (po.color.equals(pickColor)) {
                            po.isOnTop = true;
                            topObject = po;

                            if (terrainObject) {
                                break; // no need to search for more than the top object and the terrain object
                            }
                        }
                    }

                    // In single-pick mode provide only the top-most object and the terrain object, if any.
                    if (this.drawContext.singlePickMode) {
                        pickedObjects.clear();
                        if (topObject) {
                            pickedObjects.add(topObject);
                        }
                        if (terrainObject) {
                            pickedObjects.add(terrainObject);
                        }
                    }
                }
            }
        };

        // Internal. Intentionally not documented.
        WorldWindow.prototype.resolveRegionPick = function () {
            if (this.drawContext.objectsAtPickPoint.objects.length == 0) {
                return;
            }

            // Mark every picked object with a color in the pick buffer as "on top".

            var pickedObjects = this.drawContext.objectsAtPickPoint,
                uniquePickColors = this.drawContext.readPickColors(this.drawContext.pickRectangle),
                po,
                color;

            for (var i = 0, len = pickedObjects.objects.length; i < len; i++) {
                po = pickedObjects.objects[i];
                color = uniquePickColors[po.color.toByteString()];
                if (color) {
                    po.isOnTop = true;
                }
            }
        };

        // Construct the text renderer singleton and make it a property of the WorldWindow class.
        WorldWindow.textRender = new TextRenderer();

        return WorldWindow;
    }
)
;