/**
 * Created by Matthew on 7/27/2015.
 */

define(function(){

    var Hud = function (id) {
        this.Universe = $('<div>');
        this.Universe.attr('background-color','000000');
        this.Universe.attr('id','.' + id + 'HUD')
    };

    return Hud
});