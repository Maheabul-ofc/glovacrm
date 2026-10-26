import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from '../lib/prisma';

// Instamojo Configuration
const INSTAMOJO_API_KEY = process.env.INSTAMOJO_API_KEY;
const INSTAMOJO_AUTH_TOKEN = process.env.INSTAMOJO_AUTH_TOKEN;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const INSTAMOJO_BASE_URL = IS_PRODUCTION 
  ? 'https://www.instamojo.com/api/1.1' 
  : 'https://test.instamojo.com/api/1.1';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const { planId } = req.body;
    const tenantId = req.user!.tenantId;
    
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan not found' });
    
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    
    if (!INSTAMOJO_API_KEY || !INSTAMOJO_AUTH_TOKEN) {
      if (process.env.NODE_ENV !== 'production' || !INSTAMOJO_API_KEY) {
        // Simulated instant payment for local development/testing without live payment gateway keys
        const mockOrderId = `mock_order_${Date.now()}`;
        await prisma.paymentTransaction.create({
          data: {
            tenantId,
            amount: plan.price,
            currency: 'INR',
            status: 'SUCCESS',
            providerOrderId: mockOrderId,
            providerPaymentId: `mock_pay_${Date.now()}`,
          }
        });
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { plan: plan.name, status: 'ACTIVE' }
        });
        return res.json({
          paymentUrl: `${FRONTEND_URL}/dashboard/settings/billing?success=true`,
          mock: true,
          message: 'Development Mock Payment Approved'
        });
      }
      return res.status(500).json({ error: 'Instamojo API keys are missing in the server configuration.' });
    }

    let paymentRequestId = '';
    let paymentUrl = '';

    const payload = {
      purpose: `Subscription: ${plan.name}`,
      amount: plan.price.toString(),
      buyer_name: tenant?.name || 'Tenant',
      email: tenant?.billingEmail || 'tenant@example.com',
      redirect_url: `${FRONTEND_URL}/dashboard/settings/billing?planId=${planId}`,
      allow_repeated_payments: false
    };

    const response = await axios.post(`${INSTAMOJO_BASE_URL}/payment-requests/`, payload, {
      headers: {
        'X-Api-Key': INSTAMOJO_API_KEY,
        'X-Auth-Token': INSTAMOJO_AUTH_TOKEN,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.data.success) {
      paymentRequestId = response.data.payment_request.id;
      paymentUrl = response.data.payment_request.longurl;
    } else {
      throw new Error('Instamojo API Error: ' + JSON.stringify(response.data));
    }
    
    // Create pending payment transaction
    const transaction = await prisma.paymentTransaction.create({
      data: {
        tenantId,
        amount: plan.price,
        currency: 'INR',
        status: 'PENDING',
        providerOrderId: paymentRequestId
      }
    });
    
    // Return the URL for the frontend to redirect to
    res.json({ paymentUrl, transactionId: transaction.id });
  } catch (error: any) {
    console.error('Create order error:', error?.response?.data || error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
};

export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { payment_id, payment_request_id, payment_status, planId } = req.body;
    const tenantId = req.user!.tenantId;
    
    if (payment_status !== 'Credit') {
      return res.status(400).json({ error: 'Payment was not successful' });
    }

    const plan = planId ? await prisma.subscriptionPlan.findUnique({ where: { id: planId } }) : null;

    // In a production environment, you should query Instamojo here to verify the payment_id is genuinely 'Credit'
    if (!INSTAMOJO_API_KEY || !INSTAMOJO_AUTH_TOKEN) {
      if (plan) {
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { plan: plan.name, status: 'ACTIVE' }
        });
      }
      return res.json({ message: 'Plan updated successfully' });
    }

    const response = await axios.get(`${INSTAMOJO_BASE_URL}/payments/${payment_id}/`, {
      headers: {
        'X-Api-Key': INSTAMOJO_API_KEY,
        'X-Auth-Token': INSTAMOJO_AUTH_TOKEN
      }
    });
    
    if (!response.data.success || response.data.payment.status !== 'Credit') {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    // Find the transaction by providerOrderId (which is the payment_request_id)
    const transaction = await prisma.paymentTransaction.findUnique({
      where: { providerOrderId: payment_request_id }
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    if (transaction.status === 'SUCCESS') {
      return res.json({ success: true, message: 'Payment already verified' });
    }
    
    // Create or update subscription
    const currentPeriodStart = new Date();
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1); // 1 month plan
    
    const subscription = await prisma.subscription.upsert({
      where: { tenantId },
      update: {
        planId,
        status: 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd
      },
      create: {
        tenantId,
        planId,
        status: 'ACTIVE',
        currentPeriodStart,
        currentPeriodEnd
      }
    });
    
    // Update Transaction
    await prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: 'SUCCESS',
        subscriptionId: subscription.id,
        providerPaymentId: payment_id
      }
    });
    
    // Update Tenant Plan Name
    if (plan) {
      await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan: plan.name.toUpperCase() }
      });
    }
    
    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (error: any) {
    console.error('Verify payment error:', error?.response?.data || error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
};

export const getTransactions = async (req: Request, res: Response) => {
  try {
    const transactions = await prisma.paymentTransaction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { name: true, slug: true } },
        subscription: { include: { plan: true } }
      }
    });
    res.json(transactions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
};
