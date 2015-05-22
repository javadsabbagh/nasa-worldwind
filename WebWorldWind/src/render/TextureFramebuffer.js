/*
 * Copyright (C) 2015 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports TextureFramebuffer
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger',
        '../util/WWMath'
    ],
    function (ArgumentError,
              Logger) {
        "use strict";

        /**
         * Constructs a texture framebuffer with the specified dimensions and an optional depth buffer.
         * @alias TextureFramebuffer
         * @constructor
         * @classdesc Represents an off-screen WebGL framebuffer. The framebuffer has color buffer stored in a 32
         * bit RGBA texture, and has an optional depth buffer of at least 16 bits. Applications typically do not
         * interact with this class.
         * @param {DrawContext} dc The current draw context.
         * @param {Number} width The width of the framebuffer, in pixels.
         * @param {Number} height The height of the framebuffer, in pixels.
         * @param {Boolean} depth true to configure the framebuffer with a depth buffer of at least 16 bits, false to
         * disable depth buffering.
         * @throws {ArgumentError} If the specified draw context is null or undefined, or if the width or height is less
         * than zero.
         */
        var TextureFramebuffer = function (dc, width, height, depth) {
            if (!dc) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "TextureFramebuffer", "constructor",
                    "missingDc"));
            }

            if (width < 0 || height < 0) {
                throw new ArgumentError(Logger.logMessage(Logger.LEVEL_SEVERE, "TextureFramebuffer", "constructor",
                    "The framebuffer width or height is less than zero."));
            }

            /**
             * The width of this framebuffer, in pixels.
             * @type {Number}
             * @readonly
             */
            this.width = width;

            /**
             * The height of this framebuffer, in pixels.
             * @type {Number}
             * @readonly
             */
            this.height = height;

            /**
             * Indicates whether or not this framebuffer has a depth buffer.
             * @type {Boolean}
             * @readonly
             */
            this.depth = depth;

            /**
             * Indicates the size of this framebuffer's WebGL resources, in bytes.
             * @type {Number}
             * @readonly
             */
            this.size = (width * height * 4) + (depth ? width * height * 2 : 0);

            var gl = dc.currentGlContext;

            // Internal. Intentionally not documented. Create this framebuffer's WebGL framebuffer object.
            this.framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, this.framebuffer);

            // Internal. Intentionally not documented. Configure this framebuffer's color buffer.
            this.texture = gl.createTexture();
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, this.texture);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_MIN_FILTER,
                WebGLRenderingContext.LINEAR);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_MAG_FILTER,
                WebGLRenderingContext.LINEAR);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_WRAP_S,
                WebGLRenderingContext.CLAMP_TO_EDGE);
            gl.texParameteri(WebGLRenderingContext.TEXTURE_2D, WebGLRenderingContext.TEXTURE_WRAP_T,
                WebGLRenderingContext.CLAMP_TO_EDGE);
            gl.texImage2D(WebGLRenderingContext.TEXTURE_2D, 0, WebGLRenderingContext.RGBA, width, height, 0,
                WebGLRenderingContext.RGBA, WebGLRenderingContext.UNSIGNED_BYTE, null);
            gl.framebufferTexture2D(WebGLRenderingContext.FRAMEBUFFER, WebGLRenderingContext.COLOR_ATTACHMENT0,
                WebGLRenderingContext.TEXTURE_2D, this.texture, 0);

            // Internal. Intentionally not documented. Configure this framebuffer's optional depth buffer.
            this.depthBuffer = null;
            if (depth) {
                this.depthBuffer = gl.createRenderbuffer();
                gl.bindRenderbuffer(WebGLRenderingContext.RENDERBUFFER, this.depthBuffer);
                gl.renderbufferStorage(WebGLRenderingContext.RENDERBUFFER, WebGLRenderingContext.DEPTH_COMPONENT16,
                    width, height);
                gl.framebufferRenderbuffer(WebGLRenderingContext.FRAMEBUFFER, WebGLRenderingContext.DEPTH_ATTACHMENT,
                    WebGLRenderingContext.RENDERBUFFER, this.depthBuffer);
            }

            var e = gl.checkFramebufferStatus(WebGLRenderingContext.FRAMEBUFFER);
            if (e != WebGLRenderingContext.FRAMEBUFFER_COMPLETE) {
                Logger.logMessage(Logger.LEVEL_WARNING, "TextureFramebuffer", "constructor",
                    "Error creating framebuffer: " + e);
                this.framebuffer = null;
                this.texture = null;
                this.depthBuffer = null;
            }

            gl.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, null);
            gl.bindTexture(WebGLRenderingContext.TEXTURE_2D, null);
            gl.bindRenderbuffer(WebGLRenderingContext.RENDERBUFFER, null);
        };

        /**
         * Binds this off-screen framebuffer's texture in the current WebGL graphics context. This texture contains
         * color fragments resulting from WebGL operations executed when this framebuffer is bound by a call to
         * [TextureFramebuffer.bindFramebuffer]{@link TextureFramebuffer#bindFramebuffer}.
         *
         * @param {DrawContext} dc The current draw context.
         * @returns {Boolean} true if this framebuffer's texture was bound successfully, otherwise false.
         */
        TextureFramebuffer.prototype.bind = function (dc) {
            if (this.texture) {
                dc.currentGlContext.bindTexture(WebGLRenderingContext.TEXTURE_2D, this.texture);
            }

            return !!this.texture;
        };

        /**
         * Binds this off-screen framebuffer as the current WebGL framebuffer. WebGL operations that affect the
         * framebuffer now affect this framebuffer, rather than the default WebGL framebuffer. Color fragments are
         * written to a WebGL texture, which can be made active by calling
         * [TextureFramebuffer.bind]{@link TextureFramebuffer#bind}.
         *
         * @param {DrawContext} dc The current draw context.
         * @returns {Boolean} true if this framebuffer was bound successfully, otherwise false.
         */
        TextureFramebuffer.prototype.bindFramebuffer = function (dc) {
            if (this.framebuffer) {
                dc.currentGlContext.bindFramebuffer(WebGLRenderingContext.FRAMEBUFFER, this.framebuffer);
            }

            return !!this.framebuffer;
        };

        return TextureFramebuffer;
    });