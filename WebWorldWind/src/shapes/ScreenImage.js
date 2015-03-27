/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ScreenImage
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../shaders/BasicTextureProgram',
        '../util/Color',
        '../util/Logger',
        '../geom/Matrix',
        '../util/Offset',
        '../pick/PickedObject',
        '../render/Renderable',
        '../geom/Vec3',
        '../util/WWMath'
    ],
    function (ArgumentError,
              BasicTextureProgram,
              Color,
              Logger,
              Matrix,
              Offset,
              PickedObject,
              Renderable,
              Vec3,
              WWMath) {
        "use strict";

        /**
         * Constructs a screen image.
         * @alias ScreenImage
         * @constructor
         * @augments Renderable
         * @classdesc Displays an image at a specified screen location in the World Window.
         * The image location is specified by an offset, which causes the image to maintain its relative position
         * when the window size changes.
         * @param {Offset} screenOffset The offset indicating the image's placement on the screen.
         * Use [the image offset property]{@link ScreenImage#imageOffset} to position the image relative to the
         * specified screen offset.
         * @param {String} imagePath The URL of the image to display.
         * @throws {ArgumentError} If the specified screen point or image path is null or undefined.
         */
        var ScreenImage = function (screenOffset, imagePath) {
            if (!screenOffset) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ScreenImage", "constructor", "missingOffset"));
            }

            if (!imagePath) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ScreenImage", "constructor", "missingPath"));
            }

            Renderable.call(this);

            /**
             * The offset indicating this screen image's placement on the screen.
             * @type {Offset}
             */
            this.screenOffset = screenOffset;

            /**
             * The URL of the image to display.
             * @type {String}
             * @default null
             */
            this._imagePath = imagePath;

            /**
             * The image color. When displayed, this shape's image is multiplied by this image color to achieve the
             * final image color. The color white, the default, causes the image to be drawn in its native colors.
             * @type {Color}
             * @default White (1, 1, 1, 1)
             */
            this.imageColor = Color.WHITE;

            /**
             * Indicates the location within the image at which to align with the specified screen location.
             * May be null, in which case the image's bottom-left corner is placed at the screen location.
             * @type {Offset}
             * @default 0.5, 0.5, both fractional (Centers the image on the screen location.)
             */
            this.imageOffset = new Offset(WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0.5);

            /**
             * Indicates the amount to scale the image.
             * @type {Number}
             * @default 1
             */
            this.imageScale = 1;

            /**
             * The amount of rotation to apply to the image, measured in degrees clockwise from the top of the window.
             * @type {number}
             * @default 0
             */
            this.imageRotation = 0;

            /**
             * The amount of tilt to apply to the image, measured in degrees.
             * @type {number}
             * @default 0
             */
            this.imageTilt = 0;

            /**
             * Indicates whether this screen image is drawn.
             * @type {boolean}
             * @default true
             */
            this.enabled = true;

            /**
             * This image's opacity. When this screen image is drawn, the actual opacity is the product of
             * this opacity and the opacity of the layer containing this screen image.
             * @type {number}
             */
            this.opacity = 1;

            /**
             * Indicates the object to return as the <code>userObject</code> of this shape when picked. If null,
             * then this shape is returned as the <code>userObject</code>.
             * @type {Object}
             * @default null
             * @see  [PickedObject.userObject]{@link PickedObject#userObject}
             */
            this.pickDelegate = null;

            // Internal use only. Intentionally not documented.
            this.activeTexture = null;

            // Internal use only. Intentionally not documented.
            this.imageTransform = Matrix.fromIdentity();

            // Internal use only. Intentionally not documented.
            this.texCoordMatrix = Matrix.fromIdentity();

            // Internal use only. Intentionally not documented.
            this.imageBounds = null;

            // Internal use only. Intentionally not documented.
            this.layer = null;
        };

        // Internal use only. Intentionally not documented.
        ScreenImage.matrix = Matrix.fromIdentity(); // scratch variable

        ScreenImage.prototype = Object.create(Renderable.prototype);

        Object.defineProperties(ScreenImage.prototype, {
            imagePath: {
                get: function () {
                    return this._imagePath;
                },
                set: function (imagePath) {
                    if (!imagePath) {
                        throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceImage", "imagePath",
                            "missingPath"));
                    }

                    this._imagePath = imagePath;
                    this.imagePathWasUpdated = true;
                }
            }
        });

        /**
         * Renders this screen image. This method is typically not called by applications but is called by
         * [RenderableLayer]{@link RenderableLayer} during rendering. For this shape this method creates and
         * enques an ordered renderable with the draw context and does not actually draw the image.
         * @param {DrawContext} dc The current draw context.
         */
        ScreenImage.prototype.render = function (dc) {
            if (!this.enabled) {
                return;
            }

            // Create an ordered renderable, but don't create more than one per frame.
            var orderedScreenImage = null;
            if (this.lastFrameTime !== dc.timestamp) {
                orderedScreenImage = this.makeOrderedRenderable(dc);
            }

            if (!orderedScreenImage) {
                return;
            }

            if (!orderedScreenImage.isVisible(dc)) {
                return;
            }

            orderedScreenImage.layer = dc.currentLayer;

            this.lastFrameTime = dc.timestamp;
            dc.addOrderedRenderable(orderedScreenImage);
        };

        /**
         * Draws this shape as an ordered renderable. Applications do not call this function. It is called by
         * [WorldWindow]{@link WorldWindow} during rendering.
         * @param {DrawContext} dc The current draw context.
         */
        ScreenImage.prototype.renderOrdered = function (dc) {
            this.drawOrderedScreenImage(dc);

            if (dc.pickingMode) {
                var po = new PickedObject(this.pickColor.clone(), this.pickDelegate ? this.pickDelegate : this,
                    null, this.layer, false);
                dc.resolvePick(po);
            }
        };

        ScreenImage.prototype.makeOrderedRenderable = function (dc) {
            var w, h, s, ws, hs,
                iOffset, sOffset;

            this.activeTexture = dc.gpuResourceCache.resourceForKey(this._imagePath);
            if (!this.activeTexture) {
                dc.gpuResourceCache.retrieveTexture(dc.currentGlContext, this._imagePath);
                return null;
            }

            this.eyeDistance = 0;

            // Compute the image's transform matrix and texture coordinate matrix according to its screen point, image size,
            // image offset and image scale. The image offset is defined with its origin at the image's bottom-left corner and
            // axes that extend up and to the right from the origin point.
            w = this.activeTexture.imageWidth;
            h = this.activeTexture.imageHeight;
            s = this.imageScale;
            iOffset = this.imageOffset.offsetForSize(w, h);
            ws = dc.navigatorState.viewport.width;
            hs = dc.navigatorState.viewport.height;
            sOffset = this.screenOffset.offsetForSize(ws, hs);

            this.imageTransform.setTranslation(
                sOffset[0] - iOffset[0] * s,
                sOffset[1] - iOffset[1] * s,
                0);

            this.imageTransform.setScale(w * s, h * s, 1);

            this.imageBounds = WWMath.boundingRectForUnitQuad(this.imageTransform);

            return this;
        };

        // Internal. Intentionally not documented.
        ScreenImage.prototype.isVisible = function (dc) {
            if (dc.pickingMode) {
                return dc.pickRectangle && (this.imageBounds.intersects(dc.pickRectangle));
            } else {
                return this.imageBounds.intersects(dc.navigatorState.viewport);
            }
        };

        // Internal. Intentionally not documented.
        ScreenImage.prototype.drawOrderedScreenImage = function (dc) {
            this.beginDrawing(dc);
            try {
                this.doDrawOrderedScreenImage(dc);
            } finally {
                this.endDrawing(dc);
            }
        };

        // Internal. Intentionally not documented.
        ScreenImage.prototype.beginDrawing = function (dc) {
            var gl = dc.currentGlContext,
                program;

            dc.findAndBindProgram(gl, BasicTextureProgram);

            // Configure GL to use the draw context's unit quad VBOs for both model coordinates and texture coordinates.
            // Most browsers can share the same buffer for vertex and texture coordinates, but Internet Explorer requires
            // that they be in separate buffers, so the code below uses the 3D buffer for vertex coords and the 2D
            // buffer for texture coords.
            program = dc.currentProgram;
            gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, dc.unitQuadBuffer());
            gl.vertexAttribPointer(program.vertexTexCoordLocation, 2, WebGLRenderingContext.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.vertexPointLocation);
            gl.enableVertexAttribArray(program.vertexTexCoordLocation);

            // Tell the program which texture unit to use.
            program.loadTextureUnit(gl, WebGLRenderingContext.TEXTURE0);
            program.loadModulateColor(gl, dc.pickingMode);

            // Turn off depth testing.
            gl.disable(WebGLRenderingContext.DEPTH_TEST);
        };

        // Internal. Intentionally not documented.
        ScreenImage.prototype.endDrawing = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.currentProgram;

            // Clear the vertex attribute state.
            gl.disableVertexAttribArray(program.vertexPointLocation);
            gl.disableVertexAttribArray(program.vertexTexCoordLocation);

            // Clear GL bindings.
            dc.bindProgram(gl, null);
            gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, null);
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, null);

            // Re-enable depth testing.
            gl.enable(WebGLRenderingContext.DEPTH_TEST);
        };

        // Internal. Intentionally not documented.
        ScreenImage.prototype.doDrawOrderedScreenImage = function (dc) {
            var gl = dc.currentGlContext,
                program = dc.currentProgram;

            gl.bindBuffer(WebGLRenderingContext.ARRAY_BUFFER, dc.unitQuadBuffer3());
            gl.vertexAttribPointer(program.vertexPointLocation, 3, WebGLRenderingContext.FLOAT, false, 0, 0);

            // Compute and specify the MVP matrix.
            ScreenImage.matrix.copy(dc.screenProjection);
            ScreenImage.matrix.multiplyMatrix(this.imageTransform);

            if (this.imageRotation !== 0 || this.imageTilt !== 0) {
                ScreenImage.matrix.multiplyByTranslation(0.5, 0.5, 0.5);
                ScreenImage.matrix.multiplyByRotation(1, 0, 0, this.imageTilt);
                ScreenImage.matrix.multiplyByRotation(0, 0, 1, this.imageRotation);
                ScreenImage.matrix.multiplyByTranslation(-0.5, -0.5, 0);
            }

            program.loadModelviewProjection(gl, ScreenImage.matrix);

            // Enable texture for both normal display and for picking. If picking is enabled in the shader (set in
            // beginDrawing() above) then the texture's alpha component is still needed in order to modulate the
            // pick color to mask off transparent pixels.
            program.loadTextureEnabled(gl, true);

            // Set the pick color for picking or the color and opacity if not picking.
            if (dc.pickingMode) {
                this.pickColor = dc.uniquePickColor();
                program.loadColor(gl, this.pickColor);
            } else {
                program.loadColor(gl, this.imageColor);
                program.loadOpacity(gl, this.opacity * this.layer.opacity);
            }

            this.texCoordMatrix.setToIdentity();
            this.texCoordMatrix.multiplyByTextureTransform(this.activeTexture);
            program.loadTextureMatrix(gl, this.texCoordMatrix);

            if (this.activeTexture.bind(dc)) { // returns false if active texture cannot be bound
                // Draw the placemark's image quad.
                gl.drawArrays(WebGLRenderingContext.TRIANGLE_STRIP, 0, 4);
            }
        };

        return ScreenImage;
    })
;