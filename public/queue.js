var queue = {

  all: function(){
    return JSON.parse(localStorage.getItem("queue")) || []
  },

  push: function(item){
    var q = JSON.parse(localStorage.getItem("queue")) || [];
    q.push(item);

    localStorage.setItem("queue", JSON.stringify(q));    
  },

  splice: function(index) {
    var q = JSON.parse(localStorage.getItem("queue")) || [];
    q.splice(index, 1);

    localStorage.setItem("queue", JSON.stringify(q)); 
  },

  clear: function(){
    localStorage.setItem("queue", JSON.stringify([])); 
  },

  removeOnlineAction: function(){
    var q = JSON.parse(localStorage.getItem("queue"));
    q[0].onlineAction = null;
    localStorage.setItem("queue", JSON.stringify(q)); 
  }
};

var postDataFromQueueOnline = function(){
  
  var i = 0;
  var loopArray = function(arr) {
    // call itself
    postQueueItem(arr[i],function(){
        queue.splice(0); //Remove first item in queue

        i++;
        // any more items in array?
        if(i < arr.length) {
          loopArray(arr);   
        }
        else {
          var customEvent = new CustomEvent('todo-list-update', {bubbles: true, cancelable: true});
          window.dispatchEvent(customEvent);
        }
    }); 
  }

  function postQueueItem(queueItem,callback) {

    post(queueItem.href, "title="+queueItem.data.value+"&id="+queueItem.id, function(html){
      // do callback when ready
      callback();
    }, function(errorStatus){
      
      if (queueItem.onlineAction) {
        if (queueItem.onlineAction == "addNewTodo") {
          addNewTodoOffline({"currentTarget": {"action": queueItem.href, "method": queueItem.method}, "target": [{"value": queueItem.data.value}], "preventDefault": function(){}});
          queue.removeOnlineAction();
          var customEvent = new CustomEvent('offline', {bubbles: true, cancelable: true});
          window.dispatchEvent(customEvent);
        }
      }


      callback();
    });

  };


  var q = queue.all();
  if (q && q.length > 0) {
    loopArray(q);
  }
  
};