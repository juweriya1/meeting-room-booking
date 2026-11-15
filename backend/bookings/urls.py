from django.urls import path
from bookings.views import RoomViewSet, BookingViewSet

room_list     = RoomViewSet.as_view({'get': 'list'})
room_detail   = RoomViewSet.as_view({'get': 'retrieve'})
booking_list  = BookingViewSet.as_view({'get': 'list', 'post': 'create'})
booking_detail = BookingViewSet.as_view({'get': 'retrieve'})
booking_cancel = BookingViewSet.as_view({'patch': 'cancel'})

urlpatterns = [
    path('rooms/',                    room_list),
    path('rooms/<int:pk>/',           room_detail),
    path('bookings/',                 booking_list),
    path('bookings/<int:pk>/',        booking_detail),
    path('bookings/<int:pk>/cancel/', booking_cancel),
]
