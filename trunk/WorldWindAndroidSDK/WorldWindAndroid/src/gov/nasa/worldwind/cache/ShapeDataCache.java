/* Copyright (C) 2001, 2012 United States Government as represented by
the Administrator of the National Aeronautics and Space Administration.
All Rights Reserved.
*/
package gov.nasa.worldwind.cache;

import gov.nasa.worldwind.avlist.AVListImpl;
import gov.nasa.worldwind.geom.Extent;
import gov.nasa.worldwind.globes.*;
import gov.nasa.worldwind.render.DrawContext;
import gov.nasa.worldwind.util.TimedExpirySupport;

import java.util.*;

/**
 * Provides a mechanism to manage globe-specific representations of shapes. Typically used to manage per-globe state
 * when the application associates the same shape with multiple {@link gov.nasa.worldwind.WorldWindow}s.
 * <p/>
 * This cache limits the amount of time an entry remains in the cache unused. The maximum unused time may be specified.
 * Entries unused within the specified duration are removed from the cache each time {@link
 * #getEntry(gov.nasa.worldwind.globes.Globe)} is called.
 *
 * @author tag
 * @version $Id$
 */
@SuppressWarnings("UnusedDeclaration")
public class ShapeDataCache implements Iterable<ShapeDataCache.ShapeDataCacheEntry>
{
    public static class ShapeDataCacheEntry extends AVListImpl
    {
        /** Identifies the associated globe's state at the time the entry was created. */
        protected GlobeStateKey globeStateKey;
        /** Indicates the vertical exaggeration in effect when the entry was cached. */
        protected double verticalExaggeration;
        /** Determines whether the cache entry has expired. */
        protected TimedExpirySupport timer;
        /** Indicates the associated shape's extent, in model coordinates relative to the associated globe. */
        protected Extent extent;
        /** Indicates the eye distance of the shape in the globe-relative coordinate system. */
        protected double eyeDistance;

        /**
         * Constructs an entry using the globe and vertical exaggeration of a specified draw context.
         *
         * @param dc            the draw context. Must contain a globe.
         * @param minExpiryTime the minimum expiration duration, in milliseconds.
         * @param maxExpiryTime the maximum expiration duration, in milliseconds.
         *
         * @throws IllegalArgumentException if the draw context is null.
         */
        public ShapeDataCacheEntry(DrawContext dc, long minExpiryTime, long maxExpiryTime)
        {
            this.globeStateKey = dc != null ? dc.getGlobe().getGlobeStateKey(dc) : null;
            this.verticalExaggeration = dc != null ? dc.getVerticalExaggeration() : 1d;
            this.timer = new TimedExpirySupport(Math.max(minExpiryTime, 0), Math.max(maxExpiryTime, 0));
        }

        /**
         * Indicates this entry's globe state key, captured when this entry was constructed or when explicitly set.
         *
         * @return this entry's globe state key.
         */
        public GlobeStateKey getGlobeStateKey()
        {
            return this.globeStateKey;
        }

        /**
         * Specifies this entry's globe state key.
         *
         * @param globeStateKey the new globe state key.
         */
        public void setGlobeStateKey(GlobeStateKey globeStateKey)
        {
            this.globeStateKey = globeStateKey;
        }

        /**
         * Indicates this entry's vertical exaggeration, captured when the entry was constructed or when explicitly
         * set.
         *
         * @return this entry's vertical exaggeration.
         */
        public double getVerticalExaggeration()
        {
            return verticalExaggeration;
        }

        public void setVerticalExaggeration(double verticalExaggeration)
        {
            this.verticalExaggeration = verticalExaggeration;
        }

        /**
         * Indicates whether this shape data's globe state and vertical exaggeration are the same as that in the current
         * draw context.
         *
         * @param dc the current draw context.
         *
         * @return true if the shape is valid, otherwise false.
         */
        public boolean isValid(DrawContext dc)
        {
            return this.verticalExaggeration == dc.getVerticalExaggeration()
                && (this.globeStateKey != null && this.globeStateKey.equals(dc.getGlobe().getGlobeStateKey(dc)));
        }

        /**
         * Returns this entry's expiration timer.
         *
         * @return this entry's expiration timer.
         */
        public TimedExpirySupport getTimer()
        {
            return this.timer;
        }

        /**
         * Specifies this entry's expiration timer.
         *
         * @param timer the new expiration timer.
         */
        public void setTimer(TimedExpirySupport timer)
        {
            this.timer = timer;
        }

        /**
         * Indicates whether this entry has expired.
         *
         * @param dc the current draw context.
         *
         * @return true if the entry has expired, otherwise false.
         */
        public boolean isExpired(DrawContext dc)
        {
            return dc != null ? this.timer.isExpired(dc) : this.timer.isExpired(System.currentTimeMillis());
        }

        /**
         * Sets this entry's expiration state.
         *
         * @param isExpired true to expire the entry, otherwise false.
         */
        public void setExpired(boolean isExpired)
        {
            this.timer.setExpired(isExpired);
        }

        /**
         * Resets the timer to the current time.
         *
         * @param dc the current draw context.
         *
         * @throws IllegalArgumentException if the draw context is null.
         */
        public void restartTimer(DrawContext dc)
        {
            this.timer.restart(dc);
        }

        /**
         * Returns this entry's extent.
         *
         * @return this entry's extent.
         */
        public Extent getExtent()
        {
            return this.extent;
        }

        /**
         * Specifies this entry's extent.
         *
         * @param extent the new extent. May be null.
         */
        public void setExtent(Extent extent)
        {
            this.extent = extent;
        }

        /**
         * Indicates this entry's eye distance.
         *
         * @return this entry's eye distance, in meters.
         */
        public double getEyeDistance()
        {
            return this.eyeDistance;
        }

        /**
         * Specifies this entry's eye distance.
         *
         * @param eyeDistance the eye distance, in meters.
         */
        public void setEyeDistance(double eyeDistance)
        {
            this.eyeDistance = eyeDistance;
        }
    }

    /**
     * This cache's map of entries. Typically one entry per open window. For most applications this will never hold more
     * than one entry, therefore this map is initialized with a capacity of 1.
     */
    protected HashMap<Globe, ShapeDataCacheEntry> entries = new HashMap<Globe, ShapeDataCacheEntry>(1);
    /** The maximum number of milliseconds an entry may remain in the cache without being used. Initially 0. */
    protected long maxTimeSinceLastUsed;

    /**
     * Construct a cache with a specified entry lifetime.
     *
     * @param maxTimeSinceLastUsed the maximum number of milliseconds an entry may remain in the cache without being
     *                             used.
     */
    public ShapeDataCache(long maxTimeSinceLastUsed)
    {
        this.maxTimeSinceLastUsed = maxTimeSinceLastUsed;
    }

    public Iterator<ShapeDataCacheEntry> iterator()
    {
        return this.entries.values().iterator();
    }

    /**
     * Retrieves a specified entry from the cache.
     *
     * @param globe the globe the entry is associated with.
     *
     * @return the entry if it exists, otherwise null.
     */
    public ShapeDataCacheEntry getEntry(Globe globe)
    {
        if (globe == null)
            return null;

        return this.entries.get(globe);
    }

    /**
     * Adds a specified entry to the cache or replaces an entry associated with the same globe.
     *
     * @param entry the entry to add. If null, the cache remains unchanged.
     */
    public void addEntry(ShapeDataCacheEntry entry)
    {
        if (entry != null)
            return;

        this.entries.put(entry.globeStateKey.getGlobe(), entry);
    }

    /** Remove all entries from this cache. */
    public void removeAllEntries()
    {
        this.entries.clear();
    }

    /**
     * Set all entries in this cache to a specified expiration state.
     *
     * @param isExpired the expiration state.
     */
    public void setAllExpired(boolean isExpired)
    {
        for (ShapeDataCacheEntry entry : this.entries.values())
        {
            entry.setExpired(isExpired);
        }
    }

    /** Set to null the extent field of all entries in this cache. */
    public void clearExtents()
    {
        for (ShapeDataCacheEntry entry : this.entries.values())
        {
            entry.setExtent(null);
        }
    }
}
