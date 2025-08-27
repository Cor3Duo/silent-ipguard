import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { IpRiskService } from './ip-risk.service';
import { VersionInterceptor } from './version.interceptor';

@Controller('check')
@UseInterceptors(VersionInterceptor)
export class IpBlacklistController {
  constructor(private readonly ipRiskService: IpRiskService) {}

  @Get('/:ip')
  async checkIp(@Param('ip') ip: string): Promise<{
    result: {
      score: number;
      reasons: string[];
    };
    ip: string;
  }> {
    return {
      result: await this.ipRiskService.assessIp(ip),
      ip,
    };
  }
}
