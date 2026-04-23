from rest_framework.permissions import BasePermission


class HasRole(BasePermission):
    allowed_roles = set()

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        return getattr(user, "role", None) in self.allowed_roles


class IsCustomerUser(HasRole):
    allowed_roles = {"customer"}


class IsMerchantUser(HasRole):
    allowed_roles = {"merchant"}


class IsRiderUser(HasRole):
    allowed_roles = {"rider"}


class IsAdminUserRole(HasRole):
    allowed_roles = {"admin"}
