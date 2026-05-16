import { PrismaClient, UserRole, SourceType } from '@prisma/client'

const prisma = new PrismaClient()

const departments = [
  {
    name: 'HR',
    systemPrompt:
      'You are the HR department assistant. Help employees with HR policies, leave requests, onboarding, and benefits questions.',
    llmModel: 'claude-sonnet-4-20250514',
    embedModel: 'text-embedding-3-small',
  },
  {
    name: 'Installation',
    systemPrompt:
      'You are the Installation department assistant. Help technicians with installation guides, safety procedures, and equipment specifications.',
    llmModel: 'claude-sonnet-4-20250514',
    embedModel: 'text-embedding-3-small',
  },
  {
    name: 'Finance',
    systemPrompt:
      'You are the Finance department assistant. Help employees with expense policies, budgeting guidelines, and financial procedures.',
    llmModel: 'claude-sonnet-4-20250514',
    embedModel: 'text-embedding-3-small',
  },
]

async function main() {
  console.log('Seeding departments and users...')

  for (const deptData of departments) {
    let dept = await prisma.department.findFirst({ where: { name: deptData.name } })
    if (!dept) {
      dept = await prisma.department.create({ data: deptData })
    }

    const slug = dept.name.toLowerCase()

    // 1 super_admin per department
    await prisma.user.upsert({
      where: { email: `admin@${slug}.internal` },
      update: {},
      create: {
        clerkId: `seed_super_${slug}`,
        email: `admin@${slug}.internal`,
        name: `${dept.name} Super Admin`,
        role: UserRole.SUPER_ADMIN,
        deptId: dept.id,
      },
    })

    // 1 dept_admin per department
    await prisma.user.upsert({
      where: { email: `deptadmin@${slug}.internal` },
      update: {},
      create: {
        clerkId: `seed_deptadmin_${slug}`,
        email: `deptadmin@${slug}.internal`,
        name: `${dept.name} Dept Admin`,
        role: UserRole.DEPT_ADMIN,
        deptId: dept.id,
      },
    })

    // 2 members per department
    for (let i = 1; i <= 2; i++) {
      await prisma.user.upsert({
        where: { email: `member${i}@${slug}.internal` },
        update: {},
        create: {
          clerkId: `seed_member${i}_${slug}`,
          email: `member${i}@${slug}.internal`,
          name: `${dept.name} Member ${i}`,
          role: UserRole.MEMBER,
          deptId: dept.id,
        },
      })
    }

    // 1 global document source per department
    await prisma.documentSource.create({
      data: {
        name: `${dept.name} General Documents`,
        sourceType: SourceType.LOCAL,
        sourcePath: `/data/docs/${slug}`,
        deptId: dept.id,
        isGlobal: false,
      },
    })

    console.log(`  ✓ ${dept.name}: 1 super_admin, 1 dept_admin, 2 members, 1 document source`)
  }

  console.log('Seed complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
