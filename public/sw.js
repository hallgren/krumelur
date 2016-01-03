var CACHE_NAME = 'my-site-cache-v4';
var urlsToCache = [
  '/todo.js'
];

self.addEventListener('install', function(event) {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  
  if (event.request.method == "POST") {

    event.waitUntil(
      caches.open(CACHE_NAME).then(function(cache) {
        debugger
        cache.delete("/todo")
        //cache.delete("/todo/active")
        //cache.delete("/todo/completed")
        
        
        
      })
    );
    
    var fetchRequest = event.request.clone();

    return fetch(fetchRequest).then(
      function(response) {
        
        debugger
        caches.open(CACHE_NAME)
        .then(function(cache) {
          cache.addAll(["/todo","/todo/active","/todo/completed"].map(function(urlToPrefetch) {
            return new Request(urlToPrefetch, {credentials: 'include'});
          })).then(function() {
            console.log('All resources have been fetched and cached.');
          });
        });

        return response;
      }
    );
  }
  else {
  //Cache check
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        console.log("cache hit");
        debugger
        if (response) {
          return response;
        }

        var fetchRequest = event.request.clone();

        //return fetch(event.request);
        return fetch(fetchRequest).then(
          function(response) {
            // Check if we received a valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have 2 stream.
            // var responseToCache = response.clone();

            // caches.open(CACHE_NAME)
            //   .then(function(cache) {
            //     cache.put(event.request, responseToCache);
            //   });

            return response;
          }
        );
      }
    )
  );
  }
});