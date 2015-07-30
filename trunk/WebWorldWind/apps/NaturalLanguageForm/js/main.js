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

requirejs(['jquery', 'nlform', 'nlbuilder', 'HUDMaker', 'OverlayButton', 'OpenStreetMapApp'],
    function($, NaturalLanguageCanvas, NLBuilder, HUDMaker, OverlayButton, OpenStreetMapApp) {
        console.log('setting up');
        console.log($('#amenityField'));
        /*
        * Create the html, css, and js for the wind icon in the bottom left. This will act as a menu for the canvas.
         */
        var jQueryDoc = $(window.document);
        var menubutton = new OverlayButton('windIconMenu','img/windGear.svg',[70, jQueryDoc.height()-40-42], '.content');

        /*
        * Add the function that is called when the wind icon is clicked.
         */

        var nLForm1 = new NLBuilder('Form1');
        nLForm1.addBasicText('I\'m looking for ');
        nLForm1.addField('amenityField', 'amenity', "For example: <em>cafe</em>");
        nLForm1.addBasicText(' near ');
        nLForm1.addField('addressField', 'address', "For example: <em>Mountain View</em>");
        nLForm1.setApplication(OpenStreetMapApp);


        var nLForm2 = new NLBuilder('Form2');
        nLForm2.addBasicText('I\'m looking for ');
        nLForm2.addField('amenityField', 'amenity', "For example: <em>cafe</em>");
        nLForm2.addBasicText(' near ');
        nLForm2.addField('addressField', 'address', "For example: <em>Mountain View</em>");
        nLForm2.setApplication(OpenStreetMapApp);


        var naturalLanguageCanvas = new NaturalLanguageCanvas( window , [nLForm2]);
        naturalLanguageCanvas.setClosingAction(function () {
            var buttonY = jQueryDoc.height() * .3;
            var buttonX = jQueryDoc.width() * .05;
            var returnButton = new OverlayButton('returnToCanvas','img/windGear.svg',[buttonX, buttonY]);
            returnButton.addClickEvent(function(o){
                var windIcon = $(o.target).parent();
                var INDEX = 0;
                $('#landingScreen').fadeIn(400);
                windIcon.fadeOut(400);
                var loadTimeAnimator = window.setInterval(function () {
                    if (INDEX < 20){
                        INDEX += 1;
                    } else {
                        clearInterval(loadTimeAnimator);
                        windIcon.remove()
                    }
                    windIcon.css('left', buttonX + 6*INDEX);

                },20);

            })
        });


        menubutton.addClickEvent(function(o){
            // Get the div in which the element is located
            var menuIcon = $(o.target).parent();

            var INDEX = 0;
            var clickedLoc =[o.x, o.y];
            // Animates the fadeOut
            var clickAwayAnimationTimer = window.setInterval(function () {
                if (INDEX < 20){
                    INDEX += 1
                }
                menuIcon.css('left', 70 + (INDEX*6));
                //console.log(INDEX*6)
            }, 10);

            // Creates a menu when the fadeout is complete.
            menuIcon.fadeOut(190, function () {
                clearInterval(clickAwayAnimationTimer);

                // Creates the menu
                var menuDisplay = new HUDMaker('LayerMenu', [0,0], '.content');
                menuDisplay.assembleDisplay('', 'New OSM Query', function (e) {
                    naturalLanguageCanvas.addForm(nLForm1)
                });
                // Creates the function that restores the original icon when the menu is closed.
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
        });


        //new (naturalLanguageCanvas.NLForm(document.getElementById( 'nl-form' )))
});


