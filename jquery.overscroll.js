/**
 * @license Overscroll v1.3.5
 *  A jQuery Plugin that emulates the iPhone scrolling experience in a browser.
 *  http://azoffdesign.com/overscroll
 *
 * Intended for use with the latest jQuery
 *  http://code.jquery.com/jquery-latest.min.js
 *
 * Copyright 2010, Jonathan Azoff
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *  http://jquery.org/license
 *
 * Date: Thursday, August 26th 2010
 */

/* 
 * Usage:
 * 
 * $(selector).overscroll([options]);
 *  "options" is an optional JavaScript object that you may pass if you would like to customize
 *  the experience of the overscroll element. Below is a list of properties that you may set on
 *  the options object and their respective effect:
 *
 *   - options.showThumbs       {Boolean}   Designates whether or not to show the scroll-bar thumbs
 *                                          on the scrollable container (default true).
 *   - options.openedCursor     {String}    A url pointing at a .cur file to be used as the cursor when
 *                                          hovering over the overscrolled element (default 'opened.cur').
 *   - options.closedCursor     {String}    A url pointing at a .cur file to be used as the cursor when
 *                                          dragging the overscrolled element (default 'closed.cur').
 *   - options.direction        {String}    The scroll direction of the overscrolled element, by default it will
 *                                          auto-detect the available directions. You can also restrict
 *                                          direction by setting this property equal to 'vertical' or  
 *                                          'horizontal'
 *   - options.wheelDirection   {String}    The direction scrolled when the mouse wheel is triggered. Options are
 *                                          'horizontal' for left/right scrolling and 'vertical' as default.
 *   - options.wheelDelta       {Number}    The amount of drift to apply per mouse wheel 'tick', defauts to 20
 *   - options.scrollDelta      {Number}    The amount of drift to apply per drag interval, defauts to 5.7
 *   - options.onDriftEnd       {Function}  A function to be called at the end of every drift, default $.noop
 *
 * Notes:
 * 
 * In order to get the most out of this plugin, make sure to only apply it to parent elements 
 * that are smaller than the collective width and/or height then their children. This way,
 * you can see the actual scroll effect as you pan the element.
 *
 * While you can programatically control whether or not overscroll allows horizontal and/or
 * vertical scroll, it is best practice to size the child elements accordingly (via CSS) and
 * not depend on programatic restrictions.
 *
 * As of 1.3.1, if you would like to add click handlers to links inside of overscroll, you can 
 * dynamially check the state of the overscrolled element via the jQuery.data method. This ability
 * should allow you to exit a click handler if a drag state is detected. For example, an overscrolled 
 * jQuery element "elm" can be checked for drag state via elm.data("dragging").
 *
 * You MUST have two cursors to get the "hand" to show up, open, and close during the panning 
 * process. You can store the cursors wherever you want, just make sure to reference them in 
 * the code below. I have provided initial static linkages to these cursors for your 
 * convenience.        
 *
 * Changelog:
 *
 * 1.3.5
 *   - Added the ability to toggle mouse wheel scroll direction via options.wheelDirection (thanks Volderr)
 *      - http://github.com/azoff/Overscroll/issues/4
 *   - Fixed bug with mouse wheel scroll direction (thanks Volderr)
 *   - Cached the cursor CSS
 * 1.3.4
 *   - Added the ability to call a function at the end of the drift via options.onDriftEnd (thanks Volderr)
 *      - http://github.com/azoff/Overscroll/issues/4
 * 1.3.3
 *   - Added the ability to control the drift delta (drift strength per scroll tick) via options.[wheel|scroll]Delta
 *      - http://github.com/azoff/Overscroll/issues/3
 *   - Made mouse wheel scrolling more efficient via deferred fade out call
 * 1.3.2
 *   - Updated documentation, added README file for Github
 *   - Fixed undefined error on mouse wheel scroll for horizontal scrollers.
 *      - http://github.com/azoff/Overscroll/issues/1
 *   - Added the ability to restrict scroll direction via options.direction
 * 1.3.1
 *   - Made the dragging state externally visible via .data("dragging")
 * 1.3.0
 *   - Merged iThumbs and Overscroll
 *   - Added the ability to pass in options
 *   - Moved all code to GitHub
 *   - Several improvements to the thumb code
 *   - Greased up the scroll a bit more
 *   - Removed the jerky animation on mouse wheel
 *   - Added caching for cursors
 * 1.2.1
 *   - Made "smart" click support "smarter" :)
 *   - Added JSLint validation to the build process
 *	 - Removed unused variables and cleaned up code
 * 1.2.0
 *   - Updated license to match the jQuery license (thanks Jesse)
 *   - Added vertical scroll wheel support (thanks Pwakman)
 *   - Added support to ignore proprietary drag events (thanks Raphael)
 *   - Added "smart" click support for clickable elements (thanks Mark)
 * 1.1.2
 *   - Added the correct click handling to the scroll operation (thanks Evilc)
 * 1.1.1
 *   - Made scroll a bit smoother (thanks Nick)
 * 1.1.0
 *   - Optimized scrolling-internals so that it is both smoother and more memory efficient 
 *     (relies entirely on event model now). 
 *   - Added the ability to scroll horizontally (if the overscrolled element has wider children).
 * 1.0.3
 *   - Extended the easing object, as opposed to the $ object (thanks Andre)
 * 1.0.2
 *   - Fixed timer to actually return milliseconds (thanks Don)
 * 1.0.1
 *   - Fixed bug with interactive elements and made scrolling smoother (thanks Paul and Aktar)
 */

/*jslint onevar: true, strict: true */
/*global window, jQuery */
"use strict"; 

(function(w, m, $, o){

	// create overscroll
	o = $.fn.overscroll = function(options) {
		return this.each(function(){
			o.init($(this), options);
		});
	};
	
	$.extend(o, {
		
		// events handled by overscroll
		events: {
			wheel: "mousewheel DOMMouseScroll",
			start: "select mousedown touchstart",
			drag: "mousemove touchmove",
			scroll: "scroll",
			resize: "resize",
			end: "mouseup mouseleave touchend",
			ignored: "dragstart drag"
		},
		
		// to save a couble bits
		div: "<div/>",
		noop: function(){return false;},
		
		// constants used to tune scrollability and thumbs
		constants: {
			scrollDuration: 800,
			timeout: 400,
			captureThreshold: 3,
			wheelDelta: 20,
			scrollDelta: 5.9,
			thumbThickness: 8,
			thumbOpacity: 0.7,
			boundingBox: 1000000,
			cssURL: /url\((.+)\)/ 
		},
		
		// main initialization function
		init: function(target, options, data, matches) {
			data = {};
			
			options = $.extend({
				openedCursor: "url('http://github.com/downloads/azoff/Overscroll/opened.cur')",
				closedCursor: "url('http://github.com/downloads/azoff/Overscroll/closed.cur')",
				showThumbs: true,
				wheelDirection: 'vertical',
				wheelDelta: o.constants.wheelDelta,
				scrollDelta: o.constants.scrollDelta,
				direction: 'multi',
				onDriftEnd: $.noop,
				oob: true,
				oobEasing: $.easing.easeOutElastic ? "easeOutElastic" : "swing"
			}, (options || {}));
			
			options.scrollDelta = m.abs(options.scrollDelta);
			options.wheelDelta = m.abs(options.wheelDelta);
			
			// cache cursors
			options.cache = { openedCursor: new Image(), closedCursor: new Image() };
			if (matches = o.constants.cssURL.exec(options.openedCursor))
				options.cache.openedCursor.src = matches[1];
			if (matches = o.constants.cssURL.exec(options.closedCursor))
				options.cache.closedCursor.src = matches[1];
			
			// set css
			options.openedCss = {cursor: options.openedCursor+",default"};
			options.closedCss = {cursor: options.closedCursor+",default"};
			
			target.css('overflow', 'hidden').css(options.openedCss)
				.bind(o.events.wheel, data, o.wheel)
				.bind(o.events.start, data, o.start)
				.bind(o.events.end, data, o.stop)
				.bind(o.events.resize, data, o.resize)
				.bind(o.events.ignored, o.noop); // disable proprietary drag handlers

			// This will leak objects
			//$(window).bind(o.events.resize, data, o.resize);

			data.target = target;
			data.options = options;
			data.content = target.children(":first-child").css("position", "relative");

			o.setThumbs(data);
		},
		
		// toggles the drag mode of the target
		toggleDragMode: function(data, dragging) {
		    if(dragging) {
		        data.target.css(data.options.closedCss);
		    } else {
		        data.target.css(data.options.openedCss);
	        }
	        if(data.thumbs) {
                if(dragging) {
                    if(data.thumbs.vertical) {
                        data.thumbs.vertical.stop(true, true).fadeTo("fast", o.constants.thumbOpacity);
                    }
                    if(data.thumbs.horizontal) {
                        data.thumbs.horizontal.stop(true, true).fadeTo("fast", o.constants.thumbOpacity);
                    }
                } else {
                    if(data.thumbs.vertical) {
                        data.thumbs.vertical.fadeTo("fast", 0);
                    }
                    if(data.thumbs.horizontal) {
                        data.thumbs.horizontal.fadeTo("fast", 0);
                    }
                }
		    }
		},
		
		// sets a position object
		setPosition: function(event, position, index) {
		    position.x = event.pageX;
		    position.y = event.pageY;
		    position.index = index;
		    return position;
		},
		
		// handles mouse wheel scroll events
		wheel: function(event, delta) {
			
			if ( event.wheelDelta ) { 
		        delta = event.wheelDelta/ (w.opera ? -120 : 120);
		    }
		    
		    if ( event.detail ) { 
		        delta = -event.detail/3; 
		    }
		    
		    if(!event.data.wheelCapture) {
		        event.data.wheelCapture = { timeout: null };
		        o.toggleDragMode(event.data, true);
		        event.data.target.stop(true, true).data('dragging', true);
		    }
		    
		    delta *= event.data.options.wheelDelta;
		    
		    if(event.data.options.wheelDirection === 'horizontal') {
		        this.scrollLeft -= delta;
		    } else {
		        this.scrollTop -= delta;
		    }
		    
		    if(event.data.wheelCapture.timeout) {
		        clearTimeout(event.data.wheelCapture.timeout);
		    }
		    
		    event.data.wheelCapture.timeout = setTimeout(function(d){
		        event.data.wheelCapture = undefined;
		        o.toggleDragMode(event.data, false);
		        event.data.target.data('dragging', false);
		        event.data.options.onDriftEnd.call(event.data.target, event.data);
		    }, o.constants.timeout);
		
			return false;
			
		},
		
		// handles a scroll event
		scroll: function(event, thumbs, sizing, left, top, ml, mt) {
		    
		    thumbs = event.data.thumbs;
		    sizing = event.data.sizing;
		    left = this.scrollLeft;
		    top = this.scrollTop;
		    
            if (thumbs.horizontal) {
                ml = left * sizing.container.width / sizing.container.scrollWidth;
                mt = sizing.thumbs.horizontal.top;
                if(sizing.relative) { ml += left; mt += top; }
                thumbs.horizontal.css("margin", mt + "px 0 0 " + ml + "px");	
            }

            if (thumbs.vertical) {
                ml = sizing.thumbs.vertical.left;
                mt = top * sizing.container.height / sizing.container.scrollHeight;
                if(sizing.relative) { ml += left; mt += top; }
                thumbs.vertical.css("margin", mt + "px 0 0 " + ml + "px");
            }
        
        },
		
		// starts the drag operation and binds the mouse move handler
		start: function(event) {

			event.data.target.bind(o.events.drag, event.data, o.drag).stop(true, true).data('dragging', false);
			o.toggleDragMode(event.data, true);
			event.data.position = o.setPosition(event, {});
			event.data.capture = o.setPosition(event, {}, 2);
			if (event.data.options.oob)
				event.data.margins = { left: 0, top: 0, right: 0, bottom: 0 };

			// Do not prevent the selection. (Caller is reasonable to do that by itself)
			return true;

		},
		
		// updates the current scroll location during a mouse move
		drag: function(event, ml, mt, left, top) {

			if (event.data.options.direction !== 'vertical')
				o.doScroll(this, event, "X", "Left", "Right", "Width");
			if (event.data.options.direction !== 'horizontal')
				o.doScroll(this, event, "Y", "Top", "Bottom", "Height");
	
			o.setPosition(event, event.data.position);
			
			if (--event.data.capture.index <= 0 ) {
			    event.data.target.data('dragging', true);
			    o.setPosition(event, event.data.capture, o.constants.captureThreshold);
			}

			return true;
		
		},

		doScroll: function(target, event, axis, lower, upper, length) {
			var data = event.data, margins, up, lo,
				delta = event["page" + axis] - data.position[axis.toLowerCase()],
				scroll = target["scroll" + lower] - delta,
				scrollLength;

			if (data.margins) {
				margins = data.margins;
				lo = lower.toLowerCase();
				up = upper.toLowerCase();
				scrollLength = data.sizing.container["scroll" + length];

				if (margins[up] == 0 && (scroll < 0 || margins[lo] > 0)) {
					margins[lo] += delta;
					if (margins[lo] < 0)
						margins[lo] = 0;
					data.content.css(lo, margins[lo] + "px");
					return;
				}

				if (margins[lo] == 0 && (scroll > scrollLength || margins[up] > 0)) {
					margins[up] -= delta;
					if (margins[up] < 0)
						margins[up] = 0;
					data.content.css(lo, (- margins[up]) + "px");
					return;
				}
			}

			target["scroll" + lower] = scroll;
		},

		// ends the drag operation and unbinds the mouse move handler
		stop: function(event, dx, dy, d) {

			var oob; // out of bound

			if (event.data.margins) {
				d = {};
				$.each([["left", "left"], ["top", "top"], ["right", "left"], ["bottom", "top"]], function(i, v) {
					if (event.data.margins[v[0]] > 0)
						d[v[1]] = 0;
				});
				oob = !$.isEmptyObject(d);
				if (oob)
					event.data.content.animate(d, {
						easing: event.data.options.oobEasing,
						complete: function() {
							event.data.content.css({"left": "", "top": ""});
						}
					});
				delete event.data.margins;
			}

			if(event.data.position) {

				event.data.target.unbind(o.events.drag, o.drag);
				
				if(event.data.target.data('dragging')) {
				 	if (!oob) {
						dx = event.data.options.scrollDelta * (event.pageX - event.data.capture.x);
						dy = event.data.options.scrollDelta * (event.pageY - event.data.capture.y);
						d = {};

						if(event.data.options.direction !== 'vertical') {
							d.scrollLeft = this.scrollLeft - dx;
						}

						if(event.data.options.direction !== 'horizontal') {
							d.scrollTop = this.scrollTop - dy;
						}

						event.data.target.animate(d, {
							duration: o.constants.scrollDuration,
							easing: 'cubicEaseOut',
							complete: function() {
								event.data.target.data('dragging', false);
								event.data.options.onDriftEnd.call(event.data.target, event.data);
								o.toggleDragMode(event.data, false);
							}
						});
					}
				} else {
				     o.toggleDragMode(event.data, false);
				}
                
                event.data.capture = event.data.position = undefined;
                
			}

			return !event.data.target.data('dragging');
		},

		resize: function(event) {
			o.setThumbs(event.data);
		},

		setThumbs: function(data) {
			var target = data.target,
				options = data.options;
			data.sizing = o.getSizing(target);
			if (options.showThumbs) {
				if (!data.thumbs)
					data.thumbs = {};
				else {
					if (data.thumbs.horizontal)
						data.thumbs.horizontal.remove();
					if (data.thumbs.vertical)
						data.thumbs.vertical.remove();
				}

				if(data.sizing.container.scrollWidth > 0 && options.direction !== 'vertical') {
					data.thumbs.horizontal = $(o.div).css(o.getThumbCss(data.sizing.thumbs.horizontal, options.thumbCss)).fadeTo(0, 0);
					target.prepend(data.thumbs.horizontal);
				}

				if(data.sizing.container.scrollHeight > 0 && options.direction !== 'horizontal') {
					data.thumbs.vertical = $(o.div).css(o.getThumbCss(data.sizing.thumbs.vertical, options.thumbCss)).fadeTo(0, 0);
					target.prepend(data.thumbs.vertical);
				}

				data.sizing.relative = data.thumbs.vertical || data.thumbs.horizontal;

				if(data.sizing.relative) {
					data.sizing.relative.oldOffset = data.sizing.relative.offset();
					target.scrollTop(o.constants.boundingBox).scrollLeft(o.constants.boundingBox);
					data.sizing.relative.remove().prependTo(target);
					data.sizing.relative.newOffset = data.sizing.relative.offset();
					data.sizing.relative =
						data.sizing.relative.oldOffset.left != data.sizing.relative.newOffset.left ||
						data.sizing.relative.oldOffset.top != data.sizing.relative.newOffset.top;
					target.scrollTop(0).scrollLeft(0);
					target.bind(o.events.scroll, data, o.scroll);
				}
			}
		},
		
		// gets sizing for the container and thumbs
		getSizing: function(container, sizing, pos) {
		
			sizing = { };
			
			sizing.container = {
				width: container.width(),
				height: container.height()
			};

			pos = {
				left: container.scrollLeft(),
				top: container.scrollTop()
			};

			container.scrollLeft(o.constants.boundingBox).scrollTop(o.constants.boundingBox);
			sizing.container.scrollWidth = container.scrollLeft();
			sizing.container.scrollHeight = container.scrollTop();
			container.scrollTop(pos.top).scrollLeft(pos.left);

			sizing.thumbs = {
				horizontal: {
					width: sizing.container.width * sizing.container.width / sizing.container.scrollWidth,
					height: o.constants.thumbThickness,
					corner: o.constants.thumbThickness / 2,
					left: 0,
					top: sizing.container.height - o.constants.thumbThickness
				},
				vertical: {
					width: o.constants.thumbThickness,
					height: sizing.container.height * sizing.container.height / sizing.container.scrollHeight,
					corner: o.constants.thumbThickness / 2,
					left: sizing.container.width - o.constants.thumbThickness,
					top: 0
				}
			};

			sizing.container.width -= sizing.thumbs.horizontal.width;
			sizing.container.height -= sizing.thumbs.vertical.height;
			
			return sizing;
			
		},
		
		// gets the CSS object for a thumb
		getThumbCss: function(size, css) {
		
			return $.extend({
				position: "absolute",
				"background-color": "black",
				width: size.width + "px",
				height: size.height + "px",
				"margin": size.top + "px 0 0 " + size.left + "px",
				"-moz-border-radius": size.corner + "px",
				"-webkit-border-radius":  size.corner + "px", 
				"border-radius":  size.corner + "px"
			}, css || {});
			
		}
		
	});

	// jQuery adapted Penner animation
	//    created by Jamie Lemon
	$.extend($.easing, {
		
		cubicEaseOut: function(p, n, firstNum, diff) {
			var c = firstNum + diff;
			return c*((p=p/1-1)*p*p + 1) + firstNum;
		}

	});

})(window, Math, jQuery);