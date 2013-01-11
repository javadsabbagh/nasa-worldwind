/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import "WorldWind/Util/WWUtil.h"
#import "WorldWind/WWLog.h"

@implementation WWUtil

+ (NSString*) generateUUID
{
    // Taken from here: http://stackoverflow.com/questions/8684551/generate-a-uuid-string-with-arc-enabled

    CFUUIDRef uuid = CFUUIDCreate(NULL);
    NSString* uuidStr = (__bridge_transfer NSString*) CFUUIDCreateString(NULL, uuid);
    CFRelease(uuid);

    return uuidStr;
}

+ (BOOL) retrieveUrl:(NSURL*)url toFile:(NSString*)filePath
{
    if (url == nil)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"URL is nil")
    }

    if (filePath == nil || [filePath length] == 0)
    {
        WWLOG_AND_THROW(NSInvalidArgumentException, @"File path is nil or empty")
    }

    NSError* error = nil;

    // Get the data from the URL.
    NSData* data = [NSData dataWithContentsOfURL:url options:0 error:&error];
    if (error != nil)
    {
        WWLog("@Error \"%@\" retrieving %@", [error description], [url absoluteString]);
        return NO;
    }

    // Ensure that the directory for the file exists.
    NSString* pathDir = [filePath stringByDeletingLastPathComponent];
    [[NSFileManager defaultManager] createDirectoryAtPath:pathDir
                              withIntermediateDirectories:YES attributes:nil error:&error];
    if (error != nil)
    {
        WWLog("@Error \"%@\" creating path %@", [error description], filePath);
        return NO;
    }

    // Write the data to the file.
    [data writeToFile:filePath options:NSDataWritingAtomic error:&error];
    if (error != nil)
    {
        WWLog("@Error \"%@\" writing file %@", [error description], filePath);
        return NO;
    }

    return YES;
}

@end