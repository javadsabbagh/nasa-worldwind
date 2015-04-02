/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ShapefileRecordNull
 * @version $Id$
 */
define(['../../formats/shapefile/Shapefile',
        '../../formats/shapefile/ShapefileRecord'
    ],
    function (Shapefile,
              ShapefileRecord) {
        "use strict";

        /**
         * Constructs a null shapefile record. Applications typically do not call this constructor. It is called by
         * {@link Shapefile} as shapefile records are read.
         * @alias ShapefileRecordNull
         * @constructor
         * @classdesc Contains the data associated with a shapefile record.
         * @param {Shapefile} shapefile The shapefile containing this record.
         * @param {ByteBuffer} buffer A buffer descriptor to read data from.
         * @throws {ArgumentError} If either the specified shapefile or buffer are null or undefined.
         */
        var ShapefileRecordNull = function (shapefile, buffer) {
            ShapefileRecord.call(this, shapefile, buffer);
        };

        ShapefileRecordNull.prototype = Object.create(ShapefileRecord.prototype);

        return ShapefileRecordNull;
    }
);