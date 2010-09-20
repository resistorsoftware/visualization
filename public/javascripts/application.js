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

// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function() {
    var cache = {};

    this.tmpl = function tmpl(str, data) {
        // Figure out if we're getting a template, or if we need to
        // load the template - and be sure to cache the result.
        var fn = !/\W/.test(str) ?
      cache[str] = cache[str] ||
        tmpl(document.getElementById(str).innerHTML) :

        // Generate a reusable function that will serve as a template
        // generator (and which will be cached).
      new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +

        // Introduce the data as local variables using with(){}
        "with(obj){p.push('" +

        // Convert the template into pure JavaScript
str.replace(/[\r\t\n]/g, " ")
   .replace(/'(?=[^%]*%>)/g,"\t")
   .split("'").join("\\'")
   .split("\t").join("'")
   .replace(/<%=(.+?)%>/g, "',$1,'")
   .split("<%").join("');")
   .split("%>").join("p.push('")
   + "');}return p.join('');");
        // Provide some basic currying to the user
        return data ? fn(data) : fn;
    };
})();

if(typeof Nexalogy == 'undefined') {
  var Nexalogy = {
    Protovis: {
      nodes: []
    }
  };
}

// Anonymous function builds a nice machine with some private variables for your custom use
Nexalogy.utils = function () {
  
  // setup some graphing values we can use as defaults
  var fdgDefaults = {
    data: null,
    height: 0,
    width: 0,
    colors: "",
    title: "Protovis Force Directed Graph",
    iterations: 1000,
    springLength: 20,
    springDamping: 0.3,
    springConstant: 0.1
  }
  
  var json = [];
  var pid = '';
  var panel = null;       // a Protovis panel
  var nodes = null;       // Protovis  
  var graph = null;       // a panel with a graph added to it
  
  return {
      
      getGraph : function () {
        return graph;
      },
      
      setGraph : function (g) {
        graph = g;  
      },
      
      getPanel : function () {
        return panel;  
      },
      
      setPanel : function (p) {
        panel = p;  
      },
      
      getPID : function () {
        return pid;
      },    
      
      setPID : function (id) {
        pid = id;
      },
      
      setGraphDefaults : function (obj) {
          $.extend(fdgDefaults, obj);
      },
      
      getGraphDefaults : function () {
          return fdgDefaults;
      },
      
      // this is for the infovis demo
      getJson : function (size) {
        var size = size || 0;
        var data = [];
        $.ajax({
          type: 'get',
          url: 'graph',
          dataType: 'json',
          data: {size: size},
          success: function (result) {
            if(result.data) {
              data = JSON.parse(result.data);
            }
          },
          failure: function (result) {
            console.log("Failed Ajax ", result);
          }
        });
        return data;
      },
      
      // given a name, find the index of the matching node
      getJitNodeIndex : function (list, name) {
        var id = '';
        $.each(list, function (idx, val){
          console.log("Trying to match ", val.nodeName, name);
          if (val.nodeName === name) {
            id = val.id;
            return false;
          }
        })    
        return id;
      },
      
      // given a Jit formatted datafile, map it to the Protovis format
      jitMapToProtovis : function (input) {
        var graphData = {
          nodes: [],
          links: []
        }
        
        // first we push our nodes onto the node stack
        $.each(input, function (idx, val){
          graphData.nodes.push({
            id: idx,
            nodeName: val.name,
            group: "dodgerblue"
          });
        })
        
        $.each(input, function (idx, val){
          if(typeof val.adjacencies === 'object') {
            $.each(val.adjacencies, function (idx, adjacency){
              graphData.links.push({
                source: adjacency.nodeFrom,
                target: adjacency.nodeTo,
                value: adjacency.cij,
                //value: adjacency.kij * 100,
                kij: adjacency.kij,
                cij: adjacency.cij
              });  
            });
          }  
        });
        return graphData;
      }
  };
}();

// add whatever functions we need on top of jQuery here.
(function ($) {
  
  // given a source array of Objects, all referenced by a name "key", return the object found
  $.getProtovisProperty = function (source, key) {
    var obj = {};
    $.each(source, function (idx, val){
      // looking inside a $properties object... does the name match the key?
      if (val.name === key) {
        obj = val.value;  // this is the meat and potatoes of the $properties object
        return false;
      }
    });
    return obj;
  }
  
  // given a source array of Objects, find the one referenced by key, and set it's value
  $.setProtovisProperty = function (source, key, value) {
    $.each(source, function (idx, val){
      if (val.name === key) {
        val.value = value;
        return false;
      }
    });
  }
  
  $.nexalogy_setupTreemap = function () {
    if (typeof pv == 'undefined') {
      console.log("No Protovis object exists!");
      return false;
    }
    console.log("Nexalogy Treemap Application booted.", pv);
    $.ajax({
        type: 'get',
        url: 'sentiments',
        dataType: 'json',
        success: function (result) {
          if(result.data) {
            $.nexalogy_Treemap(result.data);
          }
        },
        failure: function (result) {
          console.log("Failed Ajax call for Treemap", result);
        }
      });    
  }
  
  $.nexalogy_Treemap = function (data) {
    console.log("Nexalogy Treemap data:", data);
    Nexalogy.utils.setGraphDefaults({
      height:500,
      width: 800,
      title: "Nexalogy Treemap of Sentiments",
      colors: pv.Colors.category19()
    });
    var graph = Nexalogy.utils.getGraphDefaults();
    $("#protovis > .titlebar").text(graph.title);

    function title(d) {
      return d.parentNode ? (title(d.parentNode) + "." + d.nodeName) : d.nodeName;
    }
        
    var re = "",
      color = pv.Colors.category19().by(function(d){
        return d.nodeName
      }),
      nodes = pv.dom(data).root("sentiments").nodes();
    
    var panel = new pv.Panel()
      .overflow(true)
      .canvas("protovis_graph")
      .width(graph.width)
      .height(graph.height)
      .fillStyle("white");
      
    var treemap = panel.add(pv.Layout.Treemap)
      .nodes(nodes)
      .round(true);

    treemap.leaf.add(pv.Panel)
//      .fillStyle(function(d){
//        return color(d).alpha(title(d).match(re) ? 1 : .2)
//      })
      .fillStyle(function(d) {
        // this is pretty primitive, but for now, will work...
        return color(d)
      })
      .strokeStyle("#000")
      .lineWidth(1)
      .event("click", $.treemapNodeClick)
      .antialias(false);

    treemap.label.add(pv.Label)
//      .textStyle(function(d){
//        pv.rgb(0, 0, 0, title(d).match(re) ? 1 : .2)
//      });

    panel.render();  
  }

  /**
   * treemapNodeClick 
   * If you click on a node, we know what node you clicked, so we can ask the server for more info
   * @param {treemap.leaf} node
   */  
  $.treemapNodeClick = function (node) {
    $.ajax({
        type: 'get',
        url: 'graph_query',
        dataType: 'json',
        data: {
          type: 'treemap',
          node: node.nodeName,
          value: node.nodeValue,
          index: node.index
        },
        success: function (result) {
          if(result.data) {
            console.log(result.data);
          }
        },
        failure: function (result) {
          console.log("Failed Ajax call for Treemap", result);
        }
      });    
  }
  
  $.nexalogy_FDG = function () {
    console.log("Nexalogy Application booted.", pv);
    var settings = Nexalogy.utils.getGraphDefaults();
    $("#protovis > .titlebar").text(settings.title);
    var panel = new pv.Panel()
      .overflow(false)
      .canvas("protovis_graph")
      .width(settings.width)
      .height(settings.height)
      .fillStyle("white")
      .transform(pv.Transform.identity.scale(3.0).translate(-450,-375))
      .event("mousedown", pv.Behavior.pan())
      .event("mousewheel", pv.Behavior.zoom(1));
    
    var force = panel.add(pv.Layout.Force).nodes(settings.data.nodes).links(settings.data.links);
    // you can really tweak the FDG algorithm here
    force.iterations(settings.iterations)
      .springDamping(settings.springDamping)
      .springLength(settings.springLength)
      .springConstant(settings.springConstant);
    force.link.add(pv.Line).lineWidth(function(node, link) { return Math.pow(link.linkValue,.5)}).strokeStyle("rgba(0,0,0,.2)");
    //force.link.add(pv.Line).lineWidth(function(node, link) { return Math.log(link.linkValue)}).strokeStyle("rgba(0,0,0,.2)");
    
    force.node.add(pv.Dot)
      .shapeSize(function(d) {return Math.pow(d.linkDegree, .5)})
      //.size(function(d) {return Math.log(d.linkDegree)})
      //.fillStyle(function(d) { return d.fix ? "brown" : graph.colors(d.group)})
      .fillStyle(function(d) { return d.fix ? "brown" : settings.colors(d.group)})
      .strokeStyle(function(){
        return this.fillStyle().darker();
      })
      .lineWidth(1)
      .event("mousedown", pv.Behavior.drag())
      .event("drag", force)
      .event("click", $.iterateNodes)
      .anchor("center").add(pv.Label)
      .text(function(d){return d.nodeName});
    panel.render();  
    Nexalogy.utils.setPanel(panel);
    Nexalogy.utils.setGraph(force);
  }
  
  $.iterateNodes = function (node) {
    var panel = Nexalogy.utils.getPanel();
    $.feedback("Node "+node.nodeName, "If there was something interesting about this keyword, I would now show you.");
    $.ajax({
      type: 'get',
      url: '/freebase',
      data: {keyword: node.nodeName},
      dataType: 'json',
      success: function(res) {
        console.log("result ", res);
        $(".dialog-content").html(tmpl("freebaseTemplate", res.data));
        $("#dialog-modal").dialog({
          resizable: true,
          height: 500,
          width: 600,
          closeOnEscape: true,
          title: node.nodeName,
          modal: true,
          overlay: { 
            opacity: 0.7, 
        } 
        });
        
      },
      failure: function (res){
        console.log("Failed to Freebase ", res);
      } 
    })
  }
  
  $.updateGraph = function (key, value) {
    var panel = Nexalogy.utils.getPanel();
    var layout = panel.children[0]; // kinda lame I know, but the first child of the panel is a Graph
    $.setProtovisProperty(layout.$properties, key, value);
    var nodes = $.getProtovisProperty(layout.$properties, "nodes");
    $.each(nodes, function (idx, val){
      val.x = NaN;
      val.y = NaN;
      val.px = NaN;
      val.py = NaN;
    });
    layout.reset();
    panel.render();  
  }
  
  $.fdgShow = function (data, title) {
    $("#protovis").show();
    $("#controls").show();
    $("#iterations_value").val(1000);
    $("#iterations_slider").slider({
      min: 0,
      max: 2000,
      step: 100,
      value: 1000,
      slide: function (event, ui) {
        var displayValue = (!ui.value)? 'off': ui.value;
        $("#iterations_value").val(displayValue);  
      },
      change: function (event, ui) {
        var iterations = (!ui.value)? null: parseInt(ui.value,10);
        $.updateGraph("iterations", iterations);
      }
    });
    
    $("#spring_length_value").val(20);
    $("#spring_length_slider").slider({
      min: 0,
      max: 200,
      step: 10,
      value: 20,
      slide: function (event, ui) {
        $("#spring_length_value").val(ui.value);  
      },
      change: function (event, ui){
        $.updateGraph("springLength", ui.value);
      }
    });
    
    $("#spring_damping_value").val(0.3);
    $("#spring_damping_slider").slider({
      min: 0,
      max: 1,
      step: 0.1,
      value: 0.3,
      slide: function (event, ui) {
        $("#spring_damping_value").val(ui.value);  
      },
      change: function (event, ui){
        $.updateGraph("springDamping", ui.value);
      }
    });  
    
    $("#spring_constant_value").val(0.1);
    $("#spring_constant_slider").slider({
      min: 0,
      max: 1,
      step: 0.1,
      value: 0.1,
      slide: function (event, ui) {
        $("#spring_constant_value").val(ui.value);  
      },
      change: function (event, ui){
        $.updateGraph("springConstant", ui.value);
      }
    });
    // since we want to hook up a bunch of sliders, we will for now just re-render a whole new graph to the canvas
    var obj = {
      data: data,
      iterations: 1000,
      springLength: 20,
      springDamping: 0.3,
      springConstant: 0.1,
      height:1000,
      width: 1200,
      title: title,
      colors: pv.Colors.category19()
    }
    // save these settings
    Nexalogy.utils.setGraphDefaults(obj);
    $.nexalogy_FDG();
  }
  
  $.getIcon = function (icon) {
    switch(icon) {
      case 'alert':
      case 'notice':
          return "/images/alert.png";
        break;
      case 'success': 
        return "/images/select.png";
      case 'error':
        return "/images/stop.png";
        break;
      default:
        return "/images/alert.png";
    }  
  }
  
  $.feedback = function (title, text, icon) {
    $.gritter.add({
      title: title,
      text: text,
      image: $.getIcon(icon),
      sticky: false,
      time: 4000
    });
    
  } 
      
})(jQuery);

// DOM ready functionality
$(function () {

  $("#protovis").hide();
  
  $("#show-protovis50").click(function () {
    $.fdgShow(Nexalogy.utils.jitMapToProtovis(Nexalogy.utils.FiftyNodeData.get()),"Relaxation Drink - 50 Nodes");
  });
  
  $("#show-protovis200").click(function () {
    $.fdgShow(Nexalogy.utils.jitMapToProtovis(Nexalogy.utils.TwoHundredNodeData.get()),"Relaxation Drink - 200 Nodes");
  });
  
  $("#show-sentiments").click(function () {
    $("#protovis").show();
    $("#controls").hide();
    $.nexalogy_setupTreemap();
  });
  
  $("#tone-analysis").click(function () {
     $("#controls").hide();
     $.ajax({
       type: 'get',
       dataType: 'json',
       url: '/tone',
       success: function(result) {
         console.log('Success: ', result);
       }
     })
  });
  
  $("#json2MySQL").click(function () {
    $.ajax({
      type: 'get',
      dataType: 'json',
      url: '/json2MySQL',
      success: function(result) {
        console.log('success');
      }
    })  
  });
  
  $("#loading").ajaxStart(function (){
    $(this).show();
  });

  $("#loading").ajaxStop(function (){
    $(this).hide();
  });

  
});

