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

requirejs(['jquery', 'nlform', 'nlbuilder', 'HUDMaker', 'OverlayButton'],
    function($, NaturalLanguageCanvas, NLBuilder, HUDMaker, OverlayButton) {
        console.log('setting up');
        console.log($('#amenityField'));
        //var menuIcon = $('#apDiv4');
        //menuIcon.on('click', function(o){
        //
        //    var INDEX = 0;
        //    var clickedLoc =[o.x, o.y];
        //    var clickAwayAnimationTimer = window.setInterval(function () {
        //        if (INDEX < 20){
        //            INDEX += 1
        //        }
        //        menuIcon.css('left', 70 + (INDEX*6));
        //        console.log(INDEX*6)
        //    }, 10);
        //    menuIcon.fadeOut(190, function () {
        //        clearInterval(clickAwayAnimationTimer);
        //        var menuDisplay = new HUDMaker('LayerMenu', clickedLoc, '.content');
        //
        //        menuDisplay.addCloseEvent(function(event){
        //
        //            var clickInAnimationTimer = window.setInterval(function () {
        //                if (INDEX < 20){
        //                    INDEX += 1
        //                }
        //                console.log(menuIcon.css('left'));
        //                menuIcon.css('left', 70)
        //            }, 10);
        //
        //            menuIcon.fadeIn(190, function () {
        //                clearInterval(clickInAnimationTimer)
        //            })
        //
        //
        //        })
        //    })
        //})

        var jQueryDoc = $(window.document);
        console
        var menubutton = new OverlayButton('windIconMenu','img/windGear.svg',[70, jQueryDoc.height()-40-42], '.content');
        menubutton.addClickEvent(function(o){
            var menuIcon = $(o.target).parent();

            var INDEX = 0;
                var clickedLoc =[o.x, o.y];
                var clickAwayAnimationTimer = window.setInterval(function () {
                    if (INDEX < 20){
                        INDEX += 1
                    }
                    menuIcon.css('left', 70 + (INDEX*6));
                    console.log(INDEX*6)
                }, 10);
                menuIcon.fadeOut(190, function () {
                    clearInterval(clickAwayAnimationTimer);
                    var menuDisplay = new HUDMaker('LayerMenu', clickedLoc, '.content');

                    menuDisplay.addCloseEvent(function(event){

                        var clickInAnimationTimer = window.setInterval(function () {
                            if (INDEX < 20){
                                INDEX += 1
                            }
                            menuIcon.css('left', 70)
                        }, 10);

                        menuIcon.fadeIn(190, function () {
                            clearInterval(clickInAnimationTimer)
                        })


                    })
                })
        })
        var nLBuilder = new NLBuilder($(' #nl-form' ));
        nLBuilder.addBasicText('I\'m looking for ');
        nLBuilder.addField('amenityField', 'amenity', "For example: <em>cafe</em>");
        nLBuilder.addBasicText(' near ');
        nLBuilder.addField('addressField', 'address', "For example: <em>Mountain View</em>");

        NaturalLanguageCanvas( window );
        new NLForm(document.getElementById( 'nl-form' ));
});


