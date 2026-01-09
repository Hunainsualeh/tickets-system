
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    try {
        console.log("Checking notifications system...");
        
        // 1. Get a test user
        const user = await prisma.user.findFirst();
        if (!user) {
            console.log("No users found to test with.");
            return;
        }
        console.log(`Found test user: ${user.username} (${user.id})`);

        // 2. Create a test notification manually
        console.log("Attempting to create notification...");
        const notif = await prisma.notification.create({
            data: {
                userId: user.id,
                title: "Test Notification",
                message: "This is a verification test.",
                type: "INFO"
            }
        });
        console.log("Notification created successfully:", notif.id);

        // 3. Verify it exists
        const check = await prisma.notification.findUnique({
            where: { id: notif.id }
        });
        
        if (check) {
            console.log("VERIFIED: Notification exists in DB.");
            // Clean up
            await prisma.notification.delete({ where: { id: check.id }});
            console.log("Cleaned up test notification.");
        } else {
            console.error("FAILED: Notification created but not found?");
        }

    } catch (e) {
        console.error("ERROR during test:", e);
    } finally {
        await prisma.$disconnect();
    }
}

check();
