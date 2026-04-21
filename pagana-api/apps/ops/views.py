from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.permissions import IsAdminUserRole
from apps.dispatch.serializers import DispatchAssignmentSerializer
from apps.orders.models import Order
from apps.ops.models import AuditLog
from apps.payments.models import PaymentAttempt

from .serializers import AuditLogSerializer, OpsReasonSerializer, PaymentAttemptOpsSerializer
from .services import (
    cancel_order_as_admin,
    reset_dispatch_assignment_as_admin,
    retrigger_dispatch_as_admin,
)


class AdminOpsContextMixin:
    permission_classes = [IsAuthenticated, IsAdminUserRole]

    def get_order(self):
        return get_object_or_404(Order, public_id=self.kwargs["public_id"])


class OpsOrderCancelView(AdminOpsContextMixin, APIView):
    def post(self, request, *args, **kwargs):
        serializer = OpsReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = cancel_order_as_admin(
            self.get_order(),
            actor=request.user,
            reason=serializer.validated_data.get("reason", ""),
        )
        return Response(
            {
                "public_id": str(order.public_id),
                "fulfillment_status": order.fulfillment_status,
            }
        )


class OpsDispatchRetriggerView(AdminOpsContextMixin, APIView):
    def post(self, request, *args, **kwargs):
        serializer = OpsReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = retrigger_dispatch_as_admin(
            self.get_order(),
            actor=request.user,
            reason=serializer.validated_data.get("reason", ""),
        )
        return Response(DispatchAssignmentSerializer(assignment).data)


class OpsDispatchResetView(AdminOpsContextMixin, APIView):
    def post(self, request, *args, **kwargs):
        serializer = OpsReasonSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assignment = reset_dispatch_assignment_as_admin(
            self.get_order(),
            actor=request.user,
            reason=serializer.validated_data.get("reason", ""),
        )
        return Response(DispatchAssignmentSerializer(assignment).data)


class OpsOrderPaymentsView(AdminOpsContextMixin, APIView):
    def get(self, request, *args, **kwargs):
        order = self.get_order()
        attempts = PaymentAttempt.objects.filter(order=order).order_by("-created_at")
        return Response(
            {
                "order_public_id": str(order.public_id),
                "payment_status": order.payment_status,
                "attempts": PaymentAttemptOpsSerializer(attempts, many=True).data,
            }
        )


class OpsOrderAuditView(AdminOpsContextMixin, APIView):
    def get(self, request, *args, **kwargs):
        order = self.get_order()
        order_ct = ContentType.objects.get_for_model(Order)
        payment_ct = ContentType.objects.get_for_model(PaymentAttempt)
        filters = [
            {"target_content_type": order_ct, "target_object_id": str(order.id)},
        ]

        attempt_ids = [str(attempt.id) for attempt in order.payment_attempts.all()]
        if attempt_ids:
            filters.append({"target_content_type": payment_ct, "target_object_id__in": attempt_ids})

        try:
            assignment = order.dispatch_assignment
        except Order.dispatch_assignment.RelatedObjectDoesNotExist:
            assignment = None
        if assignment:
            from apps.dispatch.models import DispatchAssignment, DispatchOffer

            assignment_ct = ContentType.objects.get_for_model(DispatchAssignment)
            offer_ct = ContentType.objects.get_for_model(DispatchOffer)
            filters.append(
                {
                    "target_content_type": assignment_ct,
                    "target_object_id": str(assignment.id),
                }
            )
            offer_ids = [str(offer.id) for offer in assignment.offers.all()]
            if offer_ids:
                filters.append(
                    {
                        "target_content_type": offer_ct,
                        "target_object_id__in": offer_ids,
                    }
                )

        query = AuditLog.objects.none()
        for filter_kwargs in filters:
            query = query | AuditLog.objects.filter(**filter_kwargs)

        logs = query.select_related("actor").order_by("-created_at")
        return Response(AuditLogSerializer(logs, many=True).data)
