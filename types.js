// ========================================================================
// Salary Calendar - Type definitions (JSDoc)
// Used for documentation + IDE autocomplete; runtime validation in store.js
// ========================================================================

/**
 * @typedef {'admin'|'employee'} Role
 */

/**
 * @typedef {'fixed'|'hourly'} SalaryMode
 */

/**
 * @typedef {Object} Employee
 * @property {string} id - UUID
 * @property {string} name
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} employeeId - Short code / ID number as string
 * @property {string} [designation]
 * @property {string} [department]
 * @property {string} [joiningDate] - ISO date string yyyy-mm-dd
 * @property {Role} role
 * @property {SalaryMode} salaryMode
 * @property {number} fixedSalary - Monthly gross for fixed mode
 * @property {number} hourlyRate - Rate per hour for hourly mode
 * @property {string} workStart - "HH:MM"
 * @property {string} workEnd - "HH:MM"
 * @property {number} salaryDay - 1-31 day of month salary is paid
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} AttendanceRecord
 * @property {string} id
 * @property {string} employeeId
 * @property {string} date - yyyy-mm-dd
 * @property {string|null} clockIn - ISO timestamp
 * @property {string|null} clockOut - ISO timestamp
 * @property {number} totalHours
 */

/**
 * @typedef {'casual'|'sick'|'personal'|'others'} LeaveType
 * @typedef {'full'|'half'} LeaveDuration
 */

/**
 * @typedef {Object} LeaveRecord
 * @property {string} id
 * @property {string} employeeId
 * @property {string} date - yyyy-mm-dd
 * @property {LeaveType} type
 * @property {LeaveDuration} duration
 * @property {string} [note]
 * @property {string} createdAt - ISO timestamp
 */

/**
 * @typedef {Object} PublicHoliday
 * @property {string} date - yyyy-mm-dd
 * @property {string} name
 */

/**
 * @typedef {Object} AppSettings
 * @property {0|1} weekStartsOn - 0 = Sunday, 1 = Monday
 * @property {number} defaultWorkingDays - Working days per month for per-day calc (default 22)
 * @property {number} otMultiplier - Overtime multiplier (default 1.5)
 * @property {boolean} otEnabled
 * @property {PublicHoliday[]} holidays
 * @property {string} currency - Display currency symbol (default "₹")
 */

/**
 * @typedef {Object} Session
 * @property {string|null} employeeId
 * @property {Role|null} role
 * @property {string|null} loggedInAt - ISO timestamp
 */

/**
 * @typedef {Object} SalaryBreakdown
 * @property {SalaryMode} mode
 * @property {number} base
 * @property {number} leaveDeduction
 * @property {number} regularPay
 * @property {number} overtimePay
 * @property {number} overtimeHours
 * @property {number} regularHours
 * @property {number} totalHours
 * @property {number} net
 * @property {number} perDayRate
 * @property {number} workingDays
 * @property {number} fullLeaves
 * @property {number} halfLeaves
 */
