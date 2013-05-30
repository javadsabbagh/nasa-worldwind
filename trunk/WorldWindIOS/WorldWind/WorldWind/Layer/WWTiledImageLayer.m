/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import "WorldWind/Layer/WWTiledImageLayer.h"
#import "WorldWind/Formats/PVRTC/WWPVRTCImage.h"
#import "WorldWind/Geometry/WWBoundingBox.h"
#import "WorldWind/Geometry/WWLocation.h"
#import "WorldWind/Geometry/WWSector.h"
#import "WorldWind/Navigate/WWNavigatorState.h"
#import "WorldWind/Render/WWDrawContext.h"
#import "WorldWind/Render/WWSurfaceTile.h"
#import "WorldWind/Render/WWSurfaceTileRenderer.h"
#import "WorldWind/Render/WWTexture.h"
#import "WorldWind/Render/WWTextureTile.h"
#import "WorldWind/Util/WWAbsentResourceList.h"
#import "WorldWind/Util/WWGpuResourceCache.h"
#import "WorldWind/Util/WWLevel.h"
#import "WorldWind/Util/WWLevelSet.h"
#import "WorldWind/Util/WWMemoryCache.h"
#import "WorldWind/Util/WWRetrieverToFile.h"
#import "WorldWind/Util/WWTileKey.h"
#import "WorldWind/Util/WWUtil.h"
#import "WorldWind/Util/WWWmsUrlBuilder.h"
#import "WorldWind/WorldWind.h"

@implementation WWTiledImageLayer

- (WWTiledImageLayer*) initWithSector:(WWSector*)sector
                       levelZeroDelta:(WWLocation*)levelZeroDelta
                            numLevels:(int)numLevels
                 retrievalImageFormat:(NSString*)retrievalImageFormat
                            cachePath:(NSString*)cachePath
{
    if (sector == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Sector is nil")
    }

    if (levelZeroDelta == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Level 0 delta is nil")
    }

    if (numLevels < 1)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Number of levels is less than 1")
    }

    if (retrievalImageFormat == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Image format is nil")
    }

    if (cachePath == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Cache path is nil")
    }

    self = [super init];

    self->tileCache = [[WWMemoryCache alloc] initWithCapacity:500000 lowWater:400000];

    _retrievalImageFormat = retrievalImageFormat;
    _cachePath = cachePath;
    _timeout = 20; // seconds

    _textureFormat = WW_TEXTURE_RGBA_5551;

    self->detailHintOrigin = 2.5;

    self->levels = [[WWLevelSet alloc] initWithSector:sector
                                       levelZeroDelta:levelZeroDelta
                                            numLevels:numLevels];

    self->currentTiles = [[NSMutableArray alloc] init];
    self->topLevelTiles = [[NSMutableArray alloc] init];
    self->currentRetrievals = [[NSMutableSet alloc] init];
    self->currentLoads = [[NSMutableSet alloc] init];
    self->absentResources = [[WWAbsentResourceList alloc] initWithMaxTries:3 minCheckInterval:10];

    [self setPickEnabled:NO];

    // Set up to handle retrieval and image read monitoring.
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleTextureRetrievalNotification:)
                                                 name:WW_RETRIEVAL_STATUS // retrieval from net
                                               object:self];

    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(handleTextureReadNotification:)
                                                 name:WW_REQUEST_STATUS // opening image file on disk
                                               object:self];

    return self;
}

- (void) dispose
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void) setPickEnabled:(BOOL)pickEnabled
{
    // Picking can never be enabled for TiledImageLayer. It's disabled at initialization and can't be set.
}

- (void) handleTextureRetrievalNotification:(NSNotification*)notification
{
    NSDictionary* avList = [notification userInfo];
    NSString* retrievalStatus = [avList valueForKey:WW_RETRIEVAL_STATUS];
    NSString* imagePath = [avList valueForKey:WW_FILE_PATH];
    NSString* pathKey = [WWUtil replaceSuffixInPath:imagePath newSuffix:nil];

    @try
    {
        if ([retrievalStatus isEqualToString:WW_SUCCEEDED])
        {
            if ([_textureFormat isEqualToString:WW_TEXTURE_PVRTC_4BPP])
            {
                [WWPVRTCImage compressFile:imagePath];
                [[NSFileManager defaultManager] removeItemAtPath:imagePath error:nil];
            }
            else if ([_textureFormat isEqualToString:WW_TEXTURE_RGBA_8888])
            {
                [WWTexture convertTextureTo8888:imagePath];
                [[NSFileManager defaultManager] removeItemAtPath:imagePath error:nil];
            }
            else if ([_textureFormat isEqualToString:WW_TEXTURE_RGBA_5551])
            {
                [WWTexture convertTextureTo5551:imagePath];
                [[NSFileManager defaultManager] removeItemAtPath:imagePath error:nil];
            }

            [absentResources unmarkResourceAbsent:pathKey];

            NSNotification* redrawNotification = [NSNotification notificationWithName:WW_REQUEST_REDRAW object:self];
            [[NSNotificationCenter defaultCenter] postNotification:redrawNotification];
        }
        else
        {
            [absentResources markResourceAbsent:pathKey];
        }
    }
    @catch (NSException* exception)
    {
        [absentResources markResourceAbsent:pathKey];
        [[NSFileManager defaultManager] removeItemAtPath:imagePath error:nil];

        NSString* msg = [NSString stringWithFormat:@"loading texture data for file %@", imagePath];
        WWLogE(msg, exception);
    }
    @finally
    {
        @synchronized (currentRetrievals)
        {
            [self->currentRetrievals removeObject:pathKey];
        }
    }
}

- (void) handleTextureReadNotification:(NSNotification*)notification
{
    NSDictionary* avList = [notification userInfo];
    NSString* retrievalStatus = [avList valueForKey:WW_REQUEST_STATUS];
    NSString* imagePath = [avList valueForKey:WW_FILE_PATH];

    @try
    {
        if ([retrievalStatus isEqualToString:WW_SUCCEEDED])
        {
            NSNotification* redrawNotification = [NSNotification notificationWithName:WW_REQUEST_REDRAW object:self];
            [[NSNotificationCenter defaultCenter] postNotification:redrawNotification];
        }
    }
    @finally
    {
        @synchronized (currentLoads)
        {
            [self->currentLoads removeObject:imagePath];
        }
    }
}

- (void) createTopLevelTiles
{
    [self->topLevelTiles removeAllObjects];

    [WWTile createTilesForLevel:[self->levels firstLevel]
                    tileFactory:self
                       tilesOut:self->topLevelTiles];
}

- (void) doRender:(WWDrawContext*)dc
{
    if ([dc surfaceGeometry] == nil)
        return;

    [self assembleTiles:dc];

//    NSLog(@"CURRENT TILES %d", [self->currentTiles count]);
//    for (NSUInteger i = 0; i < [self->currentTiles count]; i++)
//    {
//        WWTextureTile* tile = [self->currentTiles objectAtIndex:i];
//        WWSector* s = [tile sector];
//        NSLog(@"SHOWING %f, %f, %f, %f", [s minLatitude], [s maxLatitude], [s minLongitude], [s maxLongitude]);
//    }

    if ([self->currentTiles count] > 0)
    {
        [[dc surfaceTileRenderer] renderTiles:dc surfaceTiles:self->currentTiles opacity:[self opacity]];

        [self->currentTiles removeAllObjects];
    }
}

- (BOOL) isLayerInView:(WWDrawContext*)dc
{
    WWSector* visibleSector = [dc visibleSector];

    return visibleSector == nil || [visibleSector intersects:[self->levels sector]];
}

- (BOOL) isTileVisible:(WWDrawContext*)dc tile:(WWTextureTile*)tile
{
    WWSector* visibleSector = [dc visibleSector];

    if (visibleSector != nil && ![visibleSector intersects:[tile sector]])
        return NO;

    return [[tile extent] intersects:[[dc navigatorState] frustumInModelCoordinates]];
}

- (void) assembleTiles:(WWDrawContext*)dc
{
    [self->currentTiles removeAllObjects];

    if ([self->topLevelTiles count] == 0)
    {
        [self createTopLevelTiles];
    }

    for (NSUInteger i = 0; i < [self->topLevelTiles count]; i++)
    {
        WWTextureTile* tile = [self->topLevelTiles objectAtIndex:i];

        [tile updateReferencePoints:[dc globe] verticalExaggeration:[dc verticalExaggeration]];
        [tile updateExtent:[dc globe] verticalExaggeration:[dc verticalExaggeration]];

        self->currentAncestorTile = nil;

        if ([self isTileVisible:dc tile:tile])
        {
            [self addTileOrDescendants:dc tile:tile];
        }
    }
}

- (void) addTileOrDescendants:(WWDrawContext*)dc tile:(WWTextureTile*)tile
{
    if ([self tileMeetsRenderCriteria:dc tile:tile])
    {
        [self addTile:dc tile:tile];
        return;
    }

    WWTextureTile* ancestorTile = nil;

    @try
    {
        if ([self isTileTextureInMemory:dc tile:tile] || [[tile level] levelNumber] == 0)
        {
            ancestorTile = self->currentAncestorTile;
            self->currentAncestorTile = tile;
        }

        // TODO: Surround this loop with an autorelease pool since a lot of tiles are generated?
        WWLevel* nextLevel = [self->levels level:[[tile level] levelNumber] + 1];
        NSArray* subTiles = [tile subdivide:nextLevel cache:self->tileCache tileFactory:self];
        for (NSUInteger i = 0; i < 4; i++)
        {
            WWTile* child = [subTiles objectAtIndex:i];

            [child updateReferencePoints:[dc globe] verticalExaggeration:[dc verticalExaggeration]];
            [child updateExtent:[dc globe] verticalExaggeration:[dc verticalExaggeration]];

            if ([[self->levels sector] intersects:[child sector]]
                    && [self isTileVisible:dc tile:(WWTextureTile*) child])
            {
                [self addTileOrDescendants:dc tile:(WWTextureTile*) child];
            }
        }
    }
    @finally
    {
        if (ancestorTile != nil)
        {
            self->currentAncestorTile = ancestorTile;
        }
    }
}

- (void) addTile:(WWDrawContext*)dc tile:(WWTextureTile*)tile
{
    [tile setFallbackTile:nil];

    WWTexture* texture = (WWTexture*) [[dc gpuResourceCache] getResourceForKey:[tile imagePath]];
    if (texture != nil)
    {
        [self->currentTiles addObject:tile];

        // If the tile's texture has expired, cause it to be re-retrieved. Note that the current,
        // expired texture is still used until the updated one arrives.
        if (_expiration != nil && [self isTextureExpired:texture])
        {
            [self loadOrRetrieveTileImage:dc tile:tile];
        }

        return;
    }

    [self loadOrRetrieveTileImage:dc tile:tile];

    if (self->currentAncestorTile != nil)
    {
        if ([self isTileTextureInMemory:dc tile:self->currentAncestorTile])
        {
            [tile setFallbackTile:self->currentAncestorTile];
            [self->currentTiles addObject:tile];
        }
        else if ([[self->currentAncestorTile level] levelNumber] == 0)
        {
            [self loadOrRetrieveTileImage:dc tile:self->currentAncestorTile];
        }
    }
}

- (BOOL) isTextureExpired:(WWTexture*)texture
{
    if (_expiration == nil || [_expiration timeIntervalSinceNow] > 0)
    {
        return NO; // no expiration time or it's in the future
    }

    return [[texture fileModificationDate] timeIntervalSinceDate:_expiration] < 0;
}

- (BOOL) isTextureOnDiskExpired:(WWTextureTile*)tile
{
    if (_expiration != nil)
    {
        // Determine whether the disk image has expired.
        NSDictionary* fileAttrs = [[NSFileManager defaultManager] attributesOfItemAtPath:[tile imagePath] error:nil];
        NSDate* fileDate = [fileAttrs objectForKey:NSFileModificationDate];
        return [fileDate timeIntervalSinceDate:_expiration] < 0;
    }

    return NO;
}

- (BOOL) isTileTextureInMemory:(WWDrawContext*)dc tile:(WWTextureTile*)tile
{
    return [dc.gpuResourceCache containsKey:[tile imagePath]];
}

- (BOOL) isTileTextureOnDisk:(WWTextureTile*)tile
{
    return [[NSFileManager defaultManager] fileExistsAtPath:[tile imagePath]];
}

- (BOOL) tileMeetsRenderCriteria:(WWDrawContext*)dc tile:(WWTextureTile*)tile
{
    return [self->levels isLastLevel:[[tile level] levelNumber]]
            || ![tile mustSubdivide:dc detailFactor:(self->detailHintOrigin + _detailHint)];
}

- (WWTile*) createTile:(WWSector*)sector level:(WWLevel*)level row:(int)row column:(int)column
{
    NSString* formatSuffix = _retrievalImageFormat;

    if ([_textureFormat isEqualToString:WW_TEXTURE_PVRTC_4BPP])
    {
        formatSuffix = @"pvr";
    }
    if ([_textureFormat isEqualToString:WW_TEXTURE_RGBA_5551])
    {
        formatSuffix = @"5551";
    }
    if ([_textureFormat isEqualToString:WW_TEXTURE_RGBA_8888])
    {
        formatSuffix = @"8888";
    }

    NSString* imagePath = [NSString stringWithFormat:@"%@/%d/%d/%d_%d.%@",
                                                     _cachePath, [level levelNumber], row, row, column, formatSuffix];

    return [[WWTextureTile alloc] initWithSector:sector level:level row:row column:column imagePath:imagePath];
}

- (WWTile*) createTile:(WWTileKey*)key
{
    WWLevel* level = [levels level:[key levelNumber]];
    int row = [key row];
    int column = [key column];

    WWSector* sector = [WWTile computeSector:level row:row column:column];

    return [self createTile:sector level:level row:row column:column];
}

- (void) loadOrRetrieveTileImage:(WWDrawContext*)dc tile:(WWTextureTile*)tile
{
    // See if it's already on disk.
    if ([self isTileTextureOnDisk:tile])
    {
        if ([self isTextureOnDiskExpired:tile])
        {
            [self retrieveTileImage:tile]; // Existing image file is out of date, so initiate retrieval of an up-to-date one.

            if ([self isTileTextureInMemory:dc tile:tile])
            {
                return; // Out-of-date tile is in memory so don't load the old image file again.
            }
        }

        // Load the existing image file whether it's out of date or not. This has the effect of showing expired
        // images until new ones arrive.
        [self loadTileImage:dc tile:tile];
    }
    else
    {
        [self retrieveTileImage:tile];
    }

}

- (void) loadTileImage:(WWDrawContext*)dc tile:(WWTextureTile*)tile
{
    @synchronized (currentLoads)
    {
        if ([currentLoads containsObject:[tile imagePath]])
        {
            return;
        }

        [currentLoads addObject:[tile imagePath]];
    }

    WWTexture* texture = [[WWTexture alloc] initWithImagePath:[tile imagePath]
                                                        cache:[dc gpuResourceCache]
                                                       object:self];
//    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0),
//            ^
//            {
//                [texture start];
//            });
    [texture setThreadPriority:0.1];
    [[WorldWind loadQueue] addOperation:texture];
}

- (NSString*) retrieveTileImage:(WWTextureTile*)tile
{
    // If the app is connected to the network, retrieve the image from there.

    if ([WorldWind isOfflineMode])
    {
        return nil; // don't know the tile's status in offline mode
    }

    NSString* pathKey = [WWUtil replaceSuffixInPath:[tile imagePath] newSuffix:nil];
    if ([absentResources isResourceAbsent:pathKey])
    {
        return WW_ABSENT;
    }

    @synchronized (currentRetrievals)
    {
        // Synchronize checking for the file on disk with adding the tile to currentRetrievals. This avoids unnecessary
        // retrievals initiated when a retrieval completes between the time this thread checks for the file on disk and
        // checks the currentRetrievals list.

        if ([self isTileTextureOnDisk:tile] && ![self isTextureOnDiskExpired:tile])
        {
            return WW_LOCAL;
        }
        else if ([currentRetrievals containsObject:pathKey])
        {
            return nil; // don't know the tile's status until retrieval completes
        }

        [currentRetrievals addObject:pathKey];
    }

    NSURL* url = [self resourceUrlForTile:tile imageFormat:_retrievalImageFormat];

    WWRetrieverToFile* retriever;
    if ([_textureFormat isEqualToString:WW_TEXTURE_PVRTC_4BPP]
            || [_textureFormat isEqualToString:WW_TEXTURE_RGBA_5551]
            || [_textureFormat isEqualToString:WW_TEXTURE_RGBA_8888])
    {
        // Download to a file with the download format suffix. The image will be decoded and possibly compressed when
        // the notification of download success is received in handleNotification above.
        NSString* suffix = [WWUtil suffixForMimeType:_retrievalImageFormat];
        NSString* filePath = [WWUtil replaceSuffixInPath:[tile imagePath] newSuffix:suffix];
        retriever = [[WWRetrieverToFile alloc] initWithUrl:url filePath:filePath object:self timeout:_timeout];
    }
    else
    {
        retriever = [[WWRetrieverToFile alloc] initWithUrl:url filePath:[tile imagePath] object:self timeout:_timeout];
    }

//    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0),
//            ^
//            {
//                [retriever performRetrieval];
//            });

    [retriever setThreadPriority:0.0];
    [[WorldWind retrievalQueue] addOperation:retriever];

    return nil; // don't know the tile's status until retrieval completes
}

- (NSURL*) resourceUrlForTile:(WWTile*)tile imageFormat:(NSString*)imageFormat
{
    if (tile == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Tile is nil")
    }

    if (imageFormat == nil || [imageFormat length] == 0)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Image format is nil or empty")
    }

    if (_urlBuilder == nil)
    {
        WWLOG_AND_THROW(NSInternalInconsistencyException, @"URL builder is nil")
    }

    return [_urlBuilder urlForTile:tile imageFormat:imageFormat];
}

@end