import { Request, Response } from 'express';
import { prisma } from '../lib/prisma'; // Use global prisma since this is cross-tenant Super Admin config

export const createPlan = async (req: Request, res: Response) => {
  try {
    const { name, description, price, features, isActive } = req.body;
    
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name,
        description,
        price: parseFloat(price),
        features: features || [],
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    res.status(201).json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create plan' });
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      orderBy: { price: 'asc' }
    });
    res.json(plans);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
};

export const updatePlan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, description, price, features, isActive } = req.body;
    
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (features !== undefined) data.features = features;
    if (isActive !== undefined) data.isActive = isActive;
    
    const plan = await prisma.subscriptionPlan.update({
      where: { id },
      data
    });
    
    res.json(plan);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
};

export const deletePlan = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await prisma.subscriptionPlan.delete({
      where: { id }
    });
    res.json({ message: 'Plan deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
};
