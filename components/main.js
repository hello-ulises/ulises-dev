const _ = require('lodash');
const Ps = require('perfect-scrollbar');

$(function() {

    // Perfect Scrollbar parameters

    const params= {
        minScrollbarLength: 25,
        maxScrollbarLength: 25,
        supressScrollX: true
    };

    const psArray = new Array(3);

    const breakpoint = 768;

    function setPerfectScrollbars (params, breakpoint) {


        if($(window).width() > breakpoint){

            if ( psArray[0] == undefined ) {
              var columnLeft = document.querySelector('#left');     
              var columnRight = document.querySelector('#right');
              var columnPasp = document.querySelector('.column#pasp');
              psArray[0] = new Ps(columnLeft, params);
              psArray[1] = new Ps(columnRight, params);
              psArray[2] = new Ps(columnPasp, params);
            } else {

              for(i = 0; i < 3; i++){
                
                psArray[i].update();
              } 
            }

        } else {


            if ( psArray[0] == undefined ) { return }
            else {
                for(i = 0; i < 3; i++){
                    psArray[i].destroy();
                    delete psArray[i];
                }
            }
        } 

    }

    // sets infinite scroll on splash

    var el = $('.splash-panel .scroll-wrapper');
    var height = el.height() * 2;
    var splash = $('.splash-panel a');
    var themes = ['default', 'inverse', 'hw', 'ms', 'ms2', 'bd'];
       
    el.on('scroll',_.throttle( function() {

      var el = $(this);
      var currentTop = el.scrollTop();

      if ( currentTop > height * 2) {
        el.scrollTop(height);
      }
      if ( currentTop < height / 4) {
        el.scrollTop(height);
      }
      if ( (Math.floor(currentTop) % 9) == 0) {
        
        splash.removeClass();
        splash.addClass(themes[Math.floor(Math.random()*themes.length)]);
      }

    }, 150));



    // function toggles classes on parent element

    function setExpandPanel(el) {

        var parent = el.data('parent');
        $('#' + parent + ' .excerpted').toggleClass('hide');
        $('#' + parent + ' .expanded').toggleClass('show');
    }

    // function reveal PasP panel on click

    function setRevealPasP(el,toggleClass) {

        var target = el.data('target');
        $('.' + target ).toggleClass(toggleClass);
    }

    function checkHeaders() {

        if($(this).width() < 769) {            
            $('header.left').append(header.remove());
        } else {            
            $('header.right').append(header.remove());
        }
    }

    // sets expand on info panel

    // handles on how titles appear based on screen width

    var header = $('.site-header .content-wrapper');

    function init() {

        setPerfectScrollbars(params,breakpoint);
        checkHeaders();
        $('#info-button').on('click', function(e){
            e.preventDefault();
            setExpandPanel($(e.currentTarget));
        });
        $('#splash-body-anchor').on('click', function(e){
            e.preventDefault();
            setRevealPasP($(e.currentTarget),'hide');
        });
        $('#pasp-reveal').on('click', function(e){
            e.preventDefault();
            if( $(window).width() > 768 ) {
                setRevealPasP($(e.currentTarget),'reveal');
                $(e.currentTarget).find('svg').toggleClass('hide');
            }
        });
        $('.pasp-reveal').on('click', function(e){
            e.preventDefault();
            if( $(window).width() < 769 ) {
                setExpandPanel($(e.currentTarget));
            }
        });    
    }

    init()

    $(window).on('resize',function(){
        init();
    });
});