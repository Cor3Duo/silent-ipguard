import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IpBlacklistModule } from './ip-blacklist/ip-blacklist.module';
import { HttpModule } from '@nestjs/axios';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [HttpModule, ScheduleModule.forRoot(), IpBlacklistModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
