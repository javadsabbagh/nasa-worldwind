

requirejs.config({
    paths: {
        "worldwind" : "http://worldwindserver.net/webworldwind/worldwindlib.js",
        "jquery" : "http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
        "OpenStreetMapApp" : "OpenStreetMapApp"
    }
});

requirejs(['jquery', "OpenStreetMapApp"], function($, OpenStreetMapApp) {
    console.log('setting up');
    console.log($('#amenityField'));
    $(document).keypress(function(e) {
       if(e.which == 13) {
           //alert('you hit enter');
           var amenity = $('#amenityField').val();
           var address = $('#addressField').val();
           $('#landingScreen').remove();
           $('body').removeClass('nl-blurred');
           $('body').append('<canvas id="globe"></canvas>')
           console.log('amenity ', amenity);
           console.log('address ', address );
           new OpenStreetMapApp(amenity, address);
       }
    });


});


