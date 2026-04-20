"""
Pagana API URL Configuration

This is a placeholder URL configuration for architecture visualization.
Full URL routing will be implemented during development.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # API endpoints (placeholder)
    # path('api/v1/', include('apps.users.urls')),
    # path('api/v1/', include('apps.core.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

