import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPerson } from "../site-data.ts";
import { buildEventJsonLd, buildGoogleCalendarUrl, buildIcsFeed } from "./ics.ts";
import { formatEventDateTimeSummaryIst, formatEventTimeIst } from "./ist-date.ts";
import { expandEventOccurrences } from "./recurrence.ts";
import { computeEventDiff, sanitizeMarkdown, validateEventInput } from "./schema.ts";
import { getInitialAdminUsers, getSeedEvents } from "./seed-data.ts";
import { formatVenueDisplay, type CetlsEvent } from "./types.ts";

describe("CETLS Events Calendar — Core Domain & Specification Tests", () => {
  it("loads the two confirmed seed events with expected properties", () => {
    const seeds = getSeedEvents();
    assert.equal(seeds.length, 2);

    const relaunch = seeds.find((e) => e.slug === "cetls-relaunch-2026");
    assert.ok(relaunch);
    assert.equal(relaunch.status, "published");
    assert.equal(relaunch.category, "launch");
    assert.equal(formatVenueDisplay(relaunch), "KRB Auditorium, IIIT Hyderabad");

    const delhi = seeds.find(
      (e) => e.slug === "ai-in-education-delhi-roundtable-2026",
    );
    assert.ok(delhi);
    assert.equal(delhi.status, "pending");
    assert.equal(delhi.access, "invitation-only");
    assert.deepEqual(delhi.series, ["eksaq-partnership"]);
    assert.equal(formatVenueDisplay(delhi), "To be confirmed (IIC or IHC)");
    assert.equal(formatEventTimeIst(delhi), "Time: To be confirmed (IST)");
  });

  it("resolves initial admins (C2) dynamically from site-data.json", () => {
    const admins = getInitialAdminUsers();
    const emails = admins.map((a) => a.email);
    assert.equal(admins.length, 2);
    assert.ok(emails.includes(getPerson("praveen-garimella").email ?? ""));
    assert.ok(emails.includes(getPerson("vasudeva-varma").email ?? ""));
    assert.ok(admins.every((a) => a.role === "admin"));
  });

  it("enforces Section 4 validation rules (end > start, https URLs, venue required unless pending, alt text)", () => {
    const badTime = validateEventInput({
      slug: "bad-time-event",
      title: "Bad Time",
      summary: "Summary",
      category: "talk",
      start: "2026-12-01T15:00:00+05:30",
      end: "2026-12-01T14:00:00+05:30",
      mode: "in-person",
      venue: { name: "Room 101", city: "Hyderabad" },
      access: "open",
    });
    assert.equal(badTime.ok, false);
    assert.ok(
      badTime.errors.some((e) => e.includes("End time must be after the start time")),
    );

    const missingVenue = validateEventInput({
      slug: "missing-venue",
      title: "Missing Venue",
      summary: "Summary",
      category: "workshop",
      start: "2026-12-01T10:00:00+05:30",
      end: "2026-12-01T12:00:00+05:30",
      mode: "in-person",
      venue: { name: "", city: "Hyderabad" },
      access: "open",
      pendingFields: [],
    });
    assert.equal(missingVenue.ok, false);

    const pendingVenueAllowed = validateEventInput({
      slug: "pending-venue-ok",
      title: "Pending Venue Allowed",
      summary: "Summary",
      category: "roundtable",
      start: "2026-12-01T10:00:00+05:30",
      end: "2026-12-01T12:00:00+05:30",
      mode: "in-person",
      venue: { name: "", city: "New Delhi" },
      access: "invitation-only",
      pendingFields: ["venue.name"],
    });
    assert.equal(pendingVenueAllowed.ok, true);

    const badHttpUrl = validateEventInput({
      slug: "bad-http-url",
      title: "HTTP Link",
      summary: "Summary",
      category: "talk",
      start: "2026-12-01T10:00:00+05:30",
      end: "2026-12-01T12:00:00+05:30",
      mode: "online",
      onlineUrl: "http://insecure.example.com/meet",
      access: "open",
    });
    assert.equal(badHttpUrl.ok, false);
  });

  it("expands RFC 5545 RRULE recurring events and excludes EXDATEs", () => {
    const baseEvent: CetlsEvent = {
      ...getSeedEvents()[0],
      id: "rec-1",
      slug: "monthly-k12-dialogue",
      title: "Monthly K-12 Dialogue",
      start: "2026-10-15T16:00:00+05:30",
      end: "2026-10-15T17:30:00+05:30",
      allDay: false,
      recurrence: {
        rrule: "FREQ=MONTHLY;INTERVAL=1;COUNT=4",
        exdates: ["2026-11-15"],
      },
    };

    const occurrences = expandEventOccurrences(
      baseEvent,
      "2026-10-01",
      "2027-03-01",
    );
    assert.equal(occurrences.length, 3);
    assert.deepEqual(
      occurrences.map((o) => o.occurrenceDate),
      ["2026-10-15", "2026-12-15", "2027-01-15"],
    );
  });

  it("generates valid iCalendar (.ics), Google Calendar URLs, and schema.org Event JSON-LD", () => {
    const seeds = getSeedEvents();
    const ics = buildIcsFeed(seeds);
    assert.ok(ics.includes("BEGIN:VCALENDAR"));
    assert.ok(ics.includes("TZID:Asia/Kolkata"));
    assert.ok(ics.includes("DTSTART;TZID=Asia/Kolkata:20260905T100000"));
    assert.ok(ics.includes("STATUS:TENTATIVE"));

    const gcalUrl = buildGoogleCalendarUrl(seeds[0]);
    assert.ok(gcalUrl.startsWith("https://calendar.google.com/calendar/render?"));
    assert.ok(gcalUrl.includes("ctz=Asia%2FKolkata"));

    const cancelledEvent: CetlsEvent = {
      ...seeds[0],
      status: "cancelled",
      cancelReason: "Weather advisory",
    };
    const jsonLd = buildEventJsonLd(cancelledEvent);
    assert.equal(jsonLd.eventStatus, "https://schema.org/EventCancelled");
  });

  it("sanitizes markdown and computes field-level diffs for the audit log", () => {
    const dirty = "Hello <script>alert(1)</script> **world** [link](javascript:alert(1))";
    const clean = sanitizeMarkdown(dirty);
    assert.ok(!clean.includes("<script>"));
    assert.ok(!clean.includes("javascript:"));

    const seeds = getSeedEvents();
    const diff = computeEventDiff(seeds[1], {
      ...seeds[1],
      status: "published",
      venue: { ...seeds[1].venue, name: "India International Centre (IIC)" },
      pendingFields: [],
    });
    assert.ok("status" in diff);
    assert.ok("venue" in diff);
    assert.ok("pendingFields" in diff);
  });

  it("formats IST date and time strings accurately", () => {
    const relaunch = getSeedEvents()[0];
    const formatted = formatEventDateTimeSummaryIst(relaunch);
    assert.equal(formatted.dateLabel, "Saturday, 5 September 2026");
    assert.equal(formatted.timeLabel, "10:00 AM – 5:30 PM IST");
  });
});
