from rest_framework import serializers
from .models import Attendance
from apps.users.serializers import UserSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.__str__', read_only=True)
    work_location_name = serializers.CharField(source='work_location.name', read_only=True)
    
    class Meta:
        model = Attendance
        fields = [
            'id', 'user', 'user_name', 'checkin_time', 'checkout_time',
            'checkin_photo_url', 'checkout_photo_url',
            'checkin_latitude', 'checkin_longitude',
            'checkout_latitude', 'checkout_longitude',
            'work_location', 'work_location_name',
            'is_late', 'late_minutes', 'face_verified', 'location_verified',
            'total_hours', 'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_hours']


class AttendanceCheckinSerializer(serializers.Serializer):
    photo_url = serializers.URLField(required=False, allow_null=True)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=False, allow_null=True)
    face_verified = serializers.BooleanField(default=False)
    location_verified = serializers.BooleanField(default=False)


class AttendanceCheckoutSerializer(serializers.Serializer):
    photo_url = serializers.URLField(required=False, allow_null=True)
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=False, allow_null=True)
    face_verified = serializers.BooleanField(default=False)


class CurrentStatusSerializer(serializers.Serializer):
    is_checked_in = serializers.BooleanField()
    checkin_time = serializers.DateTimeField(allow_null=True)
    hours_worked = serializers.DecimalField(max_digits=5, decimal_places=2)
    attendance_id = serializers.IntegerField(allow_null=True)

