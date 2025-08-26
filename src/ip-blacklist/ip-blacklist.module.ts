import { Module } from '@nestjs/common';
import { IpBlacklistController } from './ip-blacklist.controller';
import { IpBlacklistService } from './ip-blacklist.service';
import { HttpModule } from '@nestjs/axios';
import { IpRiskService } from './ip-risk.service';
import { AsnAnalysisService } from './asn-analysis.service';

@Module({
  imports: [HttpModule],
  controllers: [IpBlacklistController],
  providers: [IpBlacklistService, IpRiskService, AsnAnalysisService],
})
export class IpBlacklistModule {}
