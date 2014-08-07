/*
 * Copyright (C) 2012 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration.
 * All Rights Reserved.
 */

package gov.nasa.worldwind.formats.nitfs;
/**
 * @author Lado Garakanidze
 * @version $Id$
 */
public class NITFSSymbolSegment extends NITFSSegment
{
    public NITFSSymbolSegment(java.nio.ByteBuffer buffer, int headerStartOffset, int headerLength, int dataStartOffset, int dataLength)
    {
        super(NITFSSegmentType.SYMBOL_SEGMENT, buffer, headerStartOffset, headerLength, dataStartOffset, dataLength);

        this.restoreBufferPosition();
    }
}