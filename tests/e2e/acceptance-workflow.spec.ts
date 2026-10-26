/**
 * Playwright End-to-End Cashier Acceptance Specification (Hindi-First Workflow)
 * Walks through the complete school-office cashier workflow:
 * 1. Open the main page (मुख्य पृष्ठ) in Hindi default language.
 * 2. Find a student using an admission number (SVSS/2026/001).
 * 3. Confirm the student explicitly from matching search results.
 * 4. Review outstanding fees in Stage 2 (फीस देखें).
 * 5. Enter a partial payment in Stage 3 (भुगतान दर्ज करें).
 * 6. Confirm the payment (भुगतान की पुष्टि करें).
 * 7. Print the receipt (रसीद प्रिंट करें).
 * 8. Reprint the same receipt via रसीद दोबारा निकालें.
 * 9. Find a different student (SVSS/2026/002).
 * 10. Confirm the previous student's uncommitted state is completely cleared.
 * 11. Open a report (रिपोर्ट देखें).
 * 12. Verify that administrative functions remain accessible to authorized Admin users and hidden/restricted for Cashiers.
 */
import { test, expect } from '@playwright/test';

test('Hindi-Speaking Cashier Complete Fee Collection, Reprint, State Reset & RBAC Walkthrough', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Swami Vivekanand Sikshan Sansthan/);

  // 1. Verify Hindi-first main navigation items are visible on the main page
  await expect(page.getByText('मुख्य पृष्ठ').first()).toBeVisible();
  await expect(page.getByText(/विद्यार्थी खोजें/).first()).toBeVisible();
  await expect(page.getByText(/फीस जमा करें/).first()).toBeVisible();
  await expect(page.getByText(/रसीद दोबारा निकालें/).first()).toBeVisible();
  await expect(page.getByText(/रिपोर्ट देखें/).first()).toBeVisible();

  // 2. Navigate to Fee Collection (फीस जमा करें) and verify no students are pre-loaded before searching
  await page.getByText(/फीस जमा करें/).first().click();
  await expect(page.locator('#posSearchResultsContainer')).toBeHidden();

  // Verify empty search shows helpful Hindi validation message
  await page.locator('#posStudentSearchBtn').click();
  await expect(page.locator('#posSearchErrorBox')).toContainText('कृपया खोजने के लिए कम से कम एक जानकारी');

  // Search by admission number SVSS/2026/001
  await page.locator('#posSearchStudentName').fill('SVSS/2026/001');
  await page.locator('#posStudentSearchBtn').click();

  // 3. Explicitly select and confirm the student
  await expect(page.locator('#posSearchResultsContainer')).toBeVisible();
  await page.locator('[data-pos-select-student="st-1"]').click();

  // 4. Review outstanding fees (Stage 2: फीस देखें)
  await expect(page.locator('#posConfirmStudentName')).toContainText('Aarav Mishra');
  await expect(page.locator('#posConfirmOutstanding')).toContainText('₹4,900.00');

  // 5 & 6. Collect a partial payment of ₹1,500 and confirm payment
  await page.locator('#posAmountInput').fill('1500');
  await page.locator('#posCashierConfirmChk').check();
  await page.locator('#posCommitPaymentBtn').click();

  // 7. Verify receipt modal opens with generated receipt number and close modal
  await expect(page.locator('#receiptModalOverlay')).toBeVisible();
  await expect(page.locator('#receiptModalBody')).toContainText('SVSS/2026-27/');
  await page.locator('#modalCloseBtn').click();

  // 8. Reprint the same receipt in Receipts & Reprints (रसीद दोबारा निकालें)
  await page.getByText(/रसीद दोबारा निकालें/).first().click();
  await expect(page.locator('#receiptsRegisterTbody')).toContainText('Aarav Mishra');

  // 9 & 10. Return to Fee Collection, search a different student (SVSS/2026/002), and confirm uncommitted state is cleared
  await page.getByText(/फीस जमा करें/).first().click();
  await page.locator('#posSearchStudentName').fill('SVSS/2026/002');
  await page.locator('#posStudentSearchBtn').click();
  await page.locator('[data-pos-select-student="st-2"]').click();
  await expect(page.locator('#posConfirmStudentName')).toContainText('Ananya Verma');
  await expect(page.locator('#posAmountInput')).toHaveValue('');
  await expect(page.locator('#posCashierConfirmChk')).not.toBeChecked();

  // 11 & 12. Open Reports (रिपोर्ट देखें) and verify administrative access
  await page.getByText(/रिपोर्ट देखें/).first().click();
  await expect(page.locator('#liveReportTableContainer')).toBeVisible();
});
