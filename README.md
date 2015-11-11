Krumelux

# Setup
npm install
npm install -g browserify

# Build
browserify src/krumelux.js -o public/bundle.js

# Test
bundle install #Ruby sinatra webserver is used to host the test file
rackup
