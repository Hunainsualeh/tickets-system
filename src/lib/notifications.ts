import prisma from './prisma';

export type NotificationType = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

interface NotificationData {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export async function createNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        link: data.link,
      },
    });
    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

export async function notifyAdmins(title: string, message: string, type?: NotificationType, link?: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });

    const notifications = await Promise.all(
      admins.map((admin) =>
        createNotification({
          userId: admin.id,
          title,
          message,
          type,
          link,
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error notifying admins:', error);
    return [];
  }
}

export async function notifyUser(userId: string, title: string, message: string, type?: NotificationType, link?: string) {
  return createNotification({
    userId,
    title,
    message,
    type,
    link,
  });
}

export async function notifyTeamMembers(teamId: string, title: string, message: string, type?: NotificationType, link?: string, excludeUserId?: string) {
  try {
    const teamMembers = await prisma.userTeam.findMany({
      where: { 
        teamId,
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });

    const notifications = await Promise.all(
      teamMembers.map((member) =>
        createNotification({
          userId: member.userId,
          title,
          message,
          type,
          link,
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error('Error notifying team members:', error);
    return [];
  }
}
