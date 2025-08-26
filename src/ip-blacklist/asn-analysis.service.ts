import { Injectable, OnModuleInit } from '@nestjs/common';
import { open, AsnResponse, Reader } from 'maxmind';

@Injectable()
export class AsnAnalysisService implements OnModuleInit {
  private reader: Reader<AsnResponse>;

  async onModuleInit() {
    this.reader = await open<AsnResponse>('./data/GeoLite2-ASN.mmdb');
  }

  getInfo(ip: string): AsnResponse | null {
    if (!this.reader) return null;
    return this.reader.get(ip);
  }
}
