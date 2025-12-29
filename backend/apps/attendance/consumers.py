import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class DashboardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope['user']
        if not self.user.is_authenticated:
            await self.close()
            return
        
        self.group_name = 'dashboard'
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'subscribe':
            # Подписка на дополнительные комнаты
            rooms = data.get('rooms', [])
            for room in rooms:
                await self.channel_layer.group_add(
                    room,
                    self.channel_name
                )

    async def employee_checkin(self, event):
        await self.send(text_data=json.dumps({
            'type': 'employee:checkin',
            'data': event
        }))

    async def employee_checkout(self, event):
        await self.send(text_data=json.dumps({
            'type': 'employee:checkout',
            'data': event
        }))

    async def employee_late(self, event):
        await self.send(text_data=json.dumps({
            'type': 'employee:late',
            'data': event
        }))

    async def dashboard_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'dashboard:update',
            'data': event
        }))

