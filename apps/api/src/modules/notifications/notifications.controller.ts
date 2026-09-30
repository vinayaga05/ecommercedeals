import { Controller, Post, Delete, Body } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';

class RegisterTokenDto {
  userId: string;
  token: string;
  platform: string;
}

class RemoveTokenDto {
  token: string;
}

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register device token for push notifications' })
  registerToken(@Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerDeviceToken(
      dto.userId,
      dto.token,
      dto.platform,
    );
  }

  @Delete('token')
  @ApiOperation({ summary: 'Remove device token' })
  removeToken(@Body() dto: RemoveTokenDto) {
    return this.notificationsService.removeDeviceToken(dto.token);
  }
}
