/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TextRenderer
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Color',
        '../util/Font',
        '../util/Logger',
        '../geom/Matrix',
        '../geom/Position',
        '../geom/Rectangle',
        '../error/SingletonError',
        '../shaders/TextRendererProgram',
        '../geom/Vec3'
    ],
    function (ArgumentError,
              Color,
              Font,
              Logger,
              Matrix,
              Position,
              Rectangle,
              SingletonError,
              TextRendererProgram,
              Vec3) {
        "use strict";

        /**
         * A text renderer. This singleton class provides a utility method that renders text.
         * @alias TextRenderer
         * @constructor
         * @classdesc Provides a mechanism for rendering text.
         */
        var TextRenderer = function() {
            if (this.exists) {
                throw new SingletonError("TextRenderer");
            }
            else {
                this.exists = true;
            }

            /*
             * The following properties are transient.
             * They are filled in every time the render() method gets called.
             * They are also cleared when the render() method returns to avoid memory leaks.
             */

            /**
             * Text as input in the render() method.
             * @type {string}
             */
            this.text = null;

            /**
             * Font descriptor as input in the render() method.
             * @type {Font}
             */
            this.font = null;

            /**
             * The point where the text is located in cartesian coordinates.
             * @type {Vec3}
             */
            this.point = null;

            /**
             * The text resizing factor.
             * @type {number}
             */
            this.scale = 1;

            /**
             * Determines whether depth testing is enabled.
             * @type {boolean}
             */
            this.enableDepthTest = false;

            /**
             * Text broken into separate lines. "\n" is treated as the line separator.
             * @type {string[]}
             */
            this.lines = null;

            /**
             * The width of a texture map in pixels.
             * @type {number}
             */
            this.texWidth = -1;

            /**
             * The height of a texture map in pixels.
             * @type {number}
             */
            this.texHeight = -1;

            /**
             * The width of the text in pixels.
             * @type {number}
             */
            this.width = -1;

            /**
             * The height of the text in pixels.
             * @type {number}
             */
            this.height = -1;

            /**
             * The distance between baselines of text in terms of multiples of the font size.
             * The assumption is made that (lineSize - 1) is evenly divided above and below the line
             * for the ascenders and the descenders.
             * @type {number}
             */
            this.lineSpacing = 1.25;

            /**
             * Cache keys for retrieving previously constructed VBOs.
             * @type {string}
             */
            this.geometryVboCacheKey = "text_geometry";
            this.texCoordVboCacheKey = "text_texCoord";
            this.indicesVboCacheKey = "text_indices";

            /**
             * The number in indices in the mesh to draw the text.
             * @type {number}
             */
            this.numIndices = 4;

            /**
             * The position of the center of the text in normalized screen units.
             * @type {number}
             */
            this.x = 0;
            this.y = 0;

            /**
             * The texture map created to display the text.
             * @type {WebGLTexture}
             */
            this.texture = null;

            /**
             * Internal state to indicate whether the text is visible.
             * @type {boolean}
             */
            this.isVisible = true;

            // Scratch values to avoid constantly recreating these matrices.
            this.mvpMatrix = Matrix.fromIdentity();
            this.texSamplerMatrix = Matrix.fromIdentity();
            this.vec3Scratch = new Vec3(0, 0, 0);
        };

        /**
         * A flag that indicates that the TextRenderer singleton has already been created.
         * @type {boolean}
         */
        TextRenderer.exists = false;

        /**
         * Render text.
         * @param {DrawContext} dc The draw context.
         * @param {Vec3} point The point where the text is rendered.
         * @param {string} text the text render.
         * @param {Font} font The font descriptor.
         * @param {number} scale The scale factor of the text.
         * @param {boolean} enableDepthTest The flag to enable depth testing.
         * @param {Rectangle} bounds The bounding rectangle of the rendered text in screen space.
         */
        TextRenderer.prototype.render = function(dc, point, text, font, scale, enableDepthTest, bounds) {
            if (!point) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "TextRenderer", "render",
                    "missingPoint"));
            }
            if (!text) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "TextRenderer", "render",
                    "missingText"));
            }
            if (!font) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "TextRenderer", "render",
                    "missingFont"));
            }
            if (!scale) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "TextRenderer", "render",
                    "missingScale"));
            }

            // Capture input data for subsequent dissemination within render().
            this.point = point;
            this.text = text;
            this.font = font;
            this.scale = scale;
            this.enableDepthTest = enableDepthTest;
            this.vec3Scratch.copy(point);
            this.lines = text.split('\n');

            var gl = dc.currentGlContext;

            // Compute the width and height of the text.
            this.measureText(dc);

            this.updateMvpMatrix(dc);

            // Bail out early if the text isn't visible on the screen.
            if (!this.isVisible) {
                return;
            }

            this.preRender(dc);

            var savedEnableDepthTest = this.saveEnableDepthTest(dc, enableDepthTest);

            gl.drawElements(
                WebGLRenderingContext.TRIANGLE_STRIP,
                this.numIndices,
                WebGLRenderingContext.UNSIGNED_SHORT,
                0);

            this.restoreEnableDepthTest(dc, savedEnableDepthTest);

            this.postRender(dc);

            // Update the bounding rectangle based on where the text was drawn.
            var viewport = dc.navigatorState.viewport;
            bounds.set(
                0.5 * (1 + this.mvpMatrix[3]) * viewport.width, 0.5 * (1  + this.mvpMatrix[7]) * viewport.height,
                this.width, this.height);

            // Clean up on exit to make sure that no data is accidentally retained, which would cause a memory leak.
            this.point = null;
            this.text = null;
            this.font = null;
            this.lines = null;
            this.texture = null;

            return bounds;
        };

        /*
         * All methods beyond this point are considered internal and are not intended for use other than by TextRenderer.
         */

        TextRenderer.prototype.measureText = function(dc) {
            var ctx2D = dc.ctx2D;

            this.height = this.font.size * this.lines.length * this.lineSpacing;

            ctx2D.font = this.font.size.toString() + "px " + this.font.family;

            // Compute the total height of the text.
            this.width = 0;
            for (var idx = 0, len = this.lines.length; idx < len; idx += 1) {
                this.width = Math.max(this.width, ctx2D.measureText(this.lines[idx]).width);
            }

            // Add one pixel padding around all sides.
            this.width += 2;
            this.height += 2;

            this.texWidth = this.getPowerOfTwo(this.width);
            this.texHeight = this.getPowerOfTwo(this.height);
        };

        TextRenderer.prototype.updateMvpMatrix = function(dc) {
            // Compute normalized screen position.
            this.vec3Scratch.multiplyByMatrix(dc.navigatorState.modelviewProjection);

            // Update visibility based on normalized screen position.
            this.isVisible = (Math.abs(this.vec3Scratch[0]) <= 1) &&
            (Math.abs(this.vec3Scratch[1]) <= 1) &&
            this.vec3Scratch[2] > 0 &&
            this.vec3Scratch[2] < 1;

            if (!this.isVisible) {
                return;
            }

            this.x = this.vec3Scratch[0];
            this.y = this.vec3Scratch[1];

            var xAlign, yAlign; // Offset scale factors for alignment.

            // Account for horizontal alignment.
            if (this.font.horizontalAlignment === Font.horizontalAlignments.start ||
                this.font.horizontalAlignment === Font.horizontalAlignments.left) {
                xAlign = 0.5 * (this.texWidth - this.width); //0;
            }
            else if (this.font.horizontalAlignment === Font.horizontalAlignments.end ||
                this.font.horizontalAlignment === Font.horizontalAlignments.right) {
                xAlign = this.texWidth - 0.5 * (this.texWidth - this.width); //1;
            }
            else { // this.font.horizontalAlignment === Font.horizontalAlignments.center
                xAlign = 0.5 * this.texWidth;
            }

            // Account for vertical alignment.
            if (this.font.verticalAlignment === Font.verticalAlignments.top ||
                this.font.verticalAlignment === Font.verticalAlignments.hanging) {
                yAlign = this.texHeight - 0.5 * (this.texHeight - this.height); //1;
            }
            else if (this.font.verticalAlignment === Font.verticalAlignments.alphabetic ||
                this.font.verticalAlignment === Font.verticalAlignments.bottom) {
                yAlign = 0.5 * (this.texHeight - this.height); //0;
            }
            else { // this.font.verticalAlignment === Font.verticalAlignments.middle
                yAlign = 0.5 * this.texHeight;
            }

            // Update the MVP transformation to correctly map a unit square.
            var viewport = dc.navigatorState.viewport,
                xScale = this.scale * this.texWidth / viewport.width,
                yScale = this.scale * this.texHeight / viewport.height,
                xOffset = this.x - xAlign / viewport.width,
                yOffset = this.y - yAlign / viewport.height,
                zOffset = this.vec3Scratch[2];

            this.mvpMatrix.set(
                xScale, 0, 0, xOffset,
                0, yScale, 0, yOffset,
                0, 0, 0, zOffset,
                0, 0, 0, 1
            );
        };

        TextRenderer.prototype.preRender = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.findAndBindProgram(gl, TextRendererProgram);

            this.getTexture(dc);
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, this.texture);

            program.loadTexSampler(gl, WebGLRenderingContext.TEXTURE0);

            var vertexPointLocation = program.attributeLocation(gl, "vertexPoint");
            this.bindGeometryVbo(dc);
            gl.vertexAttribPointer(vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vertexPointLocation);

            var vertexTexCoordLocation = program.attributeLocation(gl, "vertexTexCoord");
            this.bindTextureVbo(dc);
            gl.vertexAttribPointer(vertexTexCoordLocation, 2, WebGLRenderingContext.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(vertexTexCoordLocation);

            this.bindIndicesVbo(dc);

            program.loadModelviewProjection(gl, this.mvpMatrix);
            program.loadTexSamplerMatrix(gl, this.texSamplerMatrix);
        };

        TextRenderer.prototype.getTexture = function(dc) {
            var gl = dc.currentGlContext,
                gpuResourceCache = dc.gpuResourceCache,
                hashKey = this.text + this.font.hashKey;

            this.texture = gpuResourceCache.textureForKey(hashKey);

            if (!this.texture) {
                this.texture = this.createTexture(dc);

                gpuResourceCache.putResource(gl, hashKey, this.texture, WorldWind.GPU_TEXTURE, this.texWidth * this.texHeight * 4);
            }
        };

        /**
         * Create a texture map that captures the text.
         * This texture map has the contents of the text centered in the middle of the texture map. This avoids boundary
         * effects that appear to be present in WebGL and that introduce undesirable visual artifacts.
         * @param {DrawContext} dc The drawing context.
         * @returns {WebGLTexture}
         */
        TextRenderer.prototype.createTexture = function(dc) {
            var gl = dc.currentGlContext,
                canvas2D = dc.canvas2D,
                ctx2D = dc.ctx2D;

            // Set the canvas size EARLY, because it loses properties after resizing!!!
            canvas2D.width = this.texWidth;
            canvas2D.height = this.texHeight;

            ctx2D.font = this.font.size.toString() + "px " + this.font.family;

            // Use middle for verticalAlignment, since it makes line placement cleaner.
            // Rendering of the texture box still honors verticalALignment.
            ctx2D.textBaseline = Font.verticalAlignments.middle;
            ctx2D.textAlign = this.font.horizontalAlignment;

            var x,  // Horizontal position for drawing text.
                y,  // Vertical position for drawing text.
                dyLine = this.font.size * this.lineSpacing;

            var xMiddle = this.texWidth / 2,
                yMiddle = this.texHeight / 2,
                xLeft = xMiddle - this.width / 2,
                xRight = xMiddle + this.width / 2,
                yTop = yMiddle - this.height / 2;

            // Apply horizontal alignment to the starting position.
            if (this.font.horizontalAlignment === Font.horizontalAlignments.start ||
                this.font.horizontalAlignment === Font.horizontalAlignments.left) {
                x = xLeft + 1;
            }
            else if (this.font.horizontalAlignment === Font.horizontalAlignments.end ||
                     this.font.horizontalAlignment === Font.horizontalAlignments.right) {
                x = xRight - 1;
            }
            else {
                x = xMiddle;
            }

            // Account for forcing middle vertical alignment while creating the texture.
            y = yTop + 1;
            y += dyLine / 2;

            // TODO: determine how to expose this functionality
            // Draw the text on a solid background rectangle.
            //if (this.font.color.alpha == 1) {
            //    ctx2D.fillStyle = this.font.backgroundColor.toHexString(false);
            //
            //    ctx2D.fillRect(xLeft, yTop, this.width, this.height);
            //}

            ctx2D.fillStyle = this.font.color.toHexString(false); // The DOM doesn't like alpha in colors.
            ctx2D.strokeStyle = this.font.backgroundColor.toHexString(false);
            ctx2D.fontWeight = this.font.weight;

            // For each line of text, draw it.
            for (var idx = 0, len = this.lines.length; idx < len; idx += 1) {
                // Fill the text and then draw its outline in the background color.
                ctx2D.fillText(this.lines[idx], x, y);
                ctx2D.strokeText(this.lines[idx], x, y);

                y += dyLine;
            }

            gl.pixelStorei(WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL, true);

            var texture = gl.createTexture();
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, texture);
            gl.texImage2D(WebGLRenderingContext.TEXTURE_2D, 0, WebGLRenderingContext.RGBA, WebGLRenderingContext.RGBA, WebGLRenderingContext.UNSIGNED_BYTE, canvas2D);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_MAG_FILTER, WebGLRenderingContext.LINEAR);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_MIN_FILTER, WebGLRenderingContext.LINEAR_MIPMAP_NEAREST);
            gl.generateMipmap(WebGLRenderingContext.TEXTURE_2D);
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, null);

            gl.pixelStorei(WebGLRenderingContext.UNPACK_FLIP_Y_WEBGL, false);

            return texture;
        };

        TextRenderer.prototype.bindGeometryVbo = function(dc) {
            var gl = dc.currentGlContext,
                gpuResourceCache = dc.gpuResourceCache,
                vbo = gpuResourceCache.resourceForKey(this.geometryVboCacheKey),
                points;

            // If the VBO does not yet exist, ...
            if (!vbo) {
                points = new Float32Array([
                    0.0, 0.0, 0.0,
                    1.0, 0.0, 0.0,
                    0.0, 1.0, 0.0,
                    1.0, 1.0, 0.0
                ]);
                vbo = gl.createBuffer();
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vbo);
                gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, points, WebGLRenderingContext.STATIC_DRAW);
                dc.frameStatistics.incrementVboLoadCount(1);
                gpuResourceCache.putResource(gl, this.geometryVboCacheKey, vbo, WorldWind.GPU_BUFFER, points.length * 4);
            }
            else {
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vbo);
            }
        };

        TextRenderer.prototype.bindTextureVbo = function(dc) {
            var gl = dc.currentGlContext,
                gpuResourceCache = dc.gpuResourceCache,
                vbo = gpuResourceCache.resourceForKey(this.texCoordVboCacheKey),
                texCoords;

            // If the VBO does not yet exist, ...
            if (!vbo) {
                texCoords = new Float32Array([
                    0.0, 0.0,
                    1.0, 0.0,
                    0.0, 1.0,
                    1.0, 1.0
                ]);
                vbo = gl.createBuffer();
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vbo);
                gl.bufferData(WebGLRenderingContext.ARRAY_BUFFER, texCoords, WebGLRenderingContext.STATIC_DRAW);
                dc.frameStatistics.incrementVboLoadCount(1);
                gpuResourceCache.putResource(gl, this.texCoordVboCacheKey, vbo, WorldWind.GPU_BUFFER, texCoords.length * 4);
            }
            else {
                gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, vbo);
            }
        };

        TextRenderer.prototype.bindIndicesVbo = function(dc) {
            var gl = dc.currentGlContext,
                gpuResourceCache = dc.gpuResourceCache,
                vbo = gpuResourceCache.resourceForKey(this.indicesVboCacheKey),
                indices;

            // If the VBO does not yet exist, ...
            if (!vbo) {
                indices = new Uint16Array([
                    0, 1, 2, 3
                ]);
                vbo = gl.createBuffer();
                gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, vbo);
                gl.bufferData(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, indices, WebGLRenderingContext.STATIC_DRAW);
                dc.frameStatistics.incrementVboLoadCount(1);
                gpuResourceCache.putResource(gl, this.indicesVboCacheKey, vbo, WorldWind.GPU_BUFFER, indices.length * 2);
            }
            else {
                gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, vbo);
            }
        };

        TextRenderer.prototype.getPowerOfTwo = function(value) {
            var pow = 1;
            while (pow < value) {
                pow *= 2;
            }
            return pow;
        };

        TextRenderer.prototype.postRender = function(dc) {
            var gl = dc.currentGlContext;

            gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, null);
            gl.bindBuffer(WebGLRenderingContext.ELEMENT_ARRAY_BUFFER, null);

            dc.bindProgram(gl, null);
        };

        TextRenderer.prototype.saveEnableDepthTest = function(dc, enableDepthTest) {
            var gl = dc.currentGlContext;

            // Query the previous depth test enable state.
            var savedEnableDepthTest = gl.isEnabled(WebGLRenderingContext.DEPTH_TEST);

            // Set the new depth test enable state.
            if (this.enableDepthTest) {
                gl.enable(WebGLRenderingContext.DEPTH_TEST);
            }
            else {
                gl.disable(WebGLRenderingContext.DEPTH_TEST);
            }

            return savedEnableDepthTest;
        };

        TextRenderer.prototype.restoreEnableDepthTest = function(dc, savedEnableDepthTest) {
            var gl = dc.currentGlContext;

            // Restore the previous depth test enable state.
            if (savedEnableDepthTest) {
                gl.enable(WebGLRenderingContext.DEPTH_TEST);
            }
            else {
                gl.disable(WebGLRenderingContext.DEPTH_TEST);
            }
        };

        return TextRenderer;
    }
);