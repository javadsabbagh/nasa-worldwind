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
 */

define(['OpenStreetMapApp'],
	function (OpenStreetMapApp){
		'use strict';
		function NaturalLanguageCanvas ( window ) {
			var document = window.document;

			if (!String.prototype.trim) {
				String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
			}

			function NLForm( el ) {
				var self = this;
				this.document = $(document);
				this.el = el;
				this.backDrop = document.querySelector( '.nl-blurred' );
				this.fields = [];
				this.fldOpen = -1;
				this.hasAllFields = false;
				this._init();
			}

			NLForm.prototype = {
				_init : function() {
					var self = this;
					Array.prototype.slice.call( this.el.querySelectorAll( 'select' ) ).forEach( function( el, i ) {
						self.fields.push( new NLField( self, el, 'dropdown', i ) );
					} );
					Array.prototype.slice.call( this.el.querySelectorAll( 'input' ) ).forEach( function( el, i ) {
						self.fields.push( new NLField( self, el, 'input', i ) );
					} );
					//Close the boxes if the user clicks elsewhere
					this.backDrop.addEventListener( 'click', function(ev) { ev.preventDefault(); ev.stopPropagation(); self.closeAllFields(); } );
					this.backDrop.addEventListener( 'touchstart', function(ev) { ev.preventDefault(); ev.stopPropagation(); self.closeAllFields(); } );
				},
				_loadPage : function() {

					var self = this;
					/*
					* Start the World Wind window in the background so that it can load the tiles.
					*/
					console.log(OpenStreetMapApp)
					var loadInBackground = function(){
						var amenity = $('#amenityField').val().trim();
						var address = $('#addressField').val().trim();
						var newBody = $('<canvas>');
						newBody.attr('id', 'globe');
						$('body').append(newBody);
						console.log('amenity ', amenity);
						console.log('address ', address );
						new OpenStreetMapApp(amenity, address);
					}();

					//Remove the natural language line because the user is done with it.
					this.el.remove();

					/*
					* Initialize the loading sequence of events.
					* The pin icon follows the path of a x^6 function. To make it steeper or less so,
					* raise/lower the power.
					*/
					var loadingScreen = function(){
						var x = 0, y = 0, m = (self.document.height()/2 - 75)/Math.pow((self.document.width()/2 - 90),6);
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
									$('#landingScreen').remove();
									$('body').removeClass('nl-blurred');
									if (window.NLForm){
										delete window.NLForm
									}
								})
							}
							x = ((self.document.width()/2 - 78)/steps)*INDEX;
							y = m*Math.pow(x,6);
							loadSymbol.css('right', x + 78);
							loadSymbol.css('bottom',  y + 22);
						},20);
					}();

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
						this._loadPage();
					}
				}
			};

			function NLField( form, el, type, idx ) {
				var self = this;
				this.form = form;
				this.elOriginal = el;
				this.pos = idx;
				this.type = type;
				this._create();
				this._initEvents();
			}

			NLField.prototype = {
				_create : function() {
					if( this.type === 'dropdown' ) {
						this._createDropDown();
					}
					else if( this.type === 'input' ) {
						this._createInput();
					}
				},
				_createDropDown : function() {
					var self = this;
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
						if( self.elOriginal.selectedIndex === i ) {
							self.selectedIdx = i;
						}
					} );
					this.optionsList.innerHTML = ihtml;
					this.fld.appendChild( this.toggle );
					this.fld.appendChild( this.optionsList );
					this.elOriginal.parentNode.insertBefore( this.fld, this.elOriginal );
					this.elOriginal.style.display = 'none';
				},
				_createInput : function() {
					var self = this;
					this.hasUserEntry = false;
					////////////////////////////////////
					// JQUERY isn't worth it here.
					//this.toggle = $( '<a>' );
					//this.toggle.append( this.elOriginal.getAttribute( 'placeholder' ) );
					//this.toggle.attr('class', 'nl-field-toggle');
                    //
					//this.getinput = $('<input>');
					//this.getinput.attr('type', 'text');
					//this.getinput.attr('placeholder', this.elOriginal.getAttribute( 'placeholder' ));
                    //
					//this.getinputWrapper = $('<li>');
					//this.getinputWrapper.attr('class', 'nl-ti-input');
                    //
					//this.inputsubmit = $('<button>'); //document.createElement( 'button' );
					//this.inputsubmit.attr('class', 'nl-field-go');
					//this.inputsubmit.append('Go');
                    //
					//this.getinputWrapper.append(this.getinput);
					//this.getinputWrapper.append(this.inputsubmit);
                    //
					//this.example = $('<li>');
					//this.example.attr('class', 'nl-ti-example');
					//this.example.append( this.elOriginal.getAttribute( 'data-subline' ) );
                    //
					//this.optionsList = $('<ul>');
					//this.optionsList.append( this.getinputWrapper );
					//this.optionsList.append( this.example );
                    //
					//this.fld = $('<div>');
					//this.fld.attr('class', 'nl-field nl-ti-text');
					//this.fld.append( this.toggle );
					//this.fld.append( this.optionsList);
                    //
					//this.elOriginal.attr('style', 'display: none;')
					//this.elOriginal.parent().insertBefore( this.fld, this.elOriginal );
					//console.log(this.elOriginal)
					//this.elOriginal.parentNode.insertBefore( this.fld, this.elOriginal );
					//this.elOriginal.style.display = 'none';
					////////////////////////////////////////////////////////////////////////////
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
					var self = this;
					this.toggle.addEventListener( 'click', function( ev ) { ev.preventDefault(); ev.stopPropagation(); self._open(); } );
					this.toggle.addEventListener( 'touchstart', function( ev ) { ev.preventDefault(); ev.stopPropagation(); self._open(); } );

					if( this.type === 'dropdown' ) {
						var opts = Array.prototype.slice.call( this.optionsList.querySelectorAll( 'li' ) );
						opts.forEach( function( el, i ) {
							el.addEventListener( 'click', function( ev ) { ev.preventDefault(); ev.stopPropagation(); self.close( el, opts.indexOf( el ) ); } );
							el.addEventListener( 'touchstart', function( ev ) { ev.preventDefault(); ev.stopPropagation(); self.close( el, opts.indexOf( el ) ); } );
						} );
					}
					else if( this.type === 'input' ) {
						this.getinput.addEventListener( 'keydown', function( ev ) {
							if ( ev.keyCode == 13 ) {
								self.close();
							}
						} );
						this.inputsubmit.addEventListener( 'click', function( ev ) { ev.preventDefault(); ev.stopPropagation(); self.close();} );
						this.inputsubmit.addEventListener( 'touchstart', function( ev ) { ev.preventDefault(); ev.stopPropagation(); self.close(); } );
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
					var self = this;
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
							self.hasUserEntry = true;
							self.toggle.innerHTML = self.getinput.value;
						} else {
							self.hasUserEntry = false;
							self.toggle.innerHTML = self.getinput.getAttribute( 'placeholder' )
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

			// add to global namespace
			console.log('load to global')
			window.NLForm = NLForm;
		}

		return NaturalLanguageCanvas
	});
