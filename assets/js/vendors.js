// randomColor by David Merfield under the CC0 license
// https://github.com/davidmerfield/randomColor/

;(function(root, factory) {

  // Support CommonJS
  if (typeof exports === 'object') {
    var randomColor = factory();

    // Support NodeJS & Component, which allow module.exports to be a function
    if (typeof module === 'object' && module && module.exports) {
      exports = module.exports = randomColor;
    }

    // Support CommonJS 1.1.1 spec
    exports.randomColor = randomColor;

  // Support AMD
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);

  // Support vanilla script loading
  } else {
    root.randomColor = factory();
  }

}(this, function() {

  // Seed to get repeatable colors
  var seed = null;

  // Shared color dictionary
  var colorDictionary = {};

  // Populate the color dictionary
  loadColorBounds();

  var randomColor = function (options) {

    options = options || {};

    // Check if there is a seed and ensure it's an
    // integer. Otherwise, reset the seed value.
    if (options.seed !== undefined && options.seed !== null && options.seed === parseInt(options.seed, 10)) {
      seed = options.seed;

    // A string was passed as a seed
    } else if (typeof options.seed === 'string') {
      seed = stringToInteger(options.seed);

    // Something was passed as a seed but it wasn't an integer or string
    } else if (options.seed !== undefined && options.seed !== null) {
      throw new TypeError('The seed value must be an integer or string');

    // No seed, reset the value outside.
    } else {
      seed = null;
    }

    var H,S,B;

    // Check if we need to generate multiple colors
    if (options.count !== null && options.count !== undefined) {

      var totalColors = options.count,
          colors = [];

      options.count = null;

      while (totalColors > colors.length) {

        // Since we're generating multiple colors,
        // incremement the seed. Otherwise we'd just
        // generate the same color each time...
        if (seed && options.seed) options.seed += 1;

        colors.push(randomColor(options));
      }

      options.count = totalColors;

      return colors;
    }

    // First we pick a hue (H)
    H = pickHue(options);

    // Then use H to determine saturation (S)
    S = pickSaturation(H, options);

    // Then use S and H to determine brightness (B).
    B = pickBrightness(H, S, options);

    // Then we return the HSB color in the desired format
    return setFormat([H,S,B], options);
  };

  function pickHue (options) {

    var hueRange = getHueRange(options.hue),
        hue = randomWithin(hueRange);

    // Instead of storing red as two seperate ranges,
    // we group them, using negative numbers
    if (hue < 0) {hue = 360 + hue;}

    return hue;

  }

  function pickSaturation (hue, options) {

    if (options.hue === 'monochrome') {
      return 0;
    }

    if (options.luminosity === 'random') {
      return randomWithin([0,100]);
    }

    var saturationRange = getSaturationRange(hue);

    var sMin = saturationRange[0],
        sMax = saturationRange[1];

    switch (options.luminosity) {

      case 'bright':
        sMin = 55;
        break;

      case 'dark':
        sMin = sMax - 10;
        break;

      case 'light':
        sMax = 55;
        break;
   }

    return randomWithin([sMin, sMax]);

  }

  function pickBrightness (H, S, options) {

    var bMin = getMinimumBrightness(H, S),
        bMax = 100;

    switch (options.luminosity) {

      case 'dark':
        bMax = bMin + 20;
        break;

      case 'light':
        bMin = (bMax + bMin)/2;
        break;

      case 'random':
        bMin = 0;
        bMax = 100;
        break;
    }

    return randomWithin([bMin, bMax]);
  }

  function setFormat (hsv, options) {

    switch (options.format) {

      case 'hsvArray':
        return hsv;

      case 'hslArray':
        return HSVtoHSL(hsv);

      case 'hsl':
        var hsl = HSVtoHSL(hsv);
        return 'hsl('+hsl[0]+', '+hsl[1]+'%, '+hsl[2]+'%)';

      case 'hsla':
        var hslColor = HSVtoHSL(hsv);
        var alpha = options.alpha || Math.random();
        return 'hsla('+hslColor[0]+', '+hslColor[1]+'%, '+hslColor[2]+'%, ' + alpha + ')';

      case 'rgbArray':
        return HSVtoRGB(hsv);

      case 'rgb':
        var rgb = HSVtoRGB(hsv);
        return 'rgb(' + rgb.join(', ') + ')';

      case 'rgba':
        var rgbColor = HSVtoRGB(hsv);
        var alpha = options.alpha || Math.random();
        return 'rgba(' + rgbColor.join(', ') + ', ' + alpha + ')';

      default:
        return HSVtoHex(hsv);
    }

  }

  function getMinimumBrightness(H, S) {

    var lowerBounds = getColorInfo(H).lowerBounds;

    for (var i = 0; i < lowerBounds.length - 1; i++) {

      var s1 = lowerBounds[i][0],
          v1 = lowerBounds[i][1];

      var s2 = lowerBounds[i+1][0],
          v2 = lowerBounds[i+1][1];

      if (S >= s1 && S <= s2) {

         var m = (v2 - v1)/(s2 - s1),
             b = v1 - m*s1;

         return m*S + b;
      }

    }

    return 0;
  }

  function getHueRange (colorInput) {

    if (typeof parseInt(colorInput) === 'number') {

      var number = parseInt(colorInput);

      if (number < 360 && number > 0) {
        return [number, number];
      }

    }

    if (typeof colorInput === 'string') {

      if (colorDictionary[colorInput]) {
        var color = colorDictionary[colorInput];
        if (color.hueRange) {return color.hueRange;}
      } else if (colorInput.match(/^#?([0-9A-F]{3}|[0-9A-F]{6})$/i)) {
        var hue = HexToHSB(colorInput)[0];
        return [ hue, hue ];
      }
    }

    return [0,360];

  }

  function getSaturationRange (hue) {
    return getColorInfo(hue).saturationRange;
  }

  function getColorInfo (hue) {

    // Maps red colors to make picking hue easier
    if (hue >= 334 && hue <= 360) {
      hue-= 360;
    }

    for (var colorName in colorDictionary) {
       var color = colorDictionary[colorName];
       if (color.hueRange &&
           hue >= color.hueRange[0] &&
           hue <= color.hueRange[1]) {
          return colorDictionary[colorName];
       }
    } return 'Color not found';
  }

  function randomWithin (range) {
    if (seed === null) {
      return Math.floor(range[0] + Math.random()*(range[1] + 1 - range[0]));
    } else {
      //Seeded random algorithm from http://indiegamr.com/generate-repeatable-random-numbers-in-js/
      var max = range[1] || 1;
      var min = range[0] || 0;
      seed = (seed * 9301 + 49297) % 233280;
      var rnd = seed / 233280.0;
      return Math.floor(min + rnd * (max - min));
    }
  }

  function HSVtoHex (hsv){

    var rgb = HSVtoRGB(hsv);

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? '0' + hex : hex;
    }

    var hex = '#' + componentToHex(rgb[0]) + componentToHex(rgb[1]) + componentToHex(rgb[2]);

    return hex;

  }

  function defineColor (name, hueRange, lowerBounds) {

    var sMin = lowerBounds[0][0],
        sMax = lowerBounds[lowerBounds.length - 1][0],

        bMin = lowerBounds[lowerBounds.length - 1][1],
        bMax = lowerBounds[0][1];

    colorDictionary[name] = {
      hueRange: hueRange,
      lowerBounds: lowerBounds,
      saturationRange: [sMin, sMax],
      brightnessRange: [bMin, bMax]
    };

  }

  function loadColorBounds () {

    defineColor(
      'monochrome',
      null,
      [[0,0],[100,0]]
    );

    defineColor(
      'red',
      [-26,18],
      [[20,100],[30,92],[40,89],[50,85],[60,78],[70,70],[80,60],[90,55],[100,50]]
    );

    defineColor(
      'orange',
      [19,46],
      [[20,100],[30,93],[40,88],[50,86],[60,85],[70,70],[100,70]]
    );

    defineColor(
      'yellow',
      [47,62],
      [[25,100],[40,94],[50,89],[60,86],[70,84],[80,82],[90,80],[100,75]]
    );

    defineColor(
      'green',
      [63,178],
      [[30,100],[40,90],[50,85],[60,81],[70,74],[80,64],[90,50],[100,40]]
    );

    defineColor(
      'blue',
      [179, 257],
      [[20,100],[30,86],[40,80],[50,74],[60,60],[70,52],[80,44],[90,39],[100,35]]
    );

    defineColor(
      'purple',
      [258, 282],
      [[20,100],[30,87],[40,79],[50,70],[60,65],[70,59],[80,52],[90,45],[100,42]]
    );

    defineColor(
      'pink',
      [283, 334],
      [[20,100],[30,90],[40,86],[60,84],[80,80],[90,75],[100,73]]
    );

  }

  function HSVtoRGB (hsv) {

    // this doesn't work for the values of 0 and 360
    // here's the hacky fix
    var h = hsv[0];
    if (h === 0) {h = 1;}
    if (h === 360) {h = 359;}

    // Rebase the h,s,v values
    h = h/360;
    var s = hsv[1]/100,
        v = hsv[2]/100;

    var h_i = Math.floor(h*6),
      f = h * 6 - h_i,
      p = v * (1 - s),
      q = v * (1 - f*s),
      t = v * (1 - (1 - f)*s),
      r = 256,
      g = 256,
      b = 256;

    switch(h_i) {
      case 0: r = v; g = t; b = p;  break;
      case 1: r = q; g = v; b = p;  break;
      case 2: r = p; g = v; b = t;  break;
      case 3: r = p; g = q; b = v;  break;
      case 4: r = t; g = p; b = v;  break;
      case 5: r = v; g = p; b = q;  break;
    }

    var result = [Math.floor(r*255), Math.floor(g*255), Math.floor(b*255)];
    return result;
  }

  function HexToHSB (hex) {
    hex = hex.replace(/^#/, '');
    hex = hex.length === 3 ? hex.replace(/(.)/g, '$1$1') : hex;

    var red = parseInt(hex.substr(0, 2), 16) / 255,
          green = parseInt(hex.substr(2, 2), 16) / 255,
          blue = parseInt(hex.substr(4, 2), 16) / 255;

    var cMax = Math.max(red, green, blue),
          delta = cMax - Math.min(red, green, blue),
          saturation = cMax ? (delta / cMax) : 0;

    switch (cMax) {
      case red: return [ 60 * (((green - blue) / delta) % 6) || 0, saturation, cMax ];
      case green: return [ 60 * (((blue - red) / delta) + 2) || 0, saturation, cMax ];
      case blue: return [ 60 * (((red - green) / delta) + 4) || 0, saturation, cMax ];
    }
  }

  function HSVtoHSL (hsv) {
    var h = hsv[0],
      s = hsv[1]/100,
      v = hsv[2]/100,
      k = (2-s)*v;

    return [
      h,
      Math.round(s*v / (k<1 ? k : 2-k) * 10000) / 100,
      k/2 * 100
    ];
  }

  function stringToInteger (string) {
    var total = 0
    for (var i = 0; i !== string.length; i++) {
      if (total >= Number.MAX_SAFE_INTEGER) break;
      total += string.charCodeAt(i)
    }
    return total
  }

  return randomColor;
}));




/* jquery.touch v1.1.0 | (c) @ajlkn | github.com/ajlkn/jquery.touch | MIT licensed */
!function(e){function t(e,t,n){var r=this;r.settings=n,r.$element=e,r.$sourceElement=t,r.inTap=!1,r.inTapAndHold=!1,r.inDrag=!1,r.tapStart=null,r.dragStart=null,r.timerTap=null,r.timerTapAndHold=null,r.mouseDown=!1,r.x=null,r.y=null,r.ex=null,r.ey=null,r.xStart=null,r.yStart=null,r.exStart=null,r.eyStart=null,r.taps=0,r.started=!1,r.ended=!1}function n(e,n,r){var a=e[0];return"undefined"==typeof a._touch&&(a._touch=new t(e,n,r)),a._touch}function r(e,t,n){var r,a,o,s,i;return r=e.$element.offset(),a=e.$element.width(),o=e.$element.height(),s=Math.min(Math.max(t,r.left),r.left+a),i=Math.min(Math.max(n,r.top),r.top+o),{x:s,y:i}}var a=e(document),o=null,s=null,i={useTouch:!0,useMouse:!0,trackDocument:!1,trackDocumentNormalize:!1,noClick:!1,dragThreshold:10,dragDelay:200,swipeThreshold:30,tapDelay:250,tapAndHoldDelay:500,delegateSelector:null,dropFilter:!1,dropFilterTraversal:!0,coordinates:"page",preventDefault:{drag:!1,swipe:!1,tap:!1}};t.prototype.uses=function(t){var n=e._data(this.$sourceElement[0],"events");switch(t){case"swipe":return n.hasOwnProperty(t)||n.hasOwnProperty("swipeUp")||n.hasOwnProperty("swipeDown")||n.hasOwnProperty("swipeLeft")||n.hasOwnProperty("swipeRight");case"drag":return n.hasOwnProperty(t)||n.hasOwnProperty("dragStart")||n.hasOwnProperty("dragEnd");case"tapAndHold":case"doubleTap":return n.hasOwnProperty(t);case"tap":return n.hasOwnProperty(t)||n.hasOwnProperty("doubleTap")||n.hasOwnProperty("tapAndHold")}return!1},t.prototype.cancel=function(e){var t=this;t.taps=0,t.inTap=!1,t.inTapAndHold=!1,t.inDrag=!1,t.tapStart=null,t.dragStart=null,t.xStart=null,t.yStart=null,t.exStart=null,t.eyStart=null,e&&(t.mouseDown=!1)},t.prototype.doStart=function(e,t,n){var r=this,a=r.$element.offset();e.stopPropagation(),(r.uses("drag")&&r.settings.preventDefault.drag(r)||r.uses("swipe")&&r.settings.preventDefault.swipe(r)||r.uses("tap")&&r.settings.preventDefault.tap(r))&&e.preventDefault(),r.uses("tapAndHold")&&r.$element.css("-webkit-tap-highlight-color","rgba(0,0,0,0)").css("-webkit-touch-callout","none").css("-webkit-user-select","none"),r.x=t,r.y=n,r.ex=t-a.left,r.ey=n-a.top,r.tapStart=Date.now(),clearTimeout(r.timerTap),r.timerTap=setTimeout(function(){r.inTap&&r.taps>0&&(r.$element.trigger(2==r.taps?"doubleTap":"tap",{taps:r.taps,x:r.x,y:r.y,ex:r.ex,ey:r.ey,duration:Date.now()-r.tapStart,event:e}),r.cancel()),r.timerTap=null},r.settings.tapDelay),r.uses("tapAndHold")&&(clearTimeout(r.timerTapAndHold),r.timerTapAndHold=setTimeout(function(){r.inTap&&(r.$element.trigger("tapAndHold",{x:r.x,y:r.y,ex:r.ex,ey:r.ey,duration:Date.now()-r.tapStart,event:e}),r.cancel()),r.timerTapAndHold=null,r.inTapAndHold=!0},r.settings.tapAndHoldDelay)),r.inTap=!0},t.prototype.doMove=function(t,n,r){var i,l,u=this,d=u.$element.offset(),p=(Math.abs(u.x-n)+Math.abs(u.y-r))/2;if(t.stopPropagation(),(u.uses("swipe")&&u.settings.preventDefault.swipe(u)||u.uses("drag")&&u.settings.preventDefault.drag(u))&&t.preventDefault(),p>2&&clearTimeout(u.timerTapAndHold),u.inDrag&&o==u){if(u.$element.trigger("drag",{x:n,y:r,ex:n-d.left,ey:r-d.top,start:{x:u.xStart,y:u.yStart,ex:u.exStart,ey:u.eyStart},event:t,exStart:u.exStart,eyStart:u.eyStart}),u.$element.css("pointer-events","none"),i="fixed"==u.$element.css("position")?document.elementFromPoint(n-a.scrollLeft(),r-a.scrollTop()):document.elementFromPoint(n,r),u.$element.css("pointer-events",""),i){if(u.settings.dropFilter!==!1)switch(l=typeof u.settings.dropFilter){case"string":if(u.settings.dropFilterTraversal)for(;i&&!e(i).is(u.settings.dropFilter);)i=i.parentElement;else e(i).is(u.settings.dropFilter)||(i=null);break;case"function":if(u.settings.dropFilterTraversal)for(;i&&u.settings.dropFilter(u.$element[0],i)!==!0;)i=i.parentElement;else u.settings.dropFilter(u.$element[0],i)===!1&&(i=null);break;default:case"boolean":if(u.settings.dropFilter===!0)for(;i.parentElement!=u.$element[0].parentElement;)if(i=i.parentElement,!i){i=null;break}}i===u.$element[0]&&(i=null)}s&&s!==i&&(u.$element.trigger("dragLeave",{element:s,event:t}),s=null),!s&&i&&(s=i,u.$element.trigger("dragEnter",{element:s,event:t})),s&&(d=e(s).offset(),u.$element.trigger("dragOver",{element:s,event:t,x:n,y:r,ex:n-d.left,ey:r-d.top}))}else if(p>u.settings.dragThreshold){if(Date.now()-u.tapStart<u.settings.dragDelay)return void u.cancel();u.cancel(),u.inDrag=!0,u.dragStart=Date.now(),u.xStart=n,u.yStart=r,u.exStart=n-d.left,u.eyStart=r-d.top,u.uses("drag")&&u.settings.preventDefault.drag(u)&&t.preventDefault(),u.$element.trigger("dragStart",{x:u.xStart,y:u.yStart,ex:u.exStart,ey:u.eyStart,event:t}),o=u}},t.prototype.doEnd=function(t,n,r){var a,i,l,u=this,d=u.$element.offset(),p=Math.abs(u.x-n),c=Math.abs(u.y-r);t.stopPropagation(),u.inTap?(clearTimeout(u.timerTapAndHold),u.taps++,(!u.timerTap||1==u.taps&&!u.uses("doubleTap")||2==u.taps&&u.uses("doubleTap"))&&(u.$element.trigger(2==u.taps?"doubleTap":"tap",{taps:u.taps,x:u.x,y:u.y,ex:u.ex,ey:u.ey,duration:Date.now()-u.tapStart,event:t}),u.cancel())):u.inDrag?(s&&(d=e(s).offset(),u.$element.trigger("drop",{element:s,event:t,x:n,y:r,ex:n-d.left,ey:r-d.top}),s=null),l=Date.now()-u.dragStart,a=Math.sqrt(Math.pow(Math.abs(u.x-n),2)+Math.pow(Math.abs(u.y-r),2)),i=a/l,u.$element.trigger("dragEnd",{start:{x:u.x,y:u.y,ex:u.ex,ey:u.ey},end:{x:n,y:r,ex:n-d.left,ey:r-d.top},distance:a,duration:l,velocity:i,event:t}),o=null,(p>u.settings.swipeThreshold||c>u.settings.swipeThreshold)&&(u.$element.trigger("swipe",{distance:a,duration:l,velocity:i,event:t}),p>c?(i=p/l,n<u.x?u.$element.trigger("swipeLeft",{distance:p,duration:l,velocity:i,event:t}):u.$element.trigger("swipeRight",{distance:p,duration:l,velocity:i,event:t})):c>p&&(i=c/l,r<u.y?u.$element.trigger("swipeUp",{distance:c,duration:l,velocity:i,event:t}):u.$element.trigger("swipeDown",{distance:c,duration:l,velocity:i,event:t}))),u.inDrag=!1):u.inTapAndHold&&(clearTimeout(u.timerTapAndHold),u.$element.trigger("tapAndHoldEnd",{x:u.x,y:u.y,event:t}),u.inTapAndHold=!1)},e.fn.touch=function(t){var n=e(this);if(this.length>1)for(var r=0;r<this.length;r++)e.touch(e(this[r]),t);else 1==this.length&&e.touch(n,t);return n},e.fn.enableTouch=function(t){return e(this).touch(t)},e.touch=function(t,o){var s={};if(s=e.extend(s,i),s=e.extend(s,o),"function"!=typeof s.preventDefault.drag&&(s.preventDefault.drag=s.preventDefault.drag===!0?function(e){return!0}:function(e){return!1}),"function"!=typeof s.preventDefault.swipe&&(s.preventDefault.swipe=s.preventDefault.swipe===!0?function(e){return!0}:function(e){return!1}),"function"!=typeof s.preventDefault.tap&&(s.preventDefault.tap=s.preventDefault.tap===!0?function(e){return!0}:function(e){return!1}),s.noClick&&t.on("click",function(e){e.preventDefault()}),s.useTouch){var l=function(r){var a=e(this),o=n(a,t,s);o.started=!0,o.doStart(r,r.originalEvent.touches[0][s.coordinates+"X"],r.originalEvent.touches[0][s.coordinates+"Y"]),setTimeout(function(){o.started=!1},1e3)};t.on("touchstart",l),s.delegateSelector&&t.on("touchstart",s.delegateSelector,l);var u=function(a){var o=e(this),i=n(o,t,s),l=a.originalEvent.touches[0][s.coordinates+"X"],u=a.originalEvent.touches[0][s.coordinates+"Y"];if(i.settings.trackDocument&&i.settings.trackDocumentNormalize){var d=r(i,l,u);l=d.x,u=d.y}i.doMove(a,l,u)};t.on("touchmove",u),s.delegateSelector&&t.on("touchmove",s.delegateSelector,u);var d=function(a){var o=e(this),i=n(o,t,s);i.ended=!0;var l=r(i,a.originalEvent.changedTouches[0][s.coordinates+"X"],a.originalEvent.changedTouches[0][s.coordinates+"Y"]);i.doEnd(a,l.x,l.y),setTimeout(function(){i.ended=!1},1e3)};t.on("touchend",d),s.delegateSelector&&t.on("touchend",s.delegateSelector,d)}if(s.useMouse){var p=function(r){var a=e(this),o=n(a,t,s);return!o.started&&(o.mouseDown=!0,void o.doStart(r,r[s.coordinates+"X"],r[s.coordinates+"Y"]))};t.on("mousedown",p),s.delegateSelector&&t.on("mousedown",s.delegateSelector,p);var c=function(r){var a=e(this),o=n(a,t,s);o.mouseDown&&o.doMove(r,r[s.coordinates+"X"],r[s.coordinates+"Y"])};t.on("mousemove",c),s.delegateSelector&&t.on("mousemove",s.delegateSelector,c);var g=function(r){var o=e(this),i=n(o,t,s);return!i.ended&&(a.triggerHandler("mouseup",r),i.doEnd(r,r[s.coordinates+"X"],r[s.coordinates+"Y"]),void(i.mouseDown=!1))};t.on("mouseup",g),s.delegateSelector&&t.on("mouseup",s.delegateSelector,g)}s.trackDocument||t.on("mouseleave",function(r){var a=e(this),o=n(a,t,s);o.doEnd(r,r[s.coordinates+"X"],r[s.coordinates+"Y"]),o.mouseDown=!1})},a.on("mousemove",function(e){var t=o;if(t&&t.settings.useMouse&&t.mouseDown&&t.settings.trackDocument){var n=e[t.settings.coordinates+"X"],a=e[t.settings.coordinates+"Y"];if(t.settings.trackDocumentNormalize){var s=r(t,n,a);n=s.x,a=s.y}t.doMove(e,n,a)}}).on("mouseup",function(e,t){var n=o;if(n&&n.settings.useMouse&&n.settings.trackDocument){if("undefined"!=typeof t&&(e=t),!(n.settings.coordinates+"X"in e))return;var a=e[n.settings.coordinates+"X"],s=e[n.settings.coordinates+"Y"];if(n.settings.trackDocumentNormalize){var i=r(n,a,s);a=i.x,s=i.y}n.doEnd(e,a,s),n.mouseDown=!1}})}(jQuery);