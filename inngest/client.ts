import { Inngest, EventSchemas } from 'inngest';
import type { FantascanEvents } from './types';

/**
 * Inngest client for Fantascan AI
 * Handles all background job processing for brand monitoring
 */
export const inngest = new Inngest({
  id: 'fantascan-ai',
  schemas: new EventSchemas().fromRecord<FantascanEvents>(),
});
