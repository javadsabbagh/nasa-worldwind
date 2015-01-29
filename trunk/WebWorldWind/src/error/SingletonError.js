/*
 * Copyright (C) 2015 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SingletonError
 * @version $Id: SingletonError.js 2638 2015-01-05 20:44:18Z danm $
 */
define([
        "../error/AbstractError"
    ],
    function (AbstractError) {
    "use strict";

    /**
     * Constructs a singleton error. This error is created whenever a class that was intended to be a singleton was
     * constructed more than once.
     * @alias SingletonError
     * @constructor
     * @classdesc An error indicating that a singleton class was constructed more than once.
     * @param name The name of the class being constructed.
     */
    var SingletonError = function(name) {
        AbstractError.call(this, name, name + ": already constructed.");
    };

    SingletonError.prototype = Object.create(AbstractError.prototype);

    return SingletonError;
});