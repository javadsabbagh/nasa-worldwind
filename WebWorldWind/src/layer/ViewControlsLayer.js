/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ViewControlsLayer
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../layer/Layer',
        '../util/Logger',
        '../util/Offset',
        '../shapes/ScreenImage',
        '../util/WWUtil'
    ],
    function (ArgumentError,
              Layer,
              Logger,
              Offset,
              ScreenImage,
              WWUtil) {
        "use strict";

        /**
         * Constructs a view controls layer.
         * @alias ViewControlsLayer
         * @constructor
         * @augments {WorldWindow}
         * @classdesc Displays and manages view controls.
         * @param {WorldWindow} worldWindow The World Window associated with this layer.
         * This layer may not be associated with more than one World Window.
         *
         * <p>
         *     Placement of the controls within the world window is defined by the
         *     [placement]{@link ViewControlsLayer#placement} and [alignment]{@link ViewControlsLayer#alignment}
         *     properties. The default values of these properties place the view controls at the lower left corner
         *     of the world window. The placement property specifies the overall position of the controls within the
         *     world window. The alignment property specifies the alignment of the controls collection relative to
         *     the placement position. Some common combinations are:
         *     <table>
         *         <tr>
         *             <th>Location</th>
         *             <th>Placement</th>
         *             <th>Alignment</th>
         *         </tr>
         *         <tr>
         *             <td>Bottom Left</td>
         *             <td>WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 0</td>
         *             <td>WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 0</td>
         *         </tr>
         *         <tr>
         *             <td>Top Right</td>
         *             <td>WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 1</td>
         *             <td>WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 1</td>
         *         </tr>
         *         <tr>
         *             <td>Top Left</td>
         *             <td>WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 1</td>
         *             <td>WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 1</td>
         *         </tr>
         *         <tr>
         *             <td>Bottom Center</td>
         *             <td>WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0</td>
         *             <td>WorldWind.OFFSET_FRACTION, 0.5, WorldWind.OFFSET_FRACTION, 0</td>
         *         </tr>
         *         <tr>
         *             <td>Southeast</td>
         *             <td>WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 0.25</td>
         *             <td>WorldWind.OFFSET_FRACTION, 1, WorldWind.OFFSET_FRACTION, 0.5</td>
         *         </tr>
         *     </table>
         * </p>
         * @throws {ArgumentError} If the specified world window is null or undefined.
         */
        var ViewControlsLayer = function (worldWindow) {
            if (!worldWindow) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "ViewControlsLayer", "constructor", "missingWorldWindow"));
            }

            Layer.call(this, "View Controls");

            /**
             * The World Window associated with this layer.
             * @type {WorldWindow}
             * @readonly
             */
            this.wwd = worldWindow;

            /**
             * An {@link Offset} indicating where to place the controls on the screen.
             * @type {Offset}
             * @default The lower left corner of the window.
             */
            this.placement = new Offset(WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 0);

            /**
             * An {@link Offset} indicating the alignment of the controls collection relative to the
             * [placement position]{@link ViewControlsLayer#placement}. A value of
             * {WorldWind.FRACTION, 0, WorldWind.Fraction 0} places the bottom left corner of the control collection
             * at the placement position.
             * @type {null}
             * @default The lower left corner of the window.
             */
            this.alignment = new Offset(WorldWind.OFFSET_FRACTION, 0, WorldWind.OFFSET_FRACTION, 0);

            // These are documented in their property accessors below.
            this._inactiveOpacity = 0.5;
            this._activeOpacity = 1.0;

            // Set the screen and image offsets of each control to the lower left corner.
            var screenOffset = new Offset(WorldWind.OFFSET_PIXELS, 0, WorldWind.OFFSET_PIXELS, 0),
                imagePath = WWUtil.currentUrlSansFilePart() + "/../images/view/";

            // These controls are all internal and intentionally not documented.
            this.panControl = new ScreenImage(screenOffset.clone(), imagePath + "view-pan-64x64.png");
            this.zoomInControl = new ScreenImage(screenOffset.clone(), imagePath + "view-zoom-in-32x32.png");
            this.zoomOutControl = new ScreenImage(screenOffset.clone(), imagePath + "view-zoom-out-32x32.png");
            this.headingLeftControl = new ScreenImage(screenOffset.clone(), imagePath + "view-heading-left-32x32.png");
            this.headingRightControl = new ScreenImage(screenOffset.clone(), imagePath + "view-heading-right-32x32.png");
            this.tiltUpControl = new ScreenImage(screenOffset.clone(), imagePath + "view-pitch-up-32x32.png");
            this.tiltDownControl = new ScreenImage(screenOffset.clone(), imagePath + "view-pitch-down-32x32.png");
            this.exaggerationUpControl = new ScreenImage(screenOffset.clone(), imagePath + "view-elevation-up-32x32.png");
            this.exaggerationDownControl = new ScreenImage(screenOffset.clone(), imagePath + "view-elevation-down-32x32.png");
            this.fovNarrowControl = new ScreenImage(screenOffset.clone(), imagePath + "view-fov-narrow-32x32.png");
            this.fovWideControl = new ScreenImage(screenOffset.clone(), imagePath + "view-fov-wide-32x32.png");

            // Disable the FOV controls by default.
            this.fovNarrowControl.enabled = false;
            this.fovWideControl.enabled = false;

            // Put the controls in an array so we can more easily apply bulk operations.
            this.controls = [
                this.panControl,
                this.zoomInControl,
                this.zoomOutControl,
                this.headingLeftControl,
                this.headingRightControl,
                this.tiltUpControl,
                this.tiltDownControl,
                this.exaggerationUpControl,
                this.exaggerationDownControl,
                this.fovNarrowControl,
                this.fovWideControl
            ];

                for (var i = 0; i < this.controls.length; i++) {
                this.controls[i].imageOffset = screenOffset.clone();
                this.controls[i].opacity = this._inactiveOpacity;
            }
        };

        ViewControlsLayer.prototype = Object.create(Layer.prototype);

        Object.defineProperties(ViewControlsLayer.prototype, {
            showPanControl: {
                get: function () {
                    return this.panControl.enabled;
                },
                set: function (value) {
                    this.panControl.enabled = value;
                }
            },

            showZoomControl: {
                get: function () {
                    return this.zoomInControl.enabled;
                },
                set: function (value) {
                    this.zoomInControl.enabled = value;
                    this.zoomOutControl.enabled = value;
                }
            },

            showHeadingControl: {
                get: function () {
                    return this.headingLeftControl.enabled;
                },
                set: function (value) {
                    this.headingLeftControl.enabled = value;
                    this.headingRightControl.enabled = value;
                }
            },

            showTiltControl: {
                get: function () {
                    return this.tiltUpControl.enabled;
                },
                set: function (value) {
                    this.tiltUpControl.enabled = value;
                    this.tiltDownControl.enabled = value;
                }
            },

            showExaggerationControl: {
                get: function () {
                    return this.exaggerationUpControl.enabled;
                },
                set: function (value) {
                    this.exaggerationUpControl.enabled = value;
                    this.exaggerationDownControl.enabled = value;
                }
            },

            showFovControl: {
                get: function () {
                    return this.fovNarrowControl.enabled;
                },
                set: function (value) {
                    this.fovNarrowControl.enabled = value;
                    this.fovWideControl.enabled = value;
                }
            },

            /**
             * The opacity of the controls when they are not in use. The opacity should be a value between 0 and 1,
             * with 1 indicating fully opaque.
             * @type {Number}
             * @default 0.5
             */
            inactiveOpacity: {
                get: function () {
                    return this._inactiveOpacity;
                },
                set: function (value) {
                    this._inactiveOpacity = value;
                    for (var i = 0; i < this.controls.length; i++) {
                        this.controls[i].opacity = value;
                    }
                }
            },

            /**
             * The opacity of the controls when they are in use. The opacity should be a value between 0 and 1,
             * with 1 indicating fully opaque.
             * @type {Number}
             * @default 1
             */
            activeOpacity: {
                get: function () {
                    return this._activeOpacity;
                },
                set: function (value) {
                    this._activeOpacity = value;
                    for (var i = 0; i < this.controls.length; i++) {
                        this.controls[i].opacity = value;
                    }
                }
            }
        });

        // Documented in superclass.
        ViewControlsLayer.prototype.doRender = function (dc) {
            var controlPanelWidth = 0, controlPanelHeight = 64,
                panelOffset, screenOffset,
                x, y;

            // Determine the dimensions of the control panel.
            if (this.showPanControl) {
                controlPanelWidth += 64;
            }
            if (this.showZoomControl) {
                controlPanelWidth += 32;
            }
            if (this.showHeadingControl) {
                controlPanelWidth += 32;
            }
            if (this.showTiltControl) {
                controlPanelWidth += 32;
            }
            if (this.showExaggerationControl) {
                controlPanelWidth += 32;
            }
            if (this.showFovControl) {
                controlPanelWidth += 32;
            }

            screenOffset = this.placement.offsetForSize(dc.navigatorState.viewport.width,
                dc.navigatorState.viewport.height);
            panelOffset = this.alignment.offsetForSize(controlPanelWidth, controlPanelHeight);
            x = screenOffset[0] - panelOffset[0];
            y = screenOffset[1] - panelOffset[1];

            if (this.showPanControl) {
                this.panControl.screenOffset.x = x;
                this.panControl.screenOffset.y = y;
                this.panControl.render(dc);
                x += 64;
            }

            if (this.showZoomControl) {
                this.zoomOutControl.screenOffset.x = x;
                this.zoomOutControl.screenOffset.y = y;
                this.zoomInControl.screenOffset.x = x;
                this.zoomInControl.screenOffset.y = y + 32;
                this.zoomOutControl.render(dc);
                this.zoomInControl.render(dc);
                x += 32;
            }

            if (this.showHeadingControl) {
                this.headingRightControl.screenOffset.x = x;
                this.headingRightControl.screenOffset.y = y;
                this.headingLeftControl.screenOffset.x = x;
                this.headingLeftControl.screenOffset.y = y + 32;
                this.headingRightControl.render(dc);
                this.headingLeftControl.render(dc);
                x += 32;
            }

            if (this.showTiltControl) {
                this.tiltDownControl.screenOffset.x = x;
                this.tiltDownControl.screenOffset.y = y;
                this.tiltUpControl.screenOffset.x = x;
                this.tiltUpControl.screenOffset.y = y + 32;
                this.tiltDownControl.render(dc);
                this.tiltUpControl.render(dc);
                x += 32;
            }

            if (this.showExaggerationControl) {
                this.exaggerationDownControl.screenOffset.x = x;
                this.exaggerationDownControl.screenOffset.y = y;
                this.exaggerationUpControl.screenOffset.x = x;
                this.exaggerationUpControl.screenOffset.y = y + 32;
                this.exaggerationUpControl.render(dc);
                this.exaggerationDownControl.render(dc);
                x += 32;
            }

            if (this.showFovControl) {
                this.fovNarrowControl.screenOffset.x = x;
                this.fovNarrowControl.screenOffset.y = y;
                this.fovWideControl.screenOffset.x = x;
                this.fovWideControl.screenOffset.y = y + 32;
                this.fovNarrowControl.render(dc);
                this.fovWideControl.render(dc);
            }
        };

        return ViewControlsLayer;
    });