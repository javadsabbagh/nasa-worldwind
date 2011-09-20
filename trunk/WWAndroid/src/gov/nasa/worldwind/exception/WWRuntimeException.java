/*
 * Copyright (C) 2011 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration.
 * All Rights Reserved.
 */
package gov.nasa.worldwind.exception;

/**
 * @author dcollins
 * @version $Id$
 */
public class WWRuntimeException extends RuntimeException
{
    /**
     * Construct an exception with a message string.
     *
     * @param msg the message.
     */
    public WWRuntimeException(String msg)
    {
        super(msg);
    }

    /**
     * Construct an exception with a message string and a initial-cause exception.
     *
     * @param msg the message.
     * @param t   the exception causing this exception.
     */
    public WWRuntimeException(String msg, Throwable throwable)
    {
        super(msg, throwable);
    }
}
