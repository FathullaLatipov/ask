from rest_framework import serializers
from .models import Request


class RequestSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.__str__', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.__str__', read_only=True)
    
    class Meta:
        model = Request
        fields = [
            'id', 'user', 'user_name', 'request_type', 'start_date', 'end_date',
            'amount', 'reason', 'status', 'reviewed_by', 'reviewed_by_name',
            'reviewed_at', 'review_comment', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'status', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']


class RequestApproveSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)


class RequestRejectSerializer(serializers.Serializer):
    comment = serializers.CharField(required=False, allow_blank=True)

