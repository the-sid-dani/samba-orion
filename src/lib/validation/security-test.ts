/**
 * XSS Prevention Security Tests
 *
 * Tests the comprehensive XSS prevention system with malicious input vectors
 * to ensure chart data validation prevents all security vulnerabilities.
 */

import {
  sanitizeChartTitle,
  sanitizeChartLabel,
  XSS_TEST_VECTORS,
} from "./xss-prevention";
import { CHART_VALIDATORS } from "./chart-data-validator";

// Test malicious chart data
export function testXSSPrevention(): {
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; error?: string }>;
} {
  const results: Array<{ test: string; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  // Test 1: Malicious chart titles
  console.log("🔒 Testing XSS Prevention in Chart Titles...");
  for (const xssVector of XSS_TEST_VECTORS) {
    try {
      sanitizeChartTitle(xssVector);
      results.push({
        test: `Title XSS: ${xssVector}`,
        passed: false,
        error: "Should have thrown error",
      });
      failed++;
    } catch (_error) {
      results.push({ test: `Title XSS: ${xssVector}`, passed: true });
      passed++;
    }
  }

  // Test 2: Malicious chart labels
  console.log("🔒 Testing XSS Prevention in Chart Labels...");
  for (const xssVector of XSS_TEST_VECTORS) {
    try {
      sanitizeChartLabel(xssVector);
      results.push({
        test: `Label XSS: ${xssVector}`,
        passed: false,
        error: "Should have thrown error",
      });
      failed++;
    } catch (_error) {
      results.push({ test: `Label XSS: ${xssVector}`, passed: true });
      passed++;
    }
  }

  // Test 3: Chart validator XSS prevention
  console.log("🔒 Testing Chart Validator XSS Prevention...");
  const maliciousChartData = {
    title: '<script>alert("XSS")</script>Malicious Chart',
    data: [
      {
        label: '<img src=x onerror=alert("XSS")>Attack Label',
        value: 100,
      },
    ],
  };

  const barValidation = CHART_VALIDATORS.bar(maliciousChartData);
  if (!barValidation.success) {
    results.push({ test: "Bar Chart XSS Prevention", passed: true });
    passed++;
  } else {
    results.push({
      test: "Bar Chart XSS Prevention",
      passed: false,
      error: "Malicious data was accepted",
    });
    failed++;
  }

  console.log(
    `🔒 XSS Prevention Test Results: ${passed} passed, ${failed} failed`,
  );
  return { passed, failed, results };
}

// Test safe chart data passes through
export function testSafeDataValidation(): {
  passed: number;
  failed: number;
  results: Array<{ test: string; passed: boolean; error?: string }>;
} {
  const results: Array<{ test: string; passed: boolean; error?: string }> = [];
  let passed = 0;
  let failed = 0;

  console.log("✅ Testing Safe Chart Data Validation...");

  const safeChartData = {
    title: "Q4 Sales Performance",
    data: [
      { label: "Revenue", value: 100000 },
      { label: "Profit", value: 25000 },
    ],
  };

  const pieValidation = CHART_VALIDATORS.pie(safeChartData);
  if (pieValidation.success && pieValidation.securityAudit.safe) {
    results.push({ test: "Safe Pie Chart Data", passed: true });
    passed++;
  } else {
    results.push({
      test: "Safe Pie Chart Data",
      passed: false,
      error: "Safe data was rejected",
    });
    failed++;
  }

  const safeBarData = {
    title: "Monthly Sales",
    data: [
      {
        xAxisLabel: "January",
        series: [{ seriesName: "Sales", value: 50000 }],
      },
    ],
  };

  const barValidation = CHART_VALIDATORS.bar(safeBarData);
  if (barValidation.success && barValidation.securityAudit.safe) {
    results.push({ test: "Safe Bar Chart Data", passed: true });
    passed++;
  } else {
    results.push({
      test: "Safe Bar Chart Data",
      passed: false,
      error: "Safe data was rejected",
    });
    failed++;
  }

  console.log(`✅ Safe Data Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed, results };
}

// Run all security tests
export function runAllSecurityTests(): void {
  console.log("🚀 Starting Comprehensive XSS Prevention Tests...\n");

  const xssResults = testXSSPrevention();
  const safeResults = testSafeDataValidation();

  const totalPassed = xssResults.passed + safeResults.passed;
  const totalFailed = xssResults.failed + safeResults.failed;
  const totalTests = totalPassed + totalFailed;

  console.log("\n📊 Final Security Test Summary:");
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${totalPassed}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Success Rate: ${Math.round((totalPassed / totalTests) * 100)}%`);

  if (totalFailed > 0) {
    console.log("\n❌ Failed Tests:");
    [...xssResults.results, ...safeResults.results]
      .filter((r) => !r.passed)
      .forEach((r) => console.log(`  • ${r.test}: ${r.error}`));
  }

  if (totalFailed === 0) {
    console.log(
      "\n🎉 ALL SECURITY TESTS PASSED! XSS prevention is working correctly.",
    );
  } else {
    console.log(
      `\n⚠️  ${totalFailed} security tests failed - review implementation.`,
    );
  }
}
