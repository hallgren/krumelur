window.onload = function(){
    bind();
};

var bind = function(){
    var new_todo_form = document.getElementById("form-new_todo");
    if (new_todo_form.addEventListener) {
        new_todo_form.addEventListener("submit", addNewTodo);
    } else if (new_todo_form.attachEvent) {
        new_todo_form.attachEvent("submit", addNewTodo);
    }

    if (window.addEventListener) {
        window.addEventListener("todo-list-update", updatePartials);
    } else if (window.attachEvent) {
        window.attachEvent("todo-list-update", updatePartials);
    }

    //var todo_destroy = document.getElementByClass("form-new_todo");

};

var reBind = function(){
    var new_todo_form = document.getElementById("form-new_todo");
    if (new_todo_form.removeEventListener) {
        new_todo_form.removeEventListener("submit", addNewTodo);
    } else if (new_todo_form.detachEvent) {
        new_todo_form.detachEvent("submit", addNewTodo);
    }

    if (window.removeEventListener) {
        window.removeEventListener("todo-list-update", updatePartials);
    } else if (window.detachEvent) {
        window.detachEvent("todo-list-update", updatePartials);
    }
    bind();
}

var updatePartials = function(event) {
    get("/todo/todos", function(html) {
      var todo_list = document.getElementById("todo-list");
      todo_list.innerHTML = html;
    });

    get("/todo/toggle_all", function(html) {
      var toggle_all = document.getElementById("toggle_all");
      toggle_all.innerHTML = html;
    });

    get("/todo/footer", function(html) {
      var foot = document.getElementById("foot");
      foot.innerHTML = html;
    });
};

var addNewTodo = function(event) {
    event.preventDefault();
    href = event.currentTarget.action
    post(href, "title="+event.target[0].value , function(html) {
      var customEvent = new CustomEvent('todo-list-update', {bubbles: true, cancelable: true});
      window.dispatchEvent(customEvent);
      
    });
    event.target[0].value = "";
    return false
};

var get = function(url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

    xhr.send();

    xhr.onreadystatechange = function () {
      var DONE = 4; // readyState 4 means the request is done.
      var OK = 200; // status 200 is a successful return.
      if (xhr.readyState === DONE) {
        if (xhr.status === OK) {
          callback(xhr.responseText);
          reBind();
        } else {
          console.log('Error: ' + xhr.status); // An error occurred during the request.
        }
      }
    };
};

var post = function(url, data, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

    xhr.send(data);

    xhr.onreadystatechange = function () {
      var DONE = 4; // readyState 4 means the request is done.
      var OK = 200; // status 200 is a successful return.
      if (xhr.readyState === DONE) {
        if (xhr.status === OK) {
          callback(xhr.responseText);
          reBind();
        } else {
          console.log('Error: ' + xhr.status); // An error occurred during the request.
        }
      }
    };
};