/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports Shapefile
 * @version $Id$
 */
define([
        '../../geom/Angle',
        '../../error/ArgumentError',
        '../../util/ByteBuffer',
        '../../util/Color',
        '../../formats/shapefile/DBaseFile',
        '../../geom/Location',
        '../../util/Logger',
        '../../error/NotYetImplementedError',
        '../../shapes/Path',
        '../../shapes/PathAttributes',
        '../../shapes/Placemark',
        '../../shapes/PlacemarkAttributes',
        '../../geom/Position',
        '../../formats/shapefile/PrjFile',
        '../../shapes/ShapeAttributes',
        '../../formats/shapefile/ShapefileRecord',
        '../../formats/shapefile/ShapefileRecordMultiPoint',
        '../../formats/shapefile/ShapefileRecordNull',
        '../../formats/shapefile/ShapefileRecordPoint',
        '../../Formats/shapefile/ShapefileRecordPolygon',
        '../../Formats/shapefile/ShapefileRecordPolyline',
        '../../shapes/SurfacePolygon'
    ],
    function (Angle,
              ArgumentError,
              ByteBuffer,
              Color,
              DBaseFile,
              Location,
              Logger,
              NotYetImplementedError,
              Path,
              PathAttribute,
              Placemark,
              PlacemarkAttributes,
              Position,
              PrjFile,
              ShapeAttribute,
              ShapefileRecord,
              ShapefileRecordMultiPoint,
              ShapefileRecordNull,
              ShapefileRecordPoint,
              ShapefileRecordPolygon,
              ShapefileRecordPolyline,
              SurfacePolygon) {
        "use strict";

        /**
         * Constructs a shapefile object for a specified shapefile URL. Call {@link Shapefile#load} to retrieve the
         * shapefile and create shapes for it.
         * @alias Shapefile
         * @constructor
         * @classdesc Parses a shapefile and creates shapes representing its contents. Points in the shapefile are
         * represented by [Placemarks]{@link Placemark}, lines are represented by [Paths]{@link Path}, and polygons
         * are represented by [SurfacePolygons]{@link SurfacePolygon}. A completion callback may be specified and is
         * called when the shapefile is fully parsed and all its shapes are created.
         * <p>
         * An attribute callback may also be specified to examine each record and modify the shape created for it as
         * the shapefile is parsed. This function enables the application to assign independent attributes to each
         * shape. An argument to this function provides any attributes specified in an attribute file accompanying
         * the shapefile. That attribute file is automatically detected and retrieved along with the shapefile.
         * @param {String} url The location of the shapefile.
         * @throws {ArgumentError} If the specified URL is null or undefined.
         */
        var Shapefile = function (url) {
            if (!url) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "Shapefile", "constructor", "missingUrl"));
            }

            // Documented in defineProperties below.
            this._url = url;

            // Documented in defineProperties below.
            this._shapeType = null;

            // Documented in defineProperties below.
            this._layer = null;

            // Documented in defineProperties below.
            this._attributeCallback = null;

            // Internal use only. Intentionally not documented.
            this._buffer = null;

            // Internal use only. Intentionally not documented.
            this.attributeFile = new DBaseFile(url.replace(".shp", ".dbf"));

            // Internal use only. Intentionally not documented.
            this.projectionFile = new PrjFile(url.replace(".shp", ".prj"));
        };

        Object.defineProperties(Shapefile.prototype, {
            /**
             * The shapefile URL as specified to this shapefile's constructor.
             * @memberof Shapefile.prototype
             * @type {String}
             * @readonly
             */
            url: {
                get: function () {
                    return this._url;
                }
            },

            /**
             * The shape type of the shapefile. The type can be one of the following:
             * <ul>
             *     <li>WorldWind.POINT</li>
             *     <li>WorldWind.MULTI_POINT</li>
             *     <li>WorldWind.POLYLINE</li>
             *     <li>WorldWind.POLYGON</li>
             * </ul>
             * This value is defined during shapefile loading.
             * @memberof Shapefile.prototype
             * @type {String}
             * @readonly
             */
            shapeType: {
                get: function () {
                    return this._shapeType;
                }
            },

            /**
             * The layer containing the shapes representing the records in the shapefile. This property is null until
             * the shapefile has been retrieved, parsed and the shapes created and added to the new layer.
             * @memberof Shapefile.prototype
             * @type {Layer}
             * @readonly
             */
            layer: {
                get: function () {
                    return this._layer;
                }
            },

            /**
             * The completion callback specified to {@link Shapefile#load}. See that method's description for details.
             * @memberof Shapefile.prototype
             * @type {Function}
             * @default null
             * @readonly
             */
            completionCallback: {
                get: function () {
                    return this._completionCallback;
                }
            },

            /**
             * The attribute callback specified to {@link Shapefile#load}. See that method's description for details.
             * @memberof Shapefile.prototype
             * @type {Function}
             * @default null
             * @readonly
             */
            attributeCallback: {
                get: function () {
                    return this._attributeCallback;
                }
            }
        });

        /**
         * Retrieves the shapefile, parses it and creates shapes representing its contents. The result is a layer
         * containing the created shapes. A function can be specified to be called when the process is complete.
         * A function can also be specified to be called for each shape created so that its attributes can be
         * assigned.
         *
         * @param {Function} completionCallback An optional function called when shapefile loading and shape
         * creation are complete. The single argument to this function is this shapefile object. When this function is
         * called, the layer containing the shapes is available via the {@link Shapefile#layer} property. Applications
         * typically add this layer to their World Window's layer list within this callback function.
         *
         * @param {Function} attributeCallback An optional function called just after a shape is created. This function
         * can be used to assign attributes to the newly created shapes. The callback function's first argument is an
         * object containing the properties read from the corresponding shapefile attributes file, if any.
         * This file, which has a .dbf suffix, is automatically detected, retrieved and parsed if it exists. The second
         * argument to the callback function is the {@link ShapefileRecord} currently being operated on. The return
         * value of the callback function must be either null, a {@link PlacemarkAttributes} object if the shapefile
         * contains points, a {@link PathAttributes} object if the shapefile contains polylines, or a
         * {@link ShapeAttributes} object if the shapefile contains polygons. If the callback function returns null
         * then the newly created shape's default attributes are used.
         *
         */
        Shapefile.prototype.load = function (completionCallback, attributeCallback) {
            this._completionCallback = completionCallback;
            this._attributeCallback = attributeCallback;

            // Load primary and secondary files in the following order:
            //      1) Projection file,
            //      2) Attribute file, and
            //      3) Shapefile.
            // This is done because the projection and attribute files modify the interpretation of the shapefile.
            var projectionFileCallback = (function() {
                var attributeFileCallback = (function() {
                    this.requestUrl(this.url);
                }).bind(this);

                this.attributeFile.load(attributeFileCallback, attributeFileCallback, attributeFileCallback);
            }).bind(this);

            this.projectionFile.load(projectionFileCallback, projectionFileCallback, projectionFileCallback);
        };

        /**
         * Iterates over this shapefile's records and creates shapes for them. This method may be overridden by
         * subclasses to change the default shape creation behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForShapefile = function (layer) {
            if (this.shapeType === WorldWind.POINT) {
                this.addRenderablesForPoints(layer);
            } else if (this.shapeType === WorldWind.MULTI_POINT) {
                this.addRenderablesForMultiPoints(layer);
            } else if (this.shapeType === WorldWind.POLYLINE) {
                this.addRenderablesForPolylines(layer);
            } else if (this.shapeType === WorldWind.POLYGON) {
                this.addRenderablesForPolygons(layer);
            }
        };

        /**
         * Iterates over this shapefile's records and creates placemarks for the shapefile's point records.
         * This method may be overridden by subclasses to change the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForPoints = function (layer) {
            // Note: for points, there should only be ONE part, and only ONE point per record.
            for (var record = this.next(); !!record; record = this.next()) {
                var attributes = this.attributeCallback(record.attributes, record);
                for (var part = 0, parts = record.numberOfParts; part < parts; part += 1) {
                    var points = record.pointBuffer(part);
                    for (var idx = 0, len = points.length; idx < len; idx += 2) {
                        var longitude = points[idx],
                            latitude = points[idx + 1],
                            elevation = 100,
                            position = new Position(latitude, longitude, elevation),
                            placemark = new Placemark(position);
                        placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

                        placemark.attributes = attributes;

                        layer.addRenderable(placemark);
                    }
                }
            }
        };

        /**
         * Iterates over this shapefile's records and creates placemarks for the shapefile's multi-point records.
         * This method may be overridden by subclasses to change the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForMultiPoints = function (layer) {
            // Note: for multi-points, there should only be ONE part.
            for (var record = this.next(); !!record; record = this.next()) {
                var attributes = this.attributeCallback(record.attributes, record);
                for (var part = 0, parts = record.numberOfParts; part < parts; part += 1) {
                    var points = record.pointBuffer(part);
                    for (var idx = 0, len = points.length; idx < len; idx += 2) {
                        var longitude = points[idx],
                            latitude = points[idx + 1],
                            elevation = 100,
                            position = new Position(latitude, longitude, elevation),
                            placemark = new Placemark(position);
                        placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;

                        placemark.attributes = attributes;

                        layer.addRenderable(placemark);
                    }
                }
            }
        };

        /**
         * Iterates over this shapefile's records and creates paths for the shapefile's polyline records.
         * This method may be overridden by subclasses to change the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForPolylines = function (layer) {
            for (var record = this.next(); !!record; record = this.next()) {
                var attributes = this.attributeCallback(record.attributes, record);
                for (var part = 0, parts = record.numberOfParts; part < parts; part += 1) {
                    var points = record.pointBuffer(part);

                    var positions = [];

                    for (var idx = 0, len = points.length; idx < len; idx += 2) {
                        var longitude = points[idx],
                            latitude = points[idx + 1],
                            position = new Position(latitude, longitude, 0);

                        positions.push(position);
                    }

                    var path = new Path(positions);
                    path.attributes = attributes;
                    layer.addRenderable(path);
                }
            }
        };

        /**
         * Iterates over this shapefile's records and creates surface polygons or extruded polygons for the shapefile's
         * polygon records. If a shape record's attributes contain a non-zero field named "height", "Height" or
         * "HEIGHT" then [ExtrudedPolygons]{@link ExtrudedPolygon} are created, otherwise
         * [SurfacePolygons]{@link SurfacePolygon} are created. This method may be overridden by subclasses to change
         * the default behavior.
         * @param {Layer} layer The layer in which to place the newly created shapes.
         * @protected
         */
        Shapefile.prototype.addRenderablesForPolygons = function (layer) {
            for (var record = this.next(); !!record; record = this.next()) {
                // TODO: apply extrusion height to ExtrudedPolygon when it exists.
                //var isExtruded = false,
                //    extrusionHeight = 0,
                //    heightProperty = ['height', 'Height', 'HEIGHT'];
                //for (var idxHeight = 0, lenHeight = heightProperty.length; idxHeight < lenHeight; idxHeight += 1) {
                //    if (record.attributes.params.hasOwnProperty(heightProperty[idxHeight])) {
                //        isExtruded = true;
                //        extrusionHeight = record.attributes.params[heightProperty[idxHeight]];
                //    }
                //}

                var attribute = this.attributeCallback(record.attributes, record);

                var locations = [],
                    lastLocation = null,
                    location = null;

                for (var part = 0, parts = record.numberOfParts; part < parts; part += 1) {
                    var points = record.pointBuffer(part);

                    for (var idx = 0, len = points.length; idx < len; idx += 2) {
                        var longitude = points[idx],
                            latitude = points[idx + 1];

                        location = new Location(latitude, longitude);

                        locations.push(location);
                    }

                    // Close the polygon for secondary parts by returning back to the first point
                    // (which coincides with the last point of the first part in a well-formed shapefile).
                    if (!!lastLocation) {
                        locations.push(lastLocation);
                    }
                    else {
                        lastLocation = location;
                    }
                }

                var shape = new SurfacePolygon(locations, attribute);
                layer.addRenderable(shape);
            }
        };

        /**
         * Returns the next {@link ShapefileRecord} in the shapefile, or null if no more records exist. This method
         * can be used to iterate through the shapefile records. Only one such iteration is possible.
         *
         * @returns {ShapefileRecord} The next shapefile record in the shapefile, or null if no more records exist.
         */
        Shapefile.prototype.next = function () {
            if (this._buffer.position < this._buffer.limit()) {
                return this.readRecord(this._buffer);
            }
            else {
                return null;
            }
        };

        /**
         * Internal use only.
         * Request data from the URL.
         * @param {String} url The URL for the requested data.
         */
        Shapefile.prototype.requestUrl = function(url) {
            var xhr = new XMLHttpRequest();

            xhr.open("GET", url, true);
            xhr.responseType = 'arraybuffer';
            xhr.onreadystatechange = (function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        this._buffer = new ByteBuffer(xhr.response);

                        this.parse();
                    }
                    else {
                        Logger.log(Logger.LEVEL_WARNING,
                            "Shapefile retrieval failed (" + xhr.statusText + "): " + url);
                    }

                    if (!!this._completionCallback) {
                        this._completionCallback(this);
                    }
                }
            }).bind(this);

            xhr.onerror = function () {
                Logger.log(Logger.LEVEL_WARNING, "Shapefile retrieval failed: " + url);

                if (!!this._completionCallback) {
                    this._completionCallback(this);
                }
            };

            xhr.ontimeout = function () {
                Logger.log(Logger.LEVEL_WARNING, "Shapefile retrieval timed out: " + url);

                if (!!this._completionCallback) {
                    this._completionCallback(this);
                }
            };

            xhr.send(null);
        };

        // Internal use only. Intentionally not documented.
        Shapefile.prototype.parse = function() {
            try {
                var header = this.readHeader(this._buffer);
                this._shapeType = header.shapeType;
            }
            catch (e) {
                console.log(e);
            }
            finally {
            }
        };

        Shapefile.prototype.readHeader = function (buffer) {
            buffer.order(ByteBuffer.BIG_ENDIAN);
            var fileCode = buffer.getInt32();
            if (fileCode != Shapefile.FILE_CODE) {
                // Let the caller catch and log the message.
                throw new Error(Logger.log(Logger.LEVEL_SEVERE, "Shapefile header is invalid"));
            }

            // Skip 5 unused ints.
            buffer.skipInt32s(5);

            // File length.
            var lengthInWords = buffer.getInt32();

            // Switch to little endian for the remaining part.
            buffer.order(ByteBuffer.LITTLE_ENDIAN);

            // Read remaining header data.
            var version = buffer.getInt32();
            var type = buffer.getInt32();

            var rect = this.readBoundingRectangle(buffer);

            // Check whether the shape type is supported.
            var shapeType = this.getShapeType(type);
            if (shapeType == null) {
                // Let the caller catch and log the message.
                // TODO: ??? figure out the correct type of error to throw
                throw new Error(Logger.log(Logger.LEVEL_SEVERE, "Shapefile type is unsupported: " + type.toString()));
            }

            // Assemble header
            var header = {
                'fileLength': lengthInWords * 2, // One word = 2 bytes.
                'version': version,
                'shapeType': shapeType,
                'boundingRectangle': rect.coords,
                'normalizePoints': rect.isNormalized
            };

            // Skip over bounds for measures and Z.
            buffer.skipDoubles(4);

            return header;
        };

        //**************************************************************//
        //********************  Bounding Rectangle  ********************//
        //**************************************************************//

        /**
         * Stores a bounding rectangle's coordinates, and if the coordinates are normalized. If isNormalized is
         * true, this indicates that the original coordinate values are out of range and required
         * normalization. The shapefile and shapefile records use this to determine which records must have their point
         * coordinates normalized. Normalization is rarely needed, and this enables the shapefile to normalize only point
         * coordinates associated with records that require it.
         *
         * The Javascript implementation inherits from the following Java implementation:
         * protected static class BoundingRectangle
         * {
         *    // Four-element array of the bounding rectangle's coordinates, ordered as follows: (minY, maxY, minX, maxX).
         *    public double[] coords;
         *    // True if the coordinates are normalized, and false otherwise.
         *    public boolean isNormalized;
         * }
         *
         *  In Javascript, this is represented as the object {'coords': coords, 'isNormalized': isNormalized}
         */

        /**
         * Returns a bounding rectangle from the specified buffer. This reads four doubles and interprets them as a bounding
         * rectangle in the following order: (minX, minY, maxX, maxY). The returned rectangle's coordinates are interpreted
         * according to the shapefile's coordinate system. This throws a Error if the coordinate system is unsupported.
         *
         * @param {ByteBuffer} buffer The buffer to read from.
         *
         * @return {Object} A bounding rectangle with coordinates from the specified buffer.
         */
        Shapefile.prototype.readBoundingRectangle = function(buffer) {
            if (!this.projectionFile) {
                return this.readUnspecifiedBoundingRectangle(buffer);
            }
            else if (this.projectionFile.isGeographicCoordinateSystem()) {
                return this.readGeographicBoundingRectangle(buffer);
            }
            else if (this.projectionFile.isProjectedCoordinateSystem()) {
                return this.readProjectedBoundingRectangle(buffer);
            }
            else {
                return this.readUnspecifiedBoundingRectangle(buffer);
            }
        };

        /**
         * Internal use only.
         * Returns a bounding rectangle from the specified buffer. This reads four doubles and interprets them as a bounding
         * rectangle in the following order: (minX, minY, maxX, maxY). The coordinates are assumed to be in an unspecified
         * coordinate system and are not changed.
         *
         * @param {ByteBuffer} buffer The buffer to read bounding rectangle coordinates from.
         *
         * @return {Object} A bounding rectangle with coordinates from the specified buffer. The rectangle's coordinates are ordered
         *         as follows: (minY, maxY, minX, maxX).
         */
        Shapefile.prototype.readUnspecifiedBoundingRectangle = function(buffer) {
            // Read the bounding rectangle coordinates in the following order: minY, maxY, minX, maxX.
            var coords = this.readBoundingRectangleCoordinates(buffer);
            return {'coords': coords, 'isNormalized': false};
        };

        /**
         * Internal use only.
         * Returns a bounding rectangle from the specified buffer. This reads four doubles and interprets them as a
         * Geographic bounding rectangle in the following order: (minLat, maxLat, minLon, maxLon). If any of the coordinates
         * are out of the range -90/+90 latitude and -180/+180 longitude, this normalizes the coordinates and sets the
         * object's isNormalized property to true.
         *
         * @param {ByteBuffer} buffer the buffer to read bounding rectangle coordinates from.
         *
         * @return {Object} A bounding rectangle with coordinates from the specified buffer.
         *      The rectangle's coordinates are ordered as follows: (minLat, maxLat, minLon, maxLon).
         */
        Shapefile.prototype.readGeographicBoundingRectangle = function(buffer) {
            // Read the bounding rectangle coordinates in the following order: minLat, maxLat, minLon, maxLon.
            var coords = this.readBoundingRectangleCoordinates(buffer),
                isNormalized = false,
                normalizedLat = 0;

            // The bounding rectangle's min latitude exceeds -90. Set the min latitude to -90. Correct the max latitude if
            // the normalized min latitude is greater than the max latitude.
            if (coords[0] < -90) {
                normalizedLat = Angle.normalizedDegreesLatitude(coords[0]);

                coords[0] = 90;
                isNormalized = true;

                if (coords[1] < normalizedLat) {
                    coords[1] = normalizedLat;
                }
            }

            // The bounding rectangle's max latitude exceeds +90. Set the max latitude to +90. Correct the min latitude if
            // the normalized max latitude is less than the min latitude.
            if (coords[1] > 90) {
                normalizedLat = Angle.normalizedDegreesLatitude(coords[1]);

                coords[1] = 90;
                isNormalized = true;

                if (coords[0] > normalizedLat)
                    coords[0] = normalizedLat;
            }

            // The bounding rectangle's longitudes exceed +-180, therefore the rectangle spans the international
            // dateline. Set the longitude bound to (-180, 180) to contain the dateline spanning rectangle.
            if (coords[2] < -180 || coords[3] > 180) {
                coords[2] = -180;
                coords[3] = 180;
                isNormalized = true;
            }

            return {'coords': coords, 'isNormalized': isNormalized};
        };

        /**
         * Internal use only.
         * Returns a bounding rectangle from the specified buffer. This reads four doubles and interprets them as a
         * projected bounding rectangle in the following order: (minX, maxX, minY, maxY). The projected rectangle is
         * converted to geographic coordinates before the rectangle is returned. The returned coordinates are interpreted
         * according to the Shapefile's projection. This throws a error if the projection is unsupported.
         *
         * @param {ByteBuffer} buffer The buffer to read bounding rectangle coordinates from.
         *
         * @return {Object} A bounding rectangle with coordinates from the specified buffer. The rectangle's coordinates are ordered
         *         as follows: (minLat, maxLat, minLon, maxLon).
         *
         * @throws Error if the Shapefile's projection is unsupported.
         */
        Shapefile.prototype.readProjectedBoundingRectangle = function(buffer) {
            throw new NotYetImplementedError(
                Logger.log(Logger.LEVEL_SEVERE, "Shapefile.readProjectedBoundingRectangle() not yet implemented"));

            // TODO: complete the implementation; the Java implementation is summarized below.
            //Object o = this.getValue(AVKey.PROJECTION_NAME);
            //
            //if (AVKey.PROJECTION_UTM.equals(o)) {
            //    // Read the bounding rectangle coordinates in the following order: minEast, minNorth, maxEast, maxNorth.
            //    var coords = ShapefileUtils.readDoubleArray(buffer, 4);
            //    // Convert the UTM bounding rectangle to a geographic bounding rectangle. The zone and hemisphere parameters
            //    // have already been validated in validateBounds.
            //    var zone = (Integer) this.getValue(AVKey.PROJECTION_ZONE);
            //    var hemisphere = (String) this.getValue(AVKey.PROJECTION_HEMISPHERE);
            //    Sector sector = Sector.fromUTMRectangle(zone, hemisphere, coords[0], coords[2], coords[1], coords[3]);
            //    // Return an array with bounding rectangle coordinates in the following order: minLon, maxLon, minLat, maxLat.
            //    BoundingRectangle rect = new BoundingRectangle();
            //    rect.coords = sector.toArrayDegrees();
            //    return rect;
            //}
            //else {
            //    // The Shapefile's coordinate system projection is unsupported. This should never happen because the
            //    // projection is validated during initialization, but we check anyway. Let the caller catch and log the
            //    // message.
            //    throw new Error(Logger.log(Logger.LEVEL_SEVERE, "Shapefile has an unsupported projection"));
            //}
        };

        /**
         * Internal use only.
         * Reads a Shapefile bounding rectangle from the specified buffer. This reads four doubles and returns them as a
         * four-element array in the following order: (minY, maxY, minX, maxX).
         * *
         * @param buffer the buffer to read from.
         *
         * @return {number[]} A four-element array ordered as follows: (minY, maxY, minX, maxX).
         */
        Shapefile.prototype.readBoundingRectangleCoordinates = function(buffer) {
            // Read the bounding rectangle coordinates in the following order: minX, minY, maxX, maxY.
            var minx = buffer.getDouble(),
                miny = buffer.getDouble(),
                maxx = buffer.getDouble(),
                maxy = buffer.getDouble();

            // Return an array with bounding rectangle coordinates in the following order: minY, maxY, minX, maxX.
            return [miny, maxy, minx, maxx];
        };

        //**************************************************************//
        //********************  Shape Records  *************************//
        //**************************************************************//

        /**
         * Internal use only.
         * Reads a {@link ShapefileRecord} instance from the given buffer, or null if the buffer
         * contains a null record.
         * <p/>
         * The buffer current position is assumed to be set at the start of the record and will be set to the start of the
         * next record after this method has completed.
         *
         * @param {ByteBuffer} buffer The buffer descriptor containing the point record's content.
         *
         * @return {ShapefileRecord} A {@link ShapefileRecord} instance.
         */
        Shapefile.prototype.readRecord = function(buffer)
        {
            var record = this.createRecord(buffer);

            if (record != null) {
                // Read the record's attribute data.
                if (this.attributeFile != null && this.attributeFile.hasNext()) {
                    var attributes = this.attributeFile.nextRecord();
                    record.setAttributes(attributes);
                }
            }

            return record;
        };

        /**
         * Internal use only.
         * Returns a new [ShapefileRecord] {@link ShapefileRecord} from the specified
         * buffer. The buffer's current position is assumed to be set at the start of the record and will be set to the
         * start of the next record after this method has completed.
         * <p/>
         * This returns an instance of of ShapefileRecord appropriate for the record's shape type. For example, if the
         * record's shape type is POINT, this returns a ShapefileRecordPoint, and if the
         * record's shape type is NULL, this returns ShapefileRecordNull.
         * <p/>
         * This returns null if the record's shape type is not one of the following types:
         * POINT, POINT_M, POINT_Z, MULTI_POINT, MULTI_POINT_M, MULTI_POINT_Z, NULL,
         * POLYGON, POLYGON_M, POLYGON_Z,POLYLINE, POLYLINE_M, POLYLINE_Z.
         *
         * @param {ByteBuffer} buffer The buffer descriptor containing the point record's content.
         *
         * @return {ShapefileRecord} A new [ShapefileRecord] {@link ShapefileRecord} instance, null if the
         *         record's shape type is not one of the recognized types.
         */
        Shapefile.prototype.createRecord = function(buffer) {
            // Select proper record class
            if (this.isNullType()) {
                return this.createNull(buffer);
            }
            else if (this.isPointType()) {
                return this.createPoint(buffer);
            }
            else if (this.isMultiPointType()) {
                return this.createMultiPoint(buffer);
            }
            else if (this.isPolygonType()) {
                return this.createPolygon(buffer);
            }
            else if (this.isPolylineType()) {
                return this.createPolyline(buffer);
            }

            return null;
        };

        /**
        * Internal use only.
        * Returns a new null record {@link ShapefileRecordNull} from the specified buffer.
        * <p/>
        * The buffer current position is assumed to be set at the start of the record and will be set to the start of the
        * next record after this method has completed.
        *
        * @param {ByteBuffer} buffer The buffer descriptor containing the point record's content.
        *
        * @return {ShapefileRecord} A new null shape {@link ShapefileRecord}.
        */
        Shapefile.prototype.createNull = function(buffer) {
            return new ShapefileRecordNull(this, buffer);
        };

        /**
        * Internal use only.
        * Returns a new point {@link ShapefileRecord} from the specified buffer.
        * <p/>
        * The buffer current position is assumed to be set at the start of the record and will be set to the start of the
        * next record after this method has completed.
        *
        * @param {ByteBuffer} buffer The buffer descriptor containing the point record's content.
        *
        * @return {ShapefileRecord} A new point {@link ShapefileRecord}.
        */
        Shapefile.prototype.createPoint = function(buffer) {
            return new ShapefileRecordPoint(this, buffer);
        };

        /**
        * Internal use only.
        * Returns a new multi-point {@link ShapefileRecord} from the specified
        * buffer.
        * <p/>
        * The buffer current position is assumed to be set at the start of the record and will be set to the start of the
        * next record after this method has completed.
        *
        * @param {ByteBuffer} buffer The buffer descriptor containing the multi-point record's content.
        *
        * @return {ShapefileRecord} A new multi-point {@link ShapefileRecord}.
        */
        Shapefile.prototype.createMultiPoint = function(buffer) {
            return new ShapefileRecordMultiPoint(this, buffer);
        };

        /**
        * Internal use only.
        * Returns a new polyline {@link ShapefileRecord} from the specified buffer.
        * <p/>
        * The buffer current position is assumed to be set at the start of the record and will be set to the start of the
        * next record after this method has completed.
        *
        * @param {ByteBuffer} buffer The buffer descriptor containing the polyline record's content.
        *
        * @return {ShapefileRecord} A new polyline {@link ShapefileRecord}.
        */
        Shapefile.prototype.createPolyline = function(buffer) {
            return new ShapefileRecordPolyline(this, buffer);
        };

        /**
         * Internal use only.
         * Returns a new polygon {@link ShapefileRecord} from the specified buffer.
         * <p/>
         * The buffer current position is assumed to be set at the start of the record and will be set to the start of the
         * next record after this method has completed.
         *
         * @param {ByteBuffer} buffer The buffer descriptor containing the polygon record's content.
         *
         * @return {ShapefileRecord} A new polygon {@link ShapefileRecord}.
         */
        Shapefile.prototype.createPolygon = function(buffer) {
            return new ShapefileRecordPolygon(this, buffer);
        };

        /**
         * Maps the integer shape type from the shapefile to the corresponding shape type defined above.
         *
         * @param {Number} type The integer shape type.
         *
         * @return {String} The mapped shape type.
         */
        Shapefile.prototype.getShapeType = function(shapeType) {
            // Cases commented out indicate shape types not implemented
            switch (shapeType) {
                case 0:
                    return Shapefile.NULL;
                case 1:
                    return Shapefile.POINT;
                case 3:
                    return Shapefile.POLYLINE;
                case 5:
                    return Shapefile.POLYGON;
                case 8:
                    return Shapefile.MULTI_POINT;

                case 11:
                    return Shapefile.POINT_Z;
                case 13:
                    return Shapefile.POLYLINE_Z;
                case 15:
                    return Shapefile.POLYGON_Z;
                case 18:
                    return Shapefile.MULTI_POINT_Z;

                case 21:
                    return Shapefile.POINT_M;
                case 23:
                    return Shapefile.POLYLINE_M;
                case 25:
                    return Shapefile.POLYGON_M;
                case 28:
                    return Shapefile.MULTI_POINT_M;

//            case 31:
//                return Shapefile.SHAPE_MULTI_PATCH;

                default:
                    return null; // unsupported shape type
            }
        };
        
        //**************************************************************//
        //********************  Utilities  *****************************//
        //**************************************************************//

        /**
         * Indicates whether this shapefile contains optional measure values.
         *
         * @return {Boolean} True if this shapefile is one that contains measure values.
         */
        Shapefile.prototype.isMeasureType = function() {
            return Shapefile.measureTypes.hasOwnProperty(this._shapeType);
        };

        /**
         * Indicates whether this shapefile contains Z values.
         *
         * @return {Boolean} True if this shapefile contains Z values.
         */
        Shapefile.prototype.isZType = function() {
            return Shapefile.zTypes.hasOwnProperty(this._shapeType);
        };

        /**
         * Indicates whether this shapefile is {@link Shapefile.NULL}.
         *
         * @return {Boolean} True if this shapefile is a null type.
         */
        Shapefile.prototype.isNullType = function() {
            return this._shapeType === Shapefile.NULL;
        };

        /**
         * Indicates whether this shapefile is either {@link #POINT}, {@link #POINT_M} or {@link #POINT_Z}.
         *
         * @return {Boolean} True if the shapefile is a point type.
         */
        Shapefile.prototype.isPointType = function() {
            return Shapefile.pointTypes.hasOwnProperty(this._shapeType);
        };

        /**
         * Indicates whether this shapefile is either {@link #MULTI_POINT}, {@link #MULTI_POINT_M} or
         * {@link #MULTI_POINT_Z}.
         *
         * @return {Boolean} True if this shapefile is a mulit-point type.
         */
        Shapefile.prototype.isMultiPointType = function() {
            return Shapefile.multiPointTypes.hasOwnProperty(this._shapeType);
        };

        /**
         * Indicates whether this shapefile is either {@link #POLYLINE}, {@link #POLYLINE_M} or {@link
         * #POLYLINE_Z}.
         *
         * @return {Boolean} True if this shapefile is a polyline type.
         */
        Shapefile.prototype.isPolylineType = function() {
            return Shapefile.polylineTypes.hasOwnProperty(this._shapeType);
        };

        /**
         * Indicates whether this shapefile is either {@link Shapefile.POLYGON}, {@link Shapefile.POLYGON_M} or
         * {@link Shapefile.POLYGON_Z}.
         *
         * @return {Boolean} True if this shapefile is a polygon type.
         */
        Shapefile.prototype.isPolygonType = function() {
            return Shapefile.polygonTypes.hasOwnProperty(this._shapeType);
        };

        // TODO: reference the WorldWind constants directly.
        Shapefile.NULL = "null";
        Shapefile.POINT = "point";
        Shapefile.MULTI_POINT = "multiPoint";
        Shapefile.POLYLINE = "polyline";
        Shapefile.POLYGON = "polygon";

        Shapefile.POINT_M = Shapefile.POINT + "M";
        Shapefile.MULTI_POINT_M = Shapefile.MULTI_POINT + "M";
        Shapefile.POLYLINE_M = Shapefile.POLYLINE + "M";
        Shapefile.POLYGON_M = Shapefile.POLYGON + "M";

        Shapefile.POINT_Z = Shapefile.POINT + "Z";
        Shapefile.MULTI_POINT_Z = Shapefile.MULTI_POINT + "Z";
        Shapefile.POLYLINE_Z = Shapefile.POLYLINE + "Z";
        Shapefile.POLYGON_Z = Shapefile.POLYGON + "Z";

        Shapefile.SHAPE_MULTI_PATCH = "multiPatch";

        // Internal use only. Intentionally not documented.
        Shapefile.measureTypes = {
            pointM:         Shapefile.POINT_M,
            pointZ:         Shapefile.POINT_Z,
            multiPointM:    Shapefile.MULTI_POINT_M,
            multiPointZ:    Shapefile.MULTI_POINT_Z,
            polylineM:      Shapefile.POLYLINE_M,
            polylineZ:      Shapefile.POLYLINE_Z,
            polygonM:       Shapefile.POLYGON_M,
            polygonZ:       Shapefile.POLYGON_Z
        };

        // Internal use only. Intentionally not documented.
        Shapefile.zTypes = {
            pointZ:         Shapefile.POINT_Z,
            multiPointZ:    Shapefile.MULTI_POINT_Z,
            polylineZ:      Shapefile.POLYLINE_Z,
            polygonZ:       Shapefile.POLYGON_Z
        };

        // Internal use only. Intentionally not documented.
        Shapefile.pointTypes = {
            point:          Shapefile.POINT,
            pointZ:         Shapefile.POINT_Z,
            pointM:         Shapefile.POINT_M
        };

        // Internal use only. Intentionally not documented.
        Shapefile.multiPointTypes = {
            multiPoint:     Shapefile.MULTI_POINT,
            multiPointZ:    Shapefile.MULTI_POINT_Z,
            multiPointM:    Shapefile.MULTI_POINT_M
        };

        // Internal use only. Intentionally not documented.
        Shapefile.polylineTypes = {
            polyline:       Shapefile.POLYLINE,
            polylineZ:      Shapefile.POLYLINE_Z,
            polylineM:      Shapefile.POLYLINE_M
        };

        // Internal use only. Intentionally not documented.
        Shapefile.polygonTypes = {
            polygon:        Shapefile.POLYGON,
            polygonZ:       Shapefile.POLYGON_Z,
            polygonM:       Shapefile.POLYGON_M
        };

        /**
         * The signature of a valid shapefile.
         * @type {Number}
         */
        Shapefile.FILE_CODE = 0x0000270A;

        return Shapefile;
    }
);