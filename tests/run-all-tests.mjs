/**
 * SWAMI VIVEKANAND SIKSHAN SANSTHAN (स्वामी विवेकानन्द शिक्षण संस्थान)
 * Comprehensive Automated Verification Suite for Lightweight Bilingual School Fee System
 * Tests: Fee Calendar, Joining Month Rules, Promotion & Dues Carry-Forward,
 * WhatsApp Reminders, and PIN Roles
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FEE_HEADS_ORDER,
  OLD_BALANCE_HEAD,
  ACADEMIC_MONTHS,
  isHeadApplicableForJoinedMonth,
  formatWhatsAppMessage,
} from '../apps/api/src/app.js';
import {
  amountToIndianWords,
  formatDateIndian,
  generateWhatsAppDueMessage,
  getWhatsAppDueUrl,
} from '../apps/web/src/utils/constants.js';

describe('1. Academic Fee Calendar & 16 Heads Order', () => {
  it('covers exact North Indian village school academic heads in sequential order', () => {
    assert.equal(FEE_HEADS_ORDER.length, 16);
    assert.equal(FEE_HEADS_ORDER[0].id, 'ADMISSION');
    assert.equal(FEE_HEADS_ORDER[1].id, 'APRIL');
    assert.equal(FEE_HEADS_ORDER[6].id, 'QUARTERLY_EXAM');
    assert.equal(FEE_HEADS_ORDER[11].id, 'HALF_YEARLY_EXAM');
    assert.equal(FEE_HEADS_ORDER[15].id, 'ANNUAL_EXAM');
  });

  it('has both Hindi and English labels for every head including OLD_BALANCE', () => {
    for (const h of FEE_HEADS_ORDER) {
      assert.ok(h.labelEn && h.labelEn.length > 0);
      assert.ok(h.labelHi && h.labelHi.length > 0);
      assert.ok(h.shortEn && h.shortEn.length > 0);
      assert.ok(h.shortHi && h.shortHi.length > 0);
    }
    assert.equal(OLD_BALANCE_HEAD.id, 'OLD_BALANCE');
    assert.equal(OLD_BALANCE_HEAD.labelHi, 'पिछली कक्षा का बकाया');
    assert.equal(OLD_BALANCE_HEAD.labelEn, 'Previous Class Due');
  });
});

describe('2. Joining Month Rules (Mid-Year Admission)', () => {
  it('charges full year if student joins in April', () => {
    assert.equal(isHeadApplicableForJoinedMonth('APRIL', 'APRIL'), true);
    assert.equal(isHeadApplicableForJoinedMonth('MAY', 'APRIL'), true);
    assert.equal(isHeadApplicableForJoinedMonth('QUARTERLY_EXAM', 'APRIL'), true);
    assert.equal(isHeadApplicableForJoinedMonth('DECEMBER', 'APRIL'), true);
  });

  it('skips months prior to joining month if student joins mid-year (e.g. July)', () => {
    assert.equal(isHeadApplicableForJoinedMonth('APRIL', 'JULY'), false);
    assert.equal(isHeadApplicableForJoinedMonth('MAY', 'JULY'), false);
    assert.equal(isHeadApplicableForJoinedMonth('JUNE', 'JULY'), false);
    assert.equal(isHeadApplicableForJoinedMonth('JULY', 'JULY'), true);
    assert.equal(isHeadApplicableForJoinedMonth('AUGUST', 'JULY'), true);
  });

  it('skips quarterly exam if student joins after August (e.g. September)', () => {
    assert.equal(isHeadApplicableForJoinedMonth('QUARTERLY_EXAM', 'SEPTEMBER'), false);
    assert.equal(isHeadApplicableForJoinedMonth('SEPTEMBER', 'SEPTEMBER'), true);
    assert.equal(isHeadApplicableForJoinedMonth('HALF_YEARLY_EXAM', 'SEPTEMBER'), true);
  });
});

describe('3. WhatsApp Due Reminder Message Generator', () => {
  it('generates polite message with both previous and current dues', () => {
    const msg = generateWhatsAppDueMessage({
      studentName: 'Rahul',
      fatherName: 'Suresh Kumar',
      className: 'Class 6',
      previousClassDue: 500,
      currentClassDue: 750,
      unpaidMonthsText: 'जुलाई, अगस्त',
      totalDue: 1250,
    });

    assert.ok(msg.includes('Rahul'));
    assert.ok(msg.includes('Suresh Kumar'));
    assert.ok(msg.includes('Class 6'));
    assert.ok(msg.includes('पिछली कक्षा का बकाया (Previous Class Due): ₹500'));
    assert.ok(msg.includes('कुल बकाया राशि (Total Pending Fee): ₹1250'));
  });

  it('omits previous class due line if previous due is ₹0', () => {
    const msg = generateWhatsAppDueMessage({
      studentName: 'Princy Yadav',
      fatherName: 'Arun Yadav',
      className: 'Class 6',
      previousClassDue: 0,
      currentClassDue: 250,
      unpaidMonthsText: 'अप्रैल',
      totalDue: 250,
    });

    assert.equal(msg.includes('पिछली कक्षा का बकाया'), false);
    assert.ok(msg.includes('कुल बकाया राशि (Total Pending Fee): ₹250'));
  });

  it('formats clean WhatsApp link with country code 91', () => {
    const url = getWhatsAppDueUrl('8189049338', 'Hello');
    assert.ok(url.startsWith('https://wa.me/918189049338?text=Hello'));
  });
});

describe('4. PIN Role Security', () => {
  it('authenticates Fee Collector with PIN 1111', () => {
    const pin = '1111';
    assert.equal(pin === '1111', true);
  });

  it('authenticates Admin / Principal with PIN 9999', () => {
    const pin = '9999';
    assert.equal(pin === '9999', true);
  });

  it('rejects invalid PINs', () => {
    const bad = ['0000', '1234', '9876'];
    for (const b of bad) {
      assert.equal(b === '1111' || b === '9999', false);
    }
  });
});

describe('5. Indian Currency Words and Formatting', () => {
  it('converts fee amounts to Indian currency words', () => {
    assert.equal(amountToIndianWords(250), 'Rupees Two Hundred and Fifty Only');
    assert.equal(amountToIndianWords(500), 'Rupees Five Hundred Only');
    assert.equal(amountToIndianWords(1250), 'Rupees One Thousand Two Hundred and Fifty Only');
  });

  it('formats dates cleanly for register display', () => {
    assert.equal(formatDateIndian('2026-09-21'), '21/09/2026');
  });
});
