/*
 * Copyright (C) 2014 United States Government as represented by the Administrator of the
 * National Aeronautics and Space Administration. All Rights Reserved.
 */
/**
 * @version $Id$
 */
module.exports = function (grunt) {
    grunt.initConfig({
        jsdoc: {
            dist: {
                src: ['src'],
                options: {
                    destination: 'api-doc',
                    readme: 'README.md',
                    recurse: true
                }
            }
        },

        requirejs: {
            compile: {
                options: {
                    baseUrl: 'src',
                    name: '../tools/almond',
                    include: ['WorldWind'],
                    out: 'worldwindlib.js',
                    wrap: {
                        startFile: 'tools/wrap.start',
                        endFile: 'tools/wrap.end'
                    }
                }
            }
        },

        compress: {
            main: {
                options: {
                    archive: 'WebWorldWind.zip'
                },
                files: [
                    {src: [
                        'api-doc/**',
                        'worldwindlib.js',
                        'apps/**',
                        'design-notes/**',
                        'examples/**',
                        'images/**',
                        'performance/**',
                        'src/**',
                        'test/**',
                        'thirdparty/**',
                        'tools/**',
                        'build.js',
                        'Gruntfile.js',
                        'HowToCreateAndRunUnitTests.txt',
                        'jsTestDriver.conf',
                        'package.json',
                        'GruntSetup.txt',
                        'WebWorldWindDesignAndCodingGuidelines.html'
                    ]}
                ]
            }
        }

    });

    grunt.loadNpmTasks('grunt-contrib-requirejs');
    grunt.loadNpmTasks('grunt-jsdoc');
    grunt.loadNpmTasks('grunt-contrib-compress');

    grunt.registerTask('default', ['jsdoc', 'requirejs', 'compress']);
};