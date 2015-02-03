/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports GpuResourceCache
 * @version $Id$
 */
define([
        '../util/AbsentResourceList',
        '../error/ArgumentError',
        '../util/Logger',
        '../cache/MemoryCache',
        '../render/Texture'
    ],
    function (AbsentResourceList,
              ArgumentError,
              Logger,
              MemoryCache,
              Texture) {
        "use strict";

        /**
         * Constructs a GPU resource cache for a specified size and low-water value in bytes.
         * @alias GpuResourceCache
         * @constructor
         * @classdesc Maintains a cache of GPU resources such as textures and GLSL programs. The capacity of the
         * cache has units of bytes. Applications typically do not interact with this class.
         * @param {Number} capacity The cache capacity.
         * @param {Number} lowWater The number of bytes to clear the cache to when it exceeds its capacity.
         * @throws {ArgumentError} If the specified capacity is 0 or negative or the low-water value is negative.
         */
        var GpuResourceCache = function (capacity, lowWater) {
            if (!capacity || capacity < 1) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GpuResourceCache", "constructor",
                        "Specified cache capacity is undefined, 0 or negative."));
            }

            if (!lowWater || lowWater < 0) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GpuResourceCache", "constructor",
                        "Specified cache low-water value is undefined or negative."));
            }

            this.entries = new MemoryCache(capacity, lowWater);

            this.currentRetrievals = {};
            this.absentResourceList = new AbsentResourceList(3, 60e3);
        };

        /**
         * Indicates the capacity of this cache in bytes.
         * @returns {Number} The number of bytes of capacity in this cache.
         */
        GpuResourceCache.prototype.capacity = function () {
            return this.entries.capacity;
        };

        /**
         * Indicates the number of bytes currently used by this cache.
         * @returns {number} The number of bytes currently used by this cache.
         */
        GpuResourceCache.prototype.usedCapacity = function () {
            return this.entries.usedCapacity;
        };

        /**
         * Indicates the number of free bytes in this cache.
         * @returns {Number} The number of unused bytes in this cache.
         */
        GpuResourceCache.prototype.freeCapacity = function () {
            return this.entries.freeCapacity;
        };

        /**
         * Indicates the low-water value for this cache in bytes.
         * @returns {Number} The low-water value for this cache.
         */
        GpuResourceCache.prototype.lowWater = function () {
            return this.entries.lowWater;
        };

        /**
         * Specifies the capacity in bytes of this cache. If the capacity specified is less than this cache's low-water
         * value, the low-water value is set to 80% of the specified capacity. If the specified capacity is less than
         * the currently used capacity, the cache is trimmed to the (potentially new) low-water value.
         * @param {Number} capacity The capacity of this cache in bytes.
         * @throws {ArgumentError} If the specified capacity is less than or equal to 0.
         */
        GpuResourceCache.prototype.setCapacity = function (capacity) {
            if (capacity < 1) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GpuResourceCache", "setCapacity",
                        "Specified cache capacity is 0 or negative."));
            }

            this.entries.setCapacity(capacity);
        };

        /**
         * Specifies the size in bytes that this cache is cleared to when it exceeds its capacity.
         * @param {number} lowWater The number of bytes to clear this cache to when it exceeds its capacity.
         * @throws {ArgumentError} If the specified low-water value is less than 0.
         */
        GpuResourceCache.prototype.setLowWater = function (lowWater) {
            if (lowWater < 0) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GpuResourceCache", "setLowWater",
                        "Specified cache low-water value is negative."));
            }

            this.entries.lowWater = lowWater;
        };

        /**
         * Adds a specified resource to this cache. Replaces the existing resource for the specified key if the
         * cache currently contains a resource for that key.
         * @param {String} key The key of the resource to add.
         * @param {Object} resource The resource to add to the cache.
         * @param {Number} size The resource's size in bytes. Must be greater than 0.
         * @throws {ArgumentError} If either the key or resource arguments is null or undefined
         * or if the specified size is less than 1.
         */
        GpuResourceCache.prototype.putResource = function (key, resource, size) {
            if (!key) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GpuResourceCache", "putResource", "missingKey."));
            }

            if (!resource) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GpuResourceCache", "putResource", "missingResource."));
            }

            if (size < 1) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "GpuResourceCache", "putResource",
                        "The specified resource size is less than 1."));
            }

            var entry = {
                resource: resource
            };

            this.entries.putEntry(key, entry, size);
        };

        /**
         * Returns the resource associated with a specified key.
         * @param {String} key The key of the resource to find.
         * @returns {Object} The resource associated with the specified key, or null if the resource is not in
         * this cache or the specified key is null or undefined.
         */
        GpuResourceCache.prototype.resourceForKey = function (key) {
            var entry = this.entries.entryForKey(key);

            return entry ? entry.resource : null;
        };

        /**
         * Indicates whether a specified resource is in this cache.
         * @param {String} key The key of the resource to find.
         * @returns {boolean} <code>true</code> If the resource is in this cache, <code>false</code> if the resource
         * is not in this cache or the specified key is null or undefined.
         */
        GpuResourceCache.prototype.containsResource = function (key) {
            return this.entries.containsKey(key);
        };

        /**
         * Removes the specified resource from this cache. The cache is not modified if the specified key is null or
         * undefined or does not correspond to an entry in the cache.
         * @param {String} key The key of the resource to remove.
         */
        GpuResourceCache.prototype.removeResource = function (key) {
            this.entries.removeEntry(key);
        };

        /**
         * Removes all resources from this cache.
         */
        GpuResourceCache.prototype.clear = function () {
            this.entries.clear();
        };

        /**
         * Retrieves an image at a specified URL and adds it to this cache when it arrives. A redraw event is
         * generated when the image arrives and is added to this cache.
         * @param {WebGLRenderingContext} gl The current WebGL context.
         * @param {String} imageUrl The URL of the image.
         */
        GpuResourceCache.prototype.retrieveTexture = function (gl, imageUrl) {
            if (!imageUrl || this.currentRetrievals[imageUrl] || this.absentResourceList.isResourceAbsent(imageUrl)) {
                return;
            }

            var cache = this,
                image = new Image();

            image.onload = function () {
                Logger.log(Logger.LEVEL_INFO, "Image retrieval succeeded: " + imageUrl);

                var texture = new Texture(gl, image);

                cache.putResource(imageUrl, texture, texture.size);

                delete cache.currentRetrievals[imageUrl];
                cache.absentResourceList.unmarkResourceAbsent(imageUrl);

                // Send an event to request a redraw.
                var e = document.createEvent('Event');
                e.initEvent(WorldWind.REDRAW_EVENT_TYPE, true, true);
                window.dispatchEvent(e);
            };

            image.onerror = function () {
                delete cache.currentRetrievals[imageUrl];
                cache.absentResourceList.markResourceAbsent(imageUrl);
                Logger.log(Logger.LEVEL_WARNING, "Image retrieval failed: " + imageUrl);
            };

            this.currentRetrievals[imageUrl] = imageUrl;
            image.crossOrigin = 'anonymous';
            image.src = imageUrl;
        };

        return GpuResourceCache;
    });