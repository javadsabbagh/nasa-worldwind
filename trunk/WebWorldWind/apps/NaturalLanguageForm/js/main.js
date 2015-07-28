/*
 * Author: Inzamam Rahaman, Matt Evers
 */

requirejs.config({
    paths: {
        "worldwind" : "http://worldwindserver.net/webworldwind/worldwindlib.js",
        "jquery" : "http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
        "buckets" : "https://cdn.rawgit.com/mauriciosantos/Buckets-JS/master/buckets.min"
    }
});

requirejs(['jquery', 'nlform', 'nlbuilder'], function($, NaturalLanguageCanvas, NLBuilder) {
    console.log('setting up');
    console.log($('#amenityField'));
    var nLBuilder = new NLBuilder($(' #nl-form' ));
    nLBuilder.addBasicText('I\'m looking for ');
    nLBuilder.addField('amenityField', 'amenity', "For example: <em>cafe</em>");
    nLBuilder.addBasicText(' near ');
    nLBuilder.addField('addressField', 'address', "For example: <em>Mountain View</em>");

    NaturalLanguageCanvas( window );
    new NLForm(document.getElementById( 'nl-form' ));
});


