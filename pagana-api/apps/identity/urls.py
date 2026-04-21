from django.urls import path

from .views import LoginView, MeView, RefreshView, SignupView

app_name = "identity"

urlpatterns = [
    path("auth/signup", SignupView.as_view(), name="signup"),
    path("auth/login", LoginView.as_view(), name="login"),
    path("auth/refresh", RefreshView.as_view(), name="refresh"),
    path("me", MeView.as_view(), name="me"),
]
