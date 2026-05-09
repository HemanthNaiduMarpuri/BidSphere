from rest_framework import permissions

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        
        return obj.user == request.user
        
class IsUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return (request.user.is_authenticated and not request.user.is_auctioner and not request.user.is_superuser)
    
class IsAuctionOwner(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return (request.user.is_authenticated, request.user.is_auctioner)
    