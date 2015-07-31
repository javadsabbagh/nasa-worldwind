/*
 * Author: Inzamam Rahaman, Matt Evers
 */

requirejs.config({
    paths: {
        "worldwind" : "http://worldwindserver.net/webworldwind/worldwindlib.js",
        "jquery" : "http://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min",
        "buckets" : "https://cdn.rawgit.com/mauriciosantos/Buckets-JS/master/buckets.min",
        "Cylinder" : "../../Earthquakes/src/scripts/Cylinder"
    }
});

requirejs(['Canvas'
  ],
    function(Canvas) {
        new Canvas()

});


