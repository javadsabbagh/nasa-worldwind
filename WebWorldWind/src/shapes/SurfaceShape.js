/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceShape
 * @version $Id$
 */
define([
        '../geom/Angle',
        '../error/ArgumentError',
        '../geom/Location',
        '../util/Logger',
        '../pick/PickedObject',
        '../render/Renderable',
        '../geom/Sector',
        '../shapes/ShapeAttributes',
        '../error/UnsupportedOperationError',
        '../util/WWMath'
    ],
    function (Angle,
              ArgumentError,
              Location,
              Logger,
              PickedObject,
              Renderable,
              Sector,
              ShapeAttributes,
              UnsupportedOperationError,
              WWMath) {
        "use strict";

        /**
         * Constructs a surface shape with an optionally specified bundle of default attributes.
         * @alias SurfaceShape
         * @constructor
         * @augments Renderable
         * @abstract
         * @classdesc Represents a surface shape. This is an abstract base class and is meant to be instantiated
         * only by subclasses.
         * <p>
         *     Surface shapes other than [SurfacePolyline]{@link SurfacePolyline} have an interior and an outline and utilize
         *     the corresponding attributes in their associated [ShapeAttributes]{@link ShapeAttributes}. They do not
         *     utilize image-related attributes.
         * @param {ShapeAttributes} attributes The attributes to apply to this shape. May be null, in which case
         * attributes must be set directly before the shape is drawn.
         */
        var SurfaceShape = function (attributes) {

            Renderable.call(this);

            /**
             * The shape's display name and label text.
             * @type {string}
             * @default Surface Shape
             */
            this.displayName = "Surface Shape";

            /**
             * The shape's attributes. If null and this shape is not highlighted, this shape is not drawn.
             * @type {ShapeAttributes}
             * @default see [ShapeAttributes]{@link ShapeAttributes}
             */
            this.attributes = attributes ? attributes : new ShapeAttributes(null);

            /**
             * The attributes used when this shape's highlighted flag is <code>true</code>. If null and the
             * highlighted flag is true, this shape's normal attributes are used. If they, too, are null, this
             * shape is not drawn.
             * @type {ShapeAttributes}
             * @default null
             */
            this.highlightAttributes = null;

            /**
             * Indicates whether this shape displays with its highlight attributes rather than its normal attributes.
             * @type {boolean}
             * @default false
             */
            this.highlighted = false;

            /**
             * Indicates whether this shape is drawn.
             * @type {boolean}
             * @default true
             */
            this.enabled = true;

            /**
             * The path type to used to interpolate between locations on this shape. Recognized values are:
             * <ul>
             * <li>WorldWind.GREAT_CIRCLE</li>
             * <li>WorldWind.RHUMB_LINE</li>
             * <li>WorldWind.LINEAR</li>
             * </ul>
             * @type {string}
             * @default WorldWind.GREAT_CIRCLE
             */
            this.pathType = WorldWind.GREAT_CIRCLE;

            /**
             * Indicates the object to return as the owner of this shape when picked.
             * @type {Object}
             * @default null
             */
            this.pickDelegate = null;

            /**
             * The maximum number of intervals an edge will be broken into. This is the number of intervals that an
             * edge that spans to opposite side of the globe would be broken into. This is strictly an upper bound
             * and the number of edge intervals may be lower if this resolution is not needed.
             * @type {number}
             * @default SurfaceShape.DEFAULT_NUM_EDGE_INTERVALS
             */
            this.maximumNumEdgeIntervals = SurfaceShape.DEFAULT_NUM_EDGE_INTERVALS;

            /**
             * A dimensionless number that controls throttling of edge traversal near the poles where edges need to be
             * sampled more closely together.
             * A value of 0 indicates that no polar throttling is to be performed.
             * @type {number}
             * @default SurfaceShape.DEFAULT_POLAR_THROTTLE
             */
            this.polarThrottle = SurfaceShape.DEFAULT_POLAR_THROTTLE;
            /**
             * Defines the extent of the shape in latitude and longitude.
             * Initially it is a full sphere, but as geometry is determined, it is filled in to reflect that geometry.
             * @type {Sector}
             */
            this.sector = new Sector(-90, 90, -180, 180);

            /**
             * The bounding sectors for this tile, which may be needed for crossing the dateline.
             * @type {Sector[]}
             */
            this.sectors = [];

            /**
             * The raw collection of locations defining this shape and are explicitly specified by the client of this class.
             * @type {Location[]}
             */
            this.locations = null;

            /**
             * Boundaries that are either the user specified locations or locations that are algorithmically generated.
             * @type {Location[]}
             */
            this.boundaries = null;

            /**
             * The collection of locations that describes a closed curve which can be filled.
             * @type {Location[][]}
             */
            this.interiorGeometry = null;

            /**
             * The collection of locations that describe the outline of the shape.
             * @type {Location[][]}
             */
            this.outlineGeometry = null;

            /**
             * Internal use only.
             * Inhibit the filling of the interior. This is to be used ONLY by polylines.
             * @type {boolean}
             */
            this.isInteriorInhibited = false;

            // Internal use only. Intentionally not documented.
            this.lastUpdatedTime = Date.now();
        };

        SurfaceShape.prototype = Object.create(Renderable.prototype);

        Object.defineProperties(SurfaceShape.prototype, {
            /**
             * Indicates whether this shape displays with its highlight attributes rather than its normal attributes.
             * @memberof SurfaceShape.prototype
             * @type {boolean}
             * @default false
             */
            highlighted: {
                get: function() {
                    return this._highlighted;
                },
                set: function(value) {
                    this._highlighted = value;
                    this.lastUpdatedTime = Date.now();
                }
            }
        });

        /**
         * Returns this shape's area in square meters.
         * @param {Globe} globe The globe on which to compute the area.
         * @param {Boolean} terrainConformant If <code>true</code> the returned area is that of the terrain,
         * including its hillsides and other undulations. If <code>false</code> the returned area is the shape's
         * projected area.
         */
        SurfaceShape.prototype.area = function (globe, terrainConformant) {
            throw new UnsupportedOperationError(
                Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceShape", "area", "abstractInvocation"));
        };

        // Internal function. Intentionally not documented.
        SurfaceShape.prototype.computeBoundaries = function(globe) {
            // This method is in the base class and should be overridden if the boundaries are generated.
            // It should be called only if the geometry has been provided by the user and does not need to be generated.
            // assert(!this.boundaries);
        };

        // Internal function. Intentionally not documented.
        SurfaceShape.prototype.render = function(dc) {
            this.computeGeometry(dc);

            dc.surfaceShapeTileBuilder.insertSurfaceShape(this);
        };

        // Internal function. Intentionally not documented.
        SurfaceShape.prototype.interpolateLocations = function(locations) {
            var first  = locations[0];

            this.locations = [first];

            var prev = first;
            for (var idx = 1, len = locations.length; idx < len; idx += 1) {
                var next = locations[idx];

                this.interpolateEdge(prev, next, this.locations);
                this.locations.push(next);

                prev = next;
            }

            if (!this.isInteriorInhibited) {
                // Force the closing of the border.
                this.interpolateEdge(prev, first, this.locations);
                this.locations.push(first);
            }
        };

        SurfaceShape.prototype.interpolateEdge = function(start, end, locations) {
            var distanceRadians = Location.greatCircleDistance(start, end),
                steps = Math.ceil(this.maximumNumEdgeIntervals * distanceRadians / Math.PI),
                dt = 1 / steps,
                location = start;

            for (var t = this.throttledStep(dt, location); t < 1; t += this.throttledStep(dt, location)) {
                location = new Location(0, 0);
                Location.interpolateAlongPath(this.pathType, t, start, end, location);
                locations.push(location);
            }
        };

        // Internal function. Intentionally not documented.
        // Return a throttled step size when near the poles.
        SurfaceShape.prototype.throttledStep = function(dt, location) {
            var cosLat = Math.cos(location.latitude * Angle.DEGREES_TO_RADIANS);
            cosLat *= cosLat; // Square cos to emphasize poles and de-emphasize equator.

            // Remap polarThrotle:
            //  0 .. INF => 0 .. 1
            // This acts as a weight between no throttle and fill throttle.
            var weight = this.polarThrottle / (1 + this.polarThrottle);

            return dt * ((1 - weight) + weight * cosLat);
        };

        // Internal function. Intentionally not documented.
        SurfaceShape.prototype.prepareBoundaries = function(dc) {
            if (!this.boundaries) {
                this.computeBoundaries(dc);
            }

            if (!this.locations) {
                this.interpolateLocations(this.boundaries);
            }
        };

        /**
         * Computes the bounding sectors for the shape. There will be more than one if the shape crosses the date line, but
         * does not enclose a pole.
         *
         * @param {DrawContext} dc The drawing context containing a globe.
         *
         * @return {Sector[]}  Bounding sectors for the shape.
         */
        SurfaceShape.prototype.computeSectors = function(dc) {
            // Return a previously computed value if it already exists.
            if (this.sectors && this.sectors.length > 0) {
                return this.sectors;
            }

            this.prepareBoundaries(dc);

            var locations = this.locations;
            if (!locations) {
                return null;
            }

            this.sector.setToBoundingSector(locations);

            var pole = this.containsPole(locations);
            if (pole != Location.poles.NONE) {
                // If the shape contains a pole, then the bounding sector is defined by the shape's extreme latitude, the
                // latitude of the pole, and the full range of longitude.
                if (pole == Location.poles.NORTH) {
                    this.sector = new Sector(this.sector.minLatitude, 90, -180, 180);
                }
                else {
                    this.sector = new Sector(-90, this.sector.maxLatitude, -180, 180);
                }

                this.sectors = [this.sector];
            }
            else if (Location.locationsCrossDateLine(locations)) {
                this.sectors = Sector.splitBoundingSectors(locations);
            }
            else {
                 if (!this.sector.isEmpty()) {
                    this.sectors = [this.sector];
                }
            }

            if (!this.sectors) {
                return null;
            }

            // Great circle paths between two latitudes may result in a latitude which is greater or smaller than either of
            // the two latitudes. All other path types are bounded by the defining locations.
            if (this.pathType === WorldWind.GREAT_CIRCLE) {
                for (var idx = 0, len = this.sectors.length; idx < len; idx += 1) {
                    var sector = this.sectors[idx];

                    var extremes = Location.greatCircleArcExtremeLocations(locations);

                    var minLatitude = Math.min(sector.minLatitude, extremes[0].latitude);
                    var maxLatitude = Math.max(sector.maxLatitude, extremes[1].latitude);

                    this.sectors[idx] = new Sector(minLatitude, maxLatitude, sector.minLongitude, sector.maxLongitude);
                }
            }

            return this.sectors;
        };

        // Internal function. Intentionally not documented.
        SurfaceShape.prototype.computeGeometry = function(dc) {
            var datelineLocations;

            this.prepareBoundaries(dc);

            this.interiorGeometry = [];
            this.outlineGeometry = [];

            // TODO: support multiply-connected domains
            var locations = this.locations;

            var pole = this.containsPole(locations);
            if (pole != Location.poles.NONE) {
                // Wrap the shape interior around the pole and along the anti-meridian. See WWJ-284.
                var poleLocations = this.cutAlongDateLine(locations, pole, dc.globe);
                this.interiorGeometry.push(poleLocations);

                // The outline need only compensate for dateline crossing. See WWJ-452.
                datelineLocations = this.repeatAroundDateline(locations);
                this.outlineGeometry.push(datelineLocations[0]);
                if (datelineLocations.length > 1) {
                    this.outlineGeometry.push(datelineLocations[1]);
                }
            }
            else if (Location.locationsCrossDateLine(locations)) {
                datelineLocations = this.repeatAroundDateline(locations);
                this.interiorGeometry.push(datelineLocations[0]); //this.interiorGeometry.addAll(datelineLocations);
                this.interiorGeometry.push(datelineLocations[1]); //this.interiorGeometry.addAll(datelineLocations);
                this.outlineGeometry.push(datelineLocations[0]); //this.outlineGeometry.addAll(datelineLocations);
                this.outlineGeometry.push(datelineLocations[1]); //this.outlineGeometry.addAll(datelineLocations);
            }
            else {
                this.interiorGeometry.push(locations);
                this.outlineGeometry.push(locations);
            }
        };

        /**
         * Determine if a list of geographic locations encloses either the North or South pole. The list is treated as a
         * closed loop. (If the first and last positions are not equal the loop will be closed for purposes of this
         * computation.)
         *
         * @param {Location[]} locations Locations to test.
         *
         * @return {number} Location.poles.NORTH if the North Pole is enclosed,
         *                  Location.poles.SOUTH if the South Pole is enclosed, or
         *                  Location.poles.NONE if neither pole is enclosed.
         *                  Always returns Location.poles.NONE if {@link #canContainPole()} returns false.
         *
         * TODO: handle a shape that contains both poles.
         */
        SurfaceShape.prototype.containsPole = function(locations) {
            // Determine how many times the path crosses the date line. Shapes that include a pole will cross an odd number of times.
            var containsPole = false;

            var minLatitude = 90.0;
            var maxLatitude = -90.0;

            var prev = locations[0];
            for (var idx = 1, len = locations.length; idx < len; idx += 1) {
                var next = locations[idx];

                if (Location.locationsCrossDateLine([prev, next])) {
                    containsPole = !containsPole;
                }

                minLatitude = Math.min(minLatitude, next.latitude);
                maxLatitude = Math.max(maxLatitude, next.latitude);

                prev = next;
            }

            // Close the loop by connecting the last position to the first. If the loop is already closed then the following
            // test will always fail, and will not affect the result.
            var first = locations[0];
            if (Location.locationsCrossDateLine([first, prev])) {
                containsPole = !containsPole;
            }

            if (!containsPole) {
                return Location.poles.NONE;
            }

            // Determine which pole is enclosed. If the shape is entirely in one hemisphere, then assume that it encloses
            // the pole in that hemisphere. Otherwise, assume that it encloses the pole that is closest to the shape's
            // extreme latitude.
            if (minLatitude > 0) {
                return Location.poles.NORTH; // Entirely in Northern Hemisphere.
            }
            else if (maxLatitude < 0) {
                return Location.poles.SOUTH; // Entirely in Southern Hemisphere.
            }
            else if (Math.abs(maxLatitude) >= Math.abs(minLatitude)) {
                return Location.poles.NORTH; // Spans equator, but more north than south.
            }
            else {
                return Location.poles.SOUTH; // Spans equator, but more south than north.
            }
        };

        /**
         * Divide a list of locations that encloses a pole along the international date line. This method determines where
         * the locations cross the date line, and inserts locations to the pole, and then back to the intersection position.
         * This allows the shape to be "unrolled" when projected in a lat-lon projection.
         *
         * @param {Location[]} locations    Locations to cut at date line. This list is not modified.
         * @param {number} pole             Pole contained by locations, either AVKey.NORTH or AVKey.SOUTH.
         * @param {Globe} globe             Current globe.
         *
         * @return {Location[]} New location list with locations added to correctly handle date line intersection.
         */
        SurfaceShape.prototype.cutAlongDateLine = function(locations, pole, globe)
        {
            // If the locations do not contain a pole, then there's nothing to do.
            if (pole == Location.poles.NONE) {
                return locations;
            }

            var newLocations = [];

            var poleLat = pole == Location.poles.NORTH ? 90 : -90;

            var prev = locations[locations.length - 1];
            for (var idx = 0, len = locations.length; idx < len; idx += 1) {
                var next = locations[idx];

                newLocations.push(prev);
                if (Location.locationsCrossDateLine([prev, next])) {
                    // Determine where the segment crosses the date line.
                    var latitude = Location.intersectionWithMeridian(prev, next, 180, globe);
                    var sign = WWMath.signum(prev.longitude);

                    var lat = latitude;
                    var thisSideLon = 180 * sign;
                    var otherSideLon = -thisSideLon;

                    // Add locations that run from the intersection to the pole, then back to the intersection. Note
                    // that the longitude changes sign when the path returns from the pole.
                    //         . Pole
                    //      2 ^ | 3
                    //        | |
                    //      1 | v 4
                    // --->---- ------>
                    newLocations.push(new Location(lat, thisSideLon));
                    newLocations.push(new Location(poleLat, thisSideLon));
                    newLocations.push(new Location(poleLat, otherSideLon));
                    newLocations.push(new Location(lat, otherSideLon));
                }

                prev = next;
            }
            newLocations.push(prev);

            return newLocations;
        };

        /**
         * Returns a list containing two copies of the specified list of locations crossing the dateline: one that extends
         * across the -180 longitude  boundary and one that extends across the +180 longitude boundary. If the list of
         * locations does not cross the dateline this returns a list containing a copy of the original list.
         *
         * @param {Location[]} locations Locations to repeat. This is list not modified.
         *
         * @return {Location[][]} A list containing two new location lists, one copy for either side of the date line.
         */
        SurfaceShape.prototype.repeatAroundDateline = function(locations) {
            var lonOffset = 0,
                applyLonOffset = false;

            var newLocations = [];

            var prev= locations[0];
            newLocations.push(prev);
            for (var idx = 1, len = locations.length; idx < len; idx += 1) {
                var next = locations[idx];

                if (Location.locationsCrossDateLine([prev, next])) {
                    if (lonOffset == 0) {
                        lonOffset = prev.longitude < 0 ? -360 : 360;
                    }

                    applyLonOffset = !applyLonOffset;
                }

                if (applyLonOffset) {
                    newLocations.push(new Location(next.latitude, next.longitude + lonOffset));
                }
                else {
                    newLocations.push(next);
                }

                prev = next;
            }

            var locationGroup = [newLocations];

            if (lonOffset != 0) {
                var oldLocations = newLocations;
                newLocations = [];

                for (idx = 0, len = oldLocations.length; idx < len; idx += 1) {
                    var cur = oldLocations[idx];

                    newLocations.push(new Location(cur.latitude, cur.longitude - lonOffset));
                }

                locationGroup.push(newLocations);
            }

            return locationGroup;
        };

        // Internal function. Intentionally not documented.
        SurfaceShape.prototype.renderToTexture = function(dc, ctx2D, xScale, yScale, dx, dy) {
            var idx,
                len,
                path = [],
                idxPath,
                lenPath,
                pickColor,
                isPicking = dc.pickingMode,
                attributes = (this.highlighted ? (this.highlightAttributes || this.attributes) : this.attributes);

            if (isPicking) {
                pickColor = dc.uniquePickColor();
            }

            //ctx2D.lineJoin = "round";

            if (!this.isInteriorInhibited && attributes.drawInterior) {
                ctx2D.fillStyle = isPicking ? pickColor.toHexString(false) : attributes.interiorColor.toHexString(false);

                for (idx = 0, len = this.interiorGeometry.length; idx < len; idx += 1) {
                    idxPath = 0;
                    lenPath = this.outlineGeometry[idx].length * 2;
                    path.splice(0);

                    if (this.transformPath(this.interiorGeometry[idx], xScale, yScale, dx, dy, path)) {
                        ctx2D.beginPath();

                        ctx2D.moveTo(path[idxPath++], path[idxPath++]);

                        while (idxPath < lenPath) {
                            ctx2D.lineTo(path[idxPath++], path[idxPath++]);
                        }

                        ctx2D.closePath();

                        ctx2D.fill();
                    }
                }
            }

            if (attributes.drawOutline && attributes.outlineWidth > 0) {
                ctx2D.lineWidth = 4 * attributes.outlineWidth;
                ctx2D.strokeStyle = isPicking ? pickColor.toHexString(false) : attributes.outlineColor.toHexString(false);

                var pattern = this.attributes.outlineStipplePattern,
                    factor = this.attributes.outlineStippleFactor;

                if (!isPicking && pattern != 0xffff && factor > 0) {
                    var lineDash = this.getLineDash(pattern, 4 * factor);
                    ctx2D.setLineDash(lineDash);
                }
                else {
                    ctx2D.setLineDash([1, 0]);
                }

                for (idx = 0, len = this.outlineGeometry.length; idx < len; idx += 1) {
                    idxPath = 0;
                    lenPath = this.outlineGeometry[idx].length * 2;
                    path.splice(0);

                    if (this.transformPath(this.outlineGeometry[idx], xScale, yScale, dx, dy, path)) {
                        // NOTE: this code used to be written as:
                        //      a single beginPath() call,
                        //      followed by a single moveTo() call,
                        //      followed by as many lineTo() calls as there were vertices remaining in the path,
                        //      followed by a stroke().
                        // Performance was BAD!
                        // The code was rewritten this was and it doesn't have any performance issues.
                        // That shouldn't be the case, but it is.
                        var x = path[idxPath++],
                            y = path[idxPath++];

                        while  (idxPath < lenPath) {
                            ctx2D.beginPath();
                            ctx2D.moveTo(x, y);

                            x = path[idxPath++];
                            y = path[idxPath++];

                            ctx2D.lineTo(x, y);

                            ctx2D.stroke();
                        }
                    }
                }
            }

            if (isPicking) {
                var po = new PickedObject(pickColor.clone(), this, null, dc.currentLayer, false);
                dc.resolvePick(po);
            }
        };

        /**
         * Compute a dash pattern that SVG can use to render the outline.
         * @param {number} pattern The pattern that the application specified.
         * @param {number} spacing The spacing that the application specified.
         * @return {number[]} The line dash pattern that SVG expects.
         */
        SurfaceShape.prototype.getLineDash = function(pattern, spacing) {
            var isOn = true,
                runLength = 0,
                lineDash = null;

            for (var idx = 0, len = 16; idx < len; idx += 1) {
                if (pattern & 1) {
                    if (!isOn) {
                        lineDash.push(spacing * runLength);
                        runLength = 1;
                        isOn = !isOn;
                    }
                    else {
                        runLength += 1;
                    }
                }
                else {
                    if (isOn) {
                        if (!lineDash) {
                            lineDash = [];
                        }
                        lineDash.push(spacing * runLength);
                        runLength = 1;
                        isOn = !isOn;
                    }
                    else {
                        runLength += 1;
                    }

                }

                pattern >>= 1;
            }

            if (runLength > 0) {
                lineDash.push(spacing * runLength);
            }

            // If we have an odd number of line dash length, make it even.
            // SVG insists on the being an even number and will double the sequence if odd.
            if (lineDash.length & 1) {
                lineDash.push(0);
            }

            return lineDash;
        };

        //
        // Internal use only.
        // Transform a path and compute its extrema.
        // Return an indicator of the path is "big enough".
        SurfaceShape.prototype.transformPath = function(path, xScale, yScale, dx, dy, result) {
            var x, y, xMin, yMin, xMax, yMax, location;

            location = path[0];

            x = location.longitude * xScale + dx;
            y = location.latitude * yScale + dy;

            xMin = xMax = x;
            yMin = yMax = y;

            result.push(x);
            result.push(y);

            for (var idx = 1, len = path.length; idx < len; idx += 1) {
                location = path[idx];

                x = location.longitude * xScale + dx;
                y = location.latitude * yScale + dy;

                xMin = Math.min(xMin, x);
                xMax = Math.max(xMax, x);
                yMin = Math.min(yMin, y);
                yMax = Math.max(yMax, y);

                result.push(x);
                result.push(y);
            }

            return (xMax - xMin) >= 2 || (yMax - yMin) >= 2;
        };

        /**
         * Default value for the maximum number of edge intervals. This results in a maximum error of 480 m for an arc
         * that spans the entire globe.
         *
         * Other values for this parameter have the associated errors below:
         * Intervals        Maximum error (meters)
         *      2           1280253.5
         *      4           448124.5
         *      8           120837.6
         *      16          30628.3
         *      32          7677.9
         *      64          1920.6
         *      128         480.2
         *      256         120.0
         *      512         30.0
         *      1024        7.5
         *      2048        1.8
         * The errors cited above are upper bounds and the actual error may be lower.
         * @type {number}
         */
        SurfaceShape.DEFAULT_NUM_EDGE_INTERVALS = 128;

        /**
         * The defualt value for the polar throttle, which slows edge traversal near the poles.
         * @type {number}
         */
        SurfaceShape.DEFAULT_POLAR_THROTTLE = 10;

        return SurfaceShape;
    }
);