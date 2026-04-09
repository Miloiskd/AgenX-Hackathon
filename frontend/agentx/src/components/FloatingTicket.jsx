import { useEffect, useState } from 'react';
import './FloatingTicket.css';

const TICKET_TYPES = {
  error:      { color: 'error',      label: 'Error'      },
  success:    { color: 'success',    label: 'Success'    },
  pending:    { color: 'pending',    label: 'Pending'    },
  processing: { color: 'processing', label: 'Processing' },
};

export function FloatingTicket({ type, title, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  const cfg = TICKET_TYPES[type] || TICKET_TYPES.processing;

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay * 1000);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={`ft ft--${cfg.color} ${visible ? 'ft--visible' : ''}`}
      style={{ transitionDelay: `${delay}s` }}
    >
      <span className="ft__title">{title}</span>
    </div>
  );
}

export function TicketStream() {
  const tickets = [
    { type: 'error',      title: 'Payment failed #4521',    delay: 0   },
    { type: 'processing', title: 'Analyzing order #7832',   delay: 0.2 },
    { type: 'success',    title: 'Resolved: Shipping delay', delay: 0.4 },
    { type: 'pending',    title: 'Queue: Refund request',   delay: 0.6 },
    { type: 'processing', title: 'AI triaging #9104',       delay: 0.8 },
  ];

  return (
    <div className="ticket-stream">
      {tickets.map((t, i) => (
        <FloatingTicket key={i} {...t} />
      ))}
    </div>
  );
}