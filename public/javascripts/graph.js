/**
 * @author dlazar
 * @date July 15, 2010
 * @company Nexalogy
 */

/**
 * console.log fix for machines not running firebug.
 *
 */
if (typeof(console) === 'undefined') {
    var console = {
        log: function () {},
        info: function () {},
        warn: function () {},
        error: function () {},
        time: function () {}
    };
}
else if (typeof(console.log) === 'undefined') {
    console.log = function () {};
}

if(typeof Nexalogy == 'undefined') {
  var Nexalogy = {};
}

// Anonymous function builds a nice machine with some private variables for your custom use
Nexalogy.utils = function () {
  
  // setup some graphing values we can use as defaults
  var graphDefaults = {
    height: 0,
    width: 0,
    colors: "",
    title: "Protovis Force Directed Graph"
  }

  // Project ID might be a handy thing to know
  var pid = '';
  
  return {
  
      getPID : function () {
        return pid;
      },    
      
      setPID : function (id) {
        pid = id;
      }
  };
  
}();


var labelType, useGradients, nativeTextSupport, animate;

(function() {
  
  var ua = navigator.userAgent,
      iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
      typeOfCanvas = typeof HTMLCanvasElement,
      nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
      textSupport = nativeCanvasSupport 
        && (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
  //I'm setting this based on the fact that ExCanvas provides text support for IE
  //and that as of today iPhone/iPad current text support is lame
  labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
  nativeTextSupport = labelType == 'Native';
  useGradients = nativeCanvasSupport;
  animate = !(iStuff || !nativeCanvasSupport);
})();

var Log = {
  elem: false,
  write: function(text){
    if (!this.elem) 
      this.elem = document.getElementById('log');
    this.elem.innerHTML = text;
    this.elem.style.left = (500 - this.elem.offsetWidth / 2) + 'px';
  }
};


// add whatever functions we need on top of jQuery here.
(function ($) {
  
  $.infovis_FDG = function () {
    console.log("Info Vis FDG called");
    $("#infovis > .titlebar").text("Infovis Force Directed Graph");
    
    // did we get any args? if so, we will use the args to read in the correct data...
    
    var argv = arguments;
    var argc = argv ? argv.length : 0;
    if (argc) {
      var size = argv[argc-1];
    } else {
      var size = 0;  
    }
     
     $jit.ForceDirected.Plot.NodeTypes.implement({
        'circle': {
          'render': function(node, canvas) {
            
            /* original circle code, override this with our own circles if needed?
            var pos = node.pos.getc(true), 
            dim = node.getData('dim');
            this.nodeHelper.circle.render('fill', pos, dim, canvas);
            */
            var nconfig = this.node, dim = node.getData('dim'), p = node.pos.getc(true); 
            dim = nconfig.transform? dim * (1 - p.squaredNorm()) : dim; 
            
            //console.log('node',node);
            //p.$scale(node.scale);
             
            if (dim > 0.2) { 
              canvas.getCtx().fillStyle = node.getData('$color'); //'#000'; // <- background color
              canvas.getCtx().strokeStyle = '#000'; //'#000'; // <- background color 
              this.nodeHelper.circle.render('fill', p, dim, canvas); //<-fill the same color as the background 
              this.nodeHelper.circle.render('stroke', p, dim, canvas); //<- make circle 
            } 
        }, 
          //optional
          'contains': function(node, pos) {
            //return true if pos is inside the node or false otherwise
            
            var npos = node.pos.getc(true), 
            dim = node.getData('dim');
            return this.nodeHelper.circle.contains(npos, pos, dim);
          }
        }
      });
      
  $jit.ForceDirected.Plot.EdgeTypes.implement({
    'line': {
      'render': function(adj, canvas) {
        canvas.getCtx().globalCompositeOperation='destination-over';
        var from = adj.nodeFrom.pos.getc(true),
          to = adj.nodeTo.pos.getc(true);
          this.edgeHelper.line.render(from, to, canvas);
      }
    }
  }); 
      
    var fd = new $jit.ForceDirected({  
      //id of the visualization container  
      injectInto: 'infovis_graph',
      //Enable zooming and panning  
      //by scrolling and DnD  
      Navigation: {  
        enable: true,  
        //Enable panning events only if we're dragging the empty  
        //canvas (and not a node).  
        panning: 'avoid nodes',  
        zooming: 20 //zoom speed. higher is more sensible  
      },  
      // Change node and edge styles such as  
      // color and width.  
      // These properties are also set per node  
      // with dollar prefixed data-properties in the  
      // JSON structure.  
      Node: {  
        overridable: true,
        transform: false,
        lineWidth: 0.6,
      },  
      Edge: {  
        overridable: true,  
        color: '#999',  
        lineWidth: 0.4,
        type: 'line',
        canvasStyles: {}  
      },  
      //Native canvas text styling  
      Label: {  
        type: 'Native',//labelType, //Native or HTML  
        size: 10,  
        style: 'bold',
        color: '#333'
      },  
      //Add Tips  
      Tips: {  
        enable: true,  
        onShow: function(tip, node) {  
          //count connections  
          var count = 0;  
          node.eachAdjacency(function() { count++; });  
          //display node info in tooltip  
          tip.innerHTML = "<div class=\"tip-title\">" + node.name + "</div>"  
            + "<div class=\"tip-text\"><b>connections:</b> " + count + "</div>";  
        }  
      },  
      // Add node events  
      Events: {  
        enable: true, 
        type: 'Native',
        // D. Lazar added a right-click handler
        onRightClick : function(node, eventInfo, e) {
          if (typeof node === 'object') {
            // iterate all the nodes of the graph and remove selected ones
            if (node.selected) {
              node.eachAdjacency(function(adj){
                // hotrod the connected nodes 
                adj.nodeTo.setDataset(['current', 'end'], {
                  'color': ['#6260EC', "#f00"]
                });
              });
            }
            
            fd.graph.eachNode(function(n) { 
              if(n.id != node.id) delete n.selected;
              n.eachAdjacency(function(adj) {  
                adj.setDataset('end', {  
                  lineWidth: 0.4,  
                  color: '#999'  
                });  
              });  
            });
            
            if(!node.selected) {
              node.selected = true;
              node.eachAdjacency(function(adj){
                // hotrod the connected nodes 
                adj.nodeTo.setDataset(['current','end'], {
                  'color': ['#f00', '#6260EC']
                });
                
                adj.setDataset('end', {
                  lineWidth: 2,
                  color: '#f00'
                });
              });  
            } else {
              delete node.selected;
            } 
            
            fd.fx.animate({  
              modes: ['node-property:dim','edge-property:lineWidth:color'],  
              duration: 500  
            });  
          }    
        }, 
        //Change cursor style when hovering a node  
        onMouseEnter: function() {  
          fd.canvas.getElement().style.cursor = 'move';  
        },  
        onMouseLeave: function() {  
          fd.canvas.getElement().style.cursor = '';  
        },  
        //Update node positions when dragged  
        onDragMove: function(node, eventInfo, e) {  
          var pos = eventInfo.getPos();  
          node.pos.setc(pos.x, pos.y);  
          fd.plot();  
        },  
        //Implement the same handler for touchscreens  
        onTouchMove: function(node, eventInfo, e) {  
          $jit.util.event.stop(e); //stop default touchmove event  
          this.onDragMove(node, eventInfo, e);  
        },  
        //Add also a click handler to nodes  
        onClick: function(node) {  
          if(!node) return;  
          // Build the right column relations list.  
          // This is done by traversing the clicked node connections.  
          var html = "<h4>" + node.name + "</h4><b> connections:</b><ul><li>",  
              list = [];  
          node.eachAdjacency(function(adj){  
            list.push(adj.nodeTo.name);  
          });  
          //append connections information  
          $jit.id('inner-details').innerHTML = html + list.join("</li><li>") + "</li></ul>";  
        }  
      },  
      //Number of iterations for the FD algorithm  
      iterations: 200,  
      //Edge length  
      levelDistance: 130,  
      // Add text to the labels. This method is only triggered  
      // on label creation and only for DOM labels (not native canvas ones).  
      onCreateLabel: function(domElement, node){
        
//        domElement.innerHTML = node.name;  
//        var style = domElement.style;  
//        style.fontSize = "0.8em";  
//        style.color = "#333"; 
        
        
        // custom override to provide clickable labels
        var nameContainer = document.createElement('span'),  
          closeButton = document.createElement('span'),  
          style = nameContainer.style;  
        nameContainer.className = 'name';  
        nameContainer.innerHTML = node.name;  
        domElement.appendChild(nameContainer);  
        style.fontSize = "0.8em";  
        style.color = "#333";  
     //Toggle a node selection when clicking  
    //its name. This is done by animating some  
    //node styles like its dimension and the color  
    //and lineWidth of its adjacencies.  
    nameContainer.onclick = function() {  
      //set final styles  
      fd.graph.eachNode(function(n) {  
        if(n.id != node.id) delete n.selected;  
        //n.setData('dim', 7, 'end');  
        n.eachAdjacency(function(adj) {  
          adj.setDataset('end', {  
            lineWidth: 0.4,  
            color: '#999'  
          });  
        });  
      });  
      if(!node.selected) {  
        node.selected = true;  
        //node.setData('dim', 17, 'end');  
        node.eachAdjacency(function(adj) {  
          adj.setDataset('end', {  
            lineWidth: 2,  
            color: '#f00' // red  
          });  
        });  
      } else {  
        delete node.selected;  
      }  
      //trigger animation to final styles  
      fd.fx.animate({  
        modes: ['node-property:dim',  
                'edge-property:lineWidth:color'],  
        duration: 500  
      });  
      // Build the right column relations list.  
      // This is done by traversing the clicked node connections.  
      var html = "<h4>" + node.name + "</h4><b> connections:</b><ul><li>",  
          list = [];  
      node.eachAdjacency(function(adj){  
        if(adj.getData('alpha')) list.push(adj.nodeTo.name);  
      });  
      //append connections information  
      $jit.id('inner-details').innerHTML = html + list.join("</li><li>") + "</li></ul>";  
    };  
         
      },  
      // Change node styles when DOM labels are placed  
      // or moved.  
      onPlaceLabel: function(domElement, node){  
        console.log("Placing a label");
        // D. Lazar says "take into account the actual node info here!"
        var shim = parseInt(node.data.$dim * 1.5, 10);
        var style = domElement.style;  
        var left = parseInt(style.left);  
        var top = parseInt(style.top);  
        var w = domElement.offsetWidth; 
        style.left = (left - w / 2) + 'px';  
        style.top = (top + 30) + 'px';  
        style.display = '';  
      }  
    });  
    // load JSON data. 
     $.ajax({
       type: 'get',
       url: 'graph',
       dataType: 'json',
       data: {size: size},
       success: function (result) {
        if(result.data) {
          fd.loadJSON(JSON.parse(result.data));
          fd.computeIncremental({  
            iter: 100,  
            property: 'end',  
            onStep: function(perc){  
            Log.write(perc + '% loaded...');  
          },  
            onComplete: function(){  
            Log.write('done');  
            fd.animate({  
              modes: ['linear'],  
              transition: $jit.Trans.Elastic.easeOut,  
              duration: 2500  
            });
            //        if (fd.graph.hasNode('graphnode14')) {
            //            var node = fd.graph.getNode('graphnode14');
            //            console.log("We found a node graphnode14 ", node);
            //            node.setData('type','circle');
            //            node.setData('dim',60);
            //        }  
            }  
          });  
        }
      },
      failure: function (result) {
        console.log("Failed Ajax ", result);
      }
    });
      
    // compute positions incrementally and animate.
    
  }
  
})(jQuery);

// general onload function
$(function () {
    
  $("#loading").ajaxStart(function (){
    $(this).show();
  });

  $("#loading").ajaxStop(function (){
    $(this).hide();
  });
  
      
});

