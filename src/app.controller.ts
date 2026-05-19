import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/live')
  @HttpCode(HttpStatus.OK)
  getLiveness() {
    return this.appService.getLiveness();
  }

  @Get('health/ready')
  async getReadiness() {
    const readiness = await this.appService.getReadiness();
    return readiness;
  }
}
