// API Test Script for Ticketing System
// Run with: node test-api.js (after starting the dev server)

const API_URL = 'http://localhost:3000';
let adminToken = '';
let userToken = '';
let createdUserId = '';
let createdBranchId = '';
let createdTicketId = '';

// Helper function for API calls
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
    console.error(`Error calling ${endpoint}:`, error.message);
    return { status: 500, ok: false, error: error.message };
  }
}

// Test functions
async function testAdminLogin() {
  console.log('\n🔐 Testing Admin Login...');
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123',
    }),
  });

  if (result.ok && result.data.token) {
    adminToken = result.data.token;
    console.log('✅ Admin login successful');
    console.log('   Token received:', adminToken.substring(0, 20) + '...');
    return true;
  } else {
    console.log('❌ Admin login failed:', result.data.error);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔐 Testing User Login...');
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      username: 'john_doe',
      password: 'user123',
    }),
  });

  if (result.ok && result.data.token) {
    userToken = result.data.token;
    console.log('✅ User login successful');
    console.log('   Token received:', userToken.substring(0, 20) + '...');
    return true;
  } else {
    console.log('❌ User login failed:', result.data.error);
    return false;
  }
}

async function testGetCurrentUser() {
  console.log('\n👤 Testing Get Current User...');
  const result = await apiCall('/api/auth/me', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    console.log('✅ Get current user successful');
    console.log('   User:', result.data.user.username, '-', result.data.user.role);
    return true;
  } else {
    console.log('❌ Get current user failed:', result.data.error);
    return false;
  }
}

async function testCreateUser() {
  console.log('\n➕ Testing Create User...');
  const result = await apiCall('/api/users', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      username: `testuser_${Date.now()}`,
      password: 'test123',
      role: 'USER',
    }),
  });

  if (result.ok) {
    createdUserId = result.data.user.id;
    console.log('✅ User created successfully');
    console.log('   User ID:', createdUserId);
    console.log('   Username:', result.data.user.username);
    return true;
  } else {
    console.log('❌ Create user failed:', result.data.error);
    return false;
  }
}

async function testGetUsers() {
  console.log('\n📋 Testing Get All Users...');
  const result = await apiCall('/api/users', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    console.log('✅ Get users successful');
    console.log(`   Total users: ${result.data.users.length}`);
    return true;
  } else {
    console.log('❌ Get users failed:', result.data.error);
    return false;
  }
}

async function testCreateBranch() {
  console.log('\n➕ Testing Create Branch...');
  const result = await apiCall('/api/branches', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      name: `Test Branch ${Date.now()}`,
      branchNumber: `TB${Date.now()}`,
      category: 'BRANCH',
    }),
  });

  if (result.ok) {
    createdBranchId = result.data.branch.id;
    console.log('✅ Branch created successfully');
    console.log('   Branch ID:', createdBranchId);
    console.log('   Branch Name:', result.data.branch.name);
    return true;
  } else {
    console.log('❌ Create branch failed:', result.data.error);
    return false;
  }
}

async function testGetBranches() {
  console.log('\n📋 Testing Get All Branches...');
  const result = await apiCall('/api/branches', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (result.ok) {
    console.log('✅ Get branches successful');
    console.log(`   Total branches: ${result.data.branches.length}`);
    return true;
  } else {
    console.log('❌ Get branches failed:', result.data.error);
    return false;
  }
}

async function testCreateTicket() {
  console.log('\n➕ Testing Create Ticket (User)...');
  
  // First get a branch to use
  const branchesResult = await apiCall('/api/branches', {
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
  });

  if (!branchesResult.ok || branchesResult.data.branches.length === 0) {
    console.log('❌ No branches available for ticket creation');
    return false;
  }

  const branchId = branchesResult.data.branches[0].id;

  const result = await apiCall('/api/tickets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({
      branchId: branchId,
      priority: 'HIGH',
      issue: 'Test ticket - API testing',
      additionalDetails: 'This is a test ticket created via API',
    }),
  });

  if (result.ok) {
    createdTicketId = result.data.ticket.id;
    console.log('✅ Ticket created successfully');
    console.log('   Ticket ID:', createdTicketId);
    console.log('   Status:', result.data.ticket.status);
    return true;
  } else {
    console.log('❌ Create ticket failed:', result.data.error);
    return false;
  }
}

async function testGetTickets() {
  console.log('\n📋 Testing Get All Tickets...');
  const result = await apiCall('/api/tickets', {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    console.log('✅ Get tickets successful');
    console.log(`   Total tickets: ${result.data.tickets.length}`);
    return true;
  } else {
    console.log('❌ Get tickets failed:', result.data.error);
    return false;
  }
}

async function testUpdateTicketStatus() {
  if (!createdTicketId) {
    console.log('\n⚠️  Skipping update ticket test - no ticket created');
    return true;
  }

  console.log('\n✏️  Testing Update Ticket Status...');
  const result = await apiCall(`/api/tickets/${createdTicketId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      status: 'ACKNOWLEDGED',
      note: 'Ticket acknowledged via API test',
    }),
  });

  if (result.ok) {
    console.log('✅ Ticket updated successfully');
    console.log('   New status:', result.data.ticket.status);
    return true;
  } else {
    console.log('❌ Update ticket failed:', result.data.error);
    return false;
  }
}

async function testDeleteUser() {
  if (!createdUserId) {
    console.log('\n⚠️  Skipping delete user test - no user created');
    return true;
  }

  console.log('\n🗑️  Testing Delete User...');
  const result = await apiCall(`/api/users/${createdUserId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });

  if (result.ok) {
    console.log('✅ User deleted successfully');
    return true;
  } else {
    console.log('❌ Delete user failed:', result.data.error);
    return false;
  }
}

async function testUnauthorizedAccess() {
  console.log('\n🔒 Testing Unauthorized Access...');
  const result = await apiCall('/api/users');

  if (!result.ok && result.status === 401) {
    console.log('✅ Unauthorized access properly blocked');
    return true;
  } else {
    console.log('❌ Unauthorized access was not blocked!');
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting API Tests for Ticketing System');
  console.log('==========================================');
  
  const tests = [
    testAdminLogin,
    testUserLogin,
    testGetCurrentUser,
    testUnauthorizedAccess,
    testCreateUser,
    testGetUsers,
    testCreateBranch,
    testGetBranches,
    testCreateTicket,
    testGetTickets,
    testUpdateTicketStatus,
    testDeleteUser,
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await test();
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n==========================================');
  console.log('📊 Test Results');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('==========================================\n');
}

// Run the tests
runTests().catch(console.error);
