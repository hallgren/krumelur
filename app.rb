require "sinatra"

get "/" do
  if request.xhr?
    erb :body
  else
    erb :index
  end
end
