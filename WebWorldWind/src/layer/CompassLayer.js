/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports CompassLayer
 * @version $Id$
 */
define([
        '../shapes/Compass',
        '../layer/RenderableLayer'
    ],
    function (Compass,
              RenderableLayer) {
        "use strict";

        /**
         * Constructs a compass layer.
         * @alias CompassLayer
         * @constructor
         * @augments RenderableLayer
         * @classdesc Displays a compass.
         */
        var CompassLayer = function () {
            RenderableLayer.call(this, "Compass");

            this._compass = new Compass(null, null);

            this.addRenderable(this._compass);
        };

        CompassLayer.prototype = Object.create(RenderableLayer.prototype);

        Object.defineProperties(CompassLayer.prototype, {
            /**
             * The compass to display.
             * @type {Compass}
             * @default {@link Compass}
             * @memberof CompassLayer.prototype
             */
            compass: {
                get: function () {
                    return this._compass;
                },
                set: function (compass) {
                    if (compass && compass instanceof Compass) {
                        this.removeAllRenderables();
                        this.addRenderable(compass);
                        this._compass = compass;
                    }
                }
            }
        });

        return CompassLayer;
    });