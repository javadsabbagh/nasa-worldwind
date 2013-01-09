/*
 * Copyright (C) 2013 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration.
 * All Rights Reserved.
 */

package gov.nasa.worldwind.util;

import com.jogamp.opengl.util.texture.TextureData;
import gov.nasa.worldwind.Configuration;
import junit.framework.TestCase;
import org.junit.Test;

import java.io.*;
import java.net.URL;

/**
 * Unit tests for {@link OGLUtil}.
 *
 * @author pabercrombie
 * @version $Id$
 */
public class OGLUtilTest
{
    protected static final String PNG_FILE = "./src/images/earth-map-512x256.png";
    protected static final String DDS_FILE = "./src/images/BMNG_world.topo.bathy.200405.3.2048x1024.dds";
    protected static final String JPG_FILE = "./src/images/BMNG_world.topo.bathy.200405.3.2048x1024.jpg";

    @Test
    public void testPngFile() throws IOException
    {
        File f = new File(PNG_FILE);

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), f, false);

        TestCase.assertEquals(td.getWidth(), 512);
        TestCase.assertEquals(td.getHeight(), 256);
    }

    @Test
    public void testPngStream() throws IOException
    {
        File f = new File(PNG_FILE);
        InputStream s = new FileInputStream(f);

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), s, false);

        TestCase.assertEquals(td.getWidth(), 512);
        TestCase.assertEquals(td.getHeight(), 256);
    }

    @Test
    public void testPngUrl() throws IOException
    {
        URL url = new File(PNG_FILE).toURI().toURL();

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), url, false);

        TestCase.assertEquals(td.getWidth(), 512);
        TestCase.assertEquals(td.getHeight(), 256);
    }

    @Test
    public void testDdsFile() throws IOException
    {
        File f = new File(DDS_FILE);

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), f, false);

        TestCase.assertEquals(td.getWidth(), 2048);
        TestCase.assertEquals(td.getHeight(), 1024);
    }

    @Test
    public void testDdsStream() throws IOException
    {
        File f = new File(DDS_FILE);
        InputStream s = new FileInputStream(f);

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), s, false);

        TestCase.assertEquals(td.getWidth(), 2048);
        TestCase.assertEquals(td.getHeight(), 1024);
    }

    @Test
    public void testDdsUrl() throws IOException
    {
        URL url = new File(DDS_FILE).toURI().toURL();

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), url, false);

        TestCase.assertEquals(td.getWidth(), 2048);
        TestCase.assertEquals(td.getHeight(), 1024);
    }

    @Test
    public void testJpgFile() throws IOException
    {
        File f = new File(JPG_FILE);

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), f, false);

        TestCase.assertEquals(td.getWidth(), 2048);
        TestCase.assertEquals(td.getHeight(), 1024);
    }

    @Test
    public void testJpgStream() throws IOException
    {
        File f = new File(JPG_FILE);
        InputStream s = new FileInputStream(f);

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), s, false);

        TestCase.assertEquals(td.getWidth(), 2048);
        TestCase.assertEquals(td.getHeight(), 1024);
    }

    @Test
    public void testJpgUrl() throws IOException
    {
        URL url = new File(JPG_FILE).toURI().toURL();

        TextureData td = OGLUtil.newTextureData(Configuration.getMaxCompatibleGLProfile(), url, false);

        TestCase.assertEquals(td.getWidth(), 2048);
        TestCase.assertEquals(td.getHeight(), 1024);
    }
}
