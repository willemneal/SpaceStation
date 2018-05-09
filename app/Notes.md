### Ideas

Use a web service worker to run orbitdb.  It then acts as the queue for updates to the databases.

Each update then corresponds to a relevant actor.

If it is an update that needs to update the view, e.g. a message from a friend, then it calls into the application and send it the update.

However, there are other tasks that don't require accessing /updating the DOM.  These tasks could be run in other workers.


What is also really cool about the web service worker is that it can be a proxy to the application.  That is to say that it can requests that the application makes and remap them to the database filesystem abstraction.

Also the web workers have access to the indexDB and other
