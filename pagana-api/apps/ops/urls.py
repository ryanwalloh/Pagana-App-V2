from django.urls import path

from .views import (
    OpsDispatchResetView,
    OpsDispatchRetriggerView,
    OpsOrderAuditView,
    OpsOrderCancelView,
    OpsOrderPaymentsView,
)

app_name = "ops"

urlpatterns = [
    path("ops/orders/<uuid:public_id>/cancel", OpsOrderCancelView.as_view(), name="ops-order-cancel"),
    path(
        "ops/orders/<uuid:public_id>/dispatch/retrigger",
        OpsDispatchRetriggerView.as_view(),
        name="ops-dispatch-retrigger",
    ),
    path(
        "ops/orders/<uuid:public_id>/dispatch/reset",
        OpsDispatchResetView.as_view(),
        name="ops-dispatch-reset",
    ),
    path("ops/orders/<uuid:public_id>/payments", OpsOrderPaymentsView.as_view(), name="ops-order-payments"),
    path("ops/orders/<uuid:public_id>/audit", OpsOrderAuditView.as_view(), name="ops-order-audit"),
]
