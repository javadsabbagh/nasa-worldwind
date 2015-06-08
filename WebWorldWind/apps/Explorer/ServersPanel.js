/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports ServersPanel
 * @version $Id$
 */
define(function () {
    "use strict";

    /**
     * Constructs a servers panel.
     * @alias ServersPanel
     * @constructor
     * @classdesc Provides a list of collapsible panels that indicate the layers associated with a WMS or other
     * image server. Currently on WMS is supported. The user can select a server's layers and they will be added to
     * the World Window's layer list.
     * @param {WorldWindow} worldWindow The World Window to associate this layers panel with.
     * @param {LayersPanel} layersPanel The layers panel managing the specified World Windows layer list.
     */
    var ServersPanel = function (worldWindow, layersPanel) {
        var thisServersPanel = this;

        this.wwd = worldWindow;
        this.layersPanel = layersPanel;

        this.idCounter = 1;

        $("#addServerBox").find("button").on("click", function (e) {
            thisServersPanel.onAddServerButton(e);
        });

        $("#addServerText").on("keypress", function (e) {
            thisServersPanel.onAddServerTextKeyPress($(this), e);
        });
    };

    ServersPanel.prototype.onAddServerButton = function (event) {
        this.attachServer($("#addServerText")[0].value);
        $("#addServerText").val("");
    };

    ServersPanel.prototype.onAddServerTextKeyPress = function (searchInput, event) {
        if (event.keyCode === 13) {
            searchInput.blur();
            this.attachServer($("#addServerText")[0].value);
            $("#addServerText").val("");
        }
    };

    ServersPanel.prototype.attachServer = function (serverAddress) {
        if (!serverAddress) {
            return;
        }

        serverAddress = serverAddress.trim();

        serverAddress = serverAddress.replace("Http", "http");
        if (serverAddress.lastIndexOf("http", 0) != 0) {
            serverAddress = "http://" + serverAddress;
        }

        var thisExplorer = this,
            request = new XMLHttpRequest(),
            url = WorldWind.WmsUrlBuilder.fixGetMapString(serverAddress);

        url += "service=WMS&request=GetCapabilities&vers";

        request.open("GET", url, true);
        request.onreadystatechange = function () {
            if (request.readyState === 4 && request.status === 200) {
                var xmlDom = request.responseXML;

                if (!xmlDom && request.responseText.indexOf("<?xml") === 0) {
                    xmlDom = new window.DOMParser().parseFromString(request.responseText, "text/xml");
                }

                if (!xmlDom) {
                    alert(serverAddress + " retrieval failed. It is probably not a WMS server.");
                    return;
                }

                var wmsCapsDoc = new WorldWind.WmsCapabilities(xmlDom);

                if (wmsCapsDoc.version) { // if no version, then the URL doesn't point to a caps doc.
                    thisExplorer.addServerPanel(serverAddress, wmsCapsDoc);
                } else {
                    alert(wmsServer +
                    " WMS capabilities document invalid. The server is probably not a WMS server.");
                }
            } else if (request.readyState === 4) {
                if (request.statusText) {
                    alert(request.responseURL + " " + request.status + " (" + request.statusText + ")");
                } else {
                    alert("Failed to retrieve WMS capabilities from " + serverAddress + ".");
                }
            }
        };

        request.send(null);
    };

    ServersPanel.prototype.addServerPanel = function (serverAddress, wmsCapsDoc) {
        var treeId = this.idCounter++,
            headingID = this.idCounter++,
            collapseID = this.idCounter++,
            wmsService = wmsCapsDoc.service,
            panelTitle = wmsService.title && wmsService.title.length > 0 ? wmsService.title : serverAddress;
        //
        //var html = '<div class="panel panel-default">';
        //html += '<div class="panel-heading" role="tab" id="' + headingID + '">';
        //html += '<h4 class="panel-title wrap-panel-heading">';
        ////html += '<a data-toggle="collapse" data-parent="#servers"';
        //html += '<a data-toggle="collapse"';
        //html += ' href="#' + collapseID + '"';
        //html += ' aria-expanded="true" aria-controls="' + collapseID + '">';
        //html += serverAddress;
        //html += '</a></h4></div>';
        //html += '<div id="' + collapseID + '" class="panel-collapse collapse in"';
        //html += ' role="tabpanel" aria-labelledby="' + headingID + '">';
        //html += '<div class="panel-body">';
        //html += 'This is some text to display in the collapse panel.';
        //html += '</div></div></div>';

        var topDiv = $('<div class="panel panel-default"></div>'),
            heading = $('<div class="panel-heading" role="tab" id="' + headingID + '"></div>'),
            title = $('<h4 class="panel-title wrap-panel-heading"></h4>'),
            anchor = $('<a data-toggle="collapse" href="#' + collapseID + '"' +
            ' aria-expanded="true" aria-controls="' + collapseID + '">' + panelTitle + '</a>'),
            bodyParent = $('<div id="' + collapseID + '" class="panel-collapse collapse in" role="tabpanel"' +
            ' aria-labelledby="' + headingID + '"></div>'),
            body = $('<div class="panel-body"></div>'),
            treeDiv = this.makeTree(serverAddress, treeId);

        title.append(anchor);
        heading.append(title);
        topDiv.append(heading);
        body.append(treeDiv);
        bodyParent.append(body);
        topDiv.append(bodyParent);

        var serversItem = $("#servers");
        serversItem.append(topDiv);

        var treeRoot = treeDiv.fancytree("getRootNode");
        treeRoot.addChildren(this.assembleLayers(wmsCapsDoc.capability.layers, []));
    };

    ServersPanel.prototype.makeTree = function (serverAddress, treeId) {
        var thisServersPanel = this,
            treeDivId = "treeDiv" + treeId,
            treeDataId = "treeData" + treeId,
            treeDiv = $('<div id="' + treeDivId + '">'),
            treeUl = $('<ul id="' + treeDataId + 'style="display: none;">');

        treeDiv.append(treeUl);

        treeDiv.fancytree({
            click: function (event, data) {
                var node = data.node,
                    layer = node.data.layer;

                if (layer) {
                    node.setSelected(!layer.enabled);
                    return false;
                }
            },
            select: function (event, data) {
                var node = data.node,
                    layer = node.data.layer;

                if (layer) {
                    if (!node.selected) {
                        node.data.layer = null;
                        thisServersPanel.removeLayer(layer);
                    }
                    //layer.enabled = node.selected;
                } else if (node.selected && node.data.layerCaps && node.data.layerCaps.name) {
                    node.data.layer = thisServersPanel.addLayer(node.data.layerCaps);
                }

                thisServersPanel.wwd.redraw();
                return false;
            }
        });
        treeDiv.fancytree("option", "checkbox", true);
        treeDiv.fancytree("option", "icons", false);

        $("form").submit(false);

        return treeDiv;
    };

    ServersPanel.prototype.assembleLayers = function (layers, result) {

        for (var i = 0; i < layers.length; i++) {
            var layer = layers[i],
                subLayers = null,
                node = {
                    title: layer.title,
                    layerCaps: layer
                };

            if (layer.layers && layer.layers.length > 0) {
                subLayers = this.assembleLayers(layer.layers, []);
            }

            if (!layer.name) {
                node.expanded = true;
                node.unselectable = true;
                node.hideCheckbox = true;
                node.folder = true;
            }

            if (subLayers) {
                node.children = subLayers;
            }

            result.push(node);
        }

        return result;
    };

    ServersPanel.prototype.addLayer = function (layerCaps) {
        if (layerCaps.name) {
            var config = WorldWind.WmsLayer.formLayerConfiguration(layerCaps, null);
            var layer = new WorldWind.WmsLayer(config);

            layer.enabled = true;
            this.wwd.addLayer(layer);
            this.wwd.redraw();

            this.layersPanel.synchronizeLayerList();

            return layer;
        }

        return null;
    };

    ServersPanel.prototype.removeLayer = function (layer) {
        this.wwd.removeLayer(layer);
        this.wwd.redraw();
        this.layersPanel.synchronizeLayerList();
    };

    return ServersPanel;
});