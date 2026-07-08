# TinyCache

A tiny in memory object cache for node. 

Items will expire after a ttl. 

Falsey values can not be stored due to the API using false as a return value for a missing cache item.

Create a cache with a 60 second ttl and a soft limit of 100 items. 
```
var cache = new TinyCache({timeout:60,limit:100})
```
Set an item
```
cache.set('some_id',45) // => 45
```
Get an item
```
var num = cache.get('some_id') // => 45
```
Delete an item, and return it.
```
var rem = cache.del('some_id') // => 45
```
Clear the cache
```
cache.drop()
cache.get('some_id') // => false
```
