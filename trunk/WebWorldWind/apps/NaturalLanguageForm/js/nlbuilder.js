/*
 * Author: Matt Evers
 */
//Needs a form with id='nl-form' in html
define(
    function(){

        function NLBuilder ( el ) {
            this.el = el
        }

        NLBuilder.prototype.addBasicText = function (text) {
            this.el.append(text)
        };
        /*
        @param ex: the word that appears on click and as default
        @param forex: subline string e.g. "For example: <em>cafe</em> or <em>Fad</em>"
         */
        NLBuilder.prototype.addField = function (id, placeholder, forex) {
            var field = $('<input>');
                //<input id="amenityField" type="text" value="" placeholder="amenity" data-subline="For example: <em>cafe</em>">
            field.attr('id', id);
            field.attr('type', 'text');
            field.attr('value', '');
            field.attr('placeholder', placeholder);
            field.attr('data-subline', forex);
            this.el.append(field)
        };

        return NLBuilder
    }
);