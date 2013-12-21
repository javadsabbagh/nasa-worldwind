/*
 Copyright (C) 2013 United States Government as represented by the Administrator of the
 National Aeronautics and Space Administration. All Rights Reserved.

 @version $Id$
 */

#import <Foundation/Foundation.h>
#import <OpenGLES/ES2/gl.h>
#import "WorldWind/Render/WWGpuProgram.h"

@class WWMatrix;
@class WWTexture;

/**
* WWSurfaceTileRendererProgram is a GLSL program used by WWSurfaceTileRenderer that draws geometry with a texture
* applied to a geographic sector. WWSurfaceTileRendererProgram exposes the following vertex attributes and uniform
* variables to configure its behavior:
*
* ###Vertex Attributes###
*
* `vec4 vertexPoint` - The geometry's vertex points, in model coordinates. This attribute's location is provided by
* the vertexPointLocation property.
*
* `vec4 vertexTexCoord` - The geometry's vertex texture coordinates. This attribute's location is provided by
* the vertexTexCoordLocation property.
*
* ###Uniform Variables###
*
* `mat4 mvpMatrix` - The modelview-projection matrix used to transform the `vertexPoint` attribute. Specified using
* loadModelviewProjection:.
*
* `mat4 tileCoordMatrix` - The matrix used to transform the `vertexTexCoord` attribute to the range [0,1] in the
* geographic region the texture should be applied. Coordinates outside of this range have a fragment color of
* (0, 0, 0, 0). Specified using loadTileCoordMatrix:.
*
* `mat4 texCoordMatrix` - The matrix used to transform the `vertexTexCoord` attribute. Specified using
* loadTextureMatrix:.
*
* `float opacity` - The opacity used to modulate the RGBA components of the sampled texture color. Specified using
* loadOpacity:.
*
* `sampler2D tileTexture` - The texture unit the texture is bound to (GL_TEXTURE0, GL_TEXTURE1, GL_TEXTURE2, etc.).
* Specified using loadTextureUnit:.
*/
@interface WWSurfaceTileRendererProgram : WWGpuProgram
{
@protected
    GLuint vertexPointLocation;
    GLuint vertexTexCoordLocation;
    GLuint mvpMatrixLocation;
    GLuint tileCoordMatrixLocation;
    GLuint textureUnitLocation;
    GLuint textureMatrixLocation;
    GLuint opacityLocation;
}

/// @name GPU Program Attributes

/**
* Returns a unique string appropriate for identifying a shared instance of WWSurfaceTileRendererProgram in a
* WWGpuResourceCache.
*
* @return A unique string identifier for WWSurfaceTileRendererProgram.
*/
+ (NSString*) programKey;

/// @name Initializing GPU Programs

/**
* Initializes, compiles and links this GLSL program with the source code for its vertex and fragment shaders.
*
* An OpenGL context must be current when this method is called.
*
* This method creates OpenGL shaders for the program's shader sources and attaches them to a new GLSL program. This
* method then compiles the shaders and links the program if compilation is successful. Use the bind method to make the
* program current during rendering.
*
* @return This GLSL program linked with its shaders.
*
* @exception NSInvalidArgumentException If the shaders cannot be compiled, or linking of the compiled shaders into a
* program fails.
*/
- (WWSurfaceTileRendererProgram*) init;

/// @name Accessing Vertex Attributes

/**
 * Indicates the OpenGL location index for this program's `vertexPoint` vertex attribute.
 *
 * The returned value is suitable for use as the index argument in glVertexAttribPointer.
 *
 * @return The location index for this program's `vertexPoint` vertex attribute.
 */
- (GLuint) vertexPointLocation;

/**
 * Indicates the OpenGL location index for this program's `vertexTexCoord` vertex attribute.
 *
 * The returned value is suitable for use as the index argument in glVertexAttribPointer.
 *
 * @return The location index for this program's `vertexTexCoord` vertex attribute.
 */
- (GLuint) vertexTexCoordLocation;

/// @name Accessing Uniform Variables

/**
* Loads the specified matrix as the value of this program's `mvpMatrix` uniform variable.
*
* An OpenGL context must be current when this method is called, and this program must be bound. The result of this
* method is undefined if there is no current OpenGL context or if this program is not bound.
*
* @param matrix The matrix to set the uniform variable to.
*
* @exception NSInvalidArgumentException If the matrix is nil.
*/
- (void) loadModelviewProjection:(WWMatrix*)matrix;

/**
* Loads the specified matrix as the value of this program's `tileCoordMatrix` uniform variable.
*
* An OpenGL context must be current when this method is called, and this program must be bound. The result of this
* method is undefined if there is no current OpenGL context or if this program is not bound.
*
* @param matrix The matrix to set the uniform variable to.
*
* @exception NSInvalidArgumentException If the matrix is nil.
*/
- (void) loadTileCoordMatrix:(WWMatrix*)matrix;

/**
* Loads the specified OpenGL texture unit enumeration as the value of this program's `tileTexture` uniform variable.
*
* An OpenGL context must be current when this method is called, and this program must be bound. The result of this
* method is undefined if there is no current OpenGL context or if this program is not bound.
*
* The specified unit must be one of the GL_TEXTUREi OpenGL enumerations, where i ranges from 0 to
* (GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS - 1). The value is converted from an enumeration to a GLSL texture unit index
* prior to loading the unit in the GLSL uniform variable.
*
* @param unit The OpenGL texture unit to sample. Must be one of GL_TEXTUREi, where i ranges from 0 to
* (GL_MAX_COMBINED_TEXTURE_IMAGE_UNITS - 1)
*/
- (void) loadTextureUnit:(GLenum)unit;

/**
* Loads the specified matrix as the value of this program's `texCoordMatrix` uniform variable.
*
* An OpenGL context must be current when this method is called, and this program must be bound. The result of this
* method is undefined if there is no current OpenGL context or if this program is not bound.
*
* @param matrix The matrix to set the uniform variable to.
*
* @exception NSInvalidArgumentException If the matrix is nil.
*/
- (void) loadTextureMatrix:(WWMatrix*)matrix;

/**
* Loads the specified GLfloat as the value of this program's `opacity` uniform variable.
*
* An OpenGL context must be current when this method is called, and this program must be bound. The result of this
* method is undefined if there is no current OpenGL context or if this program is not bound.
*
* @param opacity The floating point value to set the uniform variable to, in the range [0,1].
*/
- (void) loadOpacity:(GLfloat)opacity;

@end