from django.core.cache import cache

class CacheInvalidateMixin:
    def get_cached(self, key, queryset_fn, serializer_class, ttl=60*5, many=True):
        cached = cache.get(key)

        if cached is not None:
            return cached
        
        data = queryset_fn()
        serialized = serializer_class(data, many=many).data if many else serializer_class(data).data
        cache.set(key, serialized, ttl)
        return cached
    
    def invalidate(self, *keys):
        cache.delete_many(keys)