/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import "UIKit/UIKit.h"
#import "WorldWind/WorldWind.h"

@implementation WorldWind

static NSOperationQueue* wwRetrievalQueue; // singleton instance
static NSLock* wwNetworkBusySignalLock;
static BOOL wwOfflineMode = NO;
static NSLock* wwOfflineModeLock;

+ (void) initialize
{
    static BOOL initialized = NO; // protects against erroneous explicit calls to this method
    if (!initialized)
    {
        initialized = YES;
        wwRetrievalQueue = [[NSOperationQueue alloc] init];
        wwNetworkBusySignalLock = [[NSLock alloc] init];
        wwOfflineModeLock = [[NSLock alloc] init];
    }
}

+ (NSOperationQueue*) retrievalQueue
{
    return wwRetrievalQueue;
}

+ (void) setNetworkBusySignalVisible:(BOOL)visible
{
    static int numCalls = 0;

    @synchronized (wwNetworkBusySignalLock)
    {
        if (visible)
            ++numCalls;
        else
            --numCalls;

        if (numCalls < 0)
            numCalls = 0;

        [[UIApplication sharedApplication] setNetworkActivityIndicatorVisible:numCalls > 0];
    }
}

+ (void) setOfflineMode:(BOOL)offlineMode
{
    @synchronized (wwOfflineModeLock)
    {
        wwOfflineMode = offlineMode;
    }
}

+ (BOOL) isOfflineMode
{
    @synchronized (wwOfflineModeLock)
    {
        return wwOfflineMode;
    }
}

@end
