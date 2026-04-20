from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

# Placeholder views for architecture visualization
# Full API views will be implemented during development


@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({'status': 'ok', 'message': 'Pagana API is running'})

