/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Renderable
 * @version $Id$
 */
define([
        '../util/Logger',
        '../error/UnsupportedOperationError'
    ],
    function (Logger,
              UnsupportedOperationError) {
        "use strict";

        /**
         * Constructs a base renderable.
         * @alias Renderable
         * @constructor
         * @classdesc Represents a shape or other object that can be rendered. This is an abstract class and is not
         * meant to be instantiated directly.
         */
        var Renderable = function () {

            /**
             * The display name of the renderable.
             * @type {string}
             */
            this.displayName = "Renderable";

            /**
             * Indicates whether this renderable is displayed.
             * @type {boolean}
             */
            this.enabled = true;

            /**
             * Indicates the object to return as the <code>userObject</code> of this placemark when picked. If null,
             * then this renderable is returned as the <code>userObject</code>.
             * @type {Object}
             * @default null
             * @see  [PickedObject.userObject]{@link PickedObject#userObject}
             */
            this.pickDelegate = null;
        };

        /**
         * Render this renderable. Some  shapes actually draw themselves during this call, others only add themselves
         * to the draw context's ordered rendering list for subsequent drawing when the renderOrdered method is called.
         * This method is intended to be called by layers such as {@link RenderableLayer} and not by applications.
         * @param {DrawContext} dc The current draw context.
         */
        Renderable.prototype.render = function (dc) {
            throw new UnsupportedOperationError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "Renderable", "render", "abstractInvocation"));
        };

        return Renderable;
    });