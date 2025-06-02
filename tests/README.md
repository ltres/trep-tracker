# Test Structure and Architecture

This directory contains the refactored E2E test suite for Trep Tracker, organized using best practices for maintainability and reliability.

## Architecture

### Page Object Model
- **`page-objects/trep-tracker.page.ts`**: Main page object containing all UI interactions and locators
- **`utils/test-helpers.ts`**: Utility classes and helper functions for common test operations

### Test Organization
- **`trep-tracker-refactored.spec.ts`**: Main test suite covering all core functionality
- **`additional-coverage.spec.ts`**: Extended test coverage for edge cases, performance, and accessibility
- **`trep-tracker.spec.ts`**: Original test file (deprecated, kept for reference)

## Key Improvements

### 1. Robust Selectors
- Replaced brittle CSS selectors with semantic, stable locators
- Used data attributes and meaningful class names where possible
- Implemented fallback strategies for dynamic content

### 2. Wait Strategies
- Replaced fixed `waitForTimeout()` calls with intelligent waiting
- Used `expectEventuallyVisible()`, `expectEventuallyCount()` for dynamic content
- Implemented `waitForStableDOM()` for complex UI updates

### 3. Test Helpers and Utilities
- **`TaskKeyboardActions`**: Centralized keyboard shortcuts for task management
- **`ChartTestHelpers`**: Specialized helpers for chart testing and data verification
- **`LaneTestHelpers`**: Lane manipulation and layout testing utilities
- **`GanttTestHelpers`**: Gantt chart interaction helpers

### 4. Configuration Management
- Centralized test configuration in `DEFAULT_CONFIG`
- Environment-specific settings extracted from test code
- Consistent delays and timeouts across all tests

### 5. Better Test Organization
- Grouped tests by functional areas using `test.describe()`
- Clear test naming conventions
- Logical test flow and dependencies

## Test Coverage Areas

### Core Functionality
- ✅ Task Management (CRUD operations)
- ✅ Task Relationships (parent-child, projects)
- ✅ Drag and Drop operations
- ✅ Status and Priority management
- ✅ Archiving and Unarchiving
- ✅ Tags and Filtering
- ✅ Board Management
- ✅ Search Functionality
- ✅ Date Management and Scheduling
- ✅ Gantt Chart Integration
- ✅ Similarity Detection
- ✅ Charts and Analytics

### Extended Coverage
- ✅ Error Handling and Edge Cases
- ✅ Keyboard Navigation and Shortcuts
- ✅ Data Persistence across reloads
- ✅ Performance with large datasets
- ✅ Accessibility testing
- ✅ Browser navigation (back/forward)
- ✅ Concurrent user actions
- ✅ Special characters and long content

## Running Tests

### Individual Test Suites
```bash
# Run main refactored test suite
npm run test-refactored

# Run additional coverage tests
npm run test-coverage

# Run all new tests
npm run test-all

# Run original tests (for comparison)
npm test
```

### Development and Debugging
```bash
# Run tests with Playwright UI for debugging
npm run test-gui

# Run specific test file
npx playwright test trep-tracker-refactored.spec.ts --headed

# Run specific test by name
npx playwright test -g "should move tasks up and down"
```

## Best Practices Implemented

### 1. Test Isolation
- Each test is independent and can run in parallel
- Proper setup and teardown in `beforeEach`
- No shared state between tests

### 2. Reliability
- Intelligent waiting strategies
- Retry mechanisms for flaky operations
- Robust error handling

### 3. Maintainability
- Page Object Model for UI abstraction
- Centralized configuration
- Reusable helper functions
- Clear test structure and naming

### 4. Performance
- Parallel test execution where possible
- Efficient locator strategies
- Minimal unnecessary waits

## Migration Guide

To migrate from the original test structure:

1. **Replace direct page interactions** with page object methods:
   ```typescript
   // Old
   await page.click('.new-task');
   
   // New
   await trepPage.newTaskButton.click();
   ```

2. **Use proper wait strategies**:
   ```typescript
   // Old
   await page.waitForTimeout(1000);
   
   // New
   await expectEventuallyVisible(element);
   ```

3. **Leverage helper classes**:
   ```typescript
   // Old
   await page.keyboard.press(metaKey + '+ArrowDown');
   
   // New
   await keyboardActions.moveTaskDown();
   ```

4. **Use configuration constants**:
   ```typescript
   // Old
   const nOfTasks = 2;
   
   // New
   DEFAULT_CONFIG.nOfTasks
   ```

## Future Enhancements

### Planned Improvements
- [ ] Visual regression testing
- [ ] API testing integration
- [ ] Cross-browser compatibility tests
- [ ] Mobile responsiveness tests
- [ ] Internationalization testing
- [ ] Performance benchmarking

### Test Data Management
- [ ] Test data factories for complex scenarios
- [ ] Database seeding for consistent test states
- [ ] Mock data generators

### CI/CD Integration
- [ ] Parallel test execution optimization
- [ ] Test result reporting
- [ ] Automatic screenshot capture on failures
- [ ] Test metrics and trends tracking

## Contributing

When adding new tests:

1. Follow the page object pattern
2. Use the established helper classes
3. Implement proper wait strategies
4. Group related tests with `test.describe()`
5. Add meaningful test descriptions
6. Consider edge cases and error scenarios

For more information on Playwright testing, see the [official documentation](https://playwright.dev/).