/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.
 
 @version $Id$
 */

#import "UIKit/UIKit.h"
#import "WorldWind/WorldWind.h"

@implementation WorldWind

static NSOperationQueue* wwRetrievalQueue; // singleton instance
static NSLock* networkBusySignalLock;

+ (void) initialize
{
    static BOOL initialized = NO; // protects against erroneous explicit calls to this method
    if (!initialized)
    {
        initialized = YES;
        wwRetrievalQueue = [[NSOperationQueue alloc] init];
        networkBusySignalLock = [[NSLock alloc] init];
    }
}

+ (NSOperationQueue*) retrievalQueue
{
    return wwRetrievalQueue;
}

+ (void) setNetworkBusySignalVisible:(BOOL)visible
{
    static int numCalls = 0;

    @synchronized (networkBusySignalLock)
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

@end