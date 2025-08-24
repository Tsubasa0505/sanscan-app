import { NextRequest } from 'next/server';
import { getContactController } from '@/infrastructure/container';

const controller = getContactController();

export async function GET(request: NextRequest) {
  return controller.getContacts(request);
}

export async function POST(request: NextRequest) {
  return controller.createContact(request);
}