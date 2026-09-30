import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private fcmInitialized = false;
  private useFallback = false;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeFCM();
  }

  private initializeFCM() {
    const projectId = this.configService.get('FCM_PROJECT_ID');
    const privateKey = this.configService.get('FCM_PRIVATE_KEY');
    const clientEmail = this.configService.get('FCM_CLIENT_EMAIL');
    const fallback = this.configService.get('NOTIFICATION_FALLBACK', 'console');

    if (!projectId || !privateKey || !clientEmail) {
      this.logger.warn(
        'FCM credentials not configured. Using fallback notification mode.',
      );
      this.useFallback = true;
      return;
    }

    try {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            clientEmail,
          }),
        });
      }
      this.fcmInitialized = true;
      this.logger.log('Firebase Cloud Messaging initialized');
    } catch (error) {
      this.logger.error('Failed to initialize FCM:', error.message);
      this.useFallback = true;
    }
  }

  async sendAlert(alert: any) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId: alert.userId },
    });

    if (tokens.length === 0) {
      this.logger.warn(`No device tokens for user ${alert.userId}`);
      return;
    }

    const notification = {
      title: 'Price Alert!',
      body: alert.message,
    };

    const data = {
      alertId: alert.id,
      watchId: alert.watchId,
      type: alert.type,
      price: alert.effectivePrice.toString(),
    };

    if (this.useFallback || !this.fcmInitialized) {
      this.logger.log(`[NOTIFICATION] ${notification.title}: ${notification.body}`);
      this.logger.log(`[NOTIFICATION DATA] ${JSON.stringify(data)}`);
      this.logger.log(`[NOTIFICATION] Would send to ${tokens.length} device(s)`);
      return;
    }

    const results = await Promise.allSettled(
      tokens.map((token) =>
        admin.messaging().send({
          token: token.token,
          notification,
          data,
        }),
      ),
    );

    const successCount = results.filter((r) => r.status === 'fulfilled').length;
    const failCount = results.filter((r) => r.status === 'rejected').length;

    this.logger.log(
      `Sent notification for alert ${alert.id}: ${successCount} success, ${failCount} failed`,
    );
  }

  async registerDeviceToken(
    userId: string,
    token: string,
    platform: string,
  ) {
    const existing = await this.prisma.deviceToken.findUnique({
      where: { token },
    });

    if (existing) {
      return this.prisma.deviceToken.update({
        where: { token },
        data: { userId, platform },
      });
    }

    return this.prisma.deviceToken.create({
      data: { userId, token, platform },
    });
  }

  async removeDeviceToken(token: string) {
    return this.prisma.deviceToken.delete({
      where: { token },
    });
  }
}
