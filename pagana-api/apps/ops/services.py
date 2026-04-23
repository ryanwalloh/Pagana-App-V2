from django.db import transaction
from rest_framework import serializers

from apps.dispatch.models import DispatchAssignment, DispatchOffer
from apps.dispatch.services import create_next_offer, trigger_dispatch_for_order
from apps.ops.audit import record_audit
from apps.orders.models import Order, OrderTimelineEvent


def cancel_order_as_admin(order, actor=None, reason=""):
    if order.fulfillment_status in {
        Order.FulfillmentStatus.DELIVERED,
        Order.FulfillmentStatus.CANCELLED,
    }:
        raise serializers.ValidationError("Order cannot be cancelled from its current state.")

    with transaction.atomic():
        order.fulfillment_status = Order.FulfillmentStatus.CANCELLED
        order.save(update_fields=["fulfillment_status", "updated_at"])

        assignment = DispatchAssignment.objects.select_related("rider").filter(order=order).first()
        if assignment:
            if assignment.rider_id:
                rider = assignment.rider
                rider.is_available = True
                rider.save(update_fields=["is_available", "updated_at"])
            assignment.status = DispatchAssignment.Status.CANCELLED
            assignment.save(update_fields=["status", "updated_at"])
            assignment.offers.filter(status=DispatchOffer.Status.PENDING).update(
                status=DispatchOffer.Status.EXPIRED
            )

        OrderTimelineEvent.objects.create(
            order=order,
            event_type="ops_order_cancelled",
            message="Operations cancelled the order.",
        )
        record_audit(
            action_type="ops.order.cancelled",
            target=order,
            actor=actor,
            source="api",
            reason=reason,
            metadata={"fulfillment_status": order.fulfillment_status},
        )

    return order


def retrigger_dispatch_as_admin(order, actor=None, reason=""):
    if order.fulfillment_status not in {
        Order.FulfillmentStatus.PREPARING,
        Order.FulfillmentStatus.READY_FOR_PICKUP,
    }:
        raise serializers.ValidationError("Dispatch can only be retriggered for preparing or ready orders.")
    if order.fulfillment_status == Order.FulfillmentStatus.CANCELLED:
        raise serializers.ValidationError("Cancelled orders cannot re-enter dispatch.")

    with transaction.atomic():
        assignment = DispatchAssignment.objects.filter(order=order).first()
        if assignment and assignment.status == DispatchAssignment.Status.ASSIGNED:
            raise serializers.ValidationError("Assigned orders must be reset before retriggering dispatch.")

        assignment = trigger_dispatch_for_order(order)
        OrderTimelineEvent.objects.create(
            order=order,
            event_type="ops_dispatch_retriggered",
            message="Operations retriggered dispatch for the order.",
        )
        record_audit(
            action_type="ops.dispatch.retriggered",
            target=assignment,
            actor=actor,
            source="api",
            reason=reason,
            metadata={"order_public_id": str(order.public_id)},
        )

    return assignment


def reset_dispatch_assignment_as_admin(order, actor=None, reason=""):
    with transaction.atomic():
        assignment = DispatchAssignment.objects.select_for_update().select_related("rider").filter(
            order=order
        ).first()
        if not assignment:
            raise serializers.ValidationError("Order does not have a dispatch assignment to reset.")

        if assignment.rider_id:
            rider = assignment.rider
            rider.is_available = True
            rider.save(update_fields=["is_available", "updated_at"])

        assignment.rider = None
        assignment.status = DispatchAssignment.Status.SEARCHING
        assignment.save(update_fields=["rider", "status", "updated_at"])
        assignment.offers.all().delete()
        create_next_offer(assignment)

        OrderTimelineEvent.objects.create(
            order=order,
            event_type="ops_dispatch_reset",
            message="Operations reset dispatch assignment for the order.",
        )
        record_audit(
            action_type="ops.dispatch.reset",
            target=assignment,
            actor=actor,
            source="api",
            reason=reason,
            metadata={"order_public_id": str(order.public_id)},
        )

    return assignment
