var bindLink = function(){
    var new_todo_form = document.getElementById("form-new_todo");
    if (new_todo_form.addEventListener) {
        new_todo_form.addEventListener("submit", eventFunction);
    } else if (new_todo_form.attachEvent) {
        new_todo_form.attachEvent("submit", eventFunction);
    }

};

var eventFunction = function(element) {
    debugger
    element.preventDefault();
    href = element.currentTarget.action
    $.post(href, {"title": element.target[0].value} , function(data) {
      Reactize.applyDiffOnHTMLString(document.getElementById("todo-list"), data)
      $(window).trigger("todo-list-update");
    });
    $("#new-todo").val("");
    return false
    ajax(e.target.href);
};