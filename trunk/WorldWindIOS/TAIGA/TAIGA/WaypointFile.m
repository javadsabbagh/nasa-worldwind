/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.

 @version $Id$
 */

#import "WaypointFile.h"
#import "Waypoint.h"
#import "WorldWind/Geometry/WWLocation.h"
#import "WorldWind/Util/WWRetriever.h"
#import "WorldWind/WorldWindConstants.h"
#import "WorldWind/WWLog.h"

@implementation WaypointFile

- (WaypointFile*) init
{
    self = [super init];

    waypointArray = [[NSMutableArray alloc] initWithCapacity:8];
    waypointKeyMap = [[NSMutableDictionary alloc] initWithCapacity:8];

    return self;
}

- (void) loadWaypointLocations:(NSArray*)locationArray finishedBlock:(void (^)(WaypointFile*))finishedBlock
{
    if (locationArray == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Location array is nil")
    }

    if (finishedBlock == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Finished block is nil")
    }

    const NSUInteger locationsCount = [locationArray count];
    __block NSUInteger locationsCompleted = 0;

    for (NSString* location in locationArray)
    {
        NSURL* url = [NSURL URLWithString:location];
        WWRetriever* retriever = [[WWRetriever alloc] initWithUrl:url timeout:5.0 finishedBlock:^(WWRetriever* waypointRetriever)
        {
            [self waypointRetrieverDidFinish:waypointRetriever];

            if (++locationsCompleted == locationsCount)
            {
                [self waypointLocationsDidFinish:finishedBlock];
            }
        }];
        [retriever performRetrieval];
    }
}

- (NSArray*) waypoints
{
    return waypointArray;
}

- (NSArray*) waypointsMatchingText:(NSString*)text
{
    if (text == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Text is nil")
    }

    NSPredicate* predicate = [NSPredicate predicateWithFormat:@"displayName LIKE[cd] %@ OR displayNameLong LIKE[cd] %@",
                    text, text];

    return [waypointArray filteredArrayUsingPredicate:predicate];
}

- (Waypoint*) waypointForKey:(NSString*)key
{
    if (key == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"Key is nil")
    }

    return [waypointKeyMap objectForKey:key];
}

- (void) waypointLocationsDidFinish:(void (^)(WaypointFile*))finishedBlock
{
    [waypointArray sortUsingComparator:^(id obj1, id obj2)
    {
        return [[obj1 displayName] compare:[obj2 displayName]];
    }];

    finishedBlock(self);
}

- (void) waypointRetrieverDidFinish:(WWRetriever*)retriever
{
    NSString* cacheDir = [NSSearchPathForDirectoriesInDomains(NSCachesDirectory, NSUserDomainMask, YES) objectAtIndex:0];
    NSString* cachePath = [cacheDir stringByAppendingPathComponent:[[retriever url] path]];
    NSString* location = [[retriever url] absoluteString]; // used for message logging

    if ([[retriever status] isEqualToString:WW_SUCCEEDED] && [[retriever retrievedData] length] > 0)
    {
        // If the retrieval was successful, cache the retrieved file and parse its contents directly from the retriever.
        NSError* error = nil;
        [[NSFileManager defaultManager] createDirectoryAtPath:[cachePath stringByDeletingLastPathComponent]
                                  withIntermediateDirectories:YES attributes:nil error:&error];
        if (error != nil)
        {
            WWLog(@"Unable to create waypoint file cache directory, %@", [error description]);
        }
        else
        {
            [[retriever retrievedData] writeToFile:cachePath options:NSDataWritingAtomic error:&error];
            if (error != nil)
            {
                WWLog(@"Unable to write waypoint file to cache, %@", [error description]);
            }
        }

        [self parseWaypointTable:[retriever retrievedData] location:location];
    }
    else
    {
        WWLog(@"Unable to retrieve waypoint file %@, falling back to local cache.", location);

        // Otherwise, attempt to use a previously cached version.
        NSData* data = [NSData dataWithContentsOfFile:cachePath];
        if (data != nil)
        {
            [self parseWaypointTable:data location:location];
        }
        else
        {
            WWLog(@"Unable to read local cache of waypoint file %@", location);
        }
    }
}

- (void) parseWaypointTable:(NSData*)data location:(NSString*)location
{
    NSString* string = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
    NSMutableArray* fieldNames = [[NSMutableArray alloc] initWithCapacity:8];
    NSMutableArray* tableRows = [[NSMutableArray alloc] initWithCapacity:8];

    [string enumerateLinesUsingBlock:^(NSString* line, BOOL* stop)
    {
        NSArray* lineComponents = [line componentsSeparatedByString:@"\t"];

        if ([fieldNames count] == 0) // first line indicates DAFIF table field names
        {
            [fieldNames addObjectsFromArray:lineComponents];
        }
        else // subsequent lines indicate DAFIF table row values
        {
            NSMutableDictionary* rowValues = [[NSMutableDictionary alloc] init];
            for (NSUInteger i = 0; i < [lineComponents count] && i < [fieldNames count]; i++)
            {
                [rowValues setObject:[lineComponents objectAtIndex:i] forKey:[fieldNames objectAtIndex:i]];
            }

            [tableRows addObject:rowValues];
        }
    }];

    if ([[fieldNames firstObject] isEqual:@"ARPT_IDENT"])
    {
        [self parseDAFIFAirportTable:tableRows];
    }
    else
    {
        WWLog(@"Unrecognized waypoint file %@", location);
    }
}

- (void) parseDAFIFAirportTable:(NSArray*)tableRows
{
    for (NSDictionary* row in tableRows)
    {
        NSString* id = [row objectForKey:@"ARPT_IDENT"];
        NSNumber* latDegrees = [row objectForKey:@"WGS_DLAT"];
        NSNumber* lonDegrees = [row objectForKey:@"WGS_DLONG"];
        NSString* icao = [row objectForKey:@"ICAO"];
        NSString* name = [row objectForKey:@"NAME"];

        WWLocation* location = [[WWLocation alloc] initWithDegreesLatitude:[latDegrees doubleValue]
                                                                 longitude:[lonDegrees doubleValue]];

        NSMutableString* displayName = [[NSMutableString alloc] init];
        [displayName appendString:icao];
        [displayName appendString:@": "];
        [displayName appendString:[name capitalizedString]];

        Waypoint* waypoint = [[Waypoint alloc] initWithKey:id location:location type:WaypointTypeAirport];
        [waypoint setProperties:row];
        [waypoint setDisplayName:displayName];
        [waypointArray addObject:waypoint];
        [waypointKeyMap setValue:waypoint forKey:id];
    }
}

@end