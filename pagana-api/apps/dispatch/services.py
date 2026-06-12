from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.ops.audit import record_audit
from apps.orders.models import Order, OrderTimelineEvent

from .models import DispatchAssignment, DispatchOffer, RiderProfile


def eligible_riders():
    return RiderProfile.objects.select_related("user").filter(
        is_active=True,
        is_online=True,
        is_available=True,
        user__is_active=True,
    ).order_by("created_at", "id")


def create_next_offer(assignment, actor=None, reason=""):
    offered_rider_ids = set(assignment.offers.values_list("rider_id", flat=True))
    next_rider = eligible_riders().exclude(id__in=offered_rider_ids).first()
    if not next_rider:
        assignment.status = DispatchAssignment.Status.EXHAUSTED
        assignment.save(update_fields=["status", "updated_at"])
        OrderTimelineEvent.objects.create(
            order=assignment.order,
            event_type="dispatch_exhausted",
            message="Dispatch is still looking for an available rider.",
        )
        record_audit(
            action_type="dispatch.exhausted",
            target=assignment,
            actor=actor,
            source="system" if actor is None else "api",
            reason=reason,
            metadata={"order_public_id": str(assignment.order.public_id)},
        )
        return None

    offer = DispatchOffer.objects.create(
        assignment=assignment,
        rider=next_rider,
        sequence_number=assignment.offers.count() + 1,
    )
    assignment.status = DispatchAssignment.Status.OFFER_PENDING
    assignment.save(update_fields=["status", "updated_at"])
    OrderTimelineEvent.objects.create(
        order=assignment.order,
        event_type="dispatch_offer_created",
        message="Dispatch is offering this order to an available rider.",
    )
    record_audit(
        action_type="dispatch.offer.created",
        target=offer,
        actor=actor,
        source="system" if actor is None else "api",
        reason=reason,
        metadata={"order_public_id": str(assignment.order.public_id)},
    )
    return offer


def trigger_dispatch_for_order(order, actor=None, reason=""):
    assignment, created = DispatchAssignment.objects.get_or_create(order=order)
    if assignment.status in {
        DispatchAssignment.Status.OFFER_PENDING,
        DispatchAssignment.Status.ASSIGNED,
        DispatchAssignment.Status.COMPLETED,
    }:
        return assignment

    if assignment.rider_id:
        assignment.status = DispatchAssignment.Status.ASSIGNED
        assignment.save(update_fields=["status", "updated_at"])
        return assignment

    assignment.status = DispatchAssignment.Status.SEARCHING
    assignment.save(update_fields=["status", "updated_at"])
    create_next_offer(assignment, actor=actor, reason=reason)
    return assignment


def accept_offer(offer, rider_profile, reason=""):
    if offer.rider_id != rider_profile.id:
        raise serializers.ValidationError("Offer does not belong to the authenticated rider.")
    if offer.status != DispatchOffer.Status.PENDING:
        raise serializers.ValidationError("Only pending offers can be accepted.")

    with transaction.atomic():
        offer = DispatchOffer.objects.select_for_update().select_related(
            "assignment",
            "assignment__order",
            "rider",
        ).get(pk=offer.pk)
        assignment = offer.assignment
        if assignment.rider_id and assignment.rider_id != rider_profile.id:
            raise serializers.ValidationError("Assignment has already been accepted by another rider.")

        offer.status = DispatchOffer.Status.ACCEPTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])

        assignment.rider = rider_profile
        assignment.status = DispatchAssignment.Status.ASSIGNED
        assignment.save(update_fields=["rider", "status", "updated_at"])

        rider_profile.is_available = False
        rider_profile.save(update_fields=["is_available", "updated_at"])

        order = assignment.order
        assignment.offers.exclude(pk=offer.pk).filter(
            status=DispatchOffer.Status.PENDING
        ).update(status=DispatchOffer.Status.EXPIRED, responded_at=timezone.now())

        OrderTimelineEvent.objects.create(
            order=order,
            event_type="dispatch_offer_accepted",
            message="A rider has been assigned to the order.",
        )
        record_audit(
            action_type="dispatch.offer.accepted",
            target=offer,
            actor=rider_profile.user,
            source="api",
            reason=reason,
            metadata={"order_public_id": str(order.public_id)},
        )

    return assignment


def reject_offer(offer, rider_profile, reason=""):
    if offer.rider_id != rider_profile.id:
        raise serializers.ValidationError("Offer does not belong to the authenticated rider.")
    if offer.status != DispatchOffer.Status.PENDING:
        raise serializers.ValidationError("Only pending offers can be rejected.")

    with transaction.atomic():
        offer = DispatchOffer.objects.select_for_update().select_related(
            "assignment",
            "assignment__order",
        ).get(pk=offer.pk)
        assignment = offer.assignment

        offer.status = DispatchOffer.Status.REJECTED
        offer.responded_at = timezone.now()
        offer.save(update_fields=["status", "responded_at", "updated_at"])

        OrderTimelineEvent.objects.create(
            order=assignment.order,
            event_type="dispatch_offer_rejected",
            message="Dispatch is trying another available rider.",
        )
        record_audit(
            action_type="dispatch.offer.rejected",
            target=offer,
            actor=rider_profile.user,
            source="api",
            reason=reason,
            metadata={"order_public_id": str(assignment.order.public_id)},
        )
        create_next_offer(assignment, actor=None, reason=reason)

    return assignment


def update_rider_order_status(order, rider_profile, fulfillment_status, reason=""):
    try:
        assignment = order.dispatch_assignment
    except Order.dispatch_assignment.RelatedObjectDoesNotExist as exc:
        raise serializers.ValidationError("Order is not assigned to the authenticated rider.") from exc

    if assignment.rider_id != rider_profile.id:
        raise serializers.ValidationError("Order is not assigned to the authenticated rider.")

    allowed_transitions = {
        Order.FulfillmentStatus.READY_FOR_PICKUP: {Order.FulfillmentStatus.IN_TRANSIT},
        Order.FulfillmentStatus.IN_TRANSIT: {Order.FulfillmentStatus.ARRIVED},
        Order.FulfillmentStatus.ARRIVED: {Order.FulfillmentStatus.DELIVERED},
    }
    current = order.fulfillment_status
    if fulfillment_status not in allowed_transitions.get(current, set()):
        raise serializers.ValidationError("Invalid rider fulfillment transition.")

    order.fulfillment_status = fulfillment_status
    order.save(update_fields=["fulfillment_status", "updated_at"])

    if fulfillment_status == Order.FulfillmentStatus.DELIVERED:
        assignment.status = DispatchAssignment.Status.COMPLETED
        assignment.save(update_fields=["status", "updated_at"])
        rider_profile.is_available = True
        rider_profile.save(update_fields=["is_available", "updated_at"])

    OrderTimelineEvent.objects.create(
        order=order,
        event_type="rider_status_updated",
        message=f"Rider updated order status to {fulfillment_status}.",
    )
    record_audit(
        action_type="dispatch.rider.status_updated",
        target=order,
        actor=rider_profile.user,
        source="api",
        reason=reason,
        metadata={"fulfillment_status": fulfillment_status},
    )
    return order
