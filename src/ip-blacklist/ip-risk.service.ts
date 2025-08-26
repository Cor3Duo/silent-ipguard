import { Injectable, Logger } from '@nestjs/common';
import { IpBlacklistService } from './ip-blacklist.service';
import { AsnAnalysisService } from './asn-analysis.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

const KNOWN_VPN_ASNS: Record<string, string> = {
  '31173': 'Mullvad VPN',
  '20473': 'NordVPN (The Constant Company)',
  '14061': 'ExpressVPN (DigitalOcean)',
  '16509': 'Amazon AWS',
};

const HOSTING_KEYWORDS = [
  'hosting',
  'cloud',
  'datacenter',
  'server',
  'vps',
  'llc',
  'inc',
  'sa',
  'sl',
  'srl',
  'ltd',
  'b.v.',
  'gmbh',
  'datacamp',
  'axarnet',
  'evowise',
  'flyservers',
  'latitude.sh',
  'performive',
  'schuberg philis',
  'limited',
  'zscaler',
];

@Injectable()
export class IpRiskService {
  private readonly logger = new Logger(IpRiskService.name);

  constructor(
    private readonly blacklistService: IpBlacklistService,
    private readonly asnService: AsnAnalysisService,
    private readonly httpService: HttpService,
  ) {}

  private async getInfoFromIpApi(ip: string): Promise<{
    autonomous_system_number: number;
    autonomous_system_organization: string;
  } | null> {
    try {
      const url = `http://ip-api.com/json/${ip}?fields=as,org`;
      const response = await firstValueFrom(this.httpService.get(url));
      const { as, org } = response.data;

      if (as || org) {
        const match = as.match(/^AS(\d+)/);
        return {
          autonomous_system_number: match ? parseInt(match[1], 10) : 0,
          autonomous_system_organization: org,
        };
      }
      return null;
    } catch (error) {
      this.logger.error(
        `Falha ao consultar ip-api.com para o IP ${ip}`,
        error.message,
      );
      return null;
    }
  }

  async assessIp(ip: string): Promise<{ score: number; reasons: string[] }> {
    let score = 0;
    const reasons: string[] = [];

    if (this.blacklistService.isBlocked(ip)) {
      score += 80;
      reasons.push(
        'IP encontrado em lista pública de reputação (proxy/ataque).',
      );
    }

    const asnInfo =
      this.asnService.getInfo(ip) || (await this.getInfoFromIpApi(ip));
    if (asnInfo) {
      console.log('Informações ASN obtidas:', asnInfo);
      const asnNumber = asnInfo.autonomous_system_number.toString();
      const orgName = asnInfo.autonomous_system_organization;
      const orgNameLower = orgName.toLowerCase();
      let asnReasonFound = false;

      // Camada 1
      const knownVpnByAsn = KNOWN_VPN_ASNS[asnNumber];
      if (knownVpnByAsn) {
        score += 95;
        reasons.push(
          `ASN pertence diretamente a um provedor de VPN/Cloud conhecido (${knownVpnByAsn}).`,
        );
        asnReasonFound = true;
      }

      //  Camada 1.5
      if (!asnReasonFound) {
        for (const [vpnAsn, vpnName] of Object.entries(KNOWN_VPN_ASNS)) {
          if (orgName.includes(vpnAsn)) {
            score += 95;
            reasons.push(
              `Organização do ASN (${orgName}) está diretamente associada a um provedor de VPN (${vpnName}).`,
            );
            asnReasonFound = true;
            break;
          }
        }
      }

      // Camada 2
      if (!asnReasonFound) {
        for (const keyword of HOSTING_KEYWORDS) {
          if (orgNameLower.includes(keyword)) {
            score += 35;
            reasons.push(`ASN indica datacenter/hosting (${orgName}).`);
            asnReasonFound = true;
            break;
          }
        }
      }
    }

    const finalScore = Math.min(score, 100);

    if (finalScore === 0) {
      reasons.push('Nenhum fator de risco detectado.');
    }

    return { score: finalScore, reasons };
  }
}
