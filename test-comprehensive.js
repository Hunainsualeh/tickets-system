// Comprehensive API Test Script
// Tests all endpoints including auth, users, branches, and tickets

const API_URL = 'http://localhost:3000';

let adminToken = '';
let userToken = '';
let testUserId = '';
let testBranchId = '';
let testTicketId = '';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, symbol, message) {
  console.log(`${color}${symbol} ${message}${colors.reset}`);
}

async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (error) {
    return { 
      status: 0, 
      ok: false, 
      error: error.message,
      data: { error: error.message } 
    };
  }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Admin Login
async function testAdminLogin() {
  log(colors.cyan, '🔐', 'Test 1: Admin Login');
  
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
    }),
  });

  if (result.ok && result.data.token) {
    adminToken = result.data.token;
    log(colors.green, '✓', 'Admin login successful');
    log(colors.blue, '  ', `Role: ${result.data.user.role}`);
    log(colors.blue, '  ', `Token: ${adminToken.substring(0, 30)}...`);
    return true;
  } else {
    log(colors.red, '✗', `Admin login failed: ${result.data.error}`);
    if (result.status === 0) {
      log(colors.yellow, '⚠', 'Database may not be initialized. Run: npm run db:push && npm run db:seed');
    }
    return false;
  }
}

// Test 2: User Login
async function testUserLogin() {
  log(colors.cyan, '🔐', 'Test 2: User Login');
  
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'john_doe',
      password: 'user123',
    }),
  });

  if (result.ok && result.data.token) {
    userToken = result.data.token;
    log(colors.green, '✓', 'User login successful');
    log(colors.blue, '  ', `Username: ${result.data.user.username}`);
    log(colors.blue, '  ', `Role: ${result.data.user.role}`);
    return true;
  } else {
    log(colors.red, '✗', `User login failed: ${result.data.error}`);
    return false;
  }
}

// Test 3: Invalid Login
async function testInvalidLogin() {
  log(colors.cyan, '🔐', 'Test 3: Invalid Login (Should Fail)');
  
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'invalid_user',
      password: 'wrong_password',
    }),
  });

  if (!result.ok && result.status === 401) {
    log(colors.green, '✓', 'Invalid login correctly rejected');
    return true;
  } else {
    log(colors.red, '✗', 'Invalid login should have been rejected');
    return false;
  }
}

// Test 4: Get Current User
async function testGetCurrentUser() {
  log(colors.cyan, '👤', 'Test 4: Get Current User');
  
  const result = await apiCall('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    log(colors.green, '✓', 'Get current user successful');
    log(colors.blue, '  ', `Username: ${result.data.user.username}`);
    return true;
  } else {
    log(colors.red, '✗', `Get current user failed: ${result.data.error}`);
    return false;
  }
}

// Test 5: Unauthorized Access
async function testUnauthorizedAccess() {
  log(colors.cyan, '🔒', 'Test 5: Unauthorized Access (Should Fail)');
  
  const result = await apiCall('/api/users');

  if (!result.ok && result.status === 401) {
    log(colors.green, '✓', 'Unauthorized access correctly blocked');
    return true;
  } else {
    log(colors.red, '✗', 'Unauthorized access should have been blocked');
    return false;
  }
}

// Test 6: Create User (Admin)
async function testCreateUser() {
  log(colors.cyan, '➕', 'Test 6: Create User (Admin Only)');
  
  const timestamp = Date.now();
  const result = await apiCall('/api/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      username: `testuser_${timestamp}`,
      password: 'test123',
      role: 'USER',
    }),
  });

  if (result.ok) {
    testUserId = result.data.user.id;
    log(colors.green, '✓', 'User created successfully');
    log(colors.blue, '  ', `User ID: ${testUserId}`);
    log(colors.blue, '  ', `Username: ${result.data.user.username}`);
    return true;
  } else {
    log(colors.red, '✗', `Create user failed: ${result.data.error}`);
    return false;
  }
}

// Test 7: Get All Users
async function testGetUsers() {
  log(colors.cyan, '📋', 'Test 7: Get All Users');
  
  const result = await apiCall('/api/users', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    log(colors.green, '✓', 'Get users successful');
    log(colors.blue, '  ', `Total users: ${result.data.users.length}`);
    return true;
  } else {
    log(colors.red, '✗', `Get users failed: ${result.data.error}`);
    return false;
  }
}

// Test 8: Create Branch
async function testCreateBranch() {
  log(colors.cyan, '➕', 'Test 8: Create Branch');
  
  const timestamp = Date.now();
  const result = await apiCall('/api/branches', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `Test Branch ${timestamp}`,
      branchNumber: `TB${timestamp}`,
      category: 'BRANCH',
    }),
  });

  if (result.ok) {
    testBranchId = result.data.branch.id;
    log(colors.green, '✓', 'Branch created successfully');
    log(colors.blue, '  ', `Branch ID: ${testBranchId}`);
    log(colors.blue, '  ', `Name: ${result.data.branch.name}`);
    return true;
  } else {
    log(colors.red, '✗', `Create branch failed: ${result.data.error}`);
    return false;
  }
}

// Test 9: Get All Branches
async function testGetBranches() {
  log(colors.cyan, '📋', 'Test 9: Get All Branches');
  
  const result = await apiCall('/api/branches', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (result.ok) {
    log(colors.green, '✓', 'Get branches successful');
    log(colors.blue, '  ', `Total branches: ${result.data.branches.length}`);
    return true;
  } else {
    log(colors.red, '✗', `Get branches failed: ${result.data.error}`);
    return false;
  }
}

// Test 10: Create Ticket (User)
async function testCreateTicket() {
  log(colors.cyan, '➕', 'Test 10: Create Ticket (User)');
  
  const branchesResult = await apiCall('/api/branches', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!branchesResult.ok || branchesResult.data.branches.length === 0) {
    log(colors.yellow, '⚠', 'No branches available, skipping ticket creation');
    return true;
  }

  const branchId = branchesResult.data.branches[0].id;
  
  const result = await apiCall('/api/tickets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      branchId: branchId,
      priority: 'P1',
      issue: 'Test ticket - Network connectivity issue',
      additionalDetails: 'This is a test ticket created via automated API testing',
    }),
  });

  if (result.ok) {
    testTicketId = result.data.ticket.id;
    log(colors.green, '✓', 'Ticket created successfully');
    log(colors.blue, '  ', `Ticket ID: ${testTicketId}`);
    log(colors.blue, '  ', `Status: ${result.data.ticket.status}`);
    log(colors.blue, '  ', `Priority: ${result.data.ticket.priority}`);
    return true;
  } else {
    log(colors.red, '✗', `Create ticket failed: ${result.data.error}`);
    return false;
  }
}

// Test 11: Get All Tickets
async function testGetTickets() {
  log(colors.cyan, '📋', 'Test 11: Get All Tickets');
  
  const result = await apiCall('/api/tickets', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    log(colors.green, '✓', 'Get tickets successful');
    log(colors.blue, '  ', `Total tickets: ${result.data.tickets.length}`);
    return true;
  } else {
    log(colors.red, '✗', `Get tickets failed: ${result.data.error}`);
    return false;
  }
}

// Test 12: Update Ticket Status
async function testUpdateTicketStatus() {
  if (!testTicketId) {
    log(colors.yellow, '⚠', 'Test 12: Update Ticket Status - Skipped (no ticket)');
    return true;
  }

  log(colors.cyan, '✏️', 'Test 12: Update Ticket Status (Admin)');
  
  const result = await apiCall(`/api/tickets/${testTicketId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'ACKNOWLEDGED',
      note: 'Ticket acknowledged - testing API',
    }),
  });

  if (result.ok) {
    log(colors.green, '✓', 'Ticket status updated successfully');
    log(colors.blue, '  ', `New status: ${result.data.ticket.status}`);
    return true;
  } else {
    log(colors.red, '✗', `Update ticket failed: ${result.data.error}`);
    return false;
  }
}

// Test 13: Get Single Ticket
async function testGetSingleTicket() {
  if (!testTicketId) {
    log(colors.yellow, '⚠', 'Test 13: Get Single Ticket - Skipped (no ticket)');
    return true;
  }

  log(colors.cyan, '📄', 'Test 13: Get Single Ticket Details');
  
  const result = await apiCall(`/api/tickets/${testTicketId}`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (result.ok) {
    log(colors.green, '✓', 'Get ticket details successful');
    log(colors.blue, '  ', `Ticket ID: ${result.data.ticket.id}`);
    log(colors.blue, '  ', `Status: ${result.data.ticket.status}`);
    log(colors.blue, '  ', `Branch: ${result.data.ticket.branch.name}`);
    return true;
  } else {
    log(colors.red, '✗', `Get ticket failed: ${result.data.error}`);
    return false;
  }
}

// Test 14: Delete User (Cleanup)
async function testDeleteUser() {
  if (!testUserId) {
    log(colors.yellow, '⚠', 'Test 14: Delete User - Skipped (no user created)');
    return true;
  }

  log(colors.cyan, '🗑️', 'Test 14: Delete User (Cleanup)');
  
  const result = await apiCall(`/api/users/${testUserId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    log(colors.green, '✓', 'User deleted successfully');
    return true;
  } else {
    log(colors.red, '✗', `Delete user failed: ${result.data.error}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  log(colors.cyan, '🚀', 'API Test Suite - Ticketing System');
  console.log('='.repeat(60) + '\n');
  
  log(colors.blue, 'ℹ', `API URL: ${API_URL}`);
  log(colors.blue, 'ℹ', `Timestamp: ${new Date().toISOString()}\n`);

  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Invalid Login', fn: testInvalidLogin },
    { name: 'Get Current User', fn: testGetCurrentUser },
    { name: 'Unauthorized Access', fn: testUnauthorizedAccess },
    { name: 'Create User', fn: testCreateUser },
    { name: 'Get All Users', fn: testGetUsers },
    { name: 'Create Branch', fn: testCreateBranch },
    { name: 'Get All Branches', fn: testGetBranches },
    { name: 'Create Ticket', fn: testCreateTicket },
    { name: 'Get All Tickets', fn: testGetTickets },
    { name: 'Update Ticket Status', fn: testUpdateTicketStatus },
    { name: 'Get Single Ticket', fn: testGetSingleTicket },
    { name: 'Delete User', fn: testDeleteUser },
  ];

  let passed = 0;
  let failed = 0;
  const failedTests = [];

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
        failedTests.push(test.name);
      }
    } catch (error) {
      failed++;
      failedTests.push(test.name);
      log(colors.red, '✗', `Test crashed: ${error.message}`);
    }
    
    await sleep(100);
    console.log('');
  }

  console.log('='.repeat(60));
  log(colors.cyan, '📊', 'Test Summary');
  console.log('='.repeat(60));
  log(colors.green, '✓', `Passed: ${passed}`);
  log(colors.red, '✗', `Failed: ${failed}`);
  log(colors.blue, '📈', `Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failedTests.length > 0) {
    console.log('\nFailed tests:');
    failedTests.forEach(test => log(colors.red, '  -', test));
  }
  
  console.log('='.repeat(60) + '\n');

  if (failed === 0) {
    log(colors.green, '🎉', 'All tests passed!');
  } else {
    log(colors.yellow, '⚠', 'Some tests failed. Check database setup.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
