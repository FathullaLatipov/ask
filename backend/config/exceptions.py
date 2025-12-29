from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)

def custom_exception_handler(exc, context):
    """
    Custom exception handler for REST API
    """
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'error': {
                'code': getattr(exc, 'code', 'ERROR'),
                'message': str(exc.detail) if hasattr(exc, 'detail') else str(exc),
            }
        }
        
        # Add validation errors details
        if hasattr(exc, 'detail') and isinstance(exc.detail, dict):
            custom_response_data['error']['details'] = exc.detail
        
        response.data = custom_response_data
    else:
        # Handle unexpected errors
        logger.error(f'Unexpected error: {exc}', exc_info=True)
        response = Response(
            {
                'error': {
                    'code': 'INTERNAL_ERROR',
                    'message': 'Внутренняя ошибка сервера'
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return response

