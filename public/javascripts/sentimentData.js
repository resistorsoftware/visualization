/**
 * @author dlazar
 * @date August 27, 2010
 * 
 * Return JSON data with sentiments for plotting in a Treemap
 */

Nexalogy.utils.sentimentData = function () {
  
  var data = {};
  
  return {
    get : function () {
      $.ajax({
        type: 'get',
        url: 'sentiments',
        dataType: 'json',
        success: function (result) {
          if(result.data) {
            data = result.data; //JSON.parse(result.data);
            console.log("Success!", data);
          }
        },
        failure: function (result) {
          console.log("Failed Ajax ", result);
        }
      });
      return data;  
    }  
  }
  
}();
