var editTemplate = function(id, value, route) { 
 
 return `<li class="editing">
  <div class="view">
  </div>
  <form class="form-edit" action="`+ route +`/edit/`+id+`" method="post">
    <input class="edit" type="text" name="title" value="`+value+`" autofocus/>
  </form>
  </li>`;

};

var todoTemplate = function(id, value, route) {


  return `<li id="`+id+`">
    <div class="view">
      <form></form>
      <a href="`+route+`/edit/`+id+`">
        <label class="edit_me">`+value+`</label>
      </a>
      <form action="`+route+`/destroy/`+id+`" method="post">
        <button class="destroy" name="id" value="`+value+`"></button>
      </form>
    </div>
    <form class="form-edit" action="`+route+`/edit/`+id+`" method="post">
      <input class="edit" type="text" name="title" value="`+value+`" />
    </form>
  </li>`;

};


var addNewTodoOffline = function(event) {
  event.preventDefault();
  var href = event.currentTarget.action;
  var method = event.currentTarget.method;
  var value = event.target[0].value;
  var id = "offline-" + Math.floor((Math.random() * 100) + 1);

  queue.push({"href": href, "method": method, "data": {"value": value}, "id": id});

  event.target[0].value = "";
  var html = todoTemplate(id, value, window.route);
  
  var div = document.createElement('div');
  div.innerHTML = html;
  var todos = document.getElementById("todo-list");
  todos.appendChild(div.firstElementChild);

  var new_todo = document.getElementById(id);

  if (new_todo.addEventListener) {
    new_todo.addEventListener("click", clickTodoOffline);
  } else if (new_todo.attachEvent) {
    new_todo.attachEvent("click", clickTodoOffline);
  }
};

var submitTodoOffline = function(event) {
  event.preventDefault();
  
  var element = event.currentTarget;
  var id = element.id;

  var href = event.target.action;
  var method = event.target.method;
  var value = event.target[0].value;

  queue.push({"href": href, "method": method, "data": {"value": value}, "id": id});

  if (element.removeEventListener) {
      element.addEventListener("submit", submitTodoOffline);
  } else if (element.detachEvent) {
      element.attachEvent("submit", submitTodoOffline);
  }
  var value = event.target[0].value;
  var html = todoTemplate(id, value, window.route);

  var div = document.createElement('div');
  div.innerHTML = html;
  var todos = document.getElementById("todo-list");
  element.parentNode.replaceChild(div.firstElementChild, element);

  var new_todo = document.getElementById(id);

  if (new_todo.addEventListener) {
    new_todo.addEventListener("click", clickTodoOffline);
  } else if (new_todo.attachEvent) {
      new_todo.attachEvent("click", clickTodoOffline);
  }
};

var clickTodoOffline = function(event) {
  event.preventDefault();
  
  var element = event.currentTarget;
  var id = event.currentTarget.id;
  
  if (event.target.className == 'edit_me') {
    var value = event.target.innerText;
    var html = editTemplate(id, value, window.route);
    event.currentTarget.innerHTML = html

    if (event.currentTarget.removeEventListener) {
        event.currentTarget.removeEventListener("click", clickTodoOffline);
        event.currentTarget.addEventListener("submit", submitTodoOffline);
    } else if (event.currentTarget.detachEvent) {
        event.currentTarget.detachEvent("click", clickTodoOffline);
        event.currentTarget.attachEvent("submit", submitTodoOffline);
    }
  }
  else if (event.target.className == "destroy") {
    if (event.currentTarget.removeEventListener) {
        event.currentTarget.removeEventListener("click", clickTodoOffline);
    } else if (event.currentTarget.detachEvent) {
        event.currentTarget.detachEvent("click", clickTodoOffline);
    }
    event.currentTarget.parentNode.removeChild(event.currentTarget);
    //remove all items in queue that relates to the offline-id

    var toBeDeleted = []
    var queueItems = queue.all();
    for (i = 0; i < queueItems.length; i++) { 
      if (queueItems[i].id == id) {
        toBeDeleted.push(i);
      }
    }

    //If no are to be deleted, push a delete item to the queue
    if (toBeDeleted.length == 0) {
      var href = event.target.form.action;
      var method = event.target.form.method;
      queue.push({"href": href, "method": method, "data": {}, "id": id});
    }

    while((index = toBeDeleted.pop()) != null){
      queue.splice(index);
    }
  }

};

window.addEventListener('offline',  function(){


  //Load offline footer
  var html = '<footer id="footer"><span><strong>OFFLINE</strong></span></footer>';
  var footerElement = document.getElementById("foot");
  footerElement.innerHTML = html;
  
  var new_todo_form = document.getElementById("form-new_todo");
  if (new_todo_form.removeEventListener) {
      new_todo_form.removeEventListener("submit", addNewTodo);
  } else if (new_todo_form.detachEvent) {
      new_todo_form.detachEvent("submit", addNewTodo);
  }


  if (new_todo_form.addEventListener) {
      new_todo_form.addEventListener("submit", addNewTodoOffline);
  } else if (new_todo_form.attachEvent) {
      new_todo_form.attachEvent("submit", addNewTodoOffline);
  }

  var toggle_all = document.getElementById("toggle_all");
  toggle_all.children[0].style.display = 'none';

  //Bind all todo´s click
  var todo_list = document.getElementById("todo-list");

  for (i = 0; i < todo_list.children.length; i++) { 
    if (todo_list.children[i]) {
      
      //Hide complete toggle form
      todo_list.children[i].children[0].children[0].style.display = 'none';

      if (todo_list.children[i].addEventListener) {
        todo_list.children[i].addEventListener("click", clickTodoOffline);
      } else if (todo_list.children[i].attachEvent) {
        todo_list.children[i].attachEvent("click", clickTodoOffline);
      }
    }
  }

});

window.addEventListener('online',  function(){
  
  var new_todo_form = document.getElementById("form-new_todo");
  if (new_todo_form.removeEventListener) {
      new_todo_form.removeEventListener("submit", addNewTodoOffline);
  } else if (new_todo_form.detachEvent) {
      new_todo_form.detachEvent("submit", addNewTodoOffline);
  }

  if (new_todo_form.addEventListener) {
      new_todo_form.addEventListener("submit", addNewTodo);
  } else if (new_todo_form.attachEvent) {
      new_todo_form.attachEvent("submit", addNewTodo);
  }


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
          var customEvent = new CustomEvent('offline-sync-done', {bubbles: true, cancelable: true});
          window.dispatchEvent(customEvent);
        }
    }); 
  }

  function postQueueItem(queueItem,callback) {

    post(queueItem.href, "title="+queueItem.data.value+"&id="+queueItem.id, function(html){
      // do callback when ready
      callback();
    }, function(){ return; });

  };

  var q = queue.all();
  if (q && q.length > 0) {
    loopArray(q);
  }
  else {
    //Make sure to update ui
    var customEvent = new CustomEvent('offline-sync-done', {bubbles: true, cancelable: true});
    window.dispatchEvent(customEvent);
  }
  

});