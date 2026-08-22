/**
 * Tests for js/config-actions.js — specifically the Copy Flow XML
 * silent-injection of Boolean defaults.
 *
 * Background:
 *   A blank Boolean in Flow is null (not false), and the LWC's @api
 *   Boolean reads null as false. That means every prop with
 *   default="true" in meta.xml is silently OFF when a Flow XML file
 *   omits it. addBool now falls back to BOOL_DEFAULTS[componentType]
 *   so the generated Flow XML always stamps a value for every load-
 *   bearing Boolean.
 *
 * Run: node --test js/tests/config-actions.test.js
 */
const test = require('node:test');
const assert = require('node:assert');
const { buildFlowXml, BOOL_DEFAULTS } = require('../config-actions');

/**
 * Regex helper: assert an <inputParameters> block exists for the named
 * prop with the named boolean value. Matches across the whitespace
 * variations the generator emits.
 */
function assertBoolStamp(xml, name, value, msg) {
    const re = new RegExp(
        '<name>' + name + '</name>[\\s\\S]*?<booleanValue>' + (value ? 'true' : 'false') + '</booleanValue>'
    );
    assert.match(xml, re, msg || `expected ${name}=${value} in generated Flow XML`);
}

function assertNotStamped(xml, name, msg) {
    const re = new RegExp('<name>' + name + '</name>');
    assert.doesNotMatch(xml, re, msg || `expected ${name} to be absent from Flow XML`);
}

/* ─── Dates wrapper ─── */

test('Dates: minimal config stamps every default-true Boolean', () => {
    const cfg = {
        Component_Type__c: 'Dates',
        Related_Object__c: 'Appointment__c',
        Date_Field__c: 'Appt_Date__c'
    };
    const xml = buildFlowXml(cfg, 'Dates', 'Test_Basic');

    // Load-bearing default-true Booleans that were previously silent OFF
    assertBoolStamp(xml, 'showRecurringPattern', true);
    assertBoolStamp(xml, 'showSelectedSummary', true);
    assertBoolStamp(xml, 'allowPastDates', true);
    assertBoolStamp(xml, 'preloadExistingDates', true);
    assertBoolStamp(xml, 'enableEditMode', true);
    assertBoolStamp(xml, 'appendDateTimeToName', true);

    // Default-false Booleans should also be stamped explicitly (so admins
    // see them + know they're off, and so a future default flip is safe).
    assertBoolStamp(xml, 'twoMonthView', false);
    assertBoolStamp(xml, 'weekStartsOnMonday', false);
    assertBoolStamp(xml, 'autoJumpToFirstAvailable', false);
});

test('Dates: explicit false in config overrides the true default', () => {
    const cfg = {
        Component_Type__c: 'Dates',
        Related_Object__c: 'Appointment__c',
        Show_Selected_Summary__c: false,   // admin turned it off
        Allow_Past_Dates__c: false
    };
    const xml = buildFlowXml(cfg, 'Dates', 'Test_Explicit_False');

    assertBoolStamp(xml, 'showSelectedSummary', false);
    assertBoolStamp(xml, 'allowPastDates', false);
    // Others still take the default
    assertBoolStamp(xml, 'showRecurringPattern', true);
});

test('Dates: explicit true in config passes through', () => {
    const cfg = {
        Component_Type__c: 'Dates',
        Related_Object__c: 'Appointment__c',
        Two_Month_View__c: true     // override default false
    };
    const xml = buildFlowXml(cfg, 'Dates', 'Test_TwoMonth');
    assertBoolStamp(xml, 'twoMonthView', true);
});

/* ─── DateTime wrapper ─── */

test('DateTime: minimal config stamps default-true + DateTime-specific Booleans', () => {
    const cfg = {
        Component_Type__c: 'DateTime',
        Related_Object__c: 'Schedule__c',
        Date_Field__c: 'Schedule_Date__c'
    };
    const xml = buildFlowXml(cfg, 'DateTime', 'Test_DT');

    // Shared true defaults
    assertBoolStamp(xml, 'showRecurringPattern', true);
    assertBoolStamp(xml, 'showSelectedSummary', true);
    assertBoolStamp(xml, 'allowPastDates', true);
    assertBoolStamp(xml, 'preloadExistingDates', true);
    assertBoolStamp(xml, 'enableEditMode', true);

    // DateTime-specific
    assertBoolStamp(xml, 'enableEndTime', true);
    assertBoolStamp(xml, 'allowDifferentTimes', false);
    assertBoolStamp(xml, 'consolidateTimeSpan', false);
    assertBoolStamp(xml, 'timeGridOnly', false);
});

/* ─── Booking wrapper ─── */

test('Booking: minimal config stamps default-true + Booking-specific Booleans', () => {
    const cfg = {
        Component_Type__c: 'Booking',
        Related_Object__c: 'Schedule__c',
        Resource_Object__c: 'Resource__c'
    };
    const xml = buildFlowXml(cfg, 'Booking', 'Test_Book');

    // Shared true defaults
    assertBoolStamp(xml, 'showRecurringPattern', true);
    assertBoolStamp(xml, 'showSelectedSummary', true);
    assertBoolStamp(xml, 'preloadExistingDates', true);
    assertBoolStamp(xml, 'enableEditMode', true);

    // Booking-specific
    assertBoolStamp(xml, 'showAvailabilityCount', true);
    assertBoolStamp(xml, 'allowMultipleResources', false);
    assertBoolStamp(xml, 'disableTimeSlotGrid', false);

    // Booking's allowPastDates DEFAULTS FALSE (unlike Dates/DateTime — a
    // booking calendar for the future shouldn't include past dates by
    // default). Regression guard: don't drift back to true.
    assertBoolStamp(xml, 'allowPastDates', false);
});

/* ─── Cross-cutting ─── */

test('BOOL_DEFAULTS is exported and matches expected keys per component', () => {
    assert.ok(BOOL_DEFAULTS.Dates, 'Dates map present');
    assert.ok(BOOL_DEFAULTS.DateTime, 'DateTime map present');
    assert.ok(BOOL_DEFAULTS.Booking, 'Booking map present');

    // Every emit-able Boolean from buildInputParams must be represented
    // for its component (or intentionally omitted). Spot-check the
    // load-bearing ones so a rename catches this.
    ['showRecurringPattern', 'showSelectedSummary', 'twoMonthView', 'preloadExistingDates'].forEach(function (k) {
        assert.ok(k in BOOL_DEFAULTS.Dates, `Dates missing ${k}`);
        assert.ok(k in BOOL_DEFAULTS.DateTime, `DateTime missing ${k}`);
        assert.ok(k in BOOL_DEFAULTS.Booking, `Booking missing ${k}`);
    });

    ['enableEndTime'].forEach(function (k) {
        assert.ok(k in BOOL_DEFAULTS.DateTime, `DateTime missing ${k}`);
        assert.ok(!(k in BOOL_DEFAULTS.Booking), `Booking should NOT list ${k} (not exposed there)`);
    });

    ['showAvailabilityCount', 'allowMultipleResources', 'disableTimeSlotGrid'].forEach(function (k) {
        assert.ok(k in BOOL_DEFAULTS.Booking, `Booking missing ${k}`);
        assert.ok(!(k in BOOL_DEFAULTS.Dates), `Dates should NOT list ${k}`);
    });
});

test('Unknown component type skips Boolean stamping (no crash)', () => {
    // Guard: an unknown type shouldn't blow up — fallback path just skips.
    const cfg = { Component_Type__c: 'Dates', Related_Object__c: 'Appointment__c' };
    // Force componentType to something unknown
    const xml = buildFlowXml(cfg, 'Nonexistent', 'Test_Bad');
    // XML should still generate (falls through to Dates/DateTime branch)
    assert.match(xml, /<Flow xmlns=/);
    // No Boolean stamps since the type map wasn't found
    assertNotStamped(xml, 'showSelectedSummary');
});

test('Output is a Dates/DateTime flow when componentType != Booking', () => {
    const cfg = { Component_Type__c: 'Dates', Related_Object__c: 'Appointment__c' };
    const xml = buildFlowXml(cfg, 'Dates', 'Test_Basic');
    // Sanity: the generator ran the Dates branch
    assert.match(xml, /mdpick:multiDatePickDates/);
    assert.match(xml, /<Flow xmlns=/);
});

test('Output is a Booking flow when componentType is Booking', () => {
    const cfg = { Component_Type__c: 'Booking', Related_Object__c: 'Schedule__c' };
    const xml = buildFlowXml(cfg, 'Booking', 'Test_Book');
    assert.match(xml, /mdpick:multiDatePickBooking/);
});
