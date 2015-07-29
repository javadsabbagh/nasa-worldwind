/**
 * Created by Matthew on 7/29/2015.
 */


define(function(){

    var OverlayButton = function (id, image,screenLoc, selectorToAppendTo) {
        var self = this;
        this.ParentNode = (selectorToAppendTo) ? $(selectorToAppendTo) : $('body');
        this.ID = id;
        this.image = image;
        console.log(this.ParentNode);
        this.StyleSheet =
            $("<style>")
                .prop("type", "text/css")
                .html("\ ." + id + " {\
                       	position: fixed;\
                        width: 50px;\
                        height: 50px;\
                        left:" + screenLoc[0] + "px;\
                        top:" + screenLoc[1] + "px;\
                    }"
            );

        this.StyleSheet.appendTo("head");

        this.buildDiv();
        //this.assembleDisplay();

        return this
    };

    OverlayButton.prototype.buildDiv = function () {
        var self = this;
        this.DIV = $('<div>');
        this.DIV.attr('class',this.ID);
        //this.DIV.css('background-color','white');
        this.HTMLImage = $('<img>');
        this.HTMLImage.attr('src',this.image);
        this.HTMLImage.attr('width','64');
        this.HTMLImage.attr('height','42');
        this.HTMLImage.attr('alt',this.image);
        this.HTMLImage.attr('longdesc',this.image);
        //this.HTMLImage.on('click', function (ev) {
        //    self.DIV.remove();
        //    self.StyleSheet.remove();
        //});

        this.DIV.append(this.HTMLImage);
        this.ParentNode.append(this.DIV)

    };

    OverlayButton.prototype.destroySelf = function () {
        var self = this;
        self.DIV.remove();
        self.StyleSheet.remove();
    };


    OverlayButton.prototype.addClickEvent = function (callback) {
        this.HTMLImage.on('click', callback)
    };


    return OverlayButton
});