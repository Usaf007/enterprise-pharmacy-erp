from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('pharmacy_core.urls')), # Connects your React API endpoints!
]