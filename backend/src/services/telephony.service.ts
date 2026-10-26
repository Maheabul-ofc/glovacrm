import { getTenantPrisma } from '../lib/prisma';
import axios from 'axios';

export interface TelephonyProvider {
  initiateCall(from: string, to: string): Promise<string>;
  getCallStatus(callId: string): Promise<string>;
}

export class ExotelProvider implements TelephonyProvider {
  private sid: string;
  private token: string;
  private subdomain: string;

  constructor(config: any) {
    this.sid = config.sid || '';
    this.token = config.token || '';
    this.subdomain = config.subdomain || 'api.exotel.com';
  }

  async initiateCall(from: string, to: string): Promise<string> {
    if (!this.sid || !this.token) {
      throw new Error('Exotel credentials missing. Please configure Exotel integration.');
    }

    try {
      const response = await axios.post(
        `https://${this.sid}:${this.token}@${this.subdomain}/v1/Accounts/${this.sid}/Calls/connect.json`,
        new URLSearchParams({ From: from, To: to }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );
      return response.data.Call.Sid;
    } catch (error: any) {
      console.error('Exotel initiateCall error:', error.response?.data || error.message);
      throw new Error('Failed to initiate call via Exotel');
    }
  }

  async getCallStatus(callId: string): Promise<string> {
    return 'completed'; // Real implementation would fetch from Exotel API
  }
}

export class TwilioProvider implements TelephonyProvider {
  private accountSid: string;
  private authToken: string;

  constructor(config: any) {
    this.accountSid = config.accountSid || '';
    this.authToken = config.authToken || '';
  }

  async initiateCall(from: string, to: string): Promise<string> {
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials missing. Please configure Twilio integration.');
    }

    try {
      const response = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Calls.json`,
        new URLSearchParams({ From: from, To: to, Url: 'http://demo.twilio.com/docs/voice.xml' }),
        {
          auth: { username: this.accountSid, password: this.authToken },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        }
      );
      return response.data.sid;
    } catch (error: any) {
      console.error('Twilio initiateCall error:', error.response?.data || error.message);
      throw new Error('Failed to initiate call via Twilio');
    }
  }

  async getCallStatus(callId: string): Promise<string> {
    return 'completed'; // Real implementation would fetch from Twilio API
  }
}

export class AndroidAppProvider implements TelephonyProvider {
  async initiateCall(from: string, to: string): Promise<string> {
    // Generate a unique ID that the Android app will sync against
    return `android-call-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  async getCallStatus(callId: string): Promise<string> {
    // Android app pushes status, so polling this isn't strictly necessary, 
    // but we return 'pending' to satisfy interface
    return 'pending';
  }
}

export const getTelephonyProvider = async (tenantId: string): Promise<TelephonyProvider> => {
  const prisma = getTenantPrisma(tenantId);
  
  // Try to find Exotel config first
  let config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: 'EXOTEL' } }
  });

  if (config && config.isActive) {
    return new ExotelProvider(config.config);
  }

  // Fallback to Twilio config
  config = await prisma.integrationConfig.findUnique({
    where: { tenantId_provider: { tenantId, provider: 'TWILIO' } }
  });

  if (config && config.isActive) {
    return new TwilioProvider(config.config);
  }

  // Default fallback: Android SIM Integration (100% Free)
  return new AndroidAppProvider();
};
