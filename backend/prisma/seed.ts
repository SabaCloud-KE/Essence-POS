import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Essence Hair & Beauty Salon POS Database ---');

  // 1. Seed Administrator
  const adminPasswordHash = await bcrypt.hash('AdminPassword2026!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@essence.co.ke' },
    update: {},
    create: {
      name: 'System Administrator',
      email: 'admin@essence.co.ke',
      phone: '+254700000001',
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      mfaEnabled: false,
      isActive: true,
    },
  });
  console.log(`[Seed] Admin user created/verified: ${admin.email}`);

  // 2. Seed Staff Members
  const staffPasswordHash = await bcrypt.hash('StaffPassword2026!', 10);
  const staff1 = await prisma.user.upsert({
    where: { email: 'staff@essence.co.ke' },
    update: {},
    create: {
      name: 'Jane Wanjiku',
      email: 'staff@essence.co.ke',
      phone: '+254700000002',
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
      mfaEnabled: false,
      isActive: true,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: 'amina@essence.co.ke' },
    update: {},
    create: {
      name: 'Amina Hassan',
      email: 'amina@essence.co.ke',
      phone: '+254700000003',
      passwordHash: staffPasswordHash,
      role: UserRole.STAFF,
      mfaEnabled: false,
      isActive: true,
    },
  });
  console.log(`[Seed] Staff users created/verified: ${staff1.email}, ${staff2.email}`);

  // 3. Seed Services Catalog
  const initialServices = [
    // Hair Styling & Care
    {
      name: 'Silk Press & Treatment',
      category: 'Hair Styling & Care',
      price: 2500,
      durationMinutes: 90,
      description: 'Clarifying wash, deep conditioning steam treatment, blowout, and precision silk press.',
    },
    {
      name: 'Blow Dry & Thermal Styling',
      category: 'Hair Styling & Care',
      price: 1200,
      durationMinutes: 45,
      description: 'Wash, nourishing leave-in conditioner, blow dry and smooth iron finish.',
    },
    {
      name: 'Deep Conditioning & Keratin Treatment',
      category: 'Hair Styling & Care',
      price: 3000,
      durationMinutes: 75,
      description: 'Intense moisture restoration, bond builder, and protein smoothing.',
    },
    {
      name: 'Relaxer Touch-up & Set',
      category: 'Hair Styling & Care',
      price: 2200,
      durationMinutes: 90,
      description: 'Root relaxer application, neutralizing shampoo, protein conditioner, and roller set.',
    },
    {
      name: 'Wash & Basic Blow Dry',
      category: 'Hair Styling & Care',
      price: 800,
      durationMinutes: 30,
      description: 'Revitalizing shampoo and warm blow dry.',
    },

    // Braids & Locs
    {
      name: 'Knotless Braids (Medium Back)',
      category: 'Braids & Locs',
      price: 3500,
      durationMinutes: 240,
      description: 'Painless, tension-free medium knotless box braids with clean parts.',
    },
    {
      name: 'Box Braids (Waist Length)',
      category: 'Braids & Locs',
      price: 4000,
      durationMinutes: 270,
      description: 'Long waist-length protective box braids with hot water curl finish.',
    },
    {
      name: 'Sisterlocks / Microlocs Retightening',
      category: 'Braids & Locs',
      price: 3000,
      durationMinutes: 180,
      description: 'Root retightening and interlocking session with scalp soothing tonic.',
    },
    {
      name: 'Cornrows / Lines (With Extensions)',
      category: 'Braids & Locs',
      price: 1500,
      durationMinutes: 60,
      description: 'Neat designer stitch lines or feed-in cornrows.',
    },
    {
      name: 'Passion Twists',
      category: 'Braids & Locs',
      price: 3800,
      durationMinutes: 210,
      description: 'Bohemian textured passion twists using premium water wave hair.',
    },

    // Haircuts & Barbering
    {
      name: 'Precision Scissor Cut & Styling',
      category: 'Haircuts & Barbering',
      price: 1500,
      durationMinutes: 45,
      description: 'Custom layered cut, perimeter trim, and texturizing.',
    },
    {
      name: 'Fade & Line-Up',
      category: 'Haircuts & Barbering',
      price: 1000,
      durationMinutes: 35,
      description: 'Skin fade, taper fade, sharp razor edging, and beard line.',
    },
    {
      name: 'Beard Sculpting & Hot Towel Treatment',
      category: 'Haircuts & Barbering',
      price: 800,
      durationMinutes: 25,
      description: 'Hot towel steam, essential oils, beard shaping, and razor finish.',
    },
    {
      name: 'Kids Haircut',
      category: 'Haircuts & Barbering',
      price: 700,
      durationMinutes: 25,
      description: 'Gentle haircut for children under 12 years.',
    },

    // Nails & Spa
    {
      name: 'Deluxe Gel Manicure',
      category: 'Nails & Spa',
      price: 1500,
      durationMinutes: 50,
      description: 'Cuticle care, nail shaping, hand massage, and long-lasting UV gel polish.',
    },
    {
      name: 'Spa Pedicure & Foot Scrub',
      category: 'Nails & Spa',
      price: 1800,
      durationMinutes: 60,
      description: 'Aromatherapy foot soak, callus buffing, exfoliating scrub, massage, and polish.',
    },
    {
      name: 'Acrylic Full Set with Gel Polish',
      category: 'Nails & Spa',
      price: 3000,
      durationMinutes: 90,
      description: 'Full acrylic tips extension with high-gloss gel coating.',
    },
    {
      name: 'Nail Art & Accent Designs',
      category: 'Nails & Spa',
      price: 500,
      durationMinutes: 20,
      description: 'Custom hand-painted French tips, chrome powder, or gemstone placement.',
    },

    // Beauty & Makeup
    {
      name: 'Full Glam Evening Makeup',
      category: 'Beauty & Makeup',
      price: 3500,
      durationMinutes: 60,
      description: 'Flawless camera-ready base, contour, dramatic eyeshadow, and mink lashes.',
    },
    {
      name: 'Soft Glam Everyday Makeup',
      category: 'Beauty & Makeup',
      price: 2500,
      durationMinutes: 45,
      description: 'Radiant dewy skin, natural eye look, nude lips, and subtle glow.',
    },
    {
      name: 'Eyebrow Wax, Shape & Henna Tint',
      category: 'Beauty & Makeup',
      price: 1000,
      durationMinutes: 30,
      description: 'Precision waxing, tweezing, and long-lasting semi-permanent henna tint.',
    },
  ];

  for (const item of initialServices) {
    const existing = await prisma.service.findFirst({
      where: { name: item.name },
    });
    if (!existing) {
      await prisma.service.create({
        data: item,
      });
    }
  }
  console.log(`[Seed] Seeded ${initialServices.length} salon services.`);

  // 4. Initial System Settings
  const defaultSettings = [
    { key: 'SALON_NAME', value: 'Essence Hair & Beauty Salon', isSecret: false },
    { key: 'SALON_LOCATION', value: 'Corner Plaza, Suite 4B, Nairobi, Kenya', isSecret: false },
    { key: 'SALON_PHONE', value: '+254 700 123 456', isSecret: false },
    { key: 'MPESA_SHORTCODE', value: '174379', isSecret: false },
    { key: 'MPESA_ENVIRONMENT', value: 'sandbox', isSecret: false },
  ];

  for (const s of defaultSettings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('[Seed] System settings verified.');
  console.log('--- Database Seeding Complete ---');
}

main()
  .catch((e) => {
    console.error('Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
