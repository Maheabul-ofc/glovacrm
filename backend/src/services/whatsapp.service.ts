import { getTenantPrisma } from '../lib/prisma';
import axios from 'axios';

export interface WhatsAppProvider {
  sendMessage(to: string, templateName: string, languageCode?: string, components?: any[]): Promise<string>;
}

export class MetaWhatsAppProvider implements WhatsAppProvider {
  private phoneNumberId: string;
  private accessToken: string;
  private version: string;

  constructor(config: any) {
    this.phoneNumberId = config.phoneNumberId || '';
    this.accessToken = config.accessToken || '';
    this.version = config.version || 'v17.0';
  }

  async sendMessage(to: string, templateName: string, languageCode: string = 'en_US', components: any[] = []): Promise<string> {
    if (!this.phoneNumberId || !this.accessToken) {
      console.log(`[MOCK WHATSAPP] Sending template ${templateName} to ${to} with components:`, JSON.stringify(components));
      return `mock-wa-${Date.now()}`;
    }

    try {
      const payload: any = {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode }
        }
      };

      if (components.length > 0) {
        payload.template.components = components;
      }

      const response = await axios.post(
        `https://graph.facebook.com/${this.version}/${this.phoneNumberId}/messages`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data.messages[0].id;
    } catch (error: any) {
      console.error('WhatsApp sendMessage error:', error.response?.data || error.message);
      throw new Error('Failed to send WhatsApp message');
    }
  }
}

export const getWhatsAppProvider = async (tenantId: string): Promise<WhatsAppProvider> => {
  const prisma = getTenantPrisma(tenantId);
  
  const config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: 'WHATSAPP' } }
  });

  if (config && config.isActive) {
    return new MetaWhatsAppProvider(config.config);
  }

  // Default to Mock if no keys are found
  return new MetaWhatsAppProvider({});
};
