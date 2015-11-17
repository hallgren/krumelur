require "sinatra"
use Rack::Deflater

get "/" do
  if request.xhr?
    erb :body
  else
    erb :index
  end
end
