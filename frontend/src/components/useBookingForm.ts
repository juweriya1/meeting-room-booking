import { useState, useMemo } from 'react';
import { createBooking } from '../api';
import {
  parseDateTimeInZone,
  getNextQuarterHour,
  formatDateTimeInZone,
} from '../types';
import type { Booking, ApiError } from '../types';

export interface FormState {
  customer_name: string;
  customer_email: string;
  start_time: string;
  end_time: string;
}

interface UseBookingFormParams {
  roomId: number;
  initialStartTime?: string;
  initialEndTime?: string;
  timeZone?: string;
  onBookingCreated?: (booking: Booking) => void;
}

export function useBookingForm({
  roomId,
  initialStartTime,
  initialEndTime,
  timeZone,
  onBookingCreated,
}: UseBookingFormParams) {
  const activeTz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting]   = useState(false);
  const [apiError, setApiError]       = useState<{ status: number; detail: string } | null>(null);
  const [success, setSuccess]         = useState(false);

  // Compute clean initial quarter-hour boundary in active timezone
  const defaultTimes = useMemo(() => {
    if (initialStartTime) {
      if (initialEndTime) {
        return {
          start: initialStartTime,
          end: initialEndTime,
        };
      }
      try {
        const startUtc = new Date(parseDateTimeInZone(initialStartTime, activeTz));
        const oneHourLater = new Date(startUtc.getTime() + 60 * 60 * 1000);
        return {
          start: initialStartTime,
          end: formatDateTimeInZone(oneHourLater, activeTz),
        };
      } catch {
        // fallback
      }
    }
    const nextQ = getNextQuarterHour();
    const oneHourLater = new Date(nextQ.getTime() + 60 * 60 * 1000);
    return {
      start: formatDateTimeInZone(nextQ, activeTz),
      end: formatDateTimeInZone(oneHourLater, activeTz),
    };
  }, [initialStartTime, initialEndTime, activeTz]);

  const [form, setForm] = useState<FormState>(() => ({
    customer_name: '',
    customer_email: '',
    start_time: defaultTimes.start,
    end_time: defaultTimes.end,
  }));

  const currentDurationMins = useMemo(() => {
    if (!form.start_time || !form.end_time) return null;
    try {
      const s = new Date(parseDateTimeInZone(form.start_time, activeTz)).getTime();
      const e = new Date(parseDateTimeInZone(form.end_time, activeTz)).getTime();
      return Math.round((e - s) / (60 * 1000));
    } catch {
      return null;
    }
  }, [form.start_time, form.end_time, activeTz]);

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.customer_name.trim())  errs.customer_name  = 'Name is required.';
    if (!form.customer_email.trim()) errs.customer_email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.customer_email))
      errs.customer_email = 'Enter a valid email.';

    if (!form.start_time) {
      errs.start_time = 'Start time is required.';
    } else {
      try {
        const utcStart = parseDateTimeInZone(form.start_time, activeTz);
        if (new Date(utcStart).getTime() <= Date.now()) {
          errs.start_time = 'Start time must be in the future.';
        }
      } catch {
        errs.start_time = 'Please enter a valid start time.';
      }
    }

    if (!form.end_time) {
      errs.end_time = 'End time is required.';
    } else if (form.start_time && form.start_time >= form.end_time) {
      errs.end_time = 'End time must be strictly after start time.';
    } else if (form.start_time && form.end_time) {
      const startMs = new Date(parseDateTimeInZone(form.start_time, activeTz)).getTime();
      const endMs = new Date(parseDateTimeInZone(form.end_time, activeTz)).getTime();
      const diffMins = (endMs - startMs) / (1000 * 60);

      if (diffMins < 15) {
        errs.end_time = 'Booking duration must be at least 15 minutes.';
      } else if (diffMins > 24 * 60) {
        errs.end_time = 'Booking duration cannot exceed 24 hours.';
      }

      const startMin = parseInt(form.start_time.split('T')[1]?.split(':')[1] || '0', 10);
      const endMin = parseInt(form.end_time.split('T')[1]?.split(':')[1] || '0', 10);
      if (startMin % 15 !== 0) {
        errs.start_time = 'Start time must be aligned to a 15-minute interval (:00, :15, :30, :45).';
      }
      if (endMin % 15 !== 0) {
        errs.end_time = 'End time must be aligned to a 15-minute interval (:00, :15, :30, :45).';
      }
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((f) => {
      const next = { ...f, [name]: value };
      // Auto-advance end_time if start_time is set to or past existing end_time
      if (name === 'start_time' && value && next.end_time && value >= next.end_time) {
        try {
          const startUtc = new Date(parseDateTimeInZone(value, activeTz));
          const newEndUtc = new Date(startUtc.getTime() + 60 * 60 * 1000);
          next.end_time = formatDateTimeInZone(newEndUtc, activeTz);
        } catch {
          // ignore
        }
      }
      return next;
    });
    setFieldErrors((f) => ({ ...f, [name]: undefined }));
    setApiError(null);
  };

  const setDurationMinutes = (mins: number) => {
    if (!form.start_time) return;
    try {
      const startUtc = new Date(parseDateTimeInZone(form.start_time, activeTz));
      const endUtc = new Date(startUtc.getTime() + mins * 60 * 1000);
      setForm((f) => ({ ...f, end_time: formatDateTimeInZone(endUtc, activeTz) }));
      setFieldErrors((f) => ({ ...f, end_time: undefined }));
    } catch {
      // ignore
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const created = await createBooking({
        room: roomId,
        customer_name: form.customer_name,
        customer_email: form.customer_email,
        start_time: parseDateTimeInZone(form.start_time, activeTz),
        end_time: parseDateTimeInZone(form.end_time, activeTz),
      });
      setSuccess(true);
      onBookingCreated?.(created);
    } catch (err) {
      setApiError(err as ApiError);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    fieldErrors,
    submitting,
    apiError,
    success,
    activeTz,
    currentDurationMins,
    handleChange,
    setDurationMinutes,
    handleSubmit,
  };
}
