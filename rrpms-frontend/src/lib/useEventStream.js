import { useEffect, useRef } from 'react';
import { useToast } from './ToastContext';

export function useEventStream(onEvent) {
  const { addToast } = useToast();
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    // SSE stream endpoint relative to host (reverse proxied via Nginx /api/...)
    const eventSource = new EventSource('/api/v1/events/stream');

    const handleMessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const type = event.type || payload.type;

        // Trigger toast notification based on event type
        if (type === 'RETURN_INITIATED') {
          addToast('Return initiated successfully. Pickup is ready for scheduling.', 'success', 'Return Initiated');
        } else if (type === 'PICKUP_SCHEDULED') {
          addToast(`Doorstep pickup scheduled. AWB: ${payload.data?.awbNumber || 'Assigned'}`, 'milestone', 'Pickup Booked');
        } else if (type === 'PICKUP_CONFIRMED') {
          addToast('Driver has picked up the return parcel.', 'info', 'Package Handed Over');
        } else if (type === 'SHIPMENT_IN_TRANSIT') {
          addToast('Package is in transit to central warehouse hub.', 'info', 'In Transit');
        } else if (type === 'WAREHOUSE_RECEIVED') {
          addToast('Package inwarded at warehouse. QC inspection queued.', 'milestone', 'Warehouse Inwarded');
        } else if (type === 'QC_COMPLETED') {
          addToast(`QC Grade: ${payload.data?.conditionGrade || 'MINT'} — Restocking approved.`, 'success', 'Inspection Passed');
        } else if (type === 'REFUND_INITIATED') {
          addToast(`Refund of ₹${payload.data?.amount || ''} queued for disbursement.`, 'milestone', 'Refund Queued');
        } else if (type === 'REFUND_APPROVED') {
          addToast('Finance Manager approved refund payment.', 'success', 'Refund Approved');
        } else if (type === 'REFUND_CREDITED') {
          addToast(`₹${payload.data?.amount || ''} credited to original payment source.`, 'success', 'Refund Settled');
        } else if (type === 'FEEDBACK_SUBMITTED') {
          addToast(`Thank you for rating your return experience (${payload.data?.satisfactionRating || 10}/10)!`, 'success', 'Feedback Saved');
        }

        if (onEventRef.current) {
          onEventRef.current(type, payload.data);
        }
      } catch (err) {
        // silent json parse error on non-json heartbeats
      }
    };

    // Listen to standard named SSE events
    const eventTypes = [
      'RETURN_INITIATED',
      'PICKUP_SCHEDULED',
      'PICKUP_RESCHEDULED',
      'PICKUP_CONFIRMED',
      'SHIPMENT_IN_TRANSIT',
      'WAREHOUSE_RECEIVED',
      'QC_COMPLETED',
      'REFUND_INITIATED',
      'REFUND_APPROVED',
      'REFUND_CREDITED',
      'FEEDBACK_SUBMITTED'
    ];

    eventTypes.forEach(evt => {
      eventSource.addEventListener(evt, handleMessage);
    });

    eventSource.onerror = () => {
      // EventSource automatically reconnects on error
    };

    return () => {
      eventTypes.forEach(evt => {
        eventSource.removeEventListener(evt, handleMessage);
      });
      eventSource.close();
    };
  }, [addToast]);
}
