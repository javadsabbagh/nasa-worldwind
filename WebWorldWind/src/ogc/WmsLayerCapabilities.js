/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports WmsLayerCapabilities
 * @version $Id$
 */
define([
        '../error/ArgumentError',
        '../util/Logger'
    ],
    function (ArgumentError,
              Logger) {
        "use strict";

        /**
         * Constructs an WMS Layer instance from an XML DOM.
         * @alias WmsLayerCapabilities
         * @constructor
         * @classdesc Represents a WMS layer.
         * @param {{}} layerElement A WMS Layer element describing the layer.
         * @param {{}} parentNode An object indicating the new layer object's parent object. May be null.
         * @throws {ArgumentError} If the specified layer element is null or undefined.
         */
        var WmsLayerCapabilities = function (layerElement, parentNode) {
            if (!layerElement) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "WmsLayerCapabilities", "constructor",
                        "Layer element is null or undefined."));
            }

            this.parent = parentNode;

            this.assembleLayer(layerElement);
        };

        Object.defineProperties(WmsLayerCapabilities.prototype, {
            queryable: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_queryable");
                }
            },

            cascaded: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_cascaded");
                }
            },

            opaque: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_opaque");
                }
            },

            noSubsets: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_noSubsets");
                }
            },

            fixedWidth: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_fixedWidth");
                }
            },

            fixedHeight: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_fixedHeight");
                }
            },

            styles: {
                get: function () {
                    return WmsLayerCapabilities.accumulate(this, "_styles", []);
                }
            },

            crses: {
                get: function () {
                    return WmsLayerCapabilities.accumulate(this, "_crses", []);
                }
            },

            srses: { // WMS 1.1.1
                get: function () {
                    return WmsLayerCapabilities.accumulate(this, "_srses", []);
                }
            },

            geographicBoundingBox: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_geographicBoundingBox");
                }
            },

            latLonBoundingBox: { // WMS 1.1.1
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_latLonBoundingBox");
                }
            },

            boundingBoxes: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_boundingBoxes");
                }
            },

            dimensions: {
                get: function () {
                    var accumulatedDimensions = [],
                        layer = this;

                    // Accumulate only dimensions with unique names with descendants overriding ancestors.
                    while (layer && (layer instanceof WmsLayerCapabilities)) {
                        if (layer._dimensions && layer._dimensions.length > 0) {
                            layer._dimensions.forEach(function (ancestorDimension) {
                                var name = ancestorDimension.name;
                                var include = true;
                                accumulatedDimensions.forEach(function (descendantDimension) {
                                    if (descendantDimension.name === name) {
                                        include = false;
                                    }
                                });
                                if (include) {
                                    accumulatedDimensions.push(ancestorDimension);
                                }
                            });
                        }

                        layer = layer.parent;
                    }

                    return accumulatedDimensions.length > 0 ? accumulatedDimensions : undefined;
                }
            },

            extents: { // WMS 1.1.1
                get: function () {
                    var accumulatedDimensions = [],
                        layer = this;

                    // Accumulate only extents with unique names with descendants overriding ancestors.
                    while (layer && (layer instanceof WmsLayerCapabilities)) {
                        if (layer._extents && layer._extents.length > 0) {
                            layer._extents.forEach(function (ancestorDimension) {
                                var name = ancestorDimension.name;
                                var include = true;
                                accumulatedDimensions.forEach(function (descendantDimension) {
                                    if (descendantDimension.name === name) {
                                        include = false;
                                    }
                                });
                                if (include) {
                                    accumulatedDimensions.push(ancestorDimension);
                                }
                            });
                        }

                        layer = layer.parent;
                    }

                    return accumulatedDimensions.length > 0 ? accumulatedDimensions : undefined;
                }
            },

            attribution: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_attribution");
                }
            },

            authorityUrls: {
                get: function () {
                    return WmsLayerCapabilities.accumulate(this, "_authorityUrls", []);
                }
            },

            minScaleDenominator: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_minScaleDenominator");
                }
            },

            maxScaleDenominator: {
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_maxScaleDenominator");
                }
            },

            scaleHint: { // WMS 1.1.1
                get: function () {
                    return WmsLayerCapabilities.replace(this, "_scaleHint");
                }
            }
        });

        WmsLayerCapabilities.accumulate = function (layer, propertyName, accumulation) {
            // Accumulate all of the named properties in the specified layer and its ancestors.
            while (layer && (layer instanceof WmsLayerCapabilities)) {
                var property = layer[propertyName];

                if (property) {
                    for (var i = 0; i < property.length; i++) {
                        accumulation.push(property[i]);
                    }
                }

                layer = layer.parent;
            }

            return accumulation;
        };

        WmsLayerCapabilities.replace = function (layer, propertyName) {
            // Find the first property instance encountered from the specified layer upwards through its ancestors.
            while (layer && (layer instanceof WmsLayerCapabilities)) {
                var property = layer[propertyName];

                if (property) {
                    return property;
                } else {
                    layer = layer.parent;
                }
            }
        };

        WmsLayerCapabilities.prototype.assembleLayer = function (layerElement) {
            var elements, attrValue, c, e;

            attrValue = layerElement.getAttribute("queryable");
            if (attrValue) {
                this._queryable = attrValue === "1" || attrValue === "true"
            }

            attrValue = layerElement.getAttribute("opaque");
            if (attrValue) {
                this._opaque = attrValue === "1" || attrValue === "true"
            }

            attrValue = layerElement.getAttribute("noSubsets");
            if (attrValue) {
                this._noSubsets = attrValue === "1" || attrValue === "true"
            }

            attrValue = layerElement.getAttribute("cascaded");
            if (attrValue) {
                this._cascaded = parseInt("10");
            }

            attrValue = layerElement.getAttribute("fixedWidth");
            if (attrValue) {
                this._fixedWidth = parseInt("10");
            }

            attrValue = layerElement.getAttribute("fixedHeight");
            if (attrValue) {
                this._fixedHeight = parseInt("10");
            }

            for (c = 0; c < layerElement.children.length; c++) {
                var childElement = layerElement.children[c];

                if (childElement.localName === "Layer") {
                    if (!this.layers) {
                        this.layers = [];
                    }
                    this.layers.push(new WmsLayerCapabilities(childElement, this));

                } else if (childElement.localName === "Name") {
                    this.name = childElement.textContent;

                } else if (childElement.localName === "Title") {
                    this.title = childElement.textContent;

                } else if (childElement.localName === "Abstract") {
                    this.abstract = childElement.textContent;

                } else if (childElement.localName === "KeywordList") {
                    this.keywordList = [];
                    elements = childElement.getElementsByTagName("Keyword");
                    for (e = 0; e < elements.length; e++) {
                        this.keywordList.push(elements[e].textContent);
                    }

                } else if (childElement.localName === "Style") {
                    if (!this._styles) {
                        this._styles = [];
                    }
                    this._styles.push(WmsLayerCapabilities.assembleStyle(childElement))

                } else if (childElement.localName === "CRS") {
                    if (!this._crses) {
                        this._crses = [];
                    }
                    this._crses.push(childElement.textContent);

                } else if (childElement.localName === "SRS") { // WMS 1.1.1
                    if (!this._srses) {
                        this._srses = [];
                    }
                    this._srses.push(childElement.textContent);

                } else if (childElement.localName === "EX_GeographicBoundingBox") {
                    this._geographicBoundingBox = WmsLayerCapabilities.assembleGeographicBoundingBox(childElement);

                } else if (childElement.localName === "LatLonBoundingBox") { // WMS 1.1.1
                    this._geographicBoundingBox = WmsLayerCapabilities.assembleLatLonBoundingBox(childElement);

                } else if (childElement.localName === "BoundingBox") {
                    if (!this._boundingBoxes) {
                        this._boundingBoxes = [];
                    }
                    this._boundingBoxes.push(WmsLayerCapabilities.assembleBoundingBox(childElement));

                } else if (childElement.localName === "Dimension") {
                    if (!this._dimensions) {
                        this._dimensions = [];
                    }
                    this._dimensions.push(WmsLayerCapabilities.assembleDimension(childElement));

                } else if (childElement.localName === "Extent") { // WMS 1.1.1
                    if (!this._extents) {
                        this._extents = [];
                    }
                    this._extents.push(WmsLayerCapabilities.assembleDimension(childElement)); // same schema as 1.3.0 Dimension

                } else if (childElement.localName === "Attribution") {
                    this._attribution = WmsLayerCapabilities.assembleAttribution(childElement);

                } else if (childElement.localName === "AuthorityURL") {
                    if (!this._authorityUrls) {
                        this._authorityUrls = [];
                    }
                    this._authorityUrls.push(WmsLayerCapabilities.assembleAuthorityUrl(childElement));

                } else if (childElement.localName === "Identifier") {
                    if (!this.identifiers) {
                        this.identifiers = [];
                    }
                    this.identifiers.push(WmsLayerCapabilities.assembleIdentifier(childElement));

                } else if (childElement.localName === "MetadataURL") {
                    if (!this.metadataUrls) {
                        this.metadataUrls = [];
                    }
                    this.metadataUrls.push(WmsLayerCapabilities.assembleMetadataUrl(childElement));

                } else if (childElement.localName === "DataURL") {
                    if (!this.dataUrls) {
                        this.dataUrls = [];
                    }
                    this.dataUrls.push(WmsLayerCapabilities.assembleUrl(childElement));

                } else if (childElement.localName === "FeatureListURL") {
                    if (!this.featureListUrls) {
                        this.featureListUrls = [];
                    }
                    this.featureListUrls.push(WmsLayerCapabilities.assembleUrl(childElement));

                } else if (childElement.localName === "MinScaleDenominator") {
                    this._minScaleDenominator = parseFloat(childElement.textContent);

                } else if (childElement.localName === "MaxScaleDenominator") {
                    this._maxScaleDenominator = parseFloat(childElement.textContent);

                } else if (childElement.localName === "ScaleHint") { // WMS 1.1.1
                    this._scaleHint = {};
                    this._scaleHint.min = WmsLayerCapabilities.getFloatAttribute(childElement, "min");
                    this._scaleHint.max = WmsLayerCapabilities.getFloatAttribute(childElement, "max");
                }
            }
        };

        WmsLayerCapabilities.assembleStyle = function (styleElement) {
            var result = {};

            for (var c = 0; c < styleElement.children.length; c++) {
                var childElement = styleElement.children[c];

                if (childElement.localName === "Name") {
                    result.name = childElement.textContent;

                } else if (childElement.localName === "Title") {
                    result.title = childElement.textContent;

                } else if (childElement.localName === "Abstract") {
                    result.abstract = childElement.textContent;

                } else if (childElement.localName === "LegendURL") {
                    if (!result.legendUrls) {
                        result.legendUrls = [];
                    }
                    result.legendUrls.push(WmsLayerCapabilities.assembleLegendUrl(childElement));

                } else if (childElement.localName === "StyleSheetURL") {
                    result.styleSheetUrl = WmsLayerCapabilities.assembleUrl(childElement);

                } else if (childElement.localName === "StyleURL") {
                    result.styleUrl = WmsLayerCapabilities.assembleUrl(childElement);
                }
            }

            return result;
        };

        WmsLayerCapabilities.assembleGeographicBoundingBox = function (bboxElement) {
            var result = {};

            for (var c = 0; c < bboxElement.children.length; c++) {
                var childElement = bboxElement.children[c];

                if (childElement.localName === "westBoundLongitude") {
                    result.westBoundLongitude = parseFloat(childElement.textContent);

                } else if (childElement.localName === "eastBoundLongitude") {
                    result.eastBoundLongitude = parseFloat(childElement.textContent);

                } else if (childElement.localName === "southBoundLatitude") {
                    result.southBoundLatitude = parseFloat(childElement.textContent);

                } else if (childElement.localName === "northBoundLatitude") {
                    result.northBoundLatitude = parseFloat(childElement.textContent);
                }
            }

            return result;
        };

        WmsLayerCapabilities.assembleLatLonBoundingBox = function (bboxElement) { // WMS 1.1.1
            var result = {};

            result.minx = WmsLayerCapabilities.getFloatAttribute(bboxElement, "minx");
            result.miny = WmsLayerCapabilities.getFloatAttribute(bboxElement, "miny");
            result.maxx = WmsLayerCapabilities.getFloatAttribute(bboxElement, "maxx");
            result.maxy = WmsLayerCapabilities.getFloatAttribute(bboxElement, "maxy");

            return result;
        };

        WmsLayerCapabilities.assembleBoundingBox = function (bboxElement) {
            var result = {};

            result.crs = bboxElement.getAttribute("CRS");
            result.minx = WmsLayerCapabilities.getFloatAttribute(bboxElement, "minx");
            result.miny = WmsLayerCapabilities.getFloatAttribute(bboxElement, "miny");
            result.maxx = WmsLayerCapabilities.getFloatAttribute(bboxElement, "maxx");
            result.maxy = WmsLayerCapabilities.getFloatAttribute(bboxElement, "maxy");
            result.resx = WmsLayerCapabilities.getFloatAttribute(bboxElement, "resx");
            result.resy = WmsLayerCapabilities.getFloatAttribute(bboxElement, "resy");

            return result;
        };

        WmsLayerCapabilities.assembleDimension = function (dimensionElement) {
            var result = {};

            result.name = dimensionElement.getAttribute("name");
            result.units = dimensionElement.getAttribute("units");
            result.unitSymbol = dimensionElement.getAttribute("unitSymbol");
            result.default = dimensionElement.getAttribute("default");
            result.multipleValues = dimensionElement.getAttribute("multipleValues");
            if (result.multipleValues) {
                result.multipleValues = result.multipleValues === "true" || result.multipleValues === "1";
            }
            result.nearestValue = dimensionElement.getAttribute("nearestValue");
            if (result.nearestValue) {
                result.nearestValue = result.nearestValue === "true" || result.nearestValue === "1";
            }
            result.current = dimensionElement.getAttribute("current");
            if (result.current) {
                result.current = result.current === "true" || result.current === "1";
            }

            result.content = dimensionElement.textContent;

            return result;
        };

        WmsLayerCapabilities.assembleAttribution = function (attributionElement) {
            var result = {};

            for (var c = 0; c < attributionElement.children.length; c++) {
                var childElement = attributionElement.children[c];

                if (childElement.localName === "Title") {
                    result.title = childElement.textContent;

                } else if (childElement.localName === "OnlineResource") {
                    result.url = childElement.getAttribute("xlink:href");

                } else if (childElement.localName === "LogoUrul") {
                    result.logoUrl = WmsLayerCapabilities.assembleLogoUrl(childElement);
                }
            }

            return result;
        };

        WmsLayerCapabilities.assembleAuthorityUrl = function (urlElement) {
            var result = {};

            result.name = urlElement.getAttribute("name");

            for (var c = 0; c < urlElement.children.length; c++) {
                var childElement = urlElement.children[c];

                if (childElement.localName === "OnlineResource") {
                    result.url = childElement.getAttribute("xlink:href");
                }
            }

            return result;
        };

        WmsLayerCapabilities.assembleIdentifier = function (identifierElement) {
            var result = {};

            result.authority = identifierElement.getAttribute("authority");
            result.content = identifierElement.textContent;

            return result;
        };

        WmsLayerCapabilities.assembleMetadataUrl = function (urlElement) {
            var result = {};

            result.type = urlElement.getAttribute("type");

            for (var c = 0; c < urlElement.children.length; c++) {
                var childElement = urlElement.children[c];

                if (childElement.localName === "Format") {
                    result.format = childElement.textContent;

                } else if (childElement.localName === "OnlineResource") {
                    result.url = childElement.getAttribute("xlink:href");
                }
            }

            return result;
        };

        WmsLayerCapabilities.assembleLegendUrl = function (urlElement) {
            var result = {};

            result.width = WmsLayerCapabilities.getIntegerAttribute(urlElement, "width");
            result.height = WmsLayerCapabilities.getIntegerAttribute(urlElement, "height");

            for (var c = 0; c < urlElement.children.length; c++) {
                var childElement = urlElement.children[c];

                if (childElement.localName === "Format") {
                    result.format = childElement.textContent;

                } else if (childElement.localName === "OnlineResource") {
                    result.url = childElement.getAttribute("xlink:href");
                }
            }

            return result;
        };

        WmsLayerCapabilities.assembleLogoUrl = function (urlElement) {
            var result = {};

            result.width = WmsLayerCapabilities.getIntegerAttribute(urlElement, "width");
            result.height = WmsLayerCapabilities.getIntegerAttribute(urlElement, "height");

            for (var c = 0; c < urlElement.children.length; c++) {
                var childElement = urlElement.children[c];

                if (childElement.localName === "Format") {
                    result.format = childElement.textContent;

                } else if (childElement.localName === "OnlineResource") {
                    result.url = childElement.getAttribute("xlink:href");
                }
            }

            return result;
        };

        WmsLayerCapabilities.assembleUrl = function (urlElement) {
            var result = {};

            for (var c = 0; c < urlElement.children.length; c++) {
                var childElement = urlElement.children[c];

                if (childElement.localName === "Format") {
                    result.format = childElement.textContent;

                } else if (childElement.localName === "OnlineResource") {
                    result.url = childElement.getAttribute("xlink:href");
                }
            }

            return result;
        };

        WmsLayerCapabilities.getIntegerAttribute = function (element, attrName) {
            var result = element.getAttribute(attrName);

            if (result) {
                result = parseInt(result);
            } else {
                result = undefined;
            }

            return result;
        };

        WmsLayerCapabilities.getFloatAttribute = function (element, attrName) {
            var result = element.getAttribute(attrName);

            if (result) {
                result = parseFloat(result);
            } else {
                result = undefined;
            }

            return result;
        };

        return WmsLayerCapabilities;
    }
)
;