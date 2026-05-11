import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Admin user
  const adminPass = await bcrypt.hash('Admin123!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@queue.app' },
    update: {},
    create: { email: 'admin@queue.app', password: adminPass, name: 'System Admin', role: 'ADMIN' },
  });

  // Service provider
  const providerPass = await bcrypt.hash('Provider123!', 12);
  const provider = await prisma.user.upsert({
    where: { email: 'provider@queue.app' },
    update: {},
    create: { email: 'provider@queue.app', password: providerPass, name: 'Maya Cohen', role: 'SERVICE_PROVIDER', phone: '+972501234567' },
  });

  const profile = await prisma.providerProfile.upsert({
    where: { userId: provider.id },
    update: {},
    create: {
      userId: provider.id,
      businessName: 'Maya Brows Studio',
      description: 'Professional eyebrow design, threading & tinting. Book your appointment today!',
      address: 'Tel Aviv, Israel',
      workingHours: {
        sun: { open: '10:00', close: '18:00' },
        mon: { open: '09:00', close: '19:00' },
        tue: { open: '09:00', close: '19:00' },
        wed: { open: '09:00', close: '19:00' },
        thu: { open: '09:00', close: '19:00' },
        fri: { open: '09:00', close: '14:00' },
        sat: null,
      },
    },
  });

  // Services
  await prisma.service.createMany({
    skipDuplicates: true,
    data: [
      { providerId: profile.id, name: 'Eyebrow Threading', description: 'Precise hair removal using cotton thread', durationMin: 30, price: 80 },
      { providerId: profile.id, name: 'Eyebrow Tinting', description: 'Semi-permanent color for fuller-looking brows', durationMin: 45, price: 120 },
      { providerId: profile.id, name: 'Brow Lamination', description: 'Reshape and set brow hairs for a brushed-up look', durationMin: 60, price: 200 },
      { providerId: profile.id, name: 'Full Package', description: 'Threading + Tinting + Lamination', durationMin: 90, price: 350 },
    ],
  });

  // Client
  const clientPass = await bcrypt.hash('Client123!', 12);
  const client = await prisma.user.upsert({
    where: { email: 'client@queue.app' },
    update: {},
    create: { email: 'client@queue.app', password: clientPass, name: 'Sarah Levi', role: 'CLIENT', phone: '+972507654321' },
  });

  // Sample announcement
  await prisma.announcement.create({
    data: {
      providerId: provider.id,
      title: '🎉 Summer Special!',
      content: 'Book any service in July and get 15% off your next appointment. Use code SUMMER15 at checkout.',
    },
  });

  console.log('✅ Seed complete');
  console.log('Admin:', admin.email, '| password: Admin123!');
  console.log('Provider:', provider.email, '| password: Provider123!');
  console.log('Client:', client.email, '| password: Client123!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
