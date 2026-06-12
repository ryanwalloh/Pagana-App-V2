from django.contrib.contenttypes.models import ContentType

from .models import AuditLog


def record_audit(*, action_type, target, actor=None, source=AuditLog.Source.SYSTEM, reason="", metadata=None):
    metadata = metadata or {}
    target_content_type = ContentType.objects.get_for_model(target.__class__)
    return AuditLog.objects.create(
        actor=actor,
        action_type=action_type,
        source=source,
        reason=reason,
        metadata=metadata,
        target_content_type=target_content_type,
        target_object_id=str(target.pk),
        target_repr=str(target),
    )
