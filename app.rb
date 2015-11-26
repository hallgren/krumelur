require "sinatra"
enable :sessions
enable :protection
set :protection, except: :session_hijacking
use Rack::Deflater

#Cats
get "/" do
  if request.xhr?
    erb :body
  else
    erb :index
  end
end

#Todo
get "/todo" do
  
  @todos = todos
  if @todos.length == 0
    erb :todo_index_empty
  else
    @completed_count = completed.length
    @active_count = active.length
    @all_completed = all_completed? @todos
    @show_footer_and_toggle_all = todos.length > 0
    erb :todo_index
  end
end

get "/todo/?:route?/edit/:id" do
  
  @edit_id = params[:id]
  @route = params[:route]
  @todos = todos_based_on_route @route

  if request.xhr?
    erb :todos
  else
    @completed_count = completed.length
    @active_count = active.length
    @all_completed = all_completed? @todos
    @show_footer_and_toggle_all = todos.length > 0
    erb :todo_index
  end
end

get "/todo/?:route?/todos" do
  @route = params[:route]
  @todos = todos_based_on_route @route
  erb :todos
end

get "/todo/?:route?/footer" do
  @completed_count = completed.length
  @active_count = active.length
  @route = params[:route]
  @show_footer_and_toggle_all = todos.length > 0
  erb :footer
end

get "/todo/completed" do
  @todos = completed
  @route = "completed"
  @active_count = active.length
  @show_footer_and_toggle_all = todos.length > 0
  @completed_count = completed.length
  @all_completed = all_completed? todos
  erb :todo_index
end

get "/todo/active" do
  @todos = active
  @route = "active"
  @active_count = active.length
  @show_footer_and_toggle_all = todos.length > 0
  @completed_count = completed.length
  @all_completed = all_completed? todos
  erb :todo_index
end

post "/todo/?:route?/new_todo" do
  add_todo({:text => params[:title], :completed => false, :id => rand(36**8).to_s(36)})
  if request.xhr?
    @route = params[:route]
    @todos = todos_based_on_route @route
    erb :todos
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end

post "/todo/?:route?/destroy/:id" do
  destroy_todo(params[:id])
  if request.xhr?
    @route = params[:route]
    @todos = todos_based_on_route @route
    erb :todos
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end

get "/todo/toggle_all" do
  @todos = todos
  @all_completed = all_completed? @todos
  @show_footer_and_toggle_all = todos.length > 0
  erb :toggle_all
end

post "/todo/?:route?/complete/:id" do
  complete_todo params[:id]
  if request.xhr?
    @route = params[:route]
    @todos = todos_based_on_route @route
    erb :todos
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end

post "/todo/?:route?/reactivate/:id" do
  reactivate_todo params[:id]
  if request.xhr?
    @route = params[:route]
    @todos = todos_based_on_route @route
    erb :todos
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end

post "/todo/?:route?/edit/:id" do
  edit_todo params[:id], params[:text]
  if request.xhr?
    @route = params[:route]
    @todos = todos_based_on_route @route
    erb :todos
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end

post "/todo/?:route?/complete_all" do
  complete_all_todos
  if request.xhr?
    @route = params[:route]
    @all_completed = all_completed? todos
    @show_footer_and_toggle_all = todos.length > 0
    erb :toggle_all
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end

post "/todo/?:route?/reactivate_all" do
  reactivate_all_todos
  if request.xhr?
    @route = params[:route]
    @all_completed = all_completed? todos
    @show_footer_and_toggle_all = todos.length > 0
    erb :toggle_all
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end

post "/todo/?:route?/clear_completed" do
  clear_completed_todos
  if request.xhr?
    @completed_count = completed.length
    @active_count = active.length
    @route = params[:route]
    @todos = todos_based_on_route @route
    @show_footer_and_toggle_all = todos.length > 0
    erb :footer
  else
    redirect "/todo/#{params[:route]}" if params[:route]
    redirect "/todo"
  end
end


private

def no_todos
  []
end

def completed
  todos.select { |todo| todo[:completed] }
end

def active
  todos.select { |todo| !todo[:completed] }
end

def todos
  return session[:todos] unless session[:todos] == nil
  return []
  #[{:text => "not completed", :completed => false}, {:text => "completed", :completed => true}]
end

def todos_based_on_route route
  if route == "completed"
    return completed
  elsif route == "active"
    return active
  else
    return todos
  end
end

def add_todo todo
  session[:todos] = [] if session[:todos] == nil
  session[:todos] << todo
end

def destroy_todo id
  session[:todos].delete_if { |todo| todo[:id] == id } 
end

def complete_todo id
  todo = find_todo_by_id id
  todo[:completed] = true
end

def reactivate_todo id
  todo = find_todo_by_id id
  todo[:completed] = false
end

def edit_todo id, text
  todo = find_todo_by_id id
  todo[:text] = text
end

def find_todo_by_id id
  session[:todos].select { |todo| todo[:id] == id }.first
end

def all_completed? ts
  return true if ts.select { |todo| todo[:completed] == false }.empty?
  false
end

def complete_all_todos
  todos.map { |todo| todo[:completed] = true }
end

def reactivate_all_todos
  todos.map { |todo| todo[:completed] = false }
end

def clear_completed_todos
  todos.delete_if { |todo| todo[:completed] == true } 
end