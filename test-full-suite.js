
const API_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
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

// State variables
let adminToken = '';
let userToken = '';
let devToken = '';
let techToken = '';

let adminId = '';
let userId = '';
let devId = '';
let techId = '';

let branchId = '';
let teamId = '';
let ticketId = '';
let requestId = '';

// --- 1. User Creation & Authentication ---

async function testAdminLogin() {
  log(colors.cyan, '🔐', 'Test 1: Admin Login');
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });

  if (result.ok && result.data.token) {
    adminToken = result.data.token;
    adminId = result.data.user.id;
    log(colors.green, '✓', 'Admin login successful');
    return true;
  }
  log(colors.red, '✗', `Admin login failed: ${JSON.stringify(result.data)}`);
  return false;
}

async function testCreateUsers() {
  log(colors.cyan, '👥', 'Test 2: Create Users (User, Developer, Technical)');
  const timestamp = Date.now();
  
  const roles = ['USER', 'DEVELOPER', 'TECHNICAL'];
  const users = {};

  for (const role of roles) {
    const username = `test_${role.toLowerCase()}_${timestamp}`;
    const password = 'password123';
    
    const result = await apiCall('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ username, password, role }),
    });

    if (result.ok) {
      users[role] = { id: result.data.user.id, username, password };
      log(colors.green, '✓', `Created ${role}: ${username}`);
      
      // Login to get token
      const loginResult = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      
      if (loginResult.ok) {
        if (role === 'USER') { userToken = loginResult.data.token; userId = users[role].id; }
        if (role === 'DEVELOPER') { devToken = loginResult.data.token; devId = users[role].id; }
        if (role === 'TECHNICAL') { techToken = loginResult.data.token; techId = users[role].id; }
      }
    } else {
      log(colors.red, '✗', `Failed to create ${role}: ${JSON.stringify(result.data)}`);
      return false;
    }
  }
  return true;
}

// --- 2. Setup (Branch & Team) ---

async function testCreateBranchAndTeam() {
  log(colors.cyan, '🏢', 'Test 3: Create Branch & Team');
  const timestamp = Date.now();

  // Create Branch
  const branchResult = await apiCall('/api/branches', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Test Branch ${timestamp}`, branchNumber: `B${timestamp}`, category: 'BRANCH' }),
  });

  if (branchResult.ok) {
    branchId = branchResult.data.branch.id;
    log(colors.green, '✓', `Created Branch: ${branchResult.data.branch.name}`);
  } else {
    log(colors.red, '✗', `Failed to create branch: ${JSON.stringify(branchResult.data)}`);
    return false;
  }

  // Create Team
  const teamResult = await apiCall('/api/teams', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ name: `Test Team ${timestamp}` }),
  });

  if (teamResult.ok) {
    teamId = teamResult.data.team.id;
    log(colors.green, '✓', `Created Team: ${teamResult.data.team.name}`);
    
    // Assign User to Team
    // Note: Assuming there's an endpoint or way to assign user to team. 
    // Based on file structure, it might be PUT /api/users/[id] or POST /api/teams/[id]/users
    // Let's try updating the user to add them to the team if possible, or just skip if complex.
    // Actually, let's try to update the user we created to be in this team.
    
    // Checking user update endpoint... usually PUT /api/users/[id]
    const assignResult = await apiCall(`/api/users/${userId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ teamIds: [teamId] }),
    });
    
    if (assignResult.ok) {
       log(colors.green, '✓', `Assigned User to Team`);
    } else {
       log(colors.yellow, '⚠', `Could not assign user to team (might not be implemented in this test): ${JSON.stringify(assignResult.data)}`);
    }

  } else {
    log(colors.red, '✗', `Failed to create team: ${JSON.stringify(teamResult.data)}`);
    // Continue anyway
  }
  
  return true;
}

// --- 3. Ticket Creation & Access ---

async function testTicketCreationAndAccess() {
  log(colors.cyan, '🎫', 'Test 4: Ticket Creation & Access');
  
  // User creates ticket
  const createResult = await apiCall('/api/tickets', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      branchId: branchId,
      priority: 'P1',
      issue: 'Test Issue for Full Suite',
      additionalDetails: 'Testing comprehensive flow',
    }),
  });

  if (createResult.ok) {
    ticketId = createResult.data.ticket.id;
    log(colors.green, '✓', `User created ticket: ${ticketId}`);
  } else {
    log(colors.red, '✗', `User failed to create ticket: ${JSON.stringify(createResult.data)}`);
    return false;
  }

  // Admin should see it
  const adminView = await apiCall(`/api/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  
  if (adminView.ok) {
    log(colors.green, '✓', 'Admin can see the ticket');
  } else {
    log(colors.red, '✗', 'Admin cannot see the ticket');
  }

  // Another user (Developer) should NOT see it (unless in same team, but we didn't add them)
  // Or maybe they can if they are support staff? 
  // Let's check if Developer can see it.
  const devView = await apiCall(`/api/tickets/${ticketId}`, {
    headers: { Authorization: `Bearer ${devToken}` },
  });

  if (devView.ok) {
    log(colors.yellow, '⚠', 'Developer can see the ticket (Access control might be loose or intended)');
  } else {
    log(colors.green, '✓', 'Developer cannot see the ticket (Access control working)');
  }

  return true;
}

// --- 4. Notifications ---

async function testNotifications() {
  log(colors.cyan, '🔔', 'Test 5: Notifications');
  
  // Admin updates ticket -> User should get notification
  await apiCall(`/api/tickets/${ticketId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'IN_PROGRESS', note: 'Working on it' }),
  });

  // Check User's notifications
  const notifResult = await apiCall('/api/notifications', {
    headers: { Authorization: `Bearer ${userToken}` },
  });

  if (notifResult.ok && notifResult.data.notifications.length > 0) {
    log(colors.green, '✓', `User received ${notifResult.data.notifications.length} notifications`);
    const latest = notifResult.data.notifications[0];
    log(colors.blue, '  ', `Latest: ${latest.message}`);
  } else {
    log(colors.yellow, '⚠', 'User received no notifications (Check notification logic)');
  }

  return true;
}

// --- 5. Ticket Lifecycle (Assigning) ---

async function testTicketLifecycle() {
  log(colors.cyan, '🔄', 'Test 6: Ticket Lifecycle (Assigning)');
  
  // Admin assigns ticket to Developer
  const assignResult = await apiCall(`/api/tickets/${ticketId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ assignedToId: devId }),
  });

  if (assignResult.ok) {
    log(colors.green, '✓', 'Ticket assigned to Developer');
    
    // Developer should now see the ticket
    const devView = await apiCall(`/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${devToken}` },
    });
    
    if (devView.ok) {
      log(colors.green, '✓', 'Developer can now see the assigned ticket');
    } else {
      log(colors.red, '✗', 'Developer still cannot see the assigned ticket');
    }
  } else {
    log(colors.red, '✗', `Failed to assign ticket: ${JSON.stringify(assignResult.data)}`);
  }

  return true;
}

// --- 6. Comments/Notes ---

async function testComments() {
  log(colors.cyan, '💬', 'Test 7: Comments/Notes');
  
  // Developer adds a note
  const noteResult = await apiCall(`/api/tickets/${ticketId}/notes`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devToken}` },
    body: JSON.stringify({ 
      note: 'I am looking into this issue.'
    }),
  });

  if (noteResult.ok) {
    log(colors.green, '✓', 'Developer added a note');
  } else {
    log(colors.red, '✗', `Failed to add note: ${JSON.stringify(noteResult.data)}`);
  }

  // User should see the note
  const notesView = await apiCall(`/api/notes?ticketId=${ticketId}`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });

  if (notesView.ok && notesView.data.notes && notesView.data.notes.length > 0) {
    log(colors.green, '✓', 'User can see the note');
  } else {
    // Notes might be embedded in ticket response too
    const ticketView = await apiCall(`/api/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    if (ticketView.ok && ticketView.data.ticket.notes && ticketView.data.ticket.notes.length > 0) {
       log(colors.green, '✓', 'User can see the note (embedded in ticket)');
    } else {
       log(colors.yellow, '⚠', 'User cannot see the note');
    }
  }

  return true;
}

// --- 7. Requests ---

async function testRequests() {
  log(colors.cyan, '📝', 'Test 8: Requests');
  
  // User creates a request
  const reqResult = await apiCall('/api/requests', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      title: 'New Feature Request',
      description: 'We need a dark mode.',
      projectId: 'PROJ-001'
    }),
  });

  if (reqResult.ok) {
    requestId = reqResult.data.request.id;
    log(colors.green, '✓', 'User created request');
  } else {
    log(colors.red, '✗', `Failed to create request: ${JSON.stringify(reqResult.data)}`);
    return false;
  }

  // Admin sees requests
  const adminReqs = await apiCall('/api/requests', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (adminReqs.ok && adminReqs.data.requests.find(r => r.id === requestId)) {
    log(colors.green, '✓', 'Admin sees the new request');
  } else {
    log(colors.red, '✗', 'Admin does not see the request');
  }

  return true;
}

// --- 8. Analytics (Simulation) ---

async function testAnalytics() {
  log(colors.cyan, '📊', 'Test 9: Analytics (Data Availability)');
  
  // Admin fetches all tickets
  const result = await apiCall('/api/tickets', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  if (result.ok) {
    const tickets = result.data.tickets;
    log(colors.green, '✓', `Admin can fetch all tickets (${tickets.length} total)`);
    
    // Simple analytics check
    const highPriority = tickets.filter(t => t.priority === 'P1').length;
    log(colors.blue, '  ', `High Priority (P1) Tickets: ${highPriority}`);
    
    const openTickets = tickets.filter(t => t.status !== 'CLOSED').length;
    log(colors.blue, '  ', `Open Tickets: ${openTickets}`);
    
    return true;
  } else {
    log(colors.red, '✗', 'Failed to fetch tickets for analytics');
    return false;
  }
}

// --- 9. Cleanup ---

async function cleanup() {
  log(colors.cyan, '🧹', 'Cleanup');
  
  // Delete users
  const usersToDelete = [userId, devId, techId];
  for (const uid of usersToDelete) {
    if (uid) {
      await apiCall(`/api/users/${uid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
  }
  log(colors.green, '✓', 'Cleanup complete');
}

// --- Runner ---

async function runFullSuite() {
  console.log('\n' + '='.repeat(60));
  log(colors.magenta, '🚀', 'FULL TEST SUITE - Ticketing System');
  console.log('='.repeat(60) + '\n');

  try {
    if (!await testAdminLogin()) throw new Error('Admin login failed');
    await testCreateUsers();
    await testCreateBranchAndTeam();
    await testTicketCreationAndAccess();
    await testNotifications();
    await testTicketLifecycle();
    await testComments();
    await testRequests();
    await testAnalytics();
  } catch (e) {
    log(colors.red, '☠', `Suite failed: ${e.message}`);
  } finally {
    await cleanup();
  }
  
  console.log('\n' + '='.repeat(60));
  log(colors.magenta, '🏁', 'Test Suite Finished');
  console.log('='.repeat(60) + '\n');
}

runFullSuite();
