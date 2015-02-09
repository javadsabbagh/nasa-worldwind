/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @exports SurfaceTileRenderer
 * @version $Id$
 */
define([
        '../geom/Angle',
        '../error/ArgumentError',
        '../render/DrawContext',
        '../util/Logger',
        '../geom/Matrix',
        '../error/NotYetImplementedError',
        '../render/SurfaceTile',
        '../shaders/SurfaceTileRendererProgram',
        '../globe/Terrain',
        '../globe/Tessellator'
    ],
    function (Angle,
              ArgumentError,
              DrawContext,
              Logger,
              Matrix,
              NotYetImplementedError,
              SurfaceTile,
              SurfaceTileRendererProgram,
              Terrain,
              Tesselator) {
        "use strict";

        /**
         * Constructs a new surface tile renderer.
         * @alias SurfaceTileRenderer
         * @constructor
         * @classdesc This class is responsible for rendering imagery onto the terrain.
         * It is meant to be used internally. Applications typically do not interact with this class.
         */
        var SurfaceTileRenderer = function () {

            // Scratch values to avoid constantly recreating these matrices.
            this.texMaskMatrix = Matrix.fromIdentity();
            this.texSamplerMatrix = Matrix.fromIdentity();

            this.uvToTexelMatrix = Matrix.fromIdentity();
        };

        /**
         * Render a specified collection of surface tiles.
         * @param {DrawContext} dc The current draw context.
         * @param {SurfaceTile[]} surfaceTiles The surface tiles to render.
         * @param {number} opacity The opacity at which to draw the surface tiles.
         */
        SurfaceTileRenderer.prototype.renderTiles = function (dc, surfaceTiles, opacity) {
            if (!surfaceTiles) {
                throw new ArgumentError(
                    Logger.logMessage(Logger.LEVEL_SEVERE, "SurfaceTileRenderer", "renderTiles",
                        "Specified surface tiles array is null or undefined."));
            }

            if (surfaceTiles.length < 1)
                return;

            var terrain = dc.terrain,
                tileCount = 0, // for frame statistics
                terrainTile,
                terrainTileSector,
                surfaceTile;

            if (!terrain)
                return;

            // For each terrain tile, render it for each overlapping surface tile.
            this.beginRendering(dc, opacity);
            terrain.beginRendering(dc);
            try {
                for (var i = 0, ttLen = terrain.surfaceGeometry.length; i < ttLen; i++) {
                    terrainTile = terrain.surfaceGeometry[i];
                    terrainTileSector = terrainTile.sector;

                    terrain.beginRenderingTile(dc, terrainTile);
                    try {
                        // Render the terrain tile for each overlapping surface tile.
                        for (var j = 0, stLen = surfaceTiles.length; j < stLen; j++) {
                            surfaceTile = surfaceTiles[j];
                            if (surfaceTile.sector.overlaps(terrainTileSector)) {
                                if (surfaceTile.bind(dc)) {
                                    this.applyTileState(dc, terrainTile, surfaceTile);
                                    terrain.renderTile(dc, terrainTile);
                                    ++tileCount;
                                }
                            }
                        }
                    } finally {
                        terrain.endRenderingTile(dc, terrainTile);
                    }
                }
            } finally {
                terrain.endRendering(dc);
                this.endRendering(dc);
                dc.frameStatistics.incrementRenderedTileCount(tileCount);
            }
        };

        SurfaceTileRenderer.prototype.beginRendering = function (dc, opacity) {
            var gl = dc.currentGlContext,
                program = dc.findAndBindProgram(gl, SurfaceTileRendererProgram);
            program.loadTexSampler(gl, WebGLRenderingContext.TEXTURE0);
            program.loadOpacity(gl, opacity);
        };

        SurfaceTileRenderer.prototype.endRendering = function (dc) {
            dc.bindProgram(dc.currentGlContext, null);
        };

        SurfaceTileRenderer.prototype.applyTileState = function (dc, terrainTile, surfaceTile) {
            // Sets up the texture transform and mask that applies the texture tile to the terrain tile.
            var gl = dc.currentGlContext,
                program = dc.currentProgram,
                terrainSector = terrainTile.sector,
                terrainDeltaLat = terrainSector.deltaLatitude(),
                terrainDeltaLon = terrainSector.deltaLongitude(),
                surfaceSector = surfaceTile.sector,
                rawSurfaceDeltaLat = surfaceSector.deltaLatitude(),
                rawSurfaceDeltaLon = surfaceSector.deltaLongitude(),
                surfaceDeltaLat = rawSurfaceDeltaLat > 0 ? rawSurfaceDeltaLat : 1,
                surfaceDeltaLon = rawSurfaceDeltaLon > 0 ? rawSurfaceDeltaLon : 1,
                sScale = terrainDeltaLon / surfaceDeltaLon,
                tScale = terrainDeltaLat / surfaceDeltaLat,
                sTrans = -(surfaceSector.minLongitude - terrainSector.minLongitude) / surfaceDeltaLon,
                tTrans = -(surfaceSector.minLatitude - terrainSector.minLatitude) / surfaceDeltaLat;

            // Texels occur in discrete units and have discrete locations. For a texture map of linear size N,
            //      the first texel extends from 0 to 1, and
            //      the last texel extends from N-1 to N.
            // We want to map UV coordinates to the middle of texel so that it is sampled correctly. Therefore,
            //      UV = 0  => texel center at 0.5, and
            //      UV = 1  => texel center at N - 0.5.
            // So the offset of UV to texel is 0.5 / N, and
            // the scale of UV to texel is (N - 1) / N.
            var cache = dc.gpuResourceCache,
                texture = cache.resourceForKey(surfaceTile.imagePath);

            if (!texture) {
                texture = cache.resourceForKey(surfaceTile.fallbackTile.imagePath);
            }

            var width = texture.imageWidth * sScale,
                height = texture.imageHeight * tScale;

            this.uvToTexelMatrix.set(
                (width - 1) / width, 0, 0, 0.5 / width,
                0, (height - 1) / height, 0, 0.5 / height,
                0, 0, 1, 0,
                0, 0, 0, 1
            );

            this.texMaskMatrix.set(
                sScale, 0, 0, sTrans,
                0, tScale, 0, tTrans,
                0, 0, 1, 0,
                0, 0, 0, 1
            );

            // TODO: factor uvToTexelMatrix directly into texMaskMatrix
            this.texMaskMatrix.multiplyMatrix(this.uvToTexelMatrix);

            this.texSamplerMatrix.setToUnitYFlip();
            surfaceTile.applyInternalTransform(dc, this.texSamplerMatrix);
            this.texSamplerMatrix.multiplyMatrix(this.texMaskMatrix);

            program.loadTexSamplerMatrix(gl, this.texSamplerMatrix);
            program.loadTexMaskMatrix(gl, this.texMaskMatrix);
        };

        return SurfaceTileRenderer;
    }
);