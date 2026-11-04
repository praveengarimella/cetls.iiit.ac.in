import rawEvents from "../../../data/events.json" with { type: "json" };
import { getPerson } from "../site-data.ts";
import type { CetlsEvent, EventUserRole } from "./types.ts";

export interface EventsJsonDocument {
  version: string;
  timezone: string;
  coverageStart: string;
  coverageEnd: string;
  events: CetlsEvent[];
}

export const eventsJsonSnapshot = rawEvents as unknown as EventsJsonDocument;

export function getSeedEvents(): CetlsEvent[] {
  return eventsJsonSnapshot.events;
}

export function getInitialAdminUsers(): Array<{
  email: string;
  name: string;
  role: EventUserRole;
}> {
  const admins = ["praveen-garimella", "vasudeva-varma"] as const;
  const result: Array<{ email: string; name: string; role: EventUserRole }> = [];

  for (const personId of admins) {
    const person = getPerson(personId);
    if (person.email) {
      const displayName = person.honorific
        ? `${person.honorific} ${person.name}`
        : person.name;
      result.push({
        email: person.email.toLowerCase().trim(),
        name: displayName,
        role: "admin",
      });
    }
  }
  return result;
}
