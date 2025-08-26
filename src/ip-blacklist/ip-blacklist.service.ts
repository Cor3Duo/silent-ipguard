import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class IpBlacklistService implements OnModuleInit {
  private readonly logger = new Logger(IpBlacklistService.name);
  private ipSet = new Set<string>();

  private readonly blocklistUrls = [
    'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/sslproxies_30d.ipset',
    'https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/sslproxies_7d.ipset',
    'https://github.com/SOCARUS/blacklistSOC/blob/main/ipblacklist.txt',
    'https://raw.githubusercontent.com/ehnwebmaster/stuff/refs/heads/main/10diciembre24/top-ips-ataque.txt',
    'https://raw.githubusercontent.com/Tizian-Maxime-Weigt/L7-HTTP-DDoS-Flood-IP-Signature-IP-List/d3bcfd8658c871f60117307f87dfef4df7d97304/ddos-signatures.txt',
    'https://raw.githubusercontent.com/proxifly/free-proxy-list/refs/heads/main/proxies/all/data.txt',
    'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/http.txt',
    'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/https.txt',
    'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/proxylist.txt',
    'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/socks5.txt',
    'https://raw.githubusercontent.com/vakhov/fresh-proxy-list/refs/heads/master/socks4.txt',
  ];

  constructor(private readonly httpService: HttpService) {}

  async onModuleInit() {
    this.logger.log('Inicializando e carregando a blocklist de IPs...');
    await this.loadBlocklists();
  }

  @Cron('0 0 * * *')
  async handleCron() {
    this.logger.log('Atualizando a blocklist de IPs...');
    await this.loadBlocklists();
  }

  private async loadBlocklists() {
    const combinedIps = new Set<string>();

    const requests = this.blocklistUrls.map((url) =>
      firstValueFrom(this.httpService.get(url)).catch((error) => {
        this.logger.error(
          `Falha ao carregar a blocklist de ${url}`,
          error.message,
        );
        return null;
      }),
    );

    const responses = await Promise.all(requests);

    responses.forEach((response, index) => {
      if (!response) {
        this.logger.warn(
          `Skipping failed request for ${this.blocklistUrls[index]}`,
        );
        return;
      }

      const lines = (response.data as string).split('\n');
      lines.forEach((line) => {
        const reg = /(\w+:\/\/)?(\d+\.\d+\.\d+\.\d+)(:\d+)?/g;
        const trimmedLine = line.trim();

        if (trimmedLine && !trimmedLine.startsWith('#')) {
          const matches = reg.exec(trimmedLine);
          if (matches) {
            const ip = matches[2];
            combinedIps.add(ip);
          }
        }
      });
    });

    if (combinedIps.size > 0) {
      this.ipSet = combinedIps;
      this.logger.log(
        `Blocklists carregadas com sucesso. Total de ${this.ipSet.size} IPs únicos.`,
      );
    } else {
      this.logger.error(
        'Nenhum IP foi carregado. A blocklist pode estar vazia ou todas as fontes falharam.',
      );
    }
  }

  isBlocked(ip: string): boolean {
    return this.ipSet.has(ip);
  }
}
