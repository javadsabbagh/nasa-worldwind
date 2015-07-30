/**
 * nlform.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2013, Codrops
 * http://www.codrops.com
 */
/*
* Modified for our purposes by Ritesh Mishra, Matt Evers.
*
*/
/*
* @dependency: This module requires an NLform in the html under <form id="nl-form" class="nl-form">
*     			Use the nlbuilder to create this form dynamically.
* @dependency: This module requires a 'background' in the html under <body class="nl-blurred">
*
* @param window: the document's window.
* @param arrayofforms: an array of natural language forms created in the format returned by the nlbuilder.
 */

define(['OpenStreetMapApp', 'WorldWindBase'],
	function (OpenStreetMapApp, WorldWindBase){
		'use strict';
		function NaturalLanguageCanvas ( window , arrayofforms) {
			this.document = window.document;
			this.jQueryDoc = $(window.document);
			this.forms = [];

			if (!String.prototype.trim) {
				String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
			}

			this.buildForms(arrayofforms)

		}

		NaturalLanguageCanvas.prototype.buildForms = function (arrayofforms) {
			var self = this;
			console.log(arrayofforms);
			arrayofforms.forEach(function(form){
				var htmlForm = form.getForm();
				$('.main-clearfix').append(htmlForm);
				var canvasForm = new (self.NLForm()) ( self.document.getElementById(htmlForm.attr('id')) );
				canvasForm._setApplicationToOpen(form.application);
				self.forms.push(canvasForm)
			})

		};

		NaturalLanguageCanvas.prototype._loadPageIfAllFormsFilled = function () {
			var allFormsFilled = true;
			this.forms.forEach(function (form) {

				if (!form.hasAllFields){
					allFormsFilled = false
				}

			});

			if (allFormsFilled){
				this._loadPage()
			}
		};

		NaturalLanguageCanvas.prototype._loadPage = function () {
			var self = this
			/*
			 * Initialize the loading sequence of events.
			 * The pin icon follows the path of a x^6 function. To make it steeper or less so,
			 * raise/lower the power.
			 */
			var loadingScreen = function(){
				var x = 0, y = 0, m = (self.jQueryDoc.height()/2 - 75)/Math.pow((self.jQueryDoc.width()/2 - 90),6);
				var INDEX = 0,
					steps = 100,
					loadIcon = $('#apDiv2'),
					loadSymbol = $('#apDiv3');
				var loadTimeAnimator = window.setInterval(function () {
					loadIcon.remove();
					if (INDEX < steps){
						INDEX += 1;
					} else {
						loadSymbol.fadeOut(4000, function(){
							$('#landingScreen').fadeOut(400)//.remove();
							//$('body').removeClass('nl-blurred');
							//if (window.NLForm){
							//	delete window.NLForm
							//}
							loadSymbol.css('right', 78);
							loadSymbol.css('bottom',  22);
						})
					}
					x = ((self.jQueryDoc.width()/2 - 78)/steps)*INDEX;
					y = m*Math.pow(x,6);
					loadSymbol.css('right', x + 78);
					loadSymbol.css('bottom',  y + 22);
				},20);
			}();

		};

		NaturalLanguageCanvas.prototype.NLForm = function () {
			var self = this;
			function nlform( el ) {
				var form = this;
				this.canvas = self;
				this.document = $(document);
				this.el = el;
				console.log(this.el);
				this.backDrop = document.querySelector( '.nl-blurred' );
				this.fields = [];
				this.fldOpen = -1;
				this.hasAllFields = false;
				this._init();
			}

			nlform.prototype = {
				_init : function() {
					var form = this;
					Array.prototype.slice.call( form.el.querySelectorAll( 'select' ) ).forEach( function( el, i ) {
						form.fields.push( new (self.NLField())( form, el, 'dropdown', i ) );
					} );
					Array.prototype.slice.call( form.el.querySelectorAll( 'input' ) ).forEach( function( el, i ) {
						form.fields.push( new (self.NLField())( form, el, 'input', i ) );
					} );
					//Close the boxes if the user clicks elsewhere
					this.backDrop.addEventListener( 'click', function(ev) { ev.preventDefault(); ev.stopPropagation(); form.closeAllFields(); } );
					this.backDrop.addEventListener( 'touchstart', function(ev) { ev.preventDefault(); ev.stopPropagation(); form.closeAllFields(); } );
				},
				_loadLayer : function() {

					var form = this;
					/*
					 * Start the World Wind window in the background so that it can load the tiles.
					 */
					//console.log(OpenStreetMapApp)
					var loadInBackground = function(){
						var amenity = $('#amenityField').val().trim();
						var address = $('#addressField').val().trim();

						//console.log('amenity ', amenity);
						//console.log('address ', address );
						if (!window.worldWindow) {
							window.worldWindow = new WorldWindBase( window )
						}
						new form.application(window.worldWindow, amenity, address);
					}();

					//Remove the natural language line because the user is done with it.
					this.el.remove();
					this.canvas._loadPageIfAllFormsFilled();
				},
				_setApplicationToOpen: function(application) {
					this.application = application;
				},
				/*
				 * Loops through all the fields and checks if they have an entry. If at least one does not have
				 * an entry, return false, else true.
				 *
				 * @ return: False if <aboveCondition> else True
				 */
				_areAllFieldsFilled : function() {
					var self = this;
					self.hasAllFields = true;
					self.fields.forEach(function(field){
						if (!field.hasUserEntry){
							self.hasAllFields = false;
						}
					});
					return self.hasAllFields
				},
				_openNextField : function () {
					var self = this;
					if (self.fldOpen+1 < self.fields.length) {
						self.fields[self.fldOpen+1]._open()
					}

				},
				/*
				 * Loops through each field and closes them.
				 */
				closeAllFields : function () {
					var self = this;
					self.fields.forEach(function(field){
						field.close()
					});
					self.fldOpen = -1;
				},
				runWorldWindIfAllEntriesFilled : function () {
					if (this._areAllFieldsFilled()){
						this._loadLayer();
					}
				}
			};

			return nlform
		};

		NaturalLanguageCanvas.prototype.NLField = function( ) {
			var self = this
			function nlfield( form, el, type, idx ) {
				var field = this;
				this.canvas = self
				this.form = form;
				this.elOriginal = el;
				this.pos = idx;
				this.type = type;
				this._create();
				this._initEvents();
			}

			nlfield.prototype = {
				_create : function() {
					if( this.type === 'dropdown' ) {
						this._createDropDown();
					}
					else if( this.type === 'input' ) {
						this._createInput();
					}
				},
				_createDropDown : function() {
					var field = this;
					this.hasUserEntry = false;
					this.fld = document.createElement( 'div' );
					this.fld.className = 'nl-field nl-dd';
					this.toggle = document.createElement( 'a' );
					this.toggle.innerHTML = this.elOriginal.options[ this.elOriginal.selectedIndex ].innerHTML;
					this.toggle.className = 'nl-field-toggle';
					this.optionsList = document.createElement( 'ul' );
					var ihtml = '';
					Array.prototype.slice.call( this.elOriginal.querySelectorAll( 'option' ) ).forEach( function( el, i ) {
						ihtml += self.elOriginal.selectedIndex === i ? '<li class="nl-dd-checked">' + el.innerHTML + '</li>' : '<li>' + el.innerHTML + '</li>';
						// selected index value
						if( field.elOriginal.selectedIndex === i ) {
							field.selectedIdx = i;
						}
					} );
					this.optionsList.innerHTML = ihtml;
					this.fld.appendChild( this.toggle );
					this.fld.appendChild( this.optionsList );
					this.elOriginal.parentNode.insertBefore( this.fld, this.elOriginal );
					this.elOriginal.style.display = 'none';
				},
				_createInput : function() {
					var field = this;
					this.hasUserEntry = false;
					this.fld = document.createElement( 'div' );
					this.fld.className = 'nl-field nl-ti-text';
					this.toggle = document.createElement( 'a' );
					this.toggle.innerHTML = this.elOriginal.getAttribute( 'placeholder' );
					this.toggle.className = 'nl-field-toggle';
					this.optionsList = document.createElement( 'ul' );
					this.getinput = document.createElement( 'input' );
					this.getinput.setAttribute( 'type', 'text' );
					this.getinput.setAttribute( 'placeholder', this.elOriginal.getAttribute( 'placeholder' ) );
					this.getinputWrapper = document.createElement( 'li' );
					this.getinputWrapper.className = 'nl-ti-input';
					this.inputsubmit = document.createElement( 'button' );
					this.inputsubmit.className = 'nl-field-go';
					this.inputsubmit.innerHTML = 'Go';
					this.getinputWrapper.appendChild( this.getinput );
					this.getinputWrapper.appendChild( this.inputsubmit );
					this.example = document.createElement( 'li' );
					this.example.className = 'nl-ti-example';
					this.example.innerHTML = this.elOriginal.getAttribute( 'data-subline' );
					this.optionsList.appendChild( this.getinputWrapper );
					this.optionsList.appendChild( this.example );
					this.fld.appendChild( this.toggle );
					this.fld.appendChild( this.optionsList );
					//console.log(this.elOriginal);
					//console.log(this.elOriginal.parentNode);
					this.elOriginal.parentNode.insertBefore( this.fld, this.elOriginal );
					this.elOriginal.style.display = 'none';
					//Values used later...
					//this.toggle
					//this.getinput
					//this.inputsubmit
					//this.fld
				},
				_initEvents : function() {
					var field = this;
					this.toggle.addEventListener( 'click', function( ev ) { ev.preventDefault(); ev.stopPropagation(); field._open(); } );
					this.toggle.addEventListener( 'touchstart', function( ev ) { ev.preventDefault(); ev.stopPropagation(); field._open(); } );

					if( this.type === 'dropdown' ) {
						var opts = Array.prototype.slice.call( this.optionsList.querySelectorAll( 'li' ) );
						opts.forEach( function( el, i ) {
							el.addEventListener( 'click', function( ev ) { ev.preventDefault(); ev.stopPropagation(); field.close( el, opts.indexOf( el ) ); } );
							el.addEventListener( 'touchstart', function( ev ) { ev.preventDefault(); ev.stopPropagation(); field.close( el, opts.indexOf( el ) ); } );
						} );
					}
					else if( this.type === 'input' ) {
						this.getinput.addEventListener( 'keydown', function( ev ) {
							if ( ev.keyCode == 13 ) {
								field.close();
							}
						} );
						this.inputsubmit.addEventListener( 'click', function( ev ) { ev.preventDefault(); ev.stopPropagation(); field.close();} );
						this.inputsubmit.addEventListener( 'touchstart', function( ev ) { ev.preventDefault(); ev.stopPropagation(); field.close(); } );
					}

				},
				_open : function() {
					this.form.closeAllFields();
					if( this.open ) {
						return false;
					}
					this.open = true;
					this.form.fldOpen = this.pos;

					//The addition of this tag causes the box to open. The input elements are created at this time.
					this.fld.className += ' nl-field-open';

					//Automaticall focuses on the input box once it is created.
					this.getinput.focus()
				},
				close : function( opt, idx ) {
					var field = this;
					if( !this.open ) {
						return false;
					}
					this.open = false;
					this.fld.className = this.fld.className.replace(/\b nl-field-open\b/,'');

					if( this.type === 'dropdown' ) {
						if( opt ) {
							// remove class nl-dd-checked from previous option
							var selectedopt = this.optionsList.children[ this.selectedIdx ];
							selectedopt.className = '';
							opt.className = 'nl-dd-checked';
							this.toggle.innerHTML = opt.innerHTML;
							// update selected index value
							this.selectedIdx = idx;
							// update original select element´s value
							this.elOriginal.value = this.elOriginal.children[ this.selectedIdx ].value;
						}
					}
					else if( this.type === 'input' ) {
						this.getinput.blur();
						if (this.getinput.value.trim() !== ''){
							field.hasUserEntry = true;
							field.toggle.innerHTML = field.getinput.value;
						} else {
							field.hasUserEntry = false;
							field.toggle.innerHTML = field.getinput.getAttribute( 'placeholder' )
						}
						this.elOriginal.value = this.getinput.value;
					}
					//Opens the next Field.
					if (this.hasUserEntry){
						this.form._openNextField();
					}

					//Runs world wind if all fields are filled.
					this.form.runWorldWindIfAllEntriesFilled();
				}
			};

			return nlfield
		};


		return NaturalLanguageCanvas
	});
