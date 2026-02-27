import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface SseEvent {
  type: 'event.received' | 'event.delivered' | 'event.failed' | 'event.processing';
  userId: string;
  data: {
    eventId: string;
    subscriptionId: string;
    eventType?: string | null;
    source?: string | null;
    status: string;
    attempts: number;
    lastError?: string | null;
    timestamp: string;
  };
}

@Injectable()
export class EventBusService {
  private subject = new Subject<SseEvent>();

  emit(event: SseEvent) {
    this.subject.next(event);
  }

  streamForUser(userId: string): Observable<SseEvent> {
    return this.subject.asObservable().pipe(
      filter((evt) => evt.userId === userId),
    );
  }
}
